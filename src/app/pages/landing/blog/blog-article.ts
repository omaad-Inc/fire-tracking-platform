import { Component, HostListener, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RippleModule } from 'primeng/ripple';
import { firstValueFrom } from 'rxjs';
import { BlogTopbar } from './blog-topbar';
import { FooterWidget } from '../components/footerwidget';
import { NewsletterSignup } from '../components/newsletter-signup';
import { I18nService, Lang } from '../../../i18n/i18n.service';
import { SeoService, SITE_ORIGIN } from '../../../core/services/seo.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { BlogPost, COVER_FALLBACK, absoluteCoverUrl, findPostBySlug, publishedPosts } from './posts';

/** Normalized web-native blocks (assets/blog/edition-NNN.json, built by
 *  resources/build_blog.py). No em dashes, no email HTML. */
type Block =
    | { kind: 'section'; text: string }
    | { kind: 'h2'; text: string }
    | { kind: 'subheading'; text: string }
    | { kind: 'paragraph'; text: string }
    | { kind: 'deflist'; items: { emoji: string; term: string; desc: string }[] }
    | { kind: 'stat'; value: string; label: string; source: string }
    | { kind: 'resource'; emoji: string; title: string; meta: string; text: string; url: string | null }
    | { kind: 'cta'; label: string; url: string }
    | { kind: 'summary'; items: string[] }
    | { kind: 'callout'; text: string; label?: string; url?: string };

interface ArticleDoc { edition: string; slug: string; title: string; blocks: Block[]; }

/** Render-ready block: SafeHtml precomputed, first paragraph flagged for a drop cap. */
interface RBlock {
    kind: Block['kind'];
    text?: string;
    value?: string; label?: string; source?: string;
    emoji?: string; title?: string; meta?: string; url?: string | null;
    items?: { emoji: string; term: string; desc: string }[];
    safe?: SafeHtml;
    safeItems?: SafeHtml[];
    drop?: boolean;
}

