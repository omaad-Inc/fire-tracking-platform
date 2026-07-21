import { Injectable, inject } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';
import { ApiService, SavingGoal, SavingGoalCreate, SavingGoalUpdate, Transaction } from '../../core/services/api.service';
import { CurrencyService } from '../../core/services/currency.service';
import { CACHE_RESET } from '../../core/services/cache-reset.token';
import { cachedResource } from '../../core/util/cached-resource';

export interface SavingRecord {
    id?: string;
    date: string;
    type: 'Deposit' | 'Withdrawal';
    amount: number;
    name: string;
    note?: string;
    goalId?: number;
}

export interface SavingsStatsSummary {
    totalSavings: number;
    thisMonthSaving: number;
    avgMonthlySaving: number;
}

export interface SavingsSeriesPoint {
    label: string;
    value: number;
}

export interface SavingsGoalDisplay {
    id?: number;
    label: string;
    current: number;
    target: number;
    colorClass: string;
    textColorClass: string;
    targetDate?: string;
    status?: string;
}

// Legacy color palette, no longer applied (the Goals UI uses photos +
// uniform navy chrome). Kept here only so existing widget code that still
// reads `colorClass` / `textColorClass` doesn't crash.
const GOAL_COLORS = [
    { bg: 'bg-brand-700', text: 'text-brand-700 dark:text-brand-300' },
];

@Injectable({ providedIn: 'root' })
export class SavingsService {
    private api             = inject(ApiService);
    private currencyService = inject(CurrencyService);

    // Shared cachedResource per entity (P2-FE-1). Stats are a pure derivation of
    // goals + savings transactions, so there is no separate stats cache.
    private goalsResource = cachedResource<SavingsGoalDisplay[]>(
        () => firstValueFrom(this.api.getSavingGoals().pipe(
            map(goals => goals.map((g, i) => this.mapGoalToDisplay(g, i))),
        )),
    );
    private transactionsResource = cachedResource<SavingRecord[]>(
        () => firstValueFrom(this.api.getAllTransactions().pipe(
            map(txs => txs
                .filter(t => t.category === 'savings' || t.category === 'investment')
                .map(t => this.mapTransactionToRecord(t))),
        )),
    );
    private progressResource = cachedResource<SavingsSeriesPoint[]>(
        () => this.computeProgressClientSide(),
    );

    constructor() {
        // Clear cached user data on logout/login (see CACHE_RESET).
        inject(CACHE_RESET).subscribe(() => this.clearCache());
    }

    // ==================== SAVING GOALS ====================

    /** Get all saving goals (cached). */
    getGoals(): Promise<SavingsGoalDisplay[]> {
        return this.goalsResource.load();
    }

    /** Create a new saving goal. */
    async createGoal(data: SavingGoalCreate): Promise<SavingsGoalDisplay | null> {
        try {
            const goal = await firstValueFrom(this.api.createSavingGoal(data));
            const displayGoal = this.mapGoalToDisplay(goal, 0);
            this.invalidateGoalDerived();
            return displayGoal;
        } catch (error) {
            console.error('Error creating saving goal:', error);
            throw error;
        }
    }

    /** Update a saving goal. */
    async updateGoal(id: number, data: SavingGoalUpdate): Promise<SavingsGoalDisplay | null> {
        try {
            const goal = await firstValueFrom(this.api.updateSavingGoal(id, data));
            const displayGoal = this.mapGoalToDisplay(goal, 0);
            this.invalidateGoalDerived();
            return displayGoal;
        } catch (error) {
            console.error('Error updating saving goal:', error);
            throw error;
        }
    }

    /** Delete a saving goal. */
    async deleteGoal(id: number): Promise<void> {
        try {
            await firstValueFrom(this.api.deleteSavingGoal(id));
            this.invalidateGoalDerived();
        } catch (error) {
            console.error('Error deleting saving goal:', error);
            throw error;
        }
    }

