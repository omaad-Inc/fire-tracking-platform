import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';

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
 *
 * When a card is the ROOT element of a widget and needs to carry layout classes
 * (e.g. `relative overflow-hidden h-full flex flex-col` for a full-height,
 * corner-clipping card), pass them via `innerClass` so they land on the actual
 * card box, and set `flush` so the component host generates no layout box of its
 * own (`display: contents`) — the card then behaves exactly like the raw div it
 * replaced, with no extra wrapper affecting a grid/flex parent.
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
    // Block by default so a card behaves as a normal block wrapper (and host
    // classes like `mb-5` or grid `col-span-*` apply). `flush` overrides this to
    // `display: contents` via the host binding below.
    styles: [':host { display: block; }'],
})
export class UiCardComponent {
    /** Padding scale: none | sm (p-4) | md (p-5, default) | lg (p-6). */
    @Input() padding: 'none' | 'sm' | 'md' | 'lg' = 'md';
    /** Adds hover lift + pointer affordance for clickable cards. */
    @Input() interactive = false;
    /** Extra utility classes for the card box itself (layout: h-full, overflow, …). */
    @Input() innerClass = '';
    /** Drop `shadow-card` (for surfaces that intentionally sit flat, borders only). */
    @Input() flat = false;
    /** Host renders `display: contents` so the card box is the effective layout
     *  child of the parent — use when this card replaces a widget's root div. */
    @Input() flush = false;

    @HostBinding('style.display') get hostDisplay(): string | null {
        return this.flush ? 'contents' : null;
    }

    get cardClass(): string {
        const pad = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' }[this.padding];
        const base =
            'rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 ' +
            'dark:border-surface-800';
        const shadow = this.flat ? '' : ' shadow-card';
        const hover = this.interactive
            ? ' transition-shadow duration-200 ease-standard hover:shadow-lifted cursor-pointer'
            : '';
        const extra = this.innerClass ? ` ${this.innerClass}` : '';
        return `${base}${shadow} ${pad}${hover}${extra}`.replace(/\s+/g, ' ').trim();
    }
}
