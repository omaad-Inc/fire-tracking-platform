import { isPlatformBrowser, NgClass, DecimalPipe } from '@angular/common';
import { prefersReducedMotion } from '../../../core/theme/chart-theme';
import { Component, OnInit, OnDestroy, PLATFORM_ID, ChangeDetectorRef, computed, inject, effect, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { Subscription, firstValueFrom } from 'rxjs';
import { I18nService } from '../../../i18n/i18n.service';
import { DashboardService, ChartDataPoint } from '../../service/dashboard.service';
import { AssetsStateService } from '../../service/assets-state.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { ApiService } from '../../../core/services/api.service';
import { LayoutService } from '../../../layout/service/layout.service';

@Component({
    selector: 'app-patrimoine-progress',
    // Reference heights: 460px desktop (sets the row height, the Répartition
    // card stretches to match), 380px stacked, 340px mobile.
    host: { class: 'block' },
    template: `
        <div class="relative overflow-hidden rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-card
                    p-4 md:px-[26px] md:py-[22px] h-[340px] min-[861px]:h-[380px] min-[1150px]:h-[460px] flex flex-col">
            <div class="relative flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                    <div class="text-base font-semibold text-surface-900 dark:text-surface-0">{{ t('patrimoine.grossWorth') }}</div>
                    <i class="pi pi-chevron-down text-surface-500 text-sm cursor-pointer"></i>
                </div>
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
                <div class="relative flex-1 min-h-0 animate-pulse">
                    <div class="h-full bg-surface-200 dark:bg-surface-700 rounded"></div>
                </div>
            } @else if (dataPoints().length === 0) {
                <div class="relative flex-1 flex flex-col items-center justify-center min-h-0 text-center">
                    <div class="w-12 h-12 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-3">
                        <i class="pi pi-chart-line text-xl text-surface-400"></i>
                    </div>
                    <p class="text-surface-500 dark:text-surface-400 text-sm">{{ t('patrimoine.noDataYet') }}</p>
                </div>
            } @else {
                <div class="relative">
                    <div class="text-surface-500 dark:text-surface-400 text-xs mb-0.5">{{ currentDate() }}</div>
                    <div class="text-surface-900 dark:text-surface-0 font-bold text-[2rem] tracking-[-0.02em]"><app-amount [value]="currentValue()" /></div>
                    <!-- Variation callout: signed amount + % pill + range-aware label -->
                    @if (variationAbs() !== null) {
                        <div class="flex items-center flex-wrap gap-2 mt-0.5">
                            <app-amount [value]="absVariation()" [prefix]="variationAbs()! < 0 ? '−' : '+'"
                                        class="text-sm font-semibold"
                                        [ngClass]="variationAbs()! >= 0 ? 'text-positive' : 'text-negative'" />
                            @if (variationPct() !== null) {
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                                      [ngClass]="variationAbs()! >= 0 ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'">
                                    <i class="pi text-[9px]" [ngClass]="variationAbs()! >= 0 ? 'pi-caret-up' : 'pi-caret-down'" aria-hidden="true"></i>
                                    {{ absVariationPct() | number:'1.1-2' }}%
                                </span>
                            }
                            <span class="text-sm text-surface-500 dark:text-surface-400">{{ t(variationLabelKey()) }}</span>
                        </div>
                    }
                </div>
                <!-- Chart zone: flex-1 owns ALL remaining card height. The absolute
                     inset-0 layer is the classic Chart.js-in-flexbox sizing chain:
                     PrimeNG's inner wrapper (styleClass) and the host both h-full,
                     so the canvas tracks the zone and can also SHRINK on resize.
                     No fixed height anywhere on the canvas or its wrappers. -->
                <div class="relative flex-1 min-h-0 mt-3.5">
                    <div class="netw-plot absolute inset-0">
                        <p-chart type="line" [data]="data" [options]="options"
                                 class="block w-full h-full"
                                 role="img" [attr.aria-label]="chartAriaLabel()" />
                    </div>
                </div>
                <!-- x-labels own the bottom 24px of the zone (reference): exactly 3,
                     start / mid / end, horizontal, aligned to the 52px y-gutter. -->
                <div class="relative h-6 ml-[52px] text-[11px] text-surface-400 dark:text-surface-500">
                    <span class="absolute left-0 bottom-0.5">{{ xStart() }}</span>
                    <span class="absolute left-1/2 -translate-x-1/2 bottom-0.5">{{ xMid() }}</span>
                    <span class="absolute right-0 bottom-0.5">{{ xEnd() }}</span>
                </div>
            }
        </div>
    `,
    standalone: true,
    imports: [ChartModule, NgClass, DecimalPipe, AppAmountComponent],
    styles: [`
        /* PrimeNG p-chart has NO styleClass input and wraps the canvas in an
           unstyled position:relative div; with height:auto that wrapper and the
           responsive canvas size each other circularly and Chart.js falls back
           to a fixed ~250px plot. Complete the height chain from .netw-plot
           (absolute inset-0 in the flex-1 zone) down to that wrapper so the
           plot always fills the zone. */
        :host ::ng-deep .netw-plot p-chart {
            display: block;
            width: 100%;
            height: 100%;
        }
        :host ::ng-deep .netw-plot p-chart > div {
            width: 100%;
            height: 100%;
        }
    `]
})
export class PatrimoineProgress implements OnInit, OnDestroy {
    private platformId = inject(PLATFORM_ID);
    private cd = inject(ChangeDetectorRef);
    private dashboardService = inject(DashboardService);
    private stateService = inject(AssetsStateService);
    private i18n = inject(I18nService);
    private cs = inject(CurrencyService);
    private api = inject(ApiService);
    private layoutService = inject(LayoutService);
    
    private subscription?: Subscription;
    
    loading = signal(true);
    dataPoints = signal<ChartDataPoint[]>([]);
    currentValue = signal(0);
    currentDate = signal('');

    /** Variation over the SELECTED range (first → last point, EUR base); the
     *  label follows the range (1M → "Variation sur 1 mois", Max → période). */
    variationAbs = signal<number | null>(null);
    variationPct = signal<number | null>(null);
    absVariation(): number { return Math.abs(this.variationAbs() ?? 0); }
    absVariationPct(): number { return Math.abs(this.variationPct() ?? 0); }

    variationLabelKey(): string {
        switch (this.selectedMonths()) {
            case 1:  return 'patrimoine.variation1m';
            case 3:  return 'patrimoine.variation3m';
            case 6:  return 'patrimoine.variation6m';
            case 12: return 'patrimoine.variation1y';
            default: return 'patrimoine.variationMax';
        }
    }

    /** The reference shows exactly 3 x-labels: range start, midpoint, range end. */
    xStart = computed(() => this.dataPoints()[0]?.label ?? '');
    xMid = computed(() => {
        const p = this.dataPoints();
        return p.length > 2 ? p[Math.floor(p.length / 2)].label : '';
    });
    xEnd = computed(() => {
        const p = this.dataPoints();
        return p.length > 1 ? p[p.length - 1].label : '';
    });

    readonly ranges = [
        { label: '1M', months: 1 },
        { label: '3M', months: 3 },
        { label: '6M', months: 6 },
        { label: '1A', months: 12 },
        { label: 'Max', months: 0 },
    ];

    selectedMonths = signal(0);

    setRange(months: number) {
        this.selectedMonths.set(months);
        this.loadData();
    }
    
    data: any;
    options: any;

    /** Rebuild on data OR theme change. The theme signal is read
     *  unconditionally so a light↔dark toggle re-runs this even though
     *  initChart used to snapshot the theme from the DOM (the "invisible
     *  navy line on navy card until refresh" bug). */
    themeEffect = effect(() => {
        this.layoutService.isDarkTheme();
        if (this.dataPoints().length > 0) {
            this.initChart();
        }
    });

    ngOnInit() {
        this.loadData();
        
        // Subscribe to asset updates to refresh the chart (invalidate cache first)
        this.subscription = this.stateService.assetsUpdated$.subscribe(() => {
            this.dashboardService.invalidateCache();
            this.loadData();
        });
    }
    
    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

    /** Screen-reader summary of the line chart (canvas exposes nothing to AT). */
    chartAriaLabel(): string {
        return `${this.i18n.t('patrimoine.grossWorth')}: ${this.cs.format(this.currentValue(), 0)}`;
    }

    private async loadData() {
        this.loading.set(true);
        try {
            // Fetch chart progression and actual assets in parallel.
            const [progression, assets] = await Promise.all([
                this.dashboardService.getTotalAssetsProgression(this.selectedMonths()),
                firstValueFrom(this.api.getAssets(0, 200)),
            ]);
            this.dataPoints.set(progression);

            if (progression.length > 0) {
                // Always derive the displayed total from the real current_value of each asset,
                // never from the last interpolated chart point which can be slightly off.
                const realTotal = assets.reduce((sum, a) => sum + this.cs.toEurFromNative(a.current_value, a.currency), 0);
                this.currentValue.set(realTotal);
                this.currentDate.set(this.formatCurrentDate());

                // Variation over the selected range: real total now vs the range's first point.
                const first = progression[0].value;
                const delta = realTotal - first;
                this.variationAbs.set(delta);
                this.variationPct.set(first > 0 ? (delta / first) * 100 : null);

                // No direct initChart(): themeEffect fires on the dataPoints
                // write above — a single build path for data AND theme changes.
            }
        } catch (error) {
            console.error('Error loading total assets progression:', error);
            this.dataPoints.set([]);
        } finally {
            this.loading.set(false);
        }
    }
    
    private formatCurrentDate(): string {
        const locale = this.i18n.lang() === 'en' ? 'en-US' : 'fr-FR';
        return new Date().toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    }

    initChart() {
        if (isPlatformBrowser(this.platformId)) {
            const cs = this.cs;
            // Signal, not a DOM read: keeps the chart a pure function of (data, theme).
            const isDark = this.layoutService.isDarkTheme();

            // Brand-tokenized chart palette, single source of truth in
            // core/theme/chart-theme.ts. Inlined here to avoid breaking the
            // build dependency graph.
            const borderColor = isDark ? '#D8A369' : '#1A2740';        // ochre-400 hero line / brand-700
            const textColorSecondary = isDark ? '#8593AB' : '#6E6A60'; // muted steel / warm-500

            // Vertical area-fill: 13% of the line color fading to transparent
            // (reference spec) — the line, not the fill, carries the data.
            const fillTop = isDark ? 'rgba(216,163,105,0.13)' : 'rgba(26,39,64,0.13)';
            const fillBottom = isDark ? 'rgba(216,163,105,0)' : 'rgba(26,39,64,0)';

            const points = this.dataPoints();
            const values = points.map(p => p.value);
            const dataMin = values.length ? Math.min(...values) : 0;
            const dataMax = values.length ? Math.max(...values) : 1;
            const span = Math.max(dataMax - dataMin, 1);
            // Reference: 5 gridlines evenly stepped across the data with ~4%
            // headroom above the top line.
            const yMin = Math.floor(dataMin);
            const yMax = Math.ceil(dataMax + span * 0.04);
            const gridColor = isDark ? 'rgba(245, 247, 251, 0.10)' : 'rgba(20, 19, 15, 0.10)';

            this.data = {
                labels: points.map(p => p.label),
                datasets: [
                    {
                        label: this.i18n.t('patrimoine.grossWorth'),
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
                        borderColor: borderColor,
                        tension: 0,
                        borderJoinStyle: 'round',
                        borderCapStyle: 'round',
                        borderWidth: 1.5,
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
                plugins: {
                    legend: {
                        display: false
                    },
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
                            title: function(context: any) {
                                return context[0].label || '';
                            },
                            label: function(context: any) {
                                return cs.format(context.raw, 0);
                            }
                        }
                    }
                },
                scales: {
                    // The axis is hidden: exactly 3 x-labels are rendered as
                    // positioned HTML under the plot (reference technique).
                    x: { display: false },
                    y: {
                        min: yMin,
                        max: yMax,
                        ticks: {
                            count: 5,
                            color: textColorSecondary,
                            font: { size: 11 },
                            callback: cs.tickFormatter(),
                            // Right-align labels against the plot, inside the gutter.
                            crossAlign: 'far' as const,
                            padding: 8,
                        },
                        // 5 dashed horizontal gridlines only — no solid axes,
                        // no vertical lines (border.dash styles grid lines in v4).
                        grid: { color: gridColor, drawTicks: false },
                        border: { display: false, dash: [4, 4] },
                        // Fixed ~52px left gutter like the reference.
                        afterFit: (scale: any) => { scale.width = 52; },
                    },
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                elements: {
                    point: {
                        radius: 0,
                        hoverRadius: 6
                    }
                }
            };
            this.cd.markForCheck();
        }
    }

    t(key: string): string {
        return this.i18n.t(key);
    }
}
