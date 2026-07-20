import { Injectable, inject } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';
import { ApiService, Debt, DebtCreate, DebtUpdate, DebtCategory } from '../../core/services/api.service';
import { AssetsStateService } from './assets-state.service';
import { CurrencyService } from '../../core/services/currency.service';
import { CACHE_RESET } from '../../core/services/cache-reset.token';
import { cachedResource } from '../../core/util/cached-resource';

export interface DebtRecord {
    id?: string;
    date: string; // YYYY-MM-DD
    type: 'Debt' | 'Receivable';
    category: DebtCategory;
    name: string;
    total: number;        // EUR base — for lists/sums/net-worth math
    paid: number;         // EUR base — paid (for Debt) or received (for Receivable)
    /** The debt's own currency + amounts in it — used by the edit form. */
    currency?: string;
    nativeTotal?: number;
    nativePaid?: number;
    interestRate: number; // %
    monthlyPayment?: number;
    frequency: 'Mensuel' | 'Unique' | 'Libre';
    note?: string;
    creditor?: string;
    isPaidOff?: boolean;
}

export interface DebtsStatsSummary {
    totalDebt: number;         // Sum of all debts I owe (current amount remaining)
    paidAmount: number;        // Last payment made (not cumulative)
    receivables: number;       // Sum of all receivables (money owed to me)
    totalDebtChange?: number;
    paidAmountChange?: number;
    receivablesChange?: number;
    lastPaymentDate?: string;  // Date of last payment
}

@Injectable({ providedIn: 'root' })
export class DebtsService {
    private api             = inject(ApiService);
    private stateService    = inject(AssetsStateService);
    private currencyService = inject(CurrencyService);

    /** Single source of truth for the debt list (shared cachedResource — P2-FE-1). */
    private recordsResource = cachedResource<DebtRecord[]>(
        () => firstValueFrom(this.api.getDebts().pipe(
            map(debts => debts.map(d => this.mapDebtToRecord(d))),
        )),
    );

    constructor() {
        // Clear cached user data on logout/login (see CACHE_RESET).
        inject(CACHE_RESET).subscribe(() => this.clearCache());
    }

    /** Get all debt records (cached: TTL + stale-while-revalidate + dedup). */
    getRecords(): Promise<DebtRecord[]> {
        return this.recordsResource.load();
    }

    /** Get a single debt by ID (direct, uncached). */
    async getRecord(id: number): Promise<DebtRecord | null> {
        try {
            const debt = await firstValueFrom(this.api.getDebt(id));
            return this.mapDebtToRecord(debt);
        } catch (error) {
            console.error('Error fetching debt:', error);
            return null;
        }
    }

    /** Create a new debt. */
    async addRecord(record: DebtRecord): Promise<DebtRecord> {
        try {
            // Debts are stored NATIVE (like assets/transactions): the amounts the
            // user typed in their display currency go through unconverted, tagged
            // with that currency code — FX happens at read time.
            const debtData: DebtCreate = {
                name: record.name,
                type: record.type === 'Debt' ? 'i_owe' : 'owed_to_me',
                category: record.category || this.inferCategory(record.name),
                initial_amount: record.total,
                current_amount: record.total - record.paid,
                currency: this.currencyService.config().code,
                interest_rate: record.interestRate || 0,
                monthly_payment: record.monthlyPayment || 0,
                creditor_name: record.creditor,
                description: record.note,
                start_date: record.date
            };

            const debt = await firstValueFrom(this.api.createDebt(debtData));
            const mapped = this.mapDebtToRecord(debt);
            this.markDebtsChanged();
            return mapped;
        } catch (error) {
            console.error('Error creating debt:', error);
            throw error;
        }
    }

    /** Update a debt. */
    async updateRecord(record: DebtRecord): Promise<DebtRecord> {
        if (!record.id) throw new Error('Missing id');

        try {
            // The edit form is prefilled with the debt's NATIVE amounts
            // (nativeTotal/nativePaid), so what comes back is native too —
            // no conversion; the debt keeps its original currency.
            const debtData: DebtUpdate = {
                name: record.name,
                initial_amount: record.total,
                current_amount: record.total - record.paid,
                interest_rate: record.interestRate,
                monthly_payment: record.monthlyPayment || undefined,
                creditor_name: record.creditor,
                description: record.note
            };

            const debt = await firstValueFrom(this.api.updateDebt(parseInt(record.id), debtData));
            const mapped = this.mapDebtToRecord(debt);
            this.markDebtsChanged();
            return mapped;
        } catch (error) {
            console.error('Error updating debt:', error);
            throw error;
        }
    }

