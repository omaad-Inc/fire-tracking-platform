import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ============================================
// ASSET INTERFACES
// ============================================
export type AssetCategory = 
    | 'real_estate' 
    | 'stocks' 
    | 'bonds' 
    | 'crypto' 
    | 'cash' 
    | 'retirement'
    | 'life_insurance'
    | 'savings_account'
    | 'business'
    | 'vehicle'
    | 'collectibles'
    | 'commodities' 
    | 'other';

export interface Asset {
    id: number;
    name: string;
    category: AssetCategory;
    current_value: number;
    purchase_value: number | null;
    purchase_date: string | null;
    currency: string;
    notes: string | null;
    is_liquid: boolean;
    institution: string | null;
    created_at: string;
    updated_at: string;
}

export interface AssetCreate {
    name: string;
    category: AssetCategory;
    current_value: number;
    purchase_value?: number;
    purchase_date?: string;
    currency?: string;
    notes?: string;
    is_liquid?: boolean;
    institution?: string;
}

export interface AssetUpdate {
    name?: string;
    category?: AssetCategory;
    current_value?: number;
    purchase_value?: number;
    purchase_date?: string;
    currency?: string;
    notes?: string;
    is_liquid?: boolean;
    institution?: string;
}

// ============================================
// TRANSACTION INTERFACES
// ============================================
export type TransactionType = 'income' | 'expense' | 'transfer' | 'investment';
export type TransactionCategory = 
    | 'salary' | 'investment_income' | 'rental_income' | 'side_hustle' | 'other_income'
    | 'housing' | 'utilities' | 'food' | 'transportation' | 'healthcare'
    | 'entertainment' | 'shopping' | 'education' | 'savings' | 'investment'
    | 'debt_payment' | 'insurance' | 'taxes' | 'other_expense';

export interface Transaction {
    id: number;
    type: TransactionType;
    category: TransactionCategory;
    amount: number;
    currency: string;
    description: string | null;
    date: string;
    is_recurring: boolean;
    recurring_frequency: string | null;
    asset_id: number | null;
    created_at: string;
    updated_at: string;
}

export interface TransactionCreate {
    type: TransactionType;
    category: TransactionCategory;
    amount: number;
    currency?: string;
    description?: string;
    date?: string;
    is_recurring?: boolean;
    recurring_frequency?: string;
    asset_id?: number;
}

export interface TransactionUpdate {
    type?: TransactionType;
    category?: TransactionCategory;
    amount?: number;
    currency?: string;
    description?: string;
    date?: string;
    is_recurring?: boolean;
    recurring_frequency?: string;
    asset_id?: number;
}

