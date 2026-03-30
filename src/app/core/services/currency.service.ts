import { Injectable, inject, computed } from '@angular/core';
import { TokenService } from './token.service';
import { ApiService } from './api.service';
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

    /** Current currency code — reacts to user preference changes. */
    readonly currencyCode = computed<string>(() =>
        this.tokenService.user()?.preferred_currency || 'XOF'
    );

    /** Current currency config. */
    readonly config = computed<CurrencyConfig>(() =>
        CURRENCIES[this.currencyCode()] ?? CURRENCIES['EUR']
    );

    /** Convert a EUR value to the display currency. */
    convert(eurValue: number): number {
        return eurValue * this.config().rate;
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
        try {
            await firstValueFrom(this.api.updateProfile({ preferred_currency: code }));
        } catch { /* non-blocking */ }
        this.tokenService.setUser({ ...user, preferred_currency: code });
    }
}
