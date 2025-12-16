import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { I18nService } from '../../../i18n/i18n.service';
import { DashboardService, DashboardStats, FIREProgress } from '../../service/dashboard.service';

@Component({
    standalone: true,
    selector: 'app-stats-widget',
    imports: [CommonModule, RouterModule],
    template: `
        <!-- Loading State -->
        @if (loading()) {
            <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                <div class="card mb-0 animate-pulse">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex-1">
                            <div class="h-4 bg-surface-200 dark:bg-surface-700 rounded w-24 mb-2"></div>
                            <div class="h-8 bg-surface-200 dark:bg-surface-700 rounded w-32"></div>
                        </div>
                        <div class="w-12 h-12 rounded-xl bg-surface-200 dark:bg-surface-700"></div>
                    </div>
                    <div class="h-6 bg-surface-200 dark:bg-surface-700 rounded w-40"></div>
                </div>
            </div>
            <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                <div class="card mb-0 animate-pulse">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex-1">
                            <div class="h-4 bg-surface-200 dark:bg-surface-700 rounded w-24 mb-2"></div>
                            <div class="h-8 bg-surface-200 dark:bg-surface-700 rounded w-32"></div>
                        </div>
                        <div class="w-12 h-12 rounded-xl bg-surface-200 dark:bg-surface-700"></div>
                    </div>
                    <div class="h-6 bg-surface-200 dark:bg-surface-700 rounded w-40"></div>
                </div>
            </div>
            <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                <div class="card mb-0 animate-pulse">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex-1">
                            <div class="h-4 bg-surface-200 dark:bg-surface-700 rounded w-24 mb-2"></div>
                            <div class="h-8 bg-surface-200 dark:bg-surface-700 rounded w-32"></div>
                        </div>
                        <div class="w-12 h-12 rounded-xl bg-surface-200 dark:bg-surface-700"></div>
                    </div>
                    <div class="h-6 bg-surface-200 dark:bg-surface-700 rounded w-40"></div>
                </div>
            </div>
        } @else {
            <!-- KPI Card 1 - Patrimoine -->
            <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                <div class="card mb-0 cursor-pointer group hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 border border-transparent hover:border-indigo-500/20" 
                     [routerLink]="link('pages','patrimoine')" role="link" aria-label="Voir le patrimoine" tabindex="0">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">{{ t('dashboard.kpi.netWorth') }}</span>
                            <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl">{{ stats()?.netWorth | currency: 'EUR':'symbol':'1.0-0' }}</div>
                        </div>
                        <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-300">
                            <i class="pi pi-wallet text-white text-xl"></i>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        @if ((stats()?.netWorthChangePct ?? 0) >= 0) {
                            <span class="inline-flex items-center px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm font-semibold">
                                <i class="pi pi-arrow-up text-xs mr-1"></i>
                                +{{ stats()?.netWorthChangePct | number:'1.1-1' }}%
                            </span>
                        } @else {
                            <span class="inline-flex items-center px-2 py-1 rounded-lg bg-red-500/10 text-red-500 text-sm font-semibold">
                                <i class="pi pi-arrow-down text-xs mr-1"></i>
                                {{ stats()?.netWorthChangePct | number:'1.1-1' }}%
                            </span>
                        }
                        <span class="text-surface-500 dark:text-surface-400 text-sm">{{ t('dashboard.kpi.sinceLastMonth') }}</span>
                    </div>
                </div>
            </div>

            <!-- KPI Card 2 - Taux d'épargne -->
            <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                <div class="card mb-0 cursor-pointer group hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 border border-transparent hover:border-cyan-500/20" 
                     [routerLink]="link('pages','savings')" role="link" aria-label="Voir l'épargne" tabindex="0">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">{{ t('dashboard.kpi.monthlySavingsRate') }}</span>
                            <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl">{{ stats()?.savingsRate | number:'1.0-0' }}%</div>
                        </div>
                        <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform duration-300">
                            <i class="pi pi-chart-line text-white text-xl"></i>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="inline-flex items-center px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-500 text-sm font-semibold">
                            {{ monthlySavings() | currency: 'EUR':'symbol':'1.0-0' }}
                        </span>
                        <span class="text-surface-500 dark:text-surface-400 text-sm">{{ t('dashboard.kpi.savedThisMonth') }}</span>
                    </div>
                </div>
            </div>
            
            <!-- KPI Card 3 - Objectif FIRE -->
            <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                <div class="card mb-0 cursor-pointer group hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 border border-transparent hover:border-emerald-500/20" 
                     [routerLink]="link('pages','patrimoine')" role="link" aria-label="Voir l'objectif FIRE" tabindex="0">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">Objectif FIRE</span>
                            <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl">{{ fireProgress()?.progressPct | number:'1.0-0' }}%</div>
                        </div>
                        <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                            <i class="pi pi-flag text-white text-xl"></i>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        @if (fireProgress()?.yearsToFire !== null) {
                            <span class="inline-flex items-center px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm font-semibold">
                                {{ fireProgress()?.yearsToFire }} ans restants
                            </span>
                        } @else {
                            <span class="inline-flex items-center px-2 py-1 rounded-lg bg-surface-500/10 text-surface-500 text-sm font-semibold">
                                Configurez vos objectifs
                            </span>
                        }
                    </div>
                </div>
            </div>
        }
    `
})
export class StatsWidget implements OnInit {
    private i18n = inject(I18nService);
    private router = inject(Router);
    private dashboardService = inject(DashboardService);

    loading = signal(true);
    stats = signal<DashboardStats | null>(null);
    fireProgress = signal<FIREProgress | null>(null);
    
    monthlySavings = signal(0);

    async ngOnInit() {
        this.loading.set(true);
        try {
            const [stats, fire] = await Promise.all([
                this.dashboardService.getStats(),
                this.dashboardService.getFIREMetrics()
            ]);
            
            this.stats.set(stats);
            this.fireProgress.set(fire);
            this.monthlySavings.set(stats.monthlyIncome - stats.monthlyExpenses);
        } catch (error) {
            console.error('Error loading stats:', error);
            // Set default values
            this.stats.set({
                netWorth: 0,
                netWorthChange: 0,
                netWorthChangePct: 0,
                totalAssets: 0,
                totalDebts: 0,
                savingsRate: 0,
                monthlyIncome: 0,
                monthlyExpenses: 0
            });
        } finally {
            this.loading.set(false);
        }
    }

    t(key: string): string {
        return this.i18n.t(key);
    }

    link(...segments: string[]): any[] {
        const url = this.router.url;
        const match = url.match(/^\/(fr|en)(?:\/|$)/);
        const lang = (match ? match[1] : 'fr') as 'fr' | 'en';
        return ['/', lang, ...segments];
    }
}
