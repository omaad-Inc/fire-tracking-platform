import { Injectable, inject } from '@angular/core';
import { Observable, map, catchError, of, firstValueFrom, shareReplay, switchMap } from 'rxjs';
import { ApiService, SavingGoal, SavingGoalCreate, SavingGoalUpdate, Transaction } from '../../core/services/api.service';
import { CurrencyService } from '../../core/services/currency.service';

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

// Legacy color palette — no longer applied (the Goals UI uses photos +
// uniform navy chrome). Kept here only so existing widget code that still
// reads `colorClass` / `textColorClass` doesn't crash.
const GOAL_COLORS = [
    { bg: 'bg-brand-700', text: 'text-brand-700 dark:text-brand-300' },
];

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

@Injectable({ providedIn: 'root' })
export class SavingsService {
    private api             = inject(ApiService);
    private currencyService = inject(CurrencyService);
    
    // Cache storage
    private goalsCache: CacheEntry<SavingsGoalDisplay[]> | null = null;
    private transactionsCache: CacheEntry<SavingRecord[]> | null = null;
    private statsCache: CacheEntry<SavingsStatsSummary> | null = null;
    private progressCache: CacheEntry<SavingsSeriesPoint[]> | null = null;
    
    // Request deduplication - store ongoing requests
    private goalsRequest$: Observable<SavingsGoalDisplay[]> | null = null;
    private transactionsRequest$: Observable<SavingRecord[]> | null = null;
    private statsRequest$: Observable<SavingsStatsSummary> | null = null;
    private progressRequest$: Observable<SavingsSeriesPoint[]> | null = null;

    // ==================== SAVING GOALS ====================

    /**
     * Get all saving goals (with caching)
     */
    async getGoals(): Promise<SavingsGoalDisplay[]> {
        // Return cached data immediately if available and fresh
        if (this.goalsCache && this.isCacheValid(this.goalsCache)) {
            // Refresh in background if stale
            if (this.isCacheStale(this.goalsCache)) {
                this.refreshGoals();
            }
            return this.goalsCache.data;
        }
        
        // Return cached data even if stale (stale-while-revalidate)
        if (this.goalsCache) {
            // Refresh in background
            this.refreshGoals();
            return this.goalsCache.data;
        }
        
        // No cache, fetch fresh data
        return firstValueFrom(this.getGoals$());
    }
    
    /**
     * Refresh goals in background
     */
    private refreshGoals(): void {
        if (this.goalsRequest$) return; // Already refreshing

        this.goalsRequest$ = this.createGoalsRequest();
    }

    /**
     * Build the shared goals request. On failure: fall back to the cache if
     * one exists, otherwise LET THE ERROR SURFACE so widgets can render an
     * error+retry card instead of a fake-empty state. The in-flight handle
     * is reset in all outcomes so retry works.
     */
    private createGoalsRequest(): Observable<SavingsGoalDisplay[]> {
        const request$ = this.api.getSavingGoals().pipe(
            map(goals => goals.map((goal, index) => this.mapGoalToDisplay(goal, index))),
            catchError(error => {
                console.error('Error fetching saving goals:', error);
                if (this.goalsCache) return of(this.goalsCache.data);
                throw error;
            }),
            shareReplay(1)
        );

        firstValueFrom(request$)
            .then(data => {
                this.goalsCache = { data, timestamp: Date.now() };
            })
            .catch(() => { /* surfaced to subscribers */ })
            .finally(() => {
                this.goalsRequest$ = null;
            });

        return request$;
    }

    /**
     * Get saving goals as Observable (with caching and deduplication)
     */
    getGoals$(): Observable<SavingsGoalDisplay[]> {
        // Return cached data immediately if available
        if (this.goalsCache && this.isCacheValid(this.goalsCache)) {
            return of(this.goalsCache.data);
        }
        
        // Deduplicate simultaneous requests
        if (this.goalsRequest$) {
            return this.goalsRequest$;
        }

        // Create new request (errors surface when there is no cache to serve)
        this.goalsRequest$ = this.createGoalsRequest();
        return this.goalsRequest$;
    }

