import { Injectable, inject } from '@angular/core';
import { Observable, map, catchError, of, firstValueFrom, shareReplay } from 'rxjs';
import { ApiService, Transaction, TransactionCreate, TransactionUpdate, TransactionType, TransactionCategory } from '../../core/services/api.service';
import { CurrencyService } from '../../core/services/currency.service';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface TransactionRecord {
    id?: string;
    date: string;
    name: string;
    type: 'Income' | 'Expense';
    amount: number;
    remarks?: string;
    category?: string;
}

export interface TransactionStats {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    transactionCount: number;
}

export interface MonthlySummary {
    month: string;
    income: number;
    expenses: number;
    net: number;
    count: number;
    byCategory: { category: string; label: string; amount: number; pct: number; color: string }[];
}

export interface CategoryConfig {
    label: string;
    icon: string;
    color: string;
    bg: string;
}

/**
 * Finary-inspired color palette:
 *  • Income  → cool blues / blue-purples (muted, professional)
 *  • Expenses → warm spectrum: ambers, salmons, terracotta, peach
 *  • Savings  → soft green
 *
 * Deliberately avoids the bright neons of the previous palette; all
 * colors sit at medium saturation so ribbons and chips look cohesive.
 */
export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
    // Brand-tokenized: every category uses a shade from the chartTheme
    // categorical palette (navy + ochre + warm-greys). The icon glyph and
    // label do the differentiation work — colours just have to be distinct
    // enough for chart slice readability.
    salary:        { label: 'Salaire',        icon: 'pi pi-briefcase',              color: '#1A2740', bg: 'bg-warm-100 dark:bg-warm-800' },
    freelance:     { label: 'Freelance',      icon: 'pi pi-code',                   color: '#4D5F80', bg: 'bg-warm-100 dark:bg-warm-800' },
    dividends:     { label: 'Dividendes',     icon: 'pi pi-chart-bar',              color: '#2C3E5E', bg: 'bg-brand-700/10 dark:bg-brand-300/15' },
    rental_income: { label: 'Loyers',         icon: 'pi pi-home',                   color: '#3D3B35', bg: 'bg-warm-100 dark:bg-warm-800' },
    interest:      { label: 'Intérêts',       icon: 'pi pi-percentage',             color: '#6E6A60', bg: 'bg-warm-100 dark:bg-warm-800' },
    gift_received: { label: 'Cadeau reçu',    icon: 'pi pi-gift',                   color: '#9C988C', bg: 'bg-warm-100 dark:bg-warm-800' },
    other_income:  { label: 'Autres revenus', icon: 'pi pi-plus-circle',            color: '#C2BDB1', bg: 'bg-warm-100 dark:bg-warm-800' },
    // ── Expenses: warm spectrum (Finary style) ────────────────────
    housing:       { label: 'Logement',       icon: 'pi pi-home',                   color: '#71421C', bg: 'bg-warm-100 dark:bg-warm-800' },
    utilities:     { label: 'Factures',       icon: 'pi pi-bolt',                   color: '#C77B3C', bg: 'bg-warm-100 dark:bg-warm-800' },
    groceries:     { label: 'Alimentation',   icon: 'pi pi-shopping-cart',          color: '#D8A369', bg: 'bg-warm-100 dark:bg-warm-800' },
    transport:     { label: 'Transport',      icon: 'pi pi-car',                    color: '#4D5F80', bg: 'bg-warm-100 dark:bg-warm-800' },
    health:        { label: 'Santé',          icon: 'pi pi-heart',                  color: '#B0463E', bg: 'bg-warm-100 dark:bg-warm-800' },
    insurance:     { label: 'Assurance',      icon: 'pi pi-shield',                 color: '#52504A', bg: 'bg-warm-100 dark:bg-warm-800' },
    entertainment: { label: 'Loisirs',        icon: 'pi pi-star',                   color: '#1A2740', bg: 'bg-warm-100 dark:bg-warm-800' },
    dining:        { label: 'Restaurants',    icon: 'pi pi-ticket',                 color: '#AB6630', bg: 'bg-warm-100 dark:bg-warm-800' },
    shopping:      { label: 'Shopping',       icon: 'pi pi-tag',                    color: '#3D3B35', bg: 'bg-warm-100 dark:bg-warm-800' },
    education:     { label: 'Éducation',      icon: 'pi pi-book',                   color: '#2C3E5E', bg: 'bg-warm-100 dark:bg-warm-800' },
    subscriptions: { label: 'Abonnements',    icon: 'pi pi-refresh',                color: '#6E6A60', bg: 'bg-warm-100 dark:bg-warm-800' },
    travel:        { label: 'Voyages',        icon: 'pi pi-globe',                  color: '#EBD0B0', bg: 'bg-warm-100 dark:bg-warm-800' },
    gift_given:    { label: 'Cadeau offert',  icon: 'pi pi-gift',                   color: '#9C988C', bg: 'bg-warm-100 dark:bg-warm-800' },
    taxes:         { label: 'Impôts',         icon: 'pi pi-file',                   color: '#26241F', bg: 'bg-warm-100 dark:bg-warm-800' },
    savings:       { label: 'Épargne',        icon: 'pi pi-dollar',                 color: '#2F8F6E', bg: 'bg-warm-100 dark:bg-warm-800' },
    investment:    { label: 'Investissement', icon: 'pi pi-chart-line',             color: '#C77B3C', bg: 'bg-ochre-100' },
    debt_payment:  { label: 'Remboursement',  icon: 'pi pi-credit-card',            color: '#933832', bg: 'bg-warm-100 dark:bg-warm-800' },
    other_expense: { label: 'Autres',         icon: 'pi pi-circle',                 color: '#C2BDB1', bg: 'bg-warm-100 dark:bg-warm-800' },
    transfer:      { label: 'Transfert',      icon: 'pi pi-arrow-right-arrow-left', color: '#8A98AE', bg: 'bg-warm-100 dark:bg-warm-800' },
};

