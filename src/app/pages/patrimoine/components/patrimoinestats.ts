import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PatrimoineService } from '../../service/patrimoine.service';
import { TransactionsService } from '../../service/transactions.service';
import { DebtsService } from '../../service/debts.service';
import { I18nService } from '../../../i18n/i18n.service';
import { AssetsStateService } from '../../service/assets-state.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { LoadErrorComponent } from '../../../core/components/load-error.component';

@Component({
    standalone: true,
    selector: 'app-patrimoine-stats',
    imports: [CommonModule, AppAmountComponent, LoadErrorComponent],
    template: `
        <div class="h-full flex flex-col gap-4">
            @if (loading()) {
                @for (i of [1, 2, 3]; track i) {
                    <div class="flex-1 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 animate-pulse">
                        <div class="h-4 bg-surface-200 dark:bg-surface-700 rounded w-24 mx-auto mb-3"></div>
                        <div class="h-7 bg-surface-200 dark:bg-surface-700 rounded w-32 mx-auto"></div>
                    </div>
                }
            } @else if (loadError()) {
                <app-load-error (retry)="loadStats()" />
            } @else {

            <!-- Card 1 - Valeur Nette -->
            <div class="relative overflow-hidden rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 hover:border-brand-300 dark:hover:border-brand-700 p-5 flex-1 flex flex-col items-center justify-center text-center group transition-all duration-300">
                <span class="relative block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">{{ t('patrimoine.netWorth') }}</span>
                <div class="relative font-bold text-2xl mb-1"
                     [ngClass]="netWorth >= 0 ? 'text-surface-900 dark:text-surface-0' : 'text-negative'">
                    <app-amount [value]="netWorth" />
                </div>
                <span class="relative text-surface-500 dark:text-surface-400 text-xs">Actifs&nbsp;−&nbsp;Dettes</span>
                <div class="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-700/20 shadow-sm">
                    <i class="pi pi-wallet text-brand-700 dark:text-brand-300 text-lg"></i>
                </div>
            </div>

            <!-- Card 2 - Taux d'épargne global -->
            <div class="relative overflow-hidden rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 hover:border-brand-300 dark:hover:border-brand-700 p-5 flex-1 flex flex-col items-center justify-center text-center group transition-all duration-300">
                <span class="relative block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">{{ t('dashboard.kpi.globalSavingsRate') }}</span>
                <div class="relative font-bold text-2xl mb-1"
                     [ngClass]="globalSavingsRate < 0 ? 'text-negative' : 'text-surface-900 dark:text-surface-0'">
                    {{ globalSavingsRate }}%
                </div>
                <div class="relative w-4/5 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500"
                         [ngClass]="globalSavingsRate < 0 ? 'bg-negative' : 'bg-brand-700 dark:bg-brand-300'"
                         [style.width]="savingsBarWidth + '%'"></div>
                </div>
                <div class="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-700/20 shadow-sm">
                    <i class="pi pi-percentage text-brand-700 dark:text-brand-300 text-lg"></i>
                </div>
            </div>

            <!-- Card 3 - Nombre d'actifs -->
            <div class="relative overflow-hidden rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 hover:border-brand-300 dark:hover:border-brand-700 p-5 flex-1 flex flex-col items-center justify-center text-center group transition-all duration-300">
                <span class="relative block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">{{ t('patrimoine.stats.assetsCount') }}</span>
                <div class="relative text-surface-900 dark:text-surface-0 font-bold text-xl mb-2">{{ assetsCount }}</div>
                <div class="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-700/20 shadow-sm">
                    <i class="pi pi-chart-line text-ochre-600 dark:text-ochre-300 text-lg"></i>
                </div>
            </div>
            }
        </div>
    `
})
export class PatrimoineStats implements OnInit, OnDestroy {
    private patrimoineService   = inject(PatrimoineService);
    private transactionsService = inject(TransactionsService);
    private debtsService        = inject(DebtsService);
    private stateService        = inject(AssetsStateService);
    private i18n                = inject(I18nService);
    private subscription?: Subscription;

    // Card 1 — net worth
    totalAssets  = 0;
    totalDebts   = 0;
    get netWorth() { return this.totalAssets - this.totalDebts; }

    // Card 2 — global savings rate (average of monthly rates over all available months)
    globalSavingsRate = 0;
    /** Magnitude-based bar fill; the bar colour signals the sign. */
    get savingsBarWidth(): number { return Math.min(100, Math.abs(this.globalSavingsRate)); }

    // Card 3
    assetsCount = 0;

    loading = signal(true);
    loadError = signal(false);
    private hasLoaded = false;

    ngOnInit() {
        this.loadStats();
        this.subscription = this.stateService.assetsUpdated$.subscribe(() => this.loadStats());
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

    async loadStats() {
        if (!this.hasLoaded) this.loading.set(true);
        let assets, debtsStats, allRecords;
        try {
            [assets, debtsStats, allRecords] = await Promise.all([
                this.patrimoineService.getAssets(),
                this.debtsService.getStats(),
                this.transactionsService.getRecords()
            ]);
            this.loadError.set(false);
            this.hasLoaded = true;
        } catch (error) {
            console.error('Error loading patrimoine stats:', error);
            // Explicit error+retry — fake-zero net worth reads as data loss.
            if (!this.hasLoaded) this.loadError.set(true);
            return;
        } finally {
            this.loading.set(false);
        }

        // Card 1 — net worth
        this.totalAssets = assets.reduce((s, a) => s + a.value, 0);
        this.totalDebts  = debtsStats.totalDebt;   // already in EUR (base currency)
        this.assetsCount = assets.length;

        // Card 2 — global savings rate
        // Group transactions by YYYY-MM, compute rate per month, then average.
        const byMonth = new Map<string, { income: number; expenses: number }>();
        for (const r of allRecords) {
            const ym = r.date.slice(0, 7);           // 'YYYY-MM'
            const entry = byMonth.get(ym) ?? { income: 0, expenses: 0 };
            if (r.type === 'Income')  entry.income   += r.amount;
            if (r.type === 'Expense') entry.expenses += r.amount;
            byMonth.set(ym, entry);
        }

        const monthRates: number[] = [];
        for (const { income, expenses } of byMonth.values()) {
            if (income > 0) {
                const net = income - expenses;
                // Keep deficit months negative — clamping them to 0 inflates
                // the average (a +50%/−50% pair must average 0%, not +25%).
                monthRates.push(Math.min(100, Math.round(net / income * 100)));
            }
        }

        this.globalSavingsRate = monthRates.length
            ? Math.round(monthRates.reduce((s, r) => s + r, 0) / monthRates.length)
            : 0;
    }

    t(key: string): string { return this.i18n.t(key); }
}
