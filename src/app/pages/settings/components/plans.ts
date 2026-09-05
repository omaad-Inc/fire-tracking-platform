import { Component, inject, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService } from '../../../i18n/i18n.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { BillingService } from '../../../core/services/billing.service';
import { PlanCheckoutSheet } from './plan-checkout-sheet';

/** Comparison group: 25 rows read as 4 clusters, and the free-forever block
 *  ("the free tier is the complete tracker", S11 ratified) becomes a statement. */
type GroupKey = 'tracking' | 'automation' | 'ai' | 'premium';

interface PlanFeature {
    group: GroupKey;
    label: string;
    free: boolean | string;
    pro: boolean | string;
    premium: boolean | string;
}

type TierKey = 'free' | 'pro' | 'premium';

interface TierView {
    key: TierKey;
    name: string;
    tagline: string;
    amount: string;
    sub: string;
    /** "Tout le plan X, plus :" inheritance line (null on the free tier). */
    lead: string | null;
    benefits: { icon: string; label: string }[];
}

/** What the CTA slot shows for a viewed tier, given the user's reached tier
 *  (Revolut rule: join above you, "your plan" on you, quiet downgrade below). */
type CtaKind = 'loading' | 'join' | 'current' | 'currentBeta' | 'renew' | 'downgradeFree' | 'downgradePro';

const TIER_RANK: Record<TierKey, number> = { free: 0, pro: 1, premium: 2 };

// Hero benefit icons per tier (labels come from i18n plans.hero.*).
const HERO_ICONS: Record<TierKey, string[]> = {
    free: ['pi-wallet', 'pi-chart-line', 'pi-comments', 'pi-download'],
    pro: ['pi-comments', 'pi-bell', 'pi-chart-line', 'pi-envelope', 'pi-share-alt'],
    premium: ['pi-comments', 'pi-bolt', 'pi-briefcase', 'pi-users', 'pi-code'],
};

