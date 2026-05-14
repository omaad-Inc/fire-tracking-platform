import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RippleModule } from 'primeng/ripple';
import { firstValueFrom } from 'rxjs';
import { TopbarWidget } from '../components/topbarwidget.component';
import { FooterWidget } from '../components/footerwidget';
import { I18nService } from '../../../i18n/i18n.service';
import { BLOG_POSTS, BlogPost, findPostBySlug } from './posts';

/** Shape of the JSON files in assets/newsletters/edition-NNN-blocks.json. */
interface NewsletterDoc {
    title: string;
    subtitle: string;
    status: string;
    content_tags: string[];
    blocks: NewsletterBlock[];
}

type NewsletterBlock =
    | { type: 'heading'; level: '2' | '3'; text: string }
    | { type: 'paragraph'; plaintext: string }
    | { type: 'html'; html: string };

/** A block ready for template rendering — html field pre-sanitized. */
interface RenderableBlock {
    kind: 'h2' | 'h3' | 'paragraphs' | 'html';
    text?: string;
    paragraphs?: string[];
    safeHtml?: SafeHtml;
}

@Component({
    selector: 'app-blog-article',
    standalone: true,
    imports: [CommonModule, RouterModule, RippleModule, TopbarWidget, FooterWidget],
    template: `
        <div class="bg-surface-0 min-h-screen">
            <!-- Topbar -->
            <div class="fixed top-0 left-0 right-0 z-50 bg-surface-0/80 backdrop-blur-lg border-b border-surface-200/50"
                 style="padding-top: env(safe-area-inset-top, 0px)">
                <topbar-widget class="py-4 px-6 mx-0 md:mx-12 lg:mx-20 lg:px-20 flex items-center justify-between relative lg:static" />
            </div>

            <main class="pt-32 pb-24 px-6">
                @if (post(); as p) {
                    <!-- Back link -->
                    <div class="max-w-3xl mx-auto mb-8">
                        <a [routerLink]="['/', lang, 'blog']" pRipple
                           class="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-brand-700 transition-colors">
                            <i class="pi pi-arrow-left text-xs"></i>
                            {{ isFr() ? 'Tous les articles' : 'All articles' }}
                        </a>
                    </div>

                    <!-- Article header -->
                    <header class="max-w-3xl mx-auto mb-10">
                        <!-- Tags + edition -->
                        <div class="flex flex-wrap items-center gap-2 mb-5">
                            <span class="px-2 py-1 rounded-md bg-brand-900 text-white text-[11px] font-bold tracking-widest">
                                ÉDITION #{{ p.edition }}
                            </span>
                            @for (tag of p.tags; track tag) {
                                <span class="px-2 py-1 rounded-md bg-ochre-50 text-ochre-700 text-[11px] font-medium">
                                    {{ tag }}
                                </span>
                            }
                        </div>

                        <h1 class="text-3xl md:text-4xl font-bold text-surface-900 mb-4 leading-tight tracking-tight">
                            {{ p.title }}
                        </h1>
                        <p class="text-lg text-surface-600 leading-relaxed mb-4">
                            {{ p.excerpt }}
                        </p>
                        <div class="flex items-center gap-3 text-sm text-surface-400">
                            <span>FIRE Africa</span>
                            <span class="w-1 h-1 rounded-full bg-surface-300"></span>
                            <time>{{ formatDate(p.date) }}</time>
                        </div>
                    </header>

                    <!-- Cover -->
                    <div class="max-w-4xl mx-auto mb-12">
                        <img [src]="p.coverImage" [alt]="p.title"
                             class="w-full aspect-[16/9] object-cover rounded-2xl" />
                    </div>

                    <!-- Body -->
                    <article class="max-w-3xl mx-auto">
                        @if (loading()) {
                            <div class="space-y-4">
                                @for (i of [1,2,3,4,5]; track i) {
                                    <div class="h-4 bg-surface-100 rounded animate-pulse"
                                         [style.width.%]="60 + (i * 7) % 30"></div>
                                }
                            </div>
                        } @else {
                            @for (block of blocks(); track $index) {
                                @switch (block.kind) {
                                    @case ('h2') {
                                        <h2 class="text-2xl md:text-3xl font-bold text-surface-900 mt-12 mb-4 leading-snug">
                                            {{ block.text }}
                                        </h2>
                                    }
                                    @case ('h3') {
                                        <h3 class="text-xs font-bold uppercase tracking-widest text-ochre-600 mt-10 mb-3">
                                            {{ block.text }}
                                        </h3>
                                    }
                                    @case ('paragraphs') {
                                        @for (para of block.paragraphs; track $index) {
                                            <p class="text-base md:text-lg text-surface-700 leading-relaxed mb-5 whitespace-pre-line">{{ para }}</p>
                                        }
                                    }
                                    @case ('html') {
                                        <div class="my-6" [innerHTML]="block.safeHtml"></div>
                                    }
                                }
                            }
                        }

                        <!-- Disclaimer -->
                        <div class="mt-12 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs leading-relaxed">
                            ⚠️ {{ isFr()
                                ? 'Ce contenu est publié à titre éducatif et informatif uniquement. Il ne constitue pas un conseil en investissement. Les performances passées ne préjugent pas des performances futures.'
                                : 'This content is published for educational and informational purposes only. It does not constitute investment advice. Past performance is not indicative of future results.' }}
                        </div>
                    </article>

                    <!-- Related articles -->
                    @if (related().length > 0) {
                        <section class="max-w-5xl mx-auto mt-20 pt-12 border-t border-surface-200">
                            <h2 class="text-xl font-bold text-surface-900 mb-6">
                                {{ isFr() ? 'À lire aussi' : 'You might also like' }}
                            </h2>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                                @for (r of related(); track r.slug) {
                                    <a [routerLink]="['/', lang, 'blog', r.slug]"
                                       class="group block rounded-xl overflow-hidden bg-surface-0 border border-surface-200 hover:border-brand-300 hover:shadow-md transition-all">
                                        <div class="aspect-[16/10] overflow-hidden bg-surface-100">
                                            <img [src]="r.coverImage" [alt]="r.title"
                                                 class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                 loading="lazy" />
                                        </div>
                                        <div class="p-4">
                                            <div class="text-[10px] font-bold tracking-widest text-ochre-600 mb-1">
                                                ÉDITION #{{ r.edition }}
                                            </div>
                                            <h3 class="text-sm font-semibold text-surface-900 leading-snug group-hover:text-brand-700 transition-colors line-clamp-2">
                                                {{ r.title }}
                                            </h3>
                                        </div>
                                    </a>
                                }
                            </div>
                        </section>
                    }
                } @else {
                    <!-- 404 -->
                    <div class="max-w-md mx-auto text-center py-20">
                        <i class="pi pi-exclamation-circle text-4xl text-surface-300 mb-4 block"></i>
                        <h1 class="text-xl font-bold text-surface-900 mb-2">
                            {{ isFr() ? 'Article introuvable' : 'Article not found' }}
                        </h1>
                        <p class="text-sm text-surface-500 mb-6">
                            {{ isFr() ? 'Cet article n\\'existe pas (encore).' : 'This article does not exist (yet).' }}
                        </p>
                        <a [routerLink]="['/', lang, 'blog']"
                           class="inline-flex items-center gap-2 text-sm text-brand-700 font-semibold hover:underline">
                            <i class="pi pi-arrow-left text-xs"></i>
                            {{ isFr() ? 'Retour au blog' : 'Back to the blog' }}
                        </a>
                    </div>
                }
            </main>

            <footer-widget />
        </div>
    `
})
export class BlogArticle implements OnInit {
    private route     = inject(ActivatedRoute);
    private router    = inject(Router);
    private http      = inject(HttpClient);
    private sanitizer = inject(DomSanitizer);
    private i18n      = inject(I18nService);

