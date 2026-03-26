import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TransactionsService, TransactionRecord } from '../../service/transactions.service';
import { I18nService } from '../../../i18n/i18n.service';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';

interface TransactionDisplay {
    id: string;
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
    imports: [CommonModule, RouterModule, AppCurrencyPipe],
    template: `
        <div class="card !mb-0 h-full">
            <div class="flex justify-between items-center mb-6">
                <div class="font-semibold text-xl text-surface-900 dark:text-surface-0">{{ t('dashboard.recentTransactions') }}</div>
                <a [routerLink]="link('pages', 'transaction')" class="text-indigo-500 hover:text-indigo-400 font-medium text-sm transition-colors">
                    {{ t('common.viewMore') }} <i class="pi pi-chevron-right text-xs ml-1"></i>
                </a>
            </div>
            
            @if (loading()) {
                <div class="space-y-4">
                    @for (i of [1,2,3,4,5,6]; track i) {
                        <div class="flex items-center p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50 animate-pulse">
                            <div class="w-10 h-10 rounded-xl bg-surface-200 dark:bg-surface-700 mr-4"></div>
                            <div class="flex-1">
                                <div class="h-4 bg-surface-200 dark:bg-surface-700 rounded w-24 mb-1"></div>
                                <div class="h-3 bg-surface-200 dark:bg-surface-700 rounded w-32"></div>
                            </div>
                            <div class="ml-4">
                                <div class="h-5 bg-surface-200 dark:bg-surface-700 rounded w-16"></div>
                            </div>
                        </div>
                    }
                </div>
            } @else if (transactions().length === 0) {
                <div class="flex flex-col items-center justify-center py-8 text-center">
                    <div class="w-16 h-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
                        <i class="pi pi-list text-2xl text-surface-400"></i>
                    </div>
                    <p class="text-surface-600 dark:text-surface-400 mb-2">{{ t('dashboard.noRecentTransactions') }}</p>
                    <a [routerLink]="link('pages', 'transaction')" class="text-indigo-500 hover:text-indigo-400 text-sm">
                        {{ t('dashboard.kpi.addTransaction') }} <i class="pi pi-arrow-right text-xs ml-1"></i>
                    </a>
                </div>
            } @else {
                <div class="space-y-4">
                    @for (tx of transactions(); track tx.id) {
                        <div class="flex items-center p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors group">
                            <div class="w-10 h-10 rounded-xl flex items-center justify-center mr-4" [ngClass]="tx.bgClass">
                                <i [class]="tx.icon" [ngClass]="tx.iconClass"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="font-medium text-surface-900 dark:text-surface-0 truncate">{{ tx.category }}</div>
                                <div class="text-surface-500 dark:text-surface-400 text-sm truncate">{{ tx.description }}</div>
                            </div>
                            <div class="flex flex-col items-end ml-4">
                                <span class="font-bold" [ngClass]="tx.amount < 0 ? 'text-rose-500' : 'text-emerald-500'">
                                    {{ tx.amount >= 0 ? '+' : '' }}{{ tx.amount | appCurrency }}
                                </span>
                                <span class="text-surface-400 dark:text-surface-500 text-xs mt-1">{{ tx.date }}</span>
                            </div>
                        </div>
                    }
                </div>
            }
        </div>
    `
})
export class RecentTransactionsWidget implements OnInit {
    private transactionsService = inject(TransactionsService);
    private i18n = inject(I18nService);
    private router = inject(Router);

    loading = signal(true);
    transactions = signal<TransactionDisplay[]>([]);

