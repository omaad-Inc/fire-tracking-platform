import { Injectable } from '@angular/core';

export interface SavingRecord {
    id?: string;
    date: string;
    type: 'Deposit' | 'Withdrawal';
    amount: number;
    name: string;
    note?: string;
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

export interface SavingsGoal {
    label: string;
    current: number;
    target: number;
    colorClass: string;
    textColorClass: string;
}

@Injectable({ providedIn: 'root' })
export class SavingsService {
    private demoRecords: SavingRecord[] = [
        { id: '1', date: '2024-06-01', type: 'Deposit', amount: 500, name: 'Monthly Saving', note: 'Salary deposit' },
        { id: '2', date: '2024-06-10', type: 'Withdrawal', amount: 100, name: 'Gift', note: 'Birthday present for friend' },
        { id: '3', date: '2024-06-15', type: 'Deposit', amount: 200, name: 'Bonus', note: 'Performance bonus' },
        { id: '4', date: '2024-06-20', type: 'Withdrawal', amount: 50, name: 'Emergency', note: 'Unexpected expense' },
        { id: '5', date: '2024-07-01', type: 'Deposit', amount: 500, name: 'Monthly Saving', note: 'Salary deposit' },
        { id: '6', date: '2024-07-12', type: 'Withdrawal', amount: 80, name: 'Groceries', note: 'Supermarket shopping' },
        { id: '7', date: '2024-07-15', type: 'Deposit', amount: 150, name: 'Freelance', note: 'Side project payment' },
        { id: '8', date: '2024-07-20', type: 'Withdrawal', amount: 60, name: 'Transport', note: 'Car repair' },
        { id: '9', date: '2024-08-01', type: 'Deposit', amount: 500, name: 'Monthly Saving', note: 'Salary deposit' },
        { id: '10', date: '2024-08-05', type: 'Withdrawal', amount: 120, name: 'Vacation', note: 'Trip to the beach' },
        { id: '11', date: '2024-08-10', type: 'Deposit', amount: 100, name: 'Gift', note: 'Received from family' },
        { id: '12', date: '2024-08-15', type: 'Withdrawal', amount: 40, name: 'Dining', note: 'Restaurant with friends' },
        { id: '13', date: '2024-08-20', type: 'Deposit', amount: 300, name: 'Refund', note: 'Tax refund' },
        { id: '14', date: '2024-08-25', type: 'Withdrawal', amount: 90, name: 'Shopping', note: 'New clothes' },
        { id: '15', date: '2024-09-01', type: 'Deposit', amount: 500, name: 'Monthly Saving', note: 'Salary deposit' },
        { id: '16', date: '2025-09-10', type: 'Deposit', amount: 1500, name: 'Monthly Saving', note: 'for emergency fund' }

    ];

    getTransactions(): Promise<SavingRecord[]> {
        return Promise.resolve([...this.demoRecords]);
    }

    addTransaction(record: SavingRecord): Promise<SavingRecord> {
        const id = this.generateId();
        const created = { ...record, id };
        this.demoRecords = [...this.demoRecords, created];
        return Promise.resolve(created);
    }

    updateTransaction(record: SavingRecord): Promise<SavingRecord> {
        if (!record.id) return Promise.reject(new Error('Missing id'));
        const idx = this.demoRecords.findIndex((r) => r.id === record.id);
        if (idx === -1) return Promise.reject(new Error('Not found'));
        const next = [...this.demoRecords];
        next[idx] = { ...record };
        this.demoRecords = next;
        return Promise.resolve(record);
    }

    deleteTransactions(ids: string[]): Promise<void> {
        this.demoRecords = this.demoRecords.filter((r) => !ids.includes(r.id!));
        return Promise.resolve();
    }

    getStatsSummary(): Promise<SavingsStatsSummary> {
        const totalDeposits = this.demoRecords.filter((r) => r.type === 'Deposit').reduce((a, b) => a + b.amount, 0);
        const totalWithdrawals = this.demoRecords.filter((r) => r.type === 'Withdrawal').reduce((a, b) => a + b.amount, 0);
        const totalSavings = totalDeposits - totalWithdrawals;

        // naive monthly breakdown (YYYY-MM)
        const byMonth: Record<string, number> = {};
        for (const r of this.demoRecords) {
            const m = (r.date || '').slice(0, 7);
            const signed = r.type === 'Deposit' ? r.amount : -r.amount;
            byMonth[m] = (byMonth[m] || 0) + signed;
        }
        const vals = Object.values(byMonth);
        const avgMonthlySaving = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : 0;
        const latestKey = Object.keys(byMonth).sort().at(-1);
        const thisMonthSaving = latestKey ? byMonth[latestKey] : 0;

        return Promise.resolve({ totalSavings, thisMonthSaving, avgMonthlySaving });
    }

    getProgressSeries(): Promise<SavingsSeriesPoint[]> {
        // For demo, aggregate by month cumulative
        const byMonth: Record<string, number> = {};
        for (const r of this.demoRecords) {
            const m = (r.date || '').slice(0, 7);
            const signed = r.type === 'Deposit' ? r.amount : -r.amount;
            byMonth[m] = (byMonth[m] || 0) + signed;
        }
        const months = Object.keys(byMonth).sort();
        let running = 0;
        const series: SavingsSeriesPoint[] = months.map((m) => {
            running += byMonth[m];
            return { label: m, value: running };
        });
        return Promise.resolve(series);
    }

    private generateId(): string {
        let text = '';
        let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (var i = 0; i < 5; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    getGoals(): Promise<SavingsGoal[]> {
        // Compute from existing transactions
        const signed = this.demoRecords.map((r) => ({
            ...r,
            signedAmount: r.type === 'Deposit' ? r.amount : -r.amount
        }));

        const totalSavings = signed.reduce((sum, r) => sum + r.signedAmount, 0);
        const perCurrent = signed
            .filter((r) => r.type === 'Deposit' && (r.name || '').toLowerCase().includes('monthly'))
            .reduce((sum, r) => sum + r.amount, 0);
        const vacationCurrent = signed
            .filter((r) => r.type === 'Deposit' && ((r.name || '').toLowerCase().includes('vacation') || (r.note || '').toLowerCase().includes('vacation') || (r.note || '').toLowerCase().includes('travel')))
            .reduce((sum, r) => sum + r.amount, 0);

        const goals: SavingsGoal[] = [
            { label: 'Emergency Fund', current: Math.max(0, totalSavings), target: 10000, colorClass: 'bg-blue-700', textColorClass: 'text-blue-700' },
            { label: 'Plan Epargne Retraite', current: Math.max(0, perCurrent), target: 20000, colorClass: 'bg-green-600', textColorClass: 'text-green-600' },
            { label: 'Vacation', current: Math.max(1500, vacationCurrent), target: 3000, colorClass: 'bg-orange-600', textColorClass: 'text-orange-600' }
        ];

        return Promise.resolve(goals);
    }
}


