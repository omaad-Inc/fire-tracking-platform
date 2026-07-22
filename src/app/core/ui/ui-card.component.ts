import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Design-system card shell (Sprint 2).
 *
 * The one card container: standardized radius (`rounded-2xl` = 16px token),
 * `shadow-card`, surface background and border, consistent padding. Replaces
 * the hand-rolled `rounded-2xl border border-surface-200 ...` wrappers repeated
 * across the app. Content-projected; presentational, OnPush.
 *
 *   <app-ui-card>...</app-ui-card>
 *   <app-ui-card [interactive]="true" padding="lg">...</app-ui-card>
 */
@Component({
    standalone: true,
    selector: 'app-ui-card',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div [class]="cardClass">
            <ng-content></ng-content>
        </div>
    `,
})
export class UiCardComponent {
    /** Padding scale: none | sm (p-4) | md (p-5, default) | lg (p-6). */
    @Input() padding: 'none' | 'sm' | 'md' | 'lg' = 'md';
    /** Adds hover lift + pointer affordance for clickable cards. */
    @Input() interactive = false;

    get cardClass(): string {
        const pad = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' }[this.padding];
        const base =
            'rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 ' +
            'dark:border-surface-800 shadow-card';
        const hover = this.interactive
            ? ' transition-shadow duration-200 ease-standard hover:shadow-lifted cursor-pointer'
            : '';
        return `${base} ${pad}${hover}`;
    }
}
