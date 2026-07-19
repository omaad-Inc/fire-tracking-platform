import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subscription, merge } from 'rxjs';
import { I18nService } from '../../../i18n/i18n.service';
import { NavService } from '../../../core/services/nav.service';
import { DashboardService, DashboardStats, FIREProgress } from '../../service/dashboard.service';
import { AssetsStateService } from '../../service/assets-state.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { LoadErrorComponent } from '../../../core/components/load-error.component';
import { CurrencyService } from '../../../core/services/currency.service';

@Component({
    standalone: true,
    selector: 'app-stats-widget',
    imports: [CommonModule, RouterModule, AppAmountComponent, LoadErrorComponent],
    template: `
        <!-- Loading State -->
        @if (loading()) {
            <div class="col-span-12 sm:col-span-6 lg:col-span-6 xl:col-span-4">
                <div class="rounded-2xl border border-surface-200 dark:border-surface-800 p-5 animate-pulse">
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
            <div class="col-span-12 sm:col-span-6 lg:col-span-6 xl:col-span-4">
                <div class="rounded-2xl border border-surface-200 dark:border-surface-800 p-5 animate-pulse">
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
            <div class="col-span-12 sm:col-span-6 lg:col-span-6 xl:col-span-4">
                <div class="rounded-2xl border border-surface-200 dark:border-surface-800 p-5 animate-pulse">
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
        } @else if (loadError()) {
            <div class="col-span-12">
                <app-load-error [title]="t('dashboard.stats.errorTitle')" [body]="t('dashboard.stats.errorBody')" (retry)="retry()" />
            </div>
        } @else {
            <!-- KPI Card 1 - Patrimoine -->
            <div class="col-span-12 sm:col-span-6 lg:col-span-6 xl:col-span-4 h-full">
                <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 hover:border-brand-300 dark:hover:border-brand-700 p-5 h-full flex flex-col cursor-pointer transition-colors duration-300"
                     [routerLink]="link('pages','patrimoine')" role="link" [attr.aria-label]="t('dashboard.kpi.viewPatrimoine')" tabindex="0">
                    <div class="relative flex justify-between items-start mb-4">
                        <div>
                            <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">{{ t('dashboard.kpi.netWorth') }}</span>
                            <div class="font-bold text-3xl md:text-4xl leading-tight"
                                 [ngClass]="realNetWorth() >= 0 ? 'text-surface-900 dark:text-surface-0' : 'text-negative'">
                                <app-amount [value]="absNetWorth()" [prefix]="realNetWorth() < 0 ? '−' : ''" />
                            </div>
                        </div>
                        <div class="flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-100 dark:bg-brand-700/20">
                            <i class="pi pi-wallet text-brand-700 dark:text-ochre-400 text-2xl"></i>
                        </div>
                    </div>
                    <div class="relative flex items-center gap-2 mt-auto">
                        @if ((stats()?.netWorthChangePct ?? 0) === 0) {
                            <span class="inline-flex items-center px-2 py-1 rounded-lg bg-surface-500/10 text-surface-500 text-sm font-semibold">
                                —
                            </span>
                        } @else if ((stats()?.netWorthChangePct ?? 0) > 0) {
                            <span class="inline-flex items-center px-2 py-1 rounded-lg bg-positive/10 text-positive text-sm font-semibold">
                                <i class="pi pi-arrow-up text-xs mr-1"></i>
                                +{{ stats()?.netWorthChangePct | number:'1.1-1' }}%
                            </span>
                        } @else {
                            <span class="inline-flex items-center px-2 py-1 rounded-lg bg-negative/10 text-negative text-sm font-semibold">
                                <i class="pi pi-arrow-down text-xs mr-1"></i>
                                {{ stats()?.netWorthChangePct | number:'1.1-1' }}%
                            </span>
                        }
                        <span class="text-surface-500 dark:text-surface-400 text-sm">{{ t('dashboard.kpi.sinceLastMonth') }}</span>
                    </div>
                </div>
            </div>

            <!-- KPI Card 2 - Flux Mensuel -->
            <div class="col-span-12 sm:col-span-6 lg:col-span-6 xl:col-span-4 h-full">
                <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 hover:border-brand-300 dark:hover:border-brand-700 p-5 h-full flex flex-col cursor-pointer transition-colors duration-300"
                     [routerLink]="link('pages','transaction')" role="link" [attr.aria-label]="t('dashboard.kpi.viewTransactions')" tabindex="0">
                    <div class="relative flex justify-between items-start mb-3">
                        <div class="flex-1 min-w-0">
                            <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">{{ t('dashboard.kpi.monthlyFlux') }}</span>
                            @if ((stats()?.monthlyIncome ?? 0) > 0 || (stats()?.monthlyExpenses ?? 0) > 0) {
                                <div class="font-bold text-2xl leading-tight text-surface-900 dark:text-surface-0">
                                    {{ monthlySavings() >= 0 ? '+' : '-' }}{{ cs.formatNumber(abs(monthlySavings())) }}<span class="text-sm font-semibold ml-1 opacity-70">{{ cs.config().symbol }}</span>
                                </div>
                                <div class="text-surface-400 text-xs mt-0.5 truncate">{{ t('dashboard.kpi.monthlyFluxNet') }} · {{ t('dashboard.kpi.thisMonthLabel') }}</div>
                            } @else {
                                <div class="text-surface-400 dark:text-surface-500 font-medium text-lg">{{ t('dashboard.kpi.noData') }}</div>
                                <div class="text-surface-400 text-xs mt-0.5">{{ t('dashboard.kpi.thisMonthLabel') }}</div>
                            }
                        </div>
                        <div class="flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-100 dark:bg-brand-700/20 shrink-0">
                            <i class="pi pi-arrow-right-arrow-left text-brand-700 dark:text-ochre-400 text-2xl"></i>
                        </div>
                    </div>
                    <div class="relative mt-auto">
                        @if ((stats()?.monthlyIncome ?? 0) > 0 || (stats()?.monthlyExpenses ?? 0) > 0) {
                            <!-- Income vs Expenses dual segment -->
                            <div class="flex items-center gap-3 mb-3">
                                <div class="flex items-center gap-1.5">
                                    <div class="w-2.5 h-2.5 rounded-full bg-positive"></div>
                                    <span class="text-xs text-surface-500 dark:text-surface-400">{{ cs.formatNumber(stats()?.monthlyIncome ?? 0) }}</span>
                                </div>
                                <div class="flex-1 h-2 rounded-full overflow-hidden flex">
                                    <div class="h-full bg-positive/80 rounded-l-full transition-all duration-500"
                                         [style.width]="incomeRatio() + '%'"></div>
                                    <div class="h-full bg-negative/60 rounded-r-full transition-all duration-500"
                                         [style.width]="(100 - incomeRatio()) + '%'"></div>
                                </div>
                                <div class="flex items-center gap-1.5">
                                    <div class="w-2.5 h-2.5 rounded-full bg-negative/60"></div>
                                    <span class="text-xs text-surface-500 dark:text-surface-400">{{ cs.formatNumber(stats()?.monthlyExpenses ?? 0) }}</span>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="inline-flex items-center px-2 py-1 rounded-lg text-sm font-semibold"
                                      [ngClass]="monthlySavings() >= 0 ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'">
                                    <i class="pi text-xs mr-1" [ngClass]="monthlySavings() >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'"></i>
                                    {{ savingsRatePct() | number:'1.0-0' }}% {{ t('dashboard.kpi.monthlySavingsRate') }}
                                </span>
                            </div>
                        } @else {
                            <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-700/10 text-brand-700 dark:bg-brand-300/15 dark:text-brand-300 text-sm font-semibold">
                                <i class="pi pi-plus text-xs"></i>
                                {{ t('dashboard.kpi.addTransaction') }}
                            </span>
                        }
                    </div>
                </div>
            </div>

            <!-- KPI Card 3 - Objectif FIRE -->
            <div class="col-span-12 sm:col-span-6 lg:col-span-6 xl:col-span-4 h-full">
                <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 hover:border-brand-300 dark:hover:border-brand-700 p-5 h-full flex flex-col cursor-pointer transition-colors duration-300"
                     [routerLink]="fireProgress() && (fireProgress()!.targetAmount) > 0 ? link('pages','goals') : link('pages','fire')"
                     role="link" [attr.aria-label]="t('dashboard.kpi.viewFireGoal')" tabindex="0">
                    <div class="relative flex justify-between items-start mb-3">
                        <div class="flex-1 min-w-0">
                            <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">{{ t('dashboard.kpi.fireObjectif') }}</span>
                            @if (fireProgress() && (fireProgress()!.targetAmount) > 0) {
                                <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl">{{ fireProgress()?.progressPct | number:'1.1-1' }}%</div>
                                <div class="text-surface-400 text-xs mt-0.5 truncate">{{ t('dashboard.kpi.fireTarget') }} <app-amount [value]="fireProgress()?.targetAmount ?? 0" /></div>
                            } @else {
                                <div class="text-surface-400 dark:text-surface-500 font-medium text-lg">{{ t('dashboard.kpi.fireNotConfigured') }}</div>
                                <div class="text-surface-400 text-xs mt-0.5">{{ t('dashboard.kpi.fireGoalUndefined') }}</div>
                            }
                        </div>
                        <div class="flex items-center justify-center w-14 h-14 rounded-2xl bg-ochre-500 shrink-0">
                            <i class="pi pi-flag text-warm-900 text-2xl"></i>
                        </div>
                    </div>
                    <div class="relative mt-auto">
                        @if (fireProgress() && (fireProgress()!.targetAmount) > 0) {
                            <!-- Arc gauge -->
                            <div class="flex items-center gap-3 mb-2">
                                <div class="relative w-12 h-12 shrink-0">
                                    <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
                                        <circle cx="18" cy="18" r="15.5" fill="none"
                                                stroke="currentColor" stroke-width="3"
                                                class="text-surface-200 dark:text-surface-700" />
                                        <circle cx="18" cy="18" r="15.5" fill="none"
                                                stroke-width="3" stroke-linecap="round"
                                                class="text-positive"
                                                [attr.stroke-dasharray]="fireArcDash()"
                                                stroke="currentColor" />
                                    </svg>
                                    <span class="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-surface-700 dark:text-surface-200">
                                        {{ fireProgress()?.progressPct | number:'1.0-0' }}%
                                    </span>
                                </div>
                                <div class="flex flex-col">
                                    @if (fireProgress()?.yearsToFire !== null && fireProgress()!.yearsToFire! > 0) {
                                        <span class="text-sm font-semibold text-surface-700 dark:text-surface-200">
                                            {{ fireProgress()!.yearsToFire! | number:'1.0-0' }} {{ t('dashboard.kpi.fireYearsLeft') }}
                                        </span>
                                        <span class="text-xs text-surface-400">{{ t('dashboard.kpi.fireTarget') }} <app-amount [value]="fireProgress()?.targetAmount ?? 0" /></span>
                                    } @else {
                                        <span class="text-sm font-semibold text-positive">{{ t('dashboard.kpi.fireReached') }}</span>
                                    }
                                </div>
                            </div>
                        } @else {
                            <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-700/10 text-brand-700 dark:bg-brand-300/15 dark:text-brand-300 text-sm font-semibold">
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
    private nav = inject(NavService);
    private dashboardService = inject(DashboardService);
    private stateService = inject(AssetsStateService);
    cs = inject(CurrencyService);
    
    private subscription?: Subscription;
    loading = signal(true);
    loadError = signal(false);
    stats = signal<DashboardStats | null>(null);
    fireProgress = signal<FIREProgress | null>(null);

    /**
     * Real net worth = totalAssets − totalDebts.
     * The backend's `net_worth` field only accounts for assets; we subtract
     * debts here on the frontend to get the true net worth.
     * Returns a signed value: negative means debts exceed assets.
     */
    readonly realNetWorth = computed(() => {
        const s = this.stats();
        if (!s) return 0;
        return (s.totalAssets ?? 0) - (s.totalDebts ?? 0);
    });

    /** Absolute net worth in EUR — for <app-amount> which handles Math.abs internally */
    readonly absNetWorth = computed(() => Math.abs(this.realNetWorth()));
    
    monthlySavings = signal(0);
    savingsRatePct = signal(0);

    readonly incomeRatio = computed(() => {
        const s = this.stats();
        if (!s) return 50;
        const total = (s.monthlyIncome ?? 0) + (s.monthlyExpenses ?? 0);
        if (total === 0) return 50;
        return Math.round(((s.monthlyIncome ?? 0) / total) * 100);
    });

    readonly fireArcDash = computed(() => {
        const pct = Math.min(100, this.fireProgress()?.progressPct ?? 0);
        const circumference = 2 * Math.PI * 15.5;
        const filled = (pct / 100) * circumference;
        return `${filled} ${circumference}`;
    });

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
            // Truthful sign: a deficit month is a NEGATIVE rate, not 0. The
            // pill already turns red with a down-arrow when monthlySavings < 0;
            // clamping the number to 0 contradicted that. Upper-cap at 100.
            const pct = stats.monthlyIncome > 0
                ? Math.min(100, Math.round((stats.monthlyIncome - stats.monthlyExpenses) / stats.monthlyIncome * 100))
                : 0;
            this.savingsRatePct.set(pct);
            this.loadError.set(false);
        } catch {
            // Never fabricate a "0" net worth on failure — show an explicit error with retry.
            // Fake zeros on a finance dashboard read as "you have nothing", which destroys trust.
            if (!this.stats()) {
                this.loadError.set(true);
            }
        } finally {
            this.loading.set(false);
        }
    }

    retry() {
        this.loadError.set(false);
        this.loadStats();
    }

    abs(n: number): number { return Math.abs(n); }

    t(key: string): string {
        return this.i18n.t(key);
    }

    link(...segments: string[]): any[] {
        return this.nav.link(...segments);
    }
}
