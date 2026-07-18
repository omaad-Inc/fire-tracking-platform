import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiService, SharedPortfolio } from '../../core/services/api.service';
import { I18nService } from '../../i18n/i18n.service';

type ViewState = 'loading' | 'ok' | 'notFound' | 'expired' | 'revoked';

/**
 * Read-only "Bilan partageable" screen — /:lang/shared/:token.
 *
 * The viewer must be logged in (route sits inside the authenticated app
 * shell). It renders the FROZEN snapshot returned by the backend and never
 * touches the viewer's own data. When the share is anonymized the snapshot
 * simply has no identifying fields, so there is nothing sensitive to hide
 * here — we render whatever the blob contains.
 */
@Component({
    selector: 'app-shared-portfolio',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
        <div class="max-w-4xl mx-auto pb-16">
            @switch (state()) {
                @case ('loading') {
                    <div class="py-24 text-center"><i class="pi pi-spin pi-spinner text-3xl text-surface-300"></i></div>
                }
                @case ('notFound') { <ng-container *ngTemplateOutlet="empty; context: { icon: 'pi-link', title: t('sharedPortfolio.notFoundTitle'), desc: t('sharedPortfolio.notFoundDesc') }" /> }
                @case ('expired')  { <ng-container *ngTemplateOutlet="empty; context: { icon: 'pi-clock', title: t('sharedPortfolio.expiredTitle'), desc: t('sharedPortfolio.expiredDesc') }" /> }
                @case ('revoked')  { <ng-container *ngTemplateOutlet="empty; context: { icon: 'pi-ban', title: t('sharedPortfolio.revokedTitle'), desc: t('sharedPortfolio.revokedDesc') }" /> }
                @case ('ok') {
                  @if (data(); as d) {
                    <!-- Header -->
                    <header class="mb-6">
                        <div class="flex flex-wrap items-center gap-2 mb-2">
                            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 text-xs font-semibold">
                                <i class="pi pi-eye text-xs"></i>{{ t('sharedPortfolio.readOnly') }}
                            </span>
                            @if (d.meta.anonymized) {
                                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-100 dark:bg-brand-700/20 text-brand-700 dark:text-ochre-400 text-xs font-semibold">
                                    <i class="pi pi-user-minus text-xs"></i>{{ t('portfolioShare.anonymizedBadge') }}
                                </span>
                            }
                        </div>
                        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">
                            @if (!d.meta.anonymized && d.meta.owner_name) {
                                {{ t('sharedPortfolio.sharedBy') }} {{ d.meta.owner_name }}
                            } @else {
                                {{ t('portfolioShare.title') }}
                            }
                        </h1>
                        <p class="text-xs text-surface-400 mt-1">
                            {{ t('sharedPortfolio.generatedOn') }} {{ prettyDate(d.snapshot.generated_at) }}
                            @if (d.meta.anonymized) { · {{ t('sharedPortfolio.anonymizedNote') }} }
                        </p>
                    </header>

                    <!-- Net worth hero -->
                    <div class="rounded-3xl bg-brand-900 text-white p-6 mb-6">
                        <p class="text-white/60 text-xs font-medium uppercase tracking-wide mb-1">{{ t('sharedPortfolio.netWorth') }}</p>
                        <p class="text-4xl font-black tabular-nums">{{ money(d.snapshot.fire.net_worth) }}</p>
                        <div class="flex gap-6 mt-4 text-sm">
                            <div><span class="text-white/50 block text-xs">{{ t('sharedPortfolio.totalAssets') }}</span><span class="font-semibold tabular-nums">{{ money(d.snapshot.fire.total_assets) }}</span></div>
                            <div><span class="text-white/50 block text-xs">{{ t('sharedPortfolio.totalLiabilities') }}</span><span class="font-semibold tabular-nums">{{ money(d.snapshot.fire.total_liabilities) }}</span></div>
                            @if (d.snapshot.fire.total_owed_to_me > 0) {
                                <div><span class="text-white/50 block text-xs">{{ t('sharedPortfolio.owedToMe') }}</span><span class="font-semibold tabular-nums">{{ money(d.snapshot.fire.total_owed_to_me) }}</span></div>
                            }
                        </div>
                    </div>

                    <!-- KPI grid -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                        <ng-container *ngTemplateOutlet="kpi; context: { label: t('sharedPortfolio.monthlyIncome'), value: money(d.snapshot.fire.monthly_income) }" />
                        <ng-container *ngTemplateOutlet="kpi; context: { label: t('sharedPortfolio.monthlyExpenses'), value: money(d.snapshot.fire.monthly_expenses) }" />
                        <ng-container *ngTemplateOutlet="kpi; context: { label: t('sharedPortfolio.savingsRate'), value: pct(d.snapshot.fire.savings_rate) }" />
                        <ng-container *ngTemplateOutlet="kpi; context: { label: t('sharedPortfolio.passiveIncome'), value: money(d.snapshot.fire.passive_income) }" />
                        @if (d.snapshot.fire.fire_target != null) {
                            <ng-container *ngTemplateOutlet="kpi; context: { label: t('sharedPortfolio.fireTarget'), value: money(d.snapshot.fire.fire_target) }" />
                        }
                        @if (d.snapshot.fire.fire_progress_percentage != null) {
                            <ng-container *ngTemplateOutlet="kpi; context: { label: t('sharedPortfolio.fireProgress'), value: pct(d.snapshot.fire.fire_progress_percentage) }" />
                        }
                        @if (d.snapshot.fire.years_to_fire != null) {
                            <ng-container *ngTemplateOutlet="kpi; context: { label: t('sharedPortfolio.yearsToFire'), value: d.snapshot.fire.years_to_fire + ' ' + t('sharedPortfolio.years') }" />
                        }
                    </div>

                    <!-- Asset breakdown -->
                    @if (d.snapshot.asset_distribution.length) {
                        <section class="mb-8">
                            <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-0 mb-3">{{ t('sharedPortfolio.assetsTitle') }}</h2>
                            <div class="rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-4 space-y-3">
                                @for (a of d.snapshot.asset_distribution; track a.category) {
                                    <div>
                                        <div class="flex justify-between text-sm mb-1">
                                            <span class="text-surface-700 dark:text-surface-200">{{ assetCat(a.category) }}</span>
                                            <span class="text-surface-500 tabular-nums">{{ money(a.value) }} · {{ a.percentage | number:'1.0-0' }}%</span>
                                        </div>
                                        <div class="h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                                            <div class="h-full bg-brand-600 dark:bg-ochre-500 rounded-full" [style.width.%]="a.percentage"></div>
                                        </div>
                                    </div>
                                }
                            </div>
                        </section>
                    }

                    <!-- Income & expenses (12 mo) -->
                    @if (hasHistory()) {
                        <section class="mb-8">
                            <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-0 mb-3">{{ t('sharedPortfolio.incomeExpenseTitle') }}</h2>
                            <div class="rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-4">
                                <div class="flex items-end gap-1.5 h-32">
                                    @for (m of d.snapshot.income_expense_history; track m.period) {
                                        <div class="flex-1 flex flex-col items-center justify-end gap-0.5 h-full" [title]="m.period">
                                            <div class="w-full flex items-end justify-center gap-0.5 h-full">
                                                <div class="w-1/2 bg-positive/70 rounded-t" [style.height.%]="barPct(m.income)"></div>
                                                <div class="w-1/2 bg-negative/70 rounded-t" [style.height.%]="barPct(m.expenses)"></div>
                                            </div>
                                            <span class="text-[9px] text-surface-400">{{ m.period.slice(5) }}</span>
                                        </div>
                                    }
                                </div>
                                <div class="flex gap-4 mt-3 text-xs text-surface-500">
                                    <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-positive/70"></span>{{ t('sharedPortfolio.income') }}</span>
                                    <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-negative/70"></span>{{ t('sharedPortfolio.expenses') }}</span>
                                </div>
                            </div>
                        </section>
                    }

                    <!-- Savings goals -->
                    @if (d.snapshot.savings_goals.length) {
                        <section class="mb-8">
                            <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-0 mb-3">{{ t('sharedPortfolio.goalsTitle') }}</h2>
                            <div class="grid sm:grid-cols-2 gap-3">
                                @for (g of d.snapshot.savings_goals; track $index) {
                                    <div class="rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-4">
                                        <p class="text-sm font-medium text-surface-900 dark:text-surface-0 mb-1 truncate">{{ g.name || catFallback(g.template_key) }}</p>
                                        <div class="h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden mb-2">
                                            <div class="h-full bg-brand-600 dark:bg-ochre-500 rounded-full" [style.width.%]="g.progress_percentage"></div>
                                        </div>
                                        <p class="text-xs text-surface-500 tabular-nums">{{ money(g.current_amount) }} {{ t('sharedPortfolio.of') }} {{ money(g.target_amount) }} · {{ g.progress_percentage | number:'1.0-0' }}%</p>
                                    </div>
                                }
                            </div>
                        </section>
                    }

                    <!-- Debts -->
                    @if (d.snapshot.debts.length) {
                        <section class="mb-8">
                            <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-0 mb-3">{{ t('sharedPortfolio.debtsTitle') }}</h2>
                            <div class="rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 divide-y divide-surface-100 dark:divide-surface-800">
                                @for (dbt of d.snapshot.debts; track $index) {
                                    <div class="flex items-center justify-between px-4 py-3">
                                        <span class="text-sm text-surface-700 dark:text-surface-200 truncate">{{ dbt.name || catLabel(dbt.category) }}</span>
                                        <span class="text-sm font-semibold tabular-nums" [class.text-negative]="dbt.type === 'i_owe'" [class.text-positive]="dbt.type === 'owed_to_me'">{{ money(dbt.current_amount) }}</span>
                                    </div>
                                }
                            </div>
                        </section>
                    }

                    <!-- Recent transactions -->
                    @if (d.snapshot.transactions.length) {
                        <section class="mb-8">
                            <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-0 mb-3">{{ t('sharedPortfolio.transactionsTitle') }}</h2>
                            <div class="rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 divide-y divide-surface-100 dark:divide-surface-800">
                                @for (tx of d.snapshot.transactions; track $index) {
                                    <div class="flex items-center justify-between px-4 py-3">
                                        <div class="min-w-0">
                                            <p class="text-sm text-surface-700 dark:text-surface-200 truncate">{{ tx.description || catLabel(tx.category) }}</p>
                                            <p class="text-xs text-surface-400">{{ catLabel(tx.category) }} · {{ prettyDate(tx.date) }}</p>
                                        </div>
                                        <span class="text-sm font-semibold tabular-nums shrink-0 ml-3" [class.text-positive]="tx.type === 'income'" [class.text-negative]="tx.type === 'expense'">
                                            {{ tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : '' }}{{ money(tx.amount) }}
                                        </span>
                                    </div>
                                }
                            </div>
                        </section>
                    }

                    <!-- Footer -->
                    <div class="text-center pt-4">
                        <a [routerLink]="['/', lang()]" class="text-xs text-surface-400 hover:text-brand-600 dark:hover:text-ochre-400 transition-colors">
                            {{ t('sharedPortfolio.poweredBy') }} <span class="font-bold text-brand-700 dark:text-ochre-400">Omaad</span>
                        </a>
                    </div>
                  }
                }
            }
        </div>

        <!-- Templates -->
        <ng-template #kpi let-label="label" let-value="value">
            <div class="rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-4">
                <p class="text-xs text-surface-500 dark:text-surface-400 mb-1">{{ label }}</p>
                <p class="text-lg font-bold text-surface-900 dark:text-surface-0 tabular-nums">{{ value }}</p>
            </div>
        </ng-template>

        <ng-template #empty let-icon="icon" let-title="title" let-desc="desc">
            <div class="py-24 text-center max-w-sm mx-auto">
                <div class="w-14 h-14 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-4">
                    <i class="pi {{ icon }} text-2xl text-surface-400"></i>
                </div>
                <h1 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-1">{{ title }}</h1>
                <p class="text-sm text-surface-500 dark:text-surface-400 mb-5">{{ desc }}</p>
                <a [routerLink]="['/', lang()]" class="text-sm font-semibold text-brand-700 dark:text-ochre-400 hover:underline">{{ t('sharedPortfolio.backToApp') }}</a>
            </div>
        </ng-template>
    `
})
export class SharedPortfolioPage implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private api = inject(ApiService);
    private i18n = inject(I18nService);

    state = signal<ViewState>('loading');
    data = signal<SharedPortfolio | null>(null);

    lang = computed(() => this.i18n.lang());

    t(key: string, params?: Record<string, string | number>): string { return this.i18n.t(key, params); }

    private ieMax = 1;

    hasHistory = computed(() =>
        (this.data()?.snapshot.income_expense_history ?? []).some(m => m.income > 0 || m.expenses > 0));

    async ngOnInit() {
        const token = this.route.snapshot.paramMap.get('token') ?? '';
        try {
            const res = await firstValueFrom(this.api.getSharedPortfolio(token));
            this.ieMax = Math.max(1, ...res.snapshot.income_expense_history.flatMap(m => [m.income, m.expenses]));
            this.data.set(res);
            this.state.set('ok');
        } catch (e) {
            const err = e as HttpErrorResponse;
            if (err.status === 410) {
                const detail = String(err.error?.detail ?? '');
                this.state.set(detail.toLowerCase().includes('revok') ? 'revoked' : 'expired');
            } else {
                this.state.set('notFound');
            }
        }
    }

    /** Amounts are already in the owner's display currency — just format them. */
    money(v: number | null | undefined): string {
        const d = this.data();
        const symbol = d?.snapshot.currency_symbol ?? '';
        const locale = this.lang() === 'en' ? 'en-US' : 'fr-FR';
        const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(v ?? 0));
        return `${n} ${symbol}`.trim();
    }

    pct(v: number | null | undefined): string {
        const locale = this.lang() === 'en' ? 'en-US' : 'fr-FR';
        return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(v ?? 0)}%`;
    }

    barPct(v: number): number { return Math.max(2, Math.round((v / this.ieMax) * 100)); }

    assetCat(cat: string): string {
        const label = this.t(`assetCategories.${cat}`);
        return label.startsWith('assetCategories.') ? cat : label;
    }
    catLabel(cat: string): string {
        const label = this.t(`categories.${cat}`);
        return label.startsWith('categories.') ? cat : label;
    }
    catFallback(templateKey: string | null): string {
        return templateKey ? templateKey : this.t('sharedPortfolio.unnamed');
    }

    prettyDate(iso: string): string {
        if (!iso) return '';
        const locale = this.lang() === 'en' ? 'en-US' : 'fr-FR';
        const d = new Date(iso);
        return isNaN(d.getTime()) ? iso : d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    }
}
