import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A real Omaad screen inside a CSS phone frame (landing redesign).
 *
 * The capture is a 390x844 CSS-px screenshot of the web app at 2x
 * (780x1688, WebP), produced by `tools/capture-marketing-shots.mjs` from the
 * local demo account. A CSS frame instead of an exported mockup keeps the
 * text crisp at every DPR, the background theme-exact, and the asset ten
 * times lighter than a rendered device PNG. Styles live in
 * assets/layout/_landing.scss (.lp-phone*).
 */
@Component({
    selector: 'lp-phone',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="lp-phone">
            <img class="lp-phone-screen" [src]="src()" [alt]="alt()"
                 width="780" height="1688"
                 [attr.loading]="eager() ? 'eager' : 'lazy'"
                 [attr.fetchpriority]="eager() ? 'high' : null"
                 decoding="async">
        </div>
    `,
})
export class PhoneFrame {
    readonly src = input.required<string>();
    readonly alt = input.required<string>();
    /** The hero phone is the LCP candidate: eager + high priority. Everything else lazy. */
    readonly eager = input(false);
}
