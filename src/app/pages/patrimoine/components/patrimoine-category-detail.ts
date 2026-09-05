import { Component, OnInit, effect, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { PatrimoineService, PatrimoineAssetItemDto } from '../../service/patrimoine.service';
import { DashboardService, ChartDataPoint } from '../../service/dashboard.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { CHART_RANGES, DEFAULT_CHART_RANGE_MONTHS } from '../../../core/util/chart-range';
import { NavService } from '../../../core/services/nav.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { I18nService } from '../../../i18n/i18n.service';
import { LoadErrorComponent } from '../../../core/components/load-error.component';
import { chartTheme } from '../../../core/theme/chart-theme';
import { LayoutService } from '../../../layout/service/layout.service';
import { AllocationDonutComponent } from './allocation-donut';
import { AllocationTicksComponent } from './allocation-ticks';
import { TooltipModule } from 'primeng/tooltip';

interface GroupConfig {
    id: string;
    icon: string;
    bg: string;
    color: string;
    categories: string[];
}

// Brand-tokenized: every group gets the same navy gradient. Icon glyph differentiates.
const BRAND_BG = '#1A2740';
const BRAND_COLOR = '#1A2740';

// Group labels are resolved via i18n at render time (patrimoine.groups.<id>).
const GROUPS: GroupConfig[] = [
    { id: 'real_estate',    icon: 'pi pi-building',   bg: BRAND_BG, color: BRAND_COLOR, categories: ['real_estate'] },
    { id: 'stocks_bonds',   icon: 'pi pi-chart-line', bg: BRAND_BG, color: BRAND_COLOR, categories: ['stocks_brvm', 'stocks_intl', 'fcp', 'bonds'] },
    { id: 'savings',        icon: 'pi pi-dollar',     bg: BRAND_BG, color: BRAND_COLOR, categories: ['savings_account', 'cash', 'life_insurance', 'retirement'] },
    { id: 'crypto',         icon: 'pi pi-bitcoin',    bg: BRAND_BG, color: BRAND_COLOR, categories: ['crypto'] },
    { id: 'tontine',        icon: 'pi pi-users',      bg: BRAND_BG, color: BRAND_COLOR, categories: ['tontine'] },
    { id: 'mobile_money',   icon: 'pi pi-mobile',     bg: BRAND_BG, color: BRAND_COLOR, categories: ['mobile_money'] },
    { id: 'other',          icon: 'pi pi-box',        bg: BRAND_BG, color: BRAND_COLOR, categories: ['business', 'vehicle', 'collectibles', 'commodities', 'other'] },
];

const CATEGORY_ICONS: Record<string, string> = {
    real_estate: 'pi pi-building', stocks: 'pi pi-chart-line', bonds: 'pi pi-chart-bar',
    crypto: 'pi pi-bitcoin', cash: 'pi pi-wallet', retirement: 'pi pi-shield',
    life_insurance: 'pi pi-heart', savings_account: 'pi pi-dollar', business: 'pi pi-briefcase',
    vehicle: 'pi pi-car', tontine: 'pi pi-users', mobile_money: 'pi pi-mobile',
    collectibles: 'pi pi-star', commodities: 'pi pi-box', other: 'pi pi-box',
};

// Every category gets the same navy gradient, icon glyph differentiates.
const CATEGORY_BGS: Record<string, string> = {
    real_estate:     BRAND_BG,
    stocks:          BRAND_BG,
    bonds:           BRAND_BG,
    crypto:          BRAND_BG,
    cash:            BRAND_BG,
    retirement:      BRAND_BG,
    life_insurance:  BRAND_BG,
    savings_account: BRAND_BG,
    business:        BRAND_BG,
    vehicle:         BRAND_BG,
    tontine:         BRAND_BG,
    mobile_money:    BRAND_BG,
    collectibles:    BRAND_BG,
    other:           BRAND_BG,
};


// Per-asset donut colors cycle the OMAAD brand categorical (chartTheme, the
// ochre-anchored jewel set validated in both modes) — assets have no fixed
// taxonomy here so the ramp cycles by rank; slice gaps show the card surface.

@Component({
    selector: 'app-patrimoine-category-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, ChartModule, AppAmountComponent, LoadErrorComponent,
              AllocationDonutComponent, AllocationTicksComponent, TooltipModule],
    styles: [`
        /* Same fix as patrimoineprogress: PrimeNG p-chart has no styleClass and
           wraps the canvas in an unstyled div; complete the height chain so the
           plot fills the flex zone instead of collapsing to ~250px. */
        :host ::ng-deep .netw-plot p-chart {
            display: block;
            width: 100%;
            height: 100%;
        }
        :host ::ng-deep .netw-plot p-chart > div {
            width: 100%;
            height: 100%;
        }
    `],
    template: `
        @if (loadError) {
            <app-load-error (retry)="reload()" />
        }

        <!-- ── Global loading skeleton ── -->
        @else if (loading) {
            <div class="animate-pulse space-y-6">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-full bg-surface-200 dark:bg-surface-700"></div>
                    <div class="w-14 h-14 rounded-2xl bg-surface-200 dark:bg-surface-700"></div>
                    <div class="space-y-2">
                        <div class="h-5 bg-surface-200 dark:bg-surface-700 rounded w-32"></div>
                        <div class="h-8 bg-surface-200 dark:bg-surface-700 rounded w-48"></div>
                    </div>
                </div>
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div class="h-72 bg-surface-200 dark:bg-surface-700 rounded-2xl"></div>
                    <div class="h-72 bg-surface-200 dark:bg-surface-700 rounded-2xl"></div>
                </div>
                <div class="space-y-3">
                    @for (i of [1,2,3]; track i) {
                        <div class="h-20 bg-surface-200 dark:bg-surface-700 rounded-2xl"></div>
                    }
                </div>
            </div>

        } @else {

            <!-- ── Header ── -->
            <div class="flex items-center gap-4 mb-8">
                <button (click)="goBack()"
                        class="w-10 h-10 flex items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-all cursor-pointer shrink-0">
                    <i class="pi pi-arrow-left text-surface-600 dark:text-surface-300"></i>
                </button>
                <div class="flex items-center gap-4 min-w-0">
                    <div class="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm shrink-0"
                         [style.background]="currentGroup?.bg">
                        <i [class]="currentGroup?.icon" class="text-white text-2xl"></i>
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-3 flex-wrap">
                            <span class="text-sm font-medium text-surface-500 dark:text-surface-400">{{ currentGroup ? i18n.t('patrimoine.groups.' + currentGroup.id) : '' }}</span>
                            @if (currentGroup?.id === 'stocks_bonds') {
                                <!-- The BRVM sleeve (stocks + FCP) has its own Pro analysis page. -->
                                <a [routerLink]="analyseBrvmLink()" data-testid="category-analyse-brvm-link"
                                   class="inline-flex items-center gap-1 text-xs font-semibold text-ochre-700 dark:text-ochre-300 hover:underline no-underline">
                                    <i class="pi pi-chart-line text-[10px]" aria-hidden="true"></i>{{ i18n.t('patrimoine.brvmAnalysis.seeAnalysis') }}
                                </a>
                            }
                        </div>
                        <div class="flex items-center gap-3 mt-0.5 flex-wrap">
                            <app-amount [value]="totalValue" class="text-3xl font-bold text-surface-900 dark:text-surface-0" />
                            @if (totalDeltaAbs !== 0) {
                                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-semibold"
                                      [ngClass]="totalDeltaAbs >= 0 ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'">
                                    <i class="pi text-xs" [ngClass]="totalDeltaAbs >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'"></i>
                                    <app-amount [value]="totalDeltaAbs" [prefix]="totalDeltaAbs >= 0 ? '+' : '-'" />
                                    &nbsp;{{ totalDeltaPct | number:'1.2-2' }}%
                                </span>
                            }
                        </div>
                    </div>
                </div>
            </div>

            <!-- ── Charts row: strict 50/50, equal heights (reference layout) ── -->
            <div class="grid grid-cols-1 min-[1150px]:grid-cols-2 gap-5 items-stretch mb-8">

                <!-- Progression chart -->
                <div class="relative overflow-hidden rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-card
                            p-4 md:px-[26px] md:py-[22px] h-[340px] min-[861px]:h-[380px] min-[1150px]:h-[460px] flex flex-col">
                    <div class="relative flex items-center justify-between mb-2">
                        <span class="text-base font-semibold text-surface-900 dark:text-surface-0">{{ i18n.t('patrimoine.progression') }}</span>
                        <div class="flex items-center gap-1">
                            @for (r of ranges; track r.months) {
                                <button (click)="changeRange(r.months)"
                                        class="px-2.5 py-1 text-xs rounded-lg transition-colors"
                                        [ngClass]="selectedMonths === r.months
                                            ? 'bg-brand-700 text-white dark:bg-surface-700 dark:text-surface-0'
                                            : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'">
                                    {{ r.label }}
                                </button>
                            }
                        </div>
                    </div>

                    @if (loadingChart) {
                        <div class="relative flex-1 min-h-0 animate-pulse">
                            <div class="h-full bg-surface-200 dark:bg-surface-700 rounded"></div>
                        </div>
                    } @else if (!lineData) {
                        <div class="relative flex-1 min-h-0 flex flex-col items-center justify-center text-center">
                            <i class="pi pi-chart-line text-3xl text-surface-400 mb-3"></i>
                            <p class="text-surface-500 text-sm">{{ i18n.t('patrimoine.noDataYet') }}</p>
                        </div>
                    } @else {
                        <div class="relative">
                            <div class="text-surface-500 dark:text-surface-400 text-xs mb-0.5">{{ todayLabel }}</div>
                            <div class="text-surface-900 dark:text-surface-0 font-bold text-xl"><app-amount [value]="totalValue" /></div>
                            @if (variationAbs !== null) {
                                <div class="flex items-center flex-wrap gap-2 mt-0.5">
                                    <app-amount [value]="absVariation" [prefix]="variationAbs < 0 ? '−' : '+'"
                                                class="text-sm font-semibold"
                                                [ngClass]="variationAbs >= 0 ? 'text-positive' : 'text-negative'" />
                                    @if (variationPct !== null) {
                                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                                              [ngClass]="variationAbs >= 0 ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'">
                                            <i class="pi text-[9px]" [ngClass]="variationAbs >= 0 ? 'pi-caret-up' : 'pi-caret-down'" aria-hidden="true"></i>
                                            {{ absVariationPct | number:'1.1-2' }}%
                                        </span>
                                    }
                                    <span class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t(variationLabelKey()) }}</span>
                                </div>
                            }
                        </div>
                        <div class="relative flex-1 min-h-0 mt-3.5">
                            <div class="netw-plot absolute inset-0">
                                <p-chart type="line" [data]="lineData" [options]="lineOptions" class="block w-full h-full" />
                            </div>
                        </div>
                        <!-- 3 x-labels (start / mid / end), aligned to the 52px y-gutter -->
                        <div class="relative h-6 ml-[52px] text-[11px] text-surface-400 dark:text-surface-500">
                            <span class="absolute left-0 bottom-0.5">{{ xStart }}</span>
                            <span class="absolute left-1/2 -translate-x-1/2 bottom-0.5">{{ xMid }}</span>
                            <span class="absolute right-0 bottom-0.5">{{ xEnd }}</span>
                        </div>
                    }
                </div>

                <!-- Répartition (per-asset), same donut + tick-rows pattern as the patrimoine page -->
                <div class="relative overflow-hidden rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-card
                            p-4 md:px-[26px] md:py-[22px] h-full flex flex-col">
                    <div class="relative flex items-center justify-between mb-2">
                        <span class="text-base font-semibold text-surface-900 dark:text-surface-0">{{ i18n.t('patrimoine.allocation') }}</span>
                        <span class="text-surface-500 dark:text-surface-400 text-sm">
                            {{ items.length }} {{ items.length > 1 ? i18n.t('patrimoine.units.assetOther') : i18n.t('patrimoine.units.assetOne') }}
                        </span>
                    </div>

                    @if (items.length === 0) {
                        <div class="flex-1 flex flex-col items-center justify-center text-center">
                            <i class="pi pi-chart-pie text-3xl text-surface-400 mb-3"></i>
                            <p class="text-surface-500 text-sm">{{ i18n.t('patrimoine.noAssetsShort') }}</p>
                        </div>
                    } @else {
                        <div class="flex-1 min-h-0 grid grid-cols-1 min-[861px]:grid-cols-[44fr_56fr] min-[1150px]:grid-cols-[200px_minmax(0,1fr)]
                                    gap-2 min-[861px]:gap-[22px] pt-[18px] items-center">
                            <app-allocation-donut [segments]="allocRows" [ariaLabel]="i18n.t('patrimoine.allocation')"
                                    class="w-[220px] min-[861px]:w-[min(280px,90%)] min-[1150px]:w-[200px] mx-auto">
                                <span class="text-[13px] font-semibold text-surface-900 dark:text-surface-0 tabular-nums"><app-amount [value]="totalValue" /></span>
                                <span class="text-[11px] text-surface-500 dark:text-surface-400 mt-0.5">
                                    {{ items.length }} {{ items.length > 1 ? i18n.t('patrimoine.units.assetOther') : i18n.t('patrimoine.units.assetOne') }}
                                </span>
                            </app-allocation-donut>
                            <!-- Rows: [name | ticks | %], bounded flex; scrolls if a category
                                 holds more assets than the card height fits. -->
                            <ul class="min-w-0 self-stretch min-h-0 flex flex-col justify-center overflow-y-auto">
                                @for (row of allocRows; track row.label) {
                                    <li class="grid grid-cols-[minmax(0,1fr)_52px] min-[861px]:grid-cols-[minmax(100px,32%)_minmax(0,1fr)_52px]
                                               items-center gap-x-3.5 flex-1 min-h-[42px] max-h-[62px] shrink-0"
                                        [pTooltip]="row.tooltip" tooltipPosition="left">
                                        <span class="text-sm truncate text-surface-900 dark:text-surface-100">{{ row.label }}</span>
                                        <app-allocation-ticks class="max-[860px]:!hidden" [pct]="row.share" [color]="row.color" />
                                        <span class="text-[13px] text-surface-500 dark:text-surface-400 text-right tabular-nums">{{ row.pct }} %</span>
                                    </li>
                                }
                            </ul>
                        </div>
                    }
                </div>
            </div>

            <!-- ── Asset list ── -->
            <div>
                <div class="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-4">
                    Actifs ({{ items.length }})
                </div>

                @if (items.length === 0) {
                    <div class="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-surface-300 dark:border-surface-700">
                        <i class="pi pi-box text-3xl text-surface-400 mb-3"></i>
                        <p class="text-surface-500 text-sm">{{ i18n.t('patrimoine.noAssetsInCategory') }}</p>
                    </div>
                } @else {
                    <div class="space-y-3">
                        @for (item of items; track item.id) {
                            <a [routerLink]="assetLink(item.id)"
                               class="flex items-center justify-between p-5 rounded-2xl bg-surface-0 dark:bg-surface-900 hover:bg-surface-50 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer group no-underline border border-surface-200 dark:border-surface-800 hover:border-brand-300/40 dark:hover:border-brand-700/50 hover:shadow-sm">
                                <div class="flex items-center gap-4 min-w-0">
                                    <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                                         [style.background]="getCategoryBg(item.category)">
                                        <i [class]="getCategoryIcon(item.category)" class="text-white"></i>
                                    </div>
                                    <div class="min-w-0">
                                        <div class="font-semibold text-surface-900 dark:text-surface-0 truncate">{{ item.name }}</div>
                                        <div class="text-surface-500 dark:text-surface-400 text-sm truncate">
                                            @if (item.institution) {<span>{{ item.institution }} · </span>}<span>{{ sharePct(item) }}% du total</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3 shrink-0 ml-4">
                                    <div class="text-right">
                                        <div class="font-bold text-surface-900 dark:text-surface-0"><app-amount [value]="item.value" /></div>
                                        @if (item.deltaPct != null) {
                                            <div class="flex items-center justify-end gap-1 mt-0.5">
                                                <i class="pi text-xs" [ngClass]="(item.deltaPct) >= 0 ? 'pi-arrow-up text-positive' : 'pi-arrow-down text-negative'"></i>
                                                <span class="text-sm font-medium" [ngClass]="item.deltaPct >= 0 ? 'text-positive' : 'text-negative'">
                                                    <app-amount [value]="item.deltaAbs ?? 0" [prefix]="(item.deltaAbs ?? 0) >= 0 ? '+' : '-'" />
                                                    &nbsp;{{ item.deltaPct | number:'1.2-2' }}%
                                                </span>
                                            </div>
                                        }
                                    </div>
                                    <i class="pi pi-chevron-right text-surface-400 text-sm group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors"></i>
                                </div>
                            </a>
                        }
                    </div>
                }
            </div>
        }
    `
})
export class PatrimoineCategoryDetailPage implements OnInit {
    private platformId = inject(PLATFORM_ID);
    private cd = inject(ChangeDetectorRef);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private nav = inject(NavService);
    private patrimoineService = inject(PatrimoineService);
    private dashboardService = inject(DashboardService);
    private cs = inject(CurrencyService);
    private layout = inject(LayoutService);
    i18n = inject(I18nService);

