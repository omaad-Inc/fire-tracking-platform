import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { PatrimoineService, PatrimoineAssetItemDto } from '../../service/patrimoine.service';
import { DashboardService, ChartDataPoint } from '../../service/dashboard.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';

interface GroupConfig {
    id: string;
    label: string;
    icon: string;
    bg: string;
    color: string;
    categories: string[];
}

const GROUPS: GroupConfig[] = [
    { id: 'real_estate',    label: 'Immobilier',       icon: 'pi pi-building',   bg: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#6366f1', categories: ['real_estate'] },
    { id: 'stocks_bonds',   label: 'Actions & Fonds',  icon: 'pi pi-chart-line', bg: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: '#06b6d4', categories: ['stocks', 'bonds'] },
    { id: 'savings',        label: 'Épargne',          icon: 'pi pi-dollar',     bg: 'linear-gradient(135deg, #10b981, #059669)', color: '#10b981', categories: ['savings_account', 'cash', 'life_insurance', 'retirement'] },
    { id: 'crypto',         label: 'Crypto',           icon: 'pi pi-bitcoin',    bg: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#f59e0b', categories: ['crypto'] },
    { id: 'tontine',        label: 'Tontine',          icon: 'pi pi-users',      bg: 'linear-gradient(135deg, #e11d48, #be123c)', color: '#e11d48', categories: ['tontine'] },
    { id: 'mobile_money',   label: 'Mobile Money',     icon: 'pi pi-mobile',     bg: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#0ea5e9', categories: ['mobile_money'] },
    { id: 'other',          label: 'Autres',           icon: 'pi pi-box',        bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#8b5cf6', categories: ['business', 'vehicle', 'collectibles', 'commodities', 'other'] },
];

const CATEGORY_ICONS: Record<string, string> = {
    real_estate: 'pi pi-building', stocks: 'pi pi-chart-line', bonds: 'pi pi-chart-bar',
    crypto: 'pi pi-bitcoin', cash: 'pi pi-wallet', retirement: 'pi pi-shield',
    life_insurance: 'pi pi-heart', savings_account: 'pi pi-dollar', business: 'pi pi-briefcase',
    vehicle: 'pi pi-car', tontine: 'pi pi-users', mobile_money: 'pi pi-mobile',
    collectibles: 'pi pi-star', commodities: 'pi pi-box', other: 'pi pi-box',
};

const CATEGORY_BGS: Record<string, string> = {
    real_estate:     'linear-gradient(135deg, #6366f1, #4f46e5)',
    stocks:          'linear-gradient(135deg, #06b6d4, #0891b2)',
    bonds:           'linear-gradient(135deg, #06b6d4, #0891b2)',
    crypto:          'linear-gradient(135deg, #f59e0b, #d97706)',
    cash:            'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    retirement:      'linear-gradient(135deg, #14b8a6, #0d9488)',
    life_insurance:  'linear-gradient(135deg, #ec4899, #db2777)',
    savings_account: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    business:        'linear-gradient(135deg, #f97316, #ea580c)',
    vehicle:         'linear-gradient(135deg, #64748b, #475569)',
    tontine:         'linear-gradient(135deg, #e11d48, #be123c)',
    mobile_money:    'linear-gradient(135deg, #0ea5e9, #0284c7)',
    collectibles:    'linear-gradient(135deg, #a855f7, #9333ea)',
    other:           'linear-gradient(135deg, #94a3b8, #64748b)',
};

const CATEGORY_LABELS: Record<string, string> = {
    real_estate: 'Immobilier', stocks: 'Actions', bonds: 'Obligations',
    crypto: 'Crypto-monnaies', cash: 'Liquidités', retirement: 'Épargne retraite',
    life_insurance: 'Assurance vie', savings_account: "Livret d'épargne",
    business: 'Entreprise', vehicle: 'Véhicule',
    tontine: 'Tontine', mobile_money: 'Mobile Money',
    collectibles: 'Collections', commodities: 'Matières premières', other: 'Autres',
};

const DONUT_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#f97316', '#14b8a6', '#64748b', '#a855f7'];

@Component({
    selector: 'app-patrimoine-category-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, ChartModule, AppCurrencyPipe],
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
                            <span class="text-3xl font-bold text-surface-900 dark:text-surface-0">{{ totalValue | appCurrency }}</span>
                            @if (totalDeltaAbs !== 0) {
                                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-semibold"
                                      [ngClass]="totalDeltaAbs >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'">
                                    <i class="pi text-xs" [ngClass]="totalDeltaAbs >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'"></i>
                                    {{ totalDeltaAbs >= 0 ? '+' : '' }}{{ totalDeltaAbs | appCurrency }}
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
                                            ? 'bg-indigo-500 text-white'
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
                            <div class="text-surface-900 dark:text-surface-0 font-bold text-xl">{{ totalValue | appCurrency }}</div>
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
                                <span class="font-bold text-surface-900 dark:text-surface-0 text-sm leading-tight text-center px-2">{{ totalValue | appCurrency }}</span>
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
                                        <span class="font-semibold text-surface-900 dark:text-surface-0 text-sm">{{ item.value | appCurrency }}</span>
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
                               class="flex items-center justify-between p-5 rounded-2xl bg-surface-0 dark:bg-surface-800 hover:bg-surface-50 dark:hover:bg-surface-700 transition-all duration-200 cursor-pointer group no-underline border border-surface-200 dark:border-surface-700 hover:border-indigo-500/30 shadow-sm">
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
                                        <div class="font-bold text-surface-900 dark:text-surface-0">{{ item.value | appCurrency }}</div>
                                        @if (item.deltaPct != null) {
                                            <div class="flex items-center justify-end gap-1 mt-0.5">
                                                <i class="pi text-xs" [ngClass]="(item.deltaPct) >= 0 ? 'pi-arrow-up text-emerald-500' : 'pi-arrow-down text-rose-500'"></i>
                                                <span class="text-sm font-medium" [ngClass]="item.deltaPct >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                                                    {{ (item.deltaAbs ?? 0) >= 0 ? '+' : '' }}{{ item.deltaAbs | appCurrency }}
                                                    &nbsp;{{ item.deltaPct | number:'1.2-2' }}%
                                                </span>
                                            </div>
                                        }
                                    </div>
                                    <i class="pi pi-chevron-right text-surface-400 text-sm group-hover:text-indigo-400 transition-colors"></i>
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
        const color = this.currentGroup?.color ?? '#6366f1';
        const textMuted = '#94a3b8';
        const cs = this.cs;

        this.lineData = {
            labels: points.map(p => p.label),
            datasets: [{
                data: points.map(p => p.value),
                fill: true,
                borderColor: color,
                backgroundColor: color + '26',
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
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    titleColor: '#fff',
                    bodyColor: '#94a3b8',
                    borderColor: color + '80',
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
                    grid: { color: 'rgba(148,163,184,0.1)' }
                }
            },
            interaction: { intersect: false, mode: 'index' },
            elements: { point: { radius: 0, hoverRadius: 5 } }
        };
    }

    private buildDonut() {
        const colors = this.items.map((_, i) => DONUT_COLORS[i % DONUT_COLORS.length]);
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
        return DONUT_COLORS[index % DONUT_COLORS.length];
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
