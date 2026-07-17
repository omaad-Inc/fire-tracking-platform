import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { PatrimoineProgress } from './components/patrimoineprogress';
import { ChartModule } from 'primeng/chart';
import { I18nService } from '../../i18n/i18n.service';
import { PatrimoineService, PatrimoineAssetItemDto } from '../service/patrimoine.service';
import { AssetsStateService } from '../service/assets-state.service';
import { ApiService, Debt } from '../../core/services/api.service';
import { AppAmountComponent } from '../../core/components/app-amount.component';

interface CategoryGroupCard {
    id: string;
    label: string;
    icon: string;
    bg: string;
    totalValue: number;
    totalDeltaAbs: number;
    totalDeltaPct: number;
    assetCount: number;
}

// All asset groups share the same solid brand navy — the icon glyph
// differentiates the category, not the color. (Phase 2 identity rule.)
const GROUP_BG = '#1A2740';

// Allocation donut palette (navy / ochre / warm-grey spread).
const DONUT_COLORS = ['#1A2740', '#C77B3C', '#4D5F80', '#D8A369', '#2C3E5E', '#9C988C', '#71421C', '#8A98AE'];

const GROUPS = [
    { id: 'real_estate',    label: 'Immobilier',        icon: 'pi pi-building',   bg: GROUP_BG, categories: ['real_estate'] },
    { id: 'stocks_bonds',   label: 'Actions & Fonds',   icon: 'pi pi-chart-line', bg: GROUP_BG, categories: ['stocks_brvm', 'stocks_intl', 'bonds'] },
    { id: 'savings',        label: 'Épargne',           icon: 'pi pi-dollar',     bg: GROUP_BG, categories: ['savings_account', 'cash', 'life_insurance', 'retirement'] },
    { id: 'crypto',         label: 'Crypto',            icon: 'pi pi-bitcoin',    bg: GROUP_BG, categories: ['crypto'] },
    { id: 'tontine',        label: 'Tontine',           icon: 'pi pi-users',      bg: GROUP_BG, categories: ['tontine'] },
    { id: 'mobile_money',   label: 'Mobile Money',      icon: 'pi pi-mobile',     bg: GROUP_BG, categories: ['mobile_money'] },
    { id: 'other',          label: 'Autres',            icon: 'pi pi-box',        bg: GROUP_BG, categories: ['business', 'vehicle', 'collectibles', 'commodities', 'other'] },
];

