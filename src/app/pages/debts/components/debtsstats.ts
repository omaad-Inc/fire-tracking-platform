import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DebtsService, DebtsStatsSummary } from '../../service/debts.service';

@Component({
    standalone: true,
    selector: 'app-debts-stats',
    imports: [CommonModule],
    template: `
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="card mb-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">Dette Totale</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ totalDebt | currency: 'EUR' }}</div>
                    </div>
                    <div class="flex items-center justify-center bg-red-100 dark:bg-red-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-credit-card text-red-500 !text-xl"></i>
                    </div>
                </div>
                <span class="text-primary font-medium">-{{ totalDebtChange | currency: 'EUR' }} </span>
                <span class="text-muted-color ml-2">variation ce mois</span>
            </div>
        </div>
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="card mb-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">Montant Déjà Payé</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ paidAmount | currency: 'EUR' }}</div>
                    </div>
                    <div class="flex items-center justify-center bg-green-100 dark:bg-green-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-check-circle text-green-500 !text-xl"></i>
                    </div>
                </div>
                <span class="text-primary font-medium">+{{ paidAmountChange | currency: 'EUR' }} </span>
                <span class="text-muted-color ml-2">payé ce mois</span>
            </div>
        </div>
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="card mb-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">Montant des Créances</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ receivables | currency: 'EUR' }}</div>
                    </div>
                    <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-arrow-down text-blue-500 !text-xl"></i>
                    </div>
                </div>
                <span class="text-primary font-medium">+{{ receivablesChange | currency: 'EUR' }} </span>
                <span class="text-muted-color ml-2">créances ce mois</span>
            </div>
        </div>
    `
})
export class DeptsStats {
    totalDebt = 0;
    totalDebtChange = 0;
    paidAmount = 0;
    paidAmountChange = 0;
    receivables = 0;
    receivablesChange = 0;
    nextPayment = 0;
    nextPaymentDate = '';

    constructor(private debtsService: DebtsService) {
        this.loadStats();
    }

    private loadStats() {
        this.debtsService.getStats().then((s: DebtsStatsSummary) => {
            this.totalDebt = s.totalDebt;
            this.totalDebtChange = s.totalDebtChange || 0;
            this.paidAmount = s.paidAmount;
            this.paidAmountChange = s.paidAmountChange || 0;
            this.receivables = s.receivables;
            this.receivablesChange = s.receivablesChange || 0;
        });
    }
}

