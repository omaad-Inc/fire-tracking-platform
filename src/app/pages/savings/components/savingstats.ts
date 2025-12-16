import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SavingsService, SavingsStatsSummary } from '../../service/savings.service';

@Component({
    standalone: true,
    selector: 'app-savings-stats',
    imports: [CommonModule],
    template: `
        <div class="h-full flex flex-col gap-4">
            <!-- Card 1 - Total Savings -->
            <div class="card flex-1 flex flex-col items-center justify-center text-center relative group hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 border border-transparent hover:border-emerald-500/20">
                <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">Total Épargne</span>
                <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl mb-2">{{ totalSavings | currency: 'EUR':'symbol':'1.0-0' }}</div>
                <div class="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                    <i class="pi pi-wallet text-white text-lg"></i>
                </div>
            </div>
            
            <!-- Card 2 - This Month Saving -->
            <div class="card flex-1 flex flex-col items-center justify-center text-center relative group hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 border border-transparent hover:border-cyan-500/20">
                <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">Épargne ce Mois</span>
                <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl mb-2">{{ thisMonthSaving | currency: 'EUR':'symbol':'1.0-0' }}</div>
                <div class="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform duration-300">
                    <i class="pi pi-star text-white text-lg"></i>
                </div>
            </div>
            
            <!-- Card 3 - Average Monthly Saving -->
            <div class="card flex-1 flex flex-col items-center justify-center text-center relative group hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 border border-transparent hover:border-indigo-500/20">
                <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">Moyenne Mensuelle</span>
                <div class="text-surface-900 dark:text-surface-0 font-bold text-xl mb-2">{{ avgMonthlySaving | currency: 'EUR':'symbol':'1.0-0' }}</div>
                <div class="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-300">
                    <i class="pi pi-chart-line text-white text-lg"></i>
                </div>
            </div>
        </div>
    `
})
export class SavingsStats {
    totalSavings = 0;
    thisMonthSaving = 0;
    avgMonthlySaving = 0;

    constructor(private savingsService: SavingsService) {
        this.loadStats();
    }

    private loadStats() {
        this.savingsService.getStatsSummary().then((s: SavingsStatsSummary) => {
            this.totalSavings = s.totalSavings;
            this.thisMonthSaving = s.thisMonthSaving;
            this.avgMonthlySaving = s.avgMonthlySaving;
        });
    }
}
