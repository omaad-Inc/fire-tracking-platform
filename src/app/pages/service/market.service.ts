import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
    ApiService, BrvmBoardQuote, BrvmIndicesResponse, FcpInstrument,
} from '../../core/services/api.service';
import { CurrencyService } from '../../core/services/currency.service';
import { I18nService } from '../../i18n/i18n.service';
import { CachedResource, cachedResource } from '../../core/util/cached-resource';
import { nbspSafe } from '../../core/util/nbsp';

/** A dated point of any market series (index level, close or VL), all XOF-or-points. */
export interface SeriesPoint { date: string; value: number; }

/** Chart windows offered on every instrument. `days: 0` means the full series.
 *  No intraday pill on purpose: the BRVM publishes daily closes only. */
export const MARKET_PERIODS: ReadonlyArray<{ days: number; labelKey: string }> = [
    { days: 7,   labelKey: 'markets.period.w1' },
    { days: 31,  labelKey: 'markets.period.m1' },
    { days: 183, labelKey: 'markets.period.m6' },
    { days: 365, labelKey: 'markets.period.y1' },
    { days: 0,   labelKey: 'markets.period.max' },
];

export type FcpGroup = 'all' | 'actions' | 'obligations' | 'diversifie' | 'monetaire';
export const FCP_GROUPS: readonly FcpGroup[] = ['all', 'actions', 'obligations', 'diversifie', 'monetaire'];

/**
 * Marchés data + formatting (P2-3).
 *
 * Data: the three list reads share the house cache (SWR, 5 min, in-flight
 * dedup, cold-vs-warm error semantics); per-instrument histories get one
 * resource each, created on first use. Nothing here is user money, so the
 * resources are not reset on logout.
 *
 * Formatting: BRVM prices and fund VLs are ALWAYS shown in FCFA, verbatim from
 * the exchange, and index levels are POINTS. None of it goes through the
 * display-currency conversion in CurrencyService (a converted "cours" would
 * misstate the exchange's own numbers) and none of it is masked by privacy
 * mode (a market price is not the user's money). Only the number locale
 * follows the app language.
 */
@Injectable({ providedIn: 'root' })
export class MarketService {
    private api = inject(ApiService);
    private currency = inject(CurrencyService);
    private i18n = inject(I18nService);

    readonly indices: CachedResource<BrvmIndicesResponse> =
        cachedResource(() => this.api.getBrvmIndices(), { persistKey: 'market:brvm:indices' });
    readonly quotes: CachedResource<BrvmBoardQuote[]> =
        cachedResource(() => this.api.getBrvmQuotes(), { persistKey: 'market:brvm:quotes' });
    readonly funds: CachedResource<FcpInstrument[]> =
        cachedResource(() => this.api.getFcpInstruments(), { persistKey: 'market:fcp:instruments' });

    private histories = new Map<string, CachedResource<SeriesPoint[]>>();

    /** One cached series per instrument, fetched WITHOUT `days`: the pills slice client-side. */
    history(kind: 'stock' | 'fund' | 'index', id: string): CachedResource<SeriesPoint[]> {
        const key = `${kind}:${id}`;
        let res = this.histories.get(key);
        if (!res) {
            res = cachedResource<SeriesPoint[]>(async () => {
                if (kind === 'stock') {
                    const h = await firstValueFrom(this.api.getBrvmTickerHistory(id));
                    return h.points.map(p => ({ date: p.as_of, value: p.close_xof }));
                }
                if (kind === 'fund') {
                    const h = await firstValueFrom(this.api.getFcpVlHistory(id));
                    return h.points.map(p => ({ date: p.as_of, value: p.vl_xof }));
                }
                const h = await firstValueFrom(this.api.getBrvmIndexHistory(id));
                return h.points.map(p => ({ date: p.as_of, value: p.value }));
            });
            this.histories.set(key, res);
        }
        return res;
    }

    // ── Derivations shared by the hub and the boards ────────────────────────

    /** Movers: rows with a known change, best first / worst first, 0-3 each, never both. */
    movers(quotes: BrvmBoardQuote[]): { gainers: BrvmBoardQuote[]; losers: BrvmBoardQuote[] } {
        const moved = quotes.filter(q => q.change_percent != null)
            .sort((a, b) => (b.change_percent as number) - (a.change_percent as number));
        const gainers = moved.slice(0, 3).filter(q => (q.change_percent as number) > 0);
        const losers = moved.slice(-3).reverse().filter(q => (q.change_percent as number) < 0);
        return { gainers, losers };
    }