    /** Theme flips rebuild the theme-dependent visuals with the current data
     *  (this component uses plain properties, so charts don't recolor on their
     *  own — the "invisible chart until refresh" bug). */
    private themeEffect = effect(() => {
        this.layout.isDarkTheme();                 // tracked dependency
        if (this.loading) return;                  // first build happens in ngOnInit/loadLineChart
        if (this.items.length > 0) this.buildAllocRows();
        if (this.lastPoints.length > 0) this.buildLineChart(this.lastPoints);
        this.cd.markForCheck();
    });

    // ── State (plain properties, not signals, avoids effect timing issues) ──
    loading = true;
    loadError = false;
    loadingChart = false;

    currentGroup: GroupConfig | null = null;
    items: PatrimoineAssetItemDto[] = [];

    totalValue = 0;
    totalDeltaAbs = 0;
    totalDeltaPct = 0;

    /** Route of the whole-sleeve BRVM analysis (stocks + FCP). */
    analyseBrvmLink(): any[] {
        return this.nav.link('pages', 'patrimoine', 'analyse-brvm');
    }

    /** Shared chips + shared default (core/util/chart-range.ts); EN reads 1Y. */
    get ranges() {
        return CHART_RANGES.map(r => ({ label: this.i18n.t(`common.chartRange.${r.key}`), months: r.months }));
    }
    selectedMonths: number = DEFAULT_CHART_RANGE_MONTHS;

