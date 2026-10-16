import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { I18nService } from '../../../i18n/i18n.service';
import { landingLangPrefix, trackLandingCta } from './landing-shared';
import { nbspSafe } from '../../../core/util/nbsp';
import { RevealDirective } from './reveal.directive';

/**
 * Monthly list prices shown on the marketing page, in FCFA. The billing
 * source of truth is the backend plan catalog (what /pages/plans renders
 * after sign-in); these two numbers must follow it. They are deliberately
 * NOT fetched at runtime: the landing is prerendered for crawlers and must
 * not depend on an API call to show a price.
 */
export const LANDING_PLAN_PRICES_XOF = { pro: 4000, premium: 10000 } as const;

/** FAQ order: the cautious visitor's questions first (bank? money? data?), then cost, countries, mobile. */
export const LANDING_FAQ_KEYS = [5, 2, 1, 3, 6, 7] as const;

/**
 * Pricing + FAQ (landing redesign): three compact tiers (five bullets each,
 * from the same plans.* keys as /pages/plans), one action per tier that
 * always opens the free account (the plan is chosen in-app), and six FAQ
 * accordions built on native details/summary.
 */
@Component({
    selector: 'pricing-widget',
    standalone: true,
    imports: [RouterModule, RevealDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section id="pricing" class="lp-section scroll-mt-16" [attr.aria-labelledby]="'pricing-title'">
            <div class="lp-container">
                <div class="max-w-[40rem] mx-auto text-center" lpReveal>
                    <span class="lp-eyebrow">{{ t('landing.pricing.badge') }}</span>
                    <h2 id="pricing-title" class="lp-h2 mt-3">{{ t('landing.pricing.h2a') }} {{ t('landing.pricing.h2b') }}</h2>
                    <p class="lp-lead mt-4">{{ t('landing.pricing.description') }}</p>
                </div>

                <div class="mt-10 lg:mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-stretch">
                    <!-- Free -->
                    <div class="lp-card p-6 lg:p-8 flex flex-col" lpReveal>
                        <h3 class="lp-h3">{{ t('landing.pricing.freeName') }}</h3>
                        <p class="lp-body mt-1 text-[15px]">{{ t('landing.pricing.freeTagline') }}</p>
                        <div class="mt-5 flex items-baseline gap-2"><span class="text-[40px] font-extrabold leading-none tracking-[-0.02em] lp-num">0</span><span class="lp-muted text-[14px]">{{ t('landing.pricing.freeForever') }}</span></div>
                        <a class="lp-btn lp-btn-secondary lp-btn-block mt-6" [routerLink]="[currentLang, 'auth', 'register']" (click)="trackCta('pricing_free')">{{ t('landing.pricing.freeCta') }}</a>
                        <ul class="mt-6 flex flex-col gap-3 list-none p-0 m-0">
                            @for (f of freeFeatures(); track f) {
                                <li class="flex items-start gap-3 text-[15px] lp-body"><span class="lp-check mt-0.5"><i class="pi pi-check" aria-hidden="true"></i></span><span>{{ f }}</span></li>
                            }
                        </ul>
                    </div>

                    <!-- Pro (recommended) -->
                    <div class="lp-card p-6 lg:p-8 flex flex-col !border-[color:var(--lp-ochre)] !border-2 md:-mt-3 md:mb-3" lpReveal>
                        <div class="flex items-center justify-between gap-3">
                            <h3 class="lp-h3">{{ t('landing.pricing.proName') }}</h3>
                            <span class="text-[12px] font-semibold uppercase tracking-[0.06em] text-[color:var(--lp-ochre-ink)]">{{ t('landing.pricing.recommended') }}</span>
                        </div>
                        <p class="lp-body mt-1 text-[15px]">{{ t('landing.pricing.proTagline') }}</p>
                        <div class="mt-5 flex items-baseline gap-2"><span class="text-[40px] font-extrabold leading-none tracking-[-0.02em] lp-num">{{ fmt(prices.pro) }}</span><span class="lp-muted text-[14px]">FCFA / {{ t('landing.pricing.month') }}</span></div>
                        <a class="lp-btn lp-btn-primary lp-btn-block mt-6" [routerLink]="[currentLang, 'auth', 'register']" (click)="trackCta('pricing_pro')">{{ t('landing.pricing.proCta') }}</a>
                        <ul class="mt-6 flex flex-col gap-3 list-none p-0 m-0">
                            <li class="text-[14px] font-semibold">{{ t('plans.everythingFree') }}</li>
                            @for (f of proFeatures(); track f) {
                                <li class="flex items-start gap-3 text-[15px] lp-body"><span class="lp-check mt-0.5"><i class="pi pi-check" aria-hidden="true"></i></span><span>{{ f }}</span></li>
                            }
                        </ul>
                    </div>

                    <!-- Premium -->
                    <div class="lp-card lp-dark p-6 lg:p-8 flex flex-col !border-transparent" lpReveal>
                        <h3 class="lp-h3 !text-white">{{ t('landing.pricing.premiumName') }}</h3>
                        <p class="mt-1 text-[15px] text-white/70">{{ t('landing.pricing.premiumTagline') }}</p>
                        <div class="mt-5 flex items-baseline gap-2"><span class="text-[40px] font-extrabold leading-none tracking-[-0.02em] lp-num text-white">{{ fmt(prices.premium) }}</span><span class="text-white/60 text-[14px]">FCFA / {{ t('landing.pricing.month') }}</span></div>
                        <a class="lp-btn lp-btn-primary lp-btn-block mt-6" [routerLink]="[currentLang, 'auth', 'register']" (click)="trackCta('pricing_premium')">{{ t('landing.pricing.premiumCta') }}</a>
                        <ul class="mt-6 flex flex-col gap-3 list-none p-0 m-0">
                            <li class="text-[14px] font-semibold text-white">{{ t('plans.everythingPro') }}</li>
                            @for (f of premiumFeatures(); track f) {
                                <li class="flex items-start gap-3 text-[15px] text-white/85"><span class="lp-check mt-0.5 !bg-white/15 !text-white"><i class="pi pi-check" aria-hidden="true"></i></span><span>{{ f }}</span></li>
                            }
                        </ul>
                    </div>
                </div>
                <p class="mt-6 text-center text-[14px] lp-muted">{{ t('landing.pricing.trustNote') }}</p>

                <!-- FAQ -->
                <div id="faq" class="mt-16 lg:mt-24 max-w-[44rem] mx-auto scroll-mt-16" lpReveal>
                    <h2 class="lp-h2 text-center">{{ t('landing.pricing.faqTitle') }}</h2>
                    <div class="mt-8 border-b border-[color:var(--lp-line)]">
                        @for (n of faqKeys; track n) {
                            <details class="lp-faq">
                                <summary><h3 class="m-0 text-[17px] font-semibold leading-snug">{{ t('landing.pricing.faq' + n + 'Q') }}</h3></summary>
                                <p class="lp-body pb-5 m-0">{{ t('landing.pricing.faq' + n + 'A') }}</p>
                            </details>
                        }
                    </div>
                </div>
            </div>
        </section>
    `,
})
export class PricingWidget {
    private analytics = inject(AnalyticsService);
    private i18n = inject(I18nService);
    private router = inject(Router);

    readonly prices = LANDING_PLAN_PRICES_XOF;
    readonly faqKeys = LANDING_FAQ_KEYS;

    get currentLang(): string { return landingLangPrefix(this.router); }

    t(key: string): string { return this.i18n.t(key); }

    fmt(n: number): string {
        return nbspSafe(new Intl.NumberFormat(this.i18n.lang() === 'fr' ? 'fr-FR' : 'en-US').format(n));
    }

    trackCta(placement: string): void { trackLandingCta(this.analytics, this.router, placement); }

    // Same plans.* feature keys as /pages/plans (single source of truth);
    // five per tier on the marketing page, the full list lives in-app.
    freeFeatures() { return [1, 2, 3, 4, 5].map(i => this.t(`plans.freeFeatures.f${i}`)); }
    proFeatures() { return [1, 2, 3, 4, 5].map(i => this.t(`plans.proFeatures.f${i}`)); }
    premiumFeatures() { return [1, 2, 3, 4, 5].map(i => this.t(`plans.premiumFeatures.f${i}`)); }
}