@Component({
    selector: 'app-settings-plans',
    standalone: true,
    imports: [CommonModule, ButtonModule, PlanCheckoutSheet],
    template: `
        <div class="flex flex-col gap-5 lg:gap-6 max-w-6xl mx-auto min-h-screen pt-2 sm:pt-6 pb-32 lg:pb-12">

            <!-- Immersive close (the page holds the whole app, Finary-style) -->
            <div class="flex justify-end">
                <button (click)="closePage()" [attr.aria-label]="t('common.close')"
                        class="w-10 h-10 flex items-center justify-center rounded-full
                               bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700
                               transition-all shrink-0">
                    <i class="pi pi-times text-surface-600 dark:text-surface-300" aria-hidden="true"></i>
                </button>
            </div>

            <!-- Header (subtitle desktop-only so the mobile tier panel stays above the fold) -->
            <div class="text-center">
                <div class="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ochre-100 dark:bg-ochre-900/30 border border-ochre-300/60 dark:border-ochre-700/40 mb-4">
                    <i class="pi pi-crown text-ochre-500 text-xs" aria-hidden="true"></i>
                    <span class="text-ochre-600 dark:text-ochre-300 text-sm font-semibold">Omaad</span>
                </div>
                <h1 class="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-0 mb-2">
                    {{ t('plans.title') }}
                </h1>
                <p class="hidden lg:block text-surface-500 dark:text-surface-400 text-sm max-w-lg mx-auto">
                    {{ t('plans.subtitle') }}
                </p>
            </div>

            <!-- ═══════ MOBILE (< lg): segmented tier tabs ═══════ -->
            <div class="lg:hidden flex p-1 rounded-full bg-surface-100 dark:bg-surface-800 w-full max-w-md mx-auto" role="tablist">
                @for (tv of tiers(); track tv.key) {
                    <button type="button" role="tab" (click)="selectTier(tv.key)"
                            [attr.aria-selected]="viewedTier() === tv.key"
                            class="flex-1 rounded-full py-3 text-sm font-semibold transition-all"
                            [ngClass]="viewedTier() === tv.key
                                ? 'bg-surface-0 dark:bg-surface-600 text-surface-900 dark:text-white shadow-sm'
                                : 'text-surface-500 dark:text-surface-400'">
                        {{ tv.name }}
                    </button>
                }
            </div>

            <!-- ═══════ MOBILE (< lg): the tier panel (one tier per screen) ═══════ -->
            @if (mobileTier(); as tv) {
                <section class="lg:hidden relative overflow-hidden rounded-3xl p-6 min-h-[26rem] transition-colors duration-300"
                         [ngClass]="panelClass(tv.key)">
                    @if (tv.key === 'premium') {
                        <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ochre-400 via-ochre-500 to-ochre-400" aria-hidden="true"></div>
                    }
                    <div class="absolute -right-12 -top-12 w-44 h-44 rounded-full blur-2xl" aria-hidden="true"
                         [ngClass]="glowClass(tv.key)"></div>

                    <!-- Wealth-ring motif (the in-app signature object as hero accent) -->
                    <span class="absolute right-6 top-6 w-16 h-16" [ngClass]="ringAccent(tv.key)" aria-hidden="true">
                        <svg viewBox="0 0 64 64" fill="none" class="w-full h-full">
                            <circle cx="32" cy="32" r="26" stroke="currentColor" stroke-opacity="0.18" stroke-width="6"/>
                            <path d="M32 6 a26 26 0 0 1 22.5 13" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
                        </svg>
                        @if (tv.key === 'premium') {
                            <i class="pi pi-crown absolute inset-0 flex items-center justify-center !text-sm text-ochre-400"></i>
                        }
                    </span>

                    <h2 class="relative text-4xl font-bold tracking-tight" [ngClass]="heroText(tv.key)">{{ tv.name }}</h2>
                    <div class="relative mt-2.5 flex items-baseline gap-1.5">
                        <span class="text-[22px] font-bold tabular-nums" [ngClass]="heroText(tv.key)">{{ tv.amount }} {{ symbol() }}</span>
                        <span class="text-sm" [ngClass]="heroMuted(tv.key)">{{ t('plans.perMonth') }}</span>
                    </div>
                    <p class="relative text-[12.5px] mt-1" [ngClass]="heroMuted(tv.key)">{{ tv.sub }}</p>
                    <p class="relative text-sm mt-3 max-w-[38ch]" [ngClass]="heroMuted(tv.key)">{{ tv.tagline }}</p>

                    <ul class="relative mt-6 space-y-3.5">
                        @if (tv.lead) {
                            <li class="text-sm font-semibold" [ngClass]="heroText(tv.key)">{{ tv.lead }}</li>
                        }
                        @for (b of tv.benefits; track b.label) {
                            <li class="flex items-start gap-3 text-sm" [ngClass]="benefitText(tv.key)">
                                <span class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" [ngClass]="benefitChip(tv.key)">
                                    <i class="pi {{ b.icon }} !text-[11px]" aria-hidden="true"></i>
                                </span>
                                <span class="mt-0.5">{{ b.label }}</span>
                            </li>
                        }
                    </ul>
                </section>

                <!-- Expander to the full comparison -->
                <button type="button" (click)="benefitsOpen.set(!benefitsOpen())"
                        class="lg:hidden omaad-press w-full max-w-md mx-auto rounded-full py-3 text-sm font-semibold
                               bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200
                               hover:bg-surface-200 dark:hover:bg-surface-700 transition-all">
                    {{ benefitsOpen() ? t('plans.hideBenefits') : t('plans.seeAllBenefits', { n: comparisonTable().length }) }}
                </button>
            }

            <!-- ═══════ DESKTOP (lg+): the whole ladder side by side ═══════ -->
            <div class="hidden lg:grid grid-cols-3 gap-5 pt-4 max-w-5xl mx-auto w-full items-stretch">
                @for (tv of tiers(); track tv.key) {
                    <!-- overflow-hidden only where something must clip (the Premium gold
                         line); on Pro it would cut the floating "Populaire" badge. -->
                    <div class="relative rounded-2xl px-6 pt-9 pb-7 flex flex-col transition-shadow"
                         [ngClass]="cardClass(tv.key) + (tv.key === 'premium' ? ' overflow-hidden' : '') + (highlightTier() === tv.key ? ' ring-2 ring-ochre-500 ring-offset-2 ring-offset-surface-50 dark:ring-offset-surface-950' : '')">
                        @if (tv.key === 'premium') {
                            <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ochre-400 via-ochre-500 to-ochre-400" aria-hidden="true"></div>
                        }
                        @if (tv.key === 'pro') {
                            <span class="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full
                                         bg-ochre-500 text-warm-900 text-[10px] font-bold tracking-[0.15em] uppercase whitespace-nowrap
                                         inline-flex items-center gap-1.5 shadow-sm">
                                <i class="pi pi-star-fill !text-[8px]" aria-hidden="true"></i>
                                {{ t('plans.popular') }}
                            </span>
                        }

                        <div class="relative text-center">
                            <div class="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.18em] uppercase" [ngClass]="labelClass(tv.key)">
                                <i class="pi {{ tierIcon(tv.key) }} !text-[11px]" aria-hidden="true"></i>
                                {{ tv.name }}
                            </div>
                            <div class="mt-6 flex items-baseline justify-center gap-1.5">
                                <span class="text-4xl font-bold tabular-nums" [ngClass]="heroText(tv.key)">{{ tv.amount }}</span>
                                <span class="text-sm" [ngClass]="heroMuted(tv.key)">{{ symbol() }}{{ t('plans.perMonth') }}</span>
                            </div>
                            <p class="text-xs mt-1.5" [ngClass]="heroMuted(tv.key)">{{ tv.sub }}</p>
                            <p class="text-sm mt-5 mb-6 min-h-10" [ngClass]="heroMuted(tv.key)">{{ tv.tagline }}</p>
                        </div>

                        <!-- Context-aware CTA slot (§3.4 matrix) -->
                        <div class="relative mb-7 min-h-12 flex flex-col justify-center">
                            @switch (ctaKind(tv.key)) {
                                @case ('loading') {
                                    <div class="h-12 rounded-full bg-surface-100 dark:bg-surface-800 animate-pulse"></div>
                                }
                                @case ('join') {
                                    <button pButton (click)="openCheckout(asPaid(tv.key))"
                                            [label]="t('plans.cta.join', { plan: tv.name })" icon="pi pi-arrow-right" iconPos="right"
                                            class="omaad-press w-full !rounded-full !py-3 !font-bold !border-0 !text-warm-900
                                                   !bg-gradient-to-r !from-ochre-400 !to-ochre-500 hover:!from-ochre-500 hover:!to-ochre-600 transition-all"></button>
                                }
                                @case ('current') {
                                    <button pButton [label]="t('plans.cta.current')" [disabled]="true"
                                            class="w-full !rounded-full !py-3 !font-semibold" [ngClass]="currentPillClass(tv.key)"></button>
                                }
                                @case ('currentBeta') {
                                    <button pButton [label]="t('plans.cta.currentBeta')" [disabled]="true" icon="pi pi-gift"
                                            class="w-full !rounded-full !py-3 !font-semibold" [ngClass]="currentPillClass(tv.key)"></button>
                                }
                                @case ('renew') {
                                    <p class="text-center text-[11px] font-semibold uppercase tracking-wider mb-2" [ngClass]="heroMuted(tv.key)">
                                        {{ t('plans.cta.current') }}
                                    </p>
                                    <button pButton (click)="openCheckout(asPaid(tv.key))" [label]="t('plans.cta.renew')" icon="pi pi-refresh"
                                            class="omaad-press w-full !rounded-full !py-3 !font-bold !border-0 !text-warm-900
                                                   !bg-gradient-to-r !from-ochre-400 !to-ochre-500 hover:!from-ochre-500 hover:!to-ochre-600 transition-all"></button>
                                }
                                @case ('downgradeFree') {
                                    @if (canCancel()) {
                                        <button type="button" (click)="goToCancel()"
                                                class="w-full text-center text-sm py-3 underline-offset-2 hover:underline" [ngClass]="heroMuted(tv.key)">
                                            {{ t('plans.cta.downgradeFree') }}
                                        </button>
                                    }
                                }
                                @case ('downgradePro') {
                                    <button type="button" (click)="openCheckout('pro')"
                                            class="w-full text-center text-sm py-3 underline-offset-2 hover:underline" [ngClass]="heroMuted(tv.key)">
                                        {{ t('plans.cta.join', { plan: 'Pro' }) }}
                                    </button>
                                }
                            }
                        </div>

                        <ul class="relative space-y-3.5 flex-1">
                            @if (tv.lead) {
                                <li class="text-sm font-semibold" [ngClass]="heroText(tv.key)">{{ tv.lead }}</li>
                            }
                            @for (b of tv.benefits; track b.label) {
                                <li class="flex items-start gap-3 text-sm" [ngClass]="benefitText(tv.key)">
                                    <span class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" [ngClass]="benefitChip(tv.key)">
                                        <i class="pi {{ b.icon }} !text-[11px]" aria-hidden="true"></i>
                                    </span>
                                    <span class="mt-0.5">{{ b.label }}</span>
                                </li>
                            }
                        </ul>
                    </div>
                }
            </div>

            <!-- ═══════ MOBILE comparison v2: grouped, two columns, the VIEWED tier's value ═══════ -->
            @if (benefitsOpen()) {
                <div class="lg:hidden flex flex-col gap-5 max-w-md mx-auto w-full">
                    @for (g of groupedComparison(); track g.key) {
                        <div>
                            <h3 class="text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 px-1 mb-2">
                                {{ g.label }}
                            </h3>
                            <div class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900/50
                                        divide-y divide-surface-100 dark:divide-surface-800">
                                @for (row of g.rows; track row.label) {
                                    <div class="flex items-center justify-between gap-3 px-4 py-3">
                                        <span class="text-sm text-surface-700 dark:text-surface-300">{{ row.label }}</span>
                                        @if (valueFor(row) === true) {
                                            <i class="pi pi-check !text-xs text-positive shrink-0" aria-hidden="true"></i>
                                        } @else if (valueFor(row) === false) {
                                            <span class="text-surface-300 dark:text-surface-600 shrink-0" aria-hidden="true">–</span>
                                        } @else {
                                            <span class="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                                                  [ngClass]="chipClass()">{{ valueFor(row) }}</span>
                                        }
                                    </div>
                                }
                            </div>
                        </div>
                    }
                </div>
            }

            <!-- ═══════ DESKTOP comparison: grouped table, always expanded, next-up column highlighted ═══════ -->
            <div class="hidden lg:block">
                <div class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 max-w-4xl mx-auto w-full">
                    <div class="px-5 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                        <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0 m-0">
                            {{ t('plans.comparison') }}
                        </h2>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="border-b border-surface-200 dark:border-surface-700">
                                    <th class="text-left px-5 py-3 text-surface-500 font-medium">{{ t('plans.feature') }}</th>
                                    <th class="text-center px-4 py-3 text-surface-500 font-medium w-24" [ngClass]="colClass('free')">{{ t('plans.free') }}</th>
                                    <th class="text-center px-4 py-3 font-medium w-24" [ngClass]="colClass('pro')">
                                        <span class="text-ochre-500" [class.font-bold]="nextUpTier() === 'pro'">Pro</span>
                                    </th>
                                    <th class="text-center px-4 py-3 font-medium w-24" [ngClass]="colClass('premium')">
                                        <span class="text-brand-700 dark:text-brand-300" [class.font-bold]="nextUpTier() === 'premium'">Premium</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (g of groupedComparison(); track g.key) {
                                    <tr>
                                        <td colspan="4" class="px-5 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-wider
                                                               text-surface-400 dark:text-surface-500">{{ g.label }}</td>
                                    </tr>
                                    @for (row of g.rows; track row.label) {
                                        <tr class="border-b border-surface-100 dark:border-surface-700 dark:hover:bg-surface-800/60 transition-colors">
                                            <td class="px-5 py-3 text-surface-700 dark:text-surface-300">{{ row.label }}</td>
                                            <td class="text-center px-4 py-3" [ngClass]="colClass('free')">
                                                @if (row.free === true) {
                                                    <i class="pi pi-check text-positive text-xs"></i>
                                                } @else if (row.free === false) {
                                                    <span class="text-surface-300 dark:text-surface-600">–</span>
                                                } @else {
                                                    <span class="text-surface-600 dark:text-surface-400 text-xs">{{ row.free }}</span>
                                                }
                                            </td>
                                            <td class="text-center px-4 py-3" [ngClass]="colClass('pro')">
                                                @if (row.pro === true) {
                                                    <i class="pi pi-check text-ochre-500 text-xs"></i>
                                                } @else if (row.pro === false) {
                                                    <span class="text-surface-300 dark:text-surface-600">–</span>
                                                } @else {
                                                    <span class="text-ochre-500 text-xs font-medium">{{ row.pro }}</span>
                                                }
                                            </td>
                                            <td class="text-center px-4 py-3" [ngClass]="colClass('premium')">
                                                @if (row.premium === true) {
                                                    <i class="pi pi-check text-brand-700 dark:text-surface-0 text-xs"></i>
                                                } @else if (row.premium === false) {
                                                    <span class="text-surface-300 dark:text-surface-600">–</span>
                                                } @else {
                                                    <span class="text-brand-700 dark:text-surface-0 text-xs font-medium">{{ row.premium }}</span>
                                                }
                                            </td>
                                        </tr>
                                    }
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Trust note -->
            <div class="text-center">
                <p class="text-xs text-surface-400 flex items-center justify-center gap-1.5">
                    <i class="pi pi-lock text-brand-700 dark:text-ochre-400" aria-hidden="true"></i>
                    {{ t('plans.trustNote') }}
                </p>
            </div>

            <!-- ═══════ MOBILE: sticky contextual CTA (safe-area padded) ═══════ -->
            @if (showSticky()) {
                <div class="lg:hidden fixed bottom-0 inset-x-0 z-20 px-4 pt-3 border-t border-surface-200 dark:border-surface-800
                            bg-surface-0/95 dark:bg-surface-950/95 backdrop-blur"
                     style="padding-bottom: calc(env(safe-area-inset-bottom) + 0.875rem)">
                    @switch (ctaKind(viewedTier())) {
                        @case ('loading') {
                            <div class="h-12 rounded-full bg-surface-100 dark:bg-surface-800 animate-pulse"></div>
                        }
                        @case ('join') {
                            <button pButton (click)="openCheckout(asPaid(viewedTier()))"
                                    [label]="t('plans.cta.join', { plan: mobileTier().name })" icon="pi pi-arrow-right" iconPos="right"
                                    class="omaad-press w-full !rounded-full !py-3.5 !font-bold !border-0 !text-warm-900
                                           !bg-gradient-to-r !from-ochre-400 !to-ochre-500 hover:!from-ochre-500 hover:!to-ochre-600 shadow-lifted transition-all"></button>
                        }
                        @case ('current') {
                            <button pButton [label]="t('plans.cta.current')" [disabled]="true" [outlined]="true"
                                    class="w-full !rounded-full !py-3.5 !font-semibold"></button>
                        }
                        @case ('currentBeta') {
                            <button pButton [label]="t('plans.cta.currentBeta')" [disabled]="true" [outlined]="true" icon="pi pi-gift"
                                    class="w-full !rounded-full !py-3.5 !font-semibold"></button>
                        }
                        @case ('renew') {
                            <button pButton (click)="openCheckout(asPaid(viewedTier()))"
                                    [label]="t('subscription.cta.renewOneClick')" icon="pi pi-refresh"
                                    class="omaad-press w-full !rounded-full !py-3.5 !font-bold !border-0 !text-warm-900
                                           !bg-gradient-to-r !from-ochre-400 !to-ochre-500 hover:!from-ochre-500 hover:!to-ochre-600 shadow-lifted transition-all"></button>
                        }
                        @case ('downgradeFree') {
                            <button type="button" (click)="goToCancel()"
                                    class="w-full text-center text-sm py-3.5 text-surface-500 dark:text-surface-400 underline-offset-2 hover:underline">
                                {{ t('plans.cta.downgradeFree') }}
                            </button>
                        }
                        @case ('downgradePro') {
                            <button type="button" (click)="openCheckout('pro')"
                                    class="w-full text-center text-sm py-3.5 text-surface-500 dark:text-surface-400 underline-offset-2 hover:underline">
                                {{ t('plans.cta.join', { plan: 'Pro' }) }}
                            </button>
                        }
                    }
                </div>
            }

            <!-- Duration + payment checkout sheet (farata-style) -->
            <app-plan-checkout-sheet [(open)]="sheetVisible" [tier]="sheetTier()" />
        </div>
    `
})
export class PlansSettings {
    private i18n   = inject(I18nService);
    private router = inject(Router);
    private route  = inject(ActivatedRoute);
    private cs      = inject(CurrencyService);
    private billing = inject(BillingService);

