import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { I18nService } from '../../../i18n/i18n.service';

interface PlanFeature {
    label: string;
    free: boolean | string;
    pro: boolean | string;
    premium: boolean | string;
}

@Component({
    selector: 'app-settings-plans',
    standalone: true,
    imports: [CommonModule, ButtonModule, DividerModule],
    template: `
        <div class="flex flex-col gap-6">

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

            <!-- Billing cadence toggle -->
            <div class="flex items-center justify-center gap-3">
                <div class="inline-flex items-center gap-1 p-1 rounded-xl bg-surface-100 dark:bg-surface-800">
                    <button type="button"
                            (click)="billing.set('monthly')"
                            class="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
                            [ngClass]="billing() === 'monthly'
                                ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-0 shadow-sm'
                                : 'text-surface-500 dark:text-surface-400'">
                        {{ t('plans.monthly') }}
                    </button>
                    <button type="button"
                            (click)="billing.set('annual')"
                            class="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
                            [ngClass]="billing() === 'annual'
                                ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-0 shadow-sm'
                                : 'text-surface-500 dark:text-surface-400'">
                        {{ t('plans.annual') }}
                    </button>
                </div>
                <span class="px-2 py-1 rounded-md bg-positive/15 text-positive text-xs font-bold">
                    −33%
                </span>
            </div>

            <!-- Plan cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto w-full">

                <!-- Gratuit -->
                <div class="relative overflow-hidden rounded-2xl p-6 flex flex-col bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800">
                    <div class="relative mb-5">
                        <div class="w-10 h-10 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-3">
                            <i class="pi pi-chart-line text-surface-500 text-lg"></i>
                        </div>
                        <h3 class="font-bold text-lg text-surface-900 dark:text-surface-0">
                            {{ t('plans.free') }}
                        </h3>
                        <p class="text-xs text-surface-500 dark:text-surface-400 mt-1">
                            {{ t('plans.freeTagline') }}
                        </p>
                    </div>
                    <div class="relative flex items-baseline gap-1.5 mb-2">
                        <span class="text-3xl font-bold text-surface-900 dark:text-surface-0">{{ pricing().free.amount }}</span>
                        <span class="text-surface-500 text-sm">FCFA{{ pricing().free.period }}</span>
                    </div>
                    <p class="relative text-surface-400 text-xs mb-5">{{ pricing().free.sub }}</p>
                    <button pButton
                            [label]="t('plans.currentPlan')"
                            [outlined]="true" [disabled]="true"
                            class="relative w-full mb-6 !rounded-xl !py-2.5 !font-semibold"></button>
                    <ul class="relative space-y-3 flex-1">
                        @for (f of freeFeatures(); track f) {
                            <li class="flex items-center gap-2.5 text-sm text-surface-700 dark:text-surface-300">
                                <i class="pi pi-check text-xs text-positive shrink-0"></i>
                                {{ f }}
                            </li>
                        }
                    </ul>
                </div>

                <!-- Pro -->
                <div class="relative overflow-hidden rounded-2xl p-6 flex flex-col bg-surface-0 dark:bg-surface-900 border-2 border-ochre-500">
                    <div class="absolute top-3 right-3">
                        <span class="px-2.5 py-1 rounded-full bg-ochre-500 text-warm-900 text-[10px] font-bold tracking-wider uppercase whitespace-nowrap inline-flex items-center gap-1">
                            <i class="pi pi-star-fill text-[8px]"></i>
                            {{ t('plans.popular') }}
                        </span>
                    </div>
                    <div class="relative mb-5">
                        <div class="w-10 h-10 rounded-xl bg-ochre-500 flex items-center justify-center mb-3">
                            <i class="pi pi-crown text-warm-900 text-lg"></i>
                        </div>
                        <h3 class="font-bold text-lg text-surface-900 dark:text-surface-0">Pro</h3>
                        <p class="text-xs text-surface-500 dark:text-surface-400 mt-1">
                            {{ t('plans.proTagline') }}
                        </p>
                    </div>
                    <div class="relative flex items-baseline gap-1.5 mb-2">
                        <span class="text-3xl font-bold text-ochre-500 dark:text-ochre-400">{{ pricing().pro.amount }}</span>
                        <span class="text-surface-500 text-sm">FCFA{{ pricing().pro.period }}</span>
                    </div>
                    <p class="relative text-surface-400 text-xs mb-5">{{ pricing().pro.sub }}</p>
                    <button pButton
                            [label]="t('plans.comingSoon')"
                            [disabled]="true" icon="pi pi-clock"
                            class="relative w-full mb-6 !rounded-xl !py-2.5 !font-semibold !bg-ochre-500 hover:!bg-ochre-400 !border-0 !text-warm-900 opacity-60"></button>
                    <ul class="relative space-y-3 flex-1">
                        <li class="flex items-center gap-2.5 text-sm text-surface-700 dark:text-surface-300 font-medium">
                            <i class="pi pi-check text-xs text-ochre-500 shrink-0"></i>
                            {{ t('plans.everythingFree') }}
                        </li>
                        @for (f of proFeatures(); track f) {
                            <li class="flex items-center gap-2.5 text-sm text-surface-700 dark:text-surface-300">
                                <i class="pi pi-check text-xs text-ochre-500 shrink-0"></i>
                                {{ f }}
                            </li>
                        }
                    </ul>
                </div>

                <!-- Premium -->
                <div class="relative overflow-hidden rounded-2xl p-6 flex flex-col bg-surface-0 dark:bg-surface-900 border border-brand-300 dark:border-brand-500/40">
                    <div class="absolute top-3 right-3">
                        <span class="px-2.5 py-1 rounded-full bg-brand-700 text-white text-[10px] font-bold tracking-wider uppercase whitespace-nowrap inline-flex items-center gap-1">
                            <i class="pi pi-bolt text-[8px]"></i>
                            {{ t('plans.bestValue') }}
                        </span>
                    </div>
                    <div class="relative mb-5">
                        <div class="w-10 h-10 rounded-xl bg-brand-700 dark:bg-brand-300 flex items-center justify-center mb-3">
                            <i class="pi pi-bolt text-white dark:text-warm-900 text-lg"></i>
                        </div>
                        <h3 class="font-bold text-lg text-surface-900 dark:text-surface-0">Premium</h3>
                        <p class="text-xs text-surface-500 dark:text-surface-400 mt-1">
                            {{ t('plans.premiumTagline') }}
                        </p>
                    </div>
                    <div class="relative flex items-baseline gap-1.5 mb-2">
                        <span class="text-3xl font-bold text-brand-700 dark:text-brand-300">{{ pricing().premium.amount }}</span>
                        <span class="text-surface-500 text-sm">FCFA{{ pricing().premium.period }}</span>
                    </div>
                    <p class="relative text-surface-400 text-xs mb-5">{{ pricing().premium.sub }}</p>
                    <button pButton
                            [label]="t('plans.comingSoon')"
                            [disabled]="true" icon="pi pi-clock"
                            class="relative w-full mb-6 !rounded-xl !py-2.5 !font-semibold !bg-ochre-500 hover:!bg-ochre-400 !border-0 !text-warm-900 opacity-60"></button>
                    <ul class="relative space-y-3 flex-1">
                        <li class="flex items-center gap-2.5 text-sm text-surface-700 dark:text-surface-300 font-medium">
                            <i class="pi pi-check text-xs text-brand-700 dark:text-brand-300 shrink-0"></i>
                            {{ t('plans.everythingPro') }}
                        </li>
                        @for (f of premiumFeatures(); track f) {
                            <li class="flex items-center gap-2.5 text-sm text-surface-700 dark:text-surface-300">
                                <i class="pi pi-check text-xs text-brand-700 dark:text-brand-300 shrink-0"></i>
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
                                <tr class="border-b border-surface-100 dark:border-surface-700/50">
                                    <td class="px-5 py-3 text-surface-700 dark:text-surface-300">{{ row.label }}</td>
                                    <td class="text-center px-4 py-3">
                                        @if (row.free === true) {
                                            <i class="pi pi-check text-positive text-xs"></i>
                                        } @else if (row.free === false) {
                                            <span class="text-surface-400">, </span>
                                        } @else {
                                            <span class="text-surface-600 dark:text-surface-400 text-xs">{{ row.free }}</span>
                                        }
                                    </td>
                                    <td class="text-center px-4 py-3">
                                        @if (row.pro === true) {
                                            <i class="pi pi-check text-ochre-500 text-xs"></i>
                                        } @else if (row.pro === false) {
                                            <span class="text-surface-400">, </span>
                                        } @else {
                                            <span class="text-ochre-500 text-xs font-medium">{{ row.pro }}</span>
                                        }
                                    </td>
                                    <td class="text-center px-4 py-3">
                                        @if (row.premium === true) {
                                            <i class="pi pi-check text-brand-700 dark:text-brand-300 text-xs"></i>
                                        } @else if (row.premium === false) {
                                            <span class="text-surface-400">, </span>
                                        } @else {
                                            <span class="text-brand-700 dark:text-brand-300 text-xs font-medium">{{ row.premium }}</span>
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
        </div>
    `
})
export class PlansSettings {
    private i18n   = inject(I18nService);
    private router = inject(Router);

