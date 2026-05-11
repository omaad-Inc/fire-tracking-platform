import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { DebtsService, DebtsStatsSummary } from '../../service/debts.service';
import { AssetsStateService } from '../../service/assets-state.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';

@Component({
    standalone: true,
    selector: 'app-debts-stats',
    imports: [CommonModule, AppAmountComponent],
    template: `
        <!-- Card 1 - Dette Totale -->
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 hover:border-brand-300 dark:hover:border-brand-700 p-5 group transition-all duration-300">
                <div class="absolute inset-0 bg-gradient-to-br from-surface-50 via-surface-50 to-negative/5 dark:from-surface-800 dark:via-surface-800/90 dark:to-surface-900"></div>
                <div class="absolute top-3 right-3 w-14 h-14 rounded-full bg-negative/10 dark:bg-negative/5 blur-md"></div>
                <div class="relative flex justify-between items-start mb-4">
                    <div>
                        <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">Dette Totale</span>
                        <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl"><app-amount [value]="totalDebt" /></div>
                    </div>
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-white/80 dark:bg-surface-700/80 backdrop-blur shadow-sm group-hover:scale-110 transition-transform duration-300">
                        <i class="pi pi-credit-card text-negative text-xl"></i>
                    </div>
                </div>
                <div class="relative flex items-center gap-2">
                    <span class="text-surface-500 dark:text-surface-400 text-sm">Somme de toutes vos dettes</span>
                </div>
            </div>
        </div>
        
        <!-- Card 2 - Dernier Paiement -->
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 hover:border-brand-300 dark:hover:border-brand-700 p-5 group transition-all duration-300">
                <div class="absolute inset-0 bg-gradient-to-br from-surface-50 via-surface-50 to-positive/5 dark:from-surface-800 dark:via-surface-800/90 dark:to-surface-900"></div>
                <div class="absolute top-3 right-3 w-14 h-14 rounded-full bg-positive/10 dark:bg-positive/5 blur-md"></div>
                <div class="relative flex justify-between items-start mb-4">
                    <div>
                        <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">Dernier Paiement</span>
                        <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl"><app-amount [value]="paidAmount" /></div>
                    </div>
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-white/80 dark:bg-surface-700/80 backdrop-blur shadow-sm group-hover:scale-110 transition-transform duration-300">
                        <i class="pi pi-check-circle text-positive text-xl"></i>
                    </div>
                </div>
                <div class="relative flex items-center gap-2">
                    @if (lastPaymentDate) {
                        <span class="text-surface-500 dark:text-surface-400 text-sm">{{ lastPaymentDate }}</span>
                    } @else {
                        <span class="text-surface-500 dark:text-surface-400 text-sm">Aucun paiement récent</span>
                    }
                </div>
            </div>
        </div>
        
        <!-- Card 3 - Montant des Créances -->
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 hover:border-brand-300 dark:hover:border-brand-700 p-5 group transition-all duration-300">
                <div class="absolute inset-0 bg-gradient-to-br from-brand-50/50 via-surface-50 to-surface-100 dark:from-brand-900/15 dark:via-surface-800 dark:to-surface-900"></div>
                <div class="absolute top-3 right-3 w-14 h-14 rounded-full bg-brand-100/30 dark:bg-brand-800/10 blur-md"></div>
                <div class="relative flex justify-between items-start mb-4">
                    <div>
                        <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">Montant des Créances</span>
                        <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl"><app-amount [value]="receivables" /></div>
                    </div>
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-white/80 dark:bg-surface-700/80 backdrop-blur shadow-sm group-hover:scale-110 transition-transform duration-300">
                        <i class="pi pi-arrow-right text-brand-700 dark:text-brand-300 text-xl"></i>
                    </div>
                </div>
                <div class="relative flex items-center gap-2">
                    <span class="text-surface-500 dark:text-surface-400 text-sm">Somme de vos créances</span>
                </div>
            </div>
        </div>
    `
})
export class DeptsStats implements OnInit, OnDestroy {
    private debtsService = inject(DebtsService);
    private stateService = inject(AssetsStateService);
    private subscription?: Subscription;

    totalDebt = 0;
    totalDebtChange = 0;
    paidAmount = 0;
    paidAmountChange = 0;
    receivables = 0;
    receivablesChange = 0;
    lastPaymentDate = '';

    ngOnInit() {
        this.loadStats();
        // Subscribe to debt updates to refresh stats
        this.subscription = this.stateService.debtsUpdated$.subscribe(() => {
            this.loadStats();
        });
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

    private loadStats() {
        this.debtsService.getStats().then((s: DebtsStatsSummary) => {
            this.totalDebt = s.totalDebt;
            this.totalDebtChange = s.totalDebtChange || 0;
            this.paidAmount = s.paidAmount;
            this.paidAmountChange = s.paidAmountChange || 0;
            this.receivables = s.receivables;
            this.receivablesChange = s.receivablesChange || 0;
            this.lastPaymentDate = s.lastPaymentDate || '';
        });
    }
}


