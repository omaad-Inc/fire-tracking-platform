import { Injectable, inject, computed, signal } from '@angular/core';
import { TokenService } from './token.service';
import { ApiService } from './api.service';
import { AnalyticsService } from './analytics.service';
import { ShareContextService } from './share-context.service';
import { nbspSafe } from '../util/nbsp';
import { firstValueFrom } from 'rxjs';

export interface CurrencyConfig {
    code: string;
    symbol: string;
    rate: number; // Rate from EUR (units of this currency per 1 EUR)
    locale: string;
}

// Fallback rates used before /fx/rates loads or when offline. Both CFA francs are
// fixed EUR pegs at the same treaty rate (XOF = West Africa / UEMOA, XAF =
// Central Africa / CEMAC); USD is a stale placeholder overridden by the live
// backend rate.
//
// A code missing here is NOT a visual bug: `config` below falls back to EUR, so
// the whole app would silently render a user's portfolio in euros with a euro
// symbol, and `rateOf` would fall back to rate 1 and mis-scale every figure by
// 656x. Keep this map in step with the backend SUPPORTED_CURRENCIES.
const CURRENCIES: Record<string, CurrencyConfig> = {
    XOF: { code: 'XOF', symbol: 'FCFA',  rate: 655.957, locale: 'fr-FR' },
    XAF: { code: 'XAF', symbol: 'FCFA',  rate: 655.957, locale: 'fr-FR' },
    EUR: { code: 'EUR', symbol: '€',      rate: 1,       locale: 'fr-FR' },
    USD: { code: 'USD', symbol: '$',      rate: 1.08,    locale: 'en-US' },
};

const FX_CACHE_KEY = 'omaad_fx_rates';

@Injectable({ providedIn: 'root' })
export class CurrencyService {
    private tokenService = inject(TokenService);
    private api = inject(ApiService);
    private analytics = inject(AnalyticsService);
    private share = inject(ShareContextService);

    /** Live rates_per_eur fetched from the backend (empty until loaded). */
    private liveRates = signal<Record<string, number>>({});

    constructor() {
        // Warm from cache immediately, then refresh from the backend (non-blocking).
        try {
            const cached = localStorage.getItem(FX_CACHE_KEY);
            if (cached) this.liveRates.set(JSON.parse(cached).rates ?? {});
        } catch { /* ignore malformed cache */ }
        this.refreshRates();
    }

    /** Fetch the latest rates; on failure keep the cached/fallback values. */
    async refreshRates(): Promise<void> {
        try {
            const res = await firstValueFrom(this.api.getFxRates());
            if (res?.rates && Object.keys(res.rates).length) {
                this.liveRates.set(res.rates);
                try { localStorage.setItem(FX_CACHE_KEY, JSON.stringify({ rates: res.rates, as_of: res.as_of })); } catch {}
            }
        } catch { /* offline / endpoint down, fallback rates remain */ }
    }

    /** Current currency code, the shared portfolio's currency in share mode,
     *  otherwise the logged-in user's preference. */
    readonly currencyCode = computed<string>(() =>
        this.share.active()
            ? this.share.currency()
            : (this.tokenService.user()?.preferred_currency || 'XOF')
    );

    /** Current currency config, live rate overrides the hardcoded fallback. */
    readonly config = computed<CurrencyConfig>(() => {
        const base = CURRENCIES[this.currencyCode()] ?? CURRENCIES['EUR'];
        const live = this.liveRates()[base.code];
        return live && live > 0 ? { ...base, rate: live } : base;
    });

    /** The trailing symbol for ANY currency code, not just the active one.
     *  Call sites used to inline `c === 'XOF' ? 'FCFA' : c === 'USD' ? '$' : '€'`,
     *  a chain that defaults to the euro, so XAF rendered as euros. One lookup
     *  keeps every screen correct as codes are added. */
    symbolFor(code: string | null | undefined): string {
        return CURRENCIES[(code || 'EUR').toUpperCase()]?.symbol ?? code ?? '';
    }

    /** Rate (units per EUR) for any currency code: live → hardcoded fallback → 1. */
    rateOf(code: string | null | undefined): number {
        const c = (code || 'EUR').toUpperCase();
        return this.liveRates()[c] ?? CURRENCIES[c]?.rate ?? 1;
    }

