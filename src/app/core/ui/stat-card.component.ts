import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Design-system KPI / stat card (Sprint 2).
 *
 * A labelled metric tile (label + value + optional icon + optional trend),
 * matching the loading footprint of `app-skeleton-card`. Standardizes the
 * dashboard/patrimoine KPI tiles that were hand-built per widget. The value is
 * content-projected so callers can drop in `<app-amount>` or any markup.
 * Presentational, OnPush.
 *
 *   <app-stat-card label="Patrimoine net" icon="pi-wallet" [trend]="4.2">
 *     <app-amount [value]="netWorth()" />
 *   </app-stat-card>
 */
@Component({
    standalone: true,
    selector: 'app-stat-card',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200
                    dark:border-surface-800 shadow-card p-5">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <p class="text-eyebrow uppercase font-semibold text-surface-500 dark:text-surface-400 mb-2">
                        {{ label }}
                    </p>
                    <div class="text-2xl font-extrabold text-surface-900 dark:text-surface-0 truncate">
                        <ng-content></ng-content>
                    </div>
                </div>
                @if (icon) {
                    <span class="w-11 h-11 rounded-xl grid place-items-center shrink-0
                                 bg-brand-50 dark:bg-brand-800/40 text-brand-600 dark:text-brand-300">
                        <i class="pi {{ icon }} text-lg"></i>
                    </span>
                }
            </div>
            @if (trend !== undefined || hint) {
                <div class="mt-3 flex items-center gap-2 text-sm">
                    @if (trend !== undefined) {
                        <span [class]="trendClass">
                            <i class="pi {{ trend >= 0 ? 'pi-arrow-up-right' : 'pi-arrow-down-right' }} text-xs"></i>
                            {{ trend >= 0 ? '+' : '' }}{{ trend }}%
                        </span>
                    }
                    @if (hint) {
                        <span class="text-surface-500 dark:text-surface-400">{{ hint }}</span>
                    }
                </div>
            }
        </div>
    `,
})
export class StatCardComponent {
    @Input({ required: true }) label = '';
    /** PrimeIcons class, e.g. "pi-wallet". */
    @Input() icon?: string;
    /** Signed percentage; renders a colored up/down trend when provided. */
    @Input() trend?: number;
    /** Small muted note next to the trend, e.g. "vs. 30 derniers jours". */
    @Input() hint?: string;

    get trendClass(): string {
        const tone =
            (this.trend ?? 0) >= 0
                ? 'text-positive-600 dark:text-positive-400'
                : 'text-negative-600 dark:text-negative-400';
        return `inline-flex items-center gap-1 font-semibold ${tone}`;
    }
}
