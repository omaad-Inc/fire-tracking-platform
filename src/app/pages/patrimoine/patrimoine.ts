import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { PatrimoineProgress } from './components/patrimoineprogress';
import { AllocationDonutComponent } from './components/allocation-donut';
import { AllocationTicksComponent } from './components/allocation-ticks';
import { TooltipModule } from 'primeng/tooltip';
import { I18nService } from '../../i18n/i18n.service';
import { PatrimoineService, PatrimoineAssetItemDto } from '../service/patrimoine.service';
import { AssetsStateService } from '../service/assets-state.service';
import { Debt } from '../../core/services/api.service';
import { NavService } from '../../core/services/nav.service';
import { AppAmountComponent } from '../../core/components/app-amount.component';
import { CurrencyService } from '../../core/services/currency.service';
import { LoadErrorComponent } from '../../core/components/load-error.component';
import { SectionHeaderComponent, UiCardComponent } from '../../core/ui';
import { chartTheme } from '../../core/theme/chart-theme';
import { LayoutService } from '../../layout/service/layout.service';

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

// All asset groups share the same solid brand navy, the icon glyph
// differentiates the category, not the color. (Phase 2 identity rule.)
const GROUP_BG = '#1A2740';

// Allocation-donut slice colors come from the central chart palette
// (chartTheme().categorical), the single validated source for both modes.
// No local hex arrays: see core/theme/chart-theme.ts.

// Répartition colors come from the OMAAD brand categorical (chartTheme, the
// ochre-anchored jewel set validated with the dataviz six-checks in both
// modes) — not the Finary reference pastels. Fixed slot per category so color
// follows the entity, never its rank; literal navy #1A2740 is deliberately
// absent (fails the lightness band on white and vanishes on navy dark cards —
// steel blue is navy's chart-safe voice). 'other' takes the muted neutral.
const GROUP_SLOT: Record<string, number> = {
    real_estate:  0,   // ochre — the brand anchor
    stocks_bonds: 1,   // steel blue (navy's voice)
    savings:      2,   // gold
    crypto:       3,   // terracotta
    tontine:      4,   // teal
    mobile_money: 5,   // violet
};

// Group labels are resolved via i18n at render time (patrimoine.groups.<id>).
const GROUPS = [
    { id: 'real_estate',    icon: 'pi pi-building',   bg: GROUP_BG, categories: ['real_estate'] },
    { id: 'stocks_bonds',   icon: 'pi pi-chart-line', bg: GROUP_BG, categories: ['stocks_brvm', 'stocks_intl', 'fcp', 'bonds'] },
    { id: 'savings',        icon: 'pi pi-dollar',     bg: GROUP_BG, categories: ['savings_account', 'cash', 'life_insurance', 'retirement'] },
    { id: 'crypto',         icon: 'pi pi-bitcoin',    bg: GROUP_BG, categories: ['crypto'] },
    { id: 'tontine',        icon: 'pi pi-users',      bg: GROUP_BG, categories: ['tontine'] },
    { id: 'mobile_money',   icon: 'pi pi-mobile',     bg: GROUP_BG, categories: ['mobile_money'] },
    { id: 'other',          icon: 'pi pi-box',        bg: GROUP_BG, categories: ['business', 'vehicle', 'collectibles', 'commodities', 'other'] },
];

