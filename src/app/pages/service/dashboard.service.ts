import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, map, catchError, of, firstValueFrom, forkJoin } from 'rxjs';
import { ApiService, DashboardSummary, FIREMetrics, AssetDistribution, WorthProgression } from '../../core/services/api.service';

export interface DashboardStats {
    netWorth: number;
    netWorthChange: number;
    netWorthChangePct: number;
    totalAssets: number;
    totalDebts: number;
    savingsRate: number;
    monthlyIncome: number;
    monthlyExpenses: number;
}

export interface FIREProgress {
    currentNetWorth: number;
    targetAmount: number;
    progressPct: number;
    yearsToFire: number | null;
    estimatedDate: string | null;
    monthlyPassiveIncomeNeeded: number;
    currentPassiveIncome: number;
    savingsRate: number;
}

export interface ChartDataPoint {
    label: string;
    value: number;
}

export interface AssetAllocation {
    category: string;
    value: number;
    percentage: number;
    color: string;
}

// Color mapping for asset categories
const CATEGORY_COLORS: Record<string, string> = {
    'real_estate': '#6366f1', // Indigo
    'stocks': '#06b6d4',      // Cyan
    'bonds': '#10b981',       // Emerald
    'crypto': '#f59e0b',      // Amber
    'cash': '#8b5cf6',        // Violet
    'commodities': '#ec4899', // Pink
    'other': '#94a3b8'        // Gray
};

const CATEGORY_LABELS: Record<string, string> = {
    'real_estate': 'Immobilier',
    'stocks': 'Actions',
    'bonds': 'Obligations',
    'crypto': 'Cryptomonnaies',
    'cash': 'Liquidités',
    'commodities': 'Matières premières',
    'other': 'Autres'
};

// Color palette for expense categories
const EXPENSE_COLORS: string[] = [
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#14b8a6', // teal
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#ec4899', // pink
    '#84cc16', // lime
    '#64748b'  // slate
];

@Injectable({ providedIn: 'root' })
export class DashboardService {
    private api = inject(ApiService);

    // Reactive state
    private _loading = signal(false);
    private _error = signal<string | null>(null);
    private _dashboardData = signal<DashboardSummary | null>(null);

    readonly loading = this._loading.asReadonly();
    readonly error = this._error.asReadonly();
    readonly dashboardData = this._dashboardData.asReadonly();

    // Computed values
    readonly stats = computed<DashboardStats | null>(() => {
        const data = this._dashboardData();
        if (!data) return null;
        
        return {
            netWorth: data.net_worth,
            netWorthChange: data.net_worth_change_30d,
            netWorthChangePct: data.net_worth_change_percentage,
            totalAssets: data.total_assets,
            totalDebts: data.total_debts,
            savingsRate: data.savings_rate,
            monthlyIncome: data.monthly_income,
            monthlyExpenses: data.monthly_expenses
        };
    });

    readonly fireProgress = computed<FIREProgress | null>(() => {
        const data = this._dashboardData();
        if (!data) return null;
        
        return {
            currentNetWorth: data.fire_metrics.current_net_worth,
            targetAmount: data.fire_metrics.fire_target,
            progressPct: data.fire_metrics.progress_percentage,
            yearsToFire: data.fire_metrics.years_to_fire,
            estimatedDate: data.fire_metrics.estimated_fire_date,
            monthlyPassiveIncomeNeeded: data.fire_metrics.monthly_passive_income_needed,
            currentPassiveIncome: data.fire_metrics.current_passive_income,
            savingsRate: data.fire_metrics.monthly_savings_rate
        };
    });

    /**
     * Load all dashboard data
     */
    async loadDashboard(): Promise<void> {
        this._loading.set(true);
        this._error.set(null);
        
        try {
            const summary = await firstValueFrom(this.api.getDashboardSummary());
            this._dashboardData.set(summary);
        } catch (error) {
            console.error('Error loading dashboard:', error);
            this._error.set('Failed to load dashboard data');
        } finally {
            this._loading.set(false);
        }
    }

    /**
     * Get dashboard summary
     */
    getDashboardSummary(): Observable<DashboardSummary> {
        return this.api.getDashboardSummary().pipe(
            catchError(error => {
                console.error('Error fetching dashboard summary:', error);
                // Return default data on error
                return of(this.getDefaultSummary());
            })
        );
    }

