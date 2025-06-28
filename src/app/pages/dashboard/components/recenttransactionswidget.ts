import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

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
    imports: [CommonModule],
    template: `
    <div class="card !mb-8">
        <div class="flex justify-between items-center mb-4">
            <div class="font-semibold text-xl">Recent Transactions</div>
            <a href="#" class="text-primary font-medium text-sm">View More</a>
        </div>
        <div *ngFor="let tx of paginatedTransactions()" class="flex items-center py-4 border-b last:border-b-0 border-surface-200 dark:border-surface-700">
            <div class="flex items-center justify-center rounded-full mr-4 shrink-0" [ngStyle]="{'background': tx.color, 'width': '2.5rem', 'height': '2.5rem'}">
                <span class="text-white font-bold text-lg">{{ tx.category[0] }}</span>
            </div>
            <div class="flex-1">
                <div class="font-semibold text-surface-900 dark:text-surface-0">{{ tx.category }}</div>
                <div class="text-muted-color text-sm">{{ tx.description }}</div>
            </div>
            <div class="flex flex-col items-end ml-4">
                <span class="font-semibold text-red-500">-{{ tx.amount | currency:'USD':'symbol':'1.0-0' }}</span>
                <span class="text-muted-color text-xs mt-1">{{ tx.date }}</span>
            </div>
        </div>
        <div class="flex justify-end gap-2 mt-4">
            <button class="px-3 py-1 rounded border text-sm" [disabled]="currentPage === 1" (click)="prevPage()">Previous</button>
            <button class="px-3 py-1 rounded border text-sm" [disabled]="currentPage === totalPages()" (click)="nextPage()">Next</button>
        </div>
    </div>
    `
})
export class RecentTransactionsWidget {
    transactions: Transaction[] = [
        {
            category: 'Shopping',
            description: 'Clothing',
            amount: 250,
            date: '12/25/2024',
            color: '#2563eb' // blue
        },
        {
            category: 'Home Maintenance',
            description: 'Plumbing repair',
            amount: 300,
            date: '1/30/2025',
            color: '#0e7490' // teal
        },
        {
            category: 'Education',
            description: 'Online course',
            amount: 200,
            date: '2/15/2025',
            color: '#0369a1' // blue dark
        },
        {
            category: 'Gifts',
            description: 'Wedding gift',
            amount: 150,
            date: '3/1/2025',
            color: '#334155' // slate
        },
        {
            category: 'Groceries',
            description: 'Supermarket',
            amount: 120,
            date: '3/5/2025',
            color: '#16a34a' // green
        },
        {
            category: 'Transport',
            description: 'Bus ticket',
            amount: 30,
            date: '3/6/2025',
            color: '#f59e42' // orange
        }
    ];
    pageSize = 4;
    currentPage = 1;

    paginatedTransactions() {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.transactions.slice(start, start + this.pageSize);
    }

    totalPages() {
        return Math.ceil(this.transactions.length / this.pageSize);
    }

    nextPage() {
        if (this.currentPage < this.totalPages()) {
            this.currentPage++;
        }
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
        }
    }
}
