import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { I18nService } from '../../../i18n/i18n.service';
import { Router } from '@angular/router';

@Component({
    standalone: true,
    selector: 'app-stats-widget',
    imports: [CommonModule, RouterModule],
    template: `
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="card mb-0 cursor-pointer" [routerLink]="link('pages','patrimoine')" role="link" aria-label="Voir le patrimoine" tabindex="0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">{{ t('dashboard.kpi.netWorth') }}</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ netWorth | currency: 'EUR' }}</div>
                    </div>
                    <div class="flex items-center justify-center bg-green-100 dark:bg-green-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-wallet text-green-500 !text-xl"></i>
                    </div>
                </div>
                <span class="text-primary font-medium">+{{ netWorthChange | currency: 'EUR' }} </span>
                <span class="text-muted-color">{{ t('dashboard.kpi.sinceLastMonth') }}</span>
            </div>
        </div>
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="card mb-0 cursor-pointer" [routerLink]="link('pages','savings')" role="link" aria-label="Voir l’épargne" tabindex="0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">{{ t('dashboard.kpi.monthlySavingsRate') }}</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ savingsRate }} %</div>
                    </div>
                    <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-chart-line text-blue-500 !text-xl"></i>
                    </div>
                </div>
                <span class="text-primary font-medium">{{ savingsAmount | currency: 'EUR' }} </span>
                <span class="text-muted-color">{{ t('dashboard.kpi.savedThisMonth') }}</span>
            </div>
        </div>
        
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="card mb-0 cursor-pointer" [routerLink]="link('pages','transaction')" role="link" aria-label="Voir les revenus passifs" tabindex="0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">{{ t('dashboard.kpi.passiveIncome') }}</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ passiveIncome | currency: 'EUR' }}</div>
                    </div>
                    <div class="flex items-center justify-center bg-purple-100 dark:bg-purple-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-star text-purple-500 !text-xl"></i>
                    </div>
                </div>
                <span class="text-primary font-medium">+{{ passiveIncomeChange | currency: 'EUR' }} </span>
                <span class="text-muted-color">{{ t('dashboard.kpi.thisMonth') }}</span>
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
    constructor(private i18n: I18nService, private router: Router) {}

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

