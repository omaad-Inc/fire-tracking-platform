import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TopbarWidget } from './topbarwidget.component';
import { FooterWidget } from './footerwidget';
import { RevealDirective } from './reveal.directive';
import { landingLangPrefix, trackLandingCta } from './landing-shared';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { I18nService, Lang } from '../../../i18n/i18n.service';
import { SeoService } from '../../../core/services/seo.service';
import { SEO_PAGES } from '../../../core/services/seo-content';

/**
 * About page (landing redesign 2026-10). Same `.lp-*` system as the landing:
 * mission hero with the founders, the product on a desktop (real render of
 * the Synthèse, provided by the owner), the story, honest numbers, six
 * principles, four trust facts, the team, contact, closing band.
 */
@Component({
    selector: 'app-qui-sommes-nous',
    standalone: true,
    imports: [RouterModule, TopbarWidget, FooterWidget, RevealDirective],
    template: `
        <div class="lp min-h-screen">
            <topbar-widget />
            <main>
                <!-- Hero: mission + founders -->
                <section class="lp-section-tight" [attr.aria-labelledby]="'about-title'">
                    <div class="lp-container grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
                        <div class="lg:col-span-7 text-center lg:text-left">
                            <span class="lp-eyebrow">{{ t('landing.about.eyebrow') }}</span>
                            <h1 id="about-title" class="lp-h1 mt-4">{{ t('landing.about.h1') }}</h1>
                            <p class="lp-lead mt-5 max-w-[36rem] mx-auto lg:mx-0">{{ t('landing.about.subtitle') }}</p>
                        </div>
                        <div class="lg:col-span-5 grid grid-cols-2 gap-4 max-w-[24rem] mx-auto lg:ml-auto lg:mr-0">
                            <figure class="m-0">
                                <div class="aspect-[4/5] overflow-hidden rounded-[20px] lp-card">
                                    <img src="assets/team/mbaye-omaad.webp" [alt]="t('landing.about.founderName')" class="w-full h-full object-cover" width="640" height="640" loading="eager">
                                </div>
                                <figcaption class="mt-3 text-center">
                                    <span class="block text-[14px] font-bold">{{ t('landing.about.founderName') }}</span>
                                    <span class="block text-[12px] lp-muted">{{ t('landing.about.founderShort') }}</span>
                                </figcaption>
                            </figure>
                            <figure class="m-0 sm:mt-8">
                                <div class="aspect-[4/5] overflow-hidden rounded-[20px] lp-card">
                                    <img src="assets/team/bamba.jpeg" [alt]="t('landing.about.bambaName')" class="w-full h-full object-cover" width="648" height="648" loading="eager">
                                </div>
                                <figcaption class="mt-3 text-center">
                                    <span class="block text-[14px] font-bold">{{ t('landing.about.bambaName') }}</span>
                                    <span class="block text-[12px] lp-muted">{{ t('landing.about.bambaShort') }}</span>
                                </figcaption>
                            </figure>
                        </div>
                    </div>
                </section>

                <!-- The product on a desktop: real render provided by the owner -->
                <section class="lp-section-tight pt-0" [attr.aria-labelledby]="'about-product-title'">
                    <div class="lp-container">
                        <div class="max-w-[40rem] mx-auto text-center" lpReveal>
                            <span class="lp-eyebrow">{{ t('landing.about.productEyebrow') }}</span>
                            <h2 id="about-product-title" class="lp-h2 mt-3">{{ t('landing.about.productTitle') }}</h2>
                            <p class="lp-lead mt-4">{{ t('landing.about.productDesc') }}</p>
                        </div>
                        <figure class="m-0 mt-8 lg:mt-12 relative" lpReveal>
                            <div class="lp-glow" aria-hidden="true"></div>
                            <div class="relative overflow-hidden rounded-[24px] lp-card !bg-[#C9C1B0]">
                                <img src="assets/marketing/desktop-dashboard-1600.webp"
                                     srcset="assets/marketing/desktop-dashboard-800.webp 800w, assets/marketing/desktop-dashboard-1600.webp 1600w"
                                     sizes="(min-width: 1200px) 1136px, calc(100vw - 40px)"
                                     [alt]="t('landing.about.productAlt')" width="1600" height="1200" loading="lazy" decoding="async"
                                     class="block w-full h-auto">
                            </div>
                            <figcaption class="mt-4 text-center text-[14px] lp-muted">{{ t('landing.about.productCaption') }}</figcaption>
                        </figure>
                    </div>
                </section>

                <!-- Story -->
                <section class="lp-section-tight" [attr.aria-labelledby]="'about-story-title'">
                    <div class="lp-container grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
                        <div class="lg:col-span-4 text-center lg:text-left" lpReveal>
                            <div class="lg:sticky lg:top-28">
                                <span class="lp-eyebrow">{{ t('landing.about.storyEyebrow') }}</span>
                                <h2 id="about-story-title" class="lp-h2 mt-3">{{ t('landing.about.historyTitle') }}</h2>
                                <p class="mt-6 text-[16px] font-semibold italic">{{ t('landing.about.historySignature') }}</p>
                                <div class="mt-2 h-0.5 w-14 rounded-full bg-[color:var(--lp-ochre)] mx-auto lg:mx-0" aria-hidden="true"></div>
                            </div>
                        </div>
                        <div class="lg:col-span-8 max-w-[40rem]" lpReveal>
                            <p class="lp-body text-[17px]">{{ t('landing.about.historyP1') }}</p>
                            <p class="lp-body text-[17px] mt-5"><strong class="text-[color:var(--lp-ink)]">{{ t('landing.about.historyP2Lead') }}</strong>{{ t('landing.about.historyP2') }}</p>
                            <blockquote class="mt-8 pl-5 border-l-4 border-[color:var(--lp-ochre)] text-[20px] lg:text-[24px] font-semibold leading-snug m-0">
                                <span class="font-normal lp-muted">{{ t('landing.about.historyAmbitionPre') }} </span>{{ t('landing.about.historyAmbition') }}
                            </blockquote>
                        </div>
                    </div>
                </section>

                <!-- Honest numbers -->
                <section class="lp-dark py-16 lg:py-24" [attr.aria-labelledby]="'about-numbers-title'">
                    <div class="lp-container">
                        <div class="max-w-[40rem] text-center lg:text-left" lpReveal>
                            <span class="lp-eyebrow !text-[#DFB78A]">{{ t('landing.about.numbersEyebrow') }}</span>
                            <h2 id="about-numbers-title" class="lp-h2 !text-white mt-3">{{ t('landing.about.numbersTitle') }}</h2>
                            <p class="lp-lead !text-white/75 mt-3">{{ t('landing.about.numbersSubtitle') }}</p>
                        </div>
                        <dl class="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 m-0">
                            @for (n of numbers; track n.value) {
                                <div class="border-t border-white/15 pt-6 text-center lg:text-left" lpReveal>
                                    <dt class="text-[56px] lg:text-[64px] font-extrabold leading-none tracking-[-0.03em] lp-num text-white">{{ t(n.value) }}</dt>
                                    <dd class="m-0 mt-3 text-[15px] text-white/75 leading-relaxed"><span class="font-semibold text-white">{{ t(n.lead) }}</span>{{ t(n.rest) }}</dd>
                                </div>
                            }
                        </dl>
                    </div>
                </section>

                <!-- Principles -->
                <section id="principes" class="lp-section scroll-mt-16" [attr.aria-labelledby]="'about-values-title'">
                    <div class="lp-container">
                        <div class="max-w-[40rem] mx-auto text-center" lpReveal>
                            <span class="lp-eyebrow">{{ t('landing.about.valuesEyebrow') }}</span>
                            <h2 id="about-values-title" class="lp-h2 mt-3">{{ t('landing.about.valuesTitle') }}</h2>
                            <p class="lp-lead mt-4">{{ t('landing.about.valuesSubtitle') }}</p>
                        </div>
                        <div class="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                            @for (v of values; track v.titleKey) {
                                <div class="lp-card p-6 lg:p-7" lpReveal>
                                    <span class="lp-icon-tile"><i class="pi" [class]="v.icon" aria-hidden="true"></i></span>
                                    <h3 class="lp-h3 mt-5 text-[19px]">{{ t(v.titleKey) }}</h3>
                                    <p class="lp-body mt-2 text-[15px]">{{ t(v.descKey) }}</p>
                                </div>
                            }
                        </div>
                    </div>
                </section>

                <!-- Trust -->
                <section id="securite" class="lp-section-tight pt-0 scroll-mt-16" [attr.aria-labelledby]="'about-trust-title'">
                    <div class="lp-container">
                        <div class="lp-card p-6 sm:p-10 lg:p-14" lpReveal>
                            <div class="max-w-[40rem] text-center lg:text-left">
                                <span class="lp-eyebrow">{{ t('landing.about.trustEyebrow') }}</span>
                                <h2 id="about-trust-title" class="lp-h2 mt-3">{{ t('landing.about.trustTitle') }}</h2>
                                <p class="lp-lead mt-3">{{ t('landing.about.trustSubtitle') }}</p>
                            </div>
                            <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                                @for (item of trust; track item.titleKey) {
                                    <div class="flex items-start gap-4">
                                        <span class="lp-icon-tile !bg-[#EAF4EF] !text-[#1F6249] shrink-0"><i class="pi" [class]="item.icon" aria-hidden="true"></i></span>
                                        <div>
                                            <h3 class="lp-h3 text-[17px]">{{ t(item.titleKey) }}</h3>
                                            <p class="lp-body mt-1 text-[15px]">{{ t(item.descKey) }}</p>
                                        </div>
                                    </div>
                                }
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Team -->
                <section class="lp-section-tight" [attr.aria-labelledby]="'about-team-title'">
                    <div class="lp-container">
                        <div class="max-w-[40rem] mx-auto text-center" lpReveal>
                            <span class="lp-eyebrow">{{ t('landing.about.teamEyebrow') }}</span>
                            <h2 id="about-team-title" class="lp-h2 mt-3">{{ t('landing.about.teamTitle') }}</h2>
                            <p class="lp-lead mt-4">{{ t('landing.about.teamSubtitle') }}</p>
                        </div>
                        <div class="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                            @for (m of team; track m.name) {
                                <div class="lp-card p-6 lg:p-7 text-center flex flex-col items-center" lpReveal>
                                    <img [src]="m.photo" [alt]="t(m.name)" class="w-28 h-28 rounded-full object-cover" width="112" height="112" loading="lazy">
                                    <h3 class="lp-h3 mt-5 text-[19px]">{{ t(m.name) }}</h3>
                                    <p class="mt-1 text-[13px] font-semibold text-[color:var(--lp-ochre-ink)]">{{ t(m.role) }}</p>
                                    <p class="lp-body mt-3 text-[15px]">{{ t(m.bio) }}</p>
                                    <a [href]="m.href" target="_blank" rel="noopener noreferrer" class="lp-link mt-3 text-[14px]">
                                        <i class="pi pi-linkedin text-[13px]" aria-hidden="true"></i>{{ t(m.link) }}
                                    </a>
                                </div>
                            }
                            <div class="rounded-[20px] border-2 border-dashed border-[color:var(--lp-line-strong)] p-6 lg:p-7 text-center flex flex-col items-center" lpReveal>
                                <span class="w-28 h-28 rounded-full flex items-center justify-center bg-[rgba(15,26,46,0.05)] text-[44px] font-extrabold lp-muted">?</span>
                                <h3 class="lp-h3 mt-5 text-[19px]">{{ t('landing.about.ghostTitle') }}</h3>
                                <p class="mt-1 text-[13px] font-semibold lp-muted">{{ t('landing.about.ghostSubtitle') }}</p>
                                <p class="lp-body mt-3 text-[15px]">{{ t('landing.about.ghostDesc') }}</p>
                                <a href="mailto:contact@omaad.africa" class="lp-link mt-3 text-[14px]"><i class="pi pi-envelope text-[13px]" aria-hidden="true"></i>{{ t('landing.about.ghostCta') }}</a>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Contact -->
                <section id="contact" class="lp-section-tight pt-0 scroll-mt-16" [attr.aria-labelledby]="'about-contact-title'">
                    <div class="lp-container max-w-[44rem] text-center" lpReveal>
                        <h2 id="about-contact-title" class="lp-h2 text-[26px] lg:text-[32px]">{{ t('landing.about.contactTitle') }}</h2>
                        <p class="lp-lead mt-4">
                            {{ t('landing.about.contactDesc') }}
                            <a href="mailto:contact@omaad.africa" class="font-semibold text-[color:var(--lp-ink)] underline underline-offset-4 decoration-[color:var(--lp-ochre)]">contact&#64;omaad.africa</a>{{ t('landing.about.contactDescOr') }}
                            <a href="https://www.linkedin.com/company/omaad/" target="_blank" rel="noopener noreferrer" class="font-semibold text-[color:var(--lp-ink)] underline underline-offset-4 decoration-[color:var(--lp-ochre)]">{{ t('landing.about.contactLinkedIn') }}</a>.
                        </p>
                    </div>
                </section>

                <!-- Closing band -->
                <section class="lp-dark py-16 lg:py-24" [attr.aria-labelledby]="'about-cta-title'">
                    <div class="lp-container text-center" lpReveal>
                        <h2 id="about-cta-title" class="lp-h2 !text-white">{{ t('landing.about.ctaTitle') }}</h2>
                        <div class="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                            <a class="lp-btn lp-btn-primary lp-btn-block sm:w-auto" [routerLink]="[currentLang, 'auth', 'register']" (click)="trackCta('about_register')">{{ t('landing.about.ctaPrimary') }}</a>
                            <a class="lp-btn lp-btn-secondary lp-btn-block sm:w-auto !text-white !border-white/30 hover:!bg-white/10" routerLink="/fr/fire-africa/newsletter" (click)="trackCta('about_newsletter')">
                                {{ t('landing.about.ctaSecondary') }}
                                <i class="pi pi-arrow-right text-[12px]" aria-hidden="true"></i>
                            </a>
                        </div>
                        <p class="mt-6 text-[12px] font-semibold tracking-[0.2em] uppercase text-[#DFB78A]">{{ t('landing.about.ctaTagline') }}</p>
                    </div>
                </section>
            </main>
            <footer-widget />
        </div>
    `
})
export class QuiSommesNousPage {
    private i18n = inject(I18nService);
    private router = inject(Router);
    private seo = inject(SeoService);
    private analytics = inject(AnalyticsService);

