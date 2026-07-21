import { Injectable, inject } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';
import { ApiService, Transaction, TransactionCreate, TransactionUpdate, TransactionType, TransactionCategory } from '../../core/services/api.service';
import { CurrencyService } from '../../core/services/currency.service';
import { I18nService } from '../../i18n/i18n.service';
import { CACHE_RESET } from '../../core/services/cache-reset.token';
import { AssetsStateService } from './assets-state.service';
import { cachedResource } from '../../core/util/cached-resource';

export interface TransactionRecord {
    id?: string;
    date: string;
    name: string;
    type: 'Income' | 'Expense' | 'Transfer';
    amount: number;          // EUR base, for display (rendered via <app-amount>) and summaries
    nativeAmount?: number;   // amount in `currency`, for the edit form
    currency?: string;       // native currency the transaction was entered in
    remarks?: string;
    category?: string;
    accountId?: number;
    accountName?: string;
    fromAccountId?: number;
    toAccountId?: number;
    fromAccountName?: string;
    toAccountName?: string;
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
    // label do the differentiation work, colours just have to be distinct
    // enough for chart slice readability.
    salary:        { label: 'Salaire',        icon: 'pi pi-briefcase',              color: '#1A2740', bg: 'bg-warm-100 dark:bg-warm-800' },
    freelance:     { label: 'Freelance',      icon: 'pi pi-code',                   color: '#4D5F80', bg: 'bg-warm-100 dark:bg-warm-800' },
    dividends:     { label: 'Dividendes',     icon: 'pi pi-chart-bar',              color: '#2C3E5E', bg: 'bg-brand-700/10 dark:bg-brand-300/15' },
    rental_income: { label: 'Loyers',         icon: 'pi pi-home',                   color: '#3D3B35', bg: 'bg-warm-100 dark:bg-warm-800' },
    interest:      { label: 'Intérêts',       icon: 'pi pi-percentage',             color: '#6E6A60', bg: 'bg-warm-100 dark:bg-warm-800' },
    gift_received: { label: 'Cadeau reçu',    icon: 'pi pi-gift',                   color: '#9C988C', bg: 'bg-warm-100 dark:bg-warm-800' },
    family_support_received: { label: 'Soutien reçu', icon: 'pi pi-users',          color: '#3E7C6A', bg: 'bg-warm-100 dark:bg-warm-800' },
    tontine_payout: { label: 'Tour de tontine', icon: 'pi pi-sync',                 color: '#2F8F6E', bg: 'bg-warm-100 dark:bg-warm-800' },
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
    family_support:{ label: 'Soutien familial', icon: 'pi pi-users',               color: '#71421C', bg: 'bg-warm-100 dark:bg-warm-800' },
    religious:     { label: 'Zakat / Sadaqa', icon: 'pi pi-star',                   color: '#2C3E5E', bg: 'bg-warm-100 dark:bg-warm-800' },
    ceremony:      { label: 'Cérémonies',     icon: 'pi pi-users',                  color: '#AB6630', bg: 'bg-warm-100 dark:bg-warm-800' },
    airtime:       { label: 'Crédit / Forfait', icon: 'pi pi-mobile',              color: '#4D5F80', bg: 'bg-warm-100 dark:bg-warm-800' },
    tontine:       { label: 'Tontine',        icon: 'pi pi-sync',                   color: '#6E6A60', bg: 'bg-warm-100 dark:bg-warm-800' },
    taxes:         { label: 'Impôts',         icon: 'pi pi-file',                   color: '#26241F', bg: 'bg-warm-100 dark:bg-warm-800' },
    savings:       { label: 'Épargne',        icon: 'pi pi-dollar',                 color: '#2F8F6E', bg: 'bg-warm-100 dark:bg-warm-800' },
    investment:    { label: 'Investissement', icon: 'pi pi-chart-line',             color: '#C77B3C', bg: 'bg-ochre-100' },
    debt_payment:  { label: 'Remboursement',  icon: 'pi pi-credit-card',            color: '#933832', bg: 'bg-warm-100 dark:bg-warm-800' },
    other_expense: { label: 'Autres',         icon: 'pi pi-circle',                 color: '#C2BDB1', bg: 'bg-warm-100 dark:bg-warm-800' },
    transfer:      { label: 'Transfert',      icon: 'pi pi-arrow-right-arrow-left', color: '#8A98AE', bg: 'bg-warm-100 dark:bg-warm-800' },
};

