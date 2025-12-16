import { Injectable, inject } from '@angular/core';
import { Observable, map, catchError, of, firstValueFrom } from 'rxjs';
import { ApiService, Debt, DebtCreate, DebtUpdate, DebtType, DebtCategory } from '../../core/services/api.service';

export interface DebtRecord {
    id?: string;
    date: string; // YYYY-MM-DD
    type: 'Debt' | 'Receivable';
    category: DebtCategory;
    name: string;
    total: number;
    paid: number; // paid (for Debt) or received (for Receivable)
    interestRate: number; // %
    monthlyPayment?: number;
    frequency: 'Mensuel' | 'Unique' | 'Libre';
    note?: string;
    creditor?: string;
    isPaidOff?: boolean;
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
    private api = inject(ApiService);

    /**
     * Get all debt records
     */
    async getRecords(): Promise<DebtRecord[]> {
        try {
            const debts = await firstValueFrom(this.api.getDebts());
            return debts.map(debt => this.mapDebtToRecord(debt));
        } catch (error) {
            console.error('Error fetching debts:', error);
            return [];
        }
    }

    /**
     * Get debts as Observable
     */
    getRecords$(): Observable<DebtRecord[]> {
        return this.api.getDebts().pipe(
            map(debts => debts.map(debt => this.mapDebtToRecord(debt))),
            catchError(error => {
                console.error('Error fetching debts:', error);
                return of([]);
            })
        );
    }

    /**
     * Get a single debt by ID
     */
    async getRecord(id: number): Promise<DebtRecord | null> {
        try {
            const debt = await firstValueFrom(this.api.getDebt(id));
            return this.mapDebtToRecord(debt);
        } catch (error) {
            console.error('Error fetching debt:', error);
            return null;
        }
    }

    /**
     * Create a new debt
     */
    async addRecord(record: DebtRecord): Promise<DebtRecord> {
        try {
            const debtData: DebtCreate = {
                name: record.name,
                type: record.type === 'Debt' ? 'i_owe' : 'owed_to_me',
                category: record.category || this.inferCategory(record.name),
                initial_amount: record.total,
                current_amount: record.total - record.paid,
                interest_rate: record.interestRate || 0,
                monthly_payment: record.monthlyPayment || 0,
                creditor_name: record.creditor,
                description: record.note,
                start_date: record.date
            };
            
            const debt = await firstValueFrom(this.api.createDebt(debtData));
            return this.mapDebtToRecord(debt);
        } catch (error) {
            console.error('Error creating debt:', error);
            throw error;
        }
    }

    /**
     * Update a debt
     */
    async updateRecord(record: DebtRecord): Promise<DebtRecord> {
        if (!record.id) throw new Error('Missing id');
        
        try {
            const debtData: DebtUpdate = {
                name: record.name,
                initial_amount: record.total,
                current_amount: record.total - record.paid,
                interest_rate: record.interestRate,
                monthly_payment: record.monthlyPayment,
                creditor_name: record.creditor,
                description: record.note
            };
            
            const debt = await firstValueFrom(this.api.updateDebt(parseInt(record.id), debtData));
            return this.mapDebtToRecord(debt);
        } catch (error) {
            console.error('Error updating debt:', error);
            throw error;
        }
    }

    /**
     * Delete debts by IDs
     */
    async deleteRecords(ids: string[]): Promise<void> {
        try {
            await Promise.all(ids.map(id => 
                firstValueFrom(this.api.deleteDebt(parseInt(id)))
            ));
        } catch (error) {
            console.error('Error deleting debts:', error);
            throw error;
        }
    }

    /**
     * Add payment to a debt
     */
    async addPayment(id: string, amount: number): Promise<DebtRecord> {
        try {
            const debt = await firstValueFrom(this.api.makePayment(parseInt(id), amount));
            return this.mapDebtToRecord(debt);
        } catch (error) {
            console.error('Error making payment:', error);
            throw error;
        }
    }

    /**
     * Get debt statistics
     */
    async getStats(): Promise<DebtsStatsSummary> {
        try {
            const debts = await this.getRecords();
            
            const totalDebt = debts
                .filter(d => d.type === 'Debt')
                .reduce((sum, d) => sum + (d.total - d.paid), 0);
            
            const paidAmount = debts
                .filter(d => d.type === 'Debt')
                .reduce((sum, d) => sum + d.paid, 0);
            
            const receivables = debts
                .filter(d => d.type === 'Receivable')
                .reduce((sum, d) => sum + (d.total - d.paid), 0);
            
            return {
                totalDebt,
                paidAmount,
                receivables,
                totalDebtChange: 0,
                paidAmountChange: 0,
                receivablesChange: 0
            };
        } catch (error) {
            console.error('Error fetching stats:', error);
            return {
                totalDebt: 0,
                paidAmount: 0,
                receivables: 0
            };
        }
    }

    // ==================== PRIVATE HELPERS ====================

    private mapDebtToRecord(debt: Debt): DebtRecord {
        const paidAmount = debt.initial_amount - debt.current_amount;
        return {
            id: debt.id.toString(),
            date: debt.start_date || new Date().toISOString().split('T')[0],
            type: debt.type === 'i_owe' ? 'Debt' : 'Receivable',
            category: debt.category,
            name: debt.name,
            total: debt.initial_amount,
            paid: paidAmount > 0 ? paidAmount : 0,
            interestRate: debt.interest_rate || 0,
            monthlyPayment: debt.monthly_payment || undefined,
            frequency: debt.monthly_payment ? 'Mensuel' : 'Libre',
            note: debt.description ?? undefined,
            creditor: debt.creditor_name ?? undefined,
            isPaidOff: debt.is_paid_off
        };
    }

    private inferCategory(name: string): DebtCategory {
        const nameLower = name.toLowerCase();
        if (nameLower.includes('immobilier') || nameLower.includes('mortgage') || nameLower.includes('house') || nameLower.includes('maison')) {
            return 'mortgage';
        }
        if (nameLower.includes('auto') || nameLower.includes('car') || nameLower.includes('voiture')) {
            return 'car_loan';
        }
        if (nameLower.includes('etudiant') || nameLower.includes('student') || nameLower.includes('education')) {
            return 'student_loan';
        }
        if (nameLower.includes('carte') || nameLower.includes('credit card')) {
            return 'credit_card';
        }
        if (nameLower.includes('personnel') || nameLower.includes('personal')) {
            return 'personal_loan';
        }
        if (nameLower.includes('famille') || nameLower.includes('ami') || nameLower.includes('friend') || nameLower.includes('family')) {
            return 'family_friend';
        }
        return 'other';
    }
}
