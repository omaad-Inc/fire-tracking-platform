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
        <!-- KPI Card 1 - Patrimoine -->
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="card mb-0 cursor-pointer group hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 border border-transparent hover:border-indigo-500/20" 
                 [routerLink]="link('pages','patrimoine')" role="link" aria-label="Voir le patrimoine" tabindex="0">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">{{ t('dashboard.kpi.netWorth') }}</span>
                        <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl">{{ netWorth | currency: 'EUR':'symbol':'1.0-0' }}</div>
                    </div>
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-300">
                        <i class="pi pi-wallet text-white text-xl"></i>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm font-semibold">
                        <i class="pi pi-arrow-up text-xs mr-1"></i>
                        +12.5%
                    </span>
                    <span class="text-surface-500 dark:text-surface-400 text-sm">{{ t('dashboard.kpi.sinceLastMonth') }}</span>
                </div>
            </div>
        </div>

        <!-- KPI Card 2 - Taux d'épargne -->
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="card mb-0 cursor-pointer group hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 border border-transparent hover:border-cyan-500/20" 
                 [routerLink]="link('pages','savings')" role="link" aria-label="Voir l'épargne" tabindex="0">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">{{ t('dashboard.kpi.monthlySavingsRate') }}</span>
                        <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl">{{ savingsRate }}%</div>
                    </div>
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform duration-300">
                        <i class="pi pi-chart-line text-white text-xl"></i>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-500 text-sm font-semibold">
                        +5% ce mois
                    </span>
                    <span class="text-surface-500 dark:text-surface-400 text-sm">{{ t('dashboard.kpi.savedThisMonth') }}</span>
                </div>
            </div>
        </div>
        
        <!-- KPI Card 3 - Objectif FIRE -->
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="card mb-0 cursor-pointer group hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 border border-transparent hover:border-emerald-500/20" 
                 [routerLink]="link('pages','patrimoine')" role="link" aria-label="Voir l'objectif FIRE" tabindex="0">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">Objectif FIRE</span>
                        <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl">{{ fireProgress }}%</div>
                    </div>
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                        <i class="pi pi-flag text-white text-xl"></i>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm font-semibold">
                        12 ans restants
                    </span>
                </div>
            </div>
        </div>
    `
})
export class StatsWidget {
    netWorth = 130481;
    netWorthChange = 8025;
    savingsRate = 38;
    savingsAmount = 1200;
    fireProgress = 43;
    fireNumber = 300000;
    passiveIncome = 120;
    passiveIncomeChange = 20;
    
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


