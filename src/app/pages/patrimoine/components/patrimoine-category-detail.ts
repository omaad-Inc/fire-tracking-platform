import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { PatrimoineService, PatrimoineAssetItemDto } from '../../service/patrimoine.service';
import { DashboardService, ChartDataPoint } from '../../service/dashboard.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';

interface GroupConfig {
    id: string;
    label: string;
    icon: string;
    bg: string;
    color: string;
    categories: string[];
}

// Brand-tokenized: every group gets the same navy gradient. Icon glyph differentiates.
const BRAND_BG = 'linear-gradient(135deg, #1A2740, #2C3E5E)';
const BRAND_COLOR = '#1A2740';

const GROUPS: GroupConfig[] = [
    { id: 'real_estate',    label: 'Immobilier',       icon: 'pi pi-building',   bg: BRAND_BG, color: BRAND_COLOR, categories: ['real_estate'] },
    { id: 'stocks_bonds',   label: 'Actions & Fonds',  icon: 'pi pi-chart-line', bg: BRAND_BG, color: BRAND_COLOR, categories: ['stocks', 'bonds'] },
    { id: 'savings',        label: 'Épargne',          icon: 'pi pi-dollar',     bg: BRAND_BG, color: BRAND_COLOR, categories: ['savings_account', 'cash', 'life_insurance', 'retirement'] },
    { id: 'crypto',         label: 'Crypto',           icon: 'pi pi-bitcoin',    bg: BRAND_BG, color: BRAND_COLOR, categories: ['crypto'] },
    { id: 'tontine',        label: 'Tontine',          icon: 'pi pi-users',      bg: BRAND_BG, color: BRAND_COLOR, categories: ['tontine'] },
    { id: 'mobile_money',   label: 'Mobile Money',     icon: 'pi pi-mobile',     bg: BRAND_BG, color: BRAND_COLOR, categories: ['mobile_money'] },
    { id: 'other',          label: 'Autres',           icon: 'pi pi-box',        bg: BRAND_BG, color: BRAND_COLOR, categories: ['business', 'vehicle', 'collectibles', 'commodities', 'other'] },
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

const CATEGORY_LABELS: Record<string, string> = {
    real_estate: 'Immobilier', stocks: 'Actions', bonds: 'Obligations',
    crypto: 'Crypto-monnaies', cash: 'Compte bancaire', retirement: 'Épargne retraite',
    life_insurance: 'Assurance vie', savings_account: "Livret d'épargne",
    business: 'Entreprise', vehicle: 'Véhicule',
    tontine: 'Tontine', mobile_money: 'Mobile Money',
    collectibles: 'Collections', commodities: 'Matières premières', other: 'Autres',
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
    imports: [CommonModule, RouterModule, ChartModule, AppAmountComponent],
    template: `
        <!-- ── Global loading skeleton ── -->
        @if (loading) {
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
                    <div class="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0"
                         [style.background]="currentGroup?.bg">
                        <i [class]="currentGroup?.icon" class="text-white text-2xl"></i>
                    </div>
                    <div class="min-w-0">
                        <div class="text-sm font-medium text-surface-500 dark:text-surface-400">{{ currentGroup?.label }}</div>
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
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">

                <!-- Progression chart -->
                <div class="card !mb-0">
                    <div class="flex items-center justify-between mb-4">
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
                        <div class="flex items-center justify-center h-52">
                            <i class="pi pi-spin pi-spinner text-2xl text-surface-400"></i>
                        </div>
                    } @else if (!lineData) {
                        <div class="flex flex-col items-center justify-center h-52 text-center">
                            <i class="pi pi-chart-line text-3xl text-surface-400 mb-3"></i>
                            <p class="text-surface-500 text-sm">Pas encore de données</p>
                        </div>
                    } @else {
                        <div class="mb-3">
                            <div class="text-surface-500 dark:text-surface-400 text-xs">{{ todayLabel }}</div>
                            <div class="text-surface-900 dark:text-surface-0 font-bold text-xl"><app-amount [value]="totalValue" /></div>
                        </div>
                        <p-chart type="line" [data]="lineData" [options]="lineOptions" styleClass="w-full" [height]="'200px'" />
                    }
                </div>

                <!-- Donut chart -->
                <div class="card !mb-0">
                    <div class="flex items-center justify-between mb-4">
                        <span class="font-semibold text-surface-900 dark:text-surface-0">Répartition</span>
                        <span class="text-surface-500 dark:text-surface-400 text-sm">{{ items.length }} actif{{ items.length > 1 ? 's' : '' }}</span>
                    </div>

                    @if (items.length === 0) {
                        <div class="flex flex-col items-center justify-center h-52 text-center">
                            <i class="pi pi-chart-pie text-3xl text-surface-400 mb-3"></i>
                            <p class="text-surface-500 text-sm">Aucun actif</p>
                        </div>
                    } @else if (donutData) {
                        <!-- Donut with centered value -->
                        <div class="relative mx-auto" style="width:220px; height:220px">
                            <p-chart type="doughnut" [data]="donutData" [options]="donutOptions" styleClass="w-full h-full" [height]="'220px'" />
                            <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span class="text-surface-500 dark:text-surface-400 text-xs">Total</span>
                                <span class="font-bold text-surface-900 dark:text-surface-0 text-sm leading-tight text-center px-2"><app-amount [value]="totalValue" /></span>
                                <span class="text-surface-500 dark:text-surface-400 text-xs mt-0.5">100 %</span>
                            </div>
                        </div>
                        <!-- Legend -->
                        <div class="mt-5 space-y-2.5">
                            @for (item of items; track item.id; let i = $index) {
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2.5 min-w-0">
                                        <span class="w-2.5 h-2.5 rounded-full shrink-0" [style.background]="donutColor(i)"></span>
                                        <span class="text-surface-700 dark:text-surface-300 text-sm truncate">{{ item.name }}</span>
                                    </div>
                                    <div class="flex items-center gap-3 shrink-0 ml-3">
                                        <span class="text-surface-400 dark:text-surface-500 text-sm">{{ sharePct(item) }}%</span>
                                        <span class="font-semibold text-surface-900 dark:text-surface-0 text-sm"><app-amount [value]="item.value" /></span>
                                    </div>
                                </div>
                            }
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
                        <p class="text-surface-500 text-sm">Aucun actif dans cette catégorie</p>
                    </div>
                } @else {
                    <div class="space-y-3">
                        @for (item of items; track item.id) {
                            <a [routerLink]="assetLink(item.id)"
                               class="flex items-center justify-between p-5 rounded-2xl bg-surface-0 dark:bg-surface-800 hover:bg-surface-50 dark:hover:bg-surface-700 transition-all duration-200 cursor-pointer group no-underline border border-surface-200 dark:border-surface-700 hover:border-brand-300/40 dark:hover:border-brand-700/50 shadow-sm">
                                <div class="flex items-center gap-4 min-w-0">
                                    <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200"
                                         [style.background]="getCategoryBg(item.category)">
                                        <i [class]="getCategoryIcon(item.category)" class="text-white"></i>
                                    </div>
                                    <div class="min-w-0">
                                        <div class="font-semibold text-surface-900 dark:text-surface-0 truncate">{{ item.name }}</div>
                                        <div class="text-surface-500 dark:text-surface-400 text-sm">{{ getCategoryLabel(item.category) }}</div>
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
    private patrimoineService = inject(PatrimoineService);
    private dashboardService = inject(DashboardService);
    private cs = inject(CurrencyService);

    // ── State (plain properties, not signals — avoids effect timing issues) ──
    loading = true;
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

    todayLabel = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    lineData: any = null;
    lineOptions: any = null;
    donutData: any = null;
    donutOptions: any = null;

    async ngOnInit() {
        const categoryId = this.route.snapshot.paramMap.get('categoryId') ?? '';
        this.currentGroup = GROUPS.find(g => g.id === categoryId) ?? null;

        // Load assets
        const all = await this.patrimoineService.getAssets();
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

        this.lineData = {
            labels: points.map(p => p.label),
            datasets: [{
                data: points.map(p => p.value),
                fill: false,
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
        const donutColors = getDonutColors();
        const colors = this.items.map((_, i) => donutColors[i % donutColors.length]);
        const tv = this.totalValue;
        const cs = this.cs;

        this.donutData = {
            labels: this.items.map(i => i.name),
            datasets: [{
                data: this.items.map(i => i.value),
                backgroundColor: colors,
                borderColor: 'transparent',
                borderWidth: 0,
                hoverOffset: 8,
            }]
        };

        this.donutOptions = {
            cutout: '72%',
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    titleColor: '#fff',
                    bodyColor: '#94a3b8',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10,
                    displayColors: true,
                    callbacks: {
                        label: (ctx: any) => ` ${cs.format(ctx.raw, 0)}  (${tv > 0 ? Math.round(ctx.raw / tv * 100) : 0}%)`
                    }
                }
            }
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
    getCategoryBg(cat?: string): string    { return CATEGORY_BGS[cat ?? ''] ?? 'linear-gradient(135deg,#94a3b8,#64748b)'; }
    getCategoryLabel(cat?: string): string { return CATEGORY_LABELS[cat ?? ''] ?? cat ?? ''; }

    assetLink(id: number): any[] {
        const match = this.router.url.match(/^\/(fr|en)\//);
        return ['/', match ? match[1] : 'fr', 'pages', 'patrimoine', 'assets', id];
    }

    goBack() {
        const match = this.router.url.match(/^\/(fr|en)\//);
        this.router.navigate(['/', match ? match[1] : 'fr', 'pages', 'patrimoine']);
    }
}
