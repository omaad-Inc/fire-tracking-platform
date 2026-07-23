import { isPlatformBrowser, CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ChartModule } from 'primeng/chart';

import { I18nService } from '../../i18n/i18n.service';
import { ApiService, InsightsResponse } from '../../core/services/api.service';
import { CurrencyService } from '../../core/services/currency.service';
import { AppAmountComponent } from '../../core/components/app-amount.component';
import { LoadErrorComponent } from '../../core/components/load-error.component';
import { PageHeaderComponent, UiCardComponent, EmptyStateComponent, ChipComponent } from '../../core/ui';
import { WealthScorePage } from '../wealth-score/wealth-score';

@Component({
    selector: 'app-insights',
    standalone: true,
    imports: [
        CommonModule, ChartModule, AppAmountComponent, LoadErrorComponent,
        PageHeaderComponent, UiCardComponent, EmptyStateComponent, ChipComponent,
        WealthScorePage,
    ],
    template: `
        <app-page-header icon="pi-chart-bar" [title]="t('insights.title')" [subtitle]="t('insights.subtitle')" />

        <!-- Analyses hub tabs: trends/breakdown vs the wealth score. ?tab=score deep-links. -->
        <div class="mb-5">
            <div class="inline-flex rounded-xl bg-surface-100 dark:bg-surface-800 p-1" role="tablist">
                <button role="tab" [attr.aria-selected]="tab() === 'analyses'"
                        (click)="setTab('analyses')" [class]="tabClass('analyses')">
                    {{ t('menu.insights') }}
                </button>
                <button role="tab" [attr.aria-selected]="tab() === 'score'"
                        (click)="setTab('score')" [class]="tabClass('score')" data-testid="tab-score">
                    {{ t('menu.wealthScore') }}
                </button>
            </div>
        </div>

        @if (tab() === 'analyses') {
        @if (error()) {
            <app-load-error (retry)="load()" />
        } @else if (loading()) {
            <div class="space-y-4">
                <div class="h-24 rounded-2xl bg-surface-200 dark:bg-surface-700 animate-pulse"></div>
                <div class="h-64 rounded-2xl bg-surface-200 dark:bg-surface-700 animate-pulse"></div>
            </div>
        } @else if (!data() || (data()!.income === 0 && data()!.expenses === 0)) {
            <app-empty-state icon="pi-chart-bar" [title]="t('insights.empty.title')" [message]="t('insights.empty.desc')" />
        } @else {
            <!-- Period KPIs -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <app-ui-card padding="sm">
                    <div class="text-xs text-surface-400 uppercase tracking-wide mb-1">{{ t('insights.income') }}</div>
                    <div class="text-lg font-bold text-positive">+<app-amount [value]="data()!.income" /></div>
                </app-ui-card>
                <app-ui-card padding="sm">
                    <div class="text-xs text-surface-400 uppercase tracking-wide mb-1">{{ t('insights.expenses') }}</div>
                    <div class="text-lg font-bold text-negative">−<app-amount [value]="data()!.expenses" /></div>
                </app-ui-card>
                <app-ui-card padding="sm">
                    <div class="text-xs text-surface-400 uppercase tracking-wide mb-1">{{ t('insights.net') }}</div>
                    <div class="text-lg font-bold" [class]="data()!.net >= 0 ? 'text-surface-900 dark:text-surface-0' : 'text-negative'">
                        <app-amount [value]="data()!.net" />
                    </div>
                </app-ui-card>
                <app-ui-card padding="sm">
                    <div class="text-xs text-surface-400 uppercase tracking-wide mb-1">{{ t('insights.savingsRate') }}</div>
                    <div class="text-lg font-bold text-surface-900 dark:text-surface-0">{{ data()!.savings_rate | number:'1.0-0' }}%</div>
                </app-ui-card>
            </div>

            <!-- Trend -->
            <app-ui-card class="mb-5">
                <div class="font-semibold text-surface-900 dark:text-surface-0 mb-3">{{ t('insights.trendTitle') }}</div>
                <p-chart type="line" [data]="chartData" [options]="chartOptions" class="w-full min-h-[220px] md:min-h-[280px]"
                         role="img" [attr.aria-label]="t('insights.trendTitle')" />
            </app-ui-card>

            <!-- Category breakdown, month over month -->
            <app-ui-card>
                <div class="font-semibold text-surface-900 dark:text-surface-0 mb-3">{{ t('insights.breakdownTitle') }}</div>
                @if (shownCategories().length === 0) {
                    <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('insights.noExpenses') }}</p>
                } @else {
                    <div class="space-y-3">
                        @for (c of shownCategories(); track c.category) {
                            <div>
                                <div class="flex items-center justify-between gap-2 mb-1">
                                    <span class="text-sm text-surface-800 dark:text-surface-200 truncate">{{ t('categories.' + c.category) }}</span>
                                    <div class="flex items-center gap-2 shrink-0">
                                        <span class="text-sm font-semibold text-surface-900 dark:text-surface-0"><app-amount [value]="c.amount" /></span>
                                        @if (c.delta_pct === null) {
                                            <app-chip [label]="t('insights.new')" tone="neutral" />
                                        } @else if (c.delta_pct > 0) {
                                            <app-chip [label]="'+' + fmtPct(c.delta_pct)" tone="negative" />
                                        } @else if (c.delta_pct < 0) {
                                            <app-chip [label]="fmtPct(c.delta_pct)" tone="positive" />
                                        }
                                    </div>
                                </div>
                                <div class="h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                                    <div class="h-full rounded-full bg-brand-600 dark:bg-ochre-400" [style.width.%]="barWidth(c.amount)"></div>
                                </div>
                            </div>
                        }
                    </div>
                }
            </app-ui-card>
        }
        } @else {
            <!-- Score tab: the wealth-score page, embedded (its own header hidden). -->
            @defer (on immediate) {
                <app-wealth-score-page [embedded]="true" />
            } @placeholder {
                <div class="h-96 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse"></div>
            }
        }
    `,
})
export class InsightsPage implements OnInit {
    private platformId = inject(PLATFORM_ID);
    private cd = inject(ChangeDetectorRef);
    private api = inject(ApiService);
    private i18n = inject(I18nService);
    private cs = inject(CurrencyService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    t(k: string, p?: Record<string, string | number>): string { return this.i18n.t(k, p); }

    /** Analyses hub tab, derived from the URL (?tab=) so it reacts to any navigation
     *  while mounted (deep-links, redirects, browser back/forward). */
    tab = toSignal(
        this.route.queryParamMap.pipe(map((qp): 'analyses' | 'score' => qp.get('tab') === 'score' ? 'score' : 'analyses')),
        { initialValue: (this.route.snapshot.queryParamMap.get('tab') === 'score' ? 'score' : 'analyses') as 'analyses' | 'score' },
    );

    setTab(t: 'analyses' | 'score') {
        // Navigate only; `tab` is derived from the URL.
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { tab: t === 'analyses' ? null : t },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }

    tabClass(t: 'analyses' | 'score'): string {
        const base = 'px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 cursor-pointer';
        return this.tab() === t
            ? `${base} bg-surface-0 dark:bg-surface-950 text-brand-700 dark:text-ochre-400 shadow-card`
            : `${base} text-surface-500 dark:text-surface-400`;
    }

    loading = signal(true);
    error = signal(false);
    data = signal<InsightsResponse | null>(null);

    chartData: any;
    chartOptions: any;

    ngOnInit() { this.load(); }

    load() {
        this.loading.set(true);
        this.error.set(false);
        this.api.getInsights(undefined, 6).subscribe({
            next: (res) => {
                this.data.set(res);
                this.loading.set(false);
                this.initChart();
            },
            error: () => { this.error.set(true); this.loading.set(false); },
        });
    }

    fmtPct(pct: number): string { return `${Math.round(pct)}%`; }

    /** Only categories with spend this period — drop the 0-this-month/-100% noise. */
    shownCategories() {
        return this.data()?.expenses_by_category.filter(c => c.amount > 0) ?? [];
    }

    /** Bar width relative to the largest category this period. */
    barWidth(amount: number): number {
        const max = Math.max(...(this.data()?.expenses_by_category.map(c => c.amount) ?? [1]), 1);
        return Math.max(2, (amount / max) * 100);
    }

    private initChart() {
        if (!isPlatformBrowser(this.platformId)) return;
        const d = this.data();
        if (!d) return;
        const cs = this.cs;
        const isDark = document.documentElement.classList.contains('app-dark');
        const grid = isDark ? 'rgba(156,152,140,0.15)' : 'rgba(110,106,96,0.12)';
        const axis = isDark ? '#9C988C' : '#6E6A60';
        // Semantic colors: income = positive, expenses = negative, net = brand.
        const positive = '#2F8F6E', negative = '#B0463E', brand = isDark ? '#8A98AE' : '#1A2740';

        const mk = (label: string, key: 'income' | 'expenses' | 'net', color: string) => ({
            label, data: d.trend.map(p => p[key]), borderColor: color, backgroundColor: color,
            tension: 0.35, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, fill: false,
        });

        this.chartData = {
            labels: d.trend.map(p => p.period),
            datasets: [
                mk(this.t('insights.income'), 'income', positive),
                mk(this.t('insights.expenses'), 'expenses', negative),
                mk(this.t('insights.net'), 'net', brand),
            ],
        };

        this.chartOptions = {
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'bottom', labels: { color: axis, boxWidth: 12, usePointStyle: true, font: { size: 11 } } },
                tooltip: {
                    backgroundColor: 'rgba(20,19,15,0.95)', titleColor: '#FAF8F4', bodyColor: '#DEDAD0',
                    borderColor: 'rgba(199,123,60,0.30)', borderWidth: 1, cornerRadius: 8, padding: 12,
                    callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${cs.format(ctx.raw, 0)}` },
                },
            },
            scales: {
                x: { ticks: { color: axis, font: { size: 10 } }, grid: { display: false, drawBorder: false } },
                y: { ticks: { color: axis, font: { size: 11 }, callback: cs.tickFormatter() }, grid: { color: grid, drawBorder: false } },
            },
            interaction: { intersect: false, mode: 'index' },
        };
        this.cd.markForCheck();
    }
}
