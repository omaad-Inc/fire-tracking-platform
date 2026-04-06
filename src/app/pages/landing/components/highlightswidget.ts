import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'highlights-widget',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div id="highlights" class="py-20 px-6 lg:px-20 bg-gradient-to-b from-surface-0 via-indigo-50/30 to-surface-0 dark:from-surface-900 dark:via-indigo-950/30 dark:to-surface-900">
            <div class="max-w-7xl mx-auto">
                <!-- Section Header -->
                <div class="text-center mb-16">
                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/30 mb-6">
                        <i class="pi pi-bolt text-cyan-500"></i>
                        <span class="text-cyan-600 dark:text-cyan-400 text-sm font-medium">Objectif Financier</span>
            </div>
                    <h2 class="text-4xl md:text-5xl font-bold text-surface-900 dark:text-surface-0 mb-4">
                        Votre chemin vers
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-emerald-500">l'indépendance</span>
                    </h2>
                    <p class="text-xl text-surface-600 dark:text-surface-300 max-w-2xl mx-auto">
                        Une approche consciente et méthodique pour construire votre patrimoine sur le long terme
                    </p>
                </div>

                <!-- Highlight 1 - Left image -->
                <div class="grid grid-cols-12 gap-8 items-center mb-20">
                    <div class="col-span-12 lg:col-span-6 order-2 lg:order-1">
                        <div class="relative">
                            <div class="absolute -inset-4 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 rounded-3xl blur-2xl"></div>
                            <div class="relative bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-700/50">
                                <!-- FIRE Progress visualization -->
                                <div class="mb-6">
                                    <div class="flex items-center justify-between mb-3">
                                        <span class="text-slate-300 font-medium">Progression vers l'objectif financier</span>
                                        <span class="text-emerald-400 font-bold">43%</span>
                                    </div>
                                    <div class="h-4 bg-slate-800 rounded-full overflow-hidden">
                                        <div class="h-full bg-gradient-to-r from-indigo-600 via-cyan-500 to-emerald-500 rounded-full transition-all duration-1000" style="width: 43%"></div>
                                    </div>
                                </div>
                                
                                <!-- Stats grid -->
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="bg-slate-800/50 rounded-xl p-4">
                                        <div class="flex items-center gap-2 mb-2">
                                            <i class="pi pi-flag text-indigo-400"></i>
                                            <span class="text-slate-400 text-sm">Objectif Financier</span>
                                        </div>
                                        <div class="text-white font-bold text-xl">€300,000</div>
                                    </div>
                                    <div class="bg-slate-800/50 rounded-xl p-4">
                                        <div class="flex items-center gap-2 mb-2">
                                            <i class="pi pi-wallet text-cyan-400"></i>
                                            <span class="text-slate-400 text-sm">Patrimoine actuel</span>
                                        </div>
                                        <div class="text-white font-bold text-xl">€130,481</div>
                                    </div>
                                    <div class="bg-slate-800/50 rounded-xl p-4">
                                        <div class="flex items-center gap-2 mb-2">
                                            <i class="pi pi-clock text-emerald-400"></i>
                                            <span class="text-slate-400 text-sm">Temps restant</span>
                                        </div>
                                        <div class="text-white font-bold text-xl">12 ans</div>
                                    </div>
                                    <div class="bg-slate-800/50 rounded-xl p-4">
                                        <div class="flex items-center gap-2 mb-2">
                                            <i class="pi pi-percentage text-amber-400"></i>
                                            <span class="text-slate-400 text-sm">Taux retrait</span>
                                        </div>
                                        <div class="text-white font-bold text-xl">4%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-span-12 lg:col-span-6 order-1 lg:order-2 text-center lg:text-left">
                        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center mb-6 mx-auto lg:mx-0">
                            <i class="pi pi-compass text-white text-3xl"></i>
                        </div>
                        <h3 class="text-3xl font-bold text-surface-900 dark:text-surface-0 mb-4">
                            Calculez votre objectif financier
                        </h3>
                        <p class="text-lg text-surface-600 dark:text-surface-300 leading-relaxed mb-6">
                            Définissez votre objectif d'indépendance financière basé sur vos dépenses annuelles et la règle des 4%. 
                            Afrin Nexus calcule automatiquement le capital nécessaire et le temps qu'il vous reste pour l'atteindre.
                        </p>
                        <ul class="space-y-3">
                            <li class="flex items-center gap-3 text-surface-700 dark:text-surface-200">
                                <div class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                                    <i class="pi pi-check text-emerald-600 dark:text-emerald-400 text-sm"></i>
                                </div>
                                <span>Règle des 4% (Safe Withdrawal Rate)</span>
                            </li>
                            <li class="flex items-center gap-3 text-surface-700 dark:text-surface-200">
                                <div class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                                    <i class="pi pi-check text-emerald-600 dark:text-emerald-400 text-sm"></i>
                                </div>
                                <span>Projection selon votre taux d'épargne</span>
                            </li>
                            <li class="flex items-center gap-3 text-surface-700 dark:text-surface-200">
                                <div class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                                    <i class="pi pi-check text-emerald-600 dark:text-emerald-400 text-sm"></i>
                                </div>
                                <span>Scénarios optimiste, réaliste, pessimiste</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <!-- Highlight 2 - Right image -->
                <div class="grid grid-cols-12 gap-8 items-center mb-20">
                    <div class="col-span-12 lg:col-span-6 text-center lg:text-left">
                        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-600 to-cyan-500 flex items-center justify-center mb-6 mx-auto lg:mx-0">
                            <i class="pi pi-chart-bar text-white text-3xl"></i>
                        </div>
                        <h3 class="text-3xl font-bold text-surface-900 dark:text-surface-0 mb-4">
                            Visualisez votre progression
                        </h3>
                        <p class="text-lg text-surface-600 dark:text-surface-300 leading-relaxed mb-6">
                            Des graphiques clairs et des indicateurs visuels pour suivre l'évolution de votre patrimoine mois après mois. 
                            Chaque euro économisé vous rapproche de votre liberté financière.
                        </p>
                        <ul class="space-y-3">
                            <li class="flex items-center gap-3 text-surface-700 dark:text-surface-200">
                                <div class="w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center">
                                    <i class="pi pi-check text-cyan-600 dark:text-cyan-400 text-sm"></i>
                                </div>
                                <span>Évolution mensuelle du patrimoine</span>
                            </li>
                            <li class="flex items-center gap-3 text-surface-700 dark:text-surface-200">
                                <div class="w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center">
                                    <i class="pi pi-check text-cyan-600 dark:text-cyan-400 text-sm"></i>
                                </div>
                                <span>Répartition par classe d'actifs</span>
                            </li>
                            <li class="flex items-center gap-3 text-surface-700 dark:text-surface-200">
                                <div class="w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center">
                                    <i class="pi pi-check text-cyan-600 dark:text-cyan-400 text-sm"></i>
                                </div>
                                <span>Comparaison revenus vs dépenses</span>
                            </li>
                        </ul>
                    </div>
                    
                    <div class="col-span-12 lg:col-span-6">
                        <div class="relative">
                            <div class="absolute -inset-4 bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 rounded-3xl blur-2xl"></div>
                            <div class="relative bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-700/50">
                                <!-- Asset allocation -->
                                <div class="flex items-center justify-between mb-6">
                                    <span class="text-slate-300 font-medium">Répartition des actifs</span>
                                    <span class="text-slate-500 text-sm">€130,481 total</span>
            </div>

                                <div class="space-y-4">
                                    <div>
                                        <div class="flex items-center justify-between mb-2">
                                            <div class="flex items-center gap-2">
                                                <div class="w-3 h-3 rounded-full bg-indigo-500"></div>
                                                <span class="text-slate-300 text-sm">Immobilier</span>
                                            </div>
                                            <span class="text-slate-400 text-sm">92%</span>
                                        </div>
                                        <div class="h-2 bg-slate-800 rounded-full">
                                            <div class="h-full bg-indigo-500 rounded-full" style="width: 92%"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div class="flex items-center justify-between mb-2">
                                            <div class="flex items-center gap-2">
                                                <div class="w-3 h-3 rounded-full bg-cyan-500"></div>
                                                <span class="text-slate-300 text-sm">Actions (PEA)</span>
                                            </div>
                                            <span class="text-slate-400 text-sm">5%</span>
                                        </div>
                                        <div class="h-2 bg-slate-800 rounded-full">
                                            <div class="h-full bg-cyan-500 rounded-full" style="width: 5%"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div class="flex items-center justify-between mb-2">
                                            <div class="flex items-center gap-2">
                                                <div class="w-3 h-3 rounded-full bg-emerald-500"></div>
                                                <span class="text-slate-300 text-sm">Liquidités</span>
                                            </div>
                                            <span class="text-slate-400 text-sm">2.3%</span>
                                        </div>
                                        <div class="h-2 bg-slate-800 rounded-full">
                                            <div class="h-full bg-emerald-500 rounded-full" style="width: 2.3%"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div class="flex items-center justify-between mb-2">
                                            <div class="flex items-center gap-2">
                                                <div class="w-3 h-3 rounded-full bg-amber-500"></div>
                                                <span class="text-slate-300 text-sm">Crypto</span>
                                            </div>
                                            <span class="text-slate-400 text-sm">0.7%</span>
                                        </div>
                                        <div class="h-2 bg-slate-800 rounded-full">
                                            <div class="h-full bg-amber-500 rounded-full" style="width: 0.7%"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Highlight 3 - Security focused -->
                <div class="grid grid-cols-12 gap-8 items-center">
                    <div class="col-span-12 lg:col-span-6 order-2 lg:order-1">
                        <div class="relative">
                            <div class="absolute -inset-4 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-3xl blur-2xl"></div>
                            <div class="relative bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-700/50">
                                <!-- Security checklist -->
                                <div class="space-y-4 py-4">
                                    <div class="flex items-center gap-4 p-3 rounded-xl bg-slate-800/60">
                                        <div class="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                                            <i class="pi pi-lock text-emerald-400"></i>
                                        </div>
                                        <div>
                                            <div class="text-white font-medium text-sm">Chiffrement SSL/TLS</div>
                                            <div class="text-slate-400 text-xs">Toutes les communications sont chiffrées</div>
                                        </div>
                                        <i class="pi pi-check-circle text-emerald-400 ml-auto"></i>
                                    </div>
                                    <div class="flex items-center gap-4 p-3 rounded-xl bg-slate-800/60">
                                        <div class="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0">
                                            <i class="pi pi-user-minus text-cyan-400"></i>
                                        </div>
                                        <div>
                                            <div class="text-white font-medium text-sm">Jamais partagé</div>
                                            <div class="text-slate-400 text-xs">Aucune vente de données à des tiers</div>
                                        </div>
                                        <i class="pi pi-check-circle text-emerald-400 ml-auto"></i>
                                    </div>
                                    <div class="flex items-center gap-4 p-3 rounded-xl bg-slate-800/60">
                                        <div class="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                                            <i class="pi pi-shield text-indigo-400"></i>
                                        </div>
                                        <div>
                                            <div class="text-white font-medium text-sm">Authentification sécurisée</div>
                                            <div class="text-slate-400 text-xs">JWT + Google OAuth2</div>
                                        </div>
                                        <i class="pi pi-check-circle text-emerald-400 ml-auto"></i>
                                    </div>
                                    <div class="flex items-center gap-4 p-3 rounded-xl bg-slate-800/60">
                                        <div class="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                                            <i class="pi pi-ban text-amber-400"></i>
                                        </div>
                                        <div>
                                            <div class="text-white font-medium text-sm">Lecture seule</div>
                                            <div class="text-slate-400 text-xs">Aucun accès à vos comptes bancaires</div>
                                        </div>
                                        <i class="pi pi-check-circle text-emerald-400 ml-auto"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-span-12 lg:col-span-6 order-1 lg:order-2 text-center lg:text-left">
                        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center mb-6 mx-auto lg:mx-0">
                            <i class="pi pi-lock text-white text-3xl"></i>
                        </div>
                        <h3 class="text-3xl font-bold text-surface-900 dark:text-surface-0 mb-4">
                            La sécurité est notre priorité
                        </h3>
                        <p class="text-lg text-surface-600 dark:text-surface-300 leading-relaxed mb-6">
                            Vos données financières sont sensibles. Afrin Nexus les protège avec les mêmes standards que les applications bancaires — chiffrement, isolation des données et accès zéro aux établissements financiers.
                        </p>
                        <ul class="space-y-3">
                            <li class="flex items-center gap-3 text-surface-700 dark:text-surface-200">
                                <div class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                                    <i class="pi pi-check text-emerald-600 dark:text-emerald-400 text-sm"></i>
                                </div>
                                <span>Données hébergées en Europe</span>
                            </li>
                            <li class="flex items-center gap-3 text-surface-700 dark:text-surface-200">
                                <div class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                                    <i class="pi pi-check text-emerald-600 dark:text-emerald-400 text-sm"></i>
                                </div>
                                <span>Aucune publicité, aucun tracking</span>
                            </li>
                            <li class="flex items-center gap-3 text-surface-700 dark:text-surface-200">
                                <div class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                                    <i class="pi pi-check text-emerald-600 dark:text-emerald-400 text-sm"></i>
                                </div>
                                <span>Suppression totale des données sur demande</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class HighlightsWidget {}
