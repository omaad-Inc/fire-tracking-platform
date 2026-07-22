import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Design-system section header (Sprint 2).
 *
 * Smaller than the page header: a section/card-group title (`text-subheading`
 * token) with an optional subtitle and a right-aligned actions slot. Use inside
 * a page to introduce a block (a chart, a list, a settings group).
 * Presentational, OnPush.
 */
@Component({
    standalone: true,
    selector: 'app-section-header',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div class="min-w-0">
                <h2 class="text-subheading font-bold text-surface-900 dark:text-surface-0 m-0 truncate">
                    {{ title }}
                </h2>
                @if (subtitle) {
                    <p class="text-sm text-surface-500 dark:text-surface-400 mt-0.5 m-0">{{ subtitle }}</p>
                }
            </div>
            <div class="flex items-center gap-2 shrink-0">
                <ng-content select="[actions]"></ng-content>
            </div>
        </div>
    `,
})
export class SectionHeaderComponent {
    @Input({ required: true }) title = '';
    @Input() subtitle?: string;
}
