import { Injectable, inject } from '@angular/core';
import { Observable, map, catchError, of, firstValueFrom, shareReplay } from 'rxjs';
import { ApiService, Debt, DebtCreate, DebtUpdate, DebtType, DebtCategory } from '../../core/services/api.service';
import { AssetsStateService } from './assets-state.service';
import { CurrencyService } from '../../core/services/currency.service';
import { CACHE_RESET } from '../../core/services/cache-reset.token';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
    private api           = inject(ApiService);
    private stateService  = inject(AssetsStateService);
    private currencyService = inject(CurrencyService);
    
    // Cache storage
    private recordsCache: CacheEntry<DebtRecord[]> | null = null;
    private statsCache: CacheEntry<DebtsStatsSummary> | null = null;

    constructor() {
        // Clear cached user data on logout/login (see CACHE_RESET).
        inject(CACHE_RESET).subscribe(() => this.clearCache());
    }

    // Request deduplication
    private recordsRequest$: Observable<DebtRecord[]> | null = null;
    private statsRequest$: Observable<DebtsStatsSummary> | null = null;

    /**
     * Get all debt records (with caching)
     */
    async getRecords(): Promise<DebtRecord[]> {
        // Return cached data immediately if available and fresh
        if (this.recordsCache && this.isCacheValid(this.recordsCache)) {
            // Refresh in background if stale
            if (this.isCacheStale(this.recordsCache)) {
                this.refreshRecords();
            }
            return this.recordsCache.data;
        }
        
        // Return cached data even if stale (stale-while-revalidate)
        if (this.recordsCache) {
            // Refresh in background
            this.refreshRecords();
            return this.recordsCache.data;
        }
        
        // No cache, fetch fresh data
        return firstValueFrom(this.getRecords$());
    }
    
    /**
     * Refresh records in background
     */
    private refreshRecords(): void {
        if (this.recordsRequest$) return; // Already refreshing

        this.recordsRequest$ = this.createRecordsRequest();
    }

    /**
     * Build the shared records request. On failure: fall back to the cache if
     * one exists, otherwise LET THE ERROR SURFACE so widgets can render an
     * error+retry card instead of a fake-empty "no debts 🎉" state. The
     * in-flight handle is reset in all outcomes so retry works.
     */
    private createRecordsRequest(): Observable<DebtRecord[]> {
        const request$ = this.api.getDebts().pipe(
            map(debts => debts.map(debt => this.mapDebtToRecord(debt))),
            catchError(error => {
                console.error('Error fetching debts:', error);
                if (this.recordsCache) return of(this.recordsCache.data);
                throw error;
            }),
            shareReplay(1)
        );

        firstValueFrom(request$)
            .then(data => {
                this.recordsCache = { data, timestamp: Date.now() };
            })
            .catch(() => { /* surfaced to subscribers */ })
            .finally(() => {
                this.recordsRequest$ = null;
            });

        return request$;
    }

    /**
     * Get debts as Observable (with caching and deduplication)
     */
    getRecords$(): Observable<DebtRecord[]> {
        // Return cached data immediately if available
        if (this.recordsCache && this.isCacheValid(this.recordsCache)) {
            return of(this.recordsCache.data);
        }
        
        // Deduplicate simultaneous requests
        if (this.recordsRequest$) {
            return this.recordsRequest$;
        }

        // Create new request (errors surface when there is no cache to serve)
        this.recordsRequest$ = this.createRecordsRequest();
        return this.recordsRequest$;
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
            // Invalidate cache
            this.invalidateRecordsCache();
            this.invalidateStatsCache();
            // Notify that debts have been updated
            this.stateService.notifyDebtsUpdated();
            return mapped;
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
            // Invalidate cache
            this.invalidateRecordsCache();
            this.invalidateStatsCache();
            // Notify that debts have been updated
            this.stateService.notifyDebtsUpdated();
            return mapped;
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
            // Invalidate cache
            this.invalidateRecordsCache();
            this.invalidateStatsCache();
            // Notify that debts have been updated
            this.stateService.notifyDebtsUpdated();
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
            // amount is entered in the DISPLAY currency; the backend subtracts it
            // from current_amount, which is in the DEBT's native currency —
            // convert display -> EUR -> debt-native.
            const debtCurrency = this.recordsCache?.data.find(r => r.id === id)?.currency || 'EUR';
            const eur = this.currencyService.toBaseAmount(amount);
            const nativeAmount = eur * this.currencyService.rateOf(debtCurrency);
            const debt = await firstValueFrom(this.api.makePayment(parseInt(id), nativeAmount));
            const mapped = this.mapDebtToRecord(debt);
            // Invalidate cache
            this.invalidateRecordsCache();
            this.invalidateStatsCache();
            // Notify that debts have been updated
            this.stateService.notifyDebtsUpdated();
            return mapped;
        } catch (error) {
            console.error('Error making payment:', error);
            throw error;
        }
    }

    /**
     * Get debt statistics (with caching)
     * - totalDebt: Sum of all remaining debt amounts when type is "Debt" (what I still owe)
     * - paidAmount: The last payment made (most recent)
     * - receivables: Sum of all remaining receivable amounts when type is "Receivable" (what others owe me)
     */
    async getStats(): Promise<DebtsStatsSummary> {
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
        return firstValueFrom(this.getStats$());
    }
    
    /**
     * Refresh stats in background
     */
    private refreshStats(): void {
        if (this.statsRequest$) return; // Already refreshing

        // getStats$ assigns this.statsRequest$ and handles caching/reset.
        this.getStats$();
    }
    
    /**
     * Get stats as Observable (with caching and deduplication)
     */
    getStats$(): Observable<DebtsStatsSummary> {
        // Return cached data immediately if available
        if (this.statsCache && this.isCacheValid(this.statsCache)) {
            return of(this.statsCache.data);
        }
        
        // Deduplicate simultaneous requests
        if (this.statsRequest$) {
            return this.statsRequest$;
        }
        
        // Create new request
        this.statsRequest$ = this.getRecords$().pipe(
            map(debts => {
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
                    // monthlyPayment is stored native (edit-form value); paid is
                    // already EUR base — convert the former before displaying.
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
                    lastPaymentDate
                };
            }),
            catchError(error => {
                console.error('Error fetching stats:', error);
                // Stale stats beat no stats — but NEVER fabricate zeros on
                // failure; the error surfaces so the widget shows retry.
                if (this.statsCache) return of(this.statsCache.data);
                throw error;
            }),
            shareReplay(1)
        );

        // Cache the result; reset the in-flight handle in all outcomes so a
        // retry after failure issues a fresh request.
        firstValueFrom(this.statsRequest$)
            .then(data => {
                this.statsCache = { data, timestamp: Date.now() };
            })
            .catch(() => { /* surfaced to subscribers */ })
            .finally(() => {
                this.statsRequest$ = null;
            });

        return this.statsRequest$;
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
    
    // ==================== CACHE HELPERS ====================
    
    private isCacheValid<T>(cache: CacheEntry<T>): boolean {
        return Date.now() - cache.timestamp < CACHE_TTL;
    }
    
    private isCacheStale<T>(cache: CacheEntry<T>): boolean {
        return Date.now() - cache.timestamp >= CACHE_TTL;
    }
    
    private invalidateRecordsCache(): void {
        this.recordsCache = null;
        this.recordsRequest$ = null;
    }
    
    private invalidateStatsCache(): void {
        this.statsCache = null;
        this.statsRequest$ = null;
    }
    
    /**
     * Clear all caches (useful for logout or manual refresh)
     */
    clearCache(): void {
        this.invalidateRecordsCache();
        this.invalidateStatsCache();
    }
}
