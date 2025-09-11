import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransactionsService, TransactionRecord } from '../../service/transactions.service';

@Component({
    standalone: true,
    selector: 'app-transaction-stats',
    imports: [CommonModule],
    template: `
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="card mb-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">Solde Comptes Bancaires</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ totalBank | currency: 'EUR' }}</div>
                    </div>
                    <div class="flex items-center justify-center bg-green-100 dark:bg-green-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-wallet text-green-500 !text-xl"></i>
                    </div>
                </div>
                <span class="text-muted-color">Somme des entrées - sorties</span>
            </div>
        </div>
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="card mb-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">Dépenses Totales</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ totalExpense | currency: 'EUR' }}</div>
                    </div>
                    <div class="flex items-center justify-center bg-red-100 dark:bg-red-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-arrow-down text-red-500 !text-xl"></i>
                    </div>
                </div>
                <span class="text-muted-color">Toutes les dépenses</span>
            </div>
        </div>
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <div class="card mb-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">Dernier Salaire</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ lastSalaryAmount | currency: 'EUR' }}</div>
                    </div>
                    <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-briefcase text-blue-500 !text-xl"></i>
                    </div>
                </div>
                <span class="text-muted-color">Le {{ lastSalaryDate }}</span>
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