    /** Mobile: which tier screen is shown. Desktop shows all three. */
    viewedTier = signal<TierKey>('pro');
    benefitsOpen = signal(false);
    /** Desktop: card to visually pull forward when landed via ?tier=. */
    highlightTier = signal<TierKey | null>(null);
    private userPicked = false;

    constructor() {
        // Prices come from GET /billing/plans (the single source), not hardcoded;
        // the subscription state feeds the contextual CTA matrix.
        this.billing.loadPlans();
        this.billing.load();

        // Deep links: ?tier= selects the tab (mobile) / highlights the card
        // (desktop); &checkout=1 additionally opens the sheet (quota-exceeded
        // CTAs keep their direct-to-checkout behavior through it).
        const qp = this.route.snapshot.queryParamMap;
        const tier = qp.get('tier');
        if (tier === 'free' || tier === 'pro' || tier === 'premium') {
            this.viewedTier.set(tier);
            this.highlightTier.set(tier);
            this.userPicked = true;
        }
        if (qp.get('checkout') === '1' && (tier === 'pro' || tier === 'premium')) this.openCheckout(tier);

        // No explicit tier: land on the user's next tier up (conversion-first,
        // ratified §8.2) once the subscription state is known. The current plan
        // is one swipe away; Premium users land on their own tab.
        effect(() => {
            if (this.userPicked || this.billing.state() === 'loading') return;
            this.viewedTier.set(this.reachedTier() === 'free' ? 'pro' : 'premium');
            this.userPicked = true;
        });
    }

