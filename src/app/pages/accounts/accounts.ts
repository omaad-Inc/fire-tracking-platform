import { Component, OnInit, OnDestroy, inject, signal, computed, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { Subscription, firstValueFrom } from 'rxjs';
import { DashboardService } from '../service/dashboard.service';
import { PatrimoineService, PatrimoineAssetItemDto } from '../service/patrimoine.service';
import { AssetsStateService } from '../service/assets-state.service';
import { ApiService, Debt } from '../../core/services/api.service';
import { CurrencyService } from '../../core/services/currency.service';
import { AppAmountComponent } from '../../core/components/app-amount.component';

interface AssetGroup {
    id: string;
    label: string;
    icon: string;
    gradient: string;
    categories: string[];
    total: number;
    assets: PatrimoineAssetItemDto[];
}

const GROUPS: Omit<AssetGroup, 'total' | 'assets'>[] = [
    { id: 'liquidity',    label: 'Liquidités & Épargne', icon: 'pi pi-wallet',      gradient: 'from-positive-500 to-positive-700', categories: ['cash', 'savings_account', 'mobile_money'] },
    { id: 'investments',  label: 'Investissements',       icon: 'pi pi-chart-line',  gradient: 'from-brand-700 to-brand-600',     categories: ['stocks', 'bonds', 'crypto', 'retirement', 'life_insurance'] },
    { id: 'real_estate',  label: 'Immobilier',            icon: 'pi pi-building',    gradient: 'from-brand-700 to-brand-500', categories: ['real_estate'] },
    { id: 'business',     label: 'Autres actifs',         icon: 'pi pi-briefcase',   gradient: 'from-brand-700 to-brand-500', categories: ['business', 'vehicle', 'tontine', 'collectibles', 'commodities', 'other'] },
];

@Component({
    selector: 'app-accounts',
    standalone: true,
    imports: [CommonModule, RouterModule, ChartModule, AppAmountComponent],
    template: `
        <div class="flex flex-col gap-6">

            <!-- ── Hero: Net worth ─────────────────────────────────── -->
            <div class="card">
                <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                    <div>
                        <p class="text-surface-500 dark:text-surface-400 text-sm mb-1">Valeur nette totale</p>
                        <div class="text-4xl md:text-5xl font-bold text-surface-900 dark:text-surface-0">
                            <app-amount [value]="netWorth()" />
                        </div>
                        @if (netWorthChange() !== null) {
                            <div class="flex items-center gap-2 mt-2">
                                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold"
                                      [ngClass]="netWorthChange()! >= 0
                                          ? 'bg-positive/10 text-positive'
                                          : 'bg-negative/10 text-negative'">
                                    <i class="pi text-xs"
                                       [ngClass]="netWorthChange()! >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'"></i>
                                    <app-amount [value]="netWorthChange()!" [prefix]="netWorthChange()! >= 0 ? '+' : '-'" />
                                    @if (netWorthChangePct() !== null) {
                                        ({{ netWorthChangePct()! >= 0 ? '+' : '' }}{{ netWorthChangePct() | number:'1.1-1' }}%)
                                    }
                                </span>
                                <span class="text-surface-400 text-sm">ce mois</span>
                            </div>
                        }
                    </div>
                    <div class="flex items-center gap-6 shrink-0">
                        <div class="text-right">
                            <p class="text-surface-400 text-xs mb-0.5">Actifs</p>
                            <p class="font-semibold text-positive"><app-amount [value]="totalAssets()" /></p>
                        </div>
                        <div class="w-px h-8 bg-surface-200 dark:bg-surface-700"></div>
                        <div class="text-right">
                            <p class="text-surface-400 text-xs mb-0.5">Passifs</p>
                            <p class="font-semibold text-negative">−<app-amount [value]="totalDebts()" /></p>
                        </div>
                    </div>
                </div>

                <!-- Chart -->
                @if (chartLoading()) {
                    <div class="h-[200px] bg-surface-100 dark:bg-surface-800 rounded-xl animate-pulse"></div>
                } @else if (chartData) {
                    <p-chart type="line" [data]="chartData" [options]="chartOptions" class="w-full" style="height:200px" />
                }
            </div>

            <!-- ── Asset groups ─────────────────────────────────────── -->
            @if (loadingAssets()) {
                <div class="space-y-4">
                    @for (i of [1,2,3]; track i) {
                        <div class="h-20 bg-surface-100 dark:bg-surface-800 rounded-2xl animate-pulse"></div>
                    }
                </div>
            } @else {
                <div class="space-y-4">
                    @for (group of assetGroups(); track group.id) {
                        <div class="card !p-0 overflow-hidden">
                            <!-- Group header -->
                            <button (click)="toggleGroup(group.id)"
                                    class="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors text-left">
                                <div class="flex items-center gap-3">
                                    <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br"
                                         [ngClass]="group.gradient">
                                        <i [class]="group.icon + ' text-white text-sm'"></i>
                                    </div>
                                    <div>
                                        <p class="font-semibold text-surface-900 dark:text-surface-0 text-sm">{{ group.label }}</p>
                                        <p class="text-xs text-surface-400">{{ group.assets.length }} actif{{ group.assets.length > 1 ? 's' : '' }}</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <span class="font-bold text-surface-900 dark:text-surface-0">
                                        <app-amount [value]="group.total" />
                                    </span>
                                    <i class="pi text-surface-400 text-xs transition-transform duration-200"
                                       [ngClass]="expandedGroups().has(group.id) ? 'pi-chevron-up' : 'pi-chevron-down'"></i>
                                </div>
                            </button>

                            <!-- Individual assets (collapsible) -->
                            @if (expandedGroups().has(group.id)) {
                                <div class="border-t border-surface-200 dark:border-surface-700 divide-y divide-surface-100 dark:divide-surface-700/50">
                                    @for (asset of group.assets; track asset.id) {
                                        <button (click)="navigateToAsset(asset.id)"
                                                class="w-full flex items-center justify-between px-5 py-3 hover:bg-surface-50 dark:hover:bg-surface-700/30 transition-colors text-left pl-[68px]">
                                            <div class="min-w-0">
                                                <p class="text-sm font-medium text-surface-900 dark:text-surface-0 truncate">{{ asset.name }}</p>
                                                @if (asset.institution) {
                                                    <p class="text-xs text-surface-400 truncate">{{ asset.institution }}</p>
                                                }
                                            </div>
                                            <div class="flex items-center gap-3 shrink-0 ml-4">
                                                <div class="text-right">
                                                    <p class="text-sm font-semibold text-surface-900 dark:text-surface-0">
                                                        <app-amount [value]="asset.value" />
                                                    </p>
                                                    @if (asset.deltaAbs && asset.deltaAbs !== 0) {
                                                        <p class="text-xs"
                                                           [ngClass]="asset.deltaAbs >= 0 ? 'text-positive' : 'text-negative'">
                                                            {{ asset.deltaAbs >= 0 ? '+' : '−' }}<app-amount [value]="asset.deltaAbs" />
                                                            @if (asset.deltaPct) {
                                                                ({{ asset.deltaPct | number:'1.1-1' }}%)
                                                            }
                                                        </p>
                                                    }
                                                </div>
                                                <i class="pi pi-chevron-right text-surface-400 text-xs"></i>
                                            </div>
                                        </button>
                                    }
                                </div>
                            }
                        </div>
                    }
                </div>
            }
        </div>
    `
})
export class AccountsPage implements OnInit, OnDestroy {
    private platformId      = inject(PLATFORM_ID);
    private cd              = inject(ChangeDetectorRef);
    private router          = inject(Router);
    private dashboardService = inject(DashboardService);
    private patrimoineService = inject(PatrimoineService);
    private stateService    = inject(AssetsStateService);
    private apiService      = inject(ApiService);
    private cs              = inject(CurrencyService);

    private subscription?: Subscription;

    // ── Signals ────────────────────────────────────────────────────
    loading       = signal(true);
    loadingAssets = signal(true);
    chartLoading  = signal(true);

    private _assets = signal<PatrimoineAssetItemDto[]>([]);
    private _debts  = signal<Debt[]>([]);
    private _netWorthChange    = signal<number | null>(null);
    private _netWorthChangePct = signal<number | null>(null);

    expandedGroups = signal<Set<string>>(new Set(['liquidity', 'investments', 'real_estate', 'business']));

    chartData: any    = null;
    chartOptions: any = null;

    // ── Computed ───────────────────────────────────────────────────
    totalAssets = computed(() => this._assets().reduce((s, a) => s + a.value, 0));
    totalDebts  = computed(() => this._debts().filter(d => d.type === 'i_owe').reduce((s, d) => s + d.current_amount, 0));
    netWorth    = computed(() => this.totalAssets() - this.totalDebts());
    netWorthChange    = computed(() => this._netWorthChange());
    netWorthChangePct = computed(() => this._netWorthChangePct());

    assetGroups = computed((): AssetGroup[] => {
        const assets = this._assets();
        return GROUPS
            .map(g => {
                const items = assets.filter(a => g.categories.includes(a.category ?? ''));
                return { ...g, total: items.reduce((s, a) => s + a.value, 0), assets: items };
            })
            .filter(g => g.assets.length > 0);
    });

    ngOnInit() {
        this.loadAll();
        this.subscription = this.stateService.assetsUpdated$.subscribe(() => this.loadAll());
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

    private async loadAll() {
        this.loadingAssets.set(true);
        this.chartLoading.set(true);

        const [assets, debts, summary] = await Promise.all([
            this.patrimoineService.getAssets(),
            firstValueFrom(this.apiService.getDebts()).catch(() => [] as Debt[]),
            this.dashboardService.getStats().catch(() => null),
        ]);

        this._assets.set(assets);
        this._debts.set(debts);
        if (summary) {
            this._netWorthChange.set(summary.netWorthChange);
            this._netWorthChangePct.set(summary.netWorthChangePct);
        }
        this.loadingAssets.set(false);

        await this.loadChart();
    }

    private async loadChart() {
        if (!isPlatformBrowser(this.platformId)) { this.chartLoading.set(false); return; }
        try {
            const { labels, assets, debts, netWorth } = await this.dashboardService.getWorthProgressionDetailed(12);
            if (labels.length === 0) { this.chartLoading.set(false); return; }

            const cs = this.cs;
            this.chartData = {
                labels,
                datasets: [{
                    label: 'Valeur nette',
                    data: netWorth,
                    fill: false,
                    borderColor: '#6366f1',
                    tension: 0.45,
                    borderWidth: 2.5,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: '#6366f1',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                }]
            };
            const textColor = getComputedStyle(document.documentElement)
                .getPropertyValue('--text-color-secondary') || '#94a3b8';
            this.chartOptions = {
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15,23,42,0.95)',
                        titleColor: '#fff', bodyColor: '#94a3b8',
                        borderColor: 'rgba(99,102,241,0.4)', borderWidth: 1,
                        cornerRadius: 8, padding: 10, displayColors: false,
                        callbacks: {
                            label: (ctx: any) => cs.format(ctx.raw, 0)
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: textColor, font: { size: 10 }, maxTicksLimit: 8 }, grid: { display: false } },
                    y: { ticks: { color: textColor, font: { size: 10 }, callback: cs.tickFormatter() }, grid: { display: false } }
                },
                interaction: { intersect: false, mode: 'index' },
                elements: { point: { radius: 0, hoverRadius: 5 } }
            };
            this.cd.markForCheck();
        } finally {
            this.chartLoading.set(false);
        }
    }

    toggleGroup(id: string) {
        this.expandedGroups.update(s => {
            const next = new Set(s);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    navigateToAsset(id: number) {
        const lang = this.router.url.match(/^\/(fr|en)/)?.[1] ?? 'fr';
        this.router.navigate(['/', lang, 'pages', 'patrimoine', 'assets', id]);
    }
}