@Component({
    selector: 'app-blog-article',
    standalone: true,
    imports: [CommonModule, RouterModule, RippleModule, BlogTopbar, FooterWidget, NewsletterSignup],
    template: `
        <div class="bg-surface-0 dark:bg-surface-950 min-h-screen">
            <!-- Reading progress -->
            <div class="fixed top-0 left-0 right-0 z-[60] h-1 bg-transparent">
                <div class="h-full bg-ochre-500 transition-[width] duration-150 ease-out" [style.width.%]="progress()"></div>
            </div>

            <!-- Resource topbar (same pattern as the BRVM tools) -->
            <app-blog-topbar />

            <main class="pt-12 md:pt-16 pb-24 px-6">
                @if (post(); as p) {
                    <!-- Back link -->
                    <div class="max-w-[680px] mx-auto mb-8">
                        <a [routerLink]="['/', lang, 'blog']" pRipple
                           class="inline-flex items-center gap-2 text-sm text-surface-500 dark:text-surface-400 hover:text-brand-700 dark:hover:text-ochre-400 transition-colors">
                            <i class="pi pi-arrow-left text-xs"></i>
                            {{ isFr() ? 'Tous les articles' : 'All articles' }}
                        </a>
                    </div>

                    <!-- Hero header -->
                    <header class="max-w-[720px] mx-auto mb-10 text-center">
                        <!-- Magazine kicker: edition + primary category on one line (mobile-clean) -->
                        <div class="mb-5 flex items-center justify-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.18em]">
                            <span class="text-ochre-600 dark:text-ochre-400">Édition&nbsp;#{{ p.edition }}</span>
                            @if (p.tags.length) {
                                <span class="w-1 h-1 rounded-full bg-surface-300 dark:bg-surface-600"></span>
                                <span class="text-surface-400 dark:text-surface-500">{{ p.tags[0] }}</span>
                            }
                        </div>

                        <h1 class="text-3xl md:text-[2.7rem] font-bold text-surface-900 dark:text-white mb-5 leading-[1.12] tracking-tight max-w-[20ch] mx-auto">
                            {{ p.title }}
                        </h1>
                        <p class="text-lg md:text-xl text-surface-500 dark:text-surface-400 leading-relaxed max-w-[46ch] mx-auto mb-7">
                            {{ p.excerpt }}
                        </p>

                        <!-- Author row -->
                        <div class="flex items-center justify-center gap-3">
                            <span class="inline-flex items-center justify-center w-9 h-9 rounded-full bg-brand-700 text-white text-xs font-bold shrink-0">O</span>
                            <div class="text-left">
                                <div class="text-sm font-semibold text-surface-900 dark:text-surface-0 leading-tight">FIRE Africa</div>
                                <div class="text-xs text-surface-400 dark:text-surface-500 flex items-center gap-1.5">
                                    <time>{{ formatDate(p.date) }}</time>
                                    <span class="w-1 h-1 rounded-full bg-surface-300 dark:bg-surface-600"></span>
                                    <span>{{ p.readingMinutes }} {{ isFr() ? 'min de lecture' : 'min read' }}</span>
                                </div>
                            </div>
                        </div>
                    </header>

                    <!-- Cover -->
                    <div class="max-w-[860px] mx-auto mb-12 md:mb-16">
                        <img [src]="p.coverImage" [alt]="p.title"
                             class="w-full aspect-[16/9] object-cover rounded-2xl shadow-sm"
                             width="1200" height="750" decoding="async"
                             (error)="onCoverError($event)" />
                    </div>

                    <!-- Body -->
                    <article class="max-w-[680px] mx-auto">
                        @if (loading()) {
                            <div class="space-y-4">
                                @for (i of [1,2,3,4,5,6]; track i) {
                                    <div class="h-4 bg-surface-100 dark:bg-surface-800 rounded animate-pulse"
                                         [style.width.%]="55 + (i * 9) % 40"></div>
                                }
                            </div>
                        } @else {
                            @for (b of blocks(); track $index) {
                                @switch (b.kind) {
                                    @case ('section') {
                                        <div class="flex items-center gap-3 mt-14 mb-6 first:mt-2">
                                            <span class="text-[11px] font-bold uppercase tracking-[0.18em] text-ochre-600 dark:text-ochre-400 whitespace-nowrap">{{ b.text }}</span>
                                            <span class="h-px flex-1 bg-surface-200 dark:bg-surface-800"></span>
                                        </div>
                                    }
                                    @case ('h2') {
                                        <h2 class="text-[1.7rem] md:text-[2rem] font-bold text-surface-900 dark:text-white mt-4 mb-6 leading-[1.2] tracking-tight">{{ b.text }}</h2>
                                    }
                                    @case ('subheading') {
                                        <h3 class="text-xl md:text-2xl font-bold text-surface-900 dark:text-surface-0 mt-10 mb-3 leading-snug">{{ b.text }}</h3>
                                    }
                                    @case ('paragraph') {
                                        <p class="article-body text-surface-800 dark:text-surface-200 mb-6"
                                           [class.drop-cap]="b.drop" [innerHTML]="b.safe"></p>
                                    }
                                    @case ('deflist') {
                                        <div class="grid sm:grid-cols-2 gap-3 my-8">
                                            @for (it of b.items; track it.term) {
                                                <div class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-50/60 dark:bg-surface-900 p-5">
                                                    <div class="flex items-center gap-2 mb-1.5">
                                                        <span class="text-lg">{{ it.emoji }}</span>
                                                        <span class="font-bold text-surface-900 dark:text-white">{{ it.term }}</span>
                                                    </div>
                                                    <p class="text-[15px] text-surface-600 dark:text-surface-400 leading-relaxed">{{ it.desc }}</p>
                                                </div>
                                            }
                                        </div>
                                    }
                                    @case ('stat') {
                                        <figure class="my-10 rounded-2xl border border-ochre-500/25 bg-ochre-500/[0.06] dark:bg-ochre-500/[0.08] px-6 py-8 text-center">
                                            <div class="text-5xl md:text-6xl font-extrabold text-ochre-600 dark:text-ochre-400 leading-none tracking-tight tnum">{{ b.value }}</div>
                                            @if (b.label) { <figcaption class="mt-3 text-base font-semibold text-surface-800 dark:text-surface-200 max-w-[36ch] mx-auto leading-snug">{{ b.label }}</figcaption> }
                                            @if (b.source) { <div class="mt-2 text-xs italic text-surface-400 dark:text-surface-500">{{ b.source }}</div> }
                                        </figure>
                                    }
                                    @case ('resource') {
                                        <div class="my-6 rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-50/60 dark:bg-surface-900 p-5">
                                            <div class="flex items-baseline gap-2 flex-wrap">
                                                <span class="text-lg leading-none">{{ b.emoji }}</span>
                                                <span class="font-bold text-surface-900 dark:text-white">{{ b.title }}</span>
                                                @if (b.meta) { <span class="text-[13px] text-surface-500 dark:text-surface-400">{{ b.meta }}</span> }
                                            </div>
                                            @if (b.text) { <p class="mt-2 text-[15px] text-surface-600 dark:text-surface-400 leading-relaxed" [innerHTML]="b.safe"></p> }
                                            @if (b.url) {
                                                <a [href]="b.url" target="_blank" rel="noopener"
                                                   class="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 dark:text-ochre-400 hover:underline">
                                                    {{ isFr() ? 'Ouvrir la ressource' : 'Open resource' }} <i class="pi pi-external-link text-[10px]"></i>
                                                </a>
                                            }
                                        </div>
                                    }
                                    @case ('cta') {
                                        <div class="my-8">
                                            <a [href]="b.url" target="_blank" rel="noopener" pRipple
                                               class="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-ochre-500 hover:bg-ochre-400 text-warm-900 font-semibold text-sm transition-colors no-underline">
                                                {{ b.label }} <i class="pi pi-arrow-right text-xs"></i>
                                            </a>
                                        </div>
                                    }
                                    @case ('summary') {
                                        <div class="my-10 rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-50/60 dark:bg-surface-900 p-6">
                                            <div class="flex items-center gap-2 mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-surface-500 dark:text-surface-400">
                                                <span>🇬🇧</span><span>{{ isFr() ? 'En résumé (EN)' : 'In summary' }}</span>
                                            </div>
                                            <ol class="space-y-3 list-none">
                                                @for (it of b.safeItems; track $index) {
                                                    <li class="flex gap-3 text-[15px] text-surface-600 dark:text-surface-300 leading-relaxed">
                                                        <span class="shrink-0 w-6 h-6 rounded-full bg-surface-200 dark:bg-surface-800 text-surface-600 dark:text-surface-300 text-xs font-bold flex items-center justify-center">{{ $index + 1 }}</span>
                                                        <span [innerHTML]="it"></span>
                                                    </li>
                                                }
                                            </ol>
                                        </div>
                                    }
                                    @case ('callout') {
                                        <div class="my-6 rounded-2xl border-l-4 border-ochre-500 bg-surface-50 dark:bg-surface-900 pl-5 pr-4 py-4">
                                            @if (b.label) { <div class="text-[11px] font-bold uppercase tracking-widest text-ochre-600 dark:text-ochre-400 mb-1.5">{{ b.label }}</div> }
                                            <p class="text-[15px] text-surface-700 dark:text-surface-300 leading-relaxed" [innerHTML]="b.safe"></p>
                                        </div>
                                    }
                                }
                            }
                        }

                        <!-- Disclaimer -->
                        <div class="mt-14 p-4 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 text-surface-500 dark:text-surface-400 text-xs leading-relaxed">
                            ⚠️ {{ isFr()
                                ? 'Contenu éducatif et informatif uniquement. Ne constitue pas un conseil en investissement. Les performances passées ne préjugent pas des performances futures.'
                                : 'Educational and informational content only. Not investment advice. Past performance does not guarantee future results.' }}
                        </div>

                        <!-- Newsletter CTA (first-party capture -> Beehiiv) -->
                        <div class="mt-10">
                            <app-newsletter-signup source="blog-article" [campaign]="p.slug" />
                        </div>

                        <!-- Topics -->
                        @if (post()!.tags.length) {
                            <div class="mt-10 flex flex-wrap gap-2">
                                @for (tag of post()!.tags; track tag) {
                                    <span class="px-3 py-1.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 text-xs font-medium">#{{ tag }}</span>
                                }
                            </div>
                        }
                    </article>

                    <!-- Prev / next -->
                    <nav class="max-w-[680px] mx-auto mt-14 grid grid-cols-2 gap-4">
                        @if (prevPost(); as pv) {
                            <a [routerLink]="['/', lang, 'blog', pv.slug]" class="group rounded-2xl border border-surface-200 dark:border-surface-800 p-5 hover:border-brand-300 dark:hover:border-ochre-500/40 transition-colors">
                                <div class="text-[11px] text-surface-400 dark:text-surface-500 mb-1"><i class="pi pi-arrow-left text-[9px] mr-1"></i>{{ isFr() ? 'Édition précédente' : 'Previous' }}</div>
                                <div class="text-sm font-semibold text-surface-900 dark:text-surface-0 leading-snug line-clamp-2 group-hover:text-brand-700 dark:group-hover:text-ochre-400 transition-colors">{{ pv.title }}</div>
                            </a>
                        } @else { <span></span> }
                        @if (nextPost(); as nx) {
                            <a [routerLink]="['/', lang, 'blog', nx.slug]" class="group rounded-2xl border border-surface-200 dark:border-surface-800 p-5 text-right hover:border-brand-300 dark:hover:border-ochre-500/40 transition-colors">
                                <div class="text-[11px] text-surface-400 dark:text-surface-500 mb-1">{{ isFr() ? 'Édition suivante' : 'Next' }}<i class="pi pi-arrow-right text-[9px] ml-1"></i></div>
                                <div class="text-sm font-semibold text-surface-900 dark:text-surface-0 leading-snug line-clamp-2 group-hover:text-brand-700 dark:group-hover:text-ochre-400 transition-colors">{{ nx.title }}</div>
                            </a>
                        } @else { <span></span> }
                    </nav>

                    <!-- Related -->
                    @if (related().length > 0) {
                        <section class="max-w-5xl mx-auto mt-20 pt-12 border-t border-surface-200 dark:border-surface-800">
                            <h2 class="text-xl font-bold text-surface-900 dark:text-white mb-6">
                                {{ isFr() ? 'À lire aussi' : 'You might also like' }}
                            </h2>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                                @for (r of related(); track r.slug) {
                                    <a [routerLink]="['/', lang, 'blog', r.slug]"
                                       class="group block rounded-2xl overflow-hidden bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 hover:border-brand-300 dark:hover:border-ochre-500/40 hover:shadow-md transition-all">
                                        <div class="aspect-[16/10] overflow-hidden bg-surface-100 dark:bg-surface-800">
                                            <img [src]="r.coverImage" [alt]="r.title"
                                                 class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                 width="1200" height="750" loading="lazy" decoding="async"
                                                 (error)="onCoverError($event)" />
                                        </div>
                                        <div class="p-4">
                                            <div class="text-[10px] font-bold tracking-widest text-ochre-600 dark:text-ochre-400 mb-1">ÉDITION #{{ r.edition }}</div>
                                            <h3 class="text-sm font-semibold text-surface-900 dark:text-surface-0 leading-snug group-hover:text-brand-700 dark:group-hover:text-ochre-400 transition-colors line-clamp-2">{{ r.title }}</h3>
                                        </div>
                                    </a>
                                }
                            </div>
                        </section>
                    }
                } @else {
                    <!-- 404 -->
                    <div class="max-w-md mx-auto text-center py-20">
                        <i class="pi pi-exclamation-circle text-4xl text-surface-300 dark:text-surface-600 mb-4 block"></i>
                        <h1 class="text-xl font-bold text-surface-900 dark:text-white mb-2">
                            {{ isFr() ? 'Article introuvable' : 'Article not found' }}
                        </h1>
                        <p class="text-sm text-surface-500 dark:text-surface-400 mb-6">
                            {{ isFr() ? 'Cet article n\\'existe pas (encore).' : 'This article does not exist (yet).' }}
                        </p>
                        <a [routerLink]="['/', lang, 'blog']"
                           class="inline-flex items-center gap-2 text-sm text-brand-700 dark:text-ochre-400 font-semibold hover:underline">
                            <i class="pi pi-arrow-left text-xs"></i>
                            {{ isFr() ? 'Retour au blog' : 'Back to the blog' }}
                        </a>
                    </div>
                }
            </main>

            <footer-widget />
        </div>
    `,
    styles: [`
        /* Medium-like reading measure: serif body, generous rhythm. */
        .article-body {
            font-family: Georgia, Charter, Cambria, 'Times New Roman', serif;
            font-size: 1.1875rem;      /* ~19px */
            line-height: 1.75;
            letter-spacing: -0.003em;
        }
        .article-body :is(a) { color: #1A2740; text-decoration: underline; text-underline-offset: 2px; }
        :host-context(.app-dark) .article-body :is(a) { color: #E4A96B; }
        /* Drop cap on the first paragraph, the classic editorial opener. */
        .article-body.drop-cap::first-letter {
            float: left;
            font-family: Georgia, serif;
            font-weight: 700;
            font-size: 3.4em;
            line-height: 0.7;
            padding: 0.05em 0.12em 0 0;
            color: #C77B3C;
        }
    `]
})
export class BlogArticle implements OnInit, OnDestroy {
    private route     = inject(ActivatedRoute);
    private router    = inject(Router);
    private http      = inject(HttpClient);
    private sanitizer = inject(DomSanitizer);
    private i18n      = inject(I18nService);
    private seo       = inject(SeoService);
    private analytics = inject(AnalyticsService);