    /**
     * Convert a value stored in its NATIVE currency → EUR base.
     * Used at the API→display boundary now that assets/transactions are
     * stored in native currency. Example: 655 957 FCFA / 655.957 = 1000 €.
     */
    toEurFromNative(nativeValue: number | null | undefined, currency: string | null | undefined): number {
        if (!nativeValue) return 0;
        const rate = this.rateOf(currency);
        return rate ? nativeValue / rate : nativeValue;
    }

    /**
     * Convert a EUR (base) value → display currency.
     * Used for reading values from the API before showing them in the UI.
     *
     * Example (FCFA user): 38 € × 655.957 = 24 926 FCFA
     */
    convert(eurValue: number): number {
        return eurValue * this.config().rate;
    }

    /**
     * Convert a display-currency value → EUR (base) for storage.
     * Must be called in every service method that sends monetary values
     * to the API, so that a FCFA user entering 25 000 000 and a EUR user
     * entering 38 109 both result in the same value stored on the backend.
     *
     * Example (FCFA user): 25 000 000 ÷ 655.957 ≈ 38 109 €
     * Example (EUR  user): 38 109 ÷ 1           = 38 109 €
     */
    toBaseAmount(displayValue: number): number {
        const rate = this.config().rate;
        if (!rate || rate === 0) return displayValue;
        return displayValue / rate;
    }

    /**
     * Convert a display-currency amount back using an explicit rate.
     * Useful when the rate at time of entry differs from the current rate
     * (e.g. historical transactions).  For most use-cases, prefer toBaseAmount().
     */
    toBaseAmountWithRate(displayValue: number, rate: number): number {
        if (!rate || rate === 0) return displayValue;
        return displayValue / rate;
    }

    /** Format a EUR value as a localized amount + the app's currency symbol.
     *  Uses decimal formatting + our own symbol (FCFA / € / $) instead of Intl's
     *  currency style, so XOF renders as "FCFA" everywhere, not Intl's "F CFA", *  matching app-amount and the rest of the UI. Symbol trails the number
     *  (FR / West-African convention). */
    format(eurValue: number, fractionDigits = 0): string {
        const { symbol, locale } = this.config();
        const displayValue = this.convert(eurValue);
        const n = nbspSafe(new Intl.NumberFormat(locale, {
            maximumFractionDigits: fractionDigits,
            minimumFractionDigits: fractionDigits,
        }).format(displayValue));
        return `${n} ${symbol}`;
    }

    /** Format a EUR value as a plain number string (no currency symbol) in the display locale. */
    formatNumber(eurValue: number, fractionDigits = 0): string {
        const displayValue = this.convert(eurValue);
        const { locale } = this.config();
        return nbspSafe(new Intl.NumberFormat(locale, {
            maximumFractionDigits: fractionDigits,
            minimumFractionDigits: fractionDigits,
        }).format(displayValue));
    }

    /** Format a value ALREADY in the display currency, WITHOUT converting it again.
     *  Use for figures computed directly in the display currency (e.g. the FIRE
     *  number = display-currency annual expenses ÷ withdrawal rate); passing such a
     *  value to formatNumber() would multiply it by the FX rate a second time. */
    formatDisplayNumber(displayValue: number | null | undefined, fractionDigits = 0): string {
        const { locale } = this.config();
        return nbspSafe(new Intl.NumberFormat(locale, {
            maximumFractionDigits: fractionDigits,
            minimumFractionDigits: fractionDigits,
        }).format(displayValue ?? 0));
    }

    /** Y-axis tick formatter for Chart.js (passed as a plain function ref). */
    tickFormatter(): (value: number) => string {
        return (value: number) => {
            const converted = this.convert(value);
            if (Math.abs(converted) >= 1_000_000)
                return (converted / 1_000_000).toFixed(1) + 'M';
            if (Math.abs(converted) >= 1_000)
                return (converted / 1_000).toFixed(0) + 'K';
            return converted.toFixed(0);
        };
    }

    /** Persist the currency preference to API and localStorage. */
    async setCurrency(code: string): Promise<void> {
        const user = this.tokenService.user();
        if (!user) return;
        const previous = user.preferred_currency;
        try {
            await firstValueFrom(this.api.updateProfile({ preferred_currency: code }));
        } catch { /* non-blocking */ }
        this.tokenService.setUser({ ...user, preferred_currency: code });
        if (previous !== code) {
            this.analytics.track('currency_switched', { from: previous, to: code });
        }
    }
}
