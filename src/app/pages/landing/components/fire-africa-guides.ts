import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TopbarWidget } from './topbarwidget.component';
import { FooterWidget } from './footerwidget';
import { RevealDirective } from './reveal.directive';
import { I18nService, type Lang } from '../../../i18n/i18n.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { SeoService } from '../../../core/services/seo.service';
import { SEO_PAGES } from '../../../core/services/seo-content';

interface Guide {
    id: 1 | 2;
    kicker: string;
    title: string;
    desc: string;
    meta: string;
    points: string[];
    cta: string;
    coverAlt: string;
    pdf: string;
    cover: string;
}

/**
 * Page des 2 guides FIRE Africa (lead magnet, bilingue, prérendue, noindex).
 * Le welcome email de la newsletter pointe ici, et la page sert ensuite de
 * bibliothèque permanente : les deux PDF restent téléchargeables.
 *
 * Mise en page (design system landing, light only) : héros, puis une carte
 * par tome avec sa couverture réelle (public/guides/*-cover.webp, exportée
 * depuis la page 1 du PDF), ce que le tome contient, et le bouton de
 * téléchargement. Ensuite « nouveau dans l'édition 2026 », les liens vers
 * les outils, et la bande sombre de fermeture commune aux pages FIRE Africa.
 */