    get todayLabel(): string {
        const locale = this.i18n.lang() === 'en' ? 'en-US' : 'fr-FR';
        return new Date().toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    }

    lineData: any = null;
    lineOptions: any = null;

    /** Per-asset allocation rows (sorted desc): drives the SVG donut, the tick
     *  bars, and the tooltips — same shape as the patrimoine Répartition card. */
    allocRows: { label: string; amount: number; color: string; share: number; pct: string; tooltip: string }[] = [];

    /** Variation over the selected range (first → last point, EUR base). */
    variationAbs: number | null = null;
    variationPct: number | null = null;
    get absVariation(): number { return Math.abs(this.variationAbs ?? 0); }
    get absVariationPct(): number { return Math.abs(this.variationPct ?? 0); }

    variationLabelKey(): string {
        switch (this.selectedMonths) {
            case 3:  return 'patrimoine.variation3m';
            case 6:  return 'patrimoine.variation6m';
            case 12: return 'patrimoine.variation1y';
            default: return 'patrimoine.variationMax';
        }
    }

    /** 3 x-labels: range start / midpoint / range end (reference pattern). */
    xStart = '';
    xMid = '';
    xEnd = '';

    /** Last loaded series, kept so a theme flip can rebuild without refetching. */
    private lastPoints: ChartDataPoint[] = [];

