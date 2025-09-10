import { Injectable } from '@angular/core';

export interface TransactionRecord {
    id?: string;
    date: string;
    name: string;
    type: 'Income' | 'Expense';
    amount: number;
    account: string;
    remarks?: string;
}

@Injectable({ providedIn: 'root' })
export class TransactionsService {
    private records: TransactionRecord[] = [
        { id: '1', date: '2025-03-01', name: 'Investments', type: 'Income', amount: 900, account: 'Trade Republic', remarks: 'Crypto gains' },
        { id: '2', date: '2025-03-01', name: 'Gifts', type: 'Expense', amount: 150, account: 'SG BANK', remarks: "Present for a friend's wedding" },
        { id: '3', date: '2025-02-15', name: 'Education', type: 'Expense', amount: 200, account: 'Revolut', remarks: 'Subscription to an online course' },
        { id: '4', date: '2025-02-10', name: 'Side Hustle', type: 'Income', amount: 700, account: 'N26', remarks: 'Etsy shop earnings' },
        { id: '5', date: '2025-01-30', name: 'Home Maintenance', type: 'Expense', amount: 300, account: 'SG BANK', remarks: 'Fixing bathroom sink' },
        { id: '6', date: '2025-01-20', name: 'Salary', type: 'Income', amount: 2500, account: 'SG BANK', remarks: 'Monthly salary' },
        { id: '7', date: '2025-01-18', name: 'Groceries', type: 'Expense', amount: 120, account: 'Revolut', remarks: 'Supermarket' },
        { id: '8', date: '2025-01-10', name: 'Freelance', type: 'Income', amount: 400, account: 'N26', remarks: 'Web project' },
        { id: '9', date: '2025-01-05', name: 'Dining', type: 'Expense', amount: 60, account: 'SG BANK', remarks: 'Restaurant' },
        { id: '10', date: '2024-12-25', name: 'Bonus', type: 'Income', amount: 500, account: 'SG BANK', remarks: 'Year-end bonus' },
        { id: '11', date: '2024-12-20', name: 'Car Insurance', type: 'Expense', amount: 350, account: 'Revolut', remarks: 'Annual insurance payment' },
        { id: '12', date: '2024-12-15', name: 'Interest', type: 'Income', amount: 45, account: 'Trade Republic', remarks: 'Savings account interest' },
        { id: '13', date: '2024-12-10', name: 'Utilities', type: 'Expense', amount: 90, account: 'SG BANK', remarks: 'Electricity and water bill' },
        { id: '14', date: '2024-12-05', name: 'Child Benefit', type: 'Income', amount: 200, account: 'N26', remarks: 'Government support' },
        { id: '15', date: '2024-11-30', name: 'Medical', type: 'Expense', amount: 75, account: 'Revolut', remarks: 'Doctor visit' }
    ];

    getRecords(): Promise<TransactionRecord[]> {
        return Promise.resolve([...this.records]);
    }

    addRecord(record: TransactionRecord): Promise<TransactionRecord> {
        const id = this.generateId();
        const created = { ...record, id };
        this.records = [...this.records, created];
        return Promise.resolve(created);
    }

    updateRecord(record: TransactionRecord): Promise<TransactionRecord> {
        if (!record.id) return Promise.reject(new Error('Missing id'));
        const idx = this.records.findIndex((r) => r.id === record.id);
        if (idx === -1) return Promise.reject(new Error('Not found'));
        const next = [...this.records];
        next[idx] = { ...record };
        this.records = next;
        return Promise.resolve(record);
    }

    deleteRecords(ids: string[]): Promise<void> {
        this.records = this.records.filter((r) => !ids.includes(r.id!));
        return Promise.resolve();
    }

    private generateId(): string {
        let text = '';
        let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (var i = 0; i < 5; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}


