import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { I18nService } from '../../../i18n/i18n.service';
import { landingLangPrefix, trackLandingCta } from './landing-shared';
import { PhoneFrame } from './phoneframe';

/**
 * Hero (landing redesign 2026-10). On a 390x844 phone the H1, the lead, the
 * primary action and the top of a REAL Synthèse screen are all inside the
 * first 700 px: no empty gradient, no fake dashboard card. One ochre action,
 * one quiet secondary link, three trust facts that are all true.
 */
@Component({
    selector: 'hero-widget',
    standalone: true,
    imports: [RouterModule, PhoneFrame],
    template: `
        <section id="hero" class="relative pt-6 pb-0 lg:pt-16 lg:pb-20" [attr.aria-labelledby]="'hero-title'">
            <div class="lp-container grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
                <div class="lg:col-span-6 text-center lg:text-left">
                    <span class="lp-eyebrow">{{ t('landing.hero.eyebrow') }}</span>
                    <h1 id="hero-title" class="lp-h1 mt-4">{{ t('landing.hero.h1') }}</h1>
                    <p class="lp-lead mt-5 max-w-[34rem] mx-auto lg:mx-0">{{ t('landing.hero.lead') }}</p>
                    <div class="mt-7 flex flex-col sm:flex-row sm:flex-wrap gap-3 justify-center lg:justify-start">
                        <a class="lp-btn lp-btn-primary lp-btn-block sm:w-auto" [routerLink]="[currentLang, 'auth', 'register']" (click)="trackCta('hero_register')">
                            {{ t('landing.hero.ctaPrimary') }}
                        </a>
                        <a class="lp-btn lp-btn-secondary lp-btn-block sm:w-auto" href="#tour" (click)="scrollTo($event, 'tour')">
                            {{ t('landing.hero.ctaSecondary') }}
                            <i class="pi pi-arrow-down text-[13px]" aria-hidden="true"></i>
                        </a>
                    </div>
                    <ul class="mt-6 flex flex-wrap gap-x-5 gap-y-2 justify-center lg:justify-start text-[14px] lp-muted list-none p-0 m-0">
                        @for (k of ['trust1', 'trust2', 'trust3']; track k) {
                            <li class="inline-flex items-center gap-1.5"><i class="pi pi-check text-[11px] text-[#1F6249]" aria-hidden="true"></i>{{ t('landing.hero.' + k) }}</li>
                        }
                    </ul>
                </div>

                <div class="lg:col-span-6 relative">
                    <div class="lp-glow" aria-hidden="true"></div>
                    <!-- Phone: cropped to its top ~60% on phones (the tour below shows it in full), full on desktop -->
                    <div class="relative mx-auto w-[min(76%,320px)] lg:w-[360px] lg:ml-auto lg:mr-6 max-h-[64vw] sm:max-h-[420px] lg:max-h-none overflow-hidden lg:overflow-visible lg:-rotate-3">
                        <lp-phone [src]="'assets/marketing/synthese.webp'" [alt]="t('landing.hero.phoneAlt')" [eager]="true" />
                        <div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#FAF8F4] lg:hidden" aria-hidden="true"></div>
                    </div>
                </div>
            </div>
        </section>
    `,
})
export class HeroWidget {
    private analytics = inject(AnalyticsService);
    private i18n = inject(I18nService);
    private router = inject(Router);

    get currentLang(): string { return landingLangPrefix(this.router); }

    t(key: string): string { return this.i18n.t(key); }

    trackCta(placement: string): void { trackLandingCta(this.analytics, this.router, placement); }

    scrollTo(ev: Event, id: string): void {
        const el = document.getElementById(id);
        if (!el) return;
        ev.preventDefault();
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        this.trackCta('hero_see_app');
    }
}