    /**
     * @deprecated Use ApiService.contributeToGoal directly with an asset_id.
     * Goal contributions now require a source asset and create an audit-log entry;
     * this no-arg legacy helper is kept only to avoid breaking the (about-to-be-removed)
     * Savings page widget. Returns null because the underlying API now returns a
     * GoalContribution, not a SavingGoal.
     */
    async addContribution(_goalId: number, _amount: number): Promise<SavingsGoalDisplay | null> {
        console.warn('savingsService.addContribution() is deprecated; use ApiService.contributeToGoal');
        return null;
    }

    // ==================== TRANSACTIONS (Savings-related) ====================

    /** Get savings-related transactions (cached). */
    getTransactions(): Promise<SavingRecord[]> {
        return this.transactionsResource.load();
    }

    /**
     * Statistics summary, a pure derivation of the cached goals + transactions.
     *  - Total Savings      = Σ goal current amounts
     *  - This Month Saving  = deposits − withdrawals this month
     *  - Avg Monthly Saving = mean of monthly deposit totals
     */
    async getStatsSummary(): Promise<SavingsStatsSummary> {
        const [goals, transactions] = await Promise.all([
            this.goalsResource.load(),
            this.transactionsResource.load(),
        ]);

        const totalSavings = goals.reduce((sum, g) => sum + g.current, 0);

        const currentMonth = new Date().toISOString().slice(0, 7);
        const thisMonthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
        const thisMonthDeposits = thisMonthTransactions
            .filter(t => t.type === 'Deposit')
            .reduce((sum, t) => sum + t.amount, 0);
        const thisMonthWithdrawals = thisMonthTransactions
            .filter(t => t.type === 'Withdrawal')
            .reduce((sum, t) => sum + t.amount, 0);
        const thisMonthSaving = thisMonthDeposits - thisMonthWithdrawals;

        const depositsByMonth = new Map<string, number>();
        transactions
            .filter(t => t.type === 'Deposit')
            .forEach(t => {
                const month = t.date.slice(0, 7);
                depositsByMonth.set(month, (depositsByMonth.get(month) || 0) + t.amount);
            });
        const monthlyTotals = Array.from(depositsByMonth.values());
        const avgMonthlySaving = monthlyTotals.length > 0
            ? monthlyTotals.reduce((a, b) => a + b, 0) / monthlyTotals.length
            : 0;

        return { totalSavings, thisMonthSaving, avgMonthlySaving };
    }

    /** Get savings progression series (cached, computed client-side). */
    getProgressSeries(): Promise<SavingsSeriesPoint[]> {
        return this.progressResource.load();
    }

    /**
     * Compute savings progression client-side from goals.
     * Always shows 12 months of history so the graph is always visible, even for
     * newly created goals. Each goal contributes its current_amount with an
     * accelerating growth curve (concave up) starting from its creation date or
     * 12 months ago, whichever is earlier.
     */
    private async computeProgressClientSide(): Promise<SavingsSeriesPoint[]> {
        let goals: SavingGoal[];
        try {
            goals = await firstValueFrom(this.api.getSavingGoals(0, 200));
        } catch {
            return [];
        }
        if (!goals.length) return [];

        const totalSavings = goals.reduce((s, g) => s + g.current_amount, 0);
        if (totalSavings <= 0) return [];

        const now = new Date();
        now.setHours(23, 59, 59, 0);

        // Always start 12 months back so the chart always has visible data
        const fixedStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);

        // Also look back to earliest goal creation (in case it's older than 12 months)
        let earliestGoal = new Date(now);
        for (const g of goals) {
            const d = new Date(g.created_at);
            if (d < earliestGoal) earliestGoal = d;
        }
        earliestGoal.setDate(1);
        earliestGoal.setHours(0, 0, 0, 0);

        const startDate = earliestGoal < fixedStart ? earliestGoal : fixedStart;

        // Build monthly points from startDate up to today
        const monthPoints: Date[] = [];
        let cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        while (cur <= now) {
            monthPoints.push(new Date(cur));
            cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
        }
        // Ensure today is always the last point so the final value = total current_amount
        const lastMonth = monthPoints[monthPoints.length - 1];
        if (lastMonth.getMonth() !== now.getMonth() || lastMonth.getFullYear() !== now.getFullYear()) {
            monthPoints.push(new Date(now));
        } else {
            monthPoints[monthPoints.length - 1] = new Date(now);
        }