    /**
     * Create a new saving goal
     */
    async createGoal(data: SavingGoalCreate): Promise<SavingsGoalDisplay | null> {
        try {
            const goal = await firstValueFrom(this.api.createSavingGoal(data));
            const displayGoal = this.mapGoalToDisplay(goal, 0);
            this.invalidateGoalsCache();
            this.invalidateProgressCache(); // current_amount affects the chart immediately
            this.invalidateStatsCache();
            return displayGoal;
        } catch (error) {
            console.error('Error creating saving goal:', error);
            throw error;
        }
    }

    /**
     * Update a saving goal
     */
    async updateGoal(id: number, data: SavingGoalUpdate): Promise<SavingsGoalDisplay | null> {
        try {
            const goal = await firstValueFrom(this.api.updateSavingGoal(id, data));
            const displayGoal = this.mapGoalToDisplay(goal, 0);
            this.invalidateGoalsCache();
            this.invalidateProgressCache(); // updated current_amount must be reflected in chart
            this.invalidateStatsCache();
            return displayGoal;
        } catch (error) {
            console.error('Error updating saving goal:', error);
            throw error;
        }
    }

    /**
     * Delete a saving goal
     */
    async deleteGoal(id: number): Promise<void> {
        try {
            await firstValueFrom(this.api.deleteSavingGoal(id));
            this.invalidateGoalsCache();
            this.invalidateProgressCache();
            this.invalidateStatsCache();
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

    /**
     * Get savings-related transactions (with caching)
     */
    async getTransactions(): Promise<SavingRecord[]> {
        // Return cached data immediately if available and fresh
        if (this.transactionsCache && this.isCacheValid(this.transactionsCache)) {
            // Refresh in background if stale
            if (this.isCacheStale(this.transactionsCache)) {
                this.refreshTransactions();
            }
            return this.transactionsCache.data;
        }
        
        // Return cached data even if stale (stale-while-revalidate)
        if (this.transactionsCache) {
            // Refresh in background
            this.refreshTransactions();
            return this.transactionsCache.data;
        }
        
        // No cache, fetch fresh data
        return firstValueFrom(this.getTransactions$());
    }
    
    /**
     * Refresh transactions in background
     */
    private refreshTransactions(): void {
        if (this.transactionsRequest$) return; // Already refreshing
        
        this.transactionsRequest$ = this.api.getAllTransactions().pipe(
            map(transactions => {
                const savingsTransactions = transactions.filter(t =>
                    t.category === 'savings' || t.category === 'investment'
                );
                return savingsTransactions.map(t => this.mapTransactionToRecord(t));
            }),
            catchError(error => {
                console.error('Error fetching transactions:', error);
                return of(this.transactionsCache?.data || []);
            }),
            shareReplay(1)
        );
        
        firstValueFrom(this.transactionsRequest$).then(data => {
            this.transactionsCache = { data, timestamp: Date.now() };
            this.transactionsRequest$ = null;
        });
    }
    
    /**
     * Get transactions as Observable (with caching and deduplication)
     */
    getTransactions$(): Observable<SavingRecord[]> {
        // Return cached data immediately if available
        if (this.transactionsCache && this.isCacheValid(this.transactionsCache)) {
            return of(this.transactionsCache.data);
        }
        
        // Deduplicate simultaneous requests
        if (this.transactionsRequest$) {
            return this.transactionsRequest$;
        }
        
        // Create new request
        this.transactionsRequest$ = this.api.getAllTransactions().pipe(
            map(transactions => {
                const savingsTransactions = transactions.filter(t =>
                    t.category === 'savings' || t.category === 'investment'
                );
                return savingsTransactions.map(t => this.mapTransactionToRecord(t));
            }),
            catchError(error => {
                console.error('Error fetching transactions:', error);
                return of(this.transactionsCache?.data || []);
            }),
            shareReplay(1)
        );
        
        // Cache the result
        firstValueFrom(this.transactionsRequest$).then(data => {
            this.transactionsCache = { data, timestamp: Date.now() };
            this.transactionsRequest$ = null;
        });
        
        return this.transactionsRequest$;
    }

    /**
     * Get statistics summary from API (with caching)
     * Total Savings = Sum of all saving goals current amounts
     * This Month Saving = Sum of all deposits this month - withdrawals this month
     * Average Monthly Saving = Average of all deposits per month
     */
    async getStatsSummary(): Promise<SavingsStatsSummary> {
        // Return cached data immediately if available and fresh
        if (this.statsCache && this.isCacheValid(this.statsCache)) {
            // Refresh in background if stale
            if (this.isCacheStale(this.statsCache)) {
                this.refreshStats();
            }
            return this.statsCache.data;
        }
        
        // Return cached data even if stale (stale-while-revalidate)
        if (this.statsCache) {
            // Refresh in background
            this.refreshStats();
            return this.statsCache.data;
        }
        
        // No cache, fetch fresh data
        return firstValueFrom(this.getStatsSummary$());
    }
    
    /**
     * Refresh stats in background
     */
    private refreshStats(): void {
        if (this.statsRequest$) return; // Already refreshing
        
        this.statsRequest$ = this.getStatsSummary$();
        firstValueFrom(this.statsRequest$).then(data => {
            this.statsCache = { data, timestamp: Date.now() };
            this.statsRequest$ = null;
        });
    }
    
    /**
     * Get stats as Observable (with caching and deduplication)
     */
    getStatsSummary$(): Observable<SavingsStatsSummary> {
        // Return cached data immediately if available
        if (this.statsCache && this.isCacheValid(this.statsCache)) {
            return of(this.statsCache.data);
        }
        
        // Deduplicate simultaneous requests
        if (this.statsRequest$) {
            return this.statsRequest$;
        }
        
        // Create new request
        this.statsRequest$ = this.api.getSavingGoals().pipe(
            switchMap(goals => {
                const goalsDisplay = goals.map((goal, index) => this.mapGoalToDisplay(goal, index));
                return this.getTransactions$().pipe(
                    map(transactions => {
                        const totalSavings = goalsDisplay.reduce((sum, g) => sum + g.current, 0);
                        
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
                    })
                );
            }),
            catchError(error => {
                console.error('Error fetching stats:', error);
                return of(this.statsCache?.data || { totalSavings: 0, thisMonthSaving: 0, avgMonthlySaving: 0 });
            }),
            shareReplay(1)
        );
        
        // Cache the result
        firstValueFrom(this.statsRequest$).then(data => {
            this.statsCache = { data, timestamp: Date.now() };
            this.statsRequest$ = null;
        });
        
        return this.statsRequest$;
    }

    /**
     * Get savings progression series (with caching)
     */
    async getProgressSeries(): Promise<SavingsSeriesPoint[]> {
        // Return cached data immediately if available and fresh
        if (this.progressCache && this.isCacheValid(this.progressCache)) {
            // Refresh in background if stale
            if (this.isCacheStale(this.progressCache)) {
                this.refreshProgress();
            }
            return this.progressCache.data;
        }
        
        // Return cached data even if stale (stale-while-revalidate)
        if (this.progressCache) {
            // Refresh in background
            this.refreshProgress();
            return this.progressCache.data;
        }
        
        // No cache, fetch fresh data
        return firstValueFrom(this.getProgressSeries$());
    }
    
    /**
     * Compute savings progression client-side from goals.
     * Always shows 12 months of history so the graph is always visible, even for
     * newly created goals. Each goal contributes its current_amount with an
     * accelerating growth curve (concave up) starting from its creation date or
     * 12 months ago, whichever is earlier.
     */
    private async computeProgressClientSide(): Promise<SavingsSeriesPoint[]> {
        let goals: import('../../core/services/api.service').SavingGoal[];
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
            // Replace last monthly point with today so value = 100%
            monthPoints[monthPoints.length - 1] = new Date(now);
        }

        const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

        return monthPoints.map((pt, idx) => {
            let total = 0;
            for (const g of goals) {
                if (g.current_amount <= 0) continue;

                // Effective start: earlier of goal creation or fixedStart
                const goalCreated = new Date(g.created_at);
                goalCreated.setDate(1);
                goalCreated.setHours(0, 0, 0, 0);
                const effectiveStart = goalCreated < fixedStart ? goalCreated : fixedStart;

                if (effectiveStart > pt) continue; // goal hasn't "started" yet at this point

                const spanMs = Math.max(1, now.getTime() - effectiveStart.getTime());
                const elapsedMs = Math.max(0, pt.getTime() - effectiveStart.getTime());
                // Slightly accelerating curve: pct^1.15 — slow start, faster end
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

    /**
     * Refresh progress in background
     */
    private refreshProgress(): void {
        if (this.progressRequest$) return;
        this.progressRequest$ = of(null).pipe(
            switchMap(() => new Observable<SavingsSeriesPoint[]>(obs => {
                this.computeProgressClientSide().then(data => {
                    obs.next(data);
                    obs.complete();
                }).catch(() => {
                    obs.next(this.progressCache?.data || []);
                    obs.complete();
                });
            })),
            shareReplay(1)
        );
        firstValueFrom(this.progressRequest$).then(data => {
            this.progressCache = { data, timestamp: Date.now() };
            this.progressRequest$ = null;
        });
    }

    /**
     * Get progress series as Observable (with caching — client-side computation)
     */
    getProgressSeries$(): Observable<SavingsSeriesPoint[]> {
        if (this.progressCache && this.isCacheValid(this.progressCache)) {
            return of(this.progressCache.data);
        }
        if (this.progressRequest$) return this.progressRequest$;

        this.progressRequest$ = of(null).pipe(
            switchMap(() => new Observable<SavingsSeriesPoint[]>(obs => {
                this.computeProgressClientSide().then(data => {
                    obs.next(data);
                    obs.complete();
                }).catch(() => {
                    obs.next(this.progressCache?.data || []);
                    obs.complete();
                });
            })),
            shareReplay(1)
        );

        firstValueFrom(this.progressRequest$).then(data => {
            this.progressCache = { data, timestamp: Date.now() };
            this.progressRequest$ = null;
        });

        return this.progressRequest$;
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
            // Invalidate cache
            this.invalidateTransactionsCache();
            this.invalidateStatsCache();
            return mapped;
        });
    }

    updateTransaction(record: SavingRecord): Promise<SavingRecord> {
        if (!record.id) return Promise.reject(new Error('Missing id'));

        // Same conversion as addTransaction.
        const transactionData = {
            type: record.type === 'Deposit' ? 'income' as const : 'expense' as const,
            amount: this.currencyService.toBaseAmount(record.amount),
            description: record.note,
            date: record.date
        };
        
        return firstValueFrom(this.api.updateTransaction(parseInt(record.id), transactionData)).then(t => {
            const mapped = this.mapTransactionToRecord(t);
            // Invalidate cache
            this.invalidateTransactionsCache();
            this.invalidateStatsCache();
            return mapped;
        });
    }

    deleteTransactions(ids: string[]): Promise<void> {
        const deletePromises = ids.map(id => 
            firstValueFrom(this.api.deleteTransaction(parseInt(id)))
        );
        return Promise.all(deletePromises).then(() => {
            // Invalidate cache
            this.invalidateTransactionsCache();
            this.invalidateStatsCache();
        });
    }

    // ==================== PRIVATE HELPERS ====================

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
    
    // ==================== CACHE HELPERS ====================
    
    private isCacheValid<T>(cache: CacheEntry<T>): boolean {
        return Date.now() - cache.timestamp < CACHE_TTL;
    }
    
    private isCacheStale<T>(cache: CacheEntry<T>): boolean {
        return Date.now() - cache.timestamp >= CACHE_TTL;
    }
    
    private invalidateGoalsCache(): void {
        this.goalsCache = null;
        this.goalsRequest$ = null;
    }
    
    private invalidateTransactionsCache(): void {
        this.transactionsCache = null;
        this.transactionsRequest$ = null;
    }
    
    private invalidateStatsCache(): void {
        this.statsCache = null;
        this.statsRequest$ = null;
    }
    
    private invalidateProgressCache(): void {
        this.progressCache = null;
        this.progressRequest$ = null;
    }
    
    /**
     * Clear all caches (useful for logout or manual refresh)
     */
    clearCache(): void {
        this.invalidateGoalsCache();
        this.invalidateTransactionsCache();
        this.invalidateStatsCache();
        this.invalidateProgressCache();
    }
}
