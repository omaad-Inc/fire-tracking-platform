import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { I18nService } from '../../../i18n/i18n.service';
import { nbspSafe } from '../../../core/util/nbsp';
import { landingLangPrefix, trackLandingCta } from './landing-shared';
import { RevealDirective } from './reveal.directive';

export type PassKey = 'd15' | 'm1' | 'm3' | 'm6';
export const PASS_KEYS: PassKey[] = ['d15', 'm1', 'm3', 'm6'];

/**
 * The pricing ladder as the app sells it: PREPAID PASSES, not subscriptions.
 * A Pro or Premium pass runs 15 days, 1, 3 or 6 months, is paid by Mobile
 * Money or card, and expires at the end with no automatic renewal. XOF and
 * EUR are set independently (never an FX conversion).
 *
 * MIRROR of backend/app/services/billing_service.py (PRICING), the
 * server-authoritative grid the in-app plans page fetches at runtime. The
 * landing is prerendered for crawlers and cannot fetch, so this copy exists.
 * Two checks keep it honest: e2e/landing.smoke.spec.ts compares it to the
 * local GET /billing/plans, and tools/pricing-guard.mjs (in every build)
 * compares it to the committed export src/assets/pricing/plans.json
 * (refresh with `npm run pricing:refresh`).
 */
export const LANDING_PASS_LADDER: Record<'pro' | 'premium', Record<PassKey, { days: number; xof: number; eur: number }>> = {
    pro: {
        d15: { days: 15, xof: 2500, eur: 3 },
        m1: { days: 30, xof: 4000, eur: 5 },
        m3: { days: 90, xof: 10800, eur: 13.5 },
        m6: { days: 180, xof: 19200, eur: 24 },
    },
    premium: {
        d15: { days: 15, xof: 6000, eur: 7 },
        m1: { days: 30, xof: 10000, eur: 12 },
        m3: { days: 90, xof: 27000, eur: 32 },
        m6: { days: 180, xof: 48000, eur: 58 },
    },
};

/** FAQ order: the cautious visitor's questions first (bank? money? data?), then cost and passes, countries, mobile. */
export const LANDING_FAQ_KEYS = [5, 2, 1, 8, 3, 6, 7] as const;

/**
 * Pricing + FAQ (landing redesign): the free tier, then Pro and Premium
 * priced as passes behind ONE duration selector (15 j / 1 mois / 3 mois /
 * 6 mois), each with the same quantified benefit lines the in-app plans
 * page shows (plans.hero.*, which mirror the backend quotas). Every action
 * opens the free account; the pass is bought inside the app.
 */