    /**
     * Get dashboard stats (simplified)
     */
    async getStats(): Promise<DashboardStats> {
        try {
            const summary = await firstValueFrom(this.api.getDashboardSummary());
            return {
                netWorth: summary.net_worth,
                netWorthChange: summary.net_worth_change_30d,
                netWorthChangePct: summary.net_worth_change_percentage,
                totalAssets: summary.total_assets,
                totalDebts: summary.total_debts,
                savingsRate: summary.savings_rate,
                monthlyIncome: summary.monthly_income,
                monthlyExpenses: summary.monthly_expenses
            };
        } catch (error) {
            console.error('Error fetching stats:', error);
            return {
                netWorth: 0,
                netWorthChange: 0,
                netWorthChangePct: 0,
                totalAssets: 0,
                totalDebts: 0,
                savingsRate: 0,
                monthlyIncome: 0,
                monthlyExpenses: 0
            };
        }
    }

    /**
     * Get FIRE metrics
     */
    async getFIREMetrics(): Promise<FIREProgress> {
        try {
            const metrics = await firstValueFrom(this.api.getFIREMetrics());
            return {
                currentNetWorth: metrics.current_net_worth,
                targetAmount: metrics.fire_target,
                progressPct: metrics.progress_percentage,
                yearsToFire: metrics.years_to_fire,
                estimatedDate: metrics.estimated_fire_date,
                monthlyPassiveIncomeNeeded: metrics.monthly_passive_income_needed,
                currentPassiveIncome: metrics.current_passive_income,
                savingsRate: metrics.monthly_savings_rate
            };
        } catch (error) {
            console.error('Error fetching FIRE metrics:', error);
            return {
                currentNetWorth: 0,
                targetAmount: 0,
                progressPct: 0,
                yearsToFire: null,
                estimatedDate: null,
                monthlyPassiveIncomeNeeded: 0,
                currentPassiveIncome: 0,
                savingsRate: 0
            };
        }
    }

    /**
     * Get asset distribution for pie chart
     */
    async getAssetDistribution(): Promise<AssetAllocation[]> {
        try {
            const distribution = await firstValueFrom(this.api.getAssetDistribution());
            return distribution.map(d => ({
                category: CATEGORY_LABELS[d.category] || d.category,
                value: d.value,
                percentage: d.percentage,
                color: CATEGORY_COLORS[d.category] || CATEGORY_COLORS['other']
            }));
        } catch (error) {
            console.error('Error fetching asset distribution:', error);
            return [];
        }
    }

    /**
     * Get expense distribution for pie chart
     */
    async getExpenseDistribution(): Promise<AssetAllocation[]> {
        try {
            const distribution = await firstValueFrom(this.api.getExpenseDistribution());
            return distribution.map((d, index) => ({
                category: d.category,
                value: d.value,
                percentage: d.percentage,
                color: EXPENSE_COLORS[index % EXPENSE_COLORS.length]
            }));
        } catch (error) {
            console.error('Error fetching expense distribution:', error);
            return [];
        }
    }

    /**
     * Get worth progression for line chart
     */
    async getWorthProgression(months: number = 12): Promise<ChartDataPoint[]> {
        try {
            const progression = await firstValueFrom(this.api.getWorthProgression(months));
            return progression.map(p => ({
                label: this.formatDateLabel(p.date),
                value: p.net_worth
            }));
        } catch (error) {
            console.error('Error fetching worth progression:', error);
            return [];
        }
    }

    /**
     * Get worth progression with breakdown
     */
    async getWorthProgressionDetailed(months: number = 12): Promise<{ 
        labels: string[], 
        assets: number[], 
        debts: number[], 
        netWorth: number[] 
    }> {
        try {
            const progression = await firstValueFrom(this.api.getWorthProgression(months));
            return {
                labels: progression.map(p => this.formatDateLabel(p.date)),
                assets: progression.map(p => p.total_assets),
                debts: progression.map(p => p.total_debts),
                netWorth: progression.map(p => p.net_worth)
            };
        } catch (error) {
            console.error('Error fetching worth progression:', error);
            return { labels: [], assets: [], debts: [], netWorth: [] };
        }
    }

    // ==================== PRIVATE HELPERS ====================

    private formatDateLabel(dateStr: string): string {
        const date = new Date(dateStr);
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }

    private getDefaultSummary(): DashboardSummary {
        return {
            total_assets: 0,
            total_debts: 0,
            net_worth: 0,
            net_worth_change_30d: 0,
            net_worth_change_percentage: 0,
            monthly_income: 0,
            monthly_expenses: 0,
            savings_rate: 0,
            asset_distribution: [],
            worth_progression: [],
            fire_metrics: {
                current_net_worth: 0,
                fire_target: 0,
                progress_percentage: 0,
                monthly_savings_rate: 0,
                estimated_fire_date: null,
                years_to_fire: null,
                monthly_passive_income_needed: 0,
                current_passive_income: 0
            }
        };
    }
}