@Component({
    selector: 'app-fire-africa-guides',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterModule, TopbarWidget, FooterWidget, RevealDirective],
    template: `
        <div class="lp min-h-screen">
            <topbar-widget />

            <main>
                <!-- Héros -->
                <section class="relative pt-8 pb-8 lg:pt-16 lg:pb-12" aria-labelledby="fg-title">
                    <div class="lp-container text-center lg:text-left">
                        <span class="lp-eyebrow inline-flex items-center gap-2">
                            <i class="pi pi-book text-[11px]" aria-hidden="true"></i>
                            {{ t('fireGuides.eyebrow') }}
                        </span>
                        <h1 id="fg-title" class="lp-h1 mt-4">
                            {{ t('fireGuides.titleLine1') }}
                            <span class="text-[var(--lp-ochre-ink)]">{{ t('fireGuides.titleLine2') }}</span>
                        </h1>
                        <p class="lp-lead mt-5 max-w-[40rem] mx-auto lg:mx-0">{{ t('fireGuides.intro') }}</p>
                        <div class="mt-5 flex flex-col sm:flex-row items-center lg:items-start sm:justify-center lg:justify-start gap-3 sm:gap-5">
                            <span class="inline-flex items-center gap-2 rounded-full border border-ochre-200/70 bg-ochre-50 px-3.5 py-2 text-[12px] font-semibold tracking-[0.04em] uppercase text-[var(--lp-ochre-ink)]">
                                <span class="w-1.5 h-1.5 rounded-full bg-[var(--lp-ochre)]" aria-hidden="true"></span>
                                {{ t('fireGuides.editionBadge') }}
                            </span>
                            <p class="m-0 text-[14px] lp-muted inline-flex items-center gap-2">
                                <i class="pi pi-info-circle text-[12px]" aria-hidden="true"></i>
                                {{ t('fireGuides.startTip') }}
                            </p>
                        </div>
                    </div>
                </section>

                <!-- Les deux tomes -->
                <section class="pb-14 lg:pb-20" [attr.aria-label]="t('fireGuides.titleLine1')">
                    <div class="lp-container grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-8 items-stretch">
                        @for (g of guides; track g.id) {
                            <article class="lp-card relative overflow-hidden p-5 sm:p-7 flex flex-col" lpReveal>
                                <div class="lp-glow !inset-auto !-top-28 !-right-28 w-80 h-80 opacity-70" aria-hidden="true"></div>

                                <div class="relative grid grid-cols-[108px_1fr] sm:grid-cols-[160px_1fr] gap-5 sm:gap-7 items-start">
                                    <a [href]="g.pdf" download class="lp-read block" (click)="track(g.id)" [attr.aria-label]="t(g.cta)">
                                        <span class="block rounded-xl overflow-hidden ring-1 ring-black/10 shadow-[0_18px_40px_-18px_rgba(15,26,46,0.55)] transition-transform duration-300 motion-safe:hover:-translate-y-1">
                                            <img [src]="g.cover" width="640" height="905" decoding="async"
                                                 class="block w-full h-auto" [alt]="t(g.coverAlt)">
                                        </span>
                                    </a>
                                    <div class="min-w-0">
                                        <span class="lp-eyebrow">{{ t(g.kicker) }}</span>
                                        <h2 class="lp-h3 mt-2 !text-[clamp(20px,2.4vw,26px)]">{{ t(g.title) }}</h2>
                                        <p class="lp-body mt-2 text-[15px]">{{ t(g.desc) }}</p>
                                        <p class="mt-3 text-[13px] lp-muted lp-num inline-flex items-center gap-2">
                                            <i class="pi pi-file-pdf text-[12px]" aria-hidden="true"></i>
                                            {{ t(g.meta) }}
                                        </p>
                                    </div>
                                </div>

                                <ul class="relative mt-6 grid gap-2.5 list-none p-0 m-0">
                                    @for (p of g.points; track p) {
                                        <li class="flex items-start gap-3">
                                            <span class="lp-check mt-0.5"><i class="pi pi-check" aria-hidden="true"></i></span>
                                            <span class="lp-body text-[15px]">{{ t(p) }}</span>
                                        </li>
                                    }
                                </ul>

                                <a [href]="g.pdf" download class="lp-btn lp-btn-primary lp-btn-block relative mt-6" (click)="track(g.id)">
                                    <i class="pi pi-download text-[14px]" aria-hidden="true"></i>
                                    {{ t(g.cta) }}
                                </a>
                            </article>
                        }
                    </div>
                </section>

                <!-- Nouveau dans l'édition 2026 -->
                <section class="pb-14 lg:pb-20" aria-labelledby="fg-new-title">
                    <div class="lp-container" lpReveal>
                        <div class="text-center lg:text-left">
                            <h2 id="fg-new-title" class="lp-h2 !text-[clamp(24px,4.2vw,36px)]">{{ t('fireGuides.newTitle') }}</h2>
                            <p class="lp-body mt-3 max-w-[40rem] mx-auto lg:mx-0">{{ t('fireGuides.newIntro') }}</p>
                        </div>
                        <ul class="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 list-none p-0 m-0">
                            @for (n of news; track n.icon) {
                                <li class="lp-card !shadow-none p-5 flex flex-col gap-3">
                                    <span class="lp-icon-tile !w-10 !h-10 !rounded-xl text-[15px]"><i class="pi" [class]="n.icon" aria-hidden="true"></i></span>
                                    <span class="text-[16px] font-bold leading-snug text-[var(--lp-ink)]">{{ t(n.title) }}</span>
                                    <span class="text-[14px] leading-relaxed lp-muted">{{ t(n.desc) }}</span>
                                </li>
                            }
                        </ul>
                    </div>
                </section>

                <!-- Pour aller plus loin -->
                <section class="pb-16 lg:pb-24" aria-labelledby="fg-more-title">
                    <div class="lp-container" lpReveal>
                        <h2 id="fg-more-title" class="lp-h3 text-center lg:text-left">{{ t('fireGuides.moreTitle') }}</h2>
                        <ul class="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 list-none p-0 m-0">
                            <li>
                                <a routerLink="/outils/comparateur-sgi-brvm" class="lp-card !shadow-none p-5 h-full flex flex-col gap-2 no-underline hover:border-[var(--lp-line-strong)] focus-visible:outline-2 focus-visible:outline-[var(--lp-ochre)] focus-visible:outline-offset-4">
                                    <span class="lp-icon-tile !w-10 !h-10 !rounded-xl text-[15px]"><i class="pi pi-table" aria-hidden="true"></i></span>
                                    <span class="mt-1 text-[16px] font-bold text-[var(--lp-ink)]">{{ t('fireGuides.sgiLink') }}<i class="pi pi-arrow-right text-[11px] text-[var(--lp-ochre-ink)] ml-1.5" aria-hidden="true"></i></span>
                                    <span class="text-[14px] leading-relaxed lp-muted">{{ t('fireGuides.sgiDesc') }}</span>
                                </a>
                            </li>
                            <li>
                                <a routerLink="/outils/strategie-brvm" class="lp-card !shadow-none p-5 h-full flex flex-col gap-2 no-underline hover:border-[var(--lp-line-strong)] focus-visible:outline-2 focus-visible:outline-[var(--lp-ochre)] focus-visible:outline-offset-4">
                                    <span class="lp-icon-tile !w-10 !h-10 !rounded-xl text-[15px]"><i class="pi pi-compass" aria-hidden="true"></i></span>
                                    <span class="mt-1 text-[16px] font-bold text-[var(--lp-ink)]">{{ t('fireGuides.strategyLink') }}<i class="pi pi-arrow-right text-[11px] text-[var(--lp-ochre-ink)] ml-1.5" aria-hidden="true"></i></span>
                                    <span class="text-[14px] leading-relaxed lp-muted">{{ t('fireGuides.strategyDesc') }}</span>
                                </a>
                            </li>
                            <li>
                                <a [routerLink]="[currentLang, 'blog']" class="lp-card !shadow-none p-5 h-full flex flex-col gap-2 no-underline hover:border-[var(--lp-line-strong)] focus-visible:outline-2 focus-visible:outline-[var(--lp-ochre)] focus-visible:outline-offset-4">
                                    <span class="lp-icon-tile !w-10 !h-10 !rounded-xl text-[15px]"><i class="pi pi-bookmark" aria-hidden="true"></i></span>
                                    <span class="mt-1 text-[16px] font-bold text-[var(--lp-ink)]">{{ t('fireGuides.blogLink') }}<i class="pi pi-arrow-right text-[11px] text-[var(--lp-ochre-ink)] ml-1.5" aria-hidden="true"></i></span>
                                    <span class="text-[14px] leading-relaxed lp-muted">{{ t('fireGuides.blogDesc') }}</span>
                                </a>
                            </li>
                            <li>
                                <a [routerLink]="[currentLang, 'auth', 'register']" class="lp-card !shadow-none p-5 h-full flex flex-col gap-2 no-underline hover:border-[var(--lp-line-strong)] focus-visible:outline-2 focus-visible:outline-[var(--lp-ochre)] focus-visible:outline-offset-4">
                                    <span class="lp-icon-tile !w-10 !h-10 !rounded-xl text-[15px]"><i class="pi pi-user-plus" aria-hidden="true"></i></span>
                                    <span class="mt-1 text-[16px] font-bold text-[var(--lp-ink)]">{{ t('fireGuides.appLink') }}<i class="pi pi-arrow-right text-[11px] text-[var(--lp-ochre-ink)] ml-1.5" aria-hidden="true"></i></span>
                                    <span class="text-[14px] leading-relaxed lp-muted">{{ t('fireGuides.appDesc') }}</span>
                                </a>
                            </li>
                        </ul>
                    </div>
                </section>

                <!-- Bande de fermeture -->
                <section class="lp-dark py-14 lg:py-20" [attr.aria-label]="t('fireGuides.closingBrand')">
                    <div class="lp-container text-center" lpReveal>
                        <p class="lp-h2 !text-white !text-[clamp(24px,4.2vw,36px)]">{{ t('fireGuides.closingTitle') }}</p>
                        <p class="mt-4 text-[12px] font-semibold tracking-[0.2em] uppercase text-[#DFB78A]">{{ t('fireGuides.closingBrand') }}</p>
                        <p class="mt-8 text-[13px] text-white/60 max-w-[48ch] mx-auto leading-relaxed">{{ t('fireGuides.disclaimer') }}</p>
                    </div>
                </section>
            </main>

            <footer-widget />
        </div>
    `
})
export class FireAfricaGuides implements OnDestroy {
    private router = inject(Router);
    private seo = inject(SeoService);
    private i18n = inject(I18nService);
    private analytics = inject(AnalyticsService);