@Component({
    selector: 'app-patrimoine',
    standalone: true,
    imports: [CommonModule, PatrimoineProgress, ChartModule, AppAmountComponent],
    template: `
        <div class="flex flex-col gap-4 md:gap-6 lg:gap-8">

            <!-- Net-worth hero -->
            <div class="rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 sm:p-6">
                <div class="flex flex-wrap items-end justify-between gap-4">
                    <div class="min-w-0">
                        <span class="text-surface-500 dark:text-surface-400 text-sm font-medium">Patrimoine net</span>
                        <div class="flex items-center gap-3 mt-1 flex-wrap">
                            <app-amount [value]="netWorth()" class="text-3xl sm:text-4xl font-bold text-surface-900 dark:text-surface-0" />
                            @if (assetDeltaAbs() !== 0) {
                                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-semibold"
                                      [ngClass]="assetDeltaAbs() >= 0 ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'">
                                    <i class="pi text-xs" [ngClass]="assetDeltaAbs() >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'"></i>
                                    <app-amount [value]="assetDeltaAbs()" [prefix]="assetDeltaAbs() >= 0 ? '+' : '-'" />
                                    &nbsp;{{ assetDeltaPct() | number:'1.2-2' }}%
                                </span>
                            }
                        </div>
                    </div>
                    <div class="flex items-center gap-6 sm:gap-8">
                        <div>
                            <div class="text-surface-500 dark:text-surface-400 text-xs mb-0.5">Actifs</div>
                            <div class="font-semibold text-surface-900 dark:text-surface-0"><app-amount [value]="totalAssets()" /></div>
                        </div>
                        <div>
                            <div class="text-surface-500 dark:text-surface-400 text-xs mb-0.5">Passifs</div>
                            <div class="font-semibold" [ngClass]="totalDebts() > 0 ? 'text-negative' : 'text-surface-900 dark:text-surface-0'">
                                <app-amount [value]="totalDebts()" [prefix]="totalDebts() > 0 ? '-' : ''" />
                            </div>
                        </div>
                    </div>
                </div>

                @if (hasMultiCurrency()) {
                    <!-- Currency exposure — where net worth sits across currencies -->
                    <div class="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
                        <div class="text-surface-500 dark:text-surface-400 text-xs mb-2">Exposition par devise</div>
                        <div class="flex h-2 rounded-full overflow-hidden mb-2">
                            @for (e of currencyExposure(); track e.currency; let i = $index) {
                                <div [style.width.%]="e.pct"
                                     [ngClass]="i === 0 ? 'bg-brand-700' : i === 1 ? 'bg-ochre-500' : 'bg-surface-400'"></div>
                            }
                        </div>
                        <div class="flex flex-wrap gap-x-4 gap-y-1">
                            @for (e of currencyExposure(); track e.currency; let i = $index) {
                                <span class="inline-flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-300">
                                    <span class="w-2 h-2 rounded-full"
                                          [ngClass]="i === 0 ? 'bg-brand-700' : i === 1 ? 'bg-ochre-500' : 'bg-surface-400'"></span>
                                    <span class="font-semibold">{{ e.currency }}</span>
                                    <span class="text-surface-400">{{ e.pct }}%</span>
                                </span>
                            }
                        </div>
                    </div>
                }
            </div>

            <!-- Progression + allocation donut -->
            <div class="grid grid-cols-12 gap-4 md:gap-6">
                <div class="col-span-12 xl:col-span-8">
                    <app-patrimoine-progress />
                </div>
                <div class="col-span-12 xl:col-span-4 rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 flex flex-col">
                    <div class="flex items-center justify-between mb-2">
                        <span class="font-semibold text-surface-900 dark:text-surface-0">Répartition</span>
                        <span class="text-surface-500 dark:text-surface-400 text-sm">{{ categoryGroups().length }} catégorie{{ categoryGroups().length > 1 ? 's' : '' }}</span>
                    </div>
                    @if (donutData(); as dd) {
                        <div class="flex-1 flex items-center justify-center py-2">
                            <div class="relative" style="width:230px;height:230px">
                                <p-chart type="doughnut" [data]="dd" [options]="donutOptions" styleClass="w-full h-full" [height]="'230px'" />
                                <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6 text-center">
                                    @if (hovered(); as h) {
                                        <span class="text-surface-500 dark:text-surface-400 text-xs leading-tight line-clamp-2">{{ h.name }}</span>
                                        <span class="font-bold text-surface-900 dark:text-surface-0 text-lg leading-tight mt-0.5"><app-amount [value]="h.value" /></span>
                                        <span class="text-brand-700 dark:text-ochre-400 text-sm font-semibold mt-0.5">{{ h.pct }} %</span>
                                    } @else {
                                        <span class="text-surface-500 dark:text-surface-400 text-xs">Total actifs</span>
                                        <span class="font-bold text-surface-900 dark:text-surface-0 text-lg leading-tight mt-0.5"><app-amount [value]="totalAssets()" /></span>
                                    }
                                </div>
                            </div>
                        </div>
                    } @else {
                        <div class="flex-1 flex items-center justify-center text-surface-400 text-sm py-10">Aucun actif</div>
                    }
                </div>
            </div>

            <!-- Actifs section -->
            <div>
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-semibold text-surface-900 dark:text-surface-0 m-0">Actifs</h2>
                    @if (!loadingGroups()) {
                        <span class="text-surface-500 dark:text-surface-400 text-sm font-medium">
                            <app-amount [value]="totalAssets()" />
                        </span>
                    }
                </div>

                @if (loadingGroups()) {
                    <div class="space-y-3">
                        @for (i of [1,2,3,4,5]; track i) {
                            <div class="h-[76px] bg-surface-200 dark:bg-surface-700 rounded-2xl animate-pulse"></div>
                        }
                    </div>
                } @else if (categoryGroups().length === 0) {
                    <div class="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-surface-300 dark:border-surface-700">
                        <div class="w-16 h-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
                            <i class="pi pi-box text-2xl text-surface-400"></i>
                        </div>
                        <p class="text-surface-500 text-sm">Aucun actif enregistré</p>
                    </div>
                } @else {
                    <div class="space-y-3">
                        @for (group of categoryGroups(); track group.id) {
                            <button (click)="navigateToCategory(group.id)"
                                    class="w-full flex items-center justify-between p-3 sm:p-5 rounded-2xl bg-surface-0 dark:bg-surface-900 hover:bg-surface-50 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer group border border-surface-200 dark:border-surface-800 hover:border-brand-300/40 dark:hover:border-brand-700/50 text-left hover:shadow-sm">
                                <div class="flex items-center gap-4 min-w-0">
                                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                                         [style.background]="group.bg">
                                        <i [class]="group.icon" class="text-white text-lg"></i>
                                    </div>
                                    <div class="min-w-0">
                                        <div class="font-semibold text-surface-900 dark:text-surface-0">{{ group.label }}</div>
                                        <div class="text-surface-500 dark:text-surface-400 text-sm">
                                            {{ group.assetCount }} actif{{ group.assetCount > 1 ? 's' : '' }} · {{ groupSharePct(group) }}%
                                        </div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3 shrink-0 ml-4">
                                    <div class="text-right">
                                        <div class="font-bold text-surface-900 dark:text-surface-0 text-base">
                                            <app-amount [value]="group.totalValue" />
                                        </div>
                                        @if (group.totalDeltaAbs !== 0) {
                                            <div class="flex items-center justify-end gap-1 mt-0.5">
                                                <i class="pi text-xs"
                                                   [ngClass]="group.totalDeltaAbs >= 0 ? 'pi-arrow-up text-positive' : 'pi-arrow-down text-negative'"></i>
                                                <span class="text-sm font-medium"
                                                      [ngClass]="group.totalDeltaAbs >= 0 ? 'text-positive' : 'text-negative'">
                                                    <app-amount [value]="group.totalDeltaAbs" [prefix]="group.totalDeltaAbs >= 0 ? '+' : '-'" />
                                                    &nbsp;{{ group.totalDeltaPct | number:'1.2-2' }}%
                                                </span>
                                            </div>
                                        }
                                    </div>
                                    <i class="pi pi-chevron-right text-surface-400 text-sm group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors"></i>
                                </div>
                            </button>
                        }
                    </div>
                }
            </div>

            <!-- Passifs section -->
            <div>
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-semibold text-surface-900 dark:text-surface-0 m-0">Passifs</h2>
                    @if (!loadingDebts() && totalDebts() > 0) {
                        <span class="text-negative text-sm font-medium">
                            <app-amount [value]="totalDebts()" prefix="-" />
                        </span>
                    }
                </div>

                @if (loadingDebts()) {
                    <div class="h-[76px] bg-surface-200 dark:bg-surface-700 rounded-2xl animate-pulse"></div>
                } @else if (totalDebts() === 0) {
                    <div class="p-5 rounded-2xl border border-dashed border-surface-300 dark:border-surface-700 text-center text-surface-500 text-sm">
                        Aucune dette enregistrée
                    </div>
                } @else {
                    <button (click)="navigateToDebts()"
                            class="w-full flex items-center justify-between p-3 sm:p-5 rounded-2xl bg-surface-0 dark:bg-surface-900 hover:bg-surface-50 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer group border border-surface-200 dark:border-surface-800 hover:border-negative/30 text-left hover:shadow-sm">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                                 style="background: #B0463E">
                                <i class="pi pi-credit-card text-white text-lg"></i>
                            </div>
                            <div>
                                <div class="font-semibold text-surface-900 dark:text-surface-0">Emprunts</div>
                                <div class="text-surface-500 dark:text-surface-400 text-sm">
                                    {{ debtsCount() }} dette{{ debtsCount() > 1 ? 's' : '' }}
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 shrink-0">
                            <div class="font-bold text-negative text-base">
                                <app-amount [value]="totalDebts()" prefix="-" />
                            </div>
                            <i class="pi pi-chevron-right text-surface-400 text-sm group-hover:text-negative transition-colors"></i>
                        </div>
                    </button>
                }
            </div>

        </div>
    `
})
export class Patrimoine implements OnInit, OnDestroy {
    private router = inject(Router);
    private patrimoineService = inject(PatrimoineService);
    private apiService = inject(ApiService);
    private stateService = inject(AssetsStateService);
    private subscription?: Subscription;

