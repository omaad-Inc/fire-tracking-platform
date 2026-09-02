import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { I18nService } from '../../../i18n/i18n.service';
import { MARKET_PERIODS } from '../../service/market.service';

/** 1S · 1M · 6M · 1A · Max, as a full-width capsule of tabs. */
@Component({
    standalone: true,
    selector: 'app-period-bar',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="flex p-1 rounded-full bg-surface-100 dark:bg-surface-800" role="tablist" [attr.aria-label]="i18n.t('markets.periodLabel')">
            @for (p of periods; track p.days) {
                <button type="button" role="tab" [attr.aria-selected]="days() === p.days" [attr.data-days]="p.days"
                        (click)="pick(p.days)"
                        class="flex-1 py-1.5 rounded-full text-xs font-bold transition-colors omaad-press"
                        [class]="days() === p.days
                            ? 'bg-surface-0 dark:bg-surface-700 text-surface-900 dark:text-surface-0 shadow-card'
                            : 'text-surface-500 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200'">
                    {{ i18n.t(p.labelKey) }}
                </button>
            }
        </div>
    `,
})
export class PeriodBarComponent {
    readonly i18n = inject(I18nService);
    readonly periods = MARKET_PERIODS;
    days = input.required<number>();
    daysChange = output<number>();
    pick(d: number): void { if (d !== this.days()) this.daysChange.emit(d); }
}
