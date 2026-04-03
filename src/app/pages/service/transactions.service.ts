import { Injectable, inject } from '@angular/core';
import { Observable, map, catchError, of, firstValueFrom, shareReplay } from 'rxjs';
import { ApiService, Transaction, TransactionCreate, TransactionUpdate, TransactionType, TransactionCategory } from '../../core/services/api.service';

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
    account: string;
    remarks?: string;
    category?: string;
}

export interface TransactionStats {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    transactionCount: number;
}

// Category to account mapping for display
const CATEGORY_DISPLAY_MAP: Record<string, string> = {
    'salary': 'Salary',
    'investment_income': 'Investment',
    'rental_income': 'Rental',
    'side_hustle': 'Side Hustle',
    'other_income': 'Other Income',
    'housing': 'Housing',
    'utilities': 'Utilities',
    'food': 'Food',
    'transportation': 'Transport',
    'healthcare': 'Healthcare',
    'entertainment': 'Entertainment',
    'shopping': 'Shopping',
    'education': 'Education',
    'savings': 'Savings',
    'investment': 'Investment',
    'debt_payment': 'Debt Payment',
    'insurance': 'Insurance',
    'taxes': 'Taxes',
    'other_expense': 'Other'
};

@Injectable({ providedIn: 'root' })
export class TransactionsService {
    private api = inject(ApiService);

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
            const transactionData: TransactionCreate = {
                type: record.type === 'Income' ? 'income' : 'expense',
                category: this.mapNameToCategory(record.name, record.type),
                amount: record.amount,
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
            const transactionData: TransactionUpdate = {
                type: record.type === 'Income' ? 'income' : 'expense',
                category: this.mapNameToCategory(record.name, record.type),
                amount: record.amount,
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
            account: t.asset_id ? `Asset #${t.asset_id}` : 'Default',
            remarks: t.description ?? undefined,
            category: t.category
        };
    }

    private mapNameToCategory(name: string, type: 'Income' | 'Expense'): TransactionCategory {
        const nameLower = name.toLowerCase();
        
        if (type === 'Income') {
            if (nameLower.includes('salary') || nameLower.includes('salaire')) return 'salary';
            if (nameLower.includes('investment') || nameLower.includes('investissement')) return 'investment_income';
            if (nameLower.includes('rental') || nameLower.includes('loyer')) return 'rental_income';
            if (nameLower.includes('freelance') || nameLower.includes('side')) return 'side_hustle';
            return 'other_income';
        } else {
            if (nameLower.includes('housing') || nameLower.includes('logement') || nameLower.includes('rent')) return 'housing';
            if (nameLower.includes('utilities') || nameLower.includes('electricity') || nameLower.includes('water')) return 'utilities';
            if (nameLower.includes('food') || nameLower.includes('groceries') || nameLower.includes('restaurant')) return 'food';
            if (nameLower.includes('transport')) return 'transportation';
            if (nameLower.includes('health') || nameLower.includes('medical')) return 'healthcare';
            if (nameLower.includes('entertainment')) return 'entertainment';
            if (nameLower.includes('shopping')) return 'shopping';
            if (nameLower.includes('education')) return 'education';
            if (nameLower.includes('saving')) return 'savings';
            if (nameLower.includes('investment')) return 'investment';
            if (nameLower.includes('debt')) return 'debt_payment';
            if (nameLower.includes('insurance')) return 'insurance';
            if (nameLower.includes('tax')) return 'taxes';
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
     * Clear all caches (useful for logout or manual refresh)
     */
    clearCache(): void {
        this.invalidateRecordsCache();
        this.invalidateStatsCache();
    }
}