    t(key: string): string { return this.i18n.t(key); }

    billing = signal<'monthly' | 'annual'>('annual');

    pricing = computed(() => {
        const annual = this.billing() === 'annual';
        const t = (k: string) => this.i18n.t(k);
        const period = annual ? t('plans.perYear') : t('plans.perMonth');
        return {
            free: {
                amount: '0',
                period,
                sub: t('plans.freeForever'),
            },
            pro: {
                amount: annual ? '48 000' : '6 000',
                period,
                sub: annual ? t('plans.proAnnualSub') : t('plans.proMonthlySub'),
            },
            premium: {
                amount: annual ? '80 000' : '10 000',
                period,
                sub: annual ? t('plans.premiumAnnualSub') : t('plans.premiumMonthlySub'),
            },
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
            { label: t('plans.compare.assets'),             free: unlimited, pro: unlimited, premium: unlimited },
            { label: 'Transactions',                        free: unlimited, pro: unlimited, premium: unlimited },
            { label: t('plans.compare.savingsGoals'),       free: true,  pro: true,  premium: true  },
            { label: t('plans.compare.debts'),              free: true,  pro: true,  premium: true  },
            { label: t('plans.compare.charts'),             free: true,  pro: true,  premium: true  },
            { label: t('plans.compare.fireGoal'),           free: true,  pro: true,  premium: true  },
            { label: t('plans.compare.multiCurrency'),      free: true,  pro: true,  premium: true  },
            { label: 'Export CSV / PDF',                    free: false, pro: true,  premium: true  },
            { label: t('plans.compare.automatedReports'),   free: false, pro: true,  premium: true  },
            { label: t('plans.compare.customAlerts'),       free: false, pro: true,  premium: true  },
            { label: t('plans.compare.predictiveAnalysis'), free: false, pro: true,  premium: true  },
            { label: t('plans.compare.prioritySupport'),    free: false, pro: true,  premium: true  },
            { label: t('plans.compare.bankSync'),           free: false, pro: false, premium: true  },
            { label: t('plans.compare.dedicatedAdvisor'),   free: false, pro: false, premium: true  },
            { label: t('plans.compare.taxAnalysis'),        free: false, pro: false, premium: true  },
            { label: t('plans.compare.apiIntegrations'),    free: false, pro: false, premium: true  },
        ];
    });
}
