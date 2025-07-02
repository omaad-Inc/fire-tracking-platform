import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    standalone: true,
    selector: 'app-stats-widget',
    imports: [CommonModule],
    template: `
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="card mb-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">Patrimoine Total Brut</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ netWorth | currency: 'EUR' }}</div>
                    </div>
                    <div class="flex items-center justify-center bg-green-100 dark:bg-green-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-wallet text-green-500 !text-xl"></i>
                    </div>
                </div>
                <span class="text-primary font-medium">+{{ netWorthChange }} </span>
                <span class="text-muted-color">since last month</span>
            </div>
        </div>
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="card mb-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">Taux Epargne mensuel</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ savingsRate }}%</div>
                    </div>
                    <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-chart-line text-blue-500 !text-xl"></i>
                    </div>
                </div>
                <span class="text-primary font-medium">{{ savingsAmount | currency: 'EUR' }} </span>
                <span class="text-muted-color">saved this month</span>
            </div>
        </div>
        
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="card mb-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">Revenus Passifs</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ passiveIncome | currency: 'EUR' }}</div>
                    </div>
                    <div class="flex items-center justify-center bg-purple-100 dark:bg-purple-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-star text-purple-500 !text-xl"></i>
                    </div>
                </div>
                <span class="text-primary font-medium">+{{ passiveIncomeChange | currency: 'EUR' }} </span>
                <span class="text-muted-color">this month</span>
            </div>
        </div>
    `
})
export class StatsWidget {
    netWorth = 45000; // Mock data
    netWorthChange = 1200; // Mock data
    savingsRate = 38; // Mock data (percentage)
    savingsAmount = 1200; // Mock data
    fireProgress = 15; // Mock data (percentage)
    fireNumber = 300000; // Mock data (FIRE number target)
    passiveIncome = 120; // Mock data
    passiveIncomeChange = 20; // Mock data
}

