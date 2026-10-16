import { Directive, ElementRef, PLATFORM_ID, afterNextRender, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Fade-up once when the element enters the viewport (landing redesign).
 * Pure CSS (`.lp-reveal` / `.is-in` in assets/layout/_landing.scss), one
 * shared IntersectionObserver, and nothing at all when the visitor asked for
 * reduced motion or when JS runs on the server: the prerendered HTML is
 * delivered visible, the class is added only in the browser.
 */
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
    if (!observer) {
        observer = new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (e.isIntersecting) {
                    e.target.classList.add('is-in');
                    observer!.unobserve(e.target);
                }
            }
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    }
    return observer;
}

@Directive({ selector: '[lpReveal]', standalone: true })
export class RevealDirective {
    private el = inject<ElementRef<HTMLElement>>(ElementRef);
    private platformId = inject(PLATFORM_ID);

    constructor() {
        afterNextRender(() => {
            if (!isPlatformBrowser(this.platformId)) return;
            const node = this.el.nativeElement;
            const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            if (reduced || typeof IntersectionObserver === 'undefined') { node.classList.add('is-in'); return; }
            node.classList.add('lp-reveal');
            getObserver().observe(node);
        });
    }
}
