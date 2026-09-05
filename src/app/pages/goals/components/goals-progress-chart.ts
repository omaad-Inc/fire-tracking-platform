import { isPlatformBrowser, NgClass } from '@angular/common';
import { prefersReducedMotion } from '../../../core/theme/chart-theme';
import { Component, OnInit, OnDestroy, PLATFORM_ID, ChangeDetectorRef, inject, effect, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { Subscription } from 'rxjs';
import { SavingsService, SavingsSeriesPoint } from '../../service/savings.service';
import { AssetsStateService } from '../../service/assets-state.service';
import { I18nService } from '../../../i18n/i18n.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { CHART_RANGES, DEFAULT_CHART_RANGE_MONTHS, granularityFor } from '../../../core/util/chart-range';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { LayoutService } from '../../../layout/service/layout.service';

@Component({
    selector: 'app-savings-progress',
    template: `
        <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 h-full">
            <div class="relative flex items-center justify-between mb-4">
                <div class="font-semibold text-xl text-surface-900 dark:text-surface-0">{{ i18n.t('savings.evolution') }}</div>
                @if (!loading()) {
                    <div class="flex items-center gap-1">
                        @for (r of ranges; track r.months) {
                            <button (click)="setRange(r.months)"
                                class="px-3 py-1 text-xs rounded-lg transition-colors"
                                [ngClass]="selectedMonths() === r.months
                                    ? 'bg-brand-700 text-white dark:bg-surface-700 dark:text-surface-0'
                                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'">
                                {{ r.label }}
                            </button>
                        }
                    </div>
                }
            </div>

            @if (loading()) {
                <div class="relative animate-pulse">
                    <div class="h-6 w-32 bg-surface-200 dark:bg-surface-700 rounded mb-1"></div>
                    <div class="h-9 w-48 bg-surface-200 dark:bg-surface-700 rounded mb-4"></div>
                    <div class="h-[250px] bg-surface-200 dark:bg-surface-700 rounded"></div>
                </div>
            } @else if (allPoints().length === 0) {
                <div class="relative flex flex-col items-center justify-center h-[300px] text-center">
                    <div class="w-12 h-12 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-3">
                        <i class="pi pi-chart-line text-xl text-surface-400"></i>
                    </div>
                    <p class="text-surface-500 dark:text-surface-400 text-sm">{{ i18n.t('savings.noDataYet') }}</p>
                </div>
            } @else {
                <div class="relative mb-4">
                    <div class="text-surface-500 dark:text-surface-400 text-sm mb-1">{{ currentDate() }}</div>
                    <div class="text-surface-900 dark:text-surface-0 font-bold text-3xl"><app-amount [value]="currentValue()" /></div>
                </div>
                <div class="relative">
                    <p-chart type="line" [data]="data" [options]="options" class="w-full min-h-[250px]" role="img" [attr.aria-label]="chartAriaLabel()" />
                </div>
            }
        </div>
    `,
    standalone: true,
    imports: [ChartModule, NgClass, AppAmountComponent]
})
export class SavingsProgress implements OnInit, OnDestroy {
    platformId = inject(PLATFORM_ID);
    i18n = inject(I18nService);
    private layout = inject(LayoutService);
    private cd = inject(ChangeDetectorRef);
    private savingsService = inject(SavingsService);
    private stateService = inject(AssetsStateService);
    private cs = inject(CurrencyService);

    loading = signal(true);
    allPoints = signal<SavingsSeriesPoint[]>([]);
    currentValue = signal(0);
    currentDate = signal('');
    selectedMonths = signal(DEFAULT_CHART_RANGE_MONTHS);

    data: any;
    options: any;

    private subscription?: Subscription;

    /** Shared chips + shared default (core/util/chart-range.ts); EN reads 1Y. */
    get ranges() {
        return CHART_RANGES.map(r => ({ label: this.i18n.t(`common.chartRange.${r.key}`), months: r.months }));
    }

    themeEffect = effect(() => {
        this.layout.isDarkTheme();               // tracked: theme flips rebuild too
        if (this.allPoints().length > 0) {
            this.buildChart();
        }
    });

    ngOnInit() {
        this.loadData();
        this.subscription = this.stateService.savingsUpdated$.subscribe(() => {
            this.loadData();
        });
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

    /** Screen-reader summary of the line chart (canvas exposes nothing to AT). */
    chartAriaLabel(): string {
        return `${this.i18n.t('savings.evolution')}: ${this.cs.format(this.currentValue(), 0)}`;
    }

    setRange(months: number) {
        this.selectedMonths.set(months);
        // The 1M chip is a differently sampled series (one point per day), not
        // a slice of the monthly one, so a range change may need a load.
        void this.loadData();
    }

    private async loadData() {
        // Skeleton only when there is nothing drawn yet: a revisit with the
        // series still in memory must not blank the chart for the round trip.
        if (this.allPoints().length === 0) this.loading.set(true);
        try {
            const series = await this.savingsService.getProgressSeries(granularityFor(this.selectedMonths()));
            this.allPoints.set(series);
            if (series.length > 0) {
                const latest = series[series.length - 1];
                this.currentValue.set(latest.value);
                this.currentDate.set(this.formatDate());
                this.buildChart();
            }
        } catch (error) {
            console.error('Error loading savings progress:', error);
            this.allPoints.set([]);
        } finally {
            this.loading.set(false);
        }
    }

    private getVisiblePoints(): SavingsSeriesPoint[] {
        const all = this.allPoints();
        const months = this.selectedMonths();
        // Day-granularity series are already windowed by the service.
        if (months === 0 || granularityFor(months) === 'day' || all.length <= months) return all;
        return all.slice(all.length - months);
    }

    private formatDate(): string {
        const d = new Date();
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        return `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`;
    }

    buildChart() {
        if (!isPlatformBrowser(this.platformId)) return;

        const documentStyle = getComputedStyle(document.documentElement);
        const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary') || '#94a3b8';
        const cs = this.cs;

        // Brand-700 (light) / ochre-400 (dark), matches the chart-theme primary series.
        const isDark = this.layout.isDarkTheme();
        const borderColor = isDark ? '#D8A369' : '#1A2740';

        // Soft vertical area-fill gradient under the line (data-viz, Finary-style).
        const fillTop = isDark ? 'rgba(216,163,105,0.20)' : 'rgba(26,39,64,0.15)';
        const fillBottom = isDark ? 'rgba(216,163,105,0)' : 'rgba(26,39,64,0)';

        const points = this.getVisiblePoints();

        this.data = {
            labels: points.map(p => p.label),
            datasets: [
                {
                    label: this.i18n.t('savings.evolution'),
                    data: points.map(p => p.value),
                    fill: true,
                    backgroundColor: (ctx: any) => {
                        const { ctx: c, chartArea } = ctx.chart;
                        if (!chartArea) return 'transparent';
                        const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        g.addColorStop(0, fillTop);
                        g.addColorStop(1, fillBottom);
                        return g;
                    },
                    borderColor,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointBackgroundColor: borderColor,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: borderColor,
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2
                }
            ]
        };

        this.options = {
            animation: prefersReducedMotion() ? false : { duration: 600, easing: 'easeOutQuart' },
            maintainAspectRatio: false,
            aspectRatio: 0.8,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(20, 19, 15, 0.95)',
                    titleColor: '#FAF8F4',
                    bodyColor: '#DEDAD0',
                    borderColor: 'rgba(199, 123, 60, 0.30)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        title: function(context: any) { return context[0].label || ''; },
                        label: function(context: any) { return cs.format(context.raw); }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: textColorSecondary,
                        font: { size: 10 },
                        maxRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: 12
                    },
                    grid: { display: false, drawBorder: false }
                },
                y: {
                    min: 0,
                    ticks: {
                        color: textColorSecondary,
                        font: { size: 11 },
                        callback: cs.tickFormatter()
                    },
                    grid: {
                        display: false,
                        drawBorder: false
                    }
                }
            },
            interaction: { intersect: false, mode: 'index' },
            elements: { point: { radius: 0, hoverRadius: 6 } }
        };

        this.cd.markForCheck();
    }
}
