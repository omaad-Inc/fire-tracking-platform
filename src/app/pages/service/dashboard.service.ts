import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, map, catchError, of, firstValueFrom, forkJoin } from 'rxjs';
import { ApiService, DashboardSummary, FIREMetrics, AssetDistribution, WorthProgression, Asset, Debt } from '../../core/services/api.service';

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
    'real_estate':  '#6366f1', // Indigo
    'stocks':       '#06b6d4', // Cyan
    'bonds':        '#10b981', // Emerald
    'crypto':       '#f59e0b', // Amber
    'cash':         '#8b5cf6', // Violet
    'retirement':   '#3b82f6', // Blue
    'life_insurance':'#14b8a6',// Teal
    'savings_account':'#a855f7',// Purple
    'business':     '#f97316', // Orange
    'vehicle':      '#64748b', // Slate
    'tontine':      '#e11d48', // Rose
    'mobile_money': '#0ea5e9', // Sky
    'collectibles': '#84cc16', // Lime
    'commodities':  '#ec4899', // Pink
    'other':        '#94a3b8'  // Gray
};

const CATEGORY_LABELS: Record<string, string> = {
    'real_estate':   'Immobilier',
    'stocks':        'Actions / Bourse',
    'bonds':         'Obligations',
    'crypto':        'Cryptomonnaies',
    'cash':          'Compte bancaire',
    'retirement':    'Épargne retraite',
    'life_insurance':'Assurance vie',
    'savings_account':'Livrets',
    'business':      'Entreprise',
    'vehicle':       'Véhicules',
    'tontine':       'Tontine',
    'mobile_money':  'Mobile Money',
    'collectibles':  'Collections',
    'commodities':   'Matières premières',
    'other':         'Autres'
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

    // ── Cache (5-minute TTL, stale-while-revalidate) ──────────────────────────
    private readonly CACHE_TTL = 5 * 60 * 1000;
    private _cache: Record<string, { data: any; ts: number }> = {};

    private isFresh(key: string): boolean {
        const entry = this._cache[key];
        return !!entry && (Date.now() - entry.ts) < this.CACHE_TTL;
    }

    private getCached<T>(key: string): T | null {
        return this._cache[key]?.data ?? null;
    }

    private setCache(key: string, data: any): void {
        this._cache[key] = { data, ts: Date.now() };
    }

    invalidateCache(): void {
        this._cache = {};
    }

    /** Check synchronously whether a specific cache key has data (avoids skeleton flash) */
    hasCached(key: string): boolean {
        return this._cache[key]?.data != null;
    }

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
        const KEY = 'stats';
        const cached = this.getCached<DashboardStats>(KEY);

        const fetch = async () => {
            try {
                const summary = await firstValueFrom(this.api.getDashboardSummary());
                const result: DashboardStats = {
                    netWorth: summary.net_worth,
                    netWorthChange: summary.net_worth_change_30d,
                    netWorthChangePct: summary.net_worth_change_percentage,
                    totalAssets: summary.total_assets,
                    totalDebts: summary.total_debts,
                    savingsRate: summary.savings_rate,
                    monthlyIncome: summary.monthly_income,
                    monthlyExpenses: summary.monthly_expenses
                };
                this.setCache(KEY, result);
                return result;
            } catch {
                return cached ?? {
                    netWorth: 0, netWorthChange: 0, netWorthChangePct: 0,
                    totalAssets: 0, totalDebts: 0, savingsRate: 0,
                    monthlyIncome: 0, monthlyExpenses: 0
                };
            }
        };

        if (cached) {
            if (!this.isFresh(KEY)) fetch(); // revalidate in background
            return cached;
        }
        return fetch();
    }

    /**
     * Get FIRE metrics
     */
    async getFIREMetrics(): Promise<FIREProgress> {
        const KEY = 'fire';
        const cached = this.getCached<FIREProgress>(KEY);

        const fetch = async () => {
            try {
                const raw: any = await firstValueFrom(this.api.getFIREMetrics());
                const result: FIREProgress = {
                    // /dashboard/fire-metrics returns total_net_worth; /dashboard/summary returns current_net_worth
                    currentNetWorth: raw.total_net_worth ?? raw.current_net_worth ?? 0,
                    targetAmount: raw.fire_target ?? 0,
                    // Pydantic schema uses fire_progress_percentage; summary dict uses progress_percentage
                    progressPct: raw.fire_progress_percentage ?? raw.progress_percentage ?? 0,
                    yearsToFire: raw.years_to_fire ?? null,
                    // Pydantic schema uses fire_date; summary dict uses estimated_fire_date
                    estimatedDate: raw.fire_date ?? raw.estimated_fire_date ?? null,
                    monthlyPassiveIncomeNeeded: raw.monthly_passive_income_needed ?? 0,
                    // Pydantic schema uses passive_income; summary dict uses current_passive_income
                    currentPassiveIncome: raw.passive_income ?? raw.current_passive_income ?? 0,
                    // Pydantic schema uses savings_rate; summary dict uses monthly_savings_rate
                    savingsRate: raw.savings_rate ?? raw.monthly_savings_rate ?? 0
                };
                this.setCache(KEY, result);
                return result;
            } catch {
                return cached ?? {
                    currentNetWorth: 0, targetAmount: 0, progressPct: 0,
                    yearsToFire: null, estimatedDate: null,
                    monthlyPassiveIncomeNeeded: 0, currentPassiveIncome: 0, savingsRate: 0
                };
            }
        };

        if (cached) {
            if (!this.isFresh(KEY)) fetch();
            return cached;
        }
        return fetch();
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
     * Compute worth progression client-side using asset purchase_date + linear interpolation.
     * months = 0 → all-time view: starts 3 months before the earliest purchase_date.
     * months > 0 → last N months.
     */
    private async computeProgressionClientSide(months: number): Promise<{
        labels: string[];
        assets: number[];
        debts: number[];
        netWorth: number[];
    }> {
        const [assets, debts] = await Promise.all([
            firstValueFrom(this.api.getAssets(0, 200)),
            firstValueFrom(this.api.getDebts(0, 100))
        ]);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Determine the start of the chart window
        let startDate: Date;
        if (months === 0) {
            // All-time: find earliest purchase_date among all assets
            let earliest = new Date(today);
            for (const asset of assets) {
                if (asset.purchase_date) {
                    const d = new Date(asset.purchase_date);
                    if (d < earliest) earliest = d;
                }
            }
            // Start 3 months before first purchase so curve clearly starts from 0
            startDate = new Date(earliest.getFullYear(), earliest.getMonth() - 3, 1);
        } else {
            startDate = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);
        }

        // Build monthly point list from startDate to today
        const pointDates: Date[] = [];
        let cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        while (cur <= today) {
            pointDates.push(new Date(cur));
            cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
        }

        const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        const labels: string[] = [];
        const assetsArr: number[] = [];
        const debtsArr: number[] = [];
        const netWorthArr: number[] = [];

        const lastIdx = pointDates.length - 1;
        for (let idx = 0; idx < pointDates.length; idx++) {
            const pointDate = pointDates[idx];
            const monthsAgo = lastIdx - idx; // how many months before current

            // For the current month point, use actual current values — no interpolation
            const isCurrentMonth =
                pointDate.getFullYear() === today.getFullYear() &&
                pointDate.getMonth() === today.getMonth();

            let totalAssets = 0;
            for (const asset of assets) {
                if (!asset.purchase_date) {
                    totalAssets += asset.current_value;
                    continue;
                }
                const assetStart = new Date(asset.purchase_date);
                if (assetStart <= pointDate) {
                    if (isCurrentMonth) {
                        // This IS the current value — no interpolation needed
                        totalAssets += asset.current_value;
                    } else {
                        // Historical point: interpolate linearly from purchase to current
                        const purchaseVal = asset.purchase_value ?? asset.current_value;
                        const totalDays = Math.max(1, (today.getTime() - assetStart.getTime()) / 86_400_000);
                        const elapsed = Math.max(0, (pointDate.getTime() - assetStart.getTime()) / 86_400_000);
                        const pct = Math.min(1, elapsed / totalDays);
                        totalAssets += purchaseVal + (asset.current_value - purchaseVal) * pct;
                    }
                }
                // asset not yet acquired at this point → skip (value = 0)
            }

            let totalDebts = 0;
            for (const debt of debts) {
                if (debt.type === 'i_owe') {
                    const monthly = debt.monthly_payment ?? 0;
                    totalDebts += debt.current_amount + monthly * monthsAgo;
                }
            }

            const year = pointDate.getFullYear();
            const month = pointDate.getMonth();
            // Compact label: always show year on January or first point
            const showYear = month === 0 || idx === 0;
            labels.push(showYear ? `${MONTH_NAMES[month]} ${year}` : MONTH_NAMES[month]);
            assetsArr.push(Math.round(totalAssets));
            debtsArr.push(Math.round(totalDebts));
            netWorthArr.push(Math.max(0, Math.round(totalAssets - totalDebts)));
        }

        return { labels, assets: assetsArr, debts: debtsArr, netWorth: netWorthArr };
    }

    /**
     * Get worth progression for line chart (client-side interpolation)
     */
    async getWorthProgression(months: number = 12): Promise<ChartDataPoint[]> {
        const KEY = `progression_${months}`;
        const cached = this.getCached<ChartDataPoint[]>(KEY);

        const fetch = async () => {
            try {
                const { labels, netWorth } = await this.computeProgressionClientSide(months);
                const result: ChartDataPoint[] = labels.map((label, idx) => ({ label, value: netWorth[idx] }));
                this.setCache(KEY, result);
                return result;
            } catch {
                return cached ?? [];
            }
        };

        if (cached) {
            if (!this.isFresh(KEY)) fetch();
            return cached;
        }
        return fetch();
    }

    /**
     * Get worth progression with breakdown (client-side interpolation)
     */
    async getWorthProgressionDetailed(months: number = 12): Promise<{
        labels: string[];
        assets: number[];
        debts: number[];
        netWorth: number[];
    }> {
        try {
            return await this.computeProgressionClientSide(months);
        } catch (error) {
            console.error('Error computing worth progression:', error);
            return { labels: [], assets: [], debts: [], netWorth: [] };
        }
    }

    /**
     * Get total assets progression — Patrimoine Total Brut (client-side interpolation)
     */
    async getTotalAssetsProgression(months: number = 12): Promise<ChartDataPoint[]> {
        const KEY = `assets_progression_${months}`;
        const cached = this.getCached<ChartDataPoint[]>(KEY);

        const fetch = async () => {
            try {
                const { labels, assets } = await this.computeProgressionClientSide(months);
                const result: ChartDataPoint[] = labels.map((label, idx) => ({ label, value: assets[idx] }));
                this.setCache(KEY, result);
                return result;
            } catch {
                return cached ?? [];
            }
        };

        if (cached) {
            if (!this.isFresh(KEY)) fetch();
            return cached;
        }
        return fetch();
    }

    /**
     * Get progression for a specific category group (filtered assets only)
     */
    async getCategoryProgression(categories: string[], months: number = 0): Promise<ChartDataPoint[]> {
        const KEY = `cat_progression_${categories.join('_')}_${months}`;
        const cached = this.getCached<ChartDataPoint[]>(KEY);

        const fetch = async () => {
            try {
                const result = await this.computeCategoryProgressionClientSide(categories, months);
                this.setCache(KEY, result);
                return result;
            } catch {
                return cached ?? [];
            }
        };

        if (cached) {
            if (!this.isFresh(KEY)) fetch();
            return cached;
        }
        return fetch();
    }

    private async computeCategoryProgressionClientSide(categories: string[], months: number): Promise<ChartDataPoint[]> {
        const all = await firstValueFrom(this.api.getAssets(0, 200));
        const assets = all.filter(a => categories.includes(a.category ?? ''));

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let startDate: Date;
        if (months === 0) {
            let earliest = new Date(today);
            for (const asset of assets) {
                if (asset.purchase_date) {
                    const d = new Date(asset.purchase_date);
                    if (d < earliest) earliest = d;
                }
            }
            startDate = new Date(earliest.getFullYear(), earliest.getMonth() - 3, 1);
        } else {
            startDate = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);
        }

        const pointDates: Date[] = [];
        let cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        while (cur <= today) {
            pointDates.push(new Date(cur));
            cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
        }

        const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        const result: ChartDataPoint[] = [];

        for (let idx = 0; idx < pointDates.length; idx++) {
            const pointDate = pointDates[idx];
            const isCurrentMonth =
                pointDate.getFullYear() === today.getFullYear() &&
                pointDate.getMonth() === today.getMonth();

            let total = 0;
            for (const asset of assets) {
                if (!asset.purchase_date) {
                    total += asset.current_value;
                    continue;
                }
                const assetStart = new Date(asset.purchase_date);
                if (assetStart <= pointDate) {
                    if (isCurrentMonth) {
                        total += asset.current_value;
                    } else {
                        const purchaseVal = asset.purchase_value ?? asset.current_value;
                        const totalDays = Math.max(1, (today.getTime() - assetStart.getTime()) / 86_400_000);
                        const elapsed = Math.max(0, (pointDate.getTime() - assetStart.getTime()) / 86_400_000);
                        const pct = Math.min(1, elapsed / totalDays);
                        total += purchaseVal + (asset.current_value - purchaseVal) * pct;
                    }
                }
            }
            const month = pointDate.getMonth();
            const showYear = month === 0 || idx === 0;
            result.push({
                label: showYear ? `${MONTH_NAMES[month]} ${pointDate.getFullYear()}` : MONTH_NAMES[month],
                value: Math.round(total)
            });
        }

        return result;
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

