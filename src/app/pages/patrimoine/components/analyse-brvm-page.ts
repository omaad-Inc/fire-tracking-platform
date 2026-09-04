import { ChangeDetectorRef, Component, OnInit, PLATFORM_ID, effect, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { ApiService, BrvmPortfolio, BrvmPortfolioAllocation, BrvmPortfolioPoint } from '../../../core/services/api.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { NavService } from '../../../core/services/nav.service';

/** The sleeve's own range bar, the mobile Analyse bar verbatim: BRVM data is
 *  DAILY (session closes), so a one-week window is real here, unlike the
 *  snapshot-based progression charts that share CHART_RANGES (month steps).
 *  `days: 0` is Max. Opens on 1M like every other chart (owner decision). */
const SLEEVE_RANGES: readonly { key: 'w1' | 'm1' | 'm6' | 'y1' | 'max'; days: number }[] = [
    { key: 'w1', days: 7 },
    { key: 'm1', days: 31 },
    { key: 'm6', days: 183 },
    { key: 'y1', days: 365 },
    { key: 'max', days: 0 },
];
const DEFAULT_SLEEVE_DAYS = 31;
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { LoadErrorComponent } from '../../../core/components/load-error.component';
import { chartTheme } from '../../../core/theme/chart-theme';
import { LayoutService } from '../../../layout/service/layout.service';
import { I18nService } from '../../../i18n/i18n.service';
import { MarketChangeComponent } from '../../marches/components/market-primitives';
import { MarketService } from '../../service/market.service';
import { AllocationDonutComponent, AllocationSegment } from './allocation-donut';
import { AllocationTicksComponent } from './allocation-ticks';

interface AllocRow extends AllocationSegment {
    ticker: string;
    kind: 'stock' | 'fcp';
    share: number;
    pct: string;
    tooltip: string;
}

/**
 * Analyse BRVM — the whole BRVM sleeve (stocks at session close + FCP/OPCVM at
 * published VL), the web twin of the mobile /analyse-brvm screen: total value
 * with its real series, window performance, unrealized P&L and the per-title
 * répartition. Reached from the chart pill in the Patrimoine hero.
 *
 * Money rules: the API speaks XOF (the trading currency); every figure is
 * converted to EUR base exactly once here and handed to app-amount, which
 * renders the display currency. Honesty rules: BRVM data is end-of-day and
 * fund VLs are weekly, so there is no intraday; only UNREALIZED P&L is shown
 * (holdings are single lots, sells are not tracked).
 *
 * The Pro gate is server-side: a 403 turns the page into the upsell card, the
 * same plans?tier=pro idiom settings and the assistant notice strip use.
 */
@Component({
    selector: 'app-analyse-brvm-page',
    standalone: true,
    imports: [CommonModule, RouterModule, ChartModule, TooltipModule, AppAmountComponent, LoadErrorComponent,
              MarketChangeComponent, AllocationDonutComponent, AllocationTicksComponent],
    styles: [`
        /* Same fix as the category detail: PrimeNG p-chart wraps the canvas in
           an unstyled div; complete the height chain so the plot fills the zone. */
        :host ::ng-deep .brvm-plot p-chart { display: block; width: 100%; height: 100%; }
        :host ::ng-deep .brvm-plot p-chart > div { width: 100%; height: 100%; }
    `],
    template: `
        <!-- ── Header: back + identity, the category-detail idiom ── -->
        <div class="flex items-center gap-4 mb-6">
            <button (click)="goBack()" [attr.aria-label]="i18n.t('common.back')"
                    class="w-10 h-10 flex items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-all cursor-pointer shrink-0">
                <i class="pi pi-arrow-left text-surface-600 dark:text-surface-300" aria-hidden="true"></i>
            </button>
            <div class="flex items-center gap-4 min-w-0">
                <div class="hidden sm:flex w-14 h-14 rounded-2xl items-center justify-center shadow-sm shrink-0 bg-brand-700">
                    <i class="pi pi-chart-line text-white text-2xl" aria-hidden="true"></i>
                </div>
                <div class="min-w-0">
                    <h1 class="text-xl sm:text-3xl font-extrabold text-surface-900 dark:text-surface-0 m-0 leading-tight">{{ i18n.t('patrimoine.brvmAnalysis.title') }}</h1>
                    <p class="text-sm text-surface-500 dark:text-surface-400 m-0 mt-0.5">{{ scopeLabel }}</p>
                </div>
            </div>
        </div>

        @if (loading) {
            <div class="animate-pulse space-y-5">
                <div class="grid grid-cols-1 min-[1150px]:grid-cols-2 gap-5">
                    <div class="h-[380px] bg-surface-200 dark:bg-surface-700 rounded-2xl"></div>
                    <div class="h-[380px] bg-surface-200 dark:bg-surface-700 rounded-2xl"></div>
                </div>
                <div class="h-72 bg-surface-200 dark:bg-surface-700 rounded-2xl"></div>
            </div>

        } @else if (gated) {
            <!-- Pro gate closed: the upsell, never a broken chart. -->
            <div class="max-w-xl rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-card p-6">
                <div class="flex items-center gap-3 mb-3">
                    <span class="w-9 h-9 rounded-xl grid place-items-center bg-ochre-100 dark:bg-ochre-900/30 shrink-0">
                        <i class="pi pi-lock text-ochre-700 dark:text-ochre-300 text-sm" aria-hidden="true"></i>
                    </span>
                    <h2 class="text-base font-bold text-surface-900 dark:text-surface-0 m-0">{{ i18n.t('patrimoine.brvmAnalysis.title') }}</h2>
                </div>
                <p class="text-sm text-surface-600 dark:text-surface-300 leading-relaxed m-0 mb-5">{{ i18n.t('patrimoine.brvmAnalysis.upsellDesc') }}</p>
                <a [routerLink]="nav.link('pages', 'plans')" [queryParams]="{ tier: 'pro' }" data-testid="analyse-brvm-upsell"
                   class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ochre-500 hover:bg-ochre-400 text-warm-900 text-sm font-bold transition-all no-underline">
                    <i class="pi pi-crown text-xs" aria-hidden="true"></i>{{ i18n.t('patrimoine.brvmAnalysis.upsellCta') }}
                </a>
            </div>

        } @else if (loadError || !data) {
            <app-load-error (retry)="reload()" />

        } @else if (data.holdings_count === 0) {
            @if (data.untracked.length) {
                <ng-container *ngTemplateOutlet="untrackedTpl" />
            }
            <!-- Nothing in the sleeve yet: say what belongs here and where to add it. -->
            <div class="max-w-xl rounded-2xl bg-surface-0 dark:bg-surface-900 border border-dashed border-surface-300 dark:border-surface-700 p-6">
                <h2 class="text-base font-bold text-surface-900 dark:text-surface-0 m-0 mb-2">{{ i18n.t('patrimoine.brvmAnalysis.emptyTitle') }}</h2>
                <p class="text-sm text-surface-600 dark:text-surface-300 leading-relaxed m-0 mb-5">{{ i18n.t('patrimoine.brvmAnalysis.emptyDesc') }}</p>
                <a [routerLink]="nav.link('pages', 'patrimoine', 'add-asset')" data-testid="analyse-brvm-empty-cta"
                   class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-surface-300 dark:border-surface-600 text-sm font-semibold text-surface-800 dark:text-surface-100 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors no-underline">
                    <i class="pi pi-plus text-xs" aria-hidden="true"></i>{{ i18n.t('patrimoine.brvmAnalysis.emptyCta') }}
                </a>
            </div>

        } @else {
            @if (data.untracked.length) {
                <ng-container *ngTemplateOutlet="untrackedTpl" />
            }
            <!-- ── Row 1: value curve | performance + P&L ── -->
            <div class="grid grid-cols-1 min-[1150px]:grid-cols-2 gap-5 items-stretch mb-5">

                <!-- Valeur totale, with the range chips and the real series -->
                <div class="relative overflow-hidden rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-card
                            p-4 md:px-[26px] md:py-[22px] h-[340px] min-[861px]:h-[380px] flex flex-col" data-testid="analyse-brvm-value-card">
                    <div class="relative flex flex-wrap items-center justify-between mb-2 gap-x-3 gap-y-2">
                        <span class="text-base font-semibold text-surface-900 dark:text-surface-0">{{ i18n.t('patrimoine.brvmAnalysis.totalValue') }}</span>
                        <div class="flex items-center gap-1 ml-auto">
                            @for (r of ranges; track r.days) {
                                <button (click)="changeRange(r.days)"
                                        class="px-2.5 py-1 text-xs rounded-lg transition-colors"
                                        [ngClass]="selectedDays === r.days
                                            ? 'bg-brand-700 text-white dark:bg-surface-700 dark:text-surface-0'
                                            : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'">
                                    {{ r.label }}
                                </button>
                            }
                        </div>
                    </div>
                    <div class="relative">
                        <div class="flex items-end gap-2 flex-wrap">
                            <app-amount [value]="totalEur" class="text-surface-900 dark:text-surface-0 font-bold text-2xl" />
                            @if (asOfLabel) {
                                <span class="text-xs text-surface-500 dark:text-surface-400 pb-1">{{ asOfLabel }}</span>
                            }
                        </div>
                        @if (windowAbsEur !== null) {
                            <div class="flex items-center flex-wrap gap-2 mt-0.5">
                                <app-amount [value]="Math.abs(windowAbsEur)" [prefix]="windowAbsEur < 0 ? '−' : '+'"
                                            class="text-sm font-semibold"
                                            [ngClass]="windowAbsEur >= 0 ? 'text-positive' : 'text-negative'" />
                                <app-market-change [percent]="windowPct" />
                            </div>
                        }
                    </div>
                    @if (lineData) {
                        <div class="relative flex-1 min-h-0 mt-3.5">
                            <div class="brvm-plot absolute inset-0">
                                <p-chart type="line" [data]="lineData" [options]="lineOptions" class="block w-full h-full" />
                            </div>
                        </div>
                        <div class="relative h-6 ml-[52px] text-[11px] text-surface-400 dark:text-surface-500">
                            <span class="absolute left-0 bottom-0.5">{{ xStart }}</span>
                            <span class="absolute left-1/2 -translate-x-1/2 bottom-0.5">{{ xMid }}</span>
                            <span class="absolute right-0 bottom-0.5">{{ xEnd }}</span>
                        </div>
                    } @else {
                        <div class="relative flex-1 min-h-0 flex flex-col items-center justify-center text-center">
                            <i class="pi pi-chart-line text-3xl text-surface-400 mb-3" aria-hidden="true"></i>
                            <p class="text-surface-500 text-sm m-0">{{ i18n.t('patrimoine.noDataYet') }}</p>
                        </div>
                    }
                </div>

                <!-- Performance + unrealized P&L: the mobile app's side-by-side pair
                     on phones and tablets; stacked beside the chart on desktop. -->
                <div class="grid grid-cols-2 min-[1150px]:grid-cols-1 min-[1150px]:grid-rows-2 gap-3 sm:gap-5 h-full">
                    <div class="rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-card p-4 sm:p-5 md:px-[26px] flex flex-col justify-center min-w-0" data-testid="analyse-brvm-performance">
                        <p class="text-xs sm:text-sm text-surface-500 dark:text-surface-400 m-0 mb-1">{{ i18n.t('patrimoine.brvmAnalysis.performance') }}</p>
                        <div class="text-2xl sm:text-3xl font-extrabold tabular-nums leading-tight"
                             [ngClass]="windowPct === null ? 'text-surface-400' : windowPct > 0 ? 'text-positive' : windowPct < 0 ? 'text-negative' : 'text-surface-900 dark:text-surface-0'">
                            {{ windowPct === null ? '—' : (windowPct > 0 ? '+' : windowPct < 0 ? '−' : '') + market.pct(Math.abs(windowPct)) }}
                        </div>
                        <p class="text-xs text-surface-500 dark:text-surface-400 m-0 mt-1">{{ i18n.t('patrimoine.brvmAnalysis.performanceSub') }}</p>
                    </div>
                    <div class="rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-card p-4 sm:p-5 md:px-[26px] flex flex-col justify-center min-w-0" data-testid="analyse-brvm-unrealized">
                        <p class="text-xs sm:text-sm text-surface-500 dark:text-surface-400 m-0 mb-1">{{ i18n.t('patrimoine.brvmAnalysis.unrealized') }}</p>
                        @if (gainEur === null) {
                            <div class="text-2xl sm:text-3xl font-extrabold text-surface-400 leading-tight">—</div>
                            <p class="text-xs text-surface-500 dark:text-surface-400 m-0 mt-1">{{ i18n.t('patrimoine.brvmAnalysis.costUnknown') }}</p>
                        } @else {
                            <div class="flex items-center gap-x-3 gap-y-0.5 flex-wrap">
                                <app-amount [value]="Math.abs(gainEur)" [prefix]="gainEur < 0 ? '−' : '+'"
                                            class="text-2xl sm:text-3xl font-extrabold tabular-nums leading-tight"
                                            [ngClass]="gainEur > 0 ? 'text-positive' : gainEur < 0 ? 'text-negative' : 'text-surface-900 dark:text-surface-0'" />
                                <app-market-change [percent]="data.unrealized_gain_percent" size="md" />
                            </div>
                            <p class="text-xs text-surface-500 dark:text-surface-400 m-0 mt-1">
                                {{ i18n.t('patrimoine.brvmAnalysis.unrealizedSub') }}
                                @if (data.costed_count > 0) { · {{ titlesLabel(data.costed_count) }} }
                            </p>
                        }
                    </div>
                </div>
            </div>

            <!-- ── Row 2: répartition, donut + rows (the patrimoine idiom) ── -->
            <div class="rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-card p-4 md:px-[26px] md:py-[22px]" data-testid="analyse-brvm-allocation">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-base font-semibold text-surface-900 dark:text-surface-0">{{ i18n.t('patrimoine.allocation') }}</span>
                    <span class="text-surface-500 dark:text-surface-400 text-sm">{{ titlesLabel(allocRows.length) }}</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)] min-[1150px]:grid-cols-[220px_minmax(0,1fr)] gap-4 md:gap-8 pt-2 items-center">
                    <app-allocation-donut [segments]="allocRows" [ariaLabel]="i18n.t('patrimoine.allocation')"
                            class="w-[200px] sm:w-[220px] mx-auto">
                        @if (allocRows[0]; as top) {
                            <span class="text-[10px] text-surface-500 dark:text-surface-400">{{ i18n.t('patrimoine.brvmAnalysis.topHolding') }}</span>
                            <span class="text-[13px] font-bold text-surface-900 dark:text-surface-0 px-6 leading-tight line-clamp-2">{{ top.kind === 'fcp' ? top.label : top.ticker }}</span>
                            <span class="text-[11px] text-surface-500 dark:text-surface-400 mt-0.5 tabular-nums">{{ top.pct }} %</span>
                        }
                    </app-allocation-donut>
                    <ul class="min-w-0 flex flex-col divide-y divide-surface-100 dark:divide-surface-800 m-0 p-0 list-none">
                        @for (row of allocRows; track row.kind + row.ticker) {
                            <li class="grid grid-cols-[12px_minmax(0,1fr)_auto_52px] min-[861px]:grid-cols-[12px_minmax(120px,32%)_minmax(0,1fr)_auto_52px] items-center gap-x-3.5 py-2.5"
                                [pTooltip]="row.tooltip" tooltipPosition="left">
                                <span class="w-3 h-3 rounded-full shrink-0" [style.backgroundColor]="row.color" aria-hidden="true"></span>
                                <span class="min-w-0 flex items-center gap-2">
                                    <span class="text-sm font-semibold truncate text-surface-900 dark:text-surface-100">{{ row.label }}</span>
                                    <span class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 shrink-0">
                                        {{ i18n.t(row.kind === 'fcp' ? 'patrimoine.brvmAnalysis.kindFund' : 'patrimoine.brvmAnalysis.kindStock') }}
                                    </span>
                                </span>
                                <app-allocation-ticks class="max-[860px]:!hidden" [pct]="row.share" [color]="row.color" />
                                <app-amount [value]="row.amount" class="text-sm font-semibold text-surface-900 dark:text-surface-0 tabular-nums text-right" />
                                <span class="text-[13px] text-surface-500 dark:text-surface-400 text-right tabular-nums">{{ row.pct }} %</span>
                            </li>
                        }
                    </ul>
                </div>
            </div>

            <p class="text-xs text-surface-500 dark:text-surface-400 leading-relaxed mt-4 mb-0 max-w-3xl">{{ i18n.t('patrimoine.brvmAnalysis.note') }}</p>
        }

        <!-- Holdings the sleeve had to leave out, each a link to its own page
             where the quantity or the catalog title can be fixed. Honest by
             design: a short total with no explanation reads as a bug. -->
        <ng-template #untrackedTpl>
            <div class="rounded-2xl border border-warning-300/60 dark:border-warning-700/50 bg-warning-50 dark:bg-warning-900/20 p-4 sm:px-5 mb-5" data-testid="analyse-brvm-untracked">
                <div class="flex items-start gap-3">
                    <i class="pi pi-exclamation-triangle text-warning-600 dark:text-warning-400 mt-0.5" aria-hidden="true"></i>
                    <div class="min-w-0 flex-1">
                        <p class="text-sm font-semibold text-surface-900 dark:text-surface-0 m-0">{{ untrackedTitle() }}</p>
                        <p class="text-xs text-surface-600 dark:text-surface-300 m-0 mt-0.5">{{ i18n.t('patrimoine.brvmAnalysis.untrackedDesc') }}</p>
                        <ul class="m-0 mt-2 p-0 list-none flex flex-wrap gap-2">
                            @for (u of data!.untracked; track u.id) {
                                <li>
                                    <a [routerLink]="nav.link('pages', 'patrimoine', 'assets', u.id)"
                                       class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium no-underline
                                              bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-800 dark:text-surface-100 hover:border-ochre-400 transition-colors">
                                        <span class="truncate max-w-[180px]">{{ u.name }}</span>
                                        <span class="text-surface-400">·</span>
                                        <span class="text-warning-700 dark:text-warning-300">{{ i18n.t(u.reason === 'no_key' ? 'patrimoine.brvmAnalysis.reasonNoKey' : 'patrimoine.brvmAnalysis.reasonNoQuantity') }}</span>
                                        <i class="pi pi-arrow-right text-[9px] text-surface-400" aria-hidden="true"></i>
                                    </a>
                                </li>
                            }
                        </ul>
                    </div>
                </div>
            </div>
        </ng-template>
    `
})
export class AnalyseBrvmPage implements OnInit {
    private platformId = inject(PLATFORM_ID);
    private cd = inject(ChangeDetectorRef);
    private api = inject(ApiService);
    private cs = inject(CurrencyService);
    private layout = inject(LayoutService);
    protected nav = inject(NavService);
    readonly i18n = inject(I18nService);
    readonly market = inject(MarketService);
    readonly Math = Math;

    /** Theme flips rebuild the theme-dependent visuals with the current data
     *  (plain properties, like the category detail, so charts don't recolor on
     *  their own). */
    private themeEffect = effect(() => {
        this.layout.isDarkTheme();
        if (this.loading || !this.data) return;
        this.rebuild();
        this.cd.markForCheck();
    });

    // ── State ──
    loading = true;
    loadError = false;
    gated = false;
    data: BrvmPortfolio | null = null;
    selectedDays = DEFAULT_SLEEVE_DAYS;

    // ── Derived (rebuilt on data / range / theme) ──
    scopeLabel = '';
    totalEur = 0;
    asOfLabel = '';
    windowPct: number | null = null;
    windowAbsEur: number | null = null;
    gainEur: number | null = null;
    allocRows: AllocRow[] = [];
    lineData: any = null;
    lineOptions: any = null;
    xStart = ''; xMid = ''; xEnd = '';

    get ranges() {
        return SLEEVE_RANGES.map(r => ({ label: this.i18n.t(`common.chartRange.${r.key}`), days: r.days }));
    }

    async ngOnInit() {
        if (!isPlatformBrowser(this.platformId)) return;
        await this.load();
    }

    async reload() { await this.load(); }

    changeRange(days: number) {
        this.selectedDays = days;
        this.rebuild();
    }

    goBack() { this.nav.go('pages', 'patrimoine'); }

    untrackedTitle(): string {
        const n = this.data?.untracked.length ?? 0;
        return n === 1
            ? this.i18n.t('patrimoine.brvmAnalysis.untrackedOne')
            : this.i18n.t('patrimoine.brvmAnalysis.untrackedOther', { n });
    }

    titlesLabel(n: number): string {
        return n === 1
            ? this.i18n.t('patrimoine.brvmAnalysis.titleOne')
            : this.i18n.t('patrimoine.brvmAnalysis.titleOther', { n });
    }

    private async load() {
        this.loading = true; this.loadError = false; this.gated = false;
        try {
            // Widest fetch once; the chips slice locally (insight-card idiom).
            this.data = await firstValueFrom(this.api.getBrvmPortfolio());
            this.rebuild();
        } catch (e: any) {
            if (e?.status === 403) this.gated = true;
            else this.loadError = true;
            this.data = null;
        } finally {
            this.loading = false;
            this.cd.markForCheck();
        }
    }

    /** Everything on screen derives from `data` + the selected range. */
    private rebuild() {
        const d = this.data;
        if (!d) return;
        const xof = (v: number) => this.cs.toEurFromNative(v, 'XOF');

        // The scope line names what the sleeve holds: stocks close daily, funds
        // publish a VL, so the cadence word follows the mix.
        const hasStocks = d.stocks_count > 0, hasFcp = d.fcp_count > 0;
        this.scopeLabel = this.i18n.t(hasFcp && !hasStocks
            ? 'patrimoine.brvmAnalysis.scopeFunds'
            : hasFcp ? 'patrimoine.brvmAnalysis.scopeMixed' : 'patrimoine.brvmAnalysis.scopeStocks');

        this.totalEur = xof(d.total_value);
        // "clôture" is a stock word; a sleeve holding funds is dated "au".
        this.asOfLabel = d.quote_as_of
            ? this.i18n.t(hasFcp ? 'patrimoine.brvmAnalysis.asOf' : 'patrimoine.brvmAnalysis.asOfClose',
                          { date: this.shortDate(d.quote_as_of) })
            : '';
        this.gainEur = d.unrealized_gain === null ? null : xof(d.unrealized_gain);

        const points = this.slice(this.covered(d), this.selectedDays);
        // Window performance from the sliced series (pure price move of the sleeve).
        if (points.length >= 2 && points[0].value !== 0) {
            const first = points[0].value, last = points[points.length - 1].value;
            this.windowPct = (last - first) / first * 100;
            this.windowAbsEur = xof(last - first);
        } else {
            this.windowPct = null; this.windowAbsEur = null;
        }

        this.buildAllocRows(d.allocation, d.total_value);
        if (points.length >= 2) this.buildLineChart(points); else { this.lineData = null; this.lineOptions = null; }
    }

    /** Drop the sessions before every instrument had a price: a title whose
     *  history starts mid-series would otherwise draw a fake jump and fake the
     *  sleeve's return. Falls back to the full series when that leaves < 2. */
    private covered(d: BrvmPortfolio): BrvmPortfolioPoint[] {
        if (!d.covered_from) return d.points;
        const kept = d.points.filter(p => p.as_of >= d.covered_from!);
        return kept.length >= 2 ? kept : d.points;
    }

    /** Keep the sessions inside the window; a window older than the stored
     *  history (or a 1S window on a weekly-VL fund) keeps the series' last two
     *  sessions so the card never goes blank (days 0 = Max = everything). */
    private slice(points: BrvmPortfolioPoint[], days: number): BrvmPortfolioPoint[] {
        if (days <= 0 || points.length === 0) return points;
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
        const kept = points.filter(p => new Date(p.as_of) > cutoff);
        return kept.length >= 2 ? kept : points.slice(-2);
    }

    private buildAllocRows(alloc: BrvmPortfolioAllocation[], totalXof: number) {
        const colors = chartTheme(this.layout.isDarkTheme()).categorical;
        this.allocRows = alloc.map((a, i) => {
            const amount = this.cs.toEurFromNative(a.value, 'XOF');
            const share = totalXof > 0 ? a.value / totalXof * 100 : 0;
            return {
                ticker: a.ticker, kind: a.kind, label: a.name, amount,
                color: colors[i % colors.length], share,
                pct: share > 0 && share < 0.5 ? '<1' : Math.round(share).toString(),
                tooltip: `${a.name} · ${this.cs.format(amount, 0)}`,
            } satisfies AllocRow;
        });
    }

    /** Compact tick labels whose precision follows the tick STEP, in the
     *  display currency. The shared tickFormatter rounds to whole K/M, which
     *  on a sleeve moving between 1 031 and 1 349 prints "1K" five times. */
    private tickLabeler(yMinEur: number, yMaxEur: number): (v: number) => string {
        const locale = this.i18n.lang() === 'en' ? 'en-US' : 'fr-FR';
        const step = Math.abs(this.cs.convert(yMaxEur) - this.cs.convert(yMinEur)) / 4;
        const max = Math.abs(this.cs.convert(yMaxEur));
        const unit = max >= 1_000_000 ? 1_000_000 : max >= 10_000 ? 1_000 : 1;
        const suffix = unit === 1_000_000 ? 'M' : unit === 1_000 ? 'K' : '';
        // Enough decimals for consecutive ticks to differ, never more than 2.
        const scaledStep = step / unit;
        const decimals = scaledStep <= 0 ? 0 : Math.min(2, Math.max(0, Math.ceil(-Math.log10(scaledStep))));
        const fmt = new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        return (v: number) => `${fmt.format(this.cs.convert(v) / unit)}${suffix}`;
    }

    private shortDate(iso: string): string {
        const locale = this.i18n.lang() === 'en' ? 'en-US' : 'fr-FR';
        return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(iso));
    }

    private buildLineChart(points: BrvmPortfolioPoint[]) {
        // Same brand-tokenized line as the category detail: ochre-400 in dark,
        // brand-700 in light, 13% area fill fading to transparent.
        const isDark = this.layout.isDarkTheme();
        const color = isDark ? '#D8A369' : '#1A2740';
        const textMuted = isDark ? '#8593AB' : '#6E6A60';
        const fillTop = isDark ? 'rgba(216,163,105,0.13)' : 'rgba(26,39,64,0.13)';
        const fillBottom = isDark ? 'rgba(216,163,105,0)' : 'rgba(26,39,64,0)';
        const gridColor = isDark ? 'rgba(245, 247, 251, 0.10)' : 'rgba(20, 19, 15, 0.10)';
        const cs = this.cs;

        // EUR base per point; app-amount/CurrencyService render the display currency.
        const values = points.map(p => this.cs.toEurFromNative(p.value, 'XOF'));
        const labels = points.map(p => this.shortDate(p.as_of));
        const dataMin = Math.min(...values), dataMax = Math.max(...values);
        const span = Math.max(dataMax - dataMin, 1);
        const yMin = Math.max(0, Math.floor(dataMin - span * 0.04));
        const yMax = Math.ceil(dataMax + span * 0.04);

        this.xStart = labels[0] ?? '';
        this.xMid = labels.length > 2 ? labels[Math.floor(labels.length / 2)] : '';
        this.xEnd = labels.length > 1 ? labels[labels.length - 1] : '';

        this.lineData = {
            labels,
            datasets: [{
                data: values,
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
                    callbacks: { label: (ctx: any) => cs.format(ctx.raw, 0) }
                }
            },
            scales: {
                x: { display: false },
                y: {
                    min: yMin, max: yMax,
                    ticks: { count: 5, color: textMuted, font: { size: 11 }, callback: this.tickLabeler(yMin, yMax), crossAlign: 'far' as const, padding: 8 },
                    grid: { color: gridColor, drawTicks: false },
                    border: { display: false, dash: [4, 4] },
                    afterFit: (scale: any) => { scale.width = 52; },
                },
            },
            interaction: { intersect: false, mode: 'index' },
            elements: { point: { radius: 0, hoverRadius: 5 } }
        };
    }
}