export const INCOME_CATEGORIES  = ['salary','freelance','dividends','rental_income','interest','gift_received','other_income'] as const;
export const EXPENSE_CATEGORIES = ['housing','utilities','groceries','transport','health','insurance','entertainment','dining','shopping','education','subscriptions','travel','gift_given','taxes','investment','debt_payment','other_expense'] as const;

// Category to display name mapping
const CATEGORY_DISPLAY_MAP: Record<string, string> = Object.fromEntries(
    Object.entries(CATEGORY_CONFIG).map(([k, v]) => [k, v.label])
);

@Injectable({ providedIn: 'root' })
export class TransactionsService {
    private api             = inject(ApiService);
    private currencyService = inject(CurrencyService);

    // Categories to exclude from main transactions view (these are managed separately in Savings)
    private readonly SAVINGS_CATEGORIES = ['savings', 'investment'];
    
    // Cache storage
    private recordsCache: CacheEntry<TransactionRecord[]> | null = null;
    private statsCache: CacheEntry<TransactionStats> | null = null;
    
    // Request deduplication
    private recordsRequest$: Observable<TransactionRecord[]> | null = null;
    private statsRequest$: Observable<TransactionStats> | null = null;
    
    /**
     * Get all transactions (excluding savings-related transactions) (with caching)
     */
    async getRecords(): Promise<TransactionRecord[]> {
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
        
        this.recordsRequest$ = this.api.getTransactions(0, 100).pipe(
            map(transactions => transactions
                .filter(t => !this.SAVINGS_CATEGORIES.includes(t.category))
                .map(t => this.mapTransactionToRecord(t))),
            catchError(error => {
                console.error('Error fetching transactions:', error);
                return of(this.recordsCache?.data || []);
            }),
            shareReplay(1)
        );
        
        firstValueFrom(this.recordsRequest$).then(data => {
            this.recordsCache = { data, timestamp: Date.now() };
            this.recordsRequest$ = null;
        });
    }

