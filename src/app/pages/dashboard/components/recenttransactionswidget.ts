import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TransactionsService, TransactionRecord } from '../../service/transactions.service';
import { I18nService } from '../../../i18n/i18n.service';

interface Transaction {
    category: string;
    description: string;
    amount: number;
    date: string;
    icon: string;
    bgClass: string;
    iconClass: string;
}

@Component({
    standalone: true,
    selector: 'app-recent-transactions-widget',
    imports: [CommonModule, RouterModule],
    template: `
    <div class="card !mb-0 h-full">
        <div class="flex justify-between items-center mb-6">
            <div class="font-semibold text-xl text-surface-900 dark:text-surface-0">{{ t('dashboard.recentTransactions') }}</div>
            <a [routerLink]="link('pages', 'transaction')" class="text-indigo-500 hover:text-indigo-400 font-medium text-sm transition-colors">
                {{ t('common.viewMore') }} <i class="pi pi-chevron-right text-xs ml-1"></i>
            </a>
        </div>
        <div class="space-y-4">
            <div *ngFor="let tx of transactions" 
                 class="flex items-center p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors group">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center mr-4" [ngClass]="tx.bgClass">
                    <i [class]="tx.icon" [ngClass]="tx.iconClass"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-medium text-surface-900 dark:text-surface-0 truncate">{{ tx.category }}</div>
                    <div class="text-surface-500 dark:text-surface-400 text-sm truncate">{{ tx.description }}</div>
                </div>
                <div class="flex flex-col items-end ml-4">
                    <span class="font-bold" [ngClass]="tx.amount < 0 ? 'text-rose-500' : 'text-emerald-500'">
                        {{ tx.amount >= 0 ? '+' : '' }}{{ tx.amount | currency:'EUR':'symbol':'1.0-0' }}
                    </span>
                    <span class="text-surface-400 dark:text-surface-500 text-xs mt-1">{{ tx.date }}</span>
                </div>
            </div>
        </div>
    </div>
    `
})
export class RecentTransactionsWidget {
    transactions: Transaction[] = [];
 
    constructor(private transactionsService: TransactionsService, private i18n: I18nService, private router: Router) {
        this.loadRecent();
    }

    private categoryConfig: { [key: string]: { icon: string; bgClass: string; iconClass: string } } = {
        'Salary': { icon: 'pi pi-briefcase', bgClass: 'bg-emerald-500/10', iconClass: 'text-emerald-500' },
        'Investments': { icon: 'pi pi-chart-line', bgClass: 'bg-indigo-500/10', iconClass: 'text-indigo-500' },
        'Freelance': { icon: 'pi pi-code', bgClass: 'bg-cyan-500/10', iconClass: 'text-cyan-500' },
        'Bonus': { icon: 'pi pi-star', bgClass: 'bg-amber-500/10', iconClass: 'text-amber-500' },
        'Interest': { icon: 'pi pi-percentage', bgClass: 'bg-teal-500/10', iconClass: 'text-teal-500' },
        'Side Hustle': { icon: 'pi pi-bolt', bgClass: 'bg-violet-500/10', iconClass: 'text-violet-500' },
        'Groceries': { icon: 'pi pi-shopping-cart', bgClass: 'bg-rose-500/10', iconClass: 'text-rose-500' },
        'Dining': { icon: 'pi pi-heart', bgClass: 'bg-pink-500/10', iconClass: 'text-pink-500' },
        'Gifts': { icon: 'pi pi-gift', bgClass: 'bg-purple-500/10', iconClass: 'text-purple-500' },
        'Education': { icon: 'pi pi-book', bgClass: 'bg-blue-500/10', iconClass: 'text-blue-500' },
        'Home Maintenance': { icon: 'pi pi-home', bgClass: 'bg-orange-500/10', iconClass: 'text-orange-500' },
        'Utilities': { icon: 'pi pi-bolt', bgClass: 'bg-yellow-500/10', iconClass: 'text-yellow-500' },
        'Medical': { icon: 'pi pi-heart', bgClass: 'bg-red-500/10', iconClass: 'text-red-500' },
        'Car Insurance': { icon: 'pi pi-car', bgClass: 'bg-slate-500/10', iconClass: 'text-slate-500' },
        'Child Benefit': { icon: 'pi pi-users', bgClass: 'bg-sky-500/10', iconClass: 'text-sky-500' }
    };

    private defaultConfig = { icon: 'pi pi-wallet', bgClass: 'bg-surface-500/10', iconClass: 'text-surface-500' };

    private loadRecent() {
        this.transactionsService.getRecords().then((data: TransactionRecord[]) => {
            const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const top6 = sorted.slice(0, 6);
            this.transactions = top6.map((r) => this.mapToWidget(r));
        });
    }

    private mapToWidget(r: TransactionRecord): Transaction {
        const isExpense = r.type === 'Expense';
        const config = this.categoryConfig[r.name] || this.defaultConfig;
        
        return {
            category: r.name,
            description: r.account,
            amount: isExpense ? -r.amount : r.amount,
            date: this.formatDate(r.date),
            ...config
        };
    }

    private formatDate(dateStr: string): string {
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }

    t(key: string): string {
        return this.i18n.t(key);
    }

    link(...segments: string[]): any[] {
        const url = this.router.url;
        const match = url.match(/^\/(fr|en)(?:\/|$)/);
        const lang = (match ? match[1] : 'fr') as 'fr' | 'en';
        return ['/', lang, ...segments];
    }
}
