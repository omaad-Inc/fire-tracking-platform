import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    standalone: true,
    selector: 'app-savings-stats',
    imports: [CommonModule],
    template: `
        <div class="h-full flex flex-col gap-0">
            <div class="card flex-1 flex flex-col items-center justify-center rounded-b-none text-center relative">
                <span class="block text-muted-color font-medium mb-2">Total Savings</span>
                <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl mb-2">{{ totalSavings | currency: 'USD' }}</div>
                <div class="absolute top-4 right-4 flex items-center justify-center bg-green-100 dark:bg-green-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                    <i class="pi pi-wallet text-green-500 !text-xl"></i>
                </div>
            </div>
            <div class="card flex-1 flex flex-col items-center justify-center rounded-t-none text-center relative">
                <span class="block text-muted-color font-medium mb-2">This Month Saving</span>
                <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl mb-2">{{ thisMonthSaving | currency: 'USD' }}</div>
                <div class="absolute top-4 right-4 flex items-center justify-center bg-purple-100 dark:bg-purple-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                    <i class="pi pi-star text-purple-500 !text-xl"></i>
                </div>
            </div>
            <div class="card flex-1 flex flex-col items-center justify-center text-center mt-2 relative">
                <span class="block text-muted-color font-medium mb-2">Average Monthly Saving</span>
                <div class="text-surface-900 dark:text-surface-0 font-bold text-xl mb-2">{{ avgMonthlySaving | currency: 'USD' }}</div>
                <div class="absolute top-4 right-4 flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                    <i class="pi pi-chart-line text-blue-500 !text-xl"></i>
                </div>
            </div>
        </div>
    `
})
export class SavingsStats {
    totalSavings = 45000; // Example data
    thisMonthSaving = 1200; // Example data
    avgMonthlySaving = 1100; // Example data
}

