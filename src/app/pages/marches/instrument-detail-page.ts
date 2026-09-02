import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { NavService } from '../../core/services/nav.service';
import { BrvmBoardQuote, BrvmIndexEntry, FcpInstrument } from '../../core/services/api.service';
import { MarketService, SeriesPoint } from '../service/market.service';
import { MarketChangeComponent, SessionPillComponent, TickerCircleComponent } from './components/market-primitives';
import { HiloChartComponent } from './components/hilo-chart';
import { PeriodBarComponent } from './components/period-bar';

export type InstrumentKind = 'stock' | 'fund' | 'index';

/**
 * One instrument (a BRVM stock, a fund, or an index): its latest figure, the
 * change over the visible window, the hi/lo chart with its period pills, a few
 * facts, and the one action that makes sense (add a stock or fund to the
 * portfolio with the picker prefilled; explore the board from an index).
 *
 * The change line is derived from the VISIBLE slice, not from the API's day
 * change, so it always agrees with the chart above it. Prices and VLs are FCFA
 * verbatim, index levels are points; one formatter drives the hero figure, the
 * change amount and the chart callouts so they can never disagree.
 */
@Component({
    standalone: true,
    selector: 'app-instrument-detail',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, MarketChangeComponent, SessionPillComponent, TickerCircleComponent, HiloChartComponent, PeriodBarComponent],
    template: `
        <a [routerLink]="backLink()" class="inline-flex items-center gap-1.5 text-sm text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-0 mb-4">
            <i class="pi pi-arrow-left text-xs" aria-hidden="true"></i>{{ t('markets.title') }}
        </a>

        @if (unavailable()) {
            <div class="py-24 text-center text-surface-500 dark:text-surface-400" data-testid="mk-unavailable">{{ t('markets.unavailable') }}</div>
        } @else if (!loaded()) {
            <div class="max-w-3xl">
                <div class="h-16 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse mb-4" aria-hidden="true"></div>
                <div class="h-56 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse" aria-hidden="true"></div>
            </div>
        } @else {
            <div class="max-w-3xl" data-testid="mk-detail">
                <!-- Identity -->
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <h1 class="text-xl font-extrabold text-surface-900 dark:text-surface-0 m-0 leading-tight line-clamp-2">{{ title() }}</h1>
                        <p class="text-sm text-surface-500 dark:text-surface-400 m-0 mt-0.5 truncate">{{ subtitle() }}</p>
                    </div>
                    <app-ticker-circle [label]="monogram()" size="lg" />
                </div>

                <!-- Figure + session -->
                <div class="flex items-center gap-2.5 mt-4">
                    @if (price() !== null) {
                        <span class="text-[32px] font-extrabold tabular-nums leading-none text-surface-900 dark:text-surface-0" data-testid="mk-price">{{ fmt()(price()!) }}</span>
                    }
                    @if (kind() !== 'fund' && indices()) {
                        <app-session-pill [open]="indices()!.market_open" />
                    }
                </div>

                <!-- Change over the visible window -->
                <div class="mt-1.5 text-[13.5px] flex items-center gap-1.5 flex-wrap" data-testid="mk-change">
                    @if (change(); as c) {
                        <span class="font-semibold tabular-nums" [class]="c.abs > 0 ? 'text-positive dark:text-positive-400' : c.abs < 0 ? 'text-negative dark:text-negative-400' : 'text-surface-500 dark:text-surface-400'">
                            {{ c.abs > 0 ? '+' : c.abs < 0 ? '−' : '' }}{{ fmt()(abs(c.abs)) }}
                        </span>
                        <app-market-change [percent]="c.pct" size="md" />
                        <span class="text-surface-400 dark:text-surface-500">· {{ periodLabel() }}</span>
                    } @else {
                        <span class="text-surface-400 dark:text-surface-500">{{ caption() }}</span>
                    }
                </div>

                <!-- Chart -->
                <div class="mt-4">
                    @if (visible().length >= 2) {
                        <app-hilo-chart [points]="visible()" [tone]="tone()" [formatValue]="fmt()" />
                    } @else {
                        <p class="py-6 text-sm leading-relaxed text-surface-500 dark:text-surface-400">{{ t('markets.historyStarting') }}</p>
                    }
                    <div class="mt-3">
                        <app-period-bar [days]="days()" (daysChange)="days.set($event)" />
                    </div>
                </div>

                <!-- Performance (funds) -->
                @if (kind() === 'fund' && fund(); as f) {
                    @if (f.perf_ytd != null || f.perf_1y != null) {
                        <div class="mt-5 rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 px-5 py-3.5 flex flex-col gap-2.5">
                            @if (f.perf_ytd != null) {
                                <div class="flex items-center justify-between gap-3">
                                    <span class="text-sm text-surface-500 dark:text-surface-400">{{ t('markets.perf') }} · {{ t('markets.perfYtd') }}</span>
                                    <app-market-change [percent]="f.perf_ytd" size="md" />
                                </div>
                            }
                            @if (f.perf_1y != null) {
                                <div class="flex items-center justify-between gap-3">
                                    <span class="text-sm text-surface-500 dark:text-surface-400">{{ t('markets.perf') }} · {{ t('markets.perf1y') }}</span>
                                    <app-market-change [percent]="f.perf_1y" size="md" />
                                </div>
                            }
                        </div>
                    }
                }

                <!-- Facts -->
                @if (facts().length) {
                    <div class="mt-4 rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 px-5 py-3.5 flex flex-col gap-2.5" data-testid="mk-facts">
                        @for (f of facts(); track f.label) {
                            <div class="flex items-center justify-between gap-3">
                                <span class="text-sm text-surface-500 dark:text-surface-400">{{ f.label }}</span>
                                @if (f.percent !== undefined) {
                                    <app-market-change [percent]="f.percent" size="md" />
                                } @else {
                                    <span class="text-sm font-semibold text-surface-900 dark:text-surface-0 text-right truncate">{{ f.value }}</span>
                                }
                            </div>
                        }
                    </div>
                }

                <p class="mt-3 px-1 text-[10.5px] text-surface-400 dark:text-surface-500">{{ t('markets.detailFootnote') }}</p>

                <!-- The one action -->
                <a [routerLink]="ctaLink()" [queryParams]="ctaParams()" data-testid="mk-cta"
                   class="mt-4 flex items-center justify-center gap-2 h-[52px] rounded-2xl font-semibold text-[15px] omaad-press transition-colors
                          bg-brand-700 hover:bg-brand-800 text-white dark:bg-ochre-400 dark:hover:bg-ochre-300 dark:text-warm-900">
                    <i class="pi text-base" [class]="kind() === 'index' ? 'pi-list' : 'pi-plus'" aria-hidden="true"></i>
                    {{ t(kind() === 'index' ? 'markets.exploreStocks' : 'markets.addToPatrimoine') }}
                </a>
            </div>
        }
    `,
})
export class InstrumentDetailPage implements OnInit {
    readonly i18n = inject(I18nService);
    readonly nav = inject(NavService);
    readonly market = inject(MarketService);
    private route = inject(ActivatedRoute);

