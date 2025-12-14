import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'features-widget',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div id="features" class="py-20 px-6 lg:px-20 bg-surface-0 dark:bg-surface-900">
            <div class="max-w-7xl mx-auto">
                <!-- Section Header -->
                <div class="text-center mb-16">
                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/30 mb-6">
                        <i class="pi pi-sparkles text-indigo-500"></i>
                        <span class="text-indigo-600 dark:text-indigo-400 text-sm font-medium">Fonctionnalités</span>
                    </div>
                    <h2 class="text-4xl md:text-5xl font-bold text-surface-900 dark:text-surface-0 mb-4">
                        Tout pour atteindre la
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">liberté financière</span>
                    </h2>
                    <p class="text-xl text-surface-600 dark:text-surface-300 max-w-2xl mx-auto">
                        Des outils puissants pour suivre, analyser et optimiser votre parcours vers l'indépendance financière
                    </p>
                </div>

                <!-- Features Grid -->
                <div class="grid grid-cols-12 gap-6">
                    <!-- Feature 1 - Large -->
                    <div class="col-span-12 lg:col-span-8">
                        <div class="group h-full p-8 rounded-2xl bg-gradient-to-br from-indigo-50 to-cyan-50 dark:from-indigo-950/50 dark:to-cyan-950/50 border border-indigo-100 dark:border-indigo-900/50 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-500">
                            <div class="flex flex-col md:flex-row gap-8 items-start">
                                <div class="flex-1">
                                    <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <i class="pi pi-chart-line text-white text-2xl"></i>
                                    </div>
                                    <h3 class="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-3">Suivi du Patrimoine</h3>
                                    <p class="text-surface-600 dark:text-surface-300 text-lg leading-relaxed mb-6">
                                        Visualisez l'évolution de votre patrimoine total en temps réel. Immobilier, crypto, actions, comptes bancaires - tout est centralisé pour une vue d'ensemble claire.
                                    </p>
                                    <div class="flex flex-wrap gap-3">
                                        <span class="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm">Net Worth</span>
                                        <span class="px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 text-sm">Multi-actifs</span>
                                        <span class="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-sm">Graphiques</span>
                                    </div>
                                </div>
                                <div class="hidden md:block w-48 h-48 rounded-xl bg-gradient-to-br from-indigo-200 to-cyan-200 dark:from-indigo-800 dark:to-cyan-800 p-4">
                                    <svg viewBox="0 0 100 100" class="w-full h-full">
                                        <path d="M10 80 Q 30 60 50 50 T 90 20" stroke="currentColor" stroke-width="3" fill="none" class="text-indigo-600 dark:text-indigo-400"/>
                                        <circle cx="90" cy="20" r="4" fill="currentColor" class="text-cyan-500"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Feature 2 - Small -->
                    <div class="col-span-12 md:col-span-6 lg:col-span-4">
                        <div class="group h-full p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border border-emerald-100 dark:border-emerald-900/50 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-500">
                            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                                <i class="pi pi-wallet text-white text-xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 mb-2">Épargne Intelligente</h3>
                            <p class="text-surface-600 dark:text-surface-300">
                                Définissez des objectifs d'épargne, suivez votre progression et célébrez chaque milestone vers votre liberté.
                            </p>
                        </div>
                    </div>

                    <!-- Feature 3 - Small -->
                    <div class="col-span-12 md:col-span-6 lg:col-span-4">
                        <div class="group h-full p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 border border-amber-100 dark:border-amber-900/50 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-500">
                            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-600 to-amber-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                                <i class="pi pi-receipt text-white text-xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 mb-2">Transactions</h3>
                            <p class="text-surface-600 dark:text-surface-300">
                                Catégorisez automatiquement vos revenus et dépenses. Identifiez les fuites et optimisez votre budget.
                            </p>
                        </div>
                    </div>

                    <!-- Feature 4 - Small -->
                    <div class="col-span-12 md:col-span-6 lg:col-span-4">
                        <div class="group h-full p-6 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/50 dark:to-pink-950/50 border border-rose-100 dark:border-rose-900/50 hover:shadow-xl hover:shadow-rose-500/10 transition-all duration-500">
                            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-600 to-rose-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                                <i class="pi pi-credit-card text-white text-xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 mb-2">Gestion des Dettes</h3>
                            <p class="text-surface-600 dark:text-surface-300">
                                Visualisez vos dettes, créances et leur progression. Stratégies avalanche ou boule de neige intégrées.
                            </p>
                        </div>
                    </div>

                    <!-- Feature 5 - Small -->
                    <div class="col-span-12 md:col-span-6 lg:col-span-4">
                        <div class="group h-full p-6 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/50 border border-violet-100 dark:border-violet-900/50 hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-500">
                            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-violet-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                                <i class="pi pi-chart-pie text-white text-xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 mb-2">Répartition des Actifs</h3>
                            <p class="text-surface-600 dark:text-surface-300">
                                Analysez la diversification de votre portefeuille. Rééquilibrez pour optimiser risque et rendement.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Testimonial Section -->
                <div class="mt-20 relative">
                    <div class="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-cyan-600/10 to-emerald-600/10 rounded-3xl blur-xl"></div>
                    <div class="relative p-8 md:p-12 rounded-3xl bg-surface-0 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-xl">
                        <div class="flex flex-col md:flex-row items-center gap-8">
                            <div class="flex-shrink-0">
                                <div class="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold">
                                    <i class="pi pi-fire text-4xl"></i>
                                </div>
                            </div>
                            <div class="flex-1 text-center md:text-left">
                                <blockquote class="text-2xl md:text-3xl text-surface-700 dark:text-surface-200 font-light leading-relaxed mb-6">
                                    "L'indépendance financière n'est pas un rêve, c'est un <span class="text-indigo-600 dark:text-indigo-400 font-medium">plan</span>. 
                                    Finova transforme ce plan en <span class="text-cyan-600 dark:text-cyan-400 font-medium">réalité mesurable</span>."
                                </blockquote>
                                <div class="flex items-center justify-center md:justify-start gap-4">
                                    <div>
                                        <div class="font-semibold text-surface-900 dark:text-surface-0">La philosophie FIRE</div>
                                        <div class="text-surface-500 dark:text-surface-400">Financial Independence, Retire Early</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class FeaturesWidget {}
