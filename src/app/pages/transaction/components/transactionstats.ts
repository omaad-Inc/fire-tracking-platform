import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransactionsService, TransactionRecord } from '../../service/transactions.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';

@Component({
    standalone: true,
    selector: 'app-transaction-stats',
    imports: [CommonModule, AppAmountComponent],
    template: `
        <!-- Card 1 - Solde Comptes Bancaires -->
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="card mb-0 group hover:shadow-lifted transition-all duration-300 border border-transparent hover:border-brand-200/60 dark:hover:border-brand-700/60">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">Solde Comptes Bancaires</span>
                        <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl"><app-amount [value]="totalBank" /></div>
                    </div>
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-brand-700 dark:bg-brand-300 shadow-card group-hover:scale-110 transition-transform duration-300">
                        <i class="pi pi-wallet text-white text-xl"></i>
                    </div>
                </div>
                <span class="text-surface-500 dark:text-surface-400 text-sm">Somme des entrées - sorties</span>
            </div>
        </div>
        
        <!-- Card 2 - Dépenses Totales -->
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="card mb-0 group hover:shadow-lifted transition-all duration-300 border border-transparent hover:border-brand-200/60 dark:hover:border-brand-700/60">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">Dépenses Totales</span>
                        <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl"><app-amount [value]="totalExpense" /></div>
                    </div>
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-negative shadow-card group-hover:scale-110 transition-transform duration-300">
                        <i class="pi pi-arrow-down text-white text-xl"></i>
                    </div>
                </div>
                <span class="text-surface-500 dark:text-surface-400 text-sm">Toutes les dépenses</span>
            </div>
        </div>
        
        <!-- Card 3 - Dernier Salaire -->
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="card mb-0 group hover:shadow-lifted transition-all duration-300 border border-transparent hover:border-brand-200/60 dark:hover:border-brand-700/60">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">Dernier Salaire</span>
                        <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl"><app-amount [value]="lastSalaryAmount" /></div>
                    </div>
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-positive shadow-card group-hover:scale-110 transition-transform duration-300">
                        <i class="pi pi-briefcase text-white text-xl"></i>
                    </div>
                </div>
                <span class="text-surface-500 dark:text-surface-400 text-sm">Le {{ lastSalaryDate }}</span>
            </div>
        </div>
    `
})
export class TransactionStats {
    totalBank = 0;
    totalExpense = 0;
    lastSalaryAmount = 0;
    lastSalaryDate = '';

    constructor(private transactionsService: TransactionsService) {
        this.computeStats();
    }

    private computeStats() {
        this.transactionsService.getRecords().then((records: TransactionRecord[]) => {
            const signedTotal = records.reduce((sum, r) => sum + (r.type === 'Income' ? r.amount : -r.amount), 0);
            this.totalBank = signedTotal;

            this.totalExpense = records.filter((r) => r.type === 'Expense').reduce((sum, r) => sum + r.amount, 0);

            const salaries = records
                .filter((r) => r.type === 'Income' && (r.name || '').toLowerCase().includes('salary'))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            if (salaries.length) {
                this.lastSalaryAmount = salaries[0].amount;
                this.lastSalaryDate = salaries[0].date;
            } else {
                this.lastSalaryAmount = 0;
                this.lastSalaryDate = '';
            }
        });
    }
}