    /**
     * Get transactions as Observable (excluding savings-related transactions) (with caching and deduplication)
     */
    getRecords$(): Observable<TransactionRecord[]> {
        // Return cached data immediately if available
        if (this.recordsCache && this.isCacheValid(this.recordsCache)) {
            return of(this.recordsCache.data);
        }
        
        // Deduplicate simultaneous requests
        if (this.recordsRequest$) {
            return this.recordsRequest$;
        }
        
        // Create new request
        this.recordsRequest$ = this.api.getTransactions(0, 100).pipe(
            map(transactions => transactions
                .filter(t => !this.SAVINGS_CATEGORIES.includes(t.category))
                .map(t => this.mapTransactionToRecord(t))),
            catchError(error => {
                console.error('Error fetching transactions:', error);
                return of(this.recordsCache?.data || []);
            }),
            shareReplay(1)
        );
        
        // Cache the result
        firstValueFrom(this.recordsRequest$).then(data => {
            this.recordsCache = { data, timestamp: Date.now() };
            this.recordsRequest$ = null;
        });
        
        return this.recordsRequest$;
    }

    /**
     * Get transactions by type
     */
    async getRecordsByType(type: 'Income' | 'Expense'): Promise<TransactionRecord[]> {
        try {
            const apiType: TransactionType = type === 'Income' ? 'income' : 'expense';
            const transactions = await firstValueFrom(this.api.getTransactions(0, 100, apiType));
            return transactions.map(t => this.mapTransactionToRecord(t));
        } catch (error) {
            console.error('Error fetching transactions by type:', error);
            return [];
        }
    }

    /**
     * Get recent transactions (last N, excluding savings-related) (with caching)
     */
    async getRecentTransactions(limit: number = 10): Promise<TransactionRecord[]> {
        // Use cached records if available
        if (this.recordsCache) {
            return this.recordsCache.data
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, limit);
        }
        
