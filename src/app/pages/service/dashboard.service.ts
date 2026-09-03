import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, map, catchError, of, firstValueFrom, forkJoin } from 'rxjs';
import { ApiService, DashboardSummary, FireMetrics, AssetDistribution, WorthProgression, Asset, Debt } from '../../core/services/api.service';
import { merge } from 'rxjs';
import { isDarkMode } from '../../core/theme/chart-theme';
import { I18nService } from '../../i18n/i18n.service';
import { CurrencyService } from '../../core/services/currency.service';
import { CACHE_RESET } from '../../core/services/cache-reset.token';
import { AssetsStateService } from './assets-state.service';
import { cachedResource, CachedResource } from '../../core/util/cached-resource';
import { granularityFor } from '../../core/util/chart-range';

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

// Brand-tokenized chart palette, navy + ochre + warm-grays.
// Light and dark variants so donut slices remain visible on both backgrounds.
const CATEGORY_COLORS_LIGHT: Record<string, string> = {
    'real_estate':    '#1A2740', // brand-700 (anchor)
    'stocks_brvm':    '#C77B3C', // ochre-500 (accent, BRVM identity)
    'stocks_intl':    '#8B4F26', // deep ochre, international stocks
    'fcp':            '#C77B3C', // ochre-500, same as BRVM (owner directive: one UEMOA-market color)
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

// Dark slices: the validated dark-categorical hues (dark-mode audit Batch 3,
// dataviz six-checks vs #111B2E). Color follows the ENTITY, never its rank.
// The 8 validated hues go to the categories that actually co-occur in a
// Senegal-market portfolio (the WA-first catalog); rare tails take steel
// neutrals and are relieved by the legend + slice gaps.
const CATEGORY_COLORS_DARK: Record<string, string> = {
    'real_estate':    '#5B84C4', // steel blue (anchor)
    'stocks_brvm':    '#C77B3C', // ochre, BRVM identity
    'stocks_intl':    '#B0574A', // terracotta, sibling of BRVM
    'fcp':            '#C77B3C', // ochre, same as BRVM (owner directive: one UEMOA-market color)
    'savings_account':'#A98F2C', // gold (épargne)
    'cash':           '#2FA3B5', // teal (liquid)
    'tontine':        '#B6699F', // mauve
    'mobile_money':   '#86A04B', // olive
    'crypto':         '#9678D6', // violet
    'bonds':          '#8593AB', // neutral steel (tail)
    'retirement':     '#4D5F80', // deep steel (tail)
    'life_insurance': '#93A7C4', // pale steel (tail)
    'business':       '#B98856', // tan (tail)
    'vehicle':        '#71829F', // slate (tail)
    'collectibles':   '#6E6A60', // warm grey (tail)
    'commodities':    '#A88A63', // sand (tail)
    'other':          '#5C6B89'  // muted steel (tail)
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

// Validated dark categorical (dark-mode audit Batch 3) + 2 steel tails.
const EXPENSE_COLORS_DARK: string[] = [
    '#C77B3C', // ochre (anchor)
    '#5B84C4', // steel blue
    '#A98F2C', // gold
    '#B0574A', // terracotta
    '#2FA3B5', // teal
    '#9678D6', // violet
    '#86A04B', // olive
    '#B6699F', // mauve
    '#8593AB', // neutral steel (tail)
    '#5C6B89'  // muted steel (tail)
];

function getExpenseColors(): string[] {
    return isDarkMode() ? EXPENSE_COLORS_DARK : EXPENSE_COLORS_LIGHT;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
    private api = inject(ApiService);
    private currencyService = inject(CurrencyService);
    private i18n = inject(I18nService);

    private stateService = inject(AssetsStateService);

    constructor() {
        // Clear cached user data on logout/login (see CACHE_RESET). Root
        // singleton → lives for the app, so no teardown needed. reset() (not
        // invalidate) so the next user never sees the previous user's summary.
        inject(CACHE_RESET).subscribe(() => this.resetAll());

        // Any data mutation (add/edit/delete of a transaction, asset, debt, or
        // savings goal) must drop the dashboard's cached summary so the KPIs
        // refetch fresh, otherwise adding a transaction left the net-worth /
        // monthly-flux / FIRE cards showing 5-minute-stale numbers (the P0-2
        // staleness bug class this task exists to kill). Widgets already reload
        // on these same events; this ensures the reload sees fresh data. This
        // subscription is registered at construction, before any widget's
        // ngOnInit reload, so invalidation always precedes the refetch.
        merge(
            this.stateService.assetsUpdated$,
            this.stateService.debtsUpdated$,
            this.stateService.savingsUpdated$,
            this.stateService.transactionsUpdated$,
        ).subscribe(() => this.invalidateCache());
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

    // ── Cache (shared cachedResource, P2-FE-1) ───────────────────────────────
    // One resource for the /dashboard/summary payload (getStats + getFIREMetrics
    // both derive from it, the resource's in-flight promise collapses that burst
    // to a single request). Parameterized progression series each get their own
    // lazily-created resource, keyed by args, in `progressionResources`.
    // persistKey (perf S-boot): the last good summary/progression is snapshotted
    // per-user on the device, so a hard refresh paints real numbers instantly
    // and revalidates in the background instead of blanking on the network.
    private summaryResource = cachedResource<DashboardSummary>(
        () => firstValueFrom(this.api.getDashboardSummary()),
        { persistKey: 'dashboard-summary' },
    );
    private progressionResources = new Map<string, CachedResource<ChartDataPoint[]>>();

    private progression(key: string, fetcher: () => Promise<ChartDataPoint[]>, persist = false): CachedResource<ChartDataPoint[]> {
        let r = this.progressionResources.get(key);
        if (!r) { r = cachedResource(fetcher, persist ? { persistKey: key } : {}); this.progressionResources.set(key, r); }
        return r;
    }

    /** Live summary signal (updates when a background revalidation lands). */
    readonly summaryData = this.summaryResource.data;

    /** Drop freshness on all dashboard caches so the next read refetches (write events). */
    invalidateCache(): void {
        this.summaryResource.invalidate();
        this.progressionResources.forEach(r => r.invalidate());
    }

    /** Clear all dashboard caches back to empty (logout, prevents cross-user bleed). */
    private resetAll(): void {
        this.summaryResource.reset();
        this.progressionResources.forEach(r => r.reset());
        this.progressionResources.clear();
        this._dashboardData.set(null);
    }

    /** Whether the summary (stats/fire) is already cached, avoids skeleton flash. */
    hasCached(key: string): boolean {
        if (key === 'stats' || key === 'fire') return this.summaryResource.hasData();
        return this.progressionResources.get(key)?.hasData() ?? false;
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
            // Route through the shared resource so this dedups with any
            // concurrent getStats()/getFIREMetrics() into one summary request.
            const summary = await this.summaryResource.load();
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
     * Dashboard stats, derived from the shared summary resource. The resource
     * handles TTL + stale-while-revalidate + in-flight dedup, and on a cold
     * failure its load() rejects so the KPI widget shows an error+retry card
     * instead of a fake "0 FCFA" net worth (P1-5). getStats() + getFIREMetrics()
     * fired together collapse to ONE /dashboard/summary request.
     */
    async getStats(): Promise<DashboardStats> {
        return this.statsFromSummary(await this.summaryResource.load());
    }

    /** Sync summary → stats mapper, shared by getStats() and live-signal consumers. */
    statsFromSummary(summary: DashboardSummary): DashboardStats {
        return {
            netWorth: summary.net_worth,
            netWorthChange: summary.net_worth_change_30d,
            netWorthChangePct: summary.net_worth_change_percentage,
            totalAssets: summary.total_assets,
            totalDebts: summary.total_debts,
            savingsRate: summary.savings_rate,
            monthlyIncome: summary.monthly_income,
            monthlyExpenses: summary.monthly_expenses,
        };
    }

    /**
     * FIRE metrics, derived from the same summary resource (one canonical
     * field-name set end-to-end, no `??` guessing across a drifted contract, P1-18).
     */
    async getFIREMetrics(): Promise<FIREProgress> {
        return this.fireFromSummary(await this.summaryResource.load());
    }

    /** Sync summary → FIRE mapper, shared by getFIREMetrics() and live-signal consumers. */
    fireFromSummary(summary: DashboardSummary): FIREProgress {
        const fm: FireMetrics = summary.fire_metrics;
        return {
            currentNetWorth: fm.current_net_worth,
            targetAmount: fm.fire_target,
            progressPct: fm.progress_percentage,
            yearsToFire: fm.years_to_fire,
            estimatedDate: fm.estimated_fire_date,
            monthlyPassiveIncomeNeeded: fm.monthly_passive_income_needed,
            currentPassiveIncome: fm.current_passive_income,
            savingsRate: fm.monthly_savings_rate,
        };
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

    // computeProgressionClientSide lived here: it drew a straight line from
    // each asset's purchase price to its value today and, for an asset with no
    // purchase_date, repeated today's value across every past month. It
    // reported figures that were never measured and could not react to a
    // transaction. Every chart that used it now reads a real series (the
    // worth-progression snapshots, or /assets/history/by-category), so it is
    // deliberately gone rather than left around to be reached for again.

    /**
     * Net-worth progression: real persisted snapshots per month, today's live
     * totals for the current month.
     */
    async getWorthProgression(months: number = 12): Promise<ChartDataPoint[]> {
        return this.worthProgressionResource(months).load();
    }

    /** Live progression signal (updates when a background revalidation lands). */
    worthProgressionData(months: number = 12) {
        return this.worthProgressionResource(months).data;
    }

    private worthProgressionResource(months: number): CachedResource<ChartDataPoint[]> {
        return this.progression(`progression_${months}`, async () => {
            // Prefer the backend's snapshot-based progression (FX-correct and
            // reuses the /dashboard/summary payload when available) over
            // client-side interpolation; fall back to the client computation
            // when the endpoint is unavailable or for all-time (months=0).
            // months = 0 is the UI's "Max"; the endpoint counts real months, so
            // ask for a long window rather than falling back to the client-side
            // interpolation this replaced.
            try {
                const rows = await firstValueFrom(
                    this.api.getWorthProgression(months === 0 ? 120 : months)
                );
                if (rows?.length) {
                    return rows.map(r => ({ label: this.formatDateLabel(r.date), value: Math.round(r.net_worth) }));
                }
            } catch { /* nothing true to draw */ }
            return [];
        }, true); // persist: the hero sparkline paints instantly on refresh
    }


    /**
     * Gross-assets progression ("Patrimoine Total Brut"): the same snapshot-backed
     * series, charting total_assets instead of net worth.
     */
    async getTotalAssetsProgression(months: number = 12): Promise<ChartDataPoint[]> {
        return this.totalAssetsProgression(months).load();
    }

    /**
     * The gross-assets progression as a live resource, so a screen can paint
     * from `data` (device snapshot, then in-memory) and fold the background
     * revalidation in when it lands, instead of awaiting one Promise and
     * blanking a skeleton over the chart on every visit.
     *
     * Persisted (like the hero's worth progression) on purpose: this is the
     * Patrimoine page's headline chart, and without a snapshot every cold load
     * of the PWA started it from nothing while the round trip ran.
     */
    totalAssetsProgression(months: number = 12): CachedResource<ChartDataPoint[]> {
        return this.progression(`assets_progression_${months}`, async () => {
            // Real gross assets per month: persisted snapshots where they exist,
            // otherwise rebuilt server-side from each asset's own source of
            // truth. NOT the old client-side purchase -> today ramp, which
            // reported a value for every month that was never measured and
            // could not react to a transaction. months = 0 is the UI's "Max".
            try {
                // A one-month window is drawn day by day (rolling, ending today);
                // longer windows keep one point per month. See chart-range.ts.
                const granularity = granularityFor(months);
                const rows = await firstValueFrom(
                    this.api.getWorthProgression(months === 0 ? 120 : months, granularity)
                );
                if (rows?.length) {
                    return rows.map(r => ({
                        label: granularity === 'day' ? this.formatDayLabel(r.date) : this.formatDateLabel(r.date),
                        value: Math.round(r.total_assets),
                    }));
                }
            } catch { /* nothing true to draw: an empty chart, not an invented one */ }
            return [];
        }, true); // persist: the Patrimoine chart paints instantly on a cold load
    }

    /**
     * Get progression for a specific category group (filtered assets only)
     */
    async getCategoryProgression(categories: string[], months: number = 0): Promise<ChartDataPoint[]> {
        // Persisted: the category page's chart used to rebuild from nothing on
        // every cold load. With a snapshot, load() resolves in the time of an
        // IndexedDB read and revalidates behind the drawn chart.
        return this.progression(`cat_progression_${categories.join('_')}_${months}`, async () => {
            try {
                return await this.computeCategoryProgressionClientSide(categories, months);
            } catch {
                return [];
            }
        }, true).load();
    }

    private async computeCategoryProgressionClientSide(categories: string[], months: number): Promise<ChartDataPoint[]> {
        // The group's REAL series, summed server-side from each asset's own
        // source of truth (an account's ledger, a title's quotes, a recorded
        // value). This used to be interpolated here from purchase_value to
        // current_value, which drew a FLAT line for any asset without a
        // purchase_date — every livret and most assurance vie rows — so the
        // Épargne chart never moved however much money went through it.
        // months = 0 means "Max" in the UI; the API counts real months.
        const granularity = granularityFor(months);
        const history = await firstValueFrom(
            this.api.getCategoryHistory(categories, months === 0 ? 120 : months, granularity)
        );
        return history.points.map(p => ({
            label: granularity === 'day' ? this.formatDayLabel(p.date) : this.formatMonthLabel(p.date),
            value: p.value,
        }));
    }

    /** 'YYYY-MM-DD' -> 'Août 2026', matching the other charts' labels. Built
     *  from the parts: `new Date('2026-08-31')` parses as UTC and can render as
     *  the previous day (hence the previous month) west of GMT. */
    /** "3 août" / "Aug 3": the label for a day-granularity point. */
    private formatDayLabel(iso: string): string {
        const [y, m, d] = iso.split('-').map(Number);
        const names = this.monthNames();
        if (!y || !m || !d) return iso;
        return this.i18n.lang() === 'fr' ? `${d} ${names[m - 1].toLowerCase()}` : `${names[m - 1]} ${d}`;
    }

    private formatMonthLabel(iso: string): string {
        const [y, m] = iso.split('-').map(Number);
        const names = this.monthNames();
        if (!y || !m) return iso;
        return `${names[m - 1]} ${y}`;
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

