import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription, merge } from 'rxjs';

import { I18nService } from '../../../i18n/i18n.service';
import { NavService } from '../../../core/services/nav.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { ApiService, FinancialAlert } from '../../../core/services/api.service';
import { DashboardService, DashboardStats, FIREProgress, ChartDataPoint } from '../../service/dashboard.service';
import { AssetsStateService } from '../../service/assets-state.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { LoadErrorComponent } from '../../../core/components/load-error.component';
import { SkeletonCardComponent } from '../../../core/components/skeleton-card.component';

/**
 * S5-1 "Am I okay?" hero. The deliberate above-the-fold answer that replaces the
 * flat KPI-card row: net worth as the ONE dominant number (with a trend pill +
 * sparkline), a compact this-month cash-flow + savings-rate strip beneath, the
 * single top alert as the one nudge, and FIRE % as a quiet secondary indicator.
 *
 * Data reuses the cached DashboardService summary (net worth, flux, FIRE) and its
 * FX-correct worth-progression series for the sparkline; the nudge reuses
 * /insights/alerts. Trust-preserving: on a cold load failure we show an explicit
 * error+retry, never a fake "0" net worth.
 */
@Component({
    selector: 'app-home-hero',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, RouterModule, AppAmountComponent, LoadErrorComponent, SkeletonCardComponent],
    template: `
        @if (loading()) {
            <div class="mb-4"><app-skeleton-card [count]="1" /></div>
        } @else if (loadError()) {
            <div class="mb-4">
                <app-load-error [title]="t('dashboard.stats.errorTitle')" [body]="t('dashboard.stats.errorBody')" (retry)="retry()" />
            </div>
        } @else {
            <section class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 md:p-6 mb-4"
                     [attr.aria-label]="t('dashboard.pageTitle')">

                <!-- Hero: net worth as the one dominant number + trend + sparkline -->
                <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div class="min-w-0">
                        <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-1">{{ t('dashboard.kpi.netWorth') }}</span>
                        <div class="font-bold text-4xl md:text-5xl leading-none tracking-tight"
                             [ngClass]="realNetWorth() >= 0 ? 'text-surface-900 dark:text-surface-0' : 'text-negative'">
                            <app-amount [value]="absNetWorth()" [prefix]="realNetWorth() < 0 ? '−' : ''" [animate]="!reducedMotion" />
                        </div>
                        <div class="flex items-center gap-2 mt-2">
                            @if (trendPct() === 0) {
                                <span class="inline-flex items-center px-2 py-0.5 rounded-lg bg-surface-500/10 text-surface-500 text-sm font-semibold">=</span>
                            } @else if (trendPct() > 0) {
                                <span class="inline-flex items-center px-2 py-0.5 rounded-lg bg-positive/10 text-positive text-sm font-semibold">
                                    <i class="pi pi-arrow-up text-xs mr-1"></i>+{{ trendPct() | number:'1.1-1' }}%
                                </span>
                            } @else {
                                <span class="inline-flex items-center px-2 py-0.5 rounded-lg bg-negative/10 text-negative text-sm font-semibold">
                                    <i class="pi pi-arrow-down text-xs mr-1"></i>{{ trendPct() | number:'1.1-1' }}%
                                </span>
                            }
                            <span class="text-surface-500 dark:text-surface-400 text-sm">{{ t('dashboard.kpi.sinceLastMonth') }}</span>
                        </div>
                    </div>

                    <!-- Sparkline: single-series net-worth trajectory, colored by trend. Decorative
                         reinforcement of the pill above (which carries the arrow + label), so identity
                         is never color-alone. Static (no draw animation) for reduced-motion safety. -->
                    @if (spark(); as sp) {
                        <svg class="w-full md:w-60 h-16 shrink-0 self-end" [attr.viewBox]="'0 0 ' + sp.W + ' ' + sp.H"
                             preserveAspectRatio="none" aria-hidden="true"
                             [ngClass]="trendPct() < 0 ? 'text-negative' : trendPct() > 0 ? 'text-positive' : 'text-surface-400'">
                            <polygon [attr.points]="sp.area" fill="currentColor" class="opacity-[0.12]" />
                            <polyline [attr.points]="sp.line" fill="none" stroke="currentColor" stroke-width="2.25"
                                      stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
                        </svg>
                    }
                </div>

                <!-- This-month cash-flow + savings-rate strip -->
                <div class="mt-5 pt-4 border-t border-surface-100 dark:border-surface-800 flex flex-wrap items-center gap-x-6 gap-y-3">
                    <span class="text-xs font-semibold uppercase tracking-wide text-surface-400 dark:text-surface-500 w-full sm:w-auto">{{ t('home.thisMonth') }}</span>
                    <div class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-positive shrink-0"></span>
                        <span class="text-surface-500 dark:text-surface-400 text-sm">{{ t('insights.income') }}</span>
                        <span class="font-semibold text-surface-900 dark:text-surface-0 text-sm">{{ cs.formatNumber(monthlyIncome()) }}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-negative/70 shrink-0"></span>
                        <span class="text-surface-500 dark:text-surface-400 text-sm">{{ t('insights.expenses') }}</span>
                        <span class="font-semibold text-surface-900 dark:text-surface-0 text-sm">{{ cs.formatNumber(monthlyExpenses()) }}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="text-surface-500 dark:text-surface-400 text-sm">{{ t('insights.net') }}</span>
                        <span class="font-semibold text-sm" [ngClass]="monthlyNet() >= 0 ? 'text-positive' : 'text-negative'">
                            {{ monthlyNet() >= 0 ? '+' : '−' }}{{ cs.formatNumber(abs(monthlyNet())) }}
                        </span>
                    </div>
                    @if (hasFlux()) {
                        <span class="inline-flex items-center px-2 py-0.5 rounded-lg text-sm font-semibold ml-auto"
                              [ngClass]="savingsRatePct() >= 0 ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'">
                            {{ savingsRatePct() | number:'1.0-0' }}% {{ t('insights.savingsRate') }}
                        </span>
                    }
                </div>

                <!-- The one nudge: single top alert, or a calm all-clear state -->
                <div class="mt-4">
                    @if (topAlert(); as a) {
                        <a [routerLink]="link('pages','insights')"
                           class="flex items-center gap-3 rounded-xl border p-3 no-underline transition-colors"
                           [ngClass]="a.severity === 'high'
                               ? 'border-negative/30 bg-negative/5 hover:bg-negative/10'
                               : 'border-ochre-200 dark:border-ochre-500/30 bg-ochre-50/60 dark:bg-ochre-500/10 hover:bg-ochre-50'">
                            <span class="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                                  [ngClass]="a.severity === 'high' ? 'bg-negative/15 text-negative' : 'bg-ochre-500/15 text-ochre-600 dark:text-ochre-400'">
                                <i class="pi pi-exclamation-triangle"></i>
                            </span>
                            <span class="min-w-0 flex-1">
                                <span class="block text-xs font-semibold uppercase tracking-wide text-surface-400 dark:text-surface-500">{{ t('alerts.title') }}</span>
                                <span class="block text-sm text-surface-800 dark:text-surface-200 truncate">{{ message(a) }}</span>
                            </span>
                            <i class="pi pi-chevron-right text-xs text-surface-400 shrink-0"></i>
                        </a>
                    } @else {
                        <div class="flex items-center gap-3 rounded-xl border border-positive/25 bg-positive/5 p-3">
                            <span class="flex items-center justify-center w-8 h-8 rounded-lg bg-positive/15 text-positive shrink-0">
                                <i class="pi pi-check"></i>
                            </span>
                            <span class="min-w-0">
                                <span class="block text-sm font-semibold text-surface-800 dark:text-surface-200">{{ t('home.allClear') }}</span>
                                <span class="block text-xs text-surface-500 dark:text-surface-400">{{ t('home.allClearDesc') }}</span>
                            </span>
                        </div>
                    }
                </div>

                <!-- FIRE %: secondary indicator, quiet, never the lead -->
                <a [routerLink]="link('pages','goals')" [queryParams]="{ tab: 'fire' }"
                   class="mt-4 flex items-center gap-3 no-underline group"
                   [attr.aria-label]="t('dashboard.kpi.fireObjectif')">
                    <span class="text-sm text-surface-500 dark:text-surface-400">{{ t('dashboard.kpi.fireObjectif') }}</span>
                    @if (fireConfigured()) {
                        <div class="flex-1 h-1.5 rounded-full bg-surface-200 dark:bg-surface-800 overflow-hidden max-w-[12rem]">
                            <div class="h-full rounded-full bg-ochre-500" [style.width.%]="fireBarPct()"></div>
                        </div>
                        <span class="text-sm font-semibold text-surface-700 dark:text-surface-200">{{ firePct() | number:'1.0-1' }}%</span>
                    } @else {
                        <span class="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 dark:text-ochre-400">
                            {{ t('dashboard.kpi.fireConfigure') }} <i class="pi pi-arrow-right text-xs"></i>
                        </span>
                    }
                </a>
            </section>
        }
    `,
})
export class HomeHero implements OnInit, OnDestroy {
    private i18n = inject(I18nService);
    private nav = inject(NavService);
    private dashboardService = inject(DashboardService);
    private stateService = inject(AssetsStateService);
    private api = inject(ApiService);
    cs = inject(CurrencyService);