        // Otherwise fetch fresh
        const transactions = await this.getRecords();
        return transactions
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, limit);
    }

    /**
     * Get a single transaction by ID
     */
    async getRecord(id: number): Promise<TransactionRecord | null> {
        try {
            const transaction = await firstValueFrom(this.api.getTransaction(id));
            return this.mapTransactionToRecord(transaction);
        } catch (error) {
            console.error('Error fetching transaction:', error);
            return null;
        }
    }

    /**
     * Create a new transaction
     */
    private toDateString(d: string | Date | unknown): string {
        if (d instanceof Date) return d.toISOString().split('T')[0];
        if (typeof d === 'string') return d.split('T')[0];
        return '';
    }

    async addRecord(record: TransactionRecord): Promise<TransactionRecord> {
        try {
            // Convert from display currency (e.g. FCFA) → EUR before persisting.
            const transactionData: TransactionCreate = {
                type: record.type === 'Income' ? 'income' : 'expense',
                category: (record.category as TransactionCategory) || this.mapNameToCategory(record.name, record.type),
                amount: this.currencyService.toBaseAmount(record.amount),
                description: record.remarks,
                date: this.toDateString(record.date)
            };
            
            const transaction = await firstValueFrom(this.api.createTransaction(transactionData));
            const mapped = this.mapTransactionToRecord(transaction);
            // Invalidate cache
            this.invalidateRecordsCache();
            this.invalidateStatsCache();
            return mapped;
        } catch (error) {
            console.error('Error creating transaction:', error);
            throw error;
        }
    }

    /**
     * Update a transaction
     */
    async updateRecord(record: TransactionRecord): Promise<TransactionRecord> {
        if (!record.id) throw new Error('Missing id');

        try {
            // Same conversion as addRecord — user edits in display currency.
            const transactionData: TransactionUpdate = {
                type: record.type === 'Income' ? 'income' : 'expense',
                category: (record.category as TransactionCategory) || this.mapNameToCategory(record.name, record.type),
                amount: this.currencyService.toBaseAmount(record.amount),
                description: record.remarks,
                date: this.toDateString(record.date)
            };
            
            const transaction = await firstValueFrom(this.api.updateTransaction(parseInt(record.id), transactionData));
            const mapped = this.mapTransactionToRecord(transaction);
            // Invalidate cache
            this.invalidateRecordsCache();
            this.invalidateStatsCache();
            return mapped;
        } catch (error) {
            console.error('Error updating transaction:', error);
            throw error;
        }
    }

    /**
     * Delete transactions by IDs
     */
    async deleteRecords(ids: string[]): Promise<void> {
        try {
            await Promise.all(ids.map(id => 
                firstValueFrom(this.api.deleteTransaction(parseInt(id)))
            ));
            // Invalidate cache
            this.invalidateRecordsCache();
            this.invalidateStatsCache();
        } catch (error) {
            console.error('Error deleting transactions:', error);
            throw error;
        }
    }

    /**
     * Get transaction statistics (excluding savings-related) (with caching)
     */
    async getStats(): Promise<TransactionStats> {
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
        
        this.statsRequest$ = this.getStats$();
        firstValueFrom(this.statsRequest$).then(data => {
            this.statsCache = { data, timestamp: Date.now() };
            this.statsRequest$ = null;
        });
    }
    
    /**
     * Get stats as Observable (with caching and deduplication)
     */
    getStats$(): Observable<TransactionStats> {
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
            map(transactions => {
                const totalIncome = transactions
                    .filter(t => t.type === 'Income')
                    .reduce((sum, t) => sum + t.amount, 0);
                
                const totalExpenses = transactions
                    .filter(t => t.type === 'Expense')
                    .reduce((sum, t) => sum + t.amount, 0);
                
                return {
                    totalIncome,
                    totalExpenses,
                    balance: totalIncome - totalExpenses,
                    transactionCount: transactions.length
                };
            }),
            catchError(error => {
                console.error('Error calculating stats:', error);
                return of(this.statsCache?.data || {
                    totalIncome: 0,
                    totalExpenses: 0,
                    balance: 0,
                    transactionCount: 0
                });
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

    // ==================== PRIVATE HELPERS ====================

    private mapTransactionToRecord(t: Transaction): TransactionRecord {
        return {
            id: t.id.toString(),
            date: t.date,
            name: CATEGORY_DISPLAY_MAP[t.category] || t.category,
            type: t.type === 'income' || t.type === 'investment' ? 'Income' : 'Expense',
            amount: t.amount,
            remarks: t.description ?? undefined,
            category: t.category
        };
    }

    private mapNameToCategory(name: string, type: 'Income' | 'Expense'): TransactionCategory {
        const n = name.toLowerCase();
        if (type === 'Income') {
            if (n.includes('salary') || n.includes('salaire') || n.includes('paie')) return 'salary';
            if (n.includes('freelance') || n.includes('mission'))                     return 'freelance';
            if (n.includes('dividend') || n.includes('divid'))                        return 'dividends';
            if (n.includes('loyer') || n.includes('rental') || n.includes('rent'))    return 'rental_income';
            if (n.includes('intérêt') || n.includes('interest'))                      return 'interest';
            return 'other_income';
        } else {
            if (n.includes('logement') || n.includes('housing') || n.includes('loyer')) return 'housing';
            if (n.includes('facture') || n.includes('utilities') || n.includes('electric') || n.includes('eau')) return 'utilities';
            if (n.includes('course') || n.includes('grocery') || n.includes('alimentation') || n.includes('marché')) return 'groceries';
            if (n.includes('transport') || n.includes('taxi') || n.includes('bus') || n.includes('train')) return 'transport';
            if (n.includes('santé') || n.includes('health') || n.includes('médecin') || n.includes('pharmacie')) return 'health';
            if (n.includes('assurance') || n.includes('insurance'))    return 'insurance';
            if (n.includes('restaurant') || n.includes('dining') || n.includes('repas')) return 'dining';
            if (n.includes('shopping') || n.includes('vêtement') || n.includes('habit')) return 'shopping';
            if (n.includes('loisir') || n.includes('cinéma') || n.includes('entertainment')) return 'entertainment';
            if (n.includes('éducation') || n.includes('scolarité') || n.includes('école')) return 'education';
            if (n.includes('abonnement') || n.includes('subscription'))  return 'subscriptions';
            if (n.includes('voyage') || n.includes('travel') || n.includes('hôtel'))   return 'travel';
            if (n.includes('impôt') || n.includes('taxe') || n.includes('tax'))       return 'taxes';
            if (n.includes('remboursement') || n.includes('dette') || n.includes('crédit')) return 'debt_payment';
            return 'other_expense';
        }
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
     * Compute a monthly summary for the Reports page.
     *
     * Unlike getRecords(), this fetches ALL transactions directly from the API —
     * including 'investment' and 'savings' categories that are deliberately
     * excluded from the main transactions list. The Reports chart must show
     * the complete picture of where money goes.
     */
    async getMonthlySummary(yearMonth: string): Promise<MonthlySummary> {
        // Fetch everything — no category filter
        let allTxs: Transaction[];
        try {
            allTxs = await firstValueFrom(this.api.getTransactions(0, 500));
        } catch {
            // Fallback to filtered records if the API call fails
            const records = await this.getRecords();
            allTxs = [];
            // Re-use the filtered path as a degraded fallback
            const monthRecords = records.filter(r => r.date.startsWith(yearMonth));
            const income   = monthRecords.filter(r => r.type === 'Income') .reduce((s, r) => s + r.amount, 0);
            const expenses = monthRecords.filter(r => r.type === 'Expense').reduce((s, r) => s + r.amount, 0);
            const byCat: Record<string, number> = {};
            for (const r of monthRecords.filter(r => r.type === 'Expense'))
                byCat[r.category || 'other_expense'] = (byCat[r.category || 'other_expense'] || 0) + r.amount;
            const byCategory = Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([cat,amount])=>({
                category: cat, label: CATEGORY_CONFIG[cat]?.label || cat, amount,
                pct: expenses > 0 ? Math.round(amount/expenses*100) : 0,
                color: CATEGORY_CONFIG[cat]?.color || '#9C988C',
            }));
            return { month: yearMonth, income, expenses, net: income-expenses, count: monthRecords.length, byCategory };
        }

        // Map ALL transactions for the selected month — income and ALL expense categories
        const monthTxs = allTxs.filter(t => t.date.startsWith(yearMonth));

        const income   = monthTxs.filter(t => t.type === 'income') .reduce((s, t) => s + t.amount, 0);
        const expenses = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const count    = monthTxs.length;

        const byCat: Record<string, number> = {};
        for (const t of monthTxs.filter(t => t.type === 'expense')) {
            const cat = t.category || 'other_expense';
            byCat[cat] = (byCat[cat] || 0) + t.amount;
        }

        const byCategory = Object.entries(byCat)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, amount]) => ({
                category: cat,
                label:    CATEGORY_CONFIG[cat]?.label || cat,
                amount,
                pct:      expenses > 0 ? Math.round((amount / expenses) * 100) : 0,
                color:    CATEGORY_CONFIG[cat]?.color || '#9C988C',
            }));

        return { month: yearMonth, income, expenses, net: income - expenses, count, byCategory };
    }

    /**
     * Clear all caches (useful for logout or manual refresh)
     */
    clearCache(): void {
        this.invalidateRecordsCache();
        this.invalidateStatsCache();
    }
}
