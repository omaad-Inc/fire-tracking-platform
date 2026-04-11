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
        <!-- Card 1 - Dette Totale (Sum of all debts with type "Debt") -->
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="card mb-0 group hover:shadow-lg hover:shadow-rose-500/10 transition-all duration-300 border border-transparent hover:border-rose-500/20">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">Dette Totale</span>
                        <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl"><app-amount [value]="totalDebt" /></div>
                    </div>
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 shadow-lg shadow-rose-500/30 group-hover:scale-110 transition-transform duration-300">
                        <i class="pi pi-credit-card text-white text-xl"></i>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-surface-500 dark:text-surface-400 text-sm">Somme de toutes vos dettes</span>
                </div>
            </div>
        </div>
        
        <!-- Card 2 - Dernier Paiement -->
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="card mb-0 group hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 border border-transparent hover:border-emerald-500/20">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">Dernier Paiement</span>
                        <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl"><app-amount [value]="paidAmount" /></div>
                    </div>
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                        <i class="pi pi-check-circle text-white text-xl"></i>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    @if (lastPaymentDate) {
                        <span class="text-surface-500 dark:text-surface-400 text-sm">{{ lastPaymentDate }}</span>
                    } @else {
                        <span class="text-surface-500 dark:text-surface-400 text-sm">Aucun paiement récent</span>
                    }
                </div>
            </div>
        </div>
        
        <!-- Card 3 - Montant des Créances (Sum of all debts with type "Receivable") -->
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="card mb-0 group hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 border border-transparent hover:border-cyan-500/20">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">Montant des Créances</span>
                        <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl"><app-amount [value]="receivables" /></div>
                    </div>
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform duration-300">
                        <i class="pi pi-arrow-right text-white text-xl"></i>
                    </div>
                </div>
                <div class="flex items-center gap-2">
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