    private subscription?: Subscription;

    loading = signal(true);
    loadError = signal(false);
    stats = signal<DashboardStats | null>(null);
    fireProgress = signal<FIREProgress | null>(null);
    series = signal<ChartDataPoint[]>([]);
    alerts = signal<FinancialAlert[]>([]);

    /** Respect the OS reduced-motion preference (disables the number count-up). */
    readonly reducedMotion =
        typeof window !== 'undefined' && typeof window.matchMedia === 'function'
            ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
            : false;

    /** Real net worth = totalAssets − totalDebts (backend net_worth counts assets only). */
    readonly realNetWorth = computed(() => {
        const s = this.stats();
        if (!s) return 0;
        return (s.totalAssets ?? 0) - (s.totalDebts ?? 0);
    });
    readonly absNetWorth = computed(() => Math.abs(this.realNetWorth()));
    readonly trendPct = computed(() => this.stats()?.netWorthChangePct ?? 0);

    readonly monthlyIncome = computed(() => this.stats()?.monthlyIncome ?? 0);
    readonly monthlyExpenses = computed(() => this.stats()?.monthlyExpenses ?? 0);
    readonly monthlyNet = computed(() => this.monthlyIncome() - this.monthlyExpenses());
    readonly hasFlux = computed(() => this.monthlyIncome() > 0 || this.monthlyExpenses() > 0);
    readonly savingsRatePct = computed(() => {
        const inc = this.monthlyIncome();
        if (inc <= 0) return 0;
        return Math.min(100, Math.round((inc - this.monthlyExpenses()) / inc * 100));
    });