    loadingGroups = signal(true);
    loadingDebts = signal(true);
    allAssets = signal<PatrimoineAssetItemDto[]>([]);
    debts = signal<Debt[]>([]);

    categoryGroups = computed<CategoryGroupCard[]>(() => {
        const assets = this.allAssets();
        return GROUPS
            .map(g => {
                const items = assets.filter(a => g.categories.includes(a.category ?? ''));
                if (items.length === 0) return null;
                const totalValue = items.reduce((s, i) => s + i.value, 0);
                const totalDeltaAbs = items.reduce((s, i) => s + (i.deltaAbs ?? 0), 0);
                const purchaseTotal = items.reduce((s, i) => s + Math.max(0, i.value - (i.deltaAbs ?? 0)), 0);
                const totalDeltaPct = purchaseTotal > 0 ? (totalDeltaAbs / purchaseTotal) * 100 : 0;
                return { ...g, totalValue, totalDeltaAbs, totalDeltaPct, assetCount: items.length } as CategoryGroupCard;
            })
            .filter((g): g is CategoryGroupCard => g !== null);
    });

    totalAssets = computed(() => this.allAssets().reduce((s, a) => s + a.value, 0));
    totalDebts = computed(() => this.debts().filter(d => d.type === 'i_owe').reduce((s, d) => s + d.current_amount, 0));
    debtsCount = computed(() => this.debts().filter(d => d.type === 'i_owe').length);

