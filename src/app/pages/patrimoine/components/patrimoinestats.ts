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

            <!-- Card 1 - Valeur Nette = assets - debts -->
            <div class="card flex-1 flex flex-col items-center justify-center text-center relative group hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 border border-transparent hover:border-indigo-500/20">
                <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">{{ t('patrimoine.netWorth') }}</span>
                <div class="font-bold text-2xl mb-1"
                     [ngClass]="netWorth >= 0 ? 'text-surface-900 dark:text-surface-0' : 'text-rose-500'">
                    <app-amount [value]="netWorth" />
                </div>
                <span class="text-surface-500 dark:text-surface-400 text-xs">
                    Actifs&nbsp;−&nbsp;Dettes
                </span>
                <div class="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-300">
                    <i class="pi pi-wallet text-white text-lg"></i>
                </div>
            </div>

            <!-- Card 2 - Taux d'épargne global (average monthly savings rate) -->
            <div class="card flex-1 flex flex-col items-center justify-center text-center relative group hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 border border-transparent hover:border-cyan-500/20">
                <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">{{ t('dashboard.kpi.globalSavingsRate') }}</span>
                <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl mb-1">
                    {{ globalSavingsRate }}%
                </div>
                <div class="w-4/5 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                    <div class="h-full bg-cyan-500 rounded-full transition-all duration-500"
                         [style.width]="globalSavingsRate + '%'"></div>
                </div>
                <div class="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform duration-300">
                    <i class="pi pi-percentage text-white text-lg"></i>
                </div>
            </div>

            <!-- Card 3 - Nombre d'actifs -->
            <div class="card flex-1 flex flex-col items-center justify-center text-center relative group hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 border border-transparent hover:border-emerald-500/20">
                <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">{{ t('patrimoine.stats.assetsCount') }}</span>
                <div class="text-surface-900 dark:text-surface-0 font-bold text-xl mb-2">{{ assetsCount }}</div>
                <div class="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                    <i class="pi pi-chart-line text-white text-lg"></i>
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