    readonly numbers = [
        { value: 'landing.about.kpi1Value', lead: 'landing.about.kpi1Lead', rest: 'landing.about.kpi1Rest' },
        { value: 'landing.about.kpi2Value', lead: 'landing.about.kpi2Lead', rest: 'landing.about.kpi2Rest' },
        { value: 'landing.about.kpi3Value', lead: 'landing.about.kpi3Lead', rest: 'landing.about.kpi3Rest' },
    ];

    readonly values = [
        { titleKey: 'landing.about.v1Title', descKey: 'landing.about.v1Desc', icon: 'pi-check-circle' },
        { titleKey: 'landing.about.v2Title', descKey: 'landing.about.v2Desc', icon: 'pi-globe' },
        { titleKey: 'landing.about.v3Title', descKey: 'landing.about.v3Desc', icon: 'pi-bolt' },
        { titleKey: 'landing.about.v4Title', descKey: 'landing.about.v4Desc', icon: 'pi-clock' },
        { titleKey: 'landing.about.v5Title', descKey: 'landing.about.v5Desc', icon: 'pi-map' },
        { titleKey: 'landing.about.v6Title', descKey: 'landing.about.v6Desc', icon: 'pi-shield' },
    ];

    readonly trust = [
        { titleKey: 'landing.about.trust1Title', descKey: 'landing.about.trust1Desc', icon: 'pi-ban' },
        { titleKey: 'landing.about.trust2Title', descKey: 'landing.about.trust2Desc', icon: 'pi-lock' },
        { titleKey: 'landing.about.trust3Title', descKey: 'landing.about.trust3Desc', icon: 'pi-download' },
        { titleKey: 'landing.about.trust4Title', descKey: 'landing.about.trust4Desc', icon: 'pi-book' },
    ];

    readonly team = [
        { name: 'landing.about.founderName', role: 'landing.about.founderRole', bio: 'landing.about.founderBio', link: 'landing.about.founderLinkedIn', photo: 'assets/team/mbaye-omaad.webp', href: 'https://www.linkedin.com/in/mbaye-sene' },
        { name: 'landing.about.bambaName', role: 'landing.about.bambaRole', bio: 'landing.about.bambaBio', link: 'landing.about.bambaLinkedIn', photo: 'assets/team/bamba.jpeg', href: 'https://www.linkedin.com/in/bamba' },
    ];

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        const lang = (match ? match[1] : 'fr') as Lang;
        this.i18n.setLang(lang);
        // Both /qui-sommes-nous and /about route here; canonical is always
        // /qui-sommes-nous (SEO_PAGES.about.path) so the alias doesn't split rank.
        this.seo.applyLocalized({ lang, ...SEO_PAGES.about });
    }

    get currentLang(): string { return landingLangPrefix(this.router); }

    t(key: string): string { return this.i18n.t(key); }

    trackCta(placement: string): void { trackLandingCta(this.analytics, this.router, placement); }
}
