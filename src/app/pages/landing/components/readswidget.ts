import { ChangeDetectionStrategy, Component, ElementRef, HostListener, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { I18nService } from '../../../i18n/i18n.service';
import { BlogPost, COVER_FALLBACK, publishedPosts } from '../blog/posts';
import { frenchTypo, landingLangPrefix } from './landing-shared';
import { RevealDirective } from './reveal.directive';

/**
 * "Lectures utiles": six FIRE Africa editions right before the footer (the
 * N26 "Noteworthy reads" pattern). Real posts from blog/posts.ts, 720 px
 * WebP covers, the whole card is one link. Phones swipe the snap track;
 * from 1024 px three cards are visible and two arrows page through the
 * rest (a page = the visible three), scroll-snap keeps the edges aligned.
 */
@Component({
    selector: 'reads-widget',
    standalone: true,
    imports: [RouterModule, RevealDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (posts.length) {
            <section id="reads" class="lp-section-tight scroll-mt-16" [attr.aria-labelledby]="'reads-title'">
                <div class="lp-container">
                    <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 text-center md:text-left" lpReveal>
                        <div class="max-w-[36rem]">
                            <span class="lp-eyebrow">{{ t('landing.reads.eyebrow') }}</span>
                            <h2 id="reads-title" class="lp-h2 mt-3">{{ t('landing.reads.h2') }}</h2>
                            <p class="lp-lead mt-3">{{ t('landing.reads.lead') }}</p>
                        </div>
                        <div class="flex items-center justify-center md:justify-end gap-4 shrink-0">
                            <a class="lp-link" [routerLink]="[currentLang, 'blog']">
                                {{ t('landing.reads.all') }}
                                <i class="pi pi-arrow-right text-[12px]" aria-hidden="true"></i>
                            </a>
                            @if (posts.length > 3) {
                                <div class="hidden lg:flex items-center gap-2" role="group" [attr.aria-label]="t('landing.reads.carouselAria')">
                                    <button type="button" class="lp-snap-arrow" [attr.aria-label]="t('landing.reads.prevAria')" [attr.aria-disabled]="!canPrev()" (click)="page(-1)">
                                        <i class="pi pi-arrow-left" aria-hidden="true"></i>
                                    </button>
                                    <button type="button" class="lp-snap-arrow" [attr.aria-label]="t('landing.reads.nextAria')" [attr.aria-disabled]="!canNext()" (click)="page(1)">
                                        <i class="pi pi-arrow-right" aria-hidden="true"></i>
                                    </button>
                                </div>
                            }
                        </div>
                    </div>

                    <div #track class="lp-snap lp-snap-3 mt-8 lg:mt-10" (scroll)="syncArrows()" lpReveal>
                        @for (p of posts; track p.slug) {
                            <a class="lp-read group" [routerLink]="[currentLang, 'blog', p.slug]">
                                <span class="lp-read-cover">
                                    <img [src]="cover(p)" [alt]="''" width="720" height="480" loading="lazy" decoding="async" (error)="onCoverError($event)">
                                </span>
                                <span class="block mt-4 text-[12px] font-semibold uppercase tracking-[0.08em] lp-muted">
                                    {{ t('landing.reads.edition') }} {{ p.edition }} · {{ p.readingMinutes }} {{ t('landing.reads.minutes') }}
                                </span>
                                <span class="block mt-2 lp-h3 text-[20px] group-hover:text-[color:var(--lp-ochre-ink)] transition-colors">{{ typo(p.title) }}</span>
                                <span class="block mt-2 lp-body text-[15px] lp-clamp-3">{{ p.excerpt }}</span>
                            </a>
                        }
                    </div>
                </div>
            </section>
        }
    `,
})
export class ReadsWidget {
    private i18n = inject(I18nService);
    private router = inject(Router);

    /**
     * Editorial pick, in display order: the owner's three (2026-10-16) in the
     * visible slots, then three more (2026-10-17: the retirement x171 edition,
     * the SGI comparison that backs the Outils tool, the diaspora PEA). A slug
     * that is not published yet is skipped and the slot is filled with the
     * most recent sent edition not already shown, so the block never has
     * fewer than six while six exist.
     */
    static readonly FEATURED_SLUGS = ['regle-4-pourcent', 'dca-brvm', 'trading-vs-dca', 'retraite-calcul-171', 'comparer-sgi-brvm', 'pea-diaspora'];
    static readonly COUNT = 6;

    readonly posts: BlogPost[] = ReadsWidget.pick(publishedPosts());

    private readonly track = viewChild<ElementRef<HTMLElement>>('track');
    readonly canPrev = signal(false);
    readonly canNext = signal(false);

    constructor() {
        // Browser only (afterNextRender never runs on the server): the arrows
        // reflect the real scroll range once the cards have their width.
        afterNextRender(() => this.syncArrows());
    }

    @HostListener('window:resize')
    syncArrows(): void {
        const el = this.track()?.nativeElement;
        if (!el) return;
        const max = el.scrollWidth - el.clientWidth;
        this.canPrev.set(el.scrollLeft > 2);
        this.canNext.set(el.scrollLeft < max - 2);
    }

    /** One page = the visible width (three cards on desktop); the snap points align the edge. */
    page(dir: -1 | 1): void {
        const el = this.track()?.nativeElement;
        if (!el || (dir < 0 && !this.canPrev()) || (dir > 0 && !this.canNext())) return;
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        el.scrollBy({ left: dir * el.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
    }

    private static pick(published: BlogPost[]): BlogPost[] {
        const picked = ReadsWidget.FEATURED_SLUGS
            .map((slug) => published.find((p) => p.slug === slug))
            .filter((p): p is BlogPost => !!p);
        const fill = published
            .filter((p) => !picked.includes(p))
            .sort((a, b) => b.date.localeCompare(a.date));
        return [...picked, ...fill].slice(0, ReadsWidget.COUNT);
    }

    get currentLang(): string { return landingLangPrefix(this.router); }

    t(key: string): string { return this.i18n.t(key); }

    /** 720 px WebP twin of the cover (assets/blog/covers/w720/), the JPG is the fallback. */
    cover(p: BlogPost): string {
        return p.coverImage.replace(/^assets\/blog\/covers\/(edition-\d+)\.jpg$/, 'assets/blog/covers/w720/$1.webp');
    }

    onCoverError(ev: Event): void {
        const img = ev.target as HTMLImageElement;
        if (img.src.includes('/w720/')) img.src = img.src.replace('/w720/', '/').replace(/\.webp$/, '.jpg');
        else img.src = COVER_FALLBACK;
    }

    typo(text: string): string { return frenchTypo(text); }
}