@Component({
    selector: 'pricing-widget',
    standalone: true,
    imports: [RouterModule, RevealDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section id="pricing" class="lp-section scroll-mt-16" [attr.aria-labelledby]="'pricing-title'">
            <div class="lp-container">
                <div class="max-w-[42rem] mx-auto text-center" lpReveal>
                    <span class="lp-eyebrow">{{ t('landing.pricing.badge') }}</span>
                    @if (standalone()) {
                        <h1 id="pricing-title" class="lp-h1 mt-3">{{ t('landing.pricing.h2a') }} {{ t('landing.pricing.h2b') }}</h1>
                    } @else {
                        <h2 id="pricing-title" class="lp-h2 mt-3">{{ t('landing.pricing.h2a') }} {{ t('landing.pricing.h2b') }}</h2>
                    }
                    <p class="lp-lead mt-4">{{ t('landing.pricing.description') }}</p>
                </div>

                <!-- One duration for both paid tiers (the app's checkout sheet offers the same four) -->
                <div class="mt-8 flex flex-col items-center gap-2" lpReveal>
                    <span class="text-[12px] font-semibold uppercase tracking-[0.08em] lp-muted">{{ t('landing.pricing.passDuration') }}</span>
                    <div class="lp-segment" role="group" [attr.aria-label]="t('landing.pricing.passDuration')">
                        @for (k of passKeys; track k) {
                            <button type="button" [attr.aria-pressed]="pass() === k" [attr.data-pass]="k" (click)="pass.set(k)">{{ t('plans.checkout.' + k) }}</button>
                        }
                    </div>
                    <span class="text-[13px] lp-muted">{{ t('plans.checkout.saveMore') }}</span>
                </div>

                <div class="mt-8 lg:mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-stretch">
                    <!-- Free -->
                    <div class="lp-card p-6 lg:p-8 flex flex-col" lpReveal>
                        <h3 class="lp-h3">{{ t('plans.free') }}</h3>
                        <p class="lp-body mt-1 text-[15px]">{{ t('plans.freeTagline') }}</p>
                        <div class="mt-5 flex items-baseline gap-2"><span class="text-[40px] font-extrabold leading-none tracking-[-0.02em] lp-num">0</span><span class="lp-muted text-[14px]">{{ t('plans.freeForever') }}</span></div>
                        <p class="mt-1 text-[13px] lp-muted min-h-[20px]">{{ t('landing.pricing.freeNote') }}</p>
                        <a class="lp-btn lp-btn-secondary lp-btn-block mt-6" [routerLink]="[currentLang, 'auth', 'register']" (click)="trackCta('pricing_free')">{{ t('landing.pricing.freeCta') }}</a>
                        <ul class="mt-6 flex flex-col gap-3 list-none p-0 m-0">
                            @for (n of [1, 2, 3, 4]; track n) {
                                <li class="flex items-start gap-3 text-[15px] lp-body"><span class="lp-check mt-0.5"><i class="pi pi-check" aria-hidden="true"></i></span><span>{{ t('plans.hero.free.b' + n) }}</span></li>
                            }
                        </ul>
                    </div>

                    <!-- Pro (recommended) -->
                    <div class="lp-card p-6 lg:p-8 flex flex-col !border-[color:var(--lp-ochre)] !border-2 md:-mt-3 md:mb-3" lpReveal>
                        <div class="flex items-center justify-between gap-3">
                            <h3 class="lp-h3">{{ t('landing.pricing.proName') }}</h3>
                            <span class="text-[12px] font-semibold uppercase tracking-[0.06em] text-[color:var(--lp-ochre-ink)]">{{ t('landing.pricing.recommended') }}</span>
                        </div>
                        <p class="lp-body mt-1 text-[15px]">{{ t('plans.proTagline') }}</p>
                        <div class="mt-5 flex items-baseline gap-2" aria-live="polite">
                            <span class="text-[40px] font-extrabold leading-none tracking-[-0.02em] lp-num" data-tier="pro" [attr.data-xof]="price('pro').xof" [attr.data-eur]="price('pro').eur">{{ fmt(price('pro').xof) }}</span>
                            <span class="lp-muted text-[14px]">FCFA · {{ t('plans.checkout.' + pass()) }}</span>
                        </div>
                        <p class="mt-1 text-[13px] lp-muted min-h-[20px]">{{ sub('pro') }}</p>
                        <a class="lp-btn lp-btn-primary lp-btn-block mt-6" [routerLink]="[currentLang, 'auth', 'register']" (click)="trackCta('pricing_pro')">{{ t('landing.pricing.proCta') }}</a>
                        <ul class="mt-6 flex flex-col gap-3 list-none p-0 m-0">
                            <li class="text-[14px] font-semibold">{{ t('plans.everythingFree') }}</li>
                            @for (n of [1, 2, 3, 4, 5]; track n) {
                                <li class="flex items-start gap-3 text-[15px] lp-body"><span class="lp-check mt-0.5"><i class="pi pi-check" aria-hidden="true"></i></span><span>{{ t('plans.hero.pro.b' + n) }}</span></li>
                            }
                        </ul>
                    </div>

                    <!-- Premium -->
                    <div class="lp-card lp-dark p-6 lg:p-8 flex flex-col !border-transparent" lpReveal>
                        <h3 class="lp-h3 !text-white">{{ t('landing.pricing.premiumName') }}</h3>
                        <p class="mt-1 text-[15px] text-white/70">{{ t('plans.premiumTagline') }}</p>
                        <div class="mt-5 flex items-baseline gap-2" aria-live="polite">
                            <span class="text-[40px] font-extrabold leading-none tracking-[-0.02em] lp-num text-white" data-tier="premium" [attr.data-xof]="price('premium').xof" [attr.data-eur]="price('premium').eur">{{ fmt(price('premium').xof) }}</span>
                            <span class="text-white/60 text-[14px]">FCFA · {{ t('plans.checkout.' + pass()) }}</span>
                        </div>
                        <p class="mt-1 text-[13px] text-white/60 min-h-[20px]">{{ sub('premium') }}</p>
                        <a class="lp-btn lp-btn-primary lp-btn-block mt-6" [routerLink]="[currentLang, 'auth', 'register']" (click)="trackCta('pricing_premium')">{{ t('landing.pricing.premiumCta') }}</a>
                        <ul class="mt-6 flex flex-col gap-3 list-none p-0 m-0">
                            <li class="text-[14px] font-semibold text-white">{{ t('plans.everythingPro') }}</li>
                            @for (n of [1, 2, 3, 4]; track n) {
                                <li class="flex items-start gap-3 text-[15px] text-white/85"><span class="lp-check mt-0.5 !bg-white/15 !text-white"><i class="pi pi-check" aria-hidden="true"></i></span><span>{{ t('plans.hero.premium.b' + n) }}</span></li>
                            }
                        </ul>
                    </div>
                </div>
                <p class="mt-6 text-center text-[14px] lp-muted max-w-[44rem] mx-auto">{{ t('landing.pricing.passNote') }}</p>

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

    /** On /tarifs the section is the page: its title is the H1. */
    readonly standalone = input(false);
    readonly passKeys = PASS_KEYS;
    readonly faqKeys = LANDING_FAQ_KEYS;
    /** The selected pass length, shared by Pro and Premium. 1 month is the anchor. */
    readonly pass = signal<PassKey>('m1');

    get currentLang(): string { return landingLangPrefix(this.router); }

    t(key: string): string { return this.i18n.t(key); }

    price(tier: 'pro' | 'premium') { return LANDING_PASS_LADDER[tier][this.pass()]; }

    /** "ou 5 €" for 15 days and 1 month; "ou 13,5 € · soit 3 600 FCFA / mois" for 3 and 6 months. */
    sub(tier: 'pro' | 'premium'): string {
        const p = this.price(tier);
        const eur = this.t('landing.pricing.eurAlt').replace('{{eur}}', this.fmt(p.eur));
        if (p.days <= 30) return eur;
        const perMonth = Math.round(p.xof / (p.days / 30));
        return `${eur} · ${this.t('plans.checkout.perMonthEq').replace('{{price}}', this.fmt(perMonth) + ' FCFA')}`;
    }

    fmt(n: number): string {
        return nbspSafe(new Intl.NumberFormat(this.i18n.lang() === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 1 }).format(n));
    }

    trackCta(placement: string): void { trackLandingCta(this.analytics, this.router, placement); }
}