    /** Delete debts by IDs. */
    async deleteRecords(ids: string[]): Promise<void> {
        try {
            await Promise.all(ids.map(id =>
                firstValueFrom(this.api.deleteDebt(parseInt(id)))
            ));
            this.markDebtsChanged();
        } catch (error) {
            console.error('Error deleting debts:', error);
            throw error;
        }
    }

    /** Add a payment to a debt. */
    async addPayment(id: string, amount: number): Promise<DebtRecord> {
        try {
            // amount is entered in the DISPLAY currency; the backend subtracts it
            // from current_amount, which is in the DEBT's native currency —
            // convert display -> EUR -> debt-native.
            const debtCurrency = this.recordsResource.peek()?.find(r => r.id === id)?.currency || 'EUR';
            const eur = this.currencyService.toBaseAmount(amount);
            const nativeAmount = eur * this.currencyService.rateOf(debtCurrency);
            const debt = await firstValueFrom(this.api.makePayment(parseInt(id), nativeAmount));
            const mapped = this.mapDebtToRecord(debt);
            this.markDebtsChanged();
            return mapped;
        } catch (error) {
            console.error('Error making payment:', error);
            throw error;
        }
    }

    /**
     * Debt statistics — a pure derivation of the cached list (no second cache).
     * - totalDebt: remaining amount across active "Debt" rows (what I still owe)
     * - paidAmount: the most recent payment made
     * - receivables: remaining amount across active "Receivable" rows (owed to me)
     * Errors surface through the resource (cold failure rejects → widget retries).
     */
    async getStats(): Promise<DebtsStatsSummary> {
        const debts = await this.recordsResource.load();

        const totalDebt = debts
            .filter(d => d.type === 'Debt' && !d.isPaidOff)
            .reduce((sum, d) => sum + (d.total - d.paid), 0);

        const receivables = debts
            .filter(d => d.type === 'Receivable' && !d.isPaidOff)
            .reduce((sum, d) => sum + (d.total - d.paid), 0);

        const debtsWithPayments = debts
            .filter(d => d.type === 'Debt' && d.paid > 0)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        let lastPaymentAmount = 0;
        let lastPaymentDate = '';
        if (debtsWithPayments.length > 0) {
            const mostRecentDebt = debtsWithPayments[0];
            // monthlyPayment is stored native (edit-form value); paid is already
            // EUR base — convert the former before displaying.
            lastPaymentAmount = mostRecentDebt.monthlyPayment
                ? this.currencyService.toEurFromNative(mostRecentDebt.monthlyPayment, mostRecentDebt.currency)
                : mostRecentDebt.paid;
            lastPaymentDate = mostRecentDebt.date;
        }

        return {
            totalDebt,
            paidAmount: lastPaymentAmount,
            receivables,
            totalDebtChange: 0,
            paidAmountChange: lastPaymentAmount,
            receivablesChange: receivables,
            lastPaymentDate,
        };
    }

    /** A write happened: drop cache freshness and notify subscribers. */
    private markDebtsChanged(): void {
        this.recordsResource.invalidate();
        this.stateService.notifyDebtsUpdated();
    }

    // ==================== PRIVATE HELPERS ====================

    private mapDebtToRecord(debt: Debt): DebtRecord {
        const paidAmount = debt.initial_amount - debt.current_amount;
        // Native → EUR base at the API boundary (same as assets/transactions);
        // keep native values for the edit form.
        const toEur = (v: number) => this.currencyService.toEurFromNative(v, debt.currency);
        return {
            id: debt.id.toString(),
            date: debt.start_date || new Date().toISOString().split('T')[0],
            type: debt.type === 'i_owe' ? 'Debt' : 'Receivable',
            category: debt.category,
            name: debt.name,
            total: toEur(debt.initial_amount),
            paid: toEur(paidAmount > 0 ? paidAmount : 0),
            currency: debt.currency || 'EUR',
            nativeTotal: debt.initial_amount,
            nativePaid: paidAmount > 0 ? paidAmount : 0,
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

    /** Clear all caches on logout/login (prevents cross-user cache bleed — P1-10). */
    clearCache(): void {
        this.recordsResource.reset();
    }
}
