import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { PatrimoineService, PatrimoineAssetItemDto } from '../../service/patrimoine.service';
import { DashboardService, ChartDataPoint } from '../../service/dashboard.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { NavService } from '../../../core/services/nav.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { I18nService } from '../../../i18n/i18n.service';
import { LoadErrorComponent } from '../../../core/components/load-error.component';

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
    { id: 'stocks_bonds',   icon: 'pi pi-chart-line', bg: BRAND_BG, color: BRAND_COLOR, categories: ['stocks_brvm', 'stocks_intl', 'bonds'] },
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

// Every category gets the same navy gradient — icon glyph differentiates.
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


const DONUT_COLORS_LIGHT = ['#1A2740', '#C77B3C', '#4D5F80', '#D8A369', '#3D3B35', '#6E6A60', '#9C988C', '#C2BDB1', '#08111E', '#71421C'];
const DONUT_COLORS_DARK  = ['#8A98AE', '#D8A369', '#B6BFCD', '#EBD0B0', '#9C988C', '#C2BDB1', '#DEDAD0', '#F1EDE5', '#4D5F80', '#F4E5D2'];

function getDonutColors(): string[] {
    const isDark = typeof document !== 'undefined' &&
        (document.documentElement.classList.contains('app-dark') || document.body.classList.contains('app-dark'));
    return isDark ? DONUT_COLORS_DARK : DONUT_COLORS_LIGHT;
}