    readonly fireConfigured = computed(() => (this.fireProgress()?.targetAmount ?? 0) > 0);
    readonly firePct = computed(() => this.fireProgress()?.progressPct ?? 0);
    readonly fireBarPct = computed(() => Math.min(100, Math.max(0, this.firePct())));

    /** Single top alert: highest severity first, then over-budget > near-limit > anomaly. */
    readonly topAlert = computed<FinancialAlert | null>(() => {
        const list = this.alerts();
        if (!list.length) return null;
        const kindRank: Record<string, number> = { over_budget: 0, near_limit: 1, anomaly: 2 };
        return [...list].sort((a, b) => {
            const sev = (a.severity === 'high' ? 0 : 1) - (b.severity === 'high' ? 0 : 1);
            if (sev !== 0) return sev;
            return (kindRank[a.kind] ?? 9) - (kindRank[b.kind] ?? 9);
        })[0];
    });

    /** SVG sparkline geometry from the (FX-correct) net-worth progression series. */
    readonly spark = computed(() => {
        const s = this.series();
        if (!s || s.length < 2) return null;
        const W = 192, H = 56, pad = 6;
        const vals = s.map(p => p.value);
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        const span = max - min || 1;
        const n = vals.length;
        const x = (i: number) => (i / (n - 1)) * W;
        const y = (v: number) => H - pad - ((v - min) / span) * (H - 2 * pad);
        const line = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
        const area = `0,${H} ${line} ${W},${H}`;
        return { line, area, W, H };
    });

    async ngOnInit() {
        await this.loadAll();
        this.subscription = merge(
            this.stateService.assetsUpdated$,
            this.stateService.debtsUpdated$,
            this.stateService.savingsUpdated$,
            this.stateService.transactionsUpdated$,
        ).subscribe(() => this.loadAll());
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

    private async loadAll() {
        if (!this.stats()) this.loading.set(true);
        try {
            const [stats, fire, series] = await Promise.all([
                this.dashboardService.getStats(),
                this.dashboardService.getFIREMetrics(),
                this.dashboardService.getWorthProgression(12),
            ]);
            this.stats.set(stats);
            this.fireProgress.set(fire);
            this.series.set(series);
            this.loadError.set(false);
        } catch {
            // Never fabricate a "0" net worth on failure, show an explicit error with retry.
            if (!this.stats()) this.loadError.set(true);
        } finally {
            this.loading.set(false);
        }
        // Alerts are non-critical: a failure here must not blank the whole hero.
        this.api.getFinancialAlerts().subscribe({
            next: (res) => this.alerts.set(res.alerts),
            error: () => this.alerts.set([]),
        });
    }

    retry() {
        this.loadError.set(false);
        this.loadAll();
    }

    message(a: FinancialAlert): string {
        const cat = this.i18n.categoryLabel(a.category);
        if (a.kind === 'over_budget') return this.t('alerts.overBudget', { cat, pct: Math.round(a.percent_used ?? 0) });
        if (a.kind === 'near_limit') return this.t('alerts.nearLimit', { cat, pct: Math.round(a.percent_used ?? 0) });
        return this.t('alerts.anomaly', { cat, ratio: (a.ratio ?? 0).toFixed(1) });
    }

    abs(n: number): number { return Math.abs(n); }

    t(key: string, p?: Record<string, string | number>): string { return this.i18n.t(key, p); }

    link(...segments: string[]): any[] { return this.nav.link(...segments); }
}