export const INCOME_CATEGORIES  = ['salary','freelance','dividends','rental_income','interest','gift_received','family_support_received','tontine_payout','other_income'] as const;
export const EXPENSE_CATEGORIES = ['housing','utilities','groceries','transport','health','insurance','entertainment','dining','shopping','education','subscriptions','travel','family_support','religious','ceremony','airtime','tontine','gift_given','taxes','investment','debt_payment','other_expense'] as const;

// Category to display name mapping
const CATEGORY_DISPLAY_MAP: Record<string, string> = Object.fromEntries(
    Object.entries(CATEGORY_CONFIG).map(([k, v]) => [k, v.label])
);

@Injectable({ providedIn: 'root' })
export class TransactionsService {
    private api             = inject(ApiService);
    private currencyService = inject(CurrencyService);
    private i18n            = inject(I18nService);
    private state           = inject(AssetsStateService);

    /**
     * The single source of truth for the transaction list. TTL + SWR + in-flight
     * dedup + error surfacing all live in the shared cachedResource now (P2-FE-1);
     * stats are a pure derivation of this list, so there is no separate stats cache.
     */
    private recordsResource = cachedResource<TransactionRecord[]>(
        () => firstValueFrom(this.api.getAllTransactions().pipe(
            map(txs => txs.map(t => this.mapTransactionToRecord(t))),
        )),
    );

    constructor() {
        // Clear cached user data on logout/login (see CACHE_RESET).
        inject(CACHE_RESET).subscribe(() => this.clearCache());
    }

    /**
     * Get all transactions (cached: TTL + stale-while-revalidate + dedup).
     */
    getRecords(): Promise<TransactionRecord[]> {
        return this.recordsResource.load();
    }

    /**
     * Get transactions by type (direct, uncached, a rarely used filtered view).
     */
    async getRecordsByType(type: 'Income' | 'Expense'): Promise<TransactionRecord[]> {
        try {
            const apiType: TransactionType = type === 'Income' ? 'income' : 'expense';
            const transactions = await firstValueFrom(this.api.getAllTransactions(apiType));
            return transactions.map(t => this.mapTransactionToRecord(t));
        } catch (error) {
            console.error('Error fetching transactions by type:', error);
            return [];
        }
    }

