import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

/**
 * Reusable KPI/card loading skeleton (P2-FE-5).
 *
 * The dashboard StatsWidget (and other widgets) hand-pasted the same ~15-line
 * pulse block 3× per loading state, diverging over time. This is the single
 * source: `<app-skeleton-card [count]="3" />` renders N identical grid cards
 * matching the KPI card footprint (label bar + value bar + icon square + a
 * bottom bar). Purely presentational, OnPush.
 */
@Component({
    standalone: true,
    selector: 'app-skeleton-card',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @for (i of items; track i) {
            <div [class]="cellClass">
                <div class="rounded-2xl border border-surface-200 dark:border-surface-800 p-5 animate-pulse">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex-1">
                            <div class="h-4 bg-surface-200 dark:bg-surface-700 rounded w-24 mb-2"></div>
                            <div class="h-8 bg-surface-200 dark:bg-surface-700 rounded w-32"></div>
                        </div>
                        <div class="w-12 h-12 rounded-xl bg-surface-200 dark:bg-surface-700"></div>
                    </div>
                    <div class="h-6 bg-surface-200 dark:bg-surface-700 rounded w-40"></div>
                </div>
            </div>
        }
    `,
})
export class SkeletonCardComponent {
    /** How many skeleton cards to render. */
    @Input() count = 1;
    /** Grid/utility classes applied to each card cell (defaults to the KPI 3-up layout). */
    @Input() cellClass = 'col-span-12 sm:col-span-6 lg:col-span-6 xl:col-span-4';

    get items(): number[] {
        return Array.from({ length: Math.max(0, this.count) }, (_, i) => i);
    }
}
