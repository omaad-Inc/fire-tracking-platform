import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TransactionLogs }     from './components/transactionslogs';
import { TransactionsSummary } from './components/transactionssummary';
import { RecurringPage }       from '../recurring/recurring';
import { BudgetPage }          from '../budget/budget';
import { I18nService }         from '../../i18n/i18n.service';

type TxTab = 'transactions' | 'recurring' | 'budgets';

@Component({
    selector: 'app-transaction-page',
    standalone: true,
    imports: [TransactionLogs, TransactionsSummary, RecurringPage, BudgetPage],
    template: `
        <!-- Segmented tabs: recurring lives here (a companion of transactions),
             not as a separate nav destination — works the same on mobile. -->
        <div class="mb-5">
            <div class="inline-flex rounded-xl bg-surface-100 dark:bg-surface-800 p-1" role="tablist">
                <button role="tab" [attr.aria-selected]="tab() === 'transactions'"
                        (click)="setTab('transactions')" [class]="tabClass('transactions')">
                    {{ t('menu.transactions') }}
                </button>
                <button role="tab" [attr.aria-selected]="tab() === 'recurring'"
                        (click)="setTab('recurring')" [class]="tabClass('recurring')">
                    {{ t('menu.recurring') }}
                </button>
                <button role="tab" [attr.aria-selected]="tab() === 'budgets'"
                        (click)="setTab('budgets')" [class]="tabClass('budgets')" data-testid="tab-budgets">
                    {{ t('menu.budgets') }}
                </button>
            </div>
        </div>

        @if (tab() === 'transactions') {
            <div class="grid grid-cols-12 gap-6">
                <div class="col-span-12 xl:col-span-8">
                    <app-transaction-logs (monthChanged)="selectedMonth.set($event)" />
                </div>
                <div class="col-span-12 xl:col-span-4">
                    <app-transactions-summary [yearMonth]="selectedMonth()" />
                </div>
            </div>
        } @else if (tab() === 'recurring') {
            <app-recurring [embedded]="true" />
        } @else {
            <app-budget [embedded]="true" />
        }
    `
})
export class Transaction {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private i18n = inject(I18nService);
    t(key: string): string { return this.i18n.t(key); }

    tab = signal<TxTab>((['recurring', 'budgets'].includes(this.route.snapshot.queryParamMap.get('view') ?? '')
        ? this.route.snapshot.queryParamMap.get('view')
        : 'transactions') as TxTab);

    selectedMonth = signal(
        (() => {
            const n = new Date();
            return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
        })()
    );

    setTab(tab: TxTab) {
        this.tab.set(tab);
        // Keep the view deep-linkable / back-consistent without a full navigation.
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { view: tab === 'transactions' ? null : tab },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }

    tabClass(tab: TxTab): string {
        const base = 'px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 ease-standard cursor-pointer';
        return this.tab() === tab
            ? `${base} bg-surface-0 dark:bg-surface-950 text-brand-700 dark:text-ochre-400 shadow-card`
            : `${base} text-surface-500 dark:text-surface-400`;
    }
}