@Component({
    selector: 'app-patrimoine-category-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, ChartModule, AppAmountComponent, LoadErrorComponent],
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
                        <div class="text-sm font-medium text-surface-500 dark:text-surface-400">{{ currentGroup ? i18n.t('patrimoine.groups.' + currentGroup.id) : '' }}</div>
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

            <!-- ── Charts row ── -->
            <div class="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-8">

                <!-- Progression chart -->
                <div class="xl:col-span-7 relative overflow-hidden rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5">
                    <div class="relative flex items-center justify-between mb-4">
                        <span class="font-semibold text-surface-900 dark:text-surface-0">Progression</span>
                        <div class="flex items-center gap-1">
                            @for (r of ranges; track r.months) {
                                <button (click)="changeRange(r.months)"
                                        class="px-2.5 py-1 text-xs rounded-lg transition-colors"
                                        [ngClass]="selectedMonths === r.months
                                            ? 'bg-brand-700 text-white dark:bg-brand-300 dark:text-brand-900'
                                            : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'">
                                    {{ r.label }}
                                </button>
                            }
                        </div>
                    </div>

                    @if (loadingChart) {
                        <div class="relative flex items-center justify-center h-52">
                            <i class="pi pi-spin pi-spinner text-2xl text-surface-400"></i>
                        </div>
                    } @else if (!lineData) {
                        <div class="relative flex flex-col items-center justify-center h-52 text-center">
                            <i class="pi pi-chart-line text-3xl text-surface-400 mb-3"></i>
                            <p class="text-surface-500 text-sm">{{ i18n.t('patrimoine.noDataYet') }}</p>
                        </div>
                    } @else {
                        <div class="relative mb-3">
                            <div class="text-surface-500 dark:text-surface-400 text-xs">{{ todayLabel }}</div>
                            <div class="text-surface-900 dark:text-surface-0 font-bold text-xl"><app-amount [value]="totalValue" /></div>
                        </div>
                        <div class="relative">
                            <p-chart type="line" [data]="lineData" [options]="lineOptions" styleClass="w-full" [height]="'240px'" />
                        </div>
                    }
                </div>

                <!-- Donut chart -->
                <div class="xl:col-span-5 relative overflow-hidden rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5">
                    <div class="relative flex items-center justify-between mb-4">
                        <span class="font-semibold text-surface-900 dark:text-surface-0">{{ i18n.t('patrimoine.allocation') }}</span>
                        <span class="text-surface-500 dark:text-surface-400 text-sm">{{ items.length }} actif{{ items.length > 1 ? 's' : '' }}</span>
                    </div>

                    @if (items.length === 0) {
                        <div class="flex flex-col items-center justify-center h-52 text-center">
                            <i class="pi pi-chart-pie text-3xl text-surface-400 mb-3"></i>
                            <p class="text-surface-500 text-sm">Aucun actif</p>
                        </div>
                    } @else if (donutData) {
                        <!-- Donut: hover a slice to reveal its share in the center (no legend) -->
                        <div class="flex items-center justify-center py-4 min-h-[280px]">
                            <div class="relative" style="width:260px; height:260px">
                                <p-chart type="doughnut" [data]="donutData" [options]="donutOptions" styleClass="w-full h-full" [height]="'260px'" />
                                <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6 text-center">
                                    @if (hovered; as h) {
                                        <span class="text-surface-500 dark:text-surface-400 text-xs leading-tight line-clamp-2">{{ h.name }}</span>
                                        <span class="font-bold text-surface-900 dark:text-surface-0 text-lg leading-tight mt-0.5"><app-amount [value]="h.value" /></span>
                                        <span class="text-brand-700 dark:text-ochre-400 text-sm font-semibold mt-0.5">{{ h.pct }} %</span>
                                    } @else {
                                        <span class="text-surface-500 dark:text-surface-400 text-xs">Total</span>
                                        <span class="font-bold text-surface-900 dark:text-surface-0 text-lg leading-tight mt-0.5"><app-amount [value]="totalValue" /></span>
                                        <span class="text-surface-400 dark:text-surface-500 text-xs mt-0.5">{{ items.length }} actif{{ items.length > 1 ? 's' : '' }}</span>
                                    }
                                </div>
                            </div>
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
    i18n = inject(I18nService);

    // ── State (plain properties, not signals — avoids effect timing issues) ──
    loading = true;
    loadError = false;
    loadingChart = false;

    currentGroup: GroupConfig | null = null;
    items: PatrimoineAssetItemDto[] = [];

    totalValue = 0;
    totalDeltaAbs = 0;
    totalDeltaPct = 0;

    readonly ranges = [
        { label: '3M', months: 3 },
        { label: '6M', months: 6 },
        { label: '1A', months: 12 },
        { label: 'Max', months: 0 },
    ];
    selectedMonths = 0;

    get todayLabel(): string {
        const locale = this.i18n.lang() === 'en' ? 'en-US' : 'fr-FR';
        return new Date().toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    }

    lineData: any = null;
    lineOptions: any = null;
    donutData: any = null;
    donutOptions: any = null;
    // Hover-driven donut center (replaces the legend list, Finary-style)
    hovered: { name: string; value: number; pct: number } | null = null;
    private hoveredIdx = -1;

    async ngOnInit() {
        const categoryId = this.route.snapshot.paramMap.get('categoryId') ?? '';
        this.currentGroup = GROUPS.find(g => g.id === categoryId) ?? null;

        // Load assets — surface failures as an error+retry card, never as an
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

        // Build donut synchronously before revealing the page
        if (this.items.length > 0) {
            this.buildDonut();
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
        // Brand-tokenized chart line — same in light + dark, switching shade.
        const isDark = document.documentElement.classList.contains('app-dark');
        const color = isDark ? '#8A98AE' : '#1A2740';        // brand-300 / brand-700
        const textMuted = isDark ? '#9C988C' : '#6E6A60';   // warm-400 / warm-500
        const cs = this.cs;

        // Soft vertical area-fill gradient under the line (data-viz, Finary-style).
        const fillTop = isDark ? 'rgba(138,152,174,0.22)' : 'rgba(26,39,64,0.15)';
        const fillBottom = isDark ? 'rgba(138,152,174,0)' : 'rgba(26,39,64,0)';

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
                tension: 0.4,
                borderWidth: 2.5,
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
                    callbacks: { label: (ctx: any) => cs.format(ctx.raw, 0) }
                }
            },
            scales: {
                x: {
                    ticks: { color: textMuted, font: { size: 10 }, maxTicksLimit: 8, autoSkip: true },
                    grid: { display: false }
                },
                y: {
                    ticks: { color: textMuted, font: { size: 10 }, callback: cs.tickFormatter() },
                    grid: { display: false }
                }
            },
            interaction: { intersect: false, mode: 'index' },
            elements: { point: { radius: 0, hoverRadius: 5 } }
        };
    }

    private buildDonut() {
        const isDark = document.documentElement.classList.contains('app-dark');
        const sliceBorder = isDark ? '#0F1A2E' : '#ffffff';  // matches card bg for clean gaps
        const donutColors = getDonutColors();
        const colors = this.items.map((_, i) => donutColors[i % donutColors.length]);

        this.donutData = {
            labels: this.items.map(i => i.name),
            datasets: [{
                data: this.items.map(i => i.value),
                backgroundColor: colors,
                borderColor: sliceBorder,
                borderWidth: 2,
                hoverOffset: 10,
                hoverBorderColor: sliceBorder,
            }]
        };

        this.donutOptions = {
            cutout: '72%',
            maintainAspectRatio: false,
            // Hovering a slice drives the center label (Finary-style) — no legend, no tooltip.
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
            },
            onHover: (_event: any, elements: any[]) => {
                const idx = elements && elements.length ? elements[0].index : -1;
                if (idx === this.hoveredIdx) return;
                this.hoveredIdx = idx;
                const item = idx >= 0 ? this.items[idx] : null;
                this.hovered = item ? { name: item.name, value: item.value, pct: this.sharePct(item) } : null;
                this.cd.detectChanges();
            },
        };
    }

    // ── Helpers ──

    sharePct(item: PatrimoineAssetItemDto): number {
        return this.totalValue > 0 ? Math.round((item.value / this.totalValue) * 100) : 0;
    }

    donutColor(index: number): string {
        const colors = getDonutColors();
        return colors[index % colors.length];
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