// ============================================
// SAVING GOAL INTERFACES
// ============================================
export type SavingStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface SavingGoal {
    id: number;
    name: string;
    target_amount: number;
    current_amount: number;
    currency: string;
    target_date: string | null;
    status: SavingStatus;
    priority: number;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface SavingGoalCreate {
    name: string;
    target_amount: number;
    current_amount?: number;
    currency?: string;
    target_date?: string;
    status?: SavingStatus;
    priority?: number;
    notes?: string;
}

export interface SavingGoalUpdate {
    name?: string;
    target_amount?: number;
    current_amount?: number;
    currency?: string;
    target_date?: string;
    status?: SavingStatus;
    priority?: number;
    notes?: string;
}

// ============================================
// DEBT INTERFACES
// ============================================
export type DebtType = 'i_owe' | 'owed_to_me';
export type DebtCategory = 'mortgage' | 'car_loan' | 'student_loan' | 'personal_loan' | 'credit_card' | 'family_friend' | 'business' | 'other';

export interface Debt {
    id: number;
    owner_id: number;
    name: string;
    type: DebtType;
    category: DebtCategory;
    description: string | null;
    initial_amount: number;
    current_amount: number;
    interest_rate: number | null;
    monthly_payment: number | null;
    next_payment_date: string | null;
    start_date: string | null;
    end_date: string | null;
    creditor_name: string | null;
    is_paid_off: boolean;
    is_active: boolean;
    progress_percentage: number;
    amount_paid: number;
    created_at: string;
    updated_at: string;
}

export interface DebtCreate {
    name: string;
    type: DebtType;
    category: DebtCategory;
    description?: string;
    initial_amount: number;
    current_amount: number;
    interest_rate?: number;
    monthly_payment?: number;
    next_payment_date?: string;
    start_date?: string;
    end_date?: string;
    creditor_name?: string;
}

export interface DebtUpdate {
    name?: string;
    type?: DebtType;
    category?: DebtCategory;
    description?: string;
    initial_amount?: number;
    current_amount?: number;
    interest_rate?: number;
    monthly_payment?: number;
    next_payment_date?: string;
    end_date?: string;
    creditor_name?: string;
    is_paid_off?: boolean;
    is_active?: boolean;
}

// ============================================
// DASHBOARD INTERFACES
// ============================================
export interface AssetDistribution {
    category: string;
    value: number;
    percentage: number;
}

export interface WorthProgression {
    date: string;
    total_assets: number;
    total_debts: number;
    net_worth: number;
}

export interface FIREMetrics {
    current_net_worth: number;
    fire_target: number;
    progress_percentage: number;
    monthly_savings_rate: number;
    estimated_fire_date: string | null;
    years_to_fire: number | null;
    monthly_passive_income_needed: number;
    current_passive_income: number;
}

export interface DashboardSummary {
    total_assets: number;
    total_debts: number;
    net_worth: number;
    net_worth_change_30d: number;
    net_worth_change_percentage: number;
    monthly_income: number;
    monthly_expenses: number;
    savings_rate: number;
    asset_distribution: AssetDistribution[];
    worth_progression: WorthProgression[];
    fire_metrics: FIREMetrics;
}

// ============================================
// USER UPDATE INTERFACES
// ============================================
export interface UserUpdate {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    preferred_currency?: string;
    preferred_language?: string;
    fire_target_amount?: number;
    fire_target_date?: string;
    fire_monthly_expenses?: number;
    fire_safe_withdrawal_rate?: number;
}

export interface PasswordChange {
    current_password: string;
    new_password: string;
}

export interface FIRESettings {
    fire_target_amount?: number;
    fire_target_date?: string;
    fire_monthly_expenses?: number;
    fire_safe_withdrawal_rate?: number;
}

// ============================================
// API SERVICE
// ============================================
@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl;

    // ========== ASSETS ==========
    getAssets(skip = 0, limit = 100): Observable<Asset[]> {
        const params = new HttpParams()
            .set('skip', skip.toString())
            .set('limit', limit.toString());
        return this.http.get<Asset[]>(`${this.apiUrl}/assets`, { params });
    }

    getAsset(id: number): Observable<Asset> {
        return this.http.get<Asset>(`${this.apiUrl}/assets/${id}`);
    }

    createAsset(data: AssetCreate): Observable<Asset> {
        return this.http.post<Asset>(`${this.apiUrl}/assets`, data);
    }

    updateAsset(id: number, data: AssetUpdate): Observable<Asset> {
        return this.http.patch<Asset>(`${this.apiUrl}/assets/${id}`, data);
    }

    deleteAsset(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/assets/${id}`);
    }

    // ========== TRANSACTIONS ==========
    getTransactions(skip = 0, limit = 100, type?: TransactionType): Observable<Transaction[]> {
        let params = new HttpParams()
            .set('skip', skip.toString())
            .set('limit', limit.toString());
        if (type) {
            params = params.set('type', type);
        }
        return this.http.get<Transaction[]>(`${this.apiUrl}/transactions`, { params });
    }

    getTransaction(id: number): Observable<Transaction> {
        return this.http.get<Transaction>(`${this.apiUrl}/transactions/${id}`);
    }

    createTransaction(data: TransactionCreate): Observable<Transaction> {
        return this.http.post<Transaction>(`${this.apiUrl}/transactions`, data);
    }

    updateTransaction(id: number, data: TransactionUpdate): Observable<Transaction> {
        return this.http.patch<Transaction>(`${this.apiUrl}/transactions/${id}`, data);
    }

    deleteTransaction(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/transactions/${id}`);
    }

    // ========== SAVING GOALS ==========
    getSavingGoals(skip = 0, limit = 100): Observable<SavingGoal[]> {
        const params = new HttpParams()
            .set('skip', skip.toString())
            .set('limit', limit.toString());
        return this.http.get<SavingGoal[]>(`${this.apiUrl}/savings`, { params });
    }

    getSavingGoal(id: number): Observable<SavingGoal> {
        return this.http.get<SavingGoal>(`${this.apiUrl}/savings/${id}`);
    }

    createSavingGoal(data: SavingGoalCreate): Observable<SavingGoal> {
        return this.http.post<SavingGoal>(`${this.apiUrl}/savings`, data);
    }

    updateSavingGoal(id: number, data: SavingGoalUpdate): Observable<SavingGoal> {
        return this.http.patch<SavingGoal>(`${this.apiUrl}/savings/${id}`, data);
    }

    deleteSavingGoal(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/savings/${id}`);
    }

    addContribution(goalId: number, amount: number): Observable<SavingGoal> {
        return this.http.post<SavingGoal>(`${this.apiUrl}/savings/${goalId}/contribute`, { amount });
    }

    // ========== DEBTS ==========
    getDebts(skip = 0, limit = 100): Observable<Debt[]> {
        const params = new HttpParams()
            .set('skip', skip.toString())
            .set('limit', limit.toString());
        return this.http.get<Debt[]>(`${this.apiUrl}/debts`, { params });
    }

    getDebt(id: number): Observable<Debt> {
        return this.http.get<Debt>(`${this.apiUrl}/debts/${id}`);
    }

    createDebt(data: DebtCreate): Observable<Debt> {
        return this.http.post<Debt>(`${this.apiUrl}/debts`, data);
    }

    updateDebt(id: number, data: DebtUpdate): Observable<Debt> {
        return this.http.patch<Debt>(`${this.apiUrl}/debts/${id}`, data);
    }

    deleteDebt(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/debts/${id}`);
    }

    makePayment(debtId: number, amount: number): Observable<Debt> {
        return this.http.post<Debt>(`${this.apiUrl}/debts/${debtId}/payment`, { amount });
    }

    // ========== DASHBOARD ==========
    getDashboardSummary(): Observable<DashboardSummary> {
        return this.http.get<DashboardSummary>(`${this.apiUrl}/dashboard/summary`);
    }

    getFIREMetrics(): Observable<FIREMetrics> {
        return this.http.get<FIREMetrics>(`${this.apiUrl}/dashboard/fire-metrics`);
    }

    getAssetDistribution(): Observable<AssetDistribution[]> {
        return this.http.get<AssetDistribution[]>(`${this.apiUrl}/dashboard/asset-distribution`);
    }

    getExpenseDistribution(): Observable<AssetDistribution[]> {
        return this.http.get<AssetDistribution[]>(`${this.apiUrl}/dashboard/expense-distribution`);
    }

    getWorthProgression(months = 12): Observable<WorthProgression[]> {
        const params = new HttpParams().set('months', months.toString());
        return this.http.get<WorthProgression[]>(`${this.apiUrl}/dashboard/worth-progression`, { params });
    }

    // ========== USER PROFILE ==========
    updateProfile(data: UserUpdate): Observable<any> {
        return this.http.patch(`${this.apiUrl}/users/me`, data);
    }

    changePassword(data: PasswordChange): Observable<any> {
        return this.http.post(`${this.apiUrl}/users/me/password`, data);
    }

    updateFIRESettings(data: FIRESettings): Observable<any> {
        return this.http.patch(`${this.apiUrl}/users/me/fire-settings`, data);
    }

    uploadAvatar(file: File): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post(`${this.apiUrl}/users/me/avatar`, formData);
    }

    deleteAvatar(): Observable<any> {
        return this.http.delete(`${this.apiUrl}/users/me/avatar`);
    }

    deleteAccount(): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/users/me`);
    }
}

