import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { NavService } from '../../core/services/nav.service';
import { LoadErrorComponent } from '../../core/components/load-error.component';
import { PageHeaderComponent } from '../../core/ui';
import { MarketService } from '../service/market.service';
import { MarketChangeComponent, MarketSparklineComponent, SessionPillComponent } from './components/market-primitives';
import { BoardQuoteRowComponent, FcpRowComponent } from './components/market-rows';
import { MarketNewsComponent } from './components/market-news';

/**
 * Marchés hub (P2-3): BRVM indices, gainers and losers, the equity board,
 * the best funds since January, the FIRE Africa news and the FCFA pegs. Every
 * figure is the exchange's own (FCFA or points), never converted, never
 * masked. Sections vanish quietly when their read fails but the page as a
 * whole shows error+retry when nothing at all could be loaded.
 *
 * Desktop composition (lg+): indices across the top, then two columns so the
 * screen answers more at a glance instead of stretching the phone layout.
 */
@Component({
    standalone: true,
    selector: 'app-marches-hub',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink, PageHeaderComponent, LoadErrorComponent,
        MarketChangeComponent, MarketSparklineComponent, SessionPillComponent,
        BoardQuoteRowComponent, FcpRowComponent, MarketNewsComponent,
    ],
    template: `
        <app-page-header icon="pi-globe" [title]="t('markets.title')" [subtitle]="t('markets.subtitle')">
            @if (indices(); as ix) {
                <app-session-pill actions [open]="ix.market_open" />
            }
        </app-page-header>

        @if (coldError()) {
            <app-load-error (retry)="load(true)" />
        } @else {

        <!-- Indices BRVM -->
        @if (indices()?.indices?.length) {
            <section class="mb-6" data-testid="mk-indices">
                <h2 class="text-lg font-bold text-surface-900 dark:text-surface-0 m-0 mb-3">{{ t('markets.indices') }}</h2>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    @for (ix of indices()!.indices; track ix.code) {
                        <a [routerLink]="nav.link('pages', 'marches', 'indice', ix.code)" [attr.data-code]="ix.code"
                           class="block rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 px-5 pt-4 pb-3.5 hover:shadow-card transition-shadow omaad-press">
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-[15px] font-bold text-surface-900 dark:text-surface-0 truncate">{{ ix.name }}</span>
                                <app-market-change [percent]="ix.change_percent" size="md" />
                            </div>
                            <div class="flex items-end gap-1.5 mt-1">
                                <span class="text-2xl font-bold tabular-nums text-surface-900 dark:text-surface-0 leading-none">{{ market.pts(ix.value) }}</span>
                                <span class="ml-auto text-[11px] text-surface-400 dark:text-surface-500 whitespace-nowrap">{{ t('markets.closeOf', { date: market.shortDate(ix.as_of) }) }}</span>
                            </div>
                            @if (ix.spark.length >= 2) {
                                <div class="mt-2.5">
                                    <app-market-sparkline [values]="ix.spark" [tone]="toneOf(ix.change_percent)" />
                                </div>
                            }
                        </a>
                    }
                </div>
            </section>
        } @else if (indicesLoading()) {
            <div class="h-36 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse mb-6" aria-hidden="true"></div>
        }

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div class="lg:col-span-7 flex flex-col gap-6">
                <!-- Hausses & baisses -->
                @if (quotes(); as q) {
                    @if (movers().gainers.length || movers().losers.length) {
                        <section data-testid="mk-movers">
                            <h2 class="text-lg font-bold text-surface-900 dark:text-surface-0 m-0 mb-3">{{ t('markets.movers') }}</h2>
                            <div class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 px-4 py-1">
                                @for (row of movers().gainers; track row.ticker) { <app-board-quote-row [quote]="row" /> }
                                @if (movers().gainers.length && movers().losers.length) {
                                    <div class="border-t border-surface-200 dark:border-surface-800 my-1" role="separator"></div>
                                }
                                @for (row of movers().losers; track row.ticker) { <app-board-quote-row [quote]="row" /> }
                            </div>
                        </section>
                    }

                    <!-- Actions BRVM (preview) -->
                    @if (q.length) {
                        <section data-testid="mk-board">
                            <div class="flex items-end justify-between gap-3 mb-3">
                                <h2 class="text-lg font-bold text-surface-900 dark:text-surface-0 m-0">{{ t('markets.board') }}</h2>
                                <a [routerLink]="nav.link('pages', 'marches', 'actions')" class="text-xs font-semibold text-ochre-600 dark:text-ochre-300 hover:underline" data-testid="mk-board-all">{{ t('markets.viewAll') }}</a>
                            </div>
                            <div class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 px-4 py-1">
                                @for (row of q.slice(0, 6); track row.ticker) { <app-board-quote-row [quote]="row" /> }
                            </div>
                        </section>
                    }
                } @else if (quotesLoading()) {
                    <div class="h-64 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse" aria-hidden="true"></div>
                }
            </div>

            <div class="lg:col-span-5 flex flex-col gap-6">
                <!-- FCP / OPCVM -->
                @if (topFunds().length) {
                    <section data-testid="mk-fcp">
                        <div class="flex items-end justify-between gap-3 mb-3">
                            <div>
                                <h2 class="text-lg font-bold text-surface-900 dark:text-surface-0 m-0">{{ t('markets.fcp') }}</h2>
                                <p class="text-sm text-surface-500 dark:text-surface-400 m-0">{{ t('markets.fcpSubtitle') }}</p>
                            </div>
                            <a [routerLink]="nav.link('pages', 'marches', 'fcp')" class="text-xs font-semibold text-ochre-600 dark:text-ochre-300 hover:underline whitespace-nowrap">{{ t('markets.viewAll') }}</a>
                        </div>
                        <div class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 px-4 py-1">
                            @for (f of topFunds(); track f.slug) { <app-fcp-row [fund]="f" /> }
                        </div>
                    </section>
                }

                <!-- Devises -->
                <section data-testid="mk-fx">
                    <h2 class="text-lg font-bold text-surface-900 dark:text-surface-0 m-0 mb-3">{{ t('markets.fx') }}</h2>
                    <div class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 px-5 py-3.5 flex flex-col gap-3">
                        <div class="flex items-center justify-between gap-3">
                            <span>
                                <span class="block text-sm font-semibold text-surface-900 dark:text-surface-0">{{ t('markets.fxEurXof') }}</span>
                                <span class="block text-[11px] text-surface-400 dark:text-surface-500">{{ t('markets.fxFixedParity') }}</span>
                            </span>
                            <span class="text-sm tabular-nums text-surface-900 dark:text-surface-0">{{ market.xof(xofPerEur()) }}</span>
                        </div>
                        @if (xofPerUsd(); as usd) {
                            <div class="flex items-center justify-between gap-3">
                                <span class="text-sm font-semibold text-surface-900 dark:text-surface-0">{{ t('markets.fxUsdXof') }}</span>
                                <span class="text-sm tabular-nums text-surface-900 dark:text-surface-0">{{ market.xof(usd) }}</span>
                            </div>
                        }
                        <div class="flex items-center justify-between gap-3">
                            <span class="text-sm font-semibold text-surface-900 dark:text-surface-0">{{ t('markets.fxXaf') }}</span>
                            <span class="text-sm text-surface-500 dark:text-surface-400">{{ t('markets.fxSameParity') }}</span>
                        </div>
                    </div>
                </section>

                <!-- CEMAC teaser -->
                <div class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 p-4 flex items-center gap-3">
                    <i class="pi pi-hourglass text-surface-400 dark:text-surface-500" aria-hidden="true"></i>
                    <span class="text-[13.5px] text-surface-500 dark:text-surface-400">{{ t('markets.cemac') }}</span>
                </div>
            </div>
        </div>

        <!-- Actualités -->
        <section class="mt-6" data-testid="mk-news">
            <app-market-news />
        </section>

        <p class="mt-4 px-1 text-xs leading-relaxed text-surface-400 dark:text-surface-500">{{ t('markets.footnote') }}</p>
        }
    `,
})
export class MarchesHubPage implements OnInit {
    readonly i18n = inject(I18nService);
    readonly nav = inject(NavService);
    readonly market = inject(MarketService);