    readonly kind = signal<InstrumentKind>((this.route.snapshot.data['kind'] as InstrumentKind) ?? 'stock');
    readonly id = signal<string>(this.route.snapshot.paramMap.get('id') ?? '');

    readonly series = signal<SeriesPoint[] | null>(null);
    readonly unavailable = signal(false);
    readonly loaded = signal(false);
    /** Stocks and indices open on a month; funds publish weekly, so a year. */
    readonly days = signal(31);

    readonly indices = this.market.indices.data;
    readonly quote = computed<BrvmBoardQuote | null>(() =>
        this.kind() === 'stock' ? (this.market.quotes.data() ?? []).find(q => q.ticker === this.id()) ?? null : null);
    readonly fund = computed<FcpInstrument | null>(() =>
        this.kind() === 'fund' ? (this.market.funds.data() ?? []).find(f => f.slug === this.id()) ?? null : null);
    readonly index = computed<BrvmIndexEntry | null>(() =>
        this.kind() === 'index' ? (this.indices()?.indices ?? []).find(i => i.code === this.id()) ?? null : null);
    readonly name = signal('');

    readonly visible = computed(() => this.market.slice(this.series() ?? [], this.days()));
    readonly change = computed(() => this.market.sliceChange(this.visible()));
    readonly tone = computed<'positive' | 'negative' | 'neutral'>(() => {
        const c = this.change();
        if (!c || c.abs === 0) return 'neutral';
        return c.abs > 0 ? 'positive' : 'negative';
    });

    /** ONE formatter for the hero figure, the change amount and the chart callouts. */
    readonly fmt = computed<(v: number) => string>(() =>
        this.kind() === 'index' ? (v: number) => this.market.pts(v) : (v: number) => this.market.xof(v));

