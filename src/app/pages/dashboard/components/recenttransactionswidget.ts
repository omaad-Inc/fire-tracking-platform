import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TransactionsService, TransactionRecord } from '../../service/transactions.service';
import { I18nService } from '../../../i18n/i18n.service';

interface Transaction {
    category: string;
    description: string;
    amount: number;
    date: string;
    color: string;
}

@Component({
    standalone: true,
    selector: 'app-recent-transactions-widget',
    imports: [CommonModule, RouterModule],
    template: `
    <div class="card !mb-8 h-full">
        <div class="flex justify-between items-center mb-4">
            <div class="font-semibold text-xl">{{ t('dashboard.recentTransactions') }}</div>
            <a [routerLink]="['/pages/transaction']" class="text-primary font-medium text-sm">{{ t('common.viewMore') }}</a>
        </div>
        <div *ngFor="let tx of transactions" class="flex items-center py-4 border-b last:border-b-0 border-surface-200 dark:border-surface-700">
            <div class="flex items-center justify-center rounded-full mr-4 shrink-0" [ngStyle]="{'background': tx.color, 'width': '2.5rem', 'height': '2.5rem'}">
                <span class="text-white font-bold text-lg">{{ tx.category[0] }}</span>
            </div>
            <div class="flex-1">
                <div class="font-semibold text-surface-900 dark:text-surface-0">{{ tx.category }}</div>
                <div class="text-muted-color text-sm">{{ tx.description }}</div>
            </div>
            <div class="flex flex-col items-end ml-4">
                <span class="font-semibold" [ngClass]="tx.amount < 0 ? 'text-red-500' : 'text-green-600'">{{ tx.amount | currency:'EUR':'symbol':'1.0-0' }}</span>
                <span class="text-muted-color text-xs mt-1">{{ tx.date }}</span>
            </div>
        </div>
    </div>
    `
})
export class RecentTransactionsWidget {
    transactions: Transaction[] = [];
 
    constructor(private transactionsService: TransactionsService, private i18n: I18nService) {
        this.loadRecent();
    }

    private expensePalette = ['#ef4444', '#f97316', '#f59e0b', '#e11d48', '#dc2626', '#b91c1c'];
    private incomePalette = ['#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6'];

    private loadRecent() {
        this.transactionsService.getRecords().then((data: TransactionRecord[]) => {
            const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const top7 = sorted.slice(0, 7);
            this.transactions = top7.map((r) => this.mapToWidget(r));
        });
    }

    private mapToWidget(r: TransactionRecord): Transaction {
        const isExpense = r.type === 'Expense';
        return {
            category: r.name,
            description: r.account,
            amount: isExpense ? -r.amount : r.amount,
            date: r.date,
            color: this.pickColor(r.name || r.account, isExpense)
        };
    }

    private pickColor(key: string, isExpense: boolean): string {
        const palette = isExpense ? this.expensePalette : this.incomePalette;
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
        }
        return palette[hash % palette.length];
    }

    t(key: string): string {
        return this.i18n.t(key);
    }
}
