import { Injectable, inject } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';
import {
    ApiService, Debt, DebtCategory, DebtCreate, DebtDetail, DebtPaymentFrequency, DebtPaymentRow,
    DebtUpdate, DebtsDashboardSummary,
} from '../../core/services/api.service';
import { AssetsStateService } from './assets-state.service';
import { CurrencyService } from '../../core/services/currency.service';
import { CACHE_RESET } from '../../core/services/cache-reset.token';
import { cachedResource } from '../../core/util/cached-resource';
import { toLocalDateStr } from '../../core/util/date';

/**
 * A debt as the web app reasons about it (P0 premium debts).
 *
 * `total` / `paid` are EUR base (lists, sums, net worth); every `native*`
 * field is the debt's own currency (forms, the payment sheet, the ledger).
 * Time facts come straight from the API: the server owns due/overdue.
 */
export interface DebtRecord {
    id?: string;
    date: string;                       // YYYY-MM-DD start date
    type: 'Debt' | 'Receivable';
    category: DebtCategory;
    name: string;
    total: number;                      // EUR base
    paid: number;                       // EUR base, paid (Debt) or received (Receivable)
    currency: string;
    nativeTotal: number;
    nativePaid: number;
    nativeRemaining: number;
    interestRate: number;               // %
    monthlyPayment?: number;            // native instalment amount
    frequency: DebtPaymentFrequency;    // monthly | weekly | once | free
    nextPaymentDate?: string | null;    // YYYY-MM-DD
    isOverdue: boolean;
    daysOverdue: number;
    note?: string;
    creditor?: string;
    isPaidOff: boolean;
    paidOffDate?: string | null;
    closedReason?: string | null;
    lastPaymentDate?: string | null;
    lastPaymentAmount?: number | null;  // native
}

export interface DebtDetailRecord extends DebtRecord {
    payments: DebtPaymentRow[];
}

/** Numbers for the page hero, EUR base except where noted. */
export interface DebtsHero {
    iOwe: number;
    owedToMe: number;
    net: number;                        // owedToMe − iOwe
    overdueCount: number;
    dueWithin30Days: number;            // instalments I owe in the next 30 days
    expectedWithin30Days: number;       // receivables due in the next 30 days
    nextDue: { debtId: number; name: string; type: 'Debt' | 'Receivable'; date: string; amountEur: number; isOverdue: boolean } | null;
}

export interface OverpaymentError { code: 'OVERPAYMENT'; remaining: number; currency: string; }

@Injectable({ providedIn: 'root' })
export class DebtsService {
    private api             = inject(ApiService);
    private stateService    = inject(AssetsStateService);
    private currencyService = inject(CurrencyService);

    /** Single source of truth for the debt list (shared cachedResource, P2-FE-1).
     *  Settled debts are included so the "Soldées" segment has something to show. */
    private recordsResource = cachedResource<DebtRecord[]>(
        () => firstValueFrom(this.api.getDebts(0, 200, false).pipe(
            map(debts => debts.map(d => this.mapDebtToRecord(d))),
        )),
    );
    private heroResource = cachedResource<DebtsDashboardSummary | null>(
        () => firstValueFrom(this.api.getDebtsDashboard()),
    );

    constructor() {
        // Invalidate when debts change through the state bus rather than this
        // service's own writes, e.g. an AI Config create (S12 P4).
        this.stateService.debtsUpdated$.subscribe(() => {
            this.recordsResource.invalidate();
            this.heroResource.invalidate();
        });
        inject(CACHE_RESET).subscribe(() => this.clearCache());
    }

    /** Get all debt records (cached: TTL + stale-while-revalidate + dedup). */
    getRecords(): Promise<DebtRecord[]> {
        return this.recordsResource.load();
    }

    /** A debt with its ledger (direct, uncached). Null when it no longer exists. */
    async getDetail(id: number): Promise<DebtDetailRecord | null> {
        try {
            const d = await firstValueFrom(this.api.getDebtDetail(id));
            if (!d) return null;
            return { ...this.mapDebtToRecord(d), payments: d.payments ?? [] };
        } catch (error: any) {
            if (error?.status === 404) return null;
            throw error;
        }
    }

    /** Create a new debt. Amounts typed in the display currency travel
     *  unconverted, tagged with that currency (native storage). */
    async addRecord(record: DebtRecord): Promise<DebtRecord> {
        const debtData: DebtCreate = {
            name: record.name,
            type: record.type === 'Debt' ? 'i_owe' : 'owed_to_me',
            category: record.category || 'other',
            initial_amount: record.nativeTotal,
            current_amount: Math.max(0, record.nativeTotal - (record.nativePaid || 0)),
            currency: record.currency || this.currencyService.config().code,
            interest_rate: record.interestRate || 0,
            monthly_payment: record.monthlyPayment || undefined,
            payment_frequency: record.frequency || null,
            next_payment_date: record.nextPaymentDate || null,
            creditor_name: record.creditor,
            description: record.note,
            start_date: record.date,
        };
        const debt = await firstValueFrom(this.api.createDebt(debtData));
        const mapped = this.mapDebtToRecord(debt);
        this.markDebtsChanged();
        return mapped;
    }