    currentLang = '/fr';

    readonly guides: Guide[] = [
        {
            id: 1,
            kicker: 'fireGuides.tome1Kicker',
            title: 'fireGuides.tome1Title',
            desc: 'fireGuides.tome1Desc',
            meta: 'fireGuides.tome1Meta',
            points: ['fireGuides.tome1Point1', 'fireGuides.tome1Point2', 'fireGuides.tome1Point3'],
            cta: 'fireGuides.tome1Cta',
            coverAlt: 'fireGuides.coverAlt1',
            pdf: '/guides/fire-africa-tome1-core-satellite.pdf',
            cover: '/guides/fire-africa-tome1-cover.webp',
        },
        {
            id: 2,
            kicker: 'fireGuides.tome2Kicker',
            title: 'fireGuides.tome2Title',
            desc: 'fireGuides.tome2Desc',
            meta: 'fireGuides.tome2Meta',
            points: ['fireGuides.tome2Point1', 'fireGuides.tome2Point2', 'fireGuides.tome2Point3'],
            cta: 'fireGuides.tome2Cta',
            coverAlt: 'fireGuides.coverAlt2',
            pdf: '/guides/fire-africa-tome2-mode-emploi-brvm.pdf',
            cover: '/guides/fire-africa-tome2-cover.webp',
        },
    ];

    readonly news = [
        { icon: 'pi-chart-line', title: 'fireGuides.new1Title', desc: 'fireGuides.new1Desc' },
        { icon: 'pi-table', title: 'fireGuides.new2Title', desc: 'fireGuides.new2Desc' },
        { icon: 'pi-bolt', title: 'fireGuides.new3Title', desc: 'fireGuides.new3Desc' },
        { icon: 'pi-users', title: 'fireGuides.new4Title', desc: 'fireGuides.new4Desc' },
    ];

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        const lang = (match ? match[1] : 'fr') as Lang;
        this.currentLang = '/' + lang;
        // Sync i18n with the URL language (the email links straight here).
        this.i18n.setLang(lang);
        this.seo.applyLocalized({ lang, ...SEO_PAGES.fireAfricaGuides });
        // Lead magnet : offert en échange de l'inscription à la newsletter, ne
        // doit pas être trouvable via Google (absent du sitemap aussi, voir
        // tools/generate-prerender-routes.mjs).
        this.seo.setRobots('noindex');
    }

    ngOnDestroy(): void {
        this.seo.removeRobots();
    }

    t(key: string): string {
        return this.i18n.t(key);
    }

    track(tome: 1 | 2): void {
        this.analytics.trackPublic('cta_click', { cta: 'guide_download', tome, source: 'fire-africa-guides' });
    }
}
