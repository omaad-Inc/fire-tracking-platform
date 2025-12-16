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
                        <span class="text-cyan-600 dark:text-cyan-400 text-sm font-medium">Vision FIRE</span>
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
                                        <span class="text-slate-300 font-medium">Progression vers FIRE</span>
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
                                            <span class="text-slate-400 text-sm">Objectif FIRE</span>
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
                            Calculez votre nombre FIRE
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

                <!-- Highlight 3 - Privacy focused -->
                <div class="grid grid-cols-12 gap-8 items-center">
                    <div class="col-span-12 lg:col-span-6 order-2 lg:order-1">
                        <div class="relative">
                            <div class="absolute -inset-4 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-3xl blur-2xl"></div>
                            <div class="relative bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-700/50">
                                <!-- Privacy shield visualization -->
                                <div class="text-center py-8">
                                    <div class="relative inline-block">
                                        <div class="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse"></div>
                                        <div class="relative w-32 h-32 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center mx-auto">
                                            <i class="pi pi-shield text-white text-5xl"></i>
                                        </div>
                                    </div>
                                    <div class="mt-6 space-y-3">
                                        <div class="flex items-center justify-center gap-2 text-emerald-400">
                                            <i class="pi pi-lock"></i>
                                            <span class="font-medium">100% Local</span>
                                        </div>
                                        <div class="flex items-center justify-center gap-2 text-slate-400 text-sm">
                                            <i class="pi pi-database"></i>
                                            <span>Stockage sur votre appareil</span>
                                        </div>
                                        <div class="flex items-center justify-center gap-2 text-slate-400 text-sm">
                                            <i class="pi pi-ban"></i>
                                            <span>Aucun serveur externe</span>
                                        </div>
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
                            Vos données restent privées
                        </h3>
                        <p class="text-lg text-surface-600 dark:text-surface-300 leading-relaxed mb-6">
                            Afrin Nexus fonctionne entièrement en local. Vos données financières sensibles ne quittent jamais votre appareil. 
                            Aucun compte requis, aucune synchronisation cloud, confidentialité totale.
                        </p>
                        <ul class="space-y-3">
                            <li class="flex items-center gap-3 text-surface-700 dark:text-surface-200">
                                <div class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                                    <i class="pi pi-check text-emerald-600 dark:text-emerald-400 text-sm"></i>
                                </div>
                                <span>Stockage IndexedDB local</span>
                            </li>
                            <li class="flex items-center gap-3 text-surface-700 dark:text-surface-200">
                                <div class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                                    <i class="pi pi-check text-emerald-600 dark:text-emerald-400 text-sm"></i>
                                </div>
                                <span>Export/Import de vos données</span>
                            </li>
                            <li class="flex items-center gap-3 text-surface-700 dark:text-surface-200">
                                <div class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                                    <i class="pi pi-check text-emerald-600 dark:text-emerald-400 text-sm"></i>
                                </div>
                                <span>Open source et auditable</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class HighlightsWidget {}
