import { Component, inject, computed } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { RippleModule } from 'primeng/ripple';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { I18nService } from '../../../i18n/i18n.service';

@Component({
    selector: 'pricing-widget',
    standalone: true,
    imports: [DividerModule, ButtonModule, RippleModule, CommonModule, RouterModule],
    template: `
        <div id="pricing" class="py-20 px-6 lg:px-20 bg-surface-0 dark:bg-surface-900">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-16">
                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-700/10 dark:bg-ochre-400/15 border border-brand-200 dark:border-ochre-700/40 mb-6">
                        <i class="pi pi-tag text-brand-700 dark:text-ochre-400"></i>
                        <span class="text-brand-700 dark:text-ochre-400 text-sm font-medium">{{ t('landing.pricing.badge') }}</span>
                    </div>
                    <h2 class="text-4xl md:text-5xl font-bold text-surface-900 dark:text-surface-0 mb-4">
                        {{ t('landing.pricing.h2a') }}
                        <span class="text-brand-700 dark:text-ochre-400">{{ t('landing.pricing.h2b') }}</span>
                    </h2>
                    <p class="text-xl text-surface-600 dark:text-surface-300 max-w-2xl mx-auto">{{ t('landing.pricing.description') }}</p>
                </div>

                <div class="grid grid-cols-12 gap-6 max-w-6xl mx-auto mb-16">
                    <!-- Free Plan -->
                    <div class="col-span-12 md:col-span-4">
                        <div class="h-full bg-surface-50 dark:bg-surface-800 rounded-2xl p-8 border border-surface-200 dark:border-surface-700">
                            <div class="mb-6">
                                <div class="w-12 h-12 rounded-xl bg-surface-200 dark:bg-surface-700 flex items-center justify-center mb-4">
                                    <i class="pi pi-chart-line text-surface-600 dark:text-surface-300 text-xl"></i>
                                </div>
                                <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 mb-1">{{ t('landing.pricing.freeName') }}</h3>
                                <p class="text-surface-500 dark:text-surface-400 text-sm">{{ t('landing.pricing.freeTagline') }}</p>
                            </div>
                            <div class="flex items-baseline gap-2 mb-2">
                                <span class="text-4xl font-bold text-surface-900 dark:text-surface-0">0</span>
                            </div>
                            <p class="text-surface-500 dark:text-surface-400 text-sm mb-6">{{ t('landing.pricing.freeForever') }}</p>
                            <button pButton pRipple [rounded]="true" [outlined]="true" [routerLink]="[currentLang, 'auth', 'register']"
                                class="w-full !py-3 !font-semibold !border-surface-300 dark:!border-surface-500 !text-surface-700 dark:!text-surface-100 hover:!bg-surface-100 dark:hover:!bg-surface-700 transition-all mb-8">
                                {{ t('landing.pricing.freeCta') }}
                            </button>
                            <p-divider />
                            <ul class="space-y-3 mt-6">
                                @for (f of freeFeatures(); track f) {
                                    <li class="flex items-center gap-3">
                                        <div class="w-5 h-5 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center flex-shrink-0">
                                            <i class="pi pi-check text-surface-600 dark:text-surface-300 text-xs"></i>
                                        </div>
                                        <span class="text-surface-700 dark:text-surface-300 text-sm">{{ f }}</span>
                                    </li>
                                }
                            </ul>
                        </div>
                    </div>

                    <!-- Pro Plan (Popular) -->
                    <div class="col-span-12 md:col-span-4">
                        <div class="relative h-full">
                            <div class="absolute -inset-4 bg-ochre-500/10 blur-2xl rounded-2xl"></div>
                            <div class="relative h-full bg-surface-0 dark:bg-surface-800 rounded-2xl p-8 border-2 border-ochre-500 shadow-sm">
                                <!-- "Populaire" badge removed until it's true (no paid users pre-launch), P0-7 -->
                                <div class="mb-6 pt-2">
                                    <div class="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center mb-4">
                                        <i class="pi pi-crown text-brand-700 dark:text-ochre-400 text-xl"></i>
                                    </div>
                                    <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 mb-1">{{ t('landing.pricing.proName') }}</h3>
                                    <p class="text-surface-500 dark:text-surface-400 text-sm">{{ t('landing.pricing.proTagline') }}</p>
                                </div>
                                <div class="flex items-baseline gap-1 mb-2">
                                    <span class="text-4xl font-bold text-ochre-500 dark:text-ochre-400">6 000</span>
                                    <span class="text-surface-500 dark:text-surface-400 text-sm">FCFA/{{ t('landing.pricing.month') }}</span>
                                </div>
                                <p class="text-surface-500 dark:text-surface-400 text-sm mb-6">{{ t('landing.pricing.proSubprice') }}</p>
                                <button pButton pRipple [rounded]="true" [disabled]="true"
                                    class="w-full !py-3 !font-semibold !bg-ochre-500/40 !border-0 !text-warm-900 !cursor-not-allowed mb-8">
                                    {{ t('landing.pricing.comingSoonCta') }}
                                </button>
                                <p-divider />
                                <ul class="space-y-3 mt-6">
                                    <li class="flex items-center gap-3">
                                        <div class="w-5 h-5 rounded-full bg-ochre-100 dark:bg-ochre-700/30 flex items-center justify-center flex-shrink-0">
                                            <i class="pi pi-check text-ochre-600 dark:text-ochre-400 text-xs"></i>
                                        </div>
                                        <span class="text-surface-700 dark:text-surface-300 text-sm font-medium">{{ t('landing.pricing.proIncludes') }}</span>
                                    </li>
                                    @for (f of proFeatures(); track f) {
                                        <li class="flex items-center gap-3">
                                            <div class="w-5 h-5 rounded-full bg-ochre-100 dark:bg-ochre-700/30 flex items-center justify-center flex-shrink-0">
                                                <i class="pi pi-check text-ochre-600 dark:text-ochre-400 text-xs"></i>
                                            </div>
                                            <span class="text-surface-700 dark:text-surface-300 text-sm">{{ f }}</span>
                                        </li>
                                    }
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Premium Plan -->
                    <div class="col-span-12 md:col-span-4">
                        <div class="h-full bg-surface-50 dark:bg-surface-800 rounded-2xl p-8 border border-surface-200 dark:border-surface-700">
                            <div class="mb-6">
                                <div class="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center mb-4">
                                    <i class="pi pi-bolt text-brand-700 dark:text-ochre-400 text-xl"></i>
                                </div>
                                <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 mb-1">{{ t('landing.pricing.premiumName') }}</h3>
                                <p class="text-surface-500 dark:text-surface-400 text-sm">{{ t('landing.pricing.premiumTagline') }}</p>
                            </div>
                            <div class="flex items-baseline gap-1 mb-2">
                                <span class="text-4xl font-bold text-surface-900 dark:text-surface-0">10 000</span>
                                <span class="text-surface-500 dark:text-surface-400 text-sm">FCFA/{{ t('landing.pricing.month') }}</span>
                            </div>
                            <p class="text-surface-500 dark:text-surface-400 text-sm mb-6">{{ t('landing.pricing.premiumSubprice') }}</p>
                            <button pButton pRipple [rounded]="true" [outlined]="true" [disabled]="true"
                                class="w-full !py-3 !font-semibold !border-surface-300 dark:!border-surface-500 !text-surface-500 dark:!text-surface-400 !cursor-not-allowed mb-8">
                                {{ t('landing.pricing.comingSoonCta') }}
                            </button>
                            <p-divider />
                            <ul class="space-y-3 mt-6">
                                <li class="flex items-center gap-3">
                                    <div class="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-700/30 flex items-center justify-center flex-shrink-0">
                                        <i class="pi pi-check text-brand-700 dark:text-brand-300 text-xs"></i>
                                    </div>
                                    <span class="text-surface-700 dark:text-surface-300 text-sm font-medium">{{ t('landing.pricing.premiumIncludes') }}</span>
                                </li>
                                @for (f of premiumFeatures(); track f) {
                                    <li class="flex items-center gap-3">
                                        <div class="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-700/30 flex items-center justify-center flex-shrink-0">
                                            <i class="pi pi-check text-brand-700 dark:text-brand-300 text-xs"></i>
                                        </div>
                                        <span class="text-surface-700 dark:text-surface-300 text-sm">{{ f }}</span>
                                    </li>
                                }
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="max-w-2xl mx-auto text-center mb-16">
                    <p class="text-surface-500 dark:text-surface-400 text-sm">
                        <i class="pi pi-lock text-brand-700 dark:text-ochre-400 mr-1"></i>{{ t('landing.pricing.trustNote') }}
                    </p>
                </div>

                <!-- FAQ -->
                <div class="max-w-3xl mx-auto">
                    <h3 class="text-2xl font-bold text-surface-900 dark:text-surface-0 text-center mb-8">{{ t('landing.pricing.faqTitle') }}</h3>
                    <div class="space-y-4">
                        @for (q of faqItems(); track q.q) {
                            <div class="bg-surface-50 dark:bg-surface-800 rounded-xl p-6 border border-surface-200 dark:border-surface-700">
                                <h4 class="font-semibold text-surface-900 dark:text-surface-0 mb-2 flex items-center gap-2">
                                    <i class="pi pi-question-circle text-brand-700 dark:text-ochre-400"></i>{{ q.q }}
                                </h4>
                                <p class="text-surface-600 dark:text-surface-300">{{ q.a }}</p>
                            </div>
                        }
                    </div>
                </div>
            </div>
        </div>
    `
})
export class PricingWidget {
    private i18n   = inject(I18nService);
    private router = inject(Router);

    get currentLang(): string {
        const m = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        return '/' + (m ? m[1] : 'fr');
    }

    t(key: string): string { return this.i18n.t(key); }

    freeFeatures() {
        return ['freeF1','freeF2','freeF3','freeF4','freeF5','freeF6','freeF7','freeF8']
            .map(k => this.t('landing.pricing.' + k));
    }

    proFeatures() {
        return ['proF1','proF2','proF3','proF4','proF5','proF6','proF7']
            .map(k => this.t('landing.pricing.' + k));
    }

    premiumFeatures() {
        return ['premiumF1','premiumF2','premiumF3','premiumF4','premiumF5','premiumF6','premiumF7']
            .map(k => this.t('landing.pricing.' + k));
    }

    faqItems() {
        return [1,2,3,4].map(i => ({
            q: this.t(`landing.pricing.faq${i}Q`),
            a: this.t(`landing.pricing.faq${i}A`),
        }));
    }
}
