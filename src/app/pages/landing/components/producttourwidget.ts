import { ChangeDetectionStrategy, Component, ElementRef, PLATFORM_ID, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { I18nService } from '../../../i18n/i18n.service';
import { PhoneFrame } from './phoneframe';
import { RevealDirective } from './reveal.directive';

/**
 * Product tour: four REAL screens (Synthèse, Patrimoine, Objectifs,
 * Assistant) in phone frames. A scroll-snap carousel on phones with button
 * dots, a four-up grid from 1024 px. Proves the product exists before any
 * feature claim (every premium fintech page shows the product in the first
 * two scrolls; ours showed a fake card).
 */
@Component({
    selector: 'product-tour-widget',
    standalone: true,
    imports: [PhoneFrame, RevealDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section id="tour" class="lp-section scroll-mt-16" [attr.aria-labelledby]="'tour-title'">
            <div class="lp-container">
                <div class="max-w-[40rem] mx-auto text-center" lpReveal>
                    <span class="lp-eyebrow">{{ t('landing.tour.eyebrow') }}</span>
                    <h2 id="tour-title" class="lp-h2 mt-3">{{ t('landing.tour.h2') }}</h2>
                    <p class="lp-lead mt-4">{{ t('landing.tour.lead') }}</p>
                </div>

                <div #track class="lp-snap mt-10 lg:mt-14" (scroll)="onScroll()" [attr.aria-label]="t('landing.tour.carouselAria')" role="group">
                    @for (s of screens; track s.key; let i = $index) {
                        <figure class="m-0" lpReveal>
                            <lp-phone [src]="'assets/marketing/' + s.file" [alt]="t('landing.tour.' + s.key + 'Alt')" />
                            <figcaption class="mt-5 px-1">
                                <span class="block lp-h3 text-[18px]">{{ t('landing.tour.' + s.key + 'Title') }}</span>
                                <span class="block mt-1 text-[15px] lp-body">{{ t('landing.tour.' + s.key + 'Desc') }}</span>
                            </figcaption>
                        </figure>
                    }
                </div>

                <div class="mt-5 flex justify-center gap-1 lg:hidden" role="tablist" [attr.aria-label]="t('landing.tour.dotsAria')">
                    @for (s of screens; track s.key; let i = $index) {
                        <button type="button" class="lp-dot" role="tab" [attr.aria-current]="active() === i" [attr.aria-label]="t('landing.tour.' + s.key + 'Title')" (click)="goTo(i)"></button>
                    }
                </div>
            </div>
        </section>
    `,
})
export class ProductTourWidget {
    private i18n = inject(I18nService);
    private platformId = inject(PLATFORM_ID);
    private track = viewChild<ElementRef<HTMLElement>>('track');

    readonly screens = [
        { key: 'synthese', file: 'synthese.webp' },
        { key: 'patrimoine', file: 'patrimoine.webp' },
        { key: 'objectifs', file: 'objectifs.webp' },
        { key: 'assistant', file: 'assistant.webp' },
    ];
    active = signal(0);

    constructor() { afterNextRender(() => this.onScroll()); }

    t(key: string): string { return this.i18n.t(key); }

    onScroll(): void {
        if (!isPlatformBrowser(this.platformId)) return;
        const el = this.track()?.nativeElement;
        if (!el || !el.children.length) return;
        const slide = el.children[0] as HTMLElement;
        const step = slide.offsetWidth + 16;
        this.active.set(Math.max(0, Math.min(this.screens.length - 1, Math.round(el.scrollLeft / step))));
    }

    goTo(i: number): void {
        const el = this.track()?.nativeElement;
        const slide = el?.children[i] as HTMLElement | undefined;
        if (!el || !slide) return;
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        el.scrollTo({ left: slide.offsetLeft - el.offsetLeft - (el.clientWidth - slide.offsetWidth) / 2, behavior: reduced ? 'auto' : 'smooth' });
        this.active.set(i);
    }
}