        const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

        return monthPoints.map((pt, idx) => {
            let total = 0;
            for (const g of goals) {
                if (g.current_amount <= 0) continue;

                const goalCreated = new Date(g.created_at);
                goalCreated.setDate(1);
                goalCreated.setHours(0, 0, 0, 0);
                const effectiveStart = goalCreated < fixedStart ? goalCreated : fixedStart;

                if (effectiveStart > pt) continue; // goal hasn't "started" yet at this point

                const spanMs = Math.max(1, now.getTime() - effectiveStart.getTime());
                const elapsedMs = Math.max(0, pt.getTime() - effectiveStart.getTime());
                // Slightly accelerating curve: pct^1.15, slow start, faster end
                const pct = Math.min(1, elapsedMs / spanMs);
                total += g.current_amount * Math.pow(pct, 1.15);
            }

            const showYear = pt.getMonth() === 0 || idx === 0;
            const isLast = idx === monthPoints.length - 1;
            const label = isLast
                ? 'Auj.'
                : (showYear ? `${MONTHS[pt.getMonth()]} ${pt.getFullYear()}` : MONTHS[pt.getMonth()]);

            return { label, value: Math.round(total) };
        });
    }

    // ==================== LEGACY METHODS (for backward compatibility) ====================

    addTransaction(record: SavingRecord): Promise<SavingRecord> {
        // Convert amount from display currency (e.g. FCFA) → EUR before persisting.
        const transactionData = {
            type: record.type === 'Deposit' ? 'income' as const : 'expense' as const,
            category: 'savings' as const,
            amount: this.currencyService.toBaseAmount(record.amount),
            description: record.note,
            date: record.date
        };

        return firstValueFrom(this.api.createTransaction(transactionData)).then(t => {
            const mapped = this.mapTransactionToRecord(t);
            this.invalidateTransactionDerived();
            return mapped;
        });
    }

    updateTransaction(record: SavingRecord): Promise<SavingRecord> {
        if (!record.id) return Promise.reject(new Error('Missing id'));

        const transactionData = {
            type: record.type === 'Deposit' ? 'income' as const : 'expense' as const,
            amount: this.currencyService.toBaseAmount(record.amount),
            description: record.note,
            date: record.date
        };

        return firstValueFrom(this.api.updateTransaction(parseInt(record.id), transactionData)).then(t => {
            const mapped = this.mapTransactionToRecord(t);
            this.invalidateTransactionDerived();
            return mapped;
        });
    }

    deleteTransactions(ids: string[]): Promise<void> {
        const deletePromises = ids.map(id =>
            firstValueFrom(this.api.deleteTransaction(parseInt(id)))
        );
        return Promise.all(deletePromises).then(() => {
            this.invalidateTransactionDerived();
        });
    }

    // ==================== PRIVATE HELPERS ====================

    /** A goal write invalidates the goal list AND the progression chart (which reads current_amount). */
    private invalidateGoalDerived(): void {
        this.goalsResource.invalidate();
        this.progressResource.invalidate();
    }

    private invalidateTransactionDerived(): void {
        this.transactionsResource.invalidate();
    }

    private mapGoalToDisplay(goal: SavingGoal, index: number): SavingsGoalDisplay {
        const colors = GOAL_COLORS[index % GOAL_COLORS.length];
        return {
            id: goal.id,
            label: goal.name,
            current: goal.current_amount,
            target: goal.target_amount,
            colorClass: colors.bg,
            textColorClass: colors.text,
            targetDate: goal.target_date ?? undefined,
            status: goal.status
        };
    }

    private mapTransactionToRecord(t: Transaction): SavingRecord {
        return {
            id: t.id.toString(),
            date: t.date,
            type: t.type === 'income' ? 'Deposit' : 'Withdrawal',
            amount: t.amount,
            name: t.category,
            note: t.description ?? undefined
        };
    }

    /** Clear all caches on logout/login (prevents cross-user cache bleed, P1-10). */
    clearCache(): void {
        this.goalsResource.reset();
        this.transactionsResource.reset();
        this.progressResource.reset();
    }
}
