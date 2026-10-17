import { ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, afterNextRender, inject, input, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * A real Omaad screen inside a CSS phone frame (landing redesign).
 *
 * The capture is a 390x844 CSS-px screenshot of the web app at 2x
 * (780x1688, WebP), produced by `tools/capture-marketing-shots.mjs` from the
 * local demo account. A CSS frame instead of an exported mockup keeps the
 * text crisp at every DPR, the background theme-exact, and the asset ten
 * times lighter than a rendered device PNG. Styles live in
 * assets/layout/_landing.scss (.lp-phone*).
 *
 * Optional loop video (F9): `video` names a silent WebM (+ .mp4 twin) made
 * by tools/capture-hero-loop.mjs whose first frame is this very capture.
 * The <img> stays the LCP element and the poster; the <video> is appended
 * only in the browser, after the page is idle, never under reduced motion
 * or Save-Data, fades in once it plays, and pauses while scrolled away.
 */
@Component({
    selector: 'lp-phone',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="lp-phone">
            <img class="lp-phone-screen" [src]="src()" [alt]="alt()"
                 [attr.srcset]="srcset()" [attr.sizes]="sizes()"
                 width="780" height="1688"
                 [attr.loading]="eager() ? 'eager' : 'lazy'"
                 [attr.fetchpriority]="eager() ? 'high' : null"
                 decoding="async">
            @if (playVideo()) {
                <!-- [muted] as a PROPERTY: the attribute alone does not mute an element created
                     after parse, and an unmuted autoplay is blocked on phones. -->
                <!-- Visible ONLY while actually playing: a paused video drops back under the
                     capture, so Safari's centered play glyph (Low Power Mode, a blocked
                     autoplay, a tab coming back) is never shown on the hero. -->
                <video class="lp-phone-video" [class.is-ready]="ready()" autoplay [muted]="true" loop playsinline
                       preload="auto" aria-hidden="true" tabindex="-1" disablepictureinpicture disableremoteplayback
                       (canplay)="onCanPlay($event)" (playing)="ready.set(true)" (pause)="ready.set(false)" (ended)="ready.set(false)" (error)="ready.set(false)">
                    <source [src]="video()" type="video/webm">
                    <source [src]="mp4()" type="video/mp4">
                </video>
            }
        </div>
    `,
})
export class PhoneFrame {
    readonly src = input.required<string>();
    readonly alt = input.required<string>();
    /** `name.webp`-matching loop, e.g. `assets/marketing/synthese-loop.webm`; the `.mp4` twin is derived. */
    readonly video = input<string | null>(null);
    private readonly platformId = inject(PLATFORM_ID);
    readonly playVideo = signal(false);
    readonly ready = signal(false);

    private io: IntersectionObserver | null = null;

    constructor() {
        afterNextRender(() => {
            if (!isPlatformBrowser(this.platformId) || !this.video()) return;
            const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            const saveData = (navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData === true;
            if (reduced || saveData) return;
            // After idle: the poster is painted and the sign-up chunks are preloaded first.
            const start = () => this.playVideo.set(true);
            const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void };
            if (w.requestIdleCallback) w.requestIdleCallback(start, { timeout: 2500 }); else setTimeout(start, 1200);
        });
        inject(DestroyRef).onDestroy(() => this.io?.disconnect());
    }

    /**
     * First frame decodable: start explicitly (the autoplay attribute alone is
     * not honoured for an element inserted after parse on phones) and pause
     * out of view (battery, decode); the loop resumes when the frame is back.
     */
    onCanPlay(ev: Event): void {
        const el = ev.target as HTMLVideoElement;
        el.muted = true;
        el.play().catch(() => { /* refused: the capture underneath stays */ });
        if (this.io || typeof IntersectionObserver === 'undefined') return;
        // threshold 0: a frame peeking over the fold (phones crop the hero
        // phone to its top) must animate; only a fully hidden one pauses.
        this.io = new IntersectionObserver(([e]) => { if (e.isIntersecting) el.play().catch(() => {}); else el.pause(); }, { threshold: 0 });
        this.io.observe(el);
    }

    mp4(): string { return (this.video() ?? '').replace(/\.webm$/, '.mp4'); }
    /** The hero phone is the LCP candidate: eager + high priority. Everything else lazy. */
    readonly eager = input(false);
    /**
     * Rendered width hint for the browser's srcset choice. Defaults match the
     * landing layouts (76vw phone carousel, 360 px desktop column); the
     * showcase and trust frames pass their own.
     */
    readonly sizes = input('(min-width: 1024px) 360px, (min-width: 640px) 320px, 76vw');

    /** `name.webp` (780 px) + `name-460.webp` (460 px), both emitted by tools/capture-marketing-shots.mjs. */
    srcset(): string {
        const s = this.src();
        return `${s.replace(/\.webp$/, '-460.webp')} 460w, ${s} 780w`;
    }
}
