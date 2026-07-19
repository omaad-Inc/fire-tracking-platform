import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, map, catchError, of, firstValueFrom, forkJoin } from 'rxjs';
import { ApiService, DashboardSummary, FireMetrics, AssetDistribution, WorthProgression, Asset, Debt } from '../../core/services/api.service';
import { isDarkMode } from '../../core/theme/chart-theme';
import { I18nService } from '../../i18n/i18n.service';
import { CurrencyService } from '../../core/services/currency.service';
import { CACHE_RESET } from '../../core/services/cache-reset.token';

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

// Brand-tokenized chart palette — navy + ochre + warm-grays.
// Light and dark variants so donut slices remain visible on both backgrounds.
const CATEGORY_COLORS_LIGHT: Record<string, string> = {
    'real_estate':    '#1A2740', // brand-700 (anchor)
    'stocks_brvm':    '#C77B3C', // ochre-500 (accent — BRVM identity)
    'stocks_intl':    '#8B4F26', // deep ochre — international stocks
    'bonds':          '#4D5F80', // brand-400
    'crypto':         '#D8A369', // ochre-400
    'cash':           '#3D3B35', // warm-700
    'retirement':     '#6E6A60', // warm-500
    'life_insurance': '#9C988C', // warm-400
    'savings_account':'#C2BDB1', // warm-300
    'business':       '#08111E', // brand-950
    'vehicle':        '#71421C', // ochre-800
    'tontine':        '#2C3E5E', // brand-500
    'mobile_money':   '#EBD0B0', // ochre-200
    'collectibles':   '#52504A', // warm-600
    'commodities':    '#8A98AE', // brand-300
    'other':          '#B6BFCD'  // brand-200
};

const CATEGORY_COLORS_DARK: Record<string, string> = {
    'real_estate':    '#8A98AE', // brand-300
    'stocks_brvm':    '#D8A369', // ochre-400 — BRVM identity
    'stocks_intl':    '#B98856', // mid-ochre — international stocks
    'bonds':          '#B6BFCD', // brand-200
    'crypto':         '#EBD0B0', // ochre-200
    'cash':           '#9C988C', // warm-400
    'retirement':     '#C2BDB1', // warm-300
    'life_insurance': '#DEDAD0', // warm-200
    'savings_account':'#F1EDE5', // warm-100
    'business':       '#4D5F80', // brand-400
    'vehicle':        '#D8A369', // ochre-400
    'tontine':        '#B6BFCD', // brand-200
    'mobile_money':   '#F4E5D2', // ochre-100
    'collectibles':   '#C2BDB1', // warm-300
    'commodities':    '#EBD0B0', // ochre-200
    'other':          '#DEDAD0'  // warm-200
};

function getCategoryColors(): Record<string, string> {
    return isDarkMode() ? CATEGORY_COLORS_DARK : CATEGORY_COLORS_LIGHT;
}

const EXPENSE_COLORS_LIGHT: string[] = [
    '#1A2740', // brand-700
    '#C77B3C', // ochre-500
    '#4D5F80', // brand-400
    '#D8A369', // ochre-400
    '#3D3B35', // warm-700
    '#6E6A60', // warm-500
    '#9C988C', // warm-400
    '#C2BDB1', // warm-300
    '#71421C', // ochre-800
    '#08111E'  // brand-950
];

const EXPENSE_COLORS_DARK: string[] = [
    '#8A98AE', // brand-300
    '#D8A369', // ochre-400
    '#B6BFCD', // brand-200
    '#EBD0B0', // ochre-200
    '#9C988C', // warm-400
    '#C2BDB1', // warm-300
    '#DEDAD0', // warm-200
    '#F1EDE5', // warm-100
    '#F4E5D2', // ochre-100
    '#4D5F80'  // brand-400
];

