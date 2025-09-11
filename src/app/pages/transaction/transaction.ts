import { Component } from '@angular/core';
import { TransactionLogs } from './components/transactionslogs';
import { TransactionStats } from './components/transactionstats';

@Component({
    selector: 'app-transaction-page',
    standalone: true,
    imports: [TransactionLogs, TransactionStats],
    template: `
        <div class="grid grid-cols-12 gap-8">
            <app-transaction-stats class="contents" />
            
            <div class="col-span-12">
                <app-transaction-logs />
            </div>
        </div>
    `
})
export class Transaction {}
