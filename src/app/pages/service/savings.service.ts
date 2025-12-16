import { Injectable, inject } from '@angular/core';
import { Observable, map, catchError, of, firstValueFrom } from 'rxjs';
import { ApiService, SavingGoal, SavingGoalCreate, SavingGoalUpdate, Transaction } from '../../core/services/api.service';

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

// Color palette for goals
const GOAL_COLORS = [
    { bg: 'bg-blue-700', text: 'text-blue-700' },
    { bg: 'bg-green-600', text: 'text-green-600' },
    { bg: 'bg-orange-600', text: 'text-orange-600' },
    { bg: 'bg-purple-600', text: 'text-purple-600' },
    { bg: 'bg-cyan-600', text: 'text-cyan-600' },
    { bg: 'bg-pink-600', text: 'text-pink-600' },
];

@Injectable({ providedIn: 'root' })
export class SavingsService {
    private api = inject(ApiService);

    // ==================== SAVING GOALS ====================

    /**
     * Get all saving goals
     */
    async getGoals(): Promise<SavingsGoalDisplay[]> {
        try {
            const goals = await firstValueFrom(this.api.getSavingGoals());
            return goals.map((goal, index) => this.mapGoalToDisplay(goal, index));
        } catch (error) {
            console.error('Error fetching saving goals:', error);
            return [];
        }
    }

    /**
     * Get saving goals as Observable
     */
    getGoals$(): Observable<SavingsGoalDisplay[]> {
        return this.api.getSavingGoals().pipe(
            map(goals => goals.map((goal, index) => this.mapGoalToDisplay(goal, index))),
            catchError(error => {
                console.error('Error fetching saving goals:', error);
                return of([]);
            })
        );
    }

    /**
     * Create a new saving goal
     */
    async createGoal(data: SavingGoalCreate): Promise<SavingsGoalDisplay | null> {
        try {
            const goal = await firstValueFrom(this.api.createSavingGoal(data));
            return this.mapGoalToDisplay(goal, 0);
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
            return this.mapGoalToDisplay(goal, 0);
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
        } catch (error) {
            console.error('Error deleting saving goal:', error);
            throw error;
        }
    }

    /**
     * Add contribution to a saving goal
     */
    async addContribution(goalId: number, amount: number): Promise<SavingsGoalDisplay | null> {
        try {
            const goal = await firstValueFrom(this.api.addContribution(goalId, amount));
            return this.mapGoalToDisplay(goal, 0);
        } catch (error) {
            console.error('Error adding contribution:', error);
            throw error;
        }
    }

    // ==================== TRANSACTIONS (Savings-related) ====================

    /**
     * Get savings-related transactions
     */
    async getTransactions(): Promise<SavingRecord[]> {
        try {
            const transactions = await firstValueFrom(this.api.getTransactions(0, 100));
            // Filter for savings-related transactions
            const savingsTransactions = transactions.filter(t => 
                t.category === 'savings' || t.category === 'investment'
            );
            return savingsTransactions.map(t => this.mapTransactionToRecord(t));
        } catch (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }
    }

    /**
     * Get statistics summary from API
     * Total Savings = Sum of all saving goals current amounts
     * This Month Saving = Sum of all deposits this month - withdrawals this month
     * Average Monthly Saving = Average of all deposits per month
     */
    async getStatsSummary(): Promise<SavingsStatsSummary> {
        try {
            const goals = await this.getGoals();
            
            // Total Savings = Sum of all saving goals current amounts
            const totalSavings = goals.reduce((sum, g) => sum + g.current, 0);
            
            // Get all savings transactions
            const transactions = await this.getTransactions();
            
            // This month saving
            const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
            const thisMonthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
            const thisMonthDeposits = thisMonthTransactions
                .filter(t => t.type === 'Deposit')
                .reduce((sum, t) => sum + t.amount, 0);
            const thisMonthWithdrawals = thisMonthTransactions
                .filter(t => t.type === 'Withdrawal')
                .reduce((sum, t) => sum + t.amount, 0);
            const thisMonthSaving = thisMonthDeposits - thisMonthWithdrawals;
            
            // Calculate average monthly saving
            // Group deposits by month and calculate average
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
            
            return {
                totalSavings,
                thisMonthSaving,
                avgMonthlySaving
            };
        } catch (error) {
            console.error('Error fetching stats:', error);
            return { totalSavings: 0, thisMonthSaving: 0, avgMonthlySaving: 0 };
        }
    }

    /**
     * Get savings progression series
     */
    async getProgressSeries(): Promise<SavingsSeriesPoint[]> {
        try {
            const progression = await firstValueFrom(this.api.getWorthProgression(12));
            return progression.map(p => ({
                label: p.date,
                value: p.net_worth
            }));
        } catch (error) {
            console.error('Error fetching progress series:', error);
            return [];
        }
    }

    // ==================== LEGACY METHODS (for backward compatibility) ====================

    addTransaction(record: SavingRecord): Promise<SavingRecord> {
        // Convert to API format and create
        const transactionData = {
            type: record.type === 'Deposit' ? 'income' as const : 'expense' as const,
            category: 'savings' as const,
            amount: record.amount,
            description: record.note,
            date: record.date
        };
        
        return firstValueFrom(this.api.createTransaction(transactionData)).then(t => 
            this.mapTransactionToRecord(t)
        );
    }

    updateTransaction(record: SavingRecord): Promise<SavingRecord> {
        if (!record.id) return Promise.reject(new Error('Missing id'));
        
        const transactionData = {
            type: record.type === 'Deposit' ? 'income' as const : 'expense' as const,
            amount: record.amount,
            description: record.note,
            date: record.date
        };
        
        return firstValueFrom(this.api.updateTransaction(parseInt(record.id), transactionData)).then(t =>
            this.mapTransactionToRecord(t)
        );
    }

    deleteTransactions(ids: string[]): Promise<void> {
        const deletePromises = ids.map(id => 
            firstValueFrom(this.api.deleteTransaction(parseInt(id)))
        );
        return Promise.all(deletePromises).then(() => {});
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
}
