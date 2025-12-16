import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DebtsService, DebtsStatsSummary } from '../../service/debts.service';

@Component({
    standalone: true,
    selector: 'app-debts-stats',
    imports: [CommonModule],
    template: `
        <!-- Card 1 - Dette Totale -->
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="card mb-0 group hover:shadow-lg hover:shadow-rose-500/10 transition-all duration-300 border border-transparent hover:border-rose-500/20">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">Dette Totale</span>
                        <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl">{{ totalDebt | currency: 'EUR':'symbol':'1.0-0' }}</div>
                    </div>
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 shadow-lg shadow-rose-500/30 group-hover:scale-110 transition-transform duration-300">
                        <i class="pi pi-credit-card text-white text-xl"></i>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center px-2 py-1 rounded-lg bg-rose-500/10 text-rose-500 text-sm font-semibold">
                        <i class="pi pi-arrow-down text-xs mr-1"></i>
                        -{{ totalDebtChange | currency: 'EUR':'symbol':'1.0-0' }}
                    </span>
                    <span class="text-surface-500 dark:text-surface-400 text-sm">ce mois</span>
                </div>
            </div>
        </div>
        
        <!-- Card 2 - Montant Déjà Payé -->
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="card mb-0 group hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 border border-transparent hover:border-emerald-500/20">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">Montant Déjà Payé</span>
                        <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl">{{ paidAmount | currency: 'EUR':'symbol':'1.0-0' }}</div>
                    </div>
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                        <i class="pi pi-check-circle text-white text-xl"></i>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm font-semibold">
                        <i class="pi pi-arrow-up text-xs mr-1"></i>
                        +{{ paidAmountChange | currency: 'EUR':'symbol':'1.0-0' }}
                    </span>
                    <span class="text-surface-500 dark:text-surface-400 text-sm">payé ce mois</span>
                </div>
            </div>
        </div>
        
        <!-- Card 3 - Montant des Créances -->
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="card mb-0 group hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 border border-transparent hover:border-cyan-500/20">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">Montant des Créances</span>
                        <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl">{{ receivables | currency: 'EUR':'symbol':'1.0-0' }}</div>
                    </div>
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform duration-300">
                        <i class="pi pi-arrow-right text-white text-xl"></i>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-500 text-sm font-semibold">
                        <i class="pi pi-arrow-up text-xs mr-1"></i>
                        +{{ receivablesChange | currency: 'EUR':'symbol':'1.0-0' }}
                    </span>
                    <span class="text-surface-500 dark:text-surface-400 text-sm">créances ce mois</span>
                </div>
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


