import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { I18nService } from '../../../i18n/i18n.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { BillingService } from '../../../core/services/billing.service';
import { PlanCheckoutSheet } from './plan-checkout-sheet';

interface PlanFeature {
    label: string;
    free: boolean | string;
    pro: boolean | string;
    premium: boolean | string;
}

@Component({
    selector: 'app-settings-plans',
    standalone: true,
    imports: [CommonModule, ButtonModule, DividerModule, PlanCheckoutSheet],
    template: `
        <div class="flex flex-col gap-6 max-w-6xl mx-auto min-h-screen pt-2 sm:pt-6">

            <!-- Immersive close (the page holds the whole app, Finary-style) -->
            <div class="flex justify-end">
                <button (click)="closePage()" [attr.aria-label]="t('common.close')"
                        class="w-10 h-10 flex items-center justify-center rounded-full
                               bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700
                               transition-all shrink-0">
                    <i class="pi pi-times text-surface-600 dark:text-surface-300" aria-hidden="true"></i>
                </button>
            </div>

            <!-- Header -->
            <div class="text-center mb-2">
                <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ochre-100 dark:bg-ochre-900/30 border border-ochre-300/60 dark:border-ochre-700/40 mb-4">
                    <i class="pi pi-crown text-ochre-500 text-xs"></i>
                    <span class="text-ochre-600 dark:text-ochre-300 text-sm font-semibold">Omaad</span>
                </div>
                <h1 class="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-0 mb-2">
                    {{ t('plans.title') }}
                </h1>
                <p class="text-surface-500 dark:text-surface-400 text-sm max-w-lg mx-auto">
                    {{ t('plans.subtitle') }}
                </p>
            </div>

            <!-- Plan cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 max-w-5xl mx-auto w-full">

                <!-- Gratuit -->
                <div class="relative rounded-2xl px-6 pt-9 pb-7 flex flex-col bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800">
                    <div class="text-center">
                        <div class="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.18em] uppercase text-surface-500 dark:text-surface-400">
                            <i class="pi pi-chart-line !text-[11px]" aria-hidden="true"></i>
                            {{ t('plans.free') }}
                        </div>
                        <div class="mt-6 flex items-baseline justify-center gap-1.5">
                            <span class="text-4xl font-bold text-surface-900 dark:text-surface-0">{{ pricing().free.amount }}</span>
                            <span class="text-surface-500 text-sm">{{ pricing().free.symbol }}{{ pricing().free.period }}</span>
                        </div>
                        <p class="text-xs text-surface-500 dark:text-surface-400 mt-1.5">{{ pricing().free.sub }}</p>
                        <p class="text-sm text-surface-500 dark:text-surface-400 mt-5 mb-6 min-h-10">{{ t('plans.freeTagline') }}</p>
                    </div>
                    <button pButton
                            [label]="t('plans.currentPlan')"
                            [outlined]="true" [disabled]="true"
                            class="relative w-full mb-7 !rounded-full !py-3 !font-semibold"></button>
                    <ul class="relative space-y-3.5 flex-1">
                        @for (f of freeFeatures(); track f) {
                            <li class="flex items-start gap-2.5 text-sm text-surface-700 dark:text-surface-300">
                                <i class="pi pi-check !text-xs text-positive-700 dark:text-positive-400 shrink-0 mt-1" aria-hidden="true"></i>
                                {{ f }}
                            </li>
                        }
                    </ul>
                </div>

                <!-- Pro: the highlighted plan, floating badge on the border -->
                <div class="relative rounded-2xl px-6 pt-9 pb-7 flex flex-col bg-surface-0 dark:bg-surface-900 border-2 border-ochre-500">
                    <span class="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full
                                 bg-surface-0 dark:bg-surface-900 border-2 border-ochre-500
                                 text-ochre-600 dark:text-ochre-400 text-[10px] font-bold tracking-[0.15em] uppercase whitespace-nowrap
                                 inline-flex items-center gap-1.5">
                        <i class="pi pi-star-fill !text-[8px]" aria-hidden="true"></i>
                        {{ t('plans.popular') }}
                    </span>
                    <div class="text-center">
                        <div class="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.18em] uppercase text-ochre-600 dark:text-ochre-400">
                            <i class="pi pi-crown !text-[11px]" aria-hidden="true"></i>
                            Pro
                        </div>
                        <div class="mt-6 flex items-baseline justify-center gap-1.5">
                            <span class="text-4xl font-bold text-surface-900 dark:text-surface-0">{{ pricing().pro.amount }}</span>
                            <span class="text-surface-500 text-sm">{{ pricing().pro.symbol }}{{ pricing().pro.period }}</span>
                        </div>
                        <p class="text-xs text-surface-500 dark:text-surface-400 mt-1.5">{{ pricing().pro.sub }}</p>
                        <p class="text-sm text-surface-500 dark:text-surface-400 mt-5 mb-6 min-h-10">{{ t('plans.proTagline') }}</p>
                    </div>
                    <button pButton
                            (click)="openCheckout('pro')"
                            [label]="t('plans.choose')" icon="pi pi-arrow-right" iconPos="right"
                            class="relative w-full mb-7 !rounded-full !py-3 !font-semibold !bg-ochre-500 !border-0 !text-warm-900"></button>
                    <ul class="relative space-y-3.5 flex-1">
                        <li class="flex items-start gap-2.5 text-sm text-surface-900 dark:text-surface-0 font-semibold">
                            <i class="pi pi-check !text-xs text-positive-700 dark:text-positive-400 shrink-0 mt-1" aria-hidden="true"></i>
                            {{ t('plans.everythingFree') }}
                        </li>
                        @for (f of proFeatures(); track f) {
                            <li class="flex items-start gap-2.5 text-sm text-surface-700 dark:text-surface-300">
                                <i class="pi pi-check !text-xs text-positive-700 dark:text-positive-400 shrink-0 mt-1" aria-hidden="true"></i>
                                {{ f }}
                            </li>
                        }
                    </ul>
                </div>

                <!-- Premium (dark, flagship — the premium signal) -->
                <div class="relative rounded-2xl px-6 pt-9 pb-7 flex flex-col bg-brand-800 dark:bg-brand-950 border border-brand-700 shadow-lifted overflow-hidden">
                    <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ochre-400 via-ochre-500 to-ochre-400"></div>
                    <div class="text-center">
                        <div class="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.18em] uppercase text-ochre-400">
                            <i class="pi pi-bolt !text-[11px]" aria-hidden="true"></i>
                            Premium
                        </div>
                        <div class="mt-6 flex items-baseline justify-center gap-1.5">
                            <span class="text-4xl font-bold text-white">{{ pricing().premium.amount }}</span>
                            <span class="text-white/50 text-sm">{{ pricing().premium.symbol }}{{ pricing().premium.period }}</span>
                        </div>
                        <p class="text-xs text-white/50 mt-1.5">{{ pricing().premium.sub }}</p>
                        <p class="text-sm text-white/70 mt-5 mb-6 min-h-10">{{ t('plans.premiumTagline') }}</p>
                    </div>
                    <button pButton
                            (click)="openCheckout('premium')"
                            [label]="t('plans.choose')" icon="pi pi-arrow-right" iconPos="right"
                            class="relative w-full mb-7 !rounded-full !py-3 !font-semibold !bg-ochre-500 !border-0 !text-warm-900 hover:!bg-ochre-400 transition-all"></button>
                    <ul class="relative space-y-3.5 flex-1">
                        <li class="flex items-start gap-2.5 text-sm text-white font-semibold">
                            <i class="pi pi-check !text-xs text-ochre-400 shrink-0 mt-1" aria-hidden="true"></i>
                            {{ t('plans.everythingPro') }}
                        </li>
                        @for (f of premiumFeatures(); track f) {
                            <li class="flex items-start gap-2.5 text-sm text-white/80">
                                <i class="pi pi-check !text-xs text-ochre-400 shrink-0 mt-1" aria-hidden="true"></i>
                                {{ f }}
                            </li>
                        }
                    </ul>
                </div>
            </div>

            <!-- Feature comparison table -->
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
                                <th class="text-center px-4 py-3 text-surface-500 font-medium w-24">{{ t('plans.free') }}</th>
                                <th class="text-center px-4 py-3 font-medium w-24"><span class="text-ochre-500">Pro</span></th>
                                <th class="text-center px-4 py-3 font-medium w-24"><span class="text-brand-700 dark:text-brand-300">Premium</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (row of comparisonTable(); track row.label) {
                                <tr class="border-b border-surface-100 dark:border-surface-700 dark:hover:bg-surface-800/60 transition-colors">
                                    <td class="px-5 py-3 text-surface-700 dark:text-surface-300">{{ row.label }}</td>
                                    <td class="text-center px-4 py-3">
                                        @if (row.free === true) {
                                            <i class="pi pi-check text-positive text-xs"></i>
                                        } @else if (row.free === false) {
                                            <span class="text-surface-300 dark:text-surface-600">–</span>
                                        } @else {
                                            <span class="text-surface-600 dark:text-surface-400 text-xs">{{ row.free }}</span>
                                        }
                                    </td>
                                    <td class="text-center px-4 py-3">
                                        @if (row.pro === true) {
                                            <i class="pi pi-check text-ochre-500 text-xs"></i>
                                        } @else if (row.pro === false) {
                                            <span class="text-surface-300 dark:text-surface-600">–</span>
                                        } @else {
                                            <span class="text-ochre-500 text-xs font-medium">{{ row.pro }}</span>
                                        }
                                    </td>
                                    <td class="text-center px-4 py-3">
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
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Trust note -->
            <div class="text-center">
                <p class="text-xs text-surface-400 flex items-center justify-center gap-1.5">
                    <i class="pi pi-lock text-brand-700 dark:text-ochre-400"></i>
                    {{ t('plans.trustNote') }}
                </p>
            </div>

            <!-- Duration + payment checkout sheet (farata-style) -->
            <app-plan-checkout-sheet [(open)]="sheetVisible" [tier]="sheetTier()" />
        </div>
    `
})
export class PlansSettings {
    private i18n   = inject(I18nService);
    private router = inject(Router);
    private cs      = inject(CurrencyService);
    private billing = inject(BillingService);

