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
                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 mb-6">
                        <i class="pi pi-gift text-emerald-500"></i>
                        <span class="text-emerald-600 dark:text-emerald-400 text-sm font-medium">100% Gratuit</span>
                    </div>
                    <h2 class="text-4xl md:text-5xl font-bold text-surface-900 dark:text-surface-0 mb-4">
                        La liberté financière
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-cyan-500">sans frais cachés</span>
                    </h2>
                    <p class="text-xl text-surface-600 dark:text-surface-300 max-w-2xl mx-auto">
                        Afrin Nexus est gratuit et le restera. Notre mission est de démocratiser l'accès aux outils de gestion patrimoniale.
                    </p>
                </div>

                <!-- Single Plan Card - Featured -->
                <div class="max-w-lg mx-auto mb-16">
                    <div class="relative">
                        <div class="absolute -inset-1 bg-gradient-to-r from-indigo-600 via-cyan-500 to-emerald-500 rounded-3xl blur-lg opacity-50"></div>
                        <div class="relative bg-surface-0 dark:bg-surface-800 rounded-2xl p-8 border border-surface-200 dark:border-surface-700 shadow-xl">
                            <!-- Badge -->
                            <div class="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                <div class="px-4 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white text-sm font-semibold">
                                    Toujours gratuit
                                </div>
                            </div>

                            <div class="text-center pt-4">
                                <div class="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-100 to-cyan-100 dark:from-indigo-900/50 dark:to-cyan-900/50 flex items-center justify-center">
                                    <i class="pi pi-fire text-4xl text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-cyan-500"></i>
                                </div>
                                <h3 class="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-2">Afrin Nexus FIRE</h3>
                                <p class="text-surface-600 dark:text-surface-400 mb-6">Tout ce dont vous avez besoin pour atteindre l'indépendance financière</p>
                                
                                <div class="flex items-baseline justify-center gap-2 mb-8">
                                    <span class="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">€0</span>
                                    <span class="text-surface-500">/pour toujours</span>
                                </div>

                                <button pButton pRipple [rounded]="true" routerLink="/fr"
                                    class="w-full !text-lg !py-4 !bg-gradient-to-r !from-indigo-600 !to-cyan-500 !border-0 !font-semibold hover:!shadow-lg hover:!shadow-indigo-500/30 transition-all duration-300 mb-8">
                                    Commencer maintenant
                                    <i class="pi pi-arrow-right ml-2"></i>
                                </button>
                            </div>

                            <p-divider></p-divider>

                            <!-- Features List -->
                            <ul class="space-y-4 mt-8">
                                <li class="flex items-center gap-3">
                                    <div class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                                        <i class="pi pi-check text-emerald-600 dark:text-emerald-400 text-sm"></i>
                                    </div>
                                    <span class="text-surface-700 dark:text-surface-200">Dashboard complet avec KPIs FIRE</span>
                                </li>
                                <li class="flex items-center gap-3">
                                    <div class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                                        <i class="pi pi-check text-emerald-600 dark:text-emerald-400 text-sm"></i>
                                    </div>
                                    <span class="text-surface-700 dark:text-surface-200">Suivi illimité des transactions</span>
                                </li>
                                <li class="flex items-center gap-3">
                                    <div class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                                        <i class="pi pi-check text-emerald-600 dark:text-emerald-400 text-sm"></i>
                                    </div>
                                    <span class="text-surface-700 dark:text-surface-200">Gestion multi-actifs (immobilier, actions, crypto...)</span>
                                </li>
                                <li class="flex items-center gap-3">
                                    <div class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                                        <i class="pi pi-check text-emerald-600 dark:text-emerald-400 text-sm"></i>
                                    </div>
                                    <span class="text-surface-700 dark:text-surface-200">Objectifs d'épargne personnalisés</span>
                                </li>
                                <li class="flex items-center gap-3">
                                    <div class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                                        <i class="pi pi-check text-emerald-600 dark:text-emerald-400 text-sm"></i>
                                    </div>
                                    <span class="text-surface-700 dark:text-surface-200">Suivi des dettes et créances</span>
                                </li>
                                <li class="flex items-center gap-3">
                                    <div class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                                        <i class="pi pi-check text-emerald-600 dark:text-emerald-400 text-sm"></i>
                                    </div>
                                    <span class="text-surface-700 dark:text-surface-200">Graphiques et analyses avancées</span>
                                </li>
                                <li class="flex items-center gap-3">
                                    <div class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                                        <i class="pi pi-check text-emerald-600 dark:text-emerald-400 text-sm"></i>
                                    </div>
                                    <span class="text-surface-700 dark:text-surface-200">Mode sombre / clair</span>
                                </li>
                                <li class="flex items-center gap-3">
                                    <div class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                                        <i class="pi pi-check text-emerald-600 dark:text-emerald-400 text-sm"></i>
                                    </div>
                                    <span class="text-surface-700 dark:text-surface-200">100% confidentialité (données locales)</span>
                                </li>
                                <li class="flex items-center gap-3">
                                    <div class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                                        <i class="pi pi-check text-emerald-600 dark:text-emerald-400 text-sm"></i>
                                    </div>
                                    <span class="text-surface-700 dark:text-surface-200">Multilingue (FR/EN)</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- FAQ Section -->
                <div class="max-w-3xl mx-auto">
                    <h3 class="text-2xl font-bold text-surface-900 dark:text-surface-0 text-center mb-8">Questions fréquentes</h3>
                    
                    <div class="space-y-4">
                        <div class="bg-surface-50 dark:bg-surface-800 rounded-xl p-6 border border-surface-200 dark:border-surface-700">
                            <h4 class="font-semibold text-surface-900 dark:text-surface-0 mb-2 flex items-center gap-2">
                                <i class="pi pi-question-circle text-indigo-500"></i>
                                Pourquoi Afrin Nexus est-il gratuit ?
                            </h4>
                            <p class="text-surface-600 dark:text-surface-300">
                                Nous croyons que les outils de gestion financière devraient être accessibles à tous. Afrin Nexus est un projet open source, 
                                développé par la communauté FIRE pour la communauté FIRE.
                            </p>
                        </div>

                        <div class="bg-surface-50 dark:bg-surface-800 rounded-xl p-6 border border-surface-200 dark:border-surface-700">
                            <h4 class="font-semibold text-surface-900 dark:text-surface-0 mb-2 flex items-center gap-2">
                                <i class="pi pi-question-circle text-indigo-500"></i>
                                Mes données sont-elles en sécurité ?
                            </h4>
                            <p class="text-surface-600 dark:text-surface-300">
                                Vos données restent exclusivement sur votre appareil. Aucune information n'est envoyée à un serveur externe. 
                                Vous pouvez exporter et sauvegarder vos données à tout moment.
                            </p>
                        </div>

                        <div class="bg-surface-50 dark:bg-surface-800 rounded-xl p-6 border border-surface-200 dark:border-surface-700">
                            <h4 class="font-semibold text-surface-900 dark:text-surface-0 mb-2 flex items-center gap-2">
                                <i class="pi pi-question-circle text-indigo-500"></i>
                                Puis-je contribuer au projet ?
                            </h4>
                            <p class="text-surface-600 dark:text-surface-300">
                                Absolument ! Afrin Nexus est open source. Vous pouvez contribuer au code, signaler des bugs, proposer des fonctionnalités 
                                ou simplement partager l'application avec votre entourage.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class PricingWidget {}