    async ngOnInit() {
        const categoryId = this.route.snapshot.paramMap.get('categoryId') ?? '';
        this.currentGroup = GROUPS.find(g => g.id === categoryId) ?? null;

        // Load assets, surface failures as an error+retry card, never as an
        // empty category (fake-empty money pages read as data loss).
        let all: PatrimoineAssetItemDto[];
        try {
            all = await this.patrimoineService.getAssets();
            this.loadError = false;
        } catch (error) {
            console.error('Error loading assets:', error);
            this.loadError = true;
            this.loading = false;
            this.cd.markForCheck();
            return;
        }
        this.items = this.currentGroup
            ? all.filter(a => this.currentGroup!.categories.includes(a.category ?? ''))
            : all;

        // Compute totals
        this.totalValue    = this.items.reduce((s, i) => s + i.value, 0);
        this.totalDeltaAbs = this.items.reduce((s, i) => s + (i.deltaAbs ?? 0), 0);
        const purchaseTotal = this.items.reduce((s, i) => s + Math.max(0, i.value - (i.deltaAbs ?? 0)), 0);
        this.totalDeltaPct  = purchaseTotal > 0 ? (this.totalDeltaAbs / purchaseTotal) * 100 : 0;

        // Build allocation rows synchronously before revealing the page
        if (this.items.length > 0) {
            this.buildAllocRows();
        }

        // Reveal the page
        this.loading = false;
        this.cd.markForCheck();

        // Load line chart (can run after page is visible)
        await this.loadLineChart();
    }

