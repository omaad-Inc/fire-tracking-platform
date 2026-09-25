import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { DebtsService, DebtsHero } from '../../service/debts.service';
import { AssetsStateService } from '../../service/assets-state.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { LoadErrorComponent } from '../../../core/components/load-error.component';
import { I18nService } from '../../../i18n/i18n.service';
import { NavService } from '../../../core/services/nav.service';
import { parseLocalDate } from '../../../core/util/date';

/**
 * Debts hero (P0 premium debts): the net position, the split, and TIME (the
 * next due instalment, what falls due in 30 days, what is late). Replaces the
 * three KPI cards whose "Dernier paiement" was a guess.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    selector: 'app-debts-stats',
    imports: [CommonModule, RouterModule, AppAmountComponent, LoadErrorComponent],
    template: `
        @if (loading()) {
            <div class="col-span-12">
                <div class="rounded-2xl border border-surface-200 dark:border-surface-800 p-5 animate-pulse">
                    <div class="h-4 bg-surface-200 dark:bg-surface-700 rounded w-24 mb-3"></div>
                    <div class="h-9 bg-surface-200 dark:bg-surface-700 rounded w-48 mb-5"></div>
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        @for (i of [1,2,3,4]; track i) { <div class="h-12 bg-surface-200 dark:bg-surface-700 rounded"></div> }
                    </div>
                </div>
            </div>
        } @else if (loadError()) {
            <div class="col-span-12"><app-load-error (retry)="load()" /></div>
        } @else if (hero()) {
          @if (hero(); as h) {
            <div class="col-span-12">
                <div class="bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5">
                    <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
                        <div>
                            <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-1">{{ t('debts.hero.net') }}</p>
                            <div class="text-3xl font-bold tabular-nums" [ngClass]="h.net >= 0 ? 'text-surface-900 dark:text-surface-0' : 'text-negative'">
                                <app-amount [value]="h.net" [prefix]="h.net < 0 ? '-' : ''" [hero]="true" />
                            </div>
                            <div class="flex items-center gap-4 mt-2 text-sm">
                                <span class="text-surface-500 dark:text-surface-400">{{ t('debts.hero.iOwe') }} <span class="font-semibold text-surface-900 dark:text-surface-0"><app-amount [value]="h.iOwe" /></span></span>
                                <span class="text-surface-300 dark:text-surface-600">·</span>
                                <span class="text-surface-500 dark:text-surface-400">{{ t('debts.hero.owedToMe') }} <span class="font-semibold text-positive"><app-amount [value]="h.owedToMe" /></span></span>
                            </div>
                        </div>

                        <!-- Time line -->
                        <div class="rounded-xl px-4 py-3 lg:min-w-[320px]"
                             [ngClass]="h.overdueCount > 0 ? 'bg-negative-50 dark:bg-negative-500/10' : 'bg-surface-50 dark:bg-surface-800/60'">
                            <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-1">{{ t('debts.hero.nextDue') }}</p>
                            @if (h.nextDue; as n) {
                                <a [routerLink]="nav.link('pages', 'debts', n.debtId)" class="no-underline block">
                                    <p class="text-sm font-semibold m-0 truncate" [ngClass]="n.isOverdue ? 'text-negative' : 'text-surface-900 dark:text-surface-0'">
                                        <app-amount [value]="n.amountEur" /> · {{ n.name }}
                                    </p>
                                    <p class="text-xs m-0" [ngClass]="n.isOverdue ? 'text-negative/80' : 'text-surface-500 dark:text-surface-400'">
                                        {{ n.isOverdue ? t('debts.overdueDays', { n: daysLate(n.date) }) : t('debts.dueOn', { date: fmtDate(n.date) }) }}
                                    </p>
                                </a>
                            } @else {
                                <p class="text-sm text-surface-500 dark:text-surface-400 m-0">{{ t('debts.hero.none') }}</p>
                            }
                            <p class="text-xs mt-1.5 m-0 font-medium" [ngClass]="h.overdueCount > 0 ? 'text-negative' : 'text-positive'">
                                {{ h.overdueCount === 0 ? t('debts.hero.allClear') : (h.overdueCount === 1 ? t('debts.hero.overdueOne') : t('debts.hero.overdueOther', { n: h.overdueCount })) }}
                            </p>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-surface-100 dark:border-surface-800">
                        <div>
                            <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ t('debts.hero.dueSoon') }}</p>
                            <div class="text-lg font-bold text-surface-900 dark:text-surface-0 tabular-nums"><app-amount [value]="h.dueWithin30Days" /></div>
                        </div>
                        <div>
                            <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ t('debts.hero.expectedSoon') }}</p>
                            <div class="text-lg font-bold text-positive tabular-nums"><app-amount [value]="h.expectedWithin30Days" /></div>
                        </div>
                    </div>
                </div>
            </div>
          }
        }
    `
})
export class DebtsStats implements OnInit, OnDestroy {
    private debtsService = inject(DebtsService);
    private stateService = inject(AssetsStateService);
    private i18n = inject(I18nService);
    readonly nav = inject(NavService);
    private subscription?: Subscription;

    loading = signal(true);
    loadError = signal(false);
    hero = signal<DebtsHero | null>(null);

    ngOnInit() {
        this.load();
        this.subscription = this.stateService.debtsUpdated$.subscribe(() => this.load());
    }

    ngOnDestroy() { this.subscription?.unsubscribe(); }

    async load() {
        if (!this.hero()) this.loading.set(true);
        try {
            this.hero.set(await this.debtsService.getHero());
            this.loadError.set(false);
        } catch (error) {
            console.error('Error loading debt hero:', error);
            // Explicit error+retry, fake zeros on money cards read as data loss.
            if (!this.hero()) this.loadError.set(true);
        } finally {
            this.loading.set(false);
        }
    }

    t(key: string, params?: Record<string, string | number>): string { return this.i18n.t(key, params); }

    fmtDate(iso: string): string {
        const d = parseLocalDate(iso);
        return d ? d.toLocaleDateString(this.i18n.lang() === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'short' }) : '';
    }

    daysLate(iso: string): number {
        const d = parseLocalDate(iso);
        return d ? Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000)) : 0;
    }
}
