import { Component, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransactionsService, MonthlySummary } from '../../service/transactions.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';

@Component({
    selector: 'app-transactions-summary',
    standalone: true,
    imports: [CommonModule, AppAmountComponent],
    template: `
        <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 h-full flex flex-col gap-5">
            <!-- Header -->
            <div class="relative">
                <h3 class="text-base font-semibold text-surface-900 dark:text-surface-0 m-0">{{ monthTitle }}</h3>
                <p class="text-surface-400 text-xs mt-0.5">Résumé financier</p>
            </div>

            @if (loading()) {
                <div class="relative space-y-3">
                    @for (i of [1,2,3]; track i) {
                        <div class="h-10 bg-surface-100 dark:bg-surface-800 rounded-xl animate-pulse"></div>
                    }
                </div>
            } @else if (summary()) {
                <!-- Net flow pill -->
                <div class="relative flex items-center justify-between p-3 rounded-xl"
                     [ngClass]="(summary()!.net >= 0) ? 'bg-positive-50 dark:bg-positive-500/15' : 'bg-negative-50 dark:bg-negative-500/15'">
                    <span class="text-sm font-medium"
                          [ngClass]="(summary()!.net >= 0) ? 'text-positive' : 'text-negative'">
                        {{ summary()!.net >= 0 ? 'Solde positif' : 'Solde négatif' }}
                    </span>
                    <span class="text-lg font-bold"
                          [ngClass]="(summary()!.net >= 0) ? 'text-positive' : 'text-negative'">
                        {{ summary()!.net >= 0 ? '+' : '−' }}<app-amount [value]="summary()!.net" />
                    </span>
                </div>

                <!-- Income / Expense rows -->
                <div class="relative space-y-3">
                    <!-- Income -->
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <div class="w-7 h-7 rounded-lg bg-positive-50 dark:bg-positive-500/15 flex items-center justify-center">
                                <i class="pi pi-arrow-down-left text-positive-600 dark:text-positive-400 text-xs"></i>
                            </div>
                            <span class="text-sm text-surface-600 dark:text-surface-400">Revenus</span>
                        </div>
                        <span class="text-sm font-semibold text-positive">
                            +<app-amount [value]="summary()!.income" />
                        </span>
                    </div>
                    <!-- Expense -->
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <div class="w-7 h-7 rounded-lg bg-negative-50 dark:bg-negative-500/15 flex items-center justify-center">
                                <i class="pi pi-arrow-up-right text-negative-600 dark:text-negative-400 text-xs"></i>
                            </div>
                            <span class="text-sm text-surface-600 dark:text-surface-400">Dépenses</span>
                        </div>
                        <span class="text-sm font-semibold text-negative">
                            −<app-amount [value]="summary()!.expenses" />
                        </span>
                    </div>
                </div>

                <!-- Divider -->
                <div class="relative h-px bg-surface-200 dark:bg-surface-700"></div>

                <!-- By category -->
                @if (summary()!.byCategory.length > 0) {
                    <div class="relative">
                        <p class="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-3">
                            Répartition des dépenses
                        </p>
                        <div class="space-y-3">
                            @for (cat of summary()!.byCategory; track cat.category) {
                                <div>
                                    <div class="flex items-center justify-between mb-1">
                                        <span class="text-xs text-surface-600 dark:text-surface-400 truncate max-w-[130px]">
                                            {{ cat.label }}
                                        </span>
                                        <div class="flex items-center gap-2">
                                            <span class="text-xs text-surface-400">{{ cat.pct }}%</span>
                                            <span class="text-xs font-semibold text-surface-900 dark:text-surface-0">
                                                <app-amount [value]="cat.amount" />
                                            </span>
                                        </div>
                                    </div>
                                    <div class="h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                                        <div class="h-full rounded-full transition-all duration-500"
                                             [style.width]="cat.pct + '%'"
                                             [style.background]="cat.color"></div>
                                    </div>
                                </div>
                            }
                        </div>
                    </div>
                } @else {
                    <p class="relative text-xs text-surface-400 dark:text-surface-500 text-center py-4">
                        Aucune dépense ce mois-ci
                    </p>
                }

                <!-- Transaction count -->
                <div class="relative mt-auto pt-2 border-t border-surface-200 dark:border-surface-700">
                    <p class="text-xs text-surface-400 text-center">
                        {{ summary()!.count }} transaction{{ summary()!.count > 1 ? 's' : '' }} ce mois
                    </p>
                </div>
            }
        </div>
    `
})
export class TransactionsSummary implements OnChanges {
    private service = inject(TransactionsService);

    @Input() yearMonth = '';  // YYYY-MM

    loading = signal(true);
    summary = signal<MonthlySummary | null>(null);

    get monthTitle(): string {
        if (!this.yearMonth) return '';
        const [y, m] = this.yearMonth.split('-').map(Number);
        return new Date(y, m - 1, 1)
            .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
            .replace(/^\w/, c => c.toUpperCase());
    }

    async ngOnChanges(changes: SimpleChanges) {
        if (changes['yearMonth'] && this.yearMonth) {
            await this.load();
        }
    }

    private async load() {
        this.loading.set(true);
        try {
            const s = await this.service.getMonthlySummary(this.yearMonth);
            this.summary.set(s);
        } finally {
            this.loading.set(false);
        }
    }
}