    /** Funds ranked by year-to-date performance, unrated funds last. */
    rankFunds(funds: FcpInstrument[]): FcpInstrument[] {
        return [...funds].sort((a, b) => (b.perf_ytd ?? -Infinity) - (a.perf_ytd ?? -Infinity));
    }

    /** Map a verbatim richbourse category to a chip group. Order matters:
     *  "Obligations et autres titres de créance" must not read as actions. */
    fcpGroupOf(category: string | null | undefined): Exclude<FcpGroup, 'all'> {
        const c = (category || '').toLowerCase();
        if (c.startsWith('obligat') || c.includes('créance')) return 'obligations';
        if (c.includes('monétaire') || c.includes('monetaire')) return 'monetaire';
        if (c.includes('action')) return 'actions';
        return 'diversifie';
    }

    /** Keep the points strictly inside the last `days`; if fewer than two
     *  survive, fall back to the last two of the full series so the chart never
     *  goes blank. `days <= 0` returns everything. */
    slice(points: SeriesPoint[], days: number): SeriesPoint[] {
        return this.sliceInfo(points, days).points;
    }

    /**
     * The visible window, and whether it is really the one asked for (P3-7).
     * When a window holds fewer than two points (a young series, or a quiet
     * fund with sparse VLs) the chart still needs two points to draw, so the
     * last two of the whole series stand in. That is right for the chart and
     * wrong for a change line labelled "1 mois": the two dates may sit well
     * outside the window. `fallback` lets the caller label the span it really
     * compares instead of the period the user picked.
     */
    sliceInfo(points: SeriesPoint[], days: number): { points: SeriesPoint[]; fallback: boolean } {
        if (days <= 0) return { points, fallback: false };
        const since = Date.now() - days * 86_400_000;
        const kept = points.filter(p => new Date(p.date).getTime() > since);
        return kept.length >= 2 ? { points: kept, fallback: false } : { points: points.slice(-2), fallback: true };
    }

    /** Signed change over a visible slice, or null when there is nothing to compare. */
    sliceChange(points: SeriesPoint[]): { abs: number; pct: number } | null {
        if (points.length < 2 || !points[0].value) return null;
        const abs = points[points.length - 1].value - points[0].value;
        return { abs, pct: (abs / points[0].value) * 100 };
    }

    // ── Formatting ──────────────────────────────────────────────────────────

    private get locale(): string { return this.i18n.lang() === 'fr' ? 'fr-FR' : 'en-US'; }

    /** "24 500 FCFA": a MARKET price in the trading currency, rounded to the
     *  franc (CFA has no minor unit), NOT converted, NOT masked. */
    xof(v: number | null | undefined): string {
        if (v == null) return '—';
        const n = nbspSafe(new Intl.NumberFormat(this.locale, { maximumFractionDigits: 0 }).format(Math.round(Math.abs(v))));
        return `${v < 0 ? '-' : ''}${n} FCFA`;
    }

    /** Plain grouped integer, no unit (volumes). */
    int(v: number | null | undefined): string {
        if (v == null) return '—';
        return nbspSafe(new Intl.NumberFormat(this.locale, { maximumFractionDigits: 0 }).format(Math.round(v)));
    }

    /** "537,25 pts": index levels are points, not money. */
    pts(v: number): string {
        const n = nbspSafe(new Intl.NumberFormat(this.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v));
        return `${n} ${this.i18n.t('markets.pts')}`;
    }

    /** Unsigned percent with exactly one decimal; the caller draws the arrow. */
    pct(p: number): string {
        const n = nbspSafe(new Intl.NumberFormat(this.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Math.abs(p)));
        return this.i18n.lang() === 'fr' ? `${n} %` : `${n}%`;
    }

    /** "1 sept." / "Sep 1": the short session date under a level or a price. */
    shortDate(iso: string | null | undefined): string {
        if (!iso) return '';
        const [y, m, d] = iso.split('-').map(Number);
        if (!y || !m || !d) return iso;
        return new Date(y, m - 1, d).toLocaleDateString(this.locale, { day: 'numeric', month: 'short' });
    }

    /** Units of a currency per EUR, from the live /fx/rates (fallback pegs otherwise). */
    ratePerEur(code: string): number { return this.currency.rateOf(code); }
}