function getExpenseColors(): string[] {
    return isDarkMode() ? EXPENSE_COLORS_DARK : EXPENSE_COLORS_LIGHT;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
    private api = inject(ApiService);
    private currencyService = inject(CurrencyService);
    private i18n = inject(I18nService);

    constructor() {
        // Clear cached user data on logout/login (see CACHE_RESET). Root
        // singleton → lives for the app, so no teardown needed.
        inject(CACHE_RESET).subscribe(() => this.invalidateCache());
    }

    /** Asset-category display label via i18n (assetCategories.*), key fallback. */
    private assetCategoryLabel(cat: string): string {
        const label = this.i18n.t('assetCategories.' + cat);
        return label === 'assetCategories.' + cat ? cat : label;
    }

    /** Locale-aware short month names (indexed 0-11) for chart labels. */
    private monthNames(): string[] {
        return this.i18n.lang() === 'fr'
            ? ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
            : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    }

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
    /**
     * One `/dashboard/summary` request shared across getStats/getFIREMetrics
     * (and anything else that needs it). The dashboard used to fire ~8 calls —
     * summary AND a separate /fire-metrics (which is currently 500-ing) — with
     * no dedup, so concurrent widgets double-requested. This memoizes the
     * in-flight promise so a burst collapses to a single network call.
     */
    private summaryInFlight: Promise<DashboardSummary> | null = null;
    private fetchSummary(): Promise<DashboardSummary> {
        if (this.summaryInFlight) return this.summaryInFlight;
        this.summaryInFlight = firstValueFrom(this.api.getDashboardSummary())
            .finally(() => { this.summaryInFlight = null; });
        return this.summaryInFlight;
    }

    async getStats(): Promise<DashboardStats> {
        const KEY = 'stats';
        const cached = this.getCached<DashboardStats>(KEY);

        const fetch = async () => {
            try {
                const summary = await this.fetchSummary();
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
                // Derive from the typed summary.fire_metrics (backend
                // FireMetricsSummary). One canonical field-name set end-to-end —
                // no more `?? ` guessing across a drifted contract (P1-18).
                const fm: FireMetrics = (await this.fetchSummary()).fire_metrics;
                const result: FIREProgress = {
                    currentNetWorth: fm.current_net_worth,
                    targetAmount: fm.fire_target,
                    progressPct: fm.progress_percentage,
                    yearsToFire: fm.years_to_fire,
                    estimatedDate: fm.estimated_fire_date,
                    monthlyPassiveIncomeNeeded: fm.monthly_passive_income_needed,
                    currentPassiveIncome: fm.current_passive_income,
                    savingsRate: fm.monthly_savings_rate
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
                category: this.assetCategoryLabel(d.category),
                value: d.value,
                percentage: d.percentage,
                color: getCategoryColors()[d.category] || getCategoryColors()['other']
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
                color: getExpenseColors()[index % getExpenseColors().length]
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
    private async computeProgressionClientSide(months: number, categories?: string[]): Promise<{
        labels: string[];
        assets: number[];
        debts: number[];
        netWorth: number[];
    }> {
        const [allAssets, debts] = await Promise.all([
            firstValueFrom(this.api.getAssets(0, 200)),
            // The category view charts assets only — skip the debts request.
            categories ? Promise.resolve([]) : firstValueFrom(this.api.getDebts(0, 100))
        ]);
        const assets = categories
            ? allAssets.filter(a => categories.includes(a.category ?? ''))
            : allAssets;

        // Values from the API are NATIVE (multi-currency) — every figure must
        // go through FX to the EUR base before being summed or interpolated.
        const toEur = (v: number, c: string | null | undefined) =>
            this.currencyService.toEurFromNative(v, c);

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

        const MONTH_NAMES = this.monthNames();
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
                const currentEur = toEur(asset.current_value, asset.currency);
                if (!asset.purchase_date) {
                    totalAssets += currentEur;
                    continue;
                }
                const assetStart = new Date(asset.purchase_date);
                if (assetStart <= pointDate) {
                    if (isCurrentMonth) {
                        // This IS the current value — no interpolation needed
                        totalAssets += currentEur;
                    } else {
                        // Historical point: interpolate linearly from purchase to current
                        const purchaseVal = asset.purchase_value != null
                            ? toEur(asset.purchase_value, asset.currency)
                            : currentEur;
                        const totalDays = Math.max(1, (today.getTime() - assetStart.getTime()) / 86_400_000);
                        const elapsed = Math.max(0, (pointDate.getTime() - assetStart.getTime()) / 86_400_000);
                        const pct = Math.min(1, elapsed / totalDays);
                        totalAssets += purchaseVal + (currentEur - purchaseVal) * pct;
                    }
                }
                // asset not yet acquired at this point → skip (value = 0)
            }

            let totalDebts = 0;
            for (const debt of debts) {
                if (debt.type === 'i_owe') {
                    const monthly = debt.monthly_payment ?? 0;
                    totalDebts += toEur(debt.current_amount + monthly * monthsAgo, debt.currency);
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
            // Prefer the backend's snapshot-based progression (FX-correct and
            // reuses the /dashboard/summary payload when available) over
            // client-side interpolation; fall back to the client computation
            // when the endpoint is unavailable or for all-time (months=0).
            try {
                if (months > 0) {
                    const rows = await firstValueFrom(this.api.getWorthProgression(months));
                    if (rows?.length) {
                        const result: ChartDataPoint[] = rows.map(r => ({
                            label: this.formatDateLabel(r.date),
                            value: Math.round(r.net_worth),
                        }));
                        this.setCache(KEY, result);
                        return result;
                    }
                }
            } catch { /* fall through to the client-side computation */ }
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
        // Same engine as the net-worth progression, filtered to the category
        // group and charting the assets series only.
        const { labels, assets } = await this.computeProgressionClientSide(months, categories);
        return labels.map((label, idx) => ({ label, value: assets[idx] }));
    }

    // ==================== PRIVATE HELPERS ====================

    private formatDateLabel(dateStr: string): string {
        const date = new Date(dateStr);
        const months = this.monthNames();
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