    readonly indices = this.market.indices.data;
    readonly quotes = this.market.quotes.data;
    readonly funds = this.market.funds.data;
    readonly indicesLoading = computed(() => this.market.indices.status() === 'loading');
    readonly quotesLoading = computed(() => this.market.quotes.status() === 'loading');
    /** Nothing at all to show: both headline reads failed cold. */
    readonly coldError = computed(() =>
        this.market.indices.status() === 'error' && this.market.quotes.status() === 'error');

    readonly movers = computed(() => this.market.movers(this.quotes() ?? []));
    readonly topFunds = computed(() =>
        this.market.rankFunds((this.funds() ?? []).filter(f => f.perf_ytd != null)).slice(0, 4));
    readonly xofPerEur = computed(() => this.market.ratePerEur('XOF'));
    readonly xofPerUsd = computed(() => {
        const usd = this.market.ratePerEur('USD');
        return usd > 0 ? this.xofPerEur() / usd : null;
    });

    private readonly ready = signal(false);

    t(key: string, params?: Record<string, string | number>): string { return this.i18n.t(key, params); }

    ngOnInit(): void { void this.load(); }

    load(force = false): Promise<void> {
        // Each read stands alone: a failing section hides, the others render.
        return Promise.all([
            this.market.indices.load(force).catch(() => null),
            this.market.quotes.load(force).catch(() => null),
            this.market.funds.load(force).catch(() => null),
        ]).then(() => this.ready.set(true));
    }

    toneOf(change: number | null | undefined): 'positive' | 'negative' | 'neutral' {
        if (change == null || change === 0) return 'neutral';
        return change > 0 ? 'positive' : 'negative';
    }
}
