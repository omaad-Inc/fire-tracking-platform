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
            <div class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 hover:border-brand-300 dark:hover:border-brand-700 p-5 group transition-all duration-300">
                <div class="absolute inset-0 bg-gradient-to-br from-brand-50 via-surface-50 to-surface-100 dark:from-brand-900/20 dark:via-surface-800 dark:to-surface-900"></div>
                <div class="absolute top-3 right-3 w-16 h-16 rounded-full bg-brand-100/40 dark:bg-brand-800/20 blur-md"></div>
                <div class="relative flex justify-between items-start mb-4">
                    <div>
                        <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">Solde Comptes Bancaires</span>
                        <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl"><app-amount [value]="totalBank" /></div>
                    </div>
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-white/80 dark:bg-surface-700/80 backdrop-blur shadow-sm group-hover:scale-110 transition-transform duration-300">
                        <i class="pi pi-wallet text-brand-700 dark:text-brand-300 text-xl"></i>
                    </div>
                </div>
                <span class="relative text-surface-500 dark:text-surface-400 text-sm">Somme des entrées - sorties</span>
            </div>
        </div>
        
        <!-- Card 2 - Dépenses Totales -->
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 hover:border-brand-300 dark:hover:border-brand-700 p-5 group transition-all duration-300">
                <div class="absolute inset-0 bg-gradient-to-br from-surface-50 via-surface-50 to-negative/5 dark:from-surface-800 dark:via-surface-800/90 dark:to-surface-900"></div>
                <div class="absolute top-3 right-3 w-14 h-14 rounded-full bg-negative/10 dark:bg-negative/5 blur-md"></div>
                <div class="relative flex justify-between items-start mb-4">
                    <div>
                        <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">Dépenses Totales</span>
                        <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl"><app-amount [value]="totalExpense" /></div>
                    </div>
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-white/80 dark:bg-surface-700/80 backdrop-blur shadow-sm group-hover:scale-110 transition-transform duration-300">
                        <i class="pi pi-arrow-down text-negative text-xl"></i>
                    </div>
                </div>
                <span class="relative text-surface-500 dark:text-surface-400 text-sm">Toutes les dépenses</span>
            </div>
        </div>
        
        <!-- Card 3 - Dernier Salaire -->
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 hover:border-brand-300 dark:hover:border-brand-700 p-5 group transition-all duration-300">
                <div class="absolute inset-0 bg-gradient-to-br from-surface-50 via-surface-50 to-positive/5 dark:from-surface-800 dark:via-surface-800/90 dark:to-surface-900"></div>
                <div class="absolute top-3 right-3 w-14 h-14 rounded-full bg-positive/10 dark:bg-positive/5 blur-md"></div>
                <div class="relative flex justify-between items-start mb-4">
                    <div>
                        <span class="block text-surface-500 dark:text-surface-400 text-sm font-medium mb-2">Dernier Salaire</span>
                        <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl"><app-amount [value]="lastSalaryAmount" /></div>
                    </div>
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-white/80 dark:bg-surface-700/80 backdrop-blur shadow-sm group-hover:scale-110 transition-transform duration-300">
                        <i class="pi pi-briefcase text-positive text-xl"></i>
                    </div>
                </div>
                <span class="relative text-surface-500 dark:text-surface-400 text-sm">Le {{ lastSalaryDate }}</span>
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