    /**
     * Get recent transactions (last N), sorted newest-first, off the cached list.
     */
    async getRecentTransactions(limit: number = 10): Promise<TransactionRecord[]> {
        const records = await this.recordsResource.load();
        return [...records]
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
            // Store the amount in its native currency; the backend converts to
            // EUR at aggregation time. `record.amount` here is the native value
            // the form captured (in `record.currency`).
            const nativeAmount = record.amount;
            const currency = record.currency || 'EUR';
            const transactionData: TransactionCreate = record.type === 'Transfer'
                ? {
                    type: 'transfer',
                    category: 'transfer',
                    amount: nativeAmount,
                    currency,
                    description: record.remarks,
                    date: this.toDateString(record.date),
                    from_account_id: record.fromAccountId,
                    to_account_id: record.toAccountId
                }
                : {
                    type: record.type === 'Income' ? 'income' : 'expense',
                    category: (record.category as TransactionCategory) || this.mapNameToCategory(record.name, record.type),
                    amount: nativeAmount,
                    currency,
                    description: record.remarks,
                    date: this.toDateString(record.date),
                    account_id: record.accountId
                };

            const transaction = await firstValueFrom(this.api.createTransaction(transactionData));
            const mapped = this.mapTransactionToRecord(transaction);
            this.markTransactionsChanged();
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
            // Native-currency storage, same as addRecord.
            const nativeAmount = record.amount;
            const currency = record.currency || 'EUR';
            const transactionData: TransactionUpdate = record.type === 'Transfer'
                ? {
                    type: 'transfer',
                    category: 'transfer',
                    amount: nativeAmount,
                    currency,
                    description: record.remarks,
                    date: this.toDateString(record.date),
                    from_account_id: record.fromAccountId,
                    to_account_id: record.toAccountId
                }
                : {
                    type: record.type === 'Income' ? 'income' : 'expense',
                    category: (record.category as TransactionCategory) || this.mapNameToCategory(record.name, record.type),
                    amount: nativeAmount,
                    currency,
                    description: record.remarks,
                    date: this.toDateString(record.date),
                    account_id: record.accountId
                };

            const transaction = await firstValueFrom(this.api.updateTransaction(parseInt(record.id), transactionData));
            const mapped = this.mapTransactionToRecord(transaction);
            this.markTransactionsChanged();
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
            this.markTransactionsChanged();
        } catch (error) {
            console.error('Error deleting transactions:', error);
            throw error;
        }
    }

    /**
     * Transaction statistics, a pure derivation of the cached list (no second
     * cache). Errors surface through the resource: a cold failure rejects so the
     * caller can show error+retry, never a fabricated all-zero stat line.
     */
    async getStats(): Promise<TransactionStats> {
        const transactions = await this.recordsResource.load();
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
            transactionCount: transactions.length,
        };
    }

    /**
     * A write happened: drop cache freshness (next read refetches) and notify
     * every subscriber (dashboard, recent-tx widget, …) so the change shows
     * immediately with no 5-minute staleness. Mirrors DebtsService /
     * PatrimoineService, which already fire their own notify on writes, this
     * makes TransactionsService consistent and removes the need for callers to
     * fire notifyTransactionsUpdated() themselves.
     */
    private markTransactionsChanged(): void {
        this.recordsResource.invalidate();
        this.state.notifyTransactionsUpdated();
    }

    // ==================== PRIVATE HELPERS ====================

    private mapTransactionToRecord(t: Transaction): TransactionRecord {
        const type: TransactionRecord['type'] =
            t.type === 'transfer' ? 'Transfer'
            : (t.type === 'income' || t.type === 'investment') ? 'Income'
            : 'Expense';
        return {
            id: t.id.toString(),
            date: t.date,
            name: CATEGORY_DISPLAY_MAP[t.category] || t.category,
            type,
            // Convert native → EUR base for display/summaries; keep native for editing.
            amount: this.currencyService.toEurFromNative(t.amount, t.currency),
            nativeAmount: t.amount,
            currency: t.currency,
            remarks: t.description ?? undefined,
            category: t.category,
            accountId: t.account_id ?? undefined,
            accountName: t.account_name ?? undefined,
            fromAccountId: t.from_account_id ?? undefined,
            toAccountId: t.to_account_id ?? undefined,
            fromAccountName: t.from_account_name ?? undefined,
            toAccountName: t.to_account_name ?? undefined
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
    
    /**
     * Compute a monthly summary for the Reports page.
     *
     * Unlike getRecords(), this fetches ALL transactions directly from the API, * including 'investment' and 'savings' categories that are deliberately
     * excluded from the main transactions list. The Reports chart must show
     * the complete picture of where money goes.
     */
    async getMonthlySummary(yearMonth: string): Promise<MonthlySummary> {
        // Fetch only the selected month, server-side date-filtered and un-capped
        // (paginated past the per-page limit). No category filter, the Reports
        // chart must show income + ALL expense categories, incl. investment/savings.
        const start = `${yearMonth}-01`;
        const end = `${yearMonth}-31`; // string upper-bound; safe for 28/30/31-day months
        let allTxs: Transaction[];
        try {
            allTxs = await firstValueFrom(this.api.getAllTransactions(undefined, start, end));
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
                category: cat, label: this.i18n.categoryLabel(cat), amount,
                pct: expenses > 0 ? Math.round(amount/expenses*100) : 0,
                color: CATEGORY_CONFIG[cat]?.color || '#9C988C',
            }));
            return { month: yearMonth, income, expenses, net: income-expenses, count: monthRecords.length, byCategory };
        }

        // Map ALL transactions for the selected month, income and ALL expense categories.
        // Amounts from the raw API are NATIVE (multi-currency): every sum must go
        // through FX to the EUR base first, 650 000 XOF + 1 000 EUR is not "651 000".
        const monthTxs = allTxs.filter(t => t.date.startsWith(yearMonth));
        const toEur = (t: Transaction) => this.currencyService.toEurFromNative(t.amount, t.currency);

        const income   = monthTxs.filter(t => t.type === 'income') .reduce((s, t) => s + toEur(t), 0);
        const expenses = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + toEur(t), 0);
        const count    = monthTxs.length;

        const byCat: Record<string, number> = {};
        for (const t of monthTxs.filter(t => t.type === 'expense')) {
            const cat = t.category || 'other_expense';
            byCat[cat] = (byCat[cat] || 0) + toEur(t);
        }

        const byCategory = Object.entries(byCat)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, amount]) => ({
                category: cat,
                label:    this.i18n.categoryLabel(cat),
                amount,
                pct:      expenses > 0 ? Math.round((amount / expenses) * 100) : 0,
                color:    CATEGORY_CONFIG[cat]?.color || '#9C988C',
            }));

        return { month: yearMonth, income, expenses, net: income - expenses, count, byCategory };
    }

    /**
     * Clear all caches on logout/login (prevents cross-user cache bleed, P1-10).
     */
    clearCache(): void {
        this.recordsResource.reset();
    }
}