    // ── Currency exposure — how net worth splits across currencies ──
    // Shown only when the user actually holds more than one currency.
    currencyExposure = computed(() => {
        const byCcy: Record<string, number> = {};
        for (const a of this.allAssets()) {
            const c = (a.currency || 'EUR').toUpperCase();
            byCcy[c] = (byCcy[c] ?? 0) + a.value; // value is EUR base
        }
        const total = Object.values(byCcy).reduce((s, v) => s + v, 0);
        if (total <= 0) return [];
        return Object.entries(byCcy)
            .map(([currency, eur]) => ({ currency, eur, pct: Math.round((eur / total) * 100) }))
            .sort((a, b) => b.eur - a.eur);
    });
    hasMultiCurrency = computed(() => this.currencyExposure().length > 1);

    // ── Net-worth hero ──
    netWorth = computed(() => this.totalAssets() - this.totalDebts());
    assetDeltaAbs = computed(() => this.allAssets().reduce((s, a) => s + (a.deltaAbs ?? 0), 0));
    assetDeltaPct = computed(() => {
        const base = this.totalAssets() - this.assetDeltaAbs();
        return base > 0 ? (this.assetDeltaAbs() / base) * 100 : 0;
    });

    // ── Allocation donut (hover-driven center, no legend) ──
    hovered = signal<{ name: string; value: number; pct: number } | null>(null);
    private hoveredIdx = -1;

    donutData = computed(() => {
        const groups = this.categoryGroups();
        if (!groups.length) return null;
        const isDark = document.documentElement.classList.contains('app-dark');
        const sliceBorder = isDark ? '#0F1A2E' : '#ffffff';
        return {
            labels: groups.map(g => g.label),
            datasets: [{
                data: groups.map(g => g.totalValue),
                backgroundColor: groups.map((_, i) => DONUT_COLORS[i % DONUT_COLORS.length]),
                borderColor: sliceBorder,
                borderWidth: 2,
                hoverOffset: 10,
                hoverBorderColor: sliceBorder,
            }],
        };
    });

    donutOptions: any = {
        cutout: '72%',
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        onHover: (_e: any, els: any[]) => {
            const idx = els && els.length ? els[0].index : -1;
            if (idx === this.hoveredIdx) return;
            this.hoveredIdx = idx;
            const groups = this.categoryGroups();
            const g = idx >= 0 ? groups[idx] : null;
            this.hovered.set(g ? { name: g.label, value: g.totalValue, pct: this.groupSharePct(g) } : null);
        },
    };

    groupSharePct(group: CategoryGroupCard): number {
        const tot = this.totalAssets();
        return tot > 0 ? Math.round((group.totalValue / tot) * 100) : 0;
    }

    async ngOnInit() {
        await Promise.all([this.loadAssets(), this.loadDebts()]);

        this.subscription = this.stateService.assetsUpdated$.subscribe(() => {
            this.loadAssets();
        });
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

    private async loadAssets() {
        this.loadingGroups.set(true);
        try {
            const items = await this.patrimoineService.getAssets();
            this.allAssets.set(items);
        } finally {
            this.loadingGroups.set(false);
        }
    }

    private async loadDebts() {
        this.loadingDebts.set(true);
        try {
            const debts = await firstValueFrom(this.apiService.getDebts());
            this.debts.set(debts);
        } catch {
            this.debts.set([]);
        } finally {
            this.loadingDebts.set(false);
        }
    }

    navigateToCategory(groupId: string) {
        const url = this.router.url;
        const match = url.match(/^\/(fr|en)\//);
        const lang = match ? match[1] : 'fr';
        this.router.navigate(['/', lang, 'pages', 'patrimoine', 'category', groupId]);
    }

    navigateToDebts() {
        const url = this.router.url;
        const match = url.match(/^\/(fr|en)\//);
        const lang = match ? match[1] : 'fr';
        this.router.navigate(['/', lang, 'pages', 'debts']);
    }
}