    post    = signal<BlogPost | undefined>(undefined);
    loading = signal(true);
    blocks  = signal<RBlock[]>([]);
    progress = signal(0);

    lang = '/fr';

    readonly isFr = computed(() => this.i18n.lang() === 'fr');

    // Only sent editions: prev/next never points at an unpublished future one.
    private readonly ordered = publishedPosts().sort((a, b) => a.edition.localeCompare(b.edition));

    readonly prevPost = computed(() => {
        const p = this.post(); if (!p) return undefined;
        const i = this.ordered.findIndex(o => o.slug === p.slug);
        return i > 0 ? this.ordered[i - 1] : undefined;
    });
    readonly nextPost = computed(() => {
        const p = this.post(); if (!p) return undefined;
        const i = this.ordered.findIndex(o => o.slug === p.slug);
        return i >= 0 && i < this.ordered.length - 1 ? this.ordered[i + 1] : undefined;
    });

    readonly related = computed(() => {
        const p = this.post();
        if (!p) return [];
        const published = publishedPosts();
        const byTag = published.filter(o => o.slug !== p.slug && o.tags.some(t => p.tags.includes(t)));
        const pool = byTag.length >= 3 ? byTag
            : [...byTag, ...published.filter(o => o.slug !== p.slug && !byTag.includes(o))];
        return pool.slice(0, 3);
    });

