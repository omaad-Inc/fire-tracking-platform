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
        <!-- Card 1 - Je dois (dettes) -->
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700 hover:shadow-sm p-5 transition-all duration-200">
                <div class="flex justify-between items-start mb-4">
                    <div class="min-w-0">
                        <span class="block text-surface-500 text-sm font-medium mb-2">Je dois</span>
                        <div class="text-negative font-bold text-2xl"><app-amount [value]="totalDebt" /></div>
                    </div>
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-negative-50 dark:bg-negative-500/15 shrink-0">
                        <i class="pi pi-arrow-up-right text-negative dark:text-negative-400 text-xl"></i>
                    </div>
                </div>
                <span class="text-surface-500 text-sm">Total de vos dettes</span>
            </div>
        </div>

        <!-- Card 2 - On me doit (créances) -->
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700 hover:shadow-sm p-5 transition-all duration-200">
                <div class="flex justify-between items-start mb-4">
                    <div class="min-w-0">
                        <span class="block text-surface-500 text-sm font-medium mb-2">On me doit</span>
                        <div class="text-positive font-bold text-2xl"><app-amount [value]="receivables" /></div>
                    </div>
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-positive-50 dark:bg-positive-500/15 shrink-0">
                        <i class="pi pi-arrow-down-left text-positive-600 dark:text-positive-400 text-xl"></i>
                    </div>
                </div>
                <span class="text-surface-500 text-sm">Total de vos créances</span>
            </div>
        </div>

        <!-- Card 3 - Dernier paiement -->
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700 hover:shadow-sm p-5 transition-all duration-200">
                <div class="flex justify-between items-start mb-4">
                    <div class="min-w-0">
                        <span class="block text-surface-500 text-sm font-medium mb-2">Dernier paiement</span>
                        <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl"><app-amount [value]="paidAmount" /></div>
                    </div>
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-700/20 shrink-0">
                        <i class="pi pi-check-circle text-brand-700 dark:text-ochre-400 text-xl"></i>
                    </div>
                </div>
                @if (lastPaymentDate) {
                    <span class="text-surface-500 text-sm">{{ lastPaymentDate }}</span>
                } @else {
                    <span class="text-surface-500 text-sm">Aucun paiement récent</span>
                }
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


