import { Injectable, inject } from '@angular/core';
import { Observable, map, catchError, of, firstValueFrom } from 'rxjs';
import { ApiService, Transaction, TransactionCreate, TransactionUpdate, TransactionType, TransactionCategory } from '../../core/services/api.service';

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
    
    /**
     * Get all transactions (excluding savings-related transactions)
     */
    async getRecords(): Promise<TransactionRecord[]> {
        try {
            const transactions = await firstValueFrom(this.api.getTransactions(0, 100));
            // Filter out savings and investment transactions - they are managed in the Savings section
            return transactions
                .filter(t => !this.SAVINGS_CATEGORIES.includes(t.category))
                .map(t => this.mapTransactionToRecord(t));
        } catch (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }
    }

    /**
     * Get transactions as Observable (excluding savings-related transactions)
     */
    getRecords$(): Observable<TransactionRecord[]> {
        return this.api.getTransactions(0, 100).pipe(
            map(transactions => transactions
                .filter(t => !this.SAVINGS_CATEGORIES.includes(t.category))
                .map(t => this.mapTransactionToRecord(t))),
            catchError(error => {
                console.error('Error fetching transactions:', error);
                return of([]);
            })
        );
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
     * Get recent transactions (last N, excluding savings-related)
     */
    async getRecentTransactions(limit: number = 10): Promise<TransactionRecord[]> {
        try {
            // Fetch more to account for filtering
            const transactions = await firstValueFrom(this.api.getTransactions(0, limit * 2));
            return transactions
                .filter(t => !this.SAVINGS_CATEGORIES.includes(t.category))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, limit)
                .map(t => this.mapTransactionToRecord(t));
        } catch (error) {
            console.error('Error fetching recent transactions:', error);
            return [];
        }
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
    async addRecord(record: TransactionRecord): Promise<TransactionRecord> {
        try {
            const transactionData: TransactionCreate = {
                type: record.type === 'Income' ? 'income' : 'expense',
                category: this.mapNameToCategory(record.name, record.type),
                amount: record.amount,
                description: record.remarks,
                date: record.date
            };
            
            const transaction = await firstValueFrom(this.api.createTransaction(transactionData));
            return this.mapTransactionToRecord(transaction);
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
                date: record.date
            };
            
            const transaction = await firstValueFrom(this.api.updateTransaction(parseInt(record.id), transactionData));
            return this.mapTransactionToRecord(transaction);
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
        } catch (error) {
            console.error('Error deleting transactions:', error);
            throw error;
        }
    }

    /**
     * Get transaction statistics (excluding savings-related)
     */
    async getStats(): Promise<TransactionStats> {
        try {
            // getRecords already filters out savings
            const transactions = await this.getRecords();
            
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
        } catch (error) {
            console.error('Error calculating stats:', error);
            return {
                totalIncome: 0,
                totalExpenses: 0,
                balance: 0,
                transactionCount: 0
            };
        }
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
}
