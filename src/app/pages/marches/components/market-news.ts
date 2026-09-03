import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../i18n/i18n.service';
import { BLOG_POSTS, COVER_FALLBACK, isPostPublished } from '../../landing/blog/posts';

/**
 * "Actualités": the latest FIRE Africa editions, as in-app links to the blog
 * (the mobile app hardcodes the same list and opens it externally). The blog
 * metadata is the single source; only published editions show, newest first.
 */
@Component({
    standalone: true,
    selector: 'app-market-news',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, NgOptimizedImage],
    template: `
        <div class="flex items-end justify-between gap-3 mb-3">
            <h2 class="text-lg font-bold text-surface-900 dark:text-surface-0 m-0">{{ i18n.t('markets.news') }}</h2>
            <a [routerLink]="['/', i18n.lang(), 'blog']" class="text-xs font-semibold text-ochre-600 dark:text-ochre-300 hover:underline">{{ i18n.t('markets.viewAll') }}</a>
        </div>
        <div class="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1 lg:grid lg:grid-cols-3 xl:grid-cols-6 lg:mx-0 lg:px-0 lg:overflow-visible">
            @for (p of posts(); track p.slug) {
                <a [routerLink]="['/', i18n.lang(), 'blog', p.slug]"
                   class="group w-[252px] shrink-0 lg:w-auto rounded-2xl overflow-hidden bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 hover:shadow-card transition-shadow omaad-press">
                    <span class="block relative h-[118px] bg-surface-100 dark:bg-surface-800 overflow-hidden">
                        <img [ngSrc]="p.coverImage" alt="" fill loading="lazy" decoding="async"
                             class="object-cover group-hover:scale-105 transition-transform duration-500"
                             (error)="onCoverError($event)" />
                    </span>
                    <span class="block p-3.5">
                        <span class="block text-[11px] text-surface-400 dark:text-surface-500">{{ i18n.t('markets.newsMeta', { minutes: p.readingMinutes }) }}</span>
                        <span class="block mt-1 text-sm font-bold leading-snug text-surface-900 dark:text-surface-0 line-clamp-3">{{ p.title }}</span>
                        @if (p.tags[0]) {
                            <span class="block mt-1.5 text-[11px] font-semibold text-surface-500 dark:text-surface-400">{{ p.tags[0] }}</span>
                        }
                    </span>
                </a>
            }
        </div>
    `,
})
export class MarketNewsComponent {
    readonly i18n = inject(I18nService);
    readonly posts = computed(() =>
        BLOG_POSTS.filter(isPostPublished).sort((a, b) => b.edition.localeCompare(a.edition)).slice(0, 6));

    onCoverError(ev: Event): void {
        const img = ev.target as HTMLImageElement;
        if (!img.src.endsWith(COVER_FALLBACK)) img.src = COVER_FALLBACK;
    }
}