    /** Latest figure: the last point of the FULL series, else the catalog's own. */
    readonly price = computed<number | null>(() => {
        const s = this.series();
        if (s && s.length) return s[s.length - 1].value;
        if (this.kind() === 'fund') return this.fund()?.latest_vl && this.fund()!.latest_vl! > 0 ? this.fund()!.latest_vl! : null;
        if (this.kind() === 'index') return this.index()?.value ?? null;
        return this.quote()?.close_xof ?? null;
    });

    readonly title = computed(() => this.kind() === 'stock' ? this.id() : (this.name() || this.id()));
    readonly subtitle = computed(() => {
        if (this.kind() === 'stock') return this.name() || this.quote()?.name || '';
        if (this.kind() === 'fund') return this.fund()?.sgo || '';
        return this.t('markets.indexSubtitle', { code: this.id() });
    });
    readonly monogram = computed(() => {
        if (this.kind() === 'stock') return this.id();
        if (this.kind() === 'fund') return this.fund()?.sgo || this.name() || this.id();
        return this.id().replace(/^BRVM-/, '');
    });
    readonly caption = computed(() => {
        const s = this.series();
        const last = s && s.length ? s[s.length - 1].date : (this.kind() === 'fund' ? this.fund()?.vl_as_of : this.index()?.as_of ?? this.quote()?.as_of);
        if (!last) return '';
        return this.t(this.kind() === 'fund' ? 'markets.vlOf' : 'markets.closeOf', { date: this.market.shortDate(last) });
    });
    readonly periodLabel = computed(() => {
        const d = this.days();
        const key = d === 7 ? 'w1' : d === 31 ? 'm1' : d === 183 ? 'm6' : d === 365 ? 'y1' : 'max';
        return this.t('markets.period.' + key);
    });

    readonly facts = computed<Array<{ label: string; value?: string; percent?: number | null }>>(() => {
        const out: Array<{ label: string; value?: string; percent?: number | null }> = [];
        if (this.kind() === 'stock') {
            const q = this.quote();
            if (q?.sector) out.push({ label: this.t('markets.sector'), value: q.sector });
            if (q?.country) out.push({ label: this.t('markets.country'), value: q.country });
            if (q?.volume != null) out.push({ label: this.t('markets.volume'), value: this.market.int(q.volume) });
        } else if (this.kind() === 'fund') {
            const f = this.fund();
            if (f?.category) out.push({ label: this.t('markets.category'), value: f.category });
            if (f?.sgo) out.push({ label: this.t('markets.sgo'), value: f.sgo });
        } else {
            const ix = this.index();
            if (ix) out.push({ label: this.t('markets.dayChange'), percent: ix.change_percent });
        }
        return out;
    });

    readonly backLink = computed(() => this.nav.link('pages', 'marches'));
    readonly ctaLink = computed(() => this.kind() === 'index'
        ? this.nav.link('pages', 'marches', 'actions')
        : this.nav.link('pages', 'patrimoine', 'add-asset'));
    readonly ctaParams = computed(() => this.kind() === 'index' ? null
        : { category: this.kind() === 'stock' ? 'stocks_brvm' : 'fcp', ticker: this.id() });

    t(key: string, params?: Record<string, string | number>): string { return this.i18n.t(key, params); }
    abs(v: number): number { return Math.abs(v); }

    ngOnInit(): void {
        if (this.kind() === 'fund') this.days.set(365);
        void this.load();
    }

    private async load(): Promise<void> {
        const kind = this.kind();
        // The catalog reads give facts and a fallback figure; they are best-effort.
        const side = kind === 'stock'
            ? [this.market.quotes.load().catch(() => null), this.market.indices.load().catch(() => null)]
            : kind === 'fund' ? [this.market.funds.load().catch(() => null)]
            : [this.market.indices.load().catch(() => null)];
        const resource = this.market.history(kind, this.id());
        try {
            const [series] = await Promise.all([resource.load(), ...side]);
            this.series.set(series);
            const nameOf = kind === 'stock' ? this.quote()?.name : kind === 'fund' ? this.fund()?.name : this.index()?.name;
            this.name.set(nameOf ?? '');
            this.loaded.set(true);
        } catch {
            await Promise.all(side);
            // A missing series with a known catalog entry is still a page (the
            // chart copy explains); an unknown id is not.
            const known = kind === 'stock' ? !!this.quote() : kind === 'fund' ? !!this.fund() : !!this.index();
            if (known) { this.series.set([]); this.loaded.set(true); }
            else this.unavailable.set(true);
        }
    }
}