    @HostListener('window:scroll')
    onScroll() {
        if (typeof window === 'undefined') return;
        const el = document.documentElement;
        const max = el.scrollHeight - el.clientHeight;
        this.progress.set(max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0);
    }

    ngOnInit() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        this.lang = match ? match[1] : 'fr';
        this.route.paramMap.subscribe(params => this.loadPost(params.get('slug') ?? ''));
    }

    private async loadPost(slug: string) {
        this.loading.set(true);
        this.blocks.set([]);
        const p = findPostBySlug(slug);
        this.post.set(p);
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
        if (!p) { this.loading.set(false); return; }

        this.applyArticleSeo(p);
        this.analytics.trackPublic('blog_view', { view: 'article', slug: p.slug, lang: this.lang });

        try {
            const doc = await firstValueFrom(this.http.get<ArticleDoc>(p.contentPath));
            this.blocks.set(this.toRenderable(doc.blocks));
        } catch {
            this.blocks.set([]);
        } finally {
            this.loading.set(false);
        }
    }

    /** Escape HTML, then render inline markdown bold (**x**) and bare URLs.
     *  Content is first-party (authored in the newsletter), so this is safe. */
    private linkify(text: string): SafeHtml {
        let html = (text || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/(https?:\/\/[^\s<]+)/g,
            '<a href="$1" target="_blank" rel="noopener">$1</a>');
        return this.sanitizer.bypassSecurityTrustHtml(html);
    }

    private toRenderable(raw: Block[]): RBlock[] {
        let firstParaSeen = false;
        return raw.map((b): RBlock => {
            switch (b.kind) {
                case 'paragraph': {
                    const drop = !firstParaSeen;
                    firstParaSeen = true;
                    return { kind: 'paragraph', safe: this.linkify(b.text), drop };
                }
                case 'summary':
                    return { kind: 'summary', safeItems: b.items.map(i => this.linkify(i)) };
                case 'resource':
                    return { ...b, safe: this.linkify(b.text) };
                case 'callout':
                    return { ...b, safe: this.linkify(b.text) };
                default:
                    return { ...b } as RBlock;
            }
        });
    }

    /** A cover that fails to load falls back to the brand plate, never an empty box. */
    onCoverError(event: Event): void {
        const img = event.target as HTMLImageElement;
        if (img.src.endsWith(COVER_FALLBACK)) return;
        img.src = COVER_FALLBACK;
    }

    private applyArticleSeo(p: BlogPost): void {
        const text = { title: `${p.title} · Omaad`, description: p.excerpt };
        const path = `/blog/${p.slug}`;
        this.seo.applyLocalized({ lang: this.lang as Lang, path, fr: text, en: text, image: absoluteCoverUrl(p.coverImage), ogType: 'article' });
        this.seo.setJsonLd('jsonld-article', {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: p.title,
            description: p.excerpt,
            datePublished: p.date,
            image: absoluteCoverUrl(p.coverImage),
            author: { '@type': 'Organization', name: 'Omaad' },
            publisher: {
                '@type': 'Organization',
                name: 'Omaad',
                logo: { '@type': 'ImageObject', url: `${SITE_ORIGIN}/icons/omaad-app-icon-512.png` },
            },
            mainEntityOfPage: `${SITE_ORIGIN}/${this.lang}${path}`,
        });
    }

    ngOnDestroy(): void {
        this.seo.removeJsonLd('jsonld-article');
    }

    formatDate(iso: string): string {
        const d = new Date(iso);
        const locale = this.isFr() ? 'fr-FR' : 'en-US';
        return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
    }
}
