import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TransactionsService, TransactionRecord } from '../../service/transactions.service';
import { I18nService } from '../../../i18n/i18n.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';

interface TransactionDisplay {
    id: string;
    category: string;
    description: string;
    amount: number;
    date: string;
    icon: string;
    bgClass: string;
    iconClass: string;
    account?: string;
    isTransfer?: boolean;
}

@Component({
    standalone: true,
    selector: 'app-recent-transactions-widget',
    imports: [CommonModule, RouterModule, AppAmountComponent],
    template: `
        <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 h-full">
            <div class="relative flex justify-between items-center mb-6">
                <div class="font-semibold text-xl text-surface-900 dark:text-surface-0">{{ t('dashboard.recentTransactions') }}</div>
                <a [routerLink]="link('pages', 'transaction')" class="text-brand-700 dark:text-brand-300 hover:text-brand-500 dark:hover:text-brand-200 font-medium text-sm transition-colors">
                    {{ t('common.viewMore') }} <i class="pi pi-chevron-right text-xs ml-1"></i>
                </a>
            </div>
            
            @if (loading()) {
                <div class="relative space-y-4">
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
                <div class="relative flex flex-col items-center justify-center py-8 text-center">
                    <div class="w-16 h-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
                        <i class="pi pi-list text-2xl text-surface-400"></i>
                    </div>
                    <p class="text-surface-600 dark:text-surface-400 mb-2">{{ t('dashboard.noRecentTransactions') }}</p>
                    <a [routerLink]="link('pages', 'transaction')" class="text-brand-700 dark:text-brand-300 hover:text-brand-500 dark:hover:text-brand-200 text-sm">
                        {{ t('dashboard.kpi.addTransaction') }} <i class="pi pi-arrow-right text-xs ml-1"></i>
                    </a>
                </div>
            } @else {
                <div class="relative space-y-4">
                    @for (tx of transactions(); track tx.id) {
                        <div class="flex items-center p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors group">
                            <div class="w-10 h-10 rounded-xl flex items-center justify-center mr-4" [ngClass]="tx.bgClass">
                                <i [class]="tx.icon" [ngClass]="tx.iconClass"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="font-medium text-surface-900 dark:text-surface-0 truncate">{{ tx.category }}</div>
                                <div class="text-surface-500 dark:text-surface-400 text-sm truncate">
                                    {{ tx.description }}
                                    @if (tx.account) {
                                        <span class="inline-flex items-center gap-1 ml-1 text-surface-400 dark:text-surface-500">
                                            <i class="pi pi-wallet text-[9px]"></i>{{ tx.account }}
                                        </span>
                                    }
                                </div>
                            </div>
                            <div class="flex flex-col items-end ml-4">
                                <span class="font-bold" [ngClass]="tx.isTransfer ? 'text-surface-500 dark:text-surface-400' : (tx.amount < 0 ? 'text-negative' : 'text-positive')">
                                    <app-amount [value]="tx.amount" [prefix]="tx.isTransfer ? '⇄ ' : (tx.amount >= 0 ? '+' : '-')" />
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

    /**
     * Category → icon glyph map. Chrome (icon-tile background + icon color)
     * is uniform across all categories: the +/− amount color does the
     * income/expense signaling, the icon glyph itself differentiates the
     * category. No more rainbow chrome.
     */
    private static readonly CHROME_BG = 'bg-brand-100 dark:bg-brand-700/20';
    private static readonly CHROME_FG = 'text-brand-700 dark:text-ochre-400';

    private categoryIcons: { [key: string]: string } = {
        // ── Income ──
        'salary':        'pi pi-briefcase',
        'freelance':     'pi pi-code',
        'dividends':     'pi pi-chart-bar',
        'rental_income': 'pi pi-home',
        'interest':      'pi pi-percentage',
        'gift_received': 'pi pi-gift',
        'other_income':  'pi pi-wallet',
        // ── Expenses ──
        'housing':       'pi pi-home',
        'utilities':     'pi pi-bolt',
        'groceries':     'pi pi-shopping-cart',
        'transport':     'pi pi-car',
        'health':        'pi pi-heart',
        'insurance':     'pi pi-shield',
        'entertainment': 'pi pi-play',
        'dining':        'pi pi-star',
        'shopping':      'pi pi-tag',
        'education':     'pi pi-book',
        'subscriptions': 'pi pi-calendar',
        'travel':        'pi pi-send',
        'gift_given':    'pi pi-gift',
        'taxes':         'pi pi-building',
        'savings':       'pi pi-chart-pie',
        'investment':    'pi pi-chart-line',
        'debt_payment':  'pi pi-credit-card',
        'other_expense': 'pi pi-ellipsis-h',
    };

    /** Used by the template — derived from the icon map + uniform chrome colors. */
    private categoryConfig = new Proxy({} as { [key: string]: { icon: string; bgClass: string; iconClass: string } }, {
        get: (_t, key: string) => ({
            icon: this.categoryIcons[key] ?? 'pi pi-arrow-right-arrow-left',
            bgClass: RecentTransactionsWidget.CHROME_BG,
            iconClass: RecentTransactionsWidget.CHROME_FG,
        }),
    });

    private defaultConfig = {
        icon: 'pi pi-arrow-right-arrow-left',
        bgClass: RecentTransactionsWidget.CHROME_BG,
        iconClass: RecentTransactionsWidget.CHROME_FG,
    };

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
        const isTransfer = r.type === 'Transfer';
        const config = this.categoryConfig[r.category || ''] || this.defaultConfig;

        return {
            id: r.id || '',
            category: this.catLabel(r.category, r.name),
            description: r.remarks ?? '',
            amount: isTransfer ? r.amount : (isExpense ? -r.amount : r.amount),
            isTransfer,
            date: this.formatDate(r.date),
            account: (r.fromAccountName || r.toAccountName)
                ? `${r.fromAccountName ?? '?'} → ${r.toAccountName ?? '?'}`
                : (r.accountName ?? ''),
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

    /** Localized category label, falling back to the mapped display name. */
    private catLabel(cat: string | undefined, fallback: string): string {
        const key = `categories.${cat || ''}`;
        const label = this.i18n.t(key);
        return label !== key ? label : fallback;
    }

    link(...segments: string[]): any[] {
        const url = this.router.url;
        const match = url.match(/^\/(fr|en)(?:\/|$)/);
        const lang = (match ? match[1] : 'fr') as 'fr' | 'en';
        return ['/', lang, ...segments];
    }
}