@Component({
    selector: 'app-patrimoine',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, RouterLink, PatrimoineProgress, AllocationDonutComponent, AllocationTicksComponent, TooltipModule,
              AppAmountComponent, LoadErrorComponent, SectionHeaderComponent, UiCardComponent],
    template: `
        <div class="flex flex-col gap-4 md:gap-6 lg:gap-8">

            <!-- Net-worth hero -->
            <app-ui-card padding="md" innerClass="sm:p-6">
                <div class="flex flex-wrap items-end justify-between gap-4">
                    <div class="min-w-0">
                        <span class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ i18n.t('patrimoine.netWorth') }}</span>
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
                            <div class="text-surface-500 dark:text-surface-400 text-xs mb-0.5">{{ i18n.t('patrimoine.assets.title') }}</div>
                            <div class="font-semibold text-surface-900 dark:text-surface-0"><app-amount [value]="totalAssets()" /></div>
                        </div>
                        <div>
                            <div class="text-surface-500 dark:text-surface-400 text-xs mb-0.5">{{ i18n.t('patrimoine.liabilities') }}</div>
                            <div class="font-semibold" [ngClass]="totalDebts() > 0 ? 'text-negative' : 'text-surface-900 dark:text-surface-0'">
                                <app-amount [value]="totalDebts()" [prefix]="totalDebts() > 0 ? '-' : ''" />
                            </div>
                        </div>
                        <!-- Markets hub (P2-3): the same globe the mobile app puts on this
                             tab; on mobile it is the only way to the market hub. -->
                        <a [routerLink]="nav.link('pages', 'marches')" data-testid="patrimoine-markets-link"
                           class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium omaad-press
                                  bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors">
                            <i class="pi pi-globe text-xs" aria-hidden="true"></i>{{ i18n.t('menu.markets') }}
                        </a>
                    </div>
                </div>

                @if (hasMultiCurrency()) {
                    <!-- Currency exposure, where net worth sits across currencies -->
                    <div class="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
                        <div class="text-surface-500 dark:text-surface-400 text-xs mb-2">{{ i18n.t('patrimoine.currencyExposure') }}</div>
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
            </app-ui-card>

            <!-- Progression + allocation donut -->
            <!-- Strict 50/50 (minmax(0,1fr) via grid-cols-2): plain 1fr would let
                 content min-width break the ratio. Stack ≤1150px per reference. -->
            <div class="grid grid-cols-1 min-[1150px]:grid-cols-2 gap-5 items-stretch">
                <app-patrimoine-progress />
                <app-ui-card padding="none" innerClass="h-full flex flex-col p-4 md:px-[26px] md:py-[22px]">
                    <!-- Head: Actifs/Passifs tabs + grouping pill + view toggle (reference) -->
                    <div class="flex items-start justify-between border-b border-surface-200 dark:border-surface-800">
                        <div class="flex gap-7">
                            @for (tab of ['assets', 'passifs']; track tab) {
                                <button type="button" (click)="allocTab.set($any(tab))"
                                        class="relative pt-1 pb-3.5 text-[1.05rem] transition-colors"
                                        [ngClass]="allocTab() === tab
                                            ? 'font-semibold text-surface-900 dark:text-surface-0 after:absolute after:left-0 after:right-0 after:-bottom-px after:h-[2.5px] after:bg-surface-900 dark:after:bg-surface-0'
                                            : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'">
                                    {{ i18n.t(tab === 'assets' ? 'patrimoine.assetsTab' : 'patrimoine.liabilities') }}
                                </button>
                            }
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="h-[38px] p-[3px] flex items-center rounded-full bg-surface-100 dark:bg-surface-800">
                                <button type="button" (click)="allocView.set('chart')" [attr.aria-label]="i18n.t('patrimoine.viewChart')"
                                        class="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                                        [ngClass]="allocView() === 'chart' ? 'bg-surface-200 dark:bg-surface-600 text-surface-900 dark:text-surface-0' : 'text-surface-500 dark:text-surface-400'">
                                    <i class="pi pi-chart-pie text-sm" aria-hidden="true"></i>
                                </button>
                                <button type="button" (click)="allocView.set('table')" [attr.aria-label]="i18n.t('patrimoine.viewTable')"
                                        class="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                                        [ngClass]="allocView() === 'table' ? 'bg-surface-200 dark:bg-surface-600 text-surface-900 dark:text-surface-0' : 'text-surface-500 dark:text-surface-400'">
                                    <i class="pi pi-table text-sm" aria-hidden="true"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    @if (allocRows().length) {
                        @if (allocView() === 'chart') {
                            <!-- Body grid (reference): compact 200px donut column, list dominates.
                                 ≤1150 stacked cards → 44/56; ≤860 donut stacks above the list. -->
                            <div class="flex-1 min-h-0 grid grid-cols-1 min-[861px]:grid-cols-[44fr_56fr] min-[1150px]:grid-cols-[200px_minmax(0,1fr)]
                                        gap-2 min-[861px]:gap-[22px] pt-[18px] items-center">
                                <app-allocation-donut [segments]="allocRows()" [ariaLabel]="i18n.t('patrimoine.allocation')"
                                        class="w-[220px] min-[861px]:w-[min(280px,90%)] min-[1150px]:w-[200px] mx-auto">
                                    <span class="text-[13px] font-semibold text-surface-900 dark:text-surface-0 tabular-nums"><app-amount [value]="allocTotal()" /></span>
                                    <span class="text-[11px] text-surface-500 dark:text-surface-400 mt-0.5">
                                        {{ i18n.t(allocTab() === 'assets' ? 'patrimoine.allocationTotal' : 'patrimoine.allocationTotalDebts') }}
                                    </span>
                                </app-allocation-donut>
                                <!-- Rows: [name | ticks | %], bounded flex (42–62px) so the list
                                     fills the body with zero dead space, never space-between. -->
                                <ul class="min-w-0 self-stretch flex flex-col justify-center min-h-0">
                                    @for (row of allocRows(); track row.label) {
                                        <!-- name | ticks | % — the TICKS column is the flexible one.
                                             (An fr-based name column collapses it: fr math hands the
                                             name 32/33 of free space; a 32-percent cap fixes that.) -->
                                        <li class="grid grid-cols-[minmax(0,1fr)_52px] min-[861px]:grid-cols-[minmax(100px,32%)_minmax(0,1fr)_52px]
                                                   items-center gap-x-3.5 flex-1 min-h-[42px] max-h-[62px]"
                                            [pTooltip]="row.tooltip" tooltipPosition="left">
                                            <span class="text-sm truncate text-surface-900 dark:text-surface-100">{{ row.label }}</span>
                                            <app-allocation-ticks class="max-[860px]:!hidden" [pct]="row.share" [color]="row.color" />
                                            <span class="text-[13px] text-surface-500 dark:text-surface-400 text-right tabular-nums">{{ row.pct }} %</span>
                                        </li>
                                    }
                                </ul>
                            </div>
                        } @else {
                            <!-- Table view: the amounts, in full -->
                            <ul class="flex-1 min-h-0 flex flex-col justify-center pt-[18px]">
                                @for (row of allocRows(); track row.label) {
                                    <li class="grid grid-cols-[14px_minmax(0,1fr)_auto_52px] items-center gap-x-3 flex-1 min-h-[42px] max-h-[62px]">
                                        <span class="w-2.5 h-2.5 rounded-full" [style.backgroundColor]="row.color" aria-hidden="true"></span>
                                        <span class="text-sm truncate text-surface-900 dark:text-surface-100">{{ row.label }}</span>
                                        <app-amount [value]="row.amount" class="text-sm font-semibold text-surface-900 dark:text-surface-0 tabular-nums" />
                                        <span class="text-[13px] text-surface-500 dark:text-surface-400 text-right tabular-nums">{{ row.pct }} %</span>
                                    </li>
                                }
                            </ul>
                        }
                    } @else if (allocTab() === 'passifs') {
                        <div class="flex-1 flex items-center justify-center py-10">
                            <span class="text-surface-400 text-sm">{{ i18n.t('patrimoine.noDebtsRecorded') }}</span>
                        </div>
                    } @else {
                        <div class="flex-1 flex flex-col items-center justify-center gap-3 text-center py-10">
                            <span class="text-surface-400 text-sm">{{ i18n.t('patrimoine.noAssetsShort') }}</span>
                            <button (click)="navigateToAddAsset()"
                                    class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold transition-colors">
                                <i class="pi pi-plus text-xs"></i>{{ i18n.t('patrimoine.addFirstAsset') }}
                            </button>
                        </div>
                    }
                </app-ui-card>
            </div>

            <!-- Actifs section -->
            <div>
                <app-section-header [title]="i18n.t('patrimoine.assets.title')">
                    @if (!loadingGroups()) {
                        <span actions class="text-surface-500 dark:text-surface-400 text-sm font-medium">
                            <app-amount [value]="totalAssets()" />
                        </span>
                    }
                </app-section-header>

                <!-- Optimistic AI writes (PERF-3): an asset the assistant is
                     creating right now, rendered the moment its tool call
                     streams and replaced by the real row when the write lands
                     (or removed if it fails; the chat card carries the error). -->
                @if (aiPendingAssets().length > 0) {
                    <div class="space-y-3 mb-3">
                        @for (p of aiPendingAssets(); track p.cardId) {
                            <div class="w-full flex items-center justify-between p-3 sm:p-5 rounded-2xl bg-surface-0 dark:bg-surface-900 border border-dashed border-brand-300/60 dark:border-brand-700/60">
                                <div class="flex items-center gap-4 min-w-0">
                                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-brand-100 dark:bg-brand-700/20 animate-pulse">
                                        <i class="pi pi-sparkles text-brand-700 dark:text-ochre-400 text-lg"></i>
                                    </div>
                                    <div class="min-w-0">
                                        <div class="font-semibold text-surface-900 dark:text-surface-0 truncate">
                                            {{ p.label || i18n.t('patrimoine.aiPendingLabel') }}
                                        </div>
                                        <div class="text-surface-500 dark:text-surface-400 text-sm">{{ i18n.t('patrimoine.aiPending') }}</div>
                                    </div>
                                </div>
                                <i class="pi pi-spin pi-spinner text-surface-400 shrink-0 ml-4"></i>
                            </div>
                        }
                    </div>
                }

                @if (loadingGroups()) {
                    <div class="space-y-3">
                        @for (i of [1,2,3,4,5]; track i) {
                            <div class="h-[76px] bg-surface-200 dark:bg-surface-700 rounded-2xl animate-pulse"></div>
                        }
                    </div>
                } @else if (assetsLoadError()) {
                    <app-load-error (retry)="retryAssets()" />
                } @else if (categoryGroups().length === 0 && aiPendingAssets().length === 0) {
                    <!-- Activation moment: an empty portfolio must drive the user
                         straight into the add-asset wizard, not dead-end. -->
                    <div class="flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl border border-dashed border-surface-300 dark:border-surface-700">
                        <div class="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center mb-4">
                            <i class="pi pi-box text-2xl text-brand-700 dark:text-ochre-400"></i>
                        </div>
                        <h3 class="text-subheading font-semibold text-surface-900 dark:text-surface-0 mb-1">{{ i18n.t('patrimoine.emptyStateTitle') }}</h3>
                        <p class="text-surface-500 dark:text-surface-400 text-sm max-w-sm mb-5">{{ i18n.t('patrimoine.emptyStateDesc') }}</p>
                        <button (click)="navigateToAddAsset()"
                                class="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold transition-colors">
                            <i class="pi pi-plus text-xs"></i>{{ i18n.t('patrimoine.addFirstAsset') }}
                        </button>
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
                                            {{ group.assetCount }} {{ group.assetCount > 1 ? i18n.t('patrimoine.units.assetOther') : i18n.t('patrimoine.units.assetOne') }} · {{ groupSharePct(group) }}%
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
                <app-section-header [title]="i18n.t('patrimoine.liabilities')">
                    @if (!loadingDebts() && totalDebts() > 0) {
                        <span actions class="text-negative text-sm font-medium">
                            <app-amount [value]="totalDebts()" prefix="-" />
                        </span>
                    }
                </app-section-header>

                @if (loadingDebts()) {
                    <div class="h-[76px] bg-surface-200 dark:bg-surface-700 rounded-2xl animate-pulse"></div>
                } @else if (debtsLoadError()) {
                    <app-load-error (retry)="retryDebts()" />
                } @else if (totalDebts() === 0) {
                    <div class="p-5 rounded-2xl border border-dashed border-surface-300 dark:border-surface-700 text-center text-surface-500 text-sm">
                        {{ i18n.t('patrimoine.noDebtsRecorded') }}
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
                                <div class="font-semibold text-surface-900 dark:text-surface-0">{{ i18n.t('patrimoine.loans') }}</div>
                                <div class="text-surface-500 dark:text-surface-400 text-sm">
                                    {{ debtsCount() }} {{ debtsCount() > 1 ? i18n.t('patrimoine.units.debtOther') : i18n.t('patrimoine.units.debtOne') }}
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
    protected nav = inject(NavService);
    i18n = inject(I18nService);
    private patrimoineService = inject(PatrimoineService);
    private currencyService = inject(CurrencyService);
    private stateService = inject(AssetsStateService);
    private layoutService = inject(LayoutService);
    private subscription?: Subscription;

    /** Optimistic AI asset creates (PERF-3): rendered as pending rows above
     *  the category groups while the assistant's write is in flight. */
    readonly aiPendingAssets = this.stateService.pendingAiAssets;

    loadingGroups = signal(true);
    loadingDebts = signal(true);
    assetsLoadError = signal(false);
    debtsLoadError = signal(false);
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
                const label = this.i18n.t('patrimoine.groups.' + g.id);
                return { ...g, label, totalValue, totalDeltaAbs, totalDeltaPct, assetCount: items.length } as CategoryGroupCard;
            })
            .filter((g): g is CategoryGroupCard => g !== null);
    });

    totalAssets = computed(() => this.allAssets().reduce((s, a) => s + a.value, 0));
    // Debts are stored in their native currency, convert to EUR base to sum.
    totalDebts = computed(() => this.debts().filter(d => d.type === 'i_owe')
        .reduce((s, d) => s + this.currencyService.toEurFromNative(d.current_amount, d.currency), 0));
    debtsCount = computed(() => this.debts().filter(d => d.type === 'i_owe').length);

    // ── Currency exposure, how net worth splits across currencies ──
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

    // ── Répartition (omaad-dashboard-v2 reference port) ──
    allocTab = signal<'assets' | 'passifs'>('assets');
    allocView = signal<'chart' | 'table'>('chart');

    /** Rows for the active tab, sorted desc. Everything derives from the live
     *  signals: share = raw %, pct = display label ("<1" under 0.5%), tooltip
     *  carries the amount (chart-view rows intentionally hide amounts). */
    allocRows = computed(() => {
        // Reactive to the theme toggle: isDarkTheme() is a signal, so a flip
        // recolors slices/ticks with the mode's validated brand set.
        const t = chartTheme(this.layoutService.isDarkTheme());
        const segs = this.allocTab() === 'assets'
            ? this.categoryGroups().map(g => ({
                  label: g.label,
                  amount: g.totalValue,
                  color: g.id in GROUP_SLOT ? t.categorical[GROUP_SLOT[g.id]] : t.series.muted,
              }))
            : this.debts().filter(d => d.type === 'i_owe').map((d, i) => ({
                  label: d.name,
                  amount: this.currencyService.toEurFromNative(d.current_amount, d.currency),
                  color: t.categorical[i % t.categorical.length],
              }));
        const total = segs.reduce((s, x) => s + x.amount, 0);
        return segs
            .sort((a, b) => b.amount - a.amount)
            .map(seg => {
                const share = total > 0 ? (seg.amount / total) * 100 : 0;
                return {
                    ...seg,
                    share,
                    pct: this.sharePctLabel(share),
                    tooltip: `${seg.label} · ${this.currencyService.format(seg.amount, 0)}`,
                };
            });
    });

    allocTotal = computed(() => this.allocTab() === 'assets' ? this.totalAssets() : this.totalDebts());

    /** "0 %" is a lie for a non-empty category (reference rule): <0.5 → "<1". */
    private sharePctLabel(share: number): string {
        if (share > 0 && share < 0.5) return '<1';
        if (share > 0 && share < 1) return '1';
        return String(Math.round(share));
    }

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
        // No-flash revisit: render the cached list synchronously and only show
        // the skeleton on a cold first load (nothing cached yet). The awaited
        // getAssets() still refreshes in the background (stale-while-revalidate).
        const cached = this.patrimoineService.getCachedAssets();
        if (cached.length) this.allAssets.set(cached);
        this.loadingGroups.set(!this.patrimoineService.hasCachedAssets());
        try {
            const items = await this.patrimoineService.getAssets();
            this.allAssets.set(items);
            this.assetsLoadError.set(false);
        } catch (error) {
            console.error('Error loading assets:', error);
            // Explicit error+retry, a fake-empty portfolio reads as data loss.
            if (this.allAssets().length === 0) this.assetsLoadError.set(true);
        } finally {
            this.loadingGroups.set(false);
        }
    }

    private async loadDebts() {
        // No-flash revisit: hydrate from the cached debt list synchronously and
        // only skeleton on a cold first load; getDebts() refreshes in the bg.
        if (this.patrimoineService.hasCachedDebts()) this.debts.set(this.patrimoineService.getCachedDebts());
        this.loadingDebts.set(!this.patrimoineService.hasCachedDebts());
        try {
            const debts = await this.patrimoineService.getDebts();
            this.debts.set(debts);
            this.debtsLoadError.set(false);
        } catch (error) {
            console.error('Error loading debts:', error);
            // Explicit error+retry, "no debts" on failure understates liabilities.
            if (this.debts().length === 0) this.debtsLoadError.set(true);
        } finally {
            this.loadingDebts.set(false);
        }
    }

    retryAssets() {
        this.loadAssets();
    }

    retryDebts() {
        this.loadDebts();
    }

    navigateToCategory(groupId: string) {
        this.nav.go('pages', 'patrimoine', 'category', groupId);
    }

    navigateToDebts() {
        this.nav.go('pages', 'debts');
    }

    navigateToAddAsset() {
        this.nav.go('pages', 'patrimoine', 'add-asset');
    }
}
