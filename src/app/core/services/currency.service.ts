import { Injectable, inject, computed } from '@angular/core';
import { TokenService } from './token.service';
import { ApiService } from './api.service';
import { AnalyticsService } from './analytics.service';
import { firstValueFrom } from 'rxjs';

export interface CurrencyConfig {
    code: string;
    symbol: string;
    rate: number; // Rate from EUR
    locale: string;
}

const CURRENCIES: Record<string, CurrencyConfig> = {
    XOF: { code: 'XOF', symbol: 'FCFA',  rate: 655.957, locale: 'fr-FR' },
    EUR: { code: 'EUR', symbol: '€',      rate: 1,       locale: 'fr-FR' },
    USD: { code: 'USD', symbol: '$',      rate: 1.08,    locale: 'en-US' },
};

@Injectable({ providedIn: 'root' })
export class CurrencyService {
    private tokenService = inject(TokenService);
    private api = inject(ApiService);
    private analytics = inject(AnalyticsService);

    /** Current currency code — reacts to user preference changes. */
    readonly currencyCode = computed<string>(() =>
        this.tokenService.user()?.preferred_currency || 'XOF'
    );

    /** Current currency config. */
    readonly config = computed<CurrencyConfig>(() =>
        CURRENCIES[this.currencyCode()] ?? CURRENCIES['EUR']
    );

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

    /** Format a EUR value as a localized currency string. */
    format(eurValue: number, fractionDigits = 0): string {
        const { code, locale } = this.config();
        const displayValue = this.convert(eurValue);
        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: code,
                maximumFractionDigits: fractionDigits,
                minimumFractionDigits: fractionDigits,
            }).format(displayValue);
        } catch {
            return `${displayValue.toFixed(fractionDigits)} ${this.config().symbol}`;
        }
    }

    /** Format a EUR value as a plain number string (no currency symbol) in the display locale. */
    formatNumber(eurValue: number, fractionDigits = 0): string {
        const displayValue = this.convert(eurValue);
        const { locale } = this.config();
        return new Intl.NumberFormat(locale, {
            maximumFractionDigits: fractionDigits,
            minimumFractionDigits: fractionDigits,
        }).format(displayValue);
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
