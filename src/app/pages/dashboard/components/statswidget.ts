import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subscription, merge } from 'rxjs';
import { I18nService } from '../../../i18n/i18n.service';
import { DashboardService, DashboardStats, FIREProgress } from '../../service/dashboard.service';
import { AssetsStateService } from '../../service/assets-state.service';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';

@Component({
    standalone: true,
    selector: 'app-stats-widget',
    imports: [CommonModule, RouterModule, AppCurrencyPipe],
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
            <div class="col-span-12 lg:col-span-6 xl:col-span-4 h-full">
                <div class="card mb-0 h-full flex flex-col cursor-pointer group hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 border border-transparent hover:border-indigo-500/20"
                     [routerLink]="link('pages','patrimoine')" role="link" aria-label="Voir le patrimoine" tabindex="0">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">{{ t('dashboard.kpi.netWorth') }}</span>
                            <div class="text-surface-900 dark:text-surface-0 font-bold text-3xl md:text-4xl">{{ stats()?.netWorth | appCurrency }}</div>
                        </div>
                        <div class="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-300">
                            <i class="pi pi-wallet text-white text-2xl"></i>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 mt-auto">
                        @if ((stats()?.netWorthChangePct ?? 0) === 0) {
                            <span class="inline-flex items-center px-2 py-1 rounded-lg bg-surface-500/10 text-surface-500 text-sm font-semibold">
                                —
                            </span>
                        } @else if ((stats()?.netWorthChangePct ?? 0) > 0) {
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

            <!-- KPI Card 2 - Flux Mensuel -->
            <div class="col-span-12 lg:col-span-6 xl:col-span-4 h-full">
                <div class="card mb-0 h-full flex flex-col cursor-pointer group hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 border border-transparent hover:border-cyan-500/20"
                     [routerLink]="link('pages','transaction')" role="link" aria-label="Voir les transactions" tabindex="0">
                    <div class="flex justify-between items-start mb-3">
                        <div class="flex-1 min-w-0">
                            <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">{{ t('dashboard.kpi.monthlyFlux') }}</span>
                            @if ((stats()?.monthlyIncome ?? 0) > 0 || (stats()?.monthlyExpenses ?? 0) > 0) {
                                <div class="font-bold text-2xl"
                                     [ngClass]="monthlySavings() >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                                    {{ monthlySavings() >= 0 ? '+' : '' }}{{ monthlySavings() | appCurrency }}
                                </div>
                                <div class="text-surface-500 dark:text-surface-400 text-xs mt-0.5">{{ t('dashboard.kpi.monthlyFluxNet') }}</div>
                            } @else {
                                <div class="text-surface-400 dark:text-surface-500 font-medium text-lg">{{ t('dashboard.kpi.noData') }}</div>
                                <div class="text-surface-400 text-xs mt-0.5">{{ t('dashboard.kpi.thisMonthLabel') }}</div>
                            }
                        </div>
                        <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform duration-300 shrink-0">
                            <i class="pi pi-arrow-right-arrow-left text-white text-xl"></i>
                        </div>
                    </div>
                    <div class="mt-auto">
                        @if ((stats()?.monthlyIncome ?? 0) > 0 || (stats()?.monthlyExpenses ?? 0) > 0) {
                            <div class="space-y-2">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-1.5">
                                        <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        <span class="text-surface-500 dark:text-surface-400 text-xs">{{ t('dashboard.kpi.monthlyFluxRevenues') }}</span>
                                    </div>
                                    <span class="text-emerald-500 text-xs font-semibold">+{{ stats()?.monthlyIncome | appCurrency }}</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-1.5">
                                        <div class="w-2 h-2 rounded-full bg-rose-500"></div>
                                        <span class="text-surface-500 dark:text-surface-400 text-xs">{{ t('dashboard.kpi.monthlyFluxExpenses') }}</span>
                                    </div>
                                    <span class="text-rose-500 text-xs font-semibold">-{{ stats()?.monthlyExpenses | appCurrency }}</span>
                                </div>
                                @if ((stats()?.monthlyIncome ?? 0) > 0) {
                                    <div class="w-full h-1 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden mt-1">
                                        <div class="h-full rounded-full transition-all duration-500"
                                             [ngClass]="monthlySavings() >= 0 ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-gradient-to-r from-rose-500 to-orange-500'"
                                             [style.width]="savingsRatePct() + '%'"></div>
                                    </div>
                                }
                            </div>
                        } @else {
                            <div class="flex items-center gap-2">
                                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-500 text-xs font-semibold">
                                    <i class="pi pi-plus text-xs"></i>
                                    {{ t('dashboard.kpi.addTransaction') }}
                                </span>
                            </div>
                        }
                    </div>
                </div>
            </div>

            <!-- KPI Card 3 - Objectif FIRE -->
            <div class="col-span-12 lg:col-span-6 xl:col-span-4 h-full">
                <div class="card mb-0 h-full flex flex-col cursor-pointer group hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 border border-transparent hover:border-emerald-500/20"
                     [routerLink]="fireProgress() && (fireProgress()!.targetAmount ?? 0) > 0 ? link('pages','patrimoine') : link('pages','settings','fire')"
                     role="link" aria-label="Voir l'objectif FIRE" tabindex="0">
                    <div class="flex justify-between items-start mb-3">
                        <div class="flex-1 min-w-0">
                            <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">{{ t('dashboard.kpi.fireObjectif') }}</span>
                            @if (fireProgress() && (fireProgress()!.targetAmount ?? 0) > 0) {
                                <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl">{{ fireProgress()?.progressPct | number:'1.1-1' }}%</div>
                                <div class="text-surface-400 text-xs mt-0.5 truncate">{{ t('dashboard.kpi.fireTarget') }} {{ fireProgress()?.targetAmount | appCurrency }}</div>
                            } @else {
                                <div class="text-surface-400 dark:text-surface-500 font-medium text-lg">{{ t('dashboard.kpi.fireNotConfigured') }}</div>
                                <div class="text-surface-400 text-xs mt-0.5">{{ t('dashboard.kpi.fireGoalUndefined') }}</div>
                            }
                        </div>
                        <div class="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300 shrink-0">
                            <i class="pi pi-flag text-white text-2xl"></i>
                        </div>
                    </div>
                    <div class="mt-auto">
                        @if (fireProgress() && (fireProgress()!.targetAmount ?? 0) > 0) {
                            <!-- Progress bar -->
                            <div class="w-full h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full mb-3 overflow-hidden">
                                <div class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                                     [style.width]="(fireProgress()!.progressPct! > 100 ? 100 : fireProgress()!.progressPct!) + '%'"></div>
                            </div>
                            <div class="flex items-center gap-2">
                                @if (fireProgress()?.yearsToFire !== null && fireProgress()!.yearsToFire! > 0) {
                                    <span class="inline-flex items-center px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm font-semibold">
                                        {{ fireProgress()!.yearsToFire! | number:'1.0-0' }} {{ t('dashboard.kpi.fireYearsLeft') }}
                                    </span>
                                } @else {
                                    <span class="inline-flex items-center px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm font-semibold">
                                        🎯 {{ t('dashboard.kpi.fireReached') }}
                                    </span>
                                }
                            </div>
                        } @else {
                            <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-500 text-sm font-semibold">
                                <i class="pi pi-arrow-right text-xs"></i>
                                {{ t('dashboard.kpi.fireConfigure') }}
                            </span>
                        }
                    </div>
                </div>
            </div>
        }
    `
})
export class StatsWidget implements OnInit, OnDestroy {
    private i18n = inject(I18nService);
    private router = inject(Router);
    private dashboardService = inject(DashboardService);
    private stateService = inject(AssetsStateService);
    
    private subscription?: Subscription;
    loading = signal(true);
    stats = signal<DashboardStats | null>(null);
    fireProgress = signal<FIREProgress | null>(null);
    
    monthlySavings = signal(0);
    savingsRatePct = signal(0);

    async ngOnInit() {
        await this.loadStats();
        
        // Subscribe to all state updates
        this.subscription = merge(
            this.stateService.assetsUpdated$,
            this.stateService.debtsUpdated$,
            this.stateService.savingsUpdated$,
            this.stateService.transactionsUpdated$
        ).subscribe(() => {
            this.loadStats();
        });
    }
    
    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }
    
    private async loadStats() {
        if (!this.stats()) {
            this.loading.set(true);
        }
        try {
            const [stats, fire] = await Promise.all([
                this.dashboardService.getStats(),
                this.dashboardService.getFIREMetrics()
            ]);
            this.stats.set(stats);
            this.fireProgress.set(fire);
            this.monthlySavings.set(stats.monthlyIncome - stats.monthlyExpenses);
            const pct = stats.monthlyIncome > 0
                ? Math.min(100, Math.max(0, Math.round((stats.monthlyIncome - stats.monthlyExpenses) / stats.monthlyIncome * 100)))
                : 0;
            this.savingsRatePct.set(pct);
        } catch (error) {
            console.error('Error loading stats:', error);
            if (!this.stats()) {
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
            }
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
