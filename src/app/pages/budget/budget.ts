import { ChangeDetectionStrategy, Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { I18nService } from '../../i18n/i18n.service';
import {
    ApiService, Budget, BudgetCreate, BudgetStatus, TransactionCategory,
} from '../../core/services/api.service';
import { CurrencyService } from '../../core/services/currency.service';
import { AppAmountComponent } from '../../core/components/app-amount.component';
import { LoadErrorComponent } from '../../core/components/load-error.component';
import { PageHeaderComponent, UiCardComponent, EmptyStateComponent, ChipComponent } from '../../core/ui';

// Expense categories a user can budget (single source: the categories.* dict).
const BUDGET_CATS: TransactionCategory[] = [
    'housing', 'utilities', 'groceries', 'transport', 'health', 'insurance',
    'entertainment', 'dining', 'shopping', 'education', 'subscriptions', 'travel',
    'family_support', 'religious', 'ceremony', 'airtime', 'taxes', 'other_expense',
];

type Model = 'envelope' | 'flexible';

@Component({
    selector: 'app-budget',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule, FormsModule, ButtonModule, DialogModule, SelectModule,
        InputNumberModule, ToastModule,
        AppAmountComponent, LoadErrorComponent,
        PageHeaderComponent, UiCardComponent, EmptyStateComponent, ChipComponent,
    ],
    providers: [MessageService],
    template: `
        <p-toast />
        @if (!embedded) {
            <app-page-header icon="pi-chart-pie" [title]="t('budgets.title')" [subtitle]="t('budgets.subtitle')">
                <button actions pButton size="small" icon="pi pi-plus"
                        [label]="t('budgets.add')" (click)="openAdd()" styleClass="omaad-cta !rounded-xl"></button>
            </app-page-header>
        } @else {
            <div class="flex items-center justify-end mb-4">
                <button pButton size="small" icon="pi pi-plus"
                        [label]="t('budgets.add')" (click)="openAdd()" styleClass="omaad-cta !rounded-xl" data-testid="budget-add"></button>
            </div>
        }

        @if (error()) {
            <app-load-error (retry)="load()" />
        } @else if (loading()) {
            <div class="space-y-3">
                @for (i of [1,2,3]; track i) {
                    <div class="h-20 rounded-2xl bg-surface-200 dark:bg-surface-700 animate-pulse"></div>
                }
            </div>
        } @else if (items().length === 0) {
            <app-empty-state icon="pi-chart-pie" [title]="t('budgets.empty.title')" [message]="t('budgets.empty.desc')">
                <button pButton icon="pi pi-plus" [label]="t('budgets.add')" (click)="openAdd()" styleClass="omaad-cta !rounded-xl"></button>
            </app-empty-state>
        } @else {
            <div class="space-y-3" data-testid="budget-list">
                @for (it of items(); track it.budget_id) {
                    <app-ui-card padding="sm">
                        <div class="flex items-center justify-between gap-3 mb-2">
                            <div class="flex items-center gap-2 min-w-0">
                                <span class="font-semibold text-surface-900 dark:text-surface-0 truncate">{{ t('categories.' + it.category) }}</span>
                                @if (it.over_budget) {
                                    <app-chip [label]="t('budgets.over')" tone="negative" />
                                } @else if (it.percent_used >= 80) {
                                    <app-chip [label]="t('budgets.nearLimit')" tone="warning" />
                                }
                                @if (it.model === 'flexible') { <app-chip [label]="t('budgets.flexible')" tone="neutral" /> }
                            </div>
                            <div class="flex items-center gap-1 shrink-0">
                                <button pButton icon="pi pi-pencil" [text]="true" size="small" (click)="openEdit(it)"></button>
                                <button pButton icon="pi pi-trash" severity="danger" [text]="true" size="small" (click)="remove(it)"></button>
                            </div>
                        </div>
                        <!-- Spend-vs-budget bar -->
                        <div class="h-2.5 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                            <div class="h-full rounded-full transition-all"
                                 [style.width.%]="barWidth(it)"
                                 [ngClass]="it.over_budget ? 'bg-negative' : (it.percent_used >= 80 ? 'bg-ochre-500' : 'bg-brand-600 dark:bg-ochre-400')"></div>
                        </div>
                        <div class="flex items-center justify-between mt-2 text-sm">
                            <span [ngClass]="it.over_budget ? 'text-negative font-semibold' : 'text-surface-600 dark:text-surface-300'">
                                <app-amount [value]="it.spent" /> / <app-amount [value]="it.budgeted" />
                            </span>
                            <span class="text-surface-500 dark:text-surface-400">{{ it.percent_used | number:'1.0-0' }}%</span>
                        </div>
                    </app-ui-card>
                }
            </div>
        }

        <p-dialog [visible]="dialog()" (visibleChange)="dialog.set($event)" [modal]="true" [draggable]="false"
                  [dismissableMask]="true" [style]="{ width: '95vw', maxWidth: '480px' }"
                  [header]="editingId() ? t('budgets.editTitle') : t('budgets.add')" styleClass="!rounded-2xl">
            <div class="flex flex-col gap-4 pt-2">
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('budgets.form.category') }}</label>
                    <p-select [(ngModel)]="form.category" [options]="categoryOptions()" optionLabel="label" optionValue="value"
                              [disabled]="editingId() !== null" styleClass="w-full" appendTo="body" data-testid="budget-category" />
                </div>
                <div class="flex gap-2">
                    <button pButton size="small" [outlined]="form.model !== 'envelope'" [label]="t('budgets.form.envelope')"
                            (click)="form.model = 'envelope'" class="flex-1"></button>
                    <button pButton size="small" [outlined]="form.model !== 'flexible'" [label]="t('budgets.form.flexible')"
                            (click)="form.model = 'flexible'" class="flex-1"></button>
                </div>
                @if (form.model === 'envelope') {
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('budgets.form.limit') }}</label>
                        <p-inputnumber [(ngModel)]="form.amount" [min]="0" [maxFractionDigits]="2" styleClass="w-full"
                                       inputStyleClass="w-full" data-testid="budget-amount" />
                    </div>
                } @else {
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('budgets.form.percent') }}</label>
                        <p-inputnumber [(ngModel)]="form.percent" [min]="1" [max]="100" suffix=" %" styleClass="w-full" inputStyleClass="w-full" />
                        <small class="text-xs text-surface-400">{{ t('budgets.form.percentHint') }}</small>
                    </div>
                }
            </div>
            <ng-template #footer>
                <button pButton [label]="t('common.cancel')" [outlined]="true" (click)="dialog.set(false)"></button>
                <button pButton [label]="t('common.save')" [loading]="saving()" [disabled]="!formValid()"
                        (click)="save()" styleClass="omaad-cta" data-testid="budget-save"></button>
            </ng-template>
        </p-dialog>
    `,
})
export class BudgetPage implements OnInit {
    private api = inject(ApiService);
    private i18n = inject(I18nService);
    private cs = inject(CurrencyService);
    private toast = inject(MessageService);
    t(k: string, p?: Record<string, string | number>): string { return this.i18n.t(k, p); }

