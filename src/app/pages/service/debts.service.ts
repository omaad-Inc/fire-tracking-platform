import { Injectable } from '@angular/core';

export interface DebtRecord {
    id?: string;
    date: string; // YYYY-MM-DD
    type: 'Debt' | 'Receivable';
    name: string;
    total: number;
    paid: number; // paid (for Debt) or received (for Receivable)
    interestRate: number; // %
    frequency: 'Mensuel' | 'Unique' | 'Libre';
    note?: string;
}

export interface DebtsStatsSummary {
    totalDebt: number;
    paidAmount: number;
    receivables: number;
    totalDebtChange?: number;
    paidAmountChange?: number;
    receivablesChange?: number;
}

@Injectable({ providedIn: 'root' })
export class DebtsService {
    private records: DebtRecord[] = [
        { id: '1', date: '2024-06-01', type: 'Debt', name: 'Loyer 2 mois', total: 2400, paid: 1200, interestRate: 2.5, frequency: 'Mensuel', note: 'Loyer en retard' },
        { id: '2', date: '2024-06-10', type: 'Receivable', name: 'Ami doit remboursement', total: 1000, paid: 300, interestRate: 0, frequency: 'Libre', note: 'Prêt à un ami' },
        { id: '3', date: '2024-06-15', type: 'Debt', name: 'Crédit Auto', total: 15000, paid: 5000, interestRate: 3.2, frequency: 'Mensuel', note: 'Crédit voiture' },
        { id: '4', date: '2024-07-01', type: 'Receivable', name: 'Remboursement famille', total: 500, paid: 200, interestRate: 0, frequency: 'Unique', note: 'Avance à la famille' }
    ];

    getRecords(): Promise<DebtRecord[]> {
        return Promise.resolve([...this.records]);
    }

    addRecord(record: DebtRecord): Promise<DebtRecord> {
        const id = this.generateId();
        const created = { ...record, id };
        this.records = [...this.records, created];
        return Promise.resolve(created);
    }

    updateRecord(record: DebtRecord): Promise<DebtRecord> {
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

    addPayment(id: string, amount: number): Promise<DebtRecord> {
        const idx = this.records.findIndex((r) => r.id === id);
        if (idx === -1) return Promise.reject(new Error('Not found'));
        const rec = this.records[idx];
        const updated: DebtRecord = { ...rec, paid: Math.min(rec.paid + amount, rec.total) };
        const next = [...this.records];
        next[idx] = updated;
        this.records = next;
        return Promise.resolve(updated);
    }

    getStats(): Promise<DebtsStatsSummary> {
        const totalDebt = this.records.filter((r) => r.type === 'Debt').reduce((a, b) => a + (b.total - b.paid), 0);
        const paidAmount = this.records.filter((r) => r.type === 'Debt').reduce((a, b) => a + b.paid, 0);
        const receivables = this.records.filter((r) => r.type === 'Receivable').reduce((a, b) => a + (b.total - b.paid), 0);
        // Simple demo deltas set to 0; can compute month-over-month later
        return Promise.resolve({ totalDebt, paidAmount, receivables, totalDebtChange: 0, paidAmountChange: 0, receivablesChange: 0 });
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


