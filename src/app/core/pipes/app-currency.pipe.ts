import { Pipe, PipeTransform, inject } from '@angular/core';
import { CurrencyService } from '../services/currency.service';

/**
 * Converts and formats a EUR value in the user's preferred currency.
 * pure: false so it re-evaluates when the currency signal changes.
 *
 * Usage: {{ value | appCurrency }}  or  {{ value | appCurrency:2 }}
 */
@Pipe({ name: 'appCurrency', standalone: true, pure: false })
export class AppCurrencyPipe implements PipeTransform {
    private cs = inject(CurrencyService);

    transform(value: number | null | undefined, fractionDigits = 0): string {
        if (value == null) return '—';
        return this.cs.format(value, fractionDigits);
    }
}
