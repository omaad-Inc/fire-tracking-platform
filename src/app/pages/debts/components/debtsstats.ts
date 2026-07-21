import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { DebtsService, DebtsStatsSummary } from '../../service/debts.service';
import { AssetsStateService } from '../../service/assets-state.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { LoadErrorComponent } from '../../../core/components/load-error.component';
import { I18nService } from '../../../i18n/i18n.service';

@Component({
    standalone: true,
    selector: 'app-debts-stats',
    imports: [CommonModule, AppAmountComponent, LoadErrorComponent],
    template: `
        @if (loading()) {
            @for (i of [1, 2, 3]; track i) {
                <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                    <div class="rounded-2xl border border-surface-200 dark:border-surface-800 p-5 animate-pulse">
                        <div class="flex justify-between items-start mb-4">
                            <div class="flex-1">
                                <div class="h-4 bg-surface-200 dark:bg-surface-700 rounded w-24 mb-2"></div>
                                <div class="h-8 bg-surface-200 dark:bg-surface-700 rounded w-32"></div>
                            </div>
                            <div class="w-12 h-12 rounded-xl bg-surface-200 dark:bg-surface-700"></div>
                        </div>
                        <div class="h-4 bg-surface-200 dark:bg-surface-700 rounded w-40"></div>
                    </div>
                </div>
            }
        } @else if (loadError()) {
            <div class="col-span-12">
                <app-load-error (retry)="loadStats()" />
            </div>
        } @else {
            <!-- Card 1 - I owe (debts) -->
            <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                <div class="bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700 hover:shadow-sm p-5 transition-all duration-200">
                    <div class="flex justify-between items-start mb-4">
                        <div class="min-w-0">
                            <span class="block text-surface-500 text-sm font-medium mb-2">{{ t('debts.stats.iOwe') }}</span>
                            <div class="text-negative font-bold text-2xl"><app-amount [value]="stats()?.totalDebt ?? 0" /></div>
                        </div>
                        <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-negative-50 dark:bg-negative-500/15 shrink-0">
                            <i class="pi pi-arrow-up-right text-negative dark:text-negative-400 text-xl"></i>
                        </div>
                    </div>
                    <span class="text-surface-500 text-sm">{{ t('debts.stats.iOweSub') }}</span>
                </div>
            </div>

            <!-- Card 2 - Owed to me (receivables) -->
            <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                <div class="bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700 hover:shadow-sm p-5 transition-all duration-200">
                    <div class="flex justify-between items-start mb-4">
                        <div class="min-w-0">
                            <span class="block text-surface-500 text-sm font-medium mb-2">{{ t('debts.stats.owedToMe') }}</span>
                            <div class="text-positive font-bold text-2xl"><app-amount [value]="stats()?.receivables ?? 0" /></div>
                        </div>
                        <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-positive-50 dark:bg-positive-500/15 shrink-0">
                            <i class="pi pi-arrow-down-left text-positive-600 dark:text-positive-400 text-xl"></i>
                        </div>
                    </div>
                    <span class="text-surface-500 text-sm">{{ t('debts.stats.owedToMeSub') }}</span>
                </div>
            </div>

            <!-- Card 3 - Last payment -->
            <div class="col-span-12 lg:col-span-6 xl:col-span-4">
                <div class="bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700 hover:shadow-sm p-5 transition-all duration-200">
                    <div class="flex justify-between items-start mb-4">
                        <div class="min-w-0">
                            <span class="block text-surface-500 text-sm font-medium mb-2">{{ t('debts.stats.lastPayment') }}</span>
                            <div class="text-surface-900 dark:text-surface-0 font-bold text-2xl"><app-amount [value]="stats()?.paidAmount ?? 0" /></div>
                        </div>
                        <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-700/20 shrink-0">
                            <i class="pi pi-check-circle text-brand-700 dark:text-ochre-400 text-xl"></i>
                        </div>
                    </div>
                    @if (stats()?.lastPaymentDate) {
                        <span class="text-surface-500 text-sm">{{ stats()?.lastPaymentDate }}</span>
                    } @else {
                        <span class="text-surface-500 text-sm">{{ t('debts.stats.noRecentPayment') }}</span>
                    }
                </div>
            </div>
        }
    `
})
export class DebtsStats implements OnInit, OnDestroy {
    private debtsService = inject(DebtsService);
    private stateService = inject(AssetsStateService);
    private i18n = inject(I18nService);
    private subscription?: Subscription;

    loading = signal(true);
    loadError = signal(false);
    stats = signal<DebtsStatsSummary | null>(null);

    ngOnInit() {
        this.loadStats();
        // Subscribe to debt updates to refresh stats
        this.subscription = this.stateService.debtsUpdated$.subscribe(() => {
            this.loadStats();
        });
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

    async loadStats() {
        if (!this.stats()) this.loading.set(true);
        try {
            const s = await this.debtsService.getStats();
            this.stats.set(s);
            this.loadError.set(false);
        } catch (error) {
            console.error('Error loading debt stats:', error);
            // Explicit error+retry, fake zeros on money cards read as data loss.
            if (!this.stats()) this.loadError.set(true);
        } finally {
            this.loading.set(false);
        }
    }

    t(key: string): string {
        return this.i18n.t(key);
    }
}
