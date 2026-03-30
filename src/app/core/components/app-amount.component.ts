import { Component, input, computed, inject } from '@angular/core';
import { CurrencyService } from '../services/currency.service';

/**
 * Renders a EUR value as a formatted amount with the currency symbol
 * displayed smaller than the number, ensuring consistent visual hierarchy.
 *
 * Usage:
 *   <app-amount [value]="item.value" />
 *   <app-amount [value]="item.value" [sign]="true" />   ← prepends + or -
 *   <app-amount [value]="item.value" [forceSign]="'+'" /> ← always shows prefix
 */
@Component({
    selector: 'app-amount',
    standalone: true,
    template: `
        @if (prefix()) {
            <span>{{ prefix() }}</span>
        }
        <span>{{ numStr() }}</span><span class="text-[0.6em] font-semibold ml-0.5 opacity-60 align-baseline">{{ symbol() }}</span>
    `,
    host: { class: 'inline-flex items-baseline gap-0' },
})
export class AppAmountComponent {
    /** Value in EUR (will be converted to display currency). */
    value = input<number | null | undefined>(0);

    /**
     * Optional explicit prefix string (e.g. '+', '-').
     * If not provided, no prefix is shown.
     */
    prefix = input<string>('');

    private cs = inject(CurrencyService);

    numStr = computed(() => this.cs.formatNumber(Math.abs(this.value() ?? 0)));
    symbol = computed(() => this.cs.config().symbol);
}
