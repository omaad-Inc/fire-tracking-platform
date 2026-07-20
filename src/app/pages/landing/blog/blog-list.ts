import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { RippleModule } from 'primeng/ripple';
import { TopbarWidget } from '../components/topbarwidget.component';
import { FooterWidget } from '../components/footerwidget';
import { I18nService } from '../../../i18n/i18n.service';
import { BLOG_POSTS, BlogPost } from './posts';

@Component({
    selector: 'app-blog-list',
    standalone: true,
    imports: [CommonModule, RouterModule, RippleModule, TopbarWidget, FooterWidget],
    template: `
        <div class="bg-surface-0 dark:bg-surface-900 min-h-screen">
            <!-- Topbar -->
            <div class="fixed top-0 left-0 right-0 z-50 bg-surface-0/80 dark:bg-surface-900/80 backdrop-blur-lg border-b border-surface-200/50 dark:border-surface-800/50"
                 style="padding-top: env(safe-area-inset-top, 0px)">
                <topbar-widget class="py-4 px-6 mx-0 md:mx-12 lg:mx-20 lg:px-20 flex items-center justify-between relative lg:static" />
            </div>

            <!-- Content -->
            <main class="pt-32 pb-24 px-6 md:px-12 lg:px-20 max-w-7xl mx-auto">

                <!-- Hero -->
                <header class="mb-12 max-w-3xl">
                    <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ochre-100 dark:bg-ochre-900/20 border border-ochre-200 dark:border-ochre-700/40 text-ochre-700 dark:text-ochre-400 text-xs font-semibold uppercase tracking-wider mb-4">
                        <span class="w-1.5 h-1.5 rounded-full bg-ochre-500"></span>
                        {{ isFr() ? 'Le blog FIRE Africa' : 'The FIRE Africa blog' }}
                    </span>
                    <h1 class="text-4xl md:text-5xl font-bold text-surface-900 dark:text-white mb-4 tracking-tight">
                        {{ isFr() ? 'Construis. Protège. Règne.' : 'Build. Protect. Reign.' }}
                    </h1>
                    <p class="text-lg text-surface-600 dark:text-surface-400 leading-relaxed">
                        {{ isFr()
                            ? 'Toutes les éditions de la newsletter FIRE Africa : analyses BRVM, stratégies patrimoine et chiffres de la diaspora.'
                            : 'Every edition of the FIRE Africa newsletter — BRVM analyses, wealth strategies, and numbers from the diaspora.' }}
                    </p>
                </header>

                <!-- Tag filter -->
                <div class="flex flex-wrap gap-2 mb-10">
                    <button (click)="selectedTag.set(null)" pRipple
                            class="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                            [ngClass]="selectedTag() === null
                                ? 'bg-brand-700 text-white'
                                : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-200'">
                        {{ isFr() ? 'Tous' : 'All' }}
                        <span class="ml-1.5 opacity-70">{{ posts.length }}</span>
                    </button>
                    @for (tag of allTags(); track tag) {
                        <button (click)="selectedTag.set(tag)" pRipple
                                class="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                                [ngClass]="selectedTag() === tag
                                    ? 'bg-brand-700 text-white'
                                    : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-200'">
                            {{ tag }}
                        </button>
                    }
                </div>

                <!-- Article grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    @for (post of filteredPosts(); track post.slug) {
                        <a [routerLink]="['/', lang, 'blog', post.slug]"
                           class="group flex flex-col rounded-2xl overflow-hidden bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-100/40 transition-all cursor-pointer">

                            <!-- Cover -->
                            <div class="relative aspect-[16/10] overflow-hidden bg-surface-100 dark:bg-surface-800">
                                <img [src]="post.coverImage" [alt]="post.title"
                                     class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                     loading="lazy" />
                                <span class="absolute top-3 left-3 px-2 py-1 rounded-md bg-brand-900/90 text-white text-[10px] font-bold tracking-widest">
                                    #{{ post.edition }}
                                </span>
                            </div>

                            <!-- Body -->
                            <div class="flex-1 flex flex-col p-5">
                                <!-- Tags -->
                                <div class="flex flex-wrap gap-1.5 mb-3">
                                    @for (tag of post.tags.slice(0, 2); track tag) {
                                        <span class="px-2 py-0.5 rounded-md bg-ochre-50 text-ochre-700 dark:text-ochre-400 text-[11px] font-medium">
                                            {{ tag }}
                                        </span>
                                    }
                                </div>

                                <!-- Title -->
                                <h2 class="text-lg font-bold text-surface-900 dark:text-white mb-2 leading-snug group-hover:text-brand-700 transition-colors">
                                    {{ post.title }}
                                </h2>

                                <!-- Excerpt -->
                                <p class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed line-clamp-3 mb-4">
                                    {{ post.excerpt }}
                                </p>

                                <!-- Footer: date + read more -->
                                <div class="mt-auto flex items-center justify-between pt-3 border-t border-surface-100">
                                    <time class="text-xs text-surface-400 dark:text-surface-500">{{ formatDate(post.date) }}</time>
                                    <span class="text-xs font-semibold text-brand-700 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                                        {{ isFr() ? 'Lire' : 'Read' }}
                                        <i class="pi pi-arrow-right text-[10px]"></i>
                                    </span>
                                </div>
                            </div>
                        </a>
                    }
                </div>

                @if (filteredPosts().length === 0) {
                    <div class="text-center py-20 text-surface-400 dark:text-surface-500">
                        <i class="pi pi-inbox text-4xl mb-4 block"></i>
                        <p class="text-sm">{{ isFr() ? 'Aucun article avec ce tag.' : 'No article with this tag.' }}</p>
                    </div>
                }
            </main>

            <footer-widget />
        </div>
    `
})
export class BlogList {
    private router = inject(Router);
    private i18n   = inject(I18nService);

    posts: BlogPost[] = [...BLOG_POSTS].sort((a, b) => b.date.localeCompare(a.date));
    selectedTag = signal<string | null>(null);

    lang = '/fr';

    readonly isFr = computed(() => this.i18n.lang() === 'fr');

    readonly allTags = computed(() => {
        const tags = new Set<string>();
        this.posts.forEach(p => p.tags.forEach(t => tags.add(t)));
        return [...tags].sort();
    });

    readonly filteredPosts = computed(() => {
        const tag = this.selectedTag();
        if (!tag) return this.posts;
        return this.posts.filter(p => p.tags.includes(tag));
    });

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        this.lang = match ? match[1] : 'fr';
    }

    formatDate(iso: string): string {
        const d = new Date(iso);
        const locale = this.isFr() ? 'fr-FR' : 'en-US';
        return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
    }
}