    constructor() {
        // Prices come from GET /billing/plans (the single source), not hardcoded.
        this.billing.loadPlans();
    }

    t(key: string): string { return this.i18n.t(key); }

    /** The page holds the whole app (immersive): X returns to where the user
     *  came from, falling back to the app home on a direct load. */
    closePage(): void {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            const lang = this.router.url.match(/^\/(fr|en)(\/|$)/)?.[1] ?? 'fr';
            this.router.navigate(['/', lang]);
        }
    }

    // Checkout sheet state: duration + payment method are chosen there.
    sheetVisible = signal(false);
    sheetTier = signal<'pro' | 'premium'>('premium');
    openCheckout(tier: 'pro' | 'premium'): void {
        this.sheetTier.set(tier);
        this.sheetVisible.set(true);
    }

    // Tier cards show the 1-month anchor price, sourced from /billing/plans (the
    // sheet reveals the cheaper longer passes). Amount is in the user's display
    // currency with the right symbol (no more hardcoded "FCFA" for EUR users);
    // falls back to a dash until prices load.
    pricing = computed(() => {
        const t = (k: string) => this.i18n.t(k);
        const period = t('plans.perMonth');
        const symbol = this.cs.config().symbol;
        const isEur = this.cs.currencyCode() === 'EUR';
        const plans = this.billing.plans();

        const anchor = (tier: 'pro' | 'premium'): string => {
            const m1 = plans?.plans.find(p => p.plan === tier)?.durations.find(d => d.duration_key === 'm1');
            if (!m1) return '—';
            const val = isEur ? m1.eur : m1.xof;
            return this.cs.formatDisplayNumber(val, isEur && !Number.isInteger(val) ? 2 : 0);
        };

        return {
            free:    { amount: this.cs.formatDisplayNumber(0, 0), symbol, period, sub: t('plans.freeForever') },
            pro:     { amount: anchor('pro'),                     symbol, period, sub: t('plans.orLongerPass') },
            premium: { amount: anchor('premium'),                symbol, period, sub: t('plans.orLongerPass') },
        };
    });

    private featureList(prefix: string, count: number): string[] {
        return Array.from({ length: count }, (_, i) => this.i18n.t(`${prefix}.f${i + 1}`));
    }

    freeFeatures    = computed(() => this.featureList('plans.freeFeatures', 8));
    proFeatures     = computed(() => this.featureList('plans.proFeatures', 7));
    premiumFeatures = computed(() => this.featureList('plans.premiumFeatures', 7));

    comparisonTable = computed((): PlanFeature[] => {
        const t = (k: string) => this.i18n.t(k);
        const unlimited = t('plans.unlimited');
        return [
            // The free tier is the complete manual tracker; data rights
            // (export) and security are NEVER paywalled (S11 plan matrix,
            // ratified 2026-07-27).
            { label: t('plans.compare.assets'),             free: unlimited, pro: unlimited, premium: unlimited },
            { label: 'Transactions',                        free: unlimited, pro: unlimited, premium: unlimited },
            { label: t('plans.compare.brvmQuotes'),         free: true,  pro: true,  premium: true  },
            { label: t('plans.compare.savingsGoals'),       free: true,  pro: true,  premium: true  },
            { label: t('plans.compare.debts'),              free: true,  pro: true,  premium: true  },
            { label: t('plans.compare.charts'),             free: true,  pro: true,  premium: true  },
            { label: t('plans.compare.coaching'),           free: true,  pro: true,  premium: true  },
            { label: t('plans.compare.fireGoal'),           free: true,  pro: true,  premium: true  },
            { label: t('plans.compare.multiCurrency'),      free: true,  pro: true,  premium: true  },
            { label: t('plans.compare.notifications'),      free: true,  pro: true,  premium: true  },
            { label: t('plans.compare.dataExport'),         free: true,  pro: true,  premium: true  },
            { label: t('plans.compare.shareLinks'),         free: '1',   pro: unlimited, premium: unlimited },
            { label: t('plans.compare.aiAssistant'),        free: false, pro: true,  premium: true  },
            { label: t('plans.compare.momoSync'),           free: false, pro: '2',   premium: unlimited },
            { label: t('plans.compare.smsAlerts'),          free: false, pro: true,  premium: true  },
            { label: t('plans.compare.automatedReports'),   free: false, pro: true,  premium: true  },
            { label: t('plans.compare.customAlerts'),       free: false, pro: true,  premium: true  },
            { label: t('plans.compare.brvmHistory'),        free: false, pro: true,  premium: true  },
            { label: t('plans.compare.advancedReports'),    free: false, pro: true,  premium: true  },
            { label: t('plans.compare.customCategories'),   free: false, pro: true,  premium: true  },
            { label: t('plans.compare.prioritySupport'),    free: false, pro: true,  premium: true  },
            { label: t('plans.compare.aiAdvisor'),          free: false, pro: false, premium: true  },
            { label: t('plans.compare.multiPortfolios'),    free: false, pro: false, premium: true  },
            { label: t('plans.compare.groupTontine'),       free: false, pro: false, premium: true  },
            { label: t('plans.compare.apiIntegrations'),    free: false, pro: false, premium: true  },
        ];
    });
}
