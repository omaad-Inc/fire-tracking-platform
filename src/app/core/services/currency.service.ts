import { Injectable, inject, computed, signal } from '@angular/core';
import { TokenService } from './token.service';
import { ApiService } from './api.service';
import { AnalyticsService } from './analytics.service';
import { PrivacyService } from './privacy.service';
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

/**
 * How many decimals each currency actually HAS (its minor unit). Neither CFA
 * franc has one, so a centime there is meaningless; the euro and the dollar
 * have cents, and silently dropping them reports a number the user never said.
 *
 * A code missing from this table falls back to DEFAULT_MINOR_UNITS (2), which
 * would invent a centime that does not exist, so every supported code belongs
 * here. Twin of `CURRENCY_MINOR_UNITS` in backend/app/core/formatting.py and
 * `MoneyFormatter._minorUnits` in the Flutter app — keep the three in step.
 */
const CURRENCY_MINOR_UNITS: Record<string, number> = { XOF: 0, XAF: 0, EUR: 2, USD: 2 };
const DEFAULT_MINOR_UNITS = 2;

const FX_CACHE_KEY = 'omaad_fx_rates';

/**
 * What a masked amount reads as under privacy mode (P0-3). Matches the glyph
 * `<app-amount>` already renders, so a hidden screen speaks one language whether
 * the amount came from the component or from a formatted string.
 *
 * The axis variant is shorter because it repeats down a chart's whole y-axis:
 * five bullets per tick reads as noise, three reads as "withheld".
 */
const MASK = '•••••';
const MASK_TICK = '•••';

@Injectable({ providedIn: 'root' })
export class CurrencyService {
    private tokenService = inject(TokenService);
    private api = inject(ApiService);
    private analytics = inject(AnalyticsService);
    private share = inject(ShareContextService);
    private privacy = inject(PrivacyService);

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

    /** The minor unit of ANY currency code: how many decimals it actually has. */
    minorUnitsFor(code: string | null | undefined): number {
        return CURRENCY_MINOR_UNITS[(code || 'EUR').toUpperCase()] ?? DEFAULT_MINOR_UNITS;
    }

    /** The minor unit of the ACTIVE display currency, as a signal. Bind money
     *  inputs to this (`[maxFractionDigits]="cs.minorUnits()"`) so a form can
     *  never accept — nor silently truncate — a digit the currency lacks. */
    readonly minorUnits = computed<number>(() => this.minorUnitsFor(this.currencyCode()));

    /**
     * Decimals to render for `value` in `code`: none when it is a whole amount,
     * the currency's full minor unit as soon as it is not.
     *
     * "Exactly the amount the user gave, nothing more and nothing less" (owner
     * directive): 35.19 EUR renders "35,19" and 14 EUR renders "14", never "35"
     * (real precision dropped) and never "14,00" (precision invented). A
     * trailing zero inside the minor unit is fact, not noise, so 518.90 renders
     * "518,90" and not "518,9".
     *
     * `value` must already be in `code`'s currency: the width is derived from
     * the digits the user will actually see, not from the EUR-base figure.
     *
     * Twin of `_money_decimals` (backend) and `MoneyFormatter.decimalsFor`
     * (Flutter). Defaults to the active display currency when `code` is omitted.
     */
    decimalsFor(value: number | null | undefined, code?: string | null): number {
        const minor = this.minorUnitsFor(code ?? this.currencyCode());
        if (minor <= 0) return 0;
        // Round to the minor unit BEFORE asking whether a fractional part
        // survives: float noise (35.190000000000005, or a converted
        // 249999997.97078) must not read as "needs more digits".
        const rounded = Number((value ?? 0).toFixed(minor));
        return Number.isInteger(rounded) ? 0 : minor;
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

    /**
     * Format a EUR value as a localized amount + the app's currency symbol.
     * Uses decimal formatting + our own symbol (FCFA / € / $) instead of Intl's
     * currency style, so XOF renders as "FCFA" everywhere, not Intl's "F CFA",
     * matching app-amount and the rest of the UI. Symbol trails the number
     * (FR / West-African convention).
     *
     * MASKS under privacy mode (P0-3). Privacy used to live only inside
     * `<app-amount>`, which meant it covered template text and nothing else:
     * chart tooltips, axis ticks, aria-labels, select option labels and the
     * coaching sentences all take a STRING, so a component cannot reach them,
     * and every one of them stayed readable with the eye shut. Masking here
     * instead puts it on the seam they already share, and inverts the failure
     * mode: forget to think about privacy and you now get masking, not a leak.
     */
    format(eurValue: number, fractionDigits?: number): string {
        const { symbol } = this.config();
        if (this.privacy.hidden()) return `${MASK} ${symbol}`;
        return `${this.formatNumber(eurValue, fractionDigits)} ${symbol}`;
    }

    /** Format a EUR value as a plain number string (no currency symbol) in the
     *  display locale. Masks under privacy mode, same reasoning as format().
     *
     *  `fractionDigits` omitted DERIVES the width from the converted amount
     *  (see decimalsFor). Pass a number ONLY for a rollup whose cents are noise
     *  rather than fact; a hardcoded 0 on a real amount is the bug this default
     *  replaced — it rendered a 539,69 € rent as "540 €". */
    formatNumber(eurValue: number, fractionDigits?: number): string {
        if (this.privacy.hidden()) return MASK;
        const displayValue = this.convert(eurValue);
        const { locale } = this.config();
        const digits = fractionDigits ?? this.decimalsFor(displayValue);
        return nbspSafe(new Intl.NumberFormat(locale, {
            maximumFractionDigits: digits,
            minimumFractionDigits: digits,
        }).format(displayValue));
    }

    /** The decimal separator of the display locale ("," in fr-FR, "." in en-US).
     *  `<app-amount>` splits a hero amount on it to size the cents down. */
    decimalSeparator(): string {
        return new Intl.NumberFormat(this.config().locale)
            .formatToParts(1.1)
            .find(p => p.type === 'decimal')?.value ?? ',';
    }

    /** Format a value ALREADY in the display currency, WITHOUT converting it again.
     *  Use for figures computed directly in the display currency (e.g. the FIRE
     *  number = display-currency annual expenses ÷ withdrawal rate); passing such a
     *  value to formatNumber() would multiply it by the FX rate a second time.
     *
     *  Deliberately does NOT mask, unlike format()/formatNumber() above. Every
     *  one of its callers is a place where masking would break the screen rather
     *  than protect it: subscription PRICES (you cannot check out against
     *  `•••••`, and a plan price is not the user's money anyway) and the figure
     *  a user is currently TYPING into a form or the numpad. If a genuine user
     *  amount ever needs this, mask at that call site on PrivacyService. */
    formatDisplayNumber(displayValue: number | null | undefined, fractionDigits?: number): string {
        const { locale } = this.config();
        const digits = fractionDigits ?? this.decimalsFor(displayValue);
        return nbspSafe(new Intl.NumberFormat(locale, {
            maximumFractionDigits: digits,
            minimumFractionDigits: digits,
        }).format(displayValue ?? 0));
    }

    /** Y-axis tick formatter for Chart.js (passed as a plain function ref).
     *  Masks under privacy mode: an axis reading "0 / 250K / 500K" hands over
     *  the scale of everything plotted against it, which is most of what the
     *  eye toggle is meant to withhold. The chart shape stays, the numbers go. */
    tickFormatter(): (value: number) => string {
        return (value: number) => {
            if (this.privacy.hidden()) return MASK_TICK;
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
