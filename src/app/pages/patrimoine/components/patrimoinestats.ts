import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SavingsService, SavingsStatsSummary } from '../../service/savings.service';
import { I18nService } from '../../../i18n/i18n.service';

@Component({
    standalone: true,
    selector: 'app-patrimoine-stats',
    imports: [CommonModule],
    template: `
        <div class="h-full flex flex-col gap-0">
            <div class="card flex-1 flex flex-col items-center justify-center rounded-b-none text-center relative">
                <span class="block text-muted-color font-medium mb-2">{{ t('dashboard.kpi.netWorth') }}</span>
                <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl mb-2">{{ totalSavings | currency: 'EUR' }}</div>
                <div class="absolute top-4 right-4 flex items-center justify-center bg-green-100 dark:bg-green-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                    <i class="pi pi-wallet text-green-500 !text-xl"></i>
                </div>
            </div>
            <div class="card flex-1 flex flex-col items-center justify-center rounded-t-none text-center relative">
                <span class="block text-muted-color font-medium mb-2">{{ t('dashboard.kpi.savedThisMonth') }}</span>
                <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl mb-2">{{ thisMonthSaving | currency: 'EUR' }}</div>
                <div class="absolute top-4 right-4 flex items-center justify-center bg-purple-100 dark:bg-purple-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                    <i class="pi pi-star text-purple-500 !text-xl"></i>
                </div>
            </div>
            <div class="card flex-1 flex flex-col items-center justify-center text-center mt-2 relative">
                <span class="block text-muted-color font-medium mb-2">{{ t('transactions.totalExpense') }}</span>
                <div class="text-surface-900 dark:text-surface-0 font-bold text-xl mb-2">{{ avgMonthlySaving | currency: 'EUR' }}</div>
                <div class="absolute top-4 right-4 flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                    <i class="pi pi-chart-line text-blue-500 !text-xl"></i>
                </div>
            </div>
        </div>
    `
})
export class PatrimoineStats {
    totalSavings = 0;
    thisMonthSaving = 0;
    avgMonthlySaving = 0;

    constructor(private savingsService: SavingsService, private i18n: I18nService) {
        this.loadStats();
    }

    private loadStats() {
        this.savingsService.getStatsSummary().then((s: SavingsStatsSummary) => {
            this.totalSavings = s.totalSavings;
            this.thisMonthSaving = s.thisMonthSaving;
            this.avgMonthlySaving = s.avgMonthlySaving;
        });
    }

    t(key: string): string {
        return this.i18n.t(key);
    }
}