    /** Update a debt. The balance is NOT sent: the ledger owns it (a payment
     *  or an explicit correction changes it, never the edit form). */
    async updateRecord(record: DebtRecord): Promise<DebtRecord> {
        if (!record.id) throw new Error('Missing id');
        const debtData: DebtUpdate = {
            name: record.name,
            type: record.type === 'Debt' ? 'i_owe' : 'owed_to_me',
            category: record.category,
            initial_amount: record.nativeTotal,
            interest_rate: record.interestRate,
            monthly_payment: record.monthlyPayment ?? null,
            payment_frequency: record.frequency || null,
            next_payment_date: record.nextPaymentDate || null,
            start_date: record.date || null,
            creditor_name: record.creditor,
            description: record.note,
        };
        const debt = await firstValueFrom(this.api.updateDebt(parseInt(record.id), debtData));
        const mapped = this.mapDebtToRecord(debt);
        this.markDebtsChanged();
        return mapped;
    }

    /** Delete debts by IDs. */
    async deleteRecords(ids: string[]): Promise<void> {
        await Promise.all(ids.map(id => firstValueFrom(this.api.deleteDebt(parseInt(id)))));
        this.markDebtsChanged();
    }

    /**
     * Record a payment in the DEBT's own currency (no display → EUR → native
     * round trip). `strict` asks the server for a 409 OVERPAYMENT instead of
     * the default clamp, so the sheet can offer "settle for the remaining?".
     */
    async addPayment(id: string, nativeAmount: number, opts: { date?: string | null; note?: string | null; strict?: boolean } = {}): Promise<DebtRecord> {
        const debt = await firstValueFrom(this.api.makePayment(parseInt(id), {
            amount: nativeAmount,
            date: opts.date ?? toLocalDateStr(new Date()),
            note: opts.note ?? null,
            strict: opts.strict ?? true,
        }));
        const mapped = this.mapDebtToRecord(debt);
        this.markDebtsChanged();
        return mapped;
    }

    /** The 409 payload when the server refused an overpayment, else null. */
    overpaymentOf(error: any): OverpaymentError | null {
        const d = error?.error?.detail;
        return d && d.code === 'OVERPAYMENT' ? d as OverpaymentError : null;
    }

    async deletePayment(debtId: number, paymentId: number): Promise<DebtDetailRecord> {
        const d = await firstValueFrom(this.api.deleteDebtPayment(debtId, paymentId));
        this.markDebtsChanged();
        return { ...this.mapDebtToRecord(d), payments: d.payments ?? [] };
    }

    async writeOff(debtId: number, reason: 'written_off' | 'cancelled', note?: string | null): Promise<DebtRecord> {
        const d = await firstValueFrom(this.api.writeOffDebt(debtId, { reason, note: note ?? null }));
        this.markDebtsChanged();
        return this.mapDebtToRecord(d);
    }

    /** Hero numbers: totals from the cached list, time facts from the server. */
    async getHero(): Promise<DebtsHero> {
        const [debts, dash] = await Promise.all([this.recordsResource.load(), this.heroResource.load()]);
        const open = debts.filter(d => !d.isPaidOff);
        const iOwe = open.filter(d => d.type === 'Debt').reduce((s, d) => s + (d.total - d.paid), 0);
        const owedToMe = open.filter(d => d.type === 'Receivable').reduce((s, d) => s + (d.total - d.paid), 0);
        return {
            iOwe,
            owedToMe,
            net: owedToMe - iOwe,
            overdueCount: dash?.overdue_count ?? open.filter(d => d.isOverdue).length,
            dueWithin30Days: dash?.due_within_30_days_eur ?? 0,
            expectedWithin30Days: dash?.expected_within_30_days_eur ?? 0,
            nextDue: dash?.next_due ? {
                debtId: dash.next_due.debt_id,
                name: dash.next_due.name,
                type: dash.next_due.type === 'i_owe' ? 'Debt' : 'Receivable',
                date: dash.next_due.due_date,
                amountEur: dash.next_due.amount_eur,
                isOverdue: dash.next_due.is_overdue,
            } : null,
        };
    }

    /** A write happened: drop cache freshness and notify subscribers. */
    private markDebtsChanged(): void {
        this.recordsResource.invalidate();
        this.heroResource.invalidate();
        this.stateService.notifyDebtsUpdated();
    }

    // ==================== PRIVATE HELPERS ====================

    mapDebtToRecord(debt: Debt): DebtRecord {
        const paidNative = Math.max(0, debt.initial_amount - debt.current_amount);
        // Native → EUR base at the API boundary (same as assets/transactions).
        const toEur = (v: number) => this.currencyService.toEurFromNative(v, debt.currency);
        return {
            id: debt.id.toString(),
            date: debt.start_date || toLocalDateStr(new Date()),
            type: debt.type === 'i_owe' ? 'Debt' : 'Receivable',
            category: debt.category,
            name: debt.name,
            total: toEur(debt.initial_amount),
            paid: toEur(paidNative),
            currency: debt.currency || 'EUR',
            nativeTotal: debt.initial_amount,
            nativePaid: paidNative,
            nativeRemaining: debt.current_amount,
            interestRate: debt.interest_rate || 0,
            monthlyPayment: debt.monthly_payment || undefined,
            frequency: debt.payment_frequency ?? (debt.monthly_payment ? 'monthly' : 'free'),
            nextPaymentDate: debt.next_payment_date,
            isOverdue: !!debt.is_overdue,
            daysOverdue: debt.days_overdue ?? 0,
            note: debt.description ?? undefined,
            creditor: debt.creditor_name ?? undefined,
            isPaidOff: debt.is_paid_off,
            paidOffDate: debt.paid_off_date,
            closedReason: debt.closed_reason,
            lastPaymentDate: debt.last_payment_date,
            lastPaymentAmount: debt.last_payment_amount,
        };
    }

    /** Clear all caches on logout/login (prevents cross-user cache bleed, P1-10). */
    clearCache(): void {
        this.recordsResource.reset();
        this.heroResource.reset();
    }
}
