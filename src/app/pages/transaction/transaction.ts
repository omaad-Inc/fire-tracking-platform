import { Component, signal } from '@angular/core';
import { TransactionLogs }     from './components/transactionslogs';
import { TransactionsSummary } from './components/transactionssummary';

@Component({
    selector: 'app-transaction-page',
    standalone: true,
    imports: [TransactionLogs, TransactionsSummary],
    template: `
        <div class="grid grid-cols-12 gap-6">
            <!-- Main list (left, 8 cols) -->
            <div class="col-span-12 xl:col-span-8">
                <app-transaction-logs (monthChanged)="selectedMonth.set($event)" />
            </div>

            <!-- Summary panel (right, 4 cols) -->
            <div class="col-span-12 xl:col-span-4">
                <app-transactions-summary [yearMonth]="selectedMonth()" />
            </div>
        </div>
    `
})
export class Transaction {
    selectedMonth = signal(
        (() => {
            const n = new Date();
            return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
        })()
    );
}