    @Input() embedded = false;

    items = signal<BudgetStatus[]>([]);
    private budgets = signal<Budget[]>([]);
    loading = signal(true);
    error = signal(false);
    saving = signal(false);
    dialog = signal(false);
    editingId = signal<number | null>(null);

    form: { category: TransactionCategory; model: Model; amount: number; percent: number } = {
        category: 'groceries', model: 'envelope', amount: 0, percent: 10,
    };

    ngOnInit() { this.load(); }

    load() {
        this.loading.set(true);
        this.error.set(false);
        forkJoin({ budgets: this.api.listBudgets(), status: this.api.getBudgetStatus() }).subscribe({
            next: ({ budgets, status }) => {
                this.budgets.set(budgets);
                this.items.set(status.items);
                this.loading.set(false);
            },
            error: () => { this.error.set(true); this.loading.set(false); },
        });
    }

    /** Expense categories still available (exclude ones already budgeted, unless editing that one). */
    categoryOptions(): { value: TransactionCategory; label: string }[] {
        const taken = new Set(this.budgets().filter(b => b.id !== this.editingId()).map(b => b.category));
        return BUDGET_CATS
            .filter(c => !taken.has(c))
            .map(c => ({ value: c, label: this.i18n.categoryLabel(c) }));
    }

    barWidth(it: BudgetStatus): number {
        return Math.min(100, Math.max(0, it.percent_used));
    }

    formValid(): boolean {
        return this.form.model === 'envelope' ? this.form.amount > 0 : this.form.percent > 0 && this.form.percent <= 100;
    }

    openAdd() {
        this.editingId.set(null);
        const first = this.categoryOptions()[0]?.value ?? 'other_expense';
        this.form = { category: first, model: 'envelope', amount: 0, percent: 10 };
        this.dialog.set(true);
    }

    openEdit(it: BudgetStatus) {
        const b = this.budgets().find(x => x.id === it.budget_id);
        if (!b) return;
        this.editingId.set(b.id);
        this.form = {
            category: b.category,
            model: b.percent_of_income != null ? 'flexible' : 'envelope',
            amount: b.limit_amount ?? 0,
            percent: b.percent_of_income ?? 10,
        };
        this.dialog.set(true);
    }

    save() {
        if (!this.formValid()) return;
        this.saving.set(true);
        const body = this.form.model === 'envelope'
            ? { limit_amount: this.form.amount, percent_of_income: null }
            : { percent_of_income: this.form.percent, limit_amount: null };
        const id = this.editingId();
        const req = id !== null
            ? this.api.updateBudget(id, body)
            : this.api.createBudget({ category: this.form.category, currency: this.cs.config().code, ...body } as BudgetCreate);
        req.subscribe({
            next: () => {
                this.saving.set(false);
                this.dialog.set(false);
                this.toast.add({ severity: 'success', summary: this.t(id !== null ? 'budgets.updated' : 'budgets.created') });
                this.load();
            },
            error: (e) => {
                this.saving.set(false);
                const detail = e?.status === 409 ? this.t('budgets.duplicate') : this.t('common.error');
                this.toast.add({ severity: 'error', summary: detail });
            },
        });
    }

    remove(it: BudgetStatus) {
        this.api.deleteBudget(it.budget_id).subscribe({
            next: () => { this.toast.add({ severity: 'success', summary: this.t('budgets.deleted') }); this.load(); },
            error: () => this.toast.add({ severity: 'error', summary: this.t('common.error') }),
        });
    }
}