    post    = signal<BlogPost | undefined>(undefined);
    loading = signal(true);
    blocks  = signal<RenderableBlock[]>([]);

    lang = '/fr';

    readonly isFr = computed(() => this.i18n.lang() === 'fr');

    readonly related = computed(() => {
        const p = this.post();
        if (!p) return [];
        return BLOG_POSTS
            .filter(o => o.slug !== p.slug && o.tags.some(t => p.tags.includes(t)))
            .slice(0, 3);
    });

    ngOnInit() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        this.lang = match ? match[1] : 'fr';

        // Subscribe (not snapshot) so navigations within /blog/:slug — which reuse
        // this component instance — trigger a reload of the new article.
        this.route.paramMap.subscribe(params => {
            const slug = params.get('slug') ?? '';
            this.loadPost(slug);
        });
    }

    private async loadPost(slug: string) {
        this.loading.set(true);
        this.blocks.set([]);

        const p = findPostBySlug(slug);
        this.post.set(p);

        // Each article should open at the top, not at the previous article's scroll position.
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'auto' });
        }

        if (!p) {
            this.loading.set(false);
            return;
        }

        try {
            const doc = await firstValueFrom(this.http.get<NewsletterDoc>(p.contentPath));
            this.blocks.set(this.toRenderable(doc.blocks));
        } catch {
            this.blocks.set([]);
        } finally {
            this.loading.set(false);
        }
    }

    formatDate(iso: string): string {
        const d = new Date(iso);
        const locale = this.isFr() ? 'fr-FR' : 'en-US';
        return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
    }

    private toRenderable(raw: NewsletterBlock[]): RenderableBlock[] {
        return raw.map(b => {
            if (b.type === 'heading') {
                return { kind: b.level === '2' ? 'h2' : 'h3', text: b.text };
            }
            if (b.type === 'paragraph') {
                // Split on blank lines so each paragraph gets its own <p>.
                const paragraphs = b.plaintext.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
                return { kind: 'paragraphs', paragraphs };
            }
            // Inline-styled email HTML written in-repo by the author — trusted.
            return { kind: 'html', safeHtml: this.sanitizer.bypassSecurityTrustHtml(b.html) };
        });
    }
}
