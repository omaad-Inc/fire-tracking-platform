import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PatrimoineService } from '../../service/patrimoine.service';
import { TransactionsService } from '../../service/transactions.service';
import { DebtsService } from '../../service/debts.service';
import { I18nService } from '../../../i18n/i18n.service';
import { AssetsStateService } from '../../service/assets-state.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';

@Component({
    standalone: true,
    selector: 'app-patrimoine-stats',
    imports: [CommonModule, AppAmountComponent],
    template: `
        <div class="h-full flex flex-col gap-4">

            <!-- Card 1 - Valeur Nette -->
            <div class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 hover:border-brand-300 dark:hover:border-brand-700 p-5 flex-1 flex flex-col items-center justify-center text-center group transition-all duration-300">
                <div class="absolute inset-0 bg-gradient-to-br from-brand-50 via-surface-50 to-surface-100 dark:from-brand-900/20 dark:via-surface-800 dark:to-surface-900"></div>
                <div class="absolute top-2 right-2 w-14 h-14 rounded-full bg-brand-100/40 dark:bg-brand-800/20 blur-md"></div>
                <span class="relative block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">{{ t('patrimoine.netWorth') }}</span>
                <div class="relative font-bold text-2xl mb-1"
                     [ngClass]="netWorth >= 0 ? 'text-surface-900 dark:text-surface-0' : 'text-negative'">
                    <app-amount [value]="netWorth" />
                </div>
                <span class="relative text-surface-500 dark:text-surface-400 text-xs">Actifs&nbsp;−&nbsp;Dettes</span>
                <div class="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-xl bg-white/80 dark:bg-surface-700/80 backdrop-blur shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <i class="pi pi-wallet text-brand-700 dark:text-brand-300 text-lg"></i>
                </div>
            </div>

            <!-- Card 2 - Taux d'épargne global -->
            <div class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 hover:border-brand-300 dark:hover:border-brand-700 p-5 flex-1 flex flex-col items-center justify-center text-center group transition-all duration-300">
                <div class="absolute inset-0 bg-gradient-to-br from-surface-50 via-surface-50 to-brand-50/50 dark:from-surface-800 dark:via-surface-800/90 dark:to-brand-900/10"></div>
                <div class="absolute top-3 right-3 w-12 h-12 rounded-full bg-brand-100/30 dark:bg-brand-800/15 blur-md"></div>
                <span class="relative block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">{{ t('dashboard.kpi.globalSavingsRate') }}</span>
                <div class="relative text-surface-900 dark:text-surface-0 font-bold text-2xl mb-1">
                    {{ globalSavingsRate }}%
                </div>
                <div class="relative w-4/5 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                    <div class="h-full bg-brand-700 dark:bg-brand-300 rounded-full transition-all duration-500"
                         [style.width]="globalSavingsRate + '%'"></div>
                </div>
                <div class="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-xl bg-white/80 dark:bg-surface-700/80 backdrop-blur shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <i class="pi pi-percentage text-brand-700 dark:text-brand-300 text-lg"></i>
                </div>
            </div>

            <!-- Card 3 - Nombre d'actifs -->
            <div class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 hover:border-brand-300 dark:hover:border-brand-700 p-5 flex-1 flex flex-col items-center justify-center text-center group transition-all duration-300">
                <div class="absolute inset-0 bg-gradient-to-br from-ochre-50/50 via-surface-50 to-surface-100 dark:from-ochre-900/10 dark:via-surface-800 dark:to-surface-900"></div>
                <div class="absolute top-2 right-2 w-12 h-12 rounded-full bg-ochre-100/40 dark:bg-ochre-800/15 blur-md"></div>
                <span class="relative block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">{{ t('patrimoine.stats.assetsCount') }}</span>
                <div class="relative text-surface-900 dark:text-surface-0 font-bold text-xl mb-2">{{ assetsCount }}</div>
                <div class="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-xl bg-white/80 dark:bg-surface-700/80 backdrop-blur shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <i class="pi pi-chart-line text-ochre-600 dark:text-ochre-300 text-lg"></i>
                </div>
            </div>
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

    // Card 3
    assetsCount = 0;

    ngOnInit() {
        this.loadStats();
        this.subscription = this.stateService.assetsUpdated$.subscribe(() => this.loadStats());
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

    private async loadStats() {
        const [assets, debtsStats, allRecords] = await Promise.all([
            this.patrimoineService.getAssets(),
            this.debtsService.getStats(),
            this.transactionsService.getRecords()
        ]);

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
                monthRates.push(Math.max(0, Math.min(100, Math.round(net / income * 100))));
            }
        }

        this.globalSavingsRate = monthRates.length
            ? Math.round(monthRates.reduce((s, r) => s + r, 0) / monthRates.length)
            : 0;
    }

    t(key: string): string { return this.i18n.t(key); }
}
