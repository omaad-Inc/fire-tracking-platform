import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService } from '../../../i18n/i18n.service';

interface PlanFeature {
    label: string;
    free: boolean | string;
    pro: boolean | string;
}

@Component({
    selector: 'app-settings-plans',
    standalone: true,
    imports: [CommonModule, ButtonModule],
    template: `
        <div class="flex flex-col gap-5">

            <!-- Header -->
            <div class="text-center mb-2">
                <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ochre-100 border border-ochre-300/60 mb-4">
                    <i class="pi pi-crown text-ochre-500 text-xs"></i>
                    <span class="text-ochre-600 dark:text-ochre-300 text-sm font-semibold">Omaad Pro</span>
                </div>
                <h1 class="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-0 mb-2">
                    {{ isFr() ? 'Choisissez votre plan' : 'Choose your plan' }}
                </h1>
                <p class="text-surface-500 dark:text-surface-400 text-sm max-w-md mx-auto">
                    {{ isFr()
                        ? 'Le plan Essentiel est gratuit pour toujours. Le plan Pro vous donne des super-pouvoirs.'
                        : 'The Essential plan is free forever. The Pro plan gives you superpowers.' }}
                </p>
            </div>

            <!-- Plan cards side by side -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto w-full">

                <!-- Essentiel (free) -->
                <div class="card !p-6 flex flex-col border-2 border-surface-200 dark:border-surface-700">
                    <div class="mb-5">
                        <div class="w-10 h-10 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-3">
                            <i class="pi pi-chart-line text-surface-500 text-lg"></i>
                        </div>
                        <h3 class="font-bold text-lg text-surface-900 dark:text-surface-0">Essentiel</h3>
                        <p class="text-xs text-surface-500 dark:text-surface-400 mt-1">
                            {{ isFr() ? 'Tout pour commencer' : 'Everything to start' }}
                        </p>
                    </div>
                    <div class="flex items-baseline gap-1.5 mb-5">
                        <span class="text-3xl font-bold text-surface-900 dark:text-surface-0">0</span>
                        <span class="text-surface-500 text-sm">{{ isFr() ? '/ mois' : '/ month' }}</span>
                    </div>
                    <button pButton
                            [label]="isFr() ? 'Plan actuel' : 'Current plan'"
                            [outlined]="true" [disabled]="true"
                            class="w-full mb-6 !rounded-xl !py-2.5 !font-semibold"></button>
                    <ul class="space-y-3 flex-1">
                        @for (f of freeFeatures(); track f) {
                            <li class="flex items-center gap-2.5 text-sm text-surface-700 dark:text-surface-300">
                                <i class="pi pi-check text-xs text-positive shrink-0"></i>
                                {{ f }}
                            </li>
                        }
                    </ul>
                </div>

                <!-- Pro -->
                <div class="relative card !p-6 flex flex-col border-2 border-ochre-400 dark:border-ochre-500/40 shadow-lg shadow-card">
                    <!-- Badge -->
                    <div class="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span class="px-3 py-1 rounded-full bg-gradient-to-r from-ochre-500 to-ochre-600 text-white text-[10px] font-bold tracking-wider uppercase whitespace-nowrap">
                            {{ isFr() ? 'Bientôt disponible' : 'Coming soon' }}
                        </span>
                    </div>
                    <div class="mb-5 pt-1">
                        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-ochre-500 to-ochre-600 flex items-center justify-center mb-3 shadow-lg shadow-card">
                            <i class="pi pi-crown text-white text-lg"></i>
                        </div>
                        <h3 class="font-bold text-lg text-surface-900 dark:text-surface-0">Pro</h3>
                        <p class="text-xs text-surface-500 dark:text-surface-400 mt-1">
                            {{ isFr() ? 'Pour ceux qui veulent régner' : 'For those who want to reign' }}
                        </p>
                    </div>
                    <div class="flex items-baseline gap-1.5 mb-5">
                        <span class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-ochre-500 to-ochre-600">9€</span>
                        <span class="text-surface-500 text-sm">{{ isFr() ? '/ mois' : '/ month' }}</span>
                    </div>
                    <button pButton
                            [label]="isFr() ? 'Bientôt disponible' : 'Coming soon'"
                            [disabled]="true" icon="pi pi-clock"
                            class="w-full mb-6 !rounded-xl !py-2.5 !font-semibold omaad-accent !text-white opacity-60"></button>
                    <ul class="space-y-3 flex-1">
                        <li class="flex items-center gap-2.5 text-sm text-surface-700 dark:text-surface-300 font-medium">
                            <i class="pi pi-check text-xs text-ochre-500 shrink-0"></i>
                            {{ isFr() ? 'Tout le plan Essentiel, plus :' : 'Everything in Essential, plus:' }}
                        </li>
                        @for (f of proFeatures(); track f) {
                            <li class="flex items-center gap-2.5 text-sm text-surface-700 dark:text-surface-300">
                                <i class="pi pi-check text-xs text-ochre-500 shrink-0"></i>
                                {{ f }}
                            </li>
                        }
                    </ul>
                </div>
            </div>

            <!-- Feature comparison table -->
            <div class="card !p-0 overflow-hidden max-w-2xl mx-auto w-full">
                <div class="px-5 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                    <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0 m-0">
                        {{ isFr() ? 'Comparaison détaillée' : 'Detailed comparison' }}
                    </h2>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b border-surface-200 dark:border-surface-700">
                                <th class="text-left px-5 py-3 text-surface-500 font-medium">{{ isFr() ? 'Fonctionnalité' : 'Feature' }}</th>
                                <th class="text-center px-4 py-3 text-surface-500 font-medium w-24">Essentiel</th>
                                <th class="text-center px-4 py-3 font-medium w-24">
                                    <span class="text-ochre-500">Pro</span>
                                </th>
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
                                            <span class="text-surface-400">—</span>
                                        } @else {
                                            <span class="text-surface-600 dark:text-surface-400 text-xs">{{ row.free }}</span>
                                        }
                                    </td>
                                    <td class="text-center px-4 py-3">
                                        @if (row.pro === true) {
                                            <i class="pi pi-check text-ochre-500 text-xs"></i>
                                        } @else if (row.pro === false) {
                                            <span class="text-surface-400">—</span>
                                        } @else {
                                            <span class="text-ochre-500 text-xs font-medium">{{ row.pro }}</span>
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
                    <i class="pi pi-lock text-brand-700 dark:text-brand-300"></i>
                    {{ isFr()
                        ? 'Zéro carte bancaire requise. Le plan Essentiel reste gratuit pour toujours.'
                        : 'No credit card required. The Essential plan stays free forever.' }}
                </p>
            </div>
        </div>
    `
})
export class PlansSettings {
    private i18n   = inject(I18nService);
    private router = inject(Router);