    t(key: string, params?: Record<string, string | number>): string {
        return this.i18n.t(key, params);
    }

    /** The page holds the whole app (immersive): X returns to where the user
     *  came from, falling back to the app home on a direct load. */
    closePage(): void {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            this.router.navigate(['/', this.lang()]);
        }
    }

    private lang(): string {
        return this.router.url.match(/^\/(fr|en)(\/|$)/)?.[1] ?? 'fr';
    }

    selectTier(tier: TierKey): void {
        this.viewedTier.set(tier);
        this.userPicked = true;
        // Keep the tab in the URL so a refresh (or a share) restores it.
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { tier },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }

    // Checkout sheet state: duration + payment method are chosen there.
    sheetVisible = signal(false);
    sheetTier = signal<'pro' | 'premium'>('premium');
    openCheckout(tier: 'pro' | 'premium'): void {
        this.sheetTier.set(tier);
        this.sheetVisible.set(true);
    }

    /** Template helper: a join/renew CTA only ever targets a paid tier. */
    asPaid(tier: TierKey): 'pro' | 'premium' {
        return tier === 'premium' ? 'premium' : 'pro';
    }

    /** Downgrade-to-free = cancel, which lives on the Abonnement page (single
     *  cancel path, no second confirm flow here). */
    goToCancel(): void {
        this.router.navigate(['/', this.lang(), 'pages', 'settings', 'subscription']);
    }

    // ── Entitlement-aware CTA matrix (§3.4) ─────────────────────────────────

    /** The tier the user has effectively reached. Beta courtesy lifts everyone
     *  to at least Pro (mirrors the settings-hub banner logic) so a courtesy
     *  Pro user is never nagged to "upgrade" to what they already have. */
    private reachedTier = computed<TierKey>(() => {
        const plan = this.billing.effectivePlan() as TierKey;
        if (plan === 'premium') return 'premium';
        return this.billing.betaCourtesy() ? 'pro' : plan;
    });

    canCancel = computed<boolean>(() => {
        const st = this.billing.state();
        return st === 'active_prepaid' || st === 'active_auto';
    });

    ctaKind(tier: TierKey): CtaKind {
        const st = this.billing.state();
        if (st === 'loading') return 'loading';
        const reached = this.reachedTier();
        if (TIER_RANK[tier] > TIER_RANK[reached]) return 'join';
        if (tier === reached) {
            if (tier === 'pro' && this.billing.betaCourtesy() && !this.billing.subscription()?.plan) return 'currentBeta';
            if (st === 'active_prepaid' && tier !== 'free') return 'renew';
            return 'current';
        }
        return tier === 'free' ? 'downgradeFree' : 'downgradePro';
    }

    /** Hide the mobile sticky bar when its only content would be a downgrade
     *  link with nothing cancellable behind it (e.g. beta courtesy on Gratuit). */
    showSticky = computed<boolean>(() => {
        const kind = this.ctaKind(this.viewedTier());
        return !(kind === 'downgradeFree' && !this.canCancel());
    });

    // ── Shared tier config: one source for both breakpoints ────────────────

    symbol = computed(() => this.cs.config().symbol);

    /** 1-month anchor amount per tier, from /billing/plans (dash until loaded). */
    private anchor(tier: 'pro' | 'premium'): string {
        const isEur = this.cs.currencyCode() === 'EUR';
        const m1 = this.billing.plans()?.plans.find(p => p.plan === tier)?.durations.find(d => d.duration_key === 'm1');
        if (!m1) return '—';
        const val = isEur ? m1.eur : m1.xof;
        // Width from the currency the price is QUOTED in (EUR or XOF), not the
        // display currency: those diverge for a USD or XAF user, who is shown
        // the XOF price and must not see centimes invented on it.
        return this.cs.formatDisplayNumber(val, this.cs.decimalsFor(val, isEur ? 'EUR' : 'XOF'));
    }

    private heroBenefits(tier: TierKey): { icon: string; label: string }[] {
        return HERO_ICONS[tier].map((icon, i) => ({ icon, label: this.t(`plans.hero.${tier}.b${i + 1}`) }));
    }

    tiers = computed<TierView[]>(() => [
        {
            key: 'free',
            name: this.t('plans.free'),
            tagline: this.t('plans.freeTagline'),
            amount: this.cs.formatDisplayNumber(0),
            sub: this.t('plans.freeForever'),
            lead: null,
            benefits: this.heroBenefits('free'),
        },
        {
            key: 'pro',
            name: 'Pro',
            tagline: this.t('plans.proTagline'),
            amount: this.anchor('pro'),
            sub: this.t('plans.orLongerPass'),
            lead: this.t('plans.everythingFree'),
            benefits: this.heroBenefits('pro'),
        },
        {
            key: 'premium',
            name: 'Premium',
            tagline: this.t('plans.premiumTagline'),
            amount: this.anchor('premium'),
            sub: this.t('plans.orLongerPass'),
            lead: this.t('plans.everythingPro'),
            benefits: this.heroBenefits('premium'),
        },
    ]);

    mobileTier = computed<TierView>(() => this.tiers().find(tv => tv.key === this.viewedTier()) ?? this.tiers()[1]);

    // ── Tier ambiance (§3.2): literal class strings so Tailwind sees them ──

    panelClass(tier: TierKey): string {
        switch (tier) {
            case 'free':    return 'bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800';
            case 'pro':     return 'bg-gradient-to-br from-brand-700 to-brand-900 shadow-xl';
            case 'premium': return 'bg-brand-950 border border-brand-700/50 shadow-xl';
        }
    }

    cardClass(tier: TierKey): string {
        switch (tier) {
            case 'free':    return 'bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800';
            case 'pro':     return 'bg-gradient-to-br from-brand-700 to-brand-900 shadow-lifted';
            case 'premium': return 'bg-brand-950 border border-brand-700/50 shadow-lifted';
        }
    }

    glowClass(tier: TierKey): string {
        switch (tier) {
            case 'free':    return 'bg-brand-700/10';
            case 'pro':     return 'bg-ochre-500/25';
            case 'premium': return 'bg-ochre-400/15';
        }
    }

    heroText(tier: TierKey): string {
        return tier === 'free' ? 'text-surface-900 dark:text-surface-0' : 'text-white';
    }

    heroMuted(tier: TierKey): string {
        return tier === 'free' ? 'text-surface-500 dark:text-surface-400' : 'text-white/60';
    }

    benefitText(tier: TierKey): string {
        return tier === 'free' ? 'text-surface-700 dark:text-surface-300' : 'text-white/85';
    }

    benefitChip(tier: TierKey): string {
        return tier === 'free'
            ? 'bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400'
            : 'bg-white/10 text-ochre-400';
    }

    ringAccent(tier: TierKey): string {
        return tier === 'free' ? 'text-surface-400 dark:text-surface-500' : 'text-ochre-400';
    }

    labelClass(tier: TierKey): string {
        switch (tier) {
            case 'free':    return 'text-surface-500 dark:text-surface-400';
            case 'pro':     return 'text-ochre-400';
            case 'premium': return 'text-ochre-400';
        }
    }

    tierIcon(tier: TierKey): string {
        switch (tier) {
            case 'free':    return 'pi-chart-line';
            case 'pro':     return 'pi-crown';
            case 'premium': return 'pi-bolt';
        }
    }

    /** "Votre plan" pill styled for the card it sits on (dark tiers need the
     *  translucent-white treatment; the light free card keeps outlined). */
    currentPillClass(tier: TierKey): string {
        return tier === 'free'
            ? '!border !border-surface-300 dark:!border-surface-600 !bg-transparent !text-surface-500 dark:!text-surface-400'
            : '!border !border-white/20 !bg-white/10 !text-white/80';
    }

    comparisonTable = computed((): PlanFeature[] => {
        const t = (k: string) => this.i18n.t(k);
        const unlimited = t('plans.unlimited');
        const setupGrant = t('plans.compare.aiSetupGrant'); // free tier config-assistant grant
        const aiMonthly = t('plans.compare.aiMonthly');     // Pro config-assistant quota
        const aiMonthlyPremium = t('plans.compare.aiMonthlyPremium'); // Premium quota (ENT-1, ratified 300)
        return [
            // The free tier is the complete manual tracker; data rights
            // (export) and security are NEVER paywalled (S11 plan matrix,
            // ratified 2026-07-27).
            { group: 'tracking',   label: t('plans.compare.assets'),             free: unlimited, pro: unlimited, premium: unlimited },
            { group: 'tracking',   label: 'Transactions',                        free: unlimited, pro: unlimited, premium: unlimited },
            { group: 'tracking',   label: t('plans.compare.brvmQuotes'),         free: true,  pro: true,  premium: true  },
            { group: 'tracking',   label: t('plans.compare.savingsGoals'),       free: true,  pro: true,  premium: true  },
            { group: 'tracking',   label: t('plans.compare.debts'),              free: true,  pro: true,  premium: true  },
            { group: 'tracking',   label: t('plans.compare.charts'),             free: true,  pro: true,  premium: true  },
            { group: 'tracking',   label: t('plans.compare.coaching'),           free: true,  pro: true,  premium: true  },
            { group: 'tracking',   label: t('plans.compare.fireGoal'),           free: true,  pro: true,  premium: true  },
            { group: 'tracking',   label: t('plans.compare.multiCurrency'),      free: true,  pro: true,  premium: true  },
            { group: 'tracking',   label: t('plans.compare.notifications'),      free: true,  pro: true,  premium: true  },
            { group: 'tracking',   label: t('plans.compare.dataExport'),         free: true,  pro: true,  premium: true  },
            { group: 'tracking',   label: t('plans.compare.shareLinks'),         free: '1',   pro: unlimited, premium: unlimited },
            { group: 'automation', label: t('plans.compare.automatedReports'),   free: false, pro: true,  premium: true  },
            { group: 'automation', label: t('plans.compare.customAlerts'),       free: false, pro: true,  premium: true  },
            { group: 'automation', label: t('plans.compare.brvmHistory'),        free: false, pro: true,  premium: true  },
            { group: 'automation', label: t('plans.compare.advancedReports'),    free: false, pro: true,  premium: true  },
            { group: 'automation', label: t('plans.compare.customCategories'),   free: false, pro: true,  premium: true  },
            { group: 'automation', label: t('plans.compare.prioritySupport'),    free: false, pro: true,  premium: true  },
            { group: 'ai',         label: t('plans.compare.aiOnboarding'),       free: true,  pro: true,  premium: true  },
            { group: 'ai',         label: t('plans.compare.aiAssistant'),        free: setupGrant, pro: aiMonthly, premium: aiMonthlyPremium },
            { group: 'ai',         label: t('plans.compare.aiAdvisor'),          free: false, pro: false, premium: true  },
            { group: 'ai',         label: t('plans.compare.aiOpus'),             free: false, pro: false, premium: true  },
            { group: 'premium',    label: t('plans.compare.multiPortfolios'),    free: false, pro: false, premium: true  },
            { group: 'premium',    label: t('plans.compare.groupTontine'),       free: false, pro: false, premium: true  },
            { group: 'premium',    label: t('plans.compare.apiIntegrations'),    free: false, pro: false, premium: true  },
        ];
    });

    /** Comparison rows clustered under their group headers (order = the story:
     *  free-forever tracking first, then what each paid tier adds). */
    groupedComparison = computed(() => {
        const rows = this.comparisonTable();
        return (['tracking', 'automation', 'ai', 'premium'] as GroupKey[]).map(key => ({
            key,
            label: this.t(`plans.group.${key}`),
            rows: rows.filter(r => r.group === key),
        }));
    });

    /** Mobile comparison shows ONE value column: the viewed tier's. */
    valueFor(row: PlanFeature): boolean | string {
        return row[this.viewedTier()];
    }

    chipClass(): string {
        return this.viewedTier() === 'free'
            ? 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300'
            : 'bg-ochre-500/10 text-ochre-600 dark:text-ochre-300';
    }

    /** Desktop table: the user's NEXT tier up gets the highlighted column. */
    nextUpTier = computed<'pro' | 'premium'>(() => this.reachedTier() === 'free' ? 'pro' : 'premium');

    colClass(tier: TierKey): string {
        return this.nextUpTier() === tier ? 'bg-ochre-500/5 dark:bg-ochre-400/10' : '';
    }
}
