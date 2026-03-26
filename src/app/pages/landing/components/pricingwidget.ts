import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { RippleModule } from 'primeng/ripple';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'pricing-widget',
    standalone: true,
    imports: [DividerModule, ButtonModule, RippleModule, CommonModule, RouterModule],
    template: `
        <div id="pricing" class="py-20 px-6 lg:px-20 bg-surface-0 dark:bg-surface-900">
            <div class="max-w-7xl mx-auto">
                <!-- Section Header -->
                <div class="text-center mb-16">
                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/30 mb-6">
                        <i class="pi pi-tag text-indigo-500"></i>
                        <span class="text-indigo-600 dark:text-indigo-400 text-sm font-medium">Tarifs</span>
                    </div>
                    <h2 class="text-4xl md:text-5xl font-bold text-surface-900 dark:text-surface-0 mb-4">
                        Commencez gratuitement,
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">évoluez avec vos ambitions</span>
                    </h2>
                    <p class="text-xl text-surface-600 dark:text-surface-300 max-w-2xl mx-auto">
                        Un plan gratuit pour démarrer, des fonctionnalités premium pour aller plus loin. Aucune surprise.
                    </p>
                </div>

                <!-- Plans Grid -->
                <div class="grid grid-cols-12 gap-6 max-w-4xl mx-auto mb-16">

                    <!-- Free Plan -->
                    <div class="col-span-12 md:col-span-6">
                        <div class="h-full bg-surface-50 dark:bg-surface-800 rounded-2xl p-8 border border-surface-200 dark:border-surface-700">
                            <div class="mb-6">
                                <div class="w-12 h-12 rounded-xl bg-surface-200 dark:bg-surface-700 flex items-center justify-center mb-4">
                                    <i class="pi pi-chart-line text-surface-600 dark:text-surface-300 text-xl"></i>
                                </div>
                                <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 mb-1">Essentiel</h3>
                                <p class="text-surface-500 dark:text-surface-400 text-sm">Pour commencer à suivre votre patrimoine</p>
                            </div>

                            <div class="flex items-baseline gap-2 mb-6">
                                <span class="text-4xl font-bold text-surface-900 dark:text-surface-0">€0</span>
                                <span class="text-surface-500 dark:text-surface-400">/mois</span>
                            </div>

                            <button pButton pRipple [rounded]="true" [outlined]="true" routerLink="/fr/auth/register"
                                class="w-full !py-3 !font-semibold !border-surface-300 dark:!border-surface-600 !text-surface-700 dark:!text-surface-200 hover:!bg-surface-100 dark:hover:!bg-surface-700 transition-all duration-300 mb-8">
                                Commencer gratuitement
                            </button>

                            <p-divider></p-divider>

                            <ul class="space-y-3 mt-6">
                                <li *ngFor="let f of freeFeatures" class="flex items-center gap-3">
                                    <div class="w-5 h-5 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center flex-shrink-0">
                                        <i class="pi pi-check text-surface-600 dark:text-surface-300 text-xs"></i>
                                    </div>
                                    <span class="text-surface-700 dark:text-surface-300 text-sm">{{ f }}</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <!-- Pro Plan -->
                    <div class="col-span-12 md:col-span-6">
                        <div class="relative h-full">
                            <div class="absolute -inset-0.5 bg-gradient-to-r from-indigo-600 via-cyan-500 to-emerald-500 rounded-2xl blur opacity-60"></div>
                            <div class="relative h-full bg-surface-0 dark:bg-surface-800 rounded-2xl p-8 border border-surface-200 dark:border-surface-700 shadow-xl">
                                <!-- Badge -->
                                <div class="absolute -top-3.5 left-1/2 transform -translate-x-1/2">
                                    <div class="px-4 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white text-xs font-semibold whitespace-nowrap">
                                        Bientôt disponible
                                    </div>
                                </div>

                                <div class="mb-6 pt-2">
                                    <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
                                        <i class="pi pi-crown text-white text-xl"></i>
                                    </div>
                                    <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 mb-1">Pro</h3>
                                    <p class="text-surface-500 dark:text-surface-400 text-sm">Pour ceux qui veulent aller plus loin</p>
                                </div>

                                <div class="flex items-baseline gap-2 mb-6">
                                    <span class="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">€9</span>
                                    <span class="text-surface-500 dark:text-surface-400">/mois</span>
                                </div>

                                <button pButton pRipple [rounded]="true" disabled
                                    class="w-full !py-3 !font-semibold !bg-gradient-to-r !from-indigo-600 !to-cyan-500 !border-0 !text-white opacity-70 cursor-not-allowed mb-8">
                                    <i class="pi pi-clock mr-2"></i>
                                    En cours de développement
                                </button>

                                <p-divider></p-divider>

                                <ul class="space-y-3 mt-6">
                                    <li class="flex items-center gap-3">
                                        <div class="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                                            <i class="pi pi-check text-indigo-600 dark:text-indigo-400 text-xs"></i>
                                        </div>
                                        <span class="text-surface-700 dark:text-surface-300 text-sm font-medium">Tout le plan Essentiel, plus :</span>
                                    </li>
                                    <li *ngFor="let f of proFeatures" class="flex items-center gap-3">
                                        <div class="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                                            <i class="pi pi-check text-indigo-600 dark:text-indigo-400 text-xs"></i>
                                        </div>
                                        <span class="text-surface-700 dark:text-surface-300 text-sm">{{ f }}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Trust note -->
                <div class="max-w-2xl mx-auto text-center mb-16">
                    <p class="text-surface-500 dark:text-surface-400 text-sm">
                        <i class="pi pi-lock text-indigo-500 mr-1"></i>
                        Aucune carte bancaire requise pour le plan gratuit. Résiliez à tout moment.
                    </p>
                </div>

                <!-- FAQ Section -->
                <div class="max-w-3xl mx-auto">
                    <h3 class="text-2xl font-bold text-surface-900 dark:text-surface-0 text-center mb-8">Questions fréquentes</h3>

                    <div class="space-y-4">
                        <div class="bg-surface-50 dark:bg-surface-800 rounded-xl p-6 border border-surface-200 dark:border-surface-700">
                            <h4 class="font-semibold text-surface-900 dark:text-surface-0 mb-2 flex items-center gap-2">
                                <i class="pi pi-question-circle text-indigo-500"></i>
                                Le plan gratuit restera-t-il gratuit ?
                            </h4>
                            <p class="text-surface-600 dark:text-surface-300">
                                Oui. Le plan Essentiel restera gratuit. Notre modèle économique repose sur les abonnements Pro — les fonctionnalités de base ne seront jamais supprimées du plan gratuit.
                            </p>
                        </div>

                        <div class="bg-surface-50 dark:bg-surface-800 rounded-xl p-6 border border-surface-200 dark:border-surface-700">
                            <h4 class="font-semibold text-surface-900 dark:text-surface-0 mb-2 flex items-center gap-2">
                                <i class="pi pi-question-circle text-indigo-500"></i>
                                Mes données sont-elles en sécurité ?
                            </h4>
                            <p class="text-surface-600 dark:text-surface-300">
                                Vos données sont chiffrées en transit (SSL/TLS) et stockées de manière sécurisée. Nous ne partageons jamais vos informations financières avec des tiers ni avec des partenaires publicitaires.
                            </p>
                        </div>

                        <div class="bg-surface-50 dark:bg-surface-800 rounded-xl p-6 border border-surface-200 dark:border-surface-700">
                            <h4 class="font-semibold text-surface-900 dark:text-surface-0 mb-2 flex items-center gap-2">
                                <i class="pi pi-question-circle text-indigo-500"></i>
                                Pourquoi un plan Pro payant ?
                            </h4>
                            <p class="text-surface-600 dark:text-surface-300">
                                Afrin Nexus est développé en tant que produit durable. Les abonnements Pro nous permettent de financer le développement de nouvelles fonctionnalités, maintenir l'infrastructure et vous offrir un support prioritaire.
                            </p>
                        </div>

                        <div class="bg-surface-50 dark:bg-surface-800 rounded-xl p-6 border border-surface-200 dark:border-surface-700">
                            <h4 class="font-semibold text-surface-900 dark:text-surface-0 mb-2 flex items-center gap-2">
                                <i class="pi pi-question-circle text-indigo-500"></i>
                                Puis-je exporter mes données ?
                            </h4>
                            <p class="text-surface-600 dark:text-surface-300">
                                L'export complet (CSV, PDF) sera disponible avec le plan Pro. Le plan gratuit vous permet de consulter et saisir toutes vos données sans limitation de durée.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class PricingWidget {
    freeFeatures = [
        'Dashboard & KPIs FIRE',
        'Suivi du patrimoine (actifs illimités)',
        'Transactions et budget',
        'Objectifs d\'épargne',
        'Gestion des dettes',
        'Graphiques et analyses',
        'Authentification sécurisée (Google)',
        'Multilingue (FR/EN)',
    ];

    proFeatures = [
        'Rapports hebdomadaires automatiques',
        'Export CSV & PDF',
        'Alertes et notifications personnalisées',
        'Analyse prédictive des dépenses',
        'Catégories personnalisées illimitées',
        'Support prioritaire',
        'Accès anticipé aux nouvelles fonctionnalités',
    ];
}