    readonly isFr = computed(() => this.i18n.lang() === 'fr');

    freeFeatures = computed(() => this.isFr() ? [
        'Dashboard & indicateurs clés',
        'Patrimoine complet (actifs illimités)',
        'Suivi des revenus et dépenses',
        'Objectifs d\'épargne',
        'Gestion dettes & créances',
        'Graphiques et analyses',
        'Connexion sécurisée (Google)',
        'Français & English',
    ] : [
        'Dashboard & key metrics',
        'Full wealth tracking (unlimited assets)',
        'Income & expense tracking',
        'Savings goals',
        'Debt & receivable management',
        'Charts and analytics',
        'Secure login (Google)',
        'French & English',
    ]);

    proFeatures = computed(() => this.isFr() ? [
        'Rapports automatiques hebdomadaires',
        'Export CSV & PDF',
        'Alertes personnalisées',
        'Analyse prédictive des dépenses',
        'Catégories personnalisées',
        'Support prioritaire',
        'Accès anticipé aux nouveautés',
    ] : [
        'Automated weekly reports',
        'CSV & PDF export',
        'Custom alerts',
        'Predictive expense analysis',
        'Custom categories',
        'Priority support',
        'Early access to new features',
    ]);

    comparisonTable = computed((): PlanFeature[] => {
        const f = this.isFr();
        return [
            { label: f ? 'Actifs'                    : 'Assets',                   free: f ? 'Illimité' : 'Unlimited', pro: f ? 'Illimité' : 'Unlimited' },
            { label: 'Transactions',                                                free: f ? 'Illimité' : 'Unlimited', pro: f ? 'Illimité' : 'Unlimited' },
            { label: f ? 'Objectifs d\'épargne'      : 'Savings goals',            free: true,  pro: true  },
            { label: f ? 'Dettes & créances'         : 'Debts & receivables',      free: true,  pro: true  },
            { label: f ? 'Graphiques & analyses'     : 'Charts & analytics',       free: true,  pro: true  },
            { label: f ? 'Objectif FIRE'             : 'FIRE goal',                free: true,  pro: true  },
            { label: f ? 'Multi-devises'             : 'Multi-currency',           free: true,  pro: true  },
            { label: 'Export CSV / PDF',                                            free: false, pro: true  },
            { label: f ? 'Rapports automatiques'     : 'Automated reports',        free: false, pro: true  },
            { label: f ? 'Alertes personnalisées'    : 'Custom alerts',            free: false, pro: true  },
            { label: f ? 'Analyse prédictive'        : 'Predictive analysis',      free: false, pro: true  },
            { label: f ? 'Support prioritaire'       : 'Priority support',         free: false, pro: true  },
        ];
    });
}
