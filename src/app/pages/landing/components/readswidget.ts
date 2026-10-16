import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { I18nService } from '../../../i18n/i18n.service';
import { BlogPost, COVER_FALLBACK, publishedPosts } from '../blog/posts';
import { landingLangPrefix } from './landing-shared';
import { RevealDirective } from './reveal.directive';

/**
 * "Lectures utiles": the three most recent FIRE Africa editions, right
 * before the footer (the N26 "Noteworthy reads" pattern). Real posts from
 * blog/posts.ts, 720 px WebP covers, the whole card is one link.
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
                        <a class="lp-link shrink-0 justify-center md:justify-start" [routerLink]="[currentLang, 'blog']">
                            {{ t('landing.reads.all') }}
                            <i class="pi pi-arrow-right text-[12px]" aria-hidden="true"></i>
                        </a>
                    </div>

                    <div class="lp-snap lp-snap-3 mt-8 lg:mt-10">
                        @for (p of posts; track p.slug) {
                            <a class="lp-read group" [routerLink]="[currentLang, 'blog', p.slug]" lpReveal>
                                <span class="lp-read-cover">
                                    <img [src]="cover(p)" [alt]="''" width="720" height="480" loading="lazy" decoding="async" (error)="onCoverError($event)">
                                </span>
                                <span class="block mt-4 text-[12px] font-semibold uppercase tracking-[0.08em] lp-muted">
                                    {{ t('landing.reads.edition') }} {{ p.edition }} · {{ p.readingMinutes }} {{ t('landing.reads.minutes') }}
                                </span>
                                <span class="block mt-2 lp-h3 text-[20px] group-hover:text-[color:var(--lp-ochre-ink)] transition-colors">{{ p.title }}</span>
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

    /** Three most recent sent editions, newest first. */
    readonly posts: BlogPost[] = publishedPosts().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

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
}