    reload() {
        this.loadError = false;
        this.loading = true;
        this.cd.markForCheck();
        this.ngOnInit();
    }

    async changeRange(months: number) {
        this.selectedMonths = months;
        await this.loadLineChart();
    }

    private async loadLineChart() {
        if (!this.currentGroup) return;
        this.loadingChart = true;
        this.cd.markForCheck();
        try {
            const pts = await this.dashboardService.getCategoryProgression(
                this.currentGroup.categories,
                this.selectedMonths
            );
            this.lastPoints = pts;
            if (pts.length > 0 && isPlatformBrowser(this.platformId)) {
                this.buildLineChart(pts);
            } else {
                this.lineData = null;
            }
        } finally {
            this.loadingChart = false;
            this.cd.markForCheck();
        }
    }

    private buildLineChart(points: ChartDataPoint[]) {
        // Brand-tokenized chart line, same in light + dark, switching shade.
        // Signal, not a DOM read: themeEffect rebuilds on toggle.
        const isDark = this.layout.isDarkTheme();
        const color = isDark ? '#D8A369' : '#1A2740';        // ochre-400 hero / brand-700
        const textMuted = isDark ? '#8593AB' : '#6E6A60';   // muted steel / warm-500
        const cs = this.cs;

        // Vertical area-fill: 13% of the line color fading to transparent
        // (reference spec) — the line, not the fill, carries the data.
        const fillTop = isDark ? 'rgba(216,163,105,0.13)' : 'rgba(26,39,64,0.13)';
        const fillBottom = isDark ? 'rgba(216,163,105,0)' : 'rgba(26,39,64,0)';

        const values = points.map(p => p.value);
        const dataMin = values.length ? Math.min(...values) : 0;
        const dataMax = values.length ? Math.max(...values) : 1;
        const span = Math.max(dataMax - dataMin, 1);
        // 5 gridlines evenly stepped across the data with ~4% headroom above.
        const yMin = Math.floor(dataMin);
        const yMax = Math.ceil(dataMax + span * 0.04);
        const gridColor = isDark ? 'rgba(245, 247, 251, 0.10)' : 'rgba(20, 19, 15, 0.10)';

        // 3 x-labels + variation over the selected range (real total vs first point).
        this.xStart = points[0]?.label ?? '';
        this.xMid = points.length > 2 ? points[Math.floor(points.length / 2)].label : '';
        this.xEnd = points.length > 1 ? points[points.length - 1].label : '';
        const first = points[0]?.value ?? null;
        if (first !== null) {
            const delta = this.totalValue - first;
            this.variationAbs = delta;
            this.variationPct = first > 0 ? (delta / first) * 100 : null;
        } else {
            this.variationAbs = null;
            this.variationPct = null;
        }

        this.lineData = {
            labels: points.map(p => p.label),
            datasets: [{
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
                borderColor: color,
                tension: 0,
                borderJoinStyle: 'round',
                borderCapStyle: 'round',
                borderWidth: 1.5,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointBackgroundColor: color,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
            }]
        };

        this.lineOptions = {
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(20, 19, 15, 0.95)',
                    titleColor: '#FAF8F4',
                    bodyColor: '#DEDAD0',
                    borderColor: 'rgba(199, 123, 60, 0.30)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10,
                    displayColors: false,
                    callbacks: { label: (ctx: any) => cs.format(ctx.raw) }
                }
            },
            scales: {
                // Axis hidden: exactly 3 x-labels are rendered as positioned HTML.
                x: { display: false },
                y: {
                    min: yMin,
                    max: yMax,
                    ticks: {
                        count: 5,
                        color: textMuted,
                        font: { size: 11 },
                        callback: cs.tickFormatter(),
                        crossAlign: 'far' as const,
                        padding: 8,
                    },
                    // 5 dashed horizontal gridlines only (border.dash styles grid lines in v4).
                    grid: { color: gridColor, drawTicks: false },
                    border: { display: false, dash: [4, 4] },
                    afterFit: (scale: any) => { scale.width = 52; },
                },
            },
            interaction: { intersect: false, mode: 'index' },
            elements: { point: { radius: 0, hoverRadius: 5 } }
        };
    }

    private buildAllocRows() {
        const total = this.totalValue;
        const colors = chartTheme(this.layout.isDarkTheme()).categorical;
        this.allocRows = [...this.items]
            .sort((a, b) => b.value - a.value)
            .map((item, i) => {
                const share = total > 0 ? (item.value / total) * 100 : 0;
                return {
                    label: item.name,
                    amount: item.value,
                    color: colors[i % colors.length],
                    share,
                    pct: this.sharePctLabel(share),
                    tooltip: `${item.name} · ${this.cs.format(item.value)}`,
                };
            });
    }

    // ── Helpers ──

    sharePct(item: PatrimoineAssetItemDto): number {
        return this.totalValue > 0 ? Math.round((item.value / this.totalValue) * 100) : 0;
    }

    /** "0 %" is a lie for a non-empty asset (reference rule): <0.5 → "<1". */
    private sharePctLabel(share: number): string {
        if (share > 0 && share < 0.5) return '<1';
        if (share > 0 && share < 1) return '1';
        return String(Math.round(share));
    }

    getCategoryIcon(cat?: string): string  { return CATEGORY_ICONS[cat ?? ''] ?? 'pi pi-box'; }
    getCategoryBg(cat?: string): string    { return CATEGORY_BGS[cat ?? ''] ?? '#64748b'; }
    getCategoryLabel(cat?: string): string {
        if (!cat) return '';
        const label = this.i18n.t('assetCategories.' + cat);
        return label === 'assetCategories.' + cat ? cat : label;
    }

    assetLink(id: number): any[] {
        return this.nav.link('pages', 'patrimoine', 'assets', id);
    }

    goBack() {
        this.nav.go('pages', 'patrimoine');
    }
}
