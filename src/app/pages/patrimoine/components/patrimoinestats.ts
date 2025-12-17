import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PatrimoineService } from '../../service/patrimoine.service';
import { SavingsService, SavingsStatsSummary } from '../../service/savings.service';
import { I18nService } from '../../../i18n/i18n.service';
import { AssetsStateService } from '../../service/assets-state.service';

@Component({
    standalone: true,
    selector: 'app-patrimoine-stats',
    imports: [CommonModule],
    template: `
        <div class="h-full flex flex-col gap-4">
            <!-- Card 1 - Patrimoine Total Brut (Total of all assets) -->
            <div class="card flex-1 flex flex-col items-center justify-center text-center relative group hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 border border-transparent hover:border-indigo-500/20">
                <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">Patrimoine Total Brut</span>
                <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl mb-2">{{ totalPatrimoine | currency: 'EUR':'symbol':'1.0-0' }}</div>
                <div class="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-300">
                    <i class="pi pi-wallet text-white text-lg"></i>
                </div>
                <span class="text-surface-500 dark:text-surface-400 text-xs">Somme de tous vos actifs</span>
            </div>
            
            <!-- Card 2 - Épargne Totale -->
            <div class="card flex-1 flex flex-col items-center justify-center text-center relative group hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 border border-transparent hover:border-cyan-500/20">
                <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">{{ t('dashboard.kpi.savedThisMonth') }}</span>
                <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl mb-2">{{ thisMonthSaving | currency: 'EUR':'symbol':'1.0-0' }}</div>
                <div class="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform duration-300">
                    <i class="pi pi-star text-white text-lg"></i>
                </div>
            </div>
            
            <!-- Card 3 - Variation ce mois -->
            <div class="card flex-1 flex flex-col items-center justify-center text-center relative group hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 border border-transparent hover:border-emerald-500/20">
                <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">Nombre d'actifs</span>
                <div class="text-surface-900 dark:text-surface-0 font-bold text-xl mb-2">{{ assetsCount }}</div>
                <div class="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                    <i class="pi pi-chart-line text-white text-lg"></i>
                </div>
            </div>
        </div>
    `
})
export class PatrimoineStats implements OnInit, OnDestroy {
    private patrimoineService = inject(PatrimoineService);
    private savingsService = inject(SavingsService);
    private stateService = inject(AssetsStateService);
    private i18n = inject(I18nService);
    private subscription?: Subscription;

    totalPatrimoine = 0;
    thisMonthSaving = 0;
    assetsCount = 0;

    ngOnInit() {
        this.loadStats();
        // Subscribe to asset updates to refresh stats
        this.subscription = this.stateService.assetsUpdated$.subscribe(() => {
            this.loadStats();
        });
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

    private async loadStats() {
        // Get total patrimoine (sum of all assets)
        const assets = await this.patrimoineService.getAssets();
        this.totalPatrimoine = assets.reduce((sum, asset) => sum + asset.value, 0);
        this.assetsCount = assets.length;
        
        // Get savings stats
        const savingsStats = await this.savingsService.getStatsSummary();
        this.thisMonthSaving = savingsStats.thisMonthSaving;
    }

    t(key: string): string {
        return this.i18n.t(key);
    }
}