    private categoryConfig: { [key: string]: { icon: string; bgClass: string; iconClass: string } } = {
        // ── Income ──
        'salary':        { icon: 'pi pi-briefcase',   bgClass: 'bg-emerald-500/10', iconClass: 'text-emerald-500' },
        'freelance':     { icon: 'pi pi-code',         bgClass: 'bg-cyan-500/10',    iconClass: 'text-cyan-500' },
        'dividends':     { icon: 'pi pi-chart-bar',    bgClass: 'bg-indigo-500/10',  iconClass: 'text-indigo-500' },
        'rental_income': { icon: 'pi pi-home',         bgClass: 'bg-orange-500/10',  iconClass: 'text-orange-500' },
        'interest':      { icon: 'pi pi-percentage',   bgClass: 'bg-teal-500/10',    iconClass: 'text-teal-500' },
        'gift_received': { icon: 'pi pi-gift',         bgClass: 'bg-pink-500/10',    iconClass: 'text-pink-500' },
        'other_income':  { icon: 'pi pi-wallet',       bgClass: 'bg-green-500/10',   iconClass: 'text-green-500' },
        // ── Expenses ──
        'housing':       { icon: 'pi pi-home',         bgClass: 'bg-orange-500/10',  iconClass: 'text-orange-500' },
        'utilities':     { icon: 'pi pi-bolt',         bgClass: 'bg-yellow-500/10',  iconClass: 'text-yellow-500' },
        'groceries':     { icon: 'pi pi-shopping-cart',bgClass: 'bg-rose-500/10',    iconClass: 'text-rose-500' },
        'transport':     { icon: 'pi pi-car',          bgClass: 'bg-sky-500/10',     iconClass: 'text-sky-500' },
        'health':        { icon: 'pi pi-heart',        bgClass: 'bg-red-500/10',     iconClass: 'text-red-500' },
        'insurance':     { icon: 'pi pi-shield',       bgClass: 'bg-slate-500/10',   iconClass: 'text-slate-500' },
        'entertainment': { icon: 'pi pi-play',         bgClass: 'bg-pink-500/10',    iconClass: 'text-pink-500' },
        'dining':        { icon: 'pi pi-star',         bgClass: 'bg-amber-500/10',   iconClass: 'text-amber-500' },
        'shopping':      { icon: 'pi pi-tag',          bgClass: 'bg-purple-500/10',  iconClass: 'text-purple-500' },
        'education':     { icon: 'pi pi-book',         bgClass: 'bg-blue-500/10',    iconClass: 'text-blue-500' },
        'subscriptions': { icon: 'pi pi-calendar',     bgClass: 'bg-violet-500/10',  iconClass: 'text-violet-500' },
        'travel':        { icon: 'pi pi-send',         bgClass: 'bg-teal-500/10',    iconClass: 'text-teal-500' },
        'gift_given':    { icon: 'pi pi-gift',         bgClass: 'bg-fuchsia-500/10', iconClass: 'text-fuchsia-500' },
        'taxes':         { icon: 'pi pi-building',     bgClass: 'bg-gray-500/10',    iconClass: 'text-gray-500' },
        'savings':       { icon: 'pi pi-chart-pie',    bgClass: 'bg-emerald-500/10', iconClass: 'text-emerald-500' },
        'investment':    { icon: 'pi pi-chart-line',   bgClass: 'bg-indigo-500/10',  iconClass: 'text-indigo-500' },
        'debt_payment':  { icon: 'pi pi-credit-card',  bgClass: 'bg-amber-500/10',   iconClass: 'text-amber-500' },
        'other_expense': { icon: 'pi pi-ellipsis-h',   bgClass: 'bg-surface-500/10', iconClass: 'text-surface-500' },
    };

    private defaultConfig = { icon: 'pi pi-arrow-right-arrow-left', bgClass: 'bg-surface-500/10', iconClass: 'text-surface-500' };

    async ngOnInit() {
        await this.loadRecent();
    }

    private async loadRecent() {
        this.loading.set(true);
        try {
            const data = await this.transactionsService.getRecentTransactions(6);
            const mapped = data.map((r) => this.mapToWidget(r));
            this.transactions.set(mapped);
        } catch (error) {
            console.error('Error loading transactions:', error);
            this.transactions.set([]);
        } finally {
            this.loading.set(false);
        }
    }

    private mapToWidget(r: TransactionRecord): TransactionDisplay {
        const isExpense = r.type === 'Expense';
        const config = this.categoryConfig[r.category || ''] || this.defaultConfig;
        
        return {
            id: r.id || '',
            category: r.name,
            description: r.remarks || r.account,
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
