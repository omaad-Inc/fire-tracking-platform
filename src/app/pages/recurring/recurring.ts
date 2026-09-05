import { ChangeDetectionStrategy, Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';

import { I18nService } from '../../i18n/i18n.service';
import { CurrencyService } from '../../core/services/currency.service';
import {
    ApiService, RecurringRule, RecurringRuleCreate, RecurringFrequency,
    TransactionType, TransactionCategory,
} from '../../core/services/api.service';
import { isMonetaryCategory } from '../../core/constants/accounts';
import { PatrimoineService } from '../service/patrimoine.service';
import { AppAmountComponent } from '../../core/components/app-amount.component';
import { LoadErrorComponent } from '../../core/components/load-error.component';
import { PageHeaderComponent, UiCardComponent, EmptyStateComponent, ChipComponent } from '../../core/ui';
import { isTouchDevice } from '../../core/util/touch';
import { toLocalDateStr } from '../../core/util/date';
import { AssetsStateService } from '../service/assets-state.service';
import { FeedbackService } from '../../core/ui/feedback.service';

const INCOME_CATS: TransactionCategory[] = ['salary', 'freelance', 'rental_income', 'other_income'];
const EXPENSE_CATS: TransactionCategory[] = ['housing', 'family_support', 'tontine', 'subscriptions', 'utilities', 'transport', 'groceries', 'other_expense'];

@Component({
    selector: 'app-recurring',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule, FormsModule, ButtonModule, DialogModule, SelectModule,
        InputNumberModule, DatePickerModule, AppAmountComponent, LoadErrorComponent,
        PageHeaderComponent, UiCardComponent, EmptyStateComponent, ChipComponent,
    ],
    template: `
        @if (!embedded) {
            <app-page-header icon="pi-sync" [title]="t('recurring.title')" [subtitle]="t('recurring.subtitle')">
                <button actions pButton [outlined]="true" size="small" icon="pi pi-bolt"
                        [label]="t('recurring.runNow')" (click)="runNow()"></button>
                <button actions pButton size="small" icon="pi pi-plus"
                        [label]="t('recurring.add')" (click)="openAdd()" styleClass="omaad-cta !rounded-xl"></button>
            </app-page-header>
        } @else {
            <div class="flex items-center justify-end gap-2 mb-4">
                <button pButton [outlined]="true" size="small" icon="pi pi-bolt"
                        [label]="t('recurring.runNow')" (click)="runNow()" data-testid="recurring-run"></button>
                <button pButton size="small" icon="pi pi-plus"
                        [label]="t('recurring.add')" (click)="openAdd()" styleClass="omaad-cta !rounded-xl" data-testid="recurring-add"></button>
            </div>
        }

        @if (error()) {
            <app-load-error (retry)="load()" />
        } @else if (loading()) {
            <div class="h-24 rounded-2xl bg-surface-200 dark:bg-surface-700 animate-pulse"></div>
        } @else if (rules().length === 0) {
            <app-empty-state icon="pi-sync" [title]="t('recurring.empty.title')" [message]="t('recurring.empty.desc')">
                <button pButton icon="pi pi-plus" [label]="t('recurring.add')" (click)="openAdd()"
                        styleClass="omaad-cta !rounded-xl"></button>
            </app-empty-state>
        } @else {
            <div class="space-y-3">
                @for (r of rules(); track r.id) {
                    <app-ui-card padding="sm">
                        <div class="flex items-center justify-between gap-4">
                            <div class="min-w-0">
                                <div class="font-semibold text-surface-900 dark:text-surface-0 truncate">
                                    {{ r.description || t('categories.' + r.category) }}
                                </div>
                                <div class="flex items-center gap-2 mt-1">
                                    <app-chip [label]="t('recurring.freq.' + r.frequency)"
                                              [tone]="r.type === 'income' ? 'positive' : 'neutral'" />
                                    <span class="text-surface-500 dark:text-surface-400 text-sm">
                                        {{ t('recurring.nextRun') }}: {{ r.next_run_date }}
                                    </span>
                                </div>
                            </div>
                            <div class="flex items-center gap-3 shrink-0">
                                <span class="font-bold" [class]="r.type === 'income' ? 'text-positive' : 'text-surface-900 dark:text-surface-0'">
                                    <app-amount [value]="cs.toEurFromNative(r.amount, r.currency)" />
                                </span>
                                <button pButton icon="pi pi-trash" severity="danger" [text]="true" size="small"
                                        (click)="remove(r)"></button>
                            </div>
                        </div>
                    </app-ui-card>
                }
            </div>
        }

        <p-dialog [transitionOptions]="'320ms cubic-bezier(0.34, 1.30, 0.64, 1)'" [(visible)]="dialog" [modal]="true" [draggable]="false" [style]="{ width: '95vw', maxWidth: '520px' }"
                  [header]="t('recurring.add')" styleClass="!rounded-2xl">
            <div class="flex flex-col gap-4 pt-2">
                <div class="flex gap-2">
                    <button pButton size="small" [outlined]="form.type !== 'expense'" [label]="t('recurring.form.expense')"
                            (click)="setType('expense')" class="flex-1"></button>
                    <button pButton size="small" [outlined]="form.type !== 'income'" [label]="t('recurring.form.income')"
                            (click)="setType('income')" class="flex-1"></button>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('recurring.form.category') }}</label>
                    <p-select [(ngModel)]="form.category" [options]="categoryOptions()" optionLabel="label" optionValue="value"
                              styleClass="w-full" appendTo="body" />
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('recurring.form.amount') }}</label>
                    <p-inputnumber [locale]="cs.inputLocale()" [(ngModel)]="form.amount" [min]="0" [maxFractionDigits]="cs.minorUnits()" styleClass="w-full" inputStyleClass="w-full" data-testid="recurring-amount" />
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('recurring.form.account') }}</label>
                    <p-select [(ngModel)]="form.account_id" [options]="accounts()" optionLabel="name" optionValue="id"
                              styleClass="w-full" appendTo="body" data-testid="recurring-account"
                              [emptyMessage]="t('transactions.form.noMonetaryAccount')" />
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('recurring.form.frequency') }}</label>
                        <p-select [(ngModel)]="form.frequency" [options]="frequencyOptions()" optionLabel="label" optionValue="value"
                                  styleClass="w-full" appendTo="body" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('recurring.form.startDate') }}</label>
                        <p-datepicker [touchUI]="isTouch" [readonlyInput]="isTouch" [(ngModel)]="form.start" [showIcon]="true" dateFormat="dd/mm/yy" styleClass="w-full" appendTo="body" />
                    </div>
                </div>
            </div>
            <ng-template #footer>
                <button pButton [label]="t('common.cancel')" [outlined]="true" (click)="dialog = false"></button>
                <button pButton [label]="t('common.save')" [loading]="saving()" (click)="save()"
                        styleClass="omaad-cta" data-testid="recurring-save"></button>
            </ng-template>
        </p-dialog>
    `,
})
export class RecurringPage implements OnInit {
    /** Mobile-safe datepickers: touchUI modal + readonly input (no keyboard). */
    readonly isTouch = isTouchDevice();

    private api = inject(ApiService);

    private feedback = inject(FeedbackService);
    readonly cs = inject(CurrencyService);
    private state = inject(AssetsStateService);
    private patrimoine = inject(PatrimoineService);
    private i18n = inject(I18nService);
    t(k: string, p?: Record<string, string | number>): string { return this.i18n.t(k, p); }

    /** When shown inside another page (e.g. the Transactions tab), skip the big
     *  page header and render a compact action toolbar instead. */
    @Input() embedded = false;

    rules = signal<RecurringRule[]>([]);
    /** Monetary accounts only. A rule debits the account it names, so the set is
     *  the backend's ACCOUNT_CATEGORIES — offering a stock or an FCP here only
     *  produced a 422 on save. */
    accounts = signal<{ id: number; name: string }[]>([]);
    loading = signal(true);
    error = signal(false);
    saving = signal(false);
    dialog = false;

    form: { type: TransactionType; category: TransactionCategory; amount: number; account_id: number | null; frequency: RecurringFrequency; start: Date } = {
        type: 'expense', category: 'housing', amount: 0, account_id: null, frequency: 'monthly', start: new Date(),
    };

    categoryOptions = signal<{ value: TransactionCategory; label: string }[]>([]);

    frequencyOptions() {
        return (['weekly', 'monthly', 'yearly'] as RecurringFrequency[])
            .map(f => ({ value: f, label: this.t('recurring.freq.' + f) }));
    }

    ngOnInit() {
        // Load the rules IMMEDIATELY; the opportunistic materialization runs in
        // the background (idempotent) and refreshes the list only if it actually
        // created transactions. Awaiting the run first serialized a slow POST
        // (DB writes on a slow backend) in front of the whole page render.
        this.load();
        this.api.runRecurring().subscribe({
            next: (res) => { if ((res?.created ?? 0) > 0) { this.load(); this.notifyMaterialized(); } },
            error: () => { /* backend may lack the route yet */ },
        });
    }

    runNow() {
        this.api.runRecurring().subscribe({
            next: (res) => {
                this.feedback.success(this.t('recurring.runDone', { count: res.created }));
                this.load();
                if ((res?.created ?? 0) > 0) this.notifyMaterialized();
            },
            error: () => this.feedback.error(this.t('common.error')),
        });
    }

    /** Materialized rows also moved account balances (S11-TX-1): tell the
     *  dashboard and patrimoine caches so they refetch fresh values. */
    private notifyMaterialized(): void {
        this.state.notifyTransactionsUpdated();
    }

    load() {
        this.loading.set(true);
        this.error.set(false);
        this.api.listRecurringRules().subscribe({
            next: (rules) => { this.rules.set(rules); this.loading.set(false); },
            error: () => { this.error.set(true); this.loading.set(false); },
        });
        this.loadAccounts();
    }

    /** Same source and filter as the transaction form and the quick-add sheet:
     *  the cached asset list, narrowed to the categories that can back a
     *  transaction. NOT /savings/liquid-assets — that is the goal-allocation
     *  rule, which also returns tontines and anything merely flagged is_liquid
     *  (stocks, FCP, real estate), all of which the backend then rejects. */
    private async loadAccounts() {
        try {
            const assets = await this.patrimoine.getAssets();
            this.accounts.set(
                assets
                    .filter(a => isMonetaryCategory(a.category))
                    .map(a => ({ id: a.id, name: a.name })),
            );
        } catch {
            this.accounts.set([]);
        }
    }

    setType(type: TransactionType) {
        this.form.type = type;
        this.rebuildCategories();
        this.form.category = (type === 'income' ? INCOME_CATS : EXPENSE_CATS)[0];
    }

    private rebuildCategories() {
        const cats = this.form.type === 'income' ? INCOME_CATS : EXPENSE_CATS;
        this.categoryOptions.set(cats.map(c => ({ value: c, label: this.t('categories.' + c) })));
    }

    openAdd() {
        this.form = { type: 'expense', category: 'housing', amount: 0, account_id: this.accounts()[0]?.id ?? null, frequency: 'monthly', start: new Date() };
        this.rebuildCategories();
        this.dialog = true;
    }

    save() {
        if (!this.form.amount || !this.form.account_id) return;
        this.saving.set(true);
        // The amount is typed in the user's display currency; store it as-is with
        // its currency code (rules materialize into native-currency transactions).
        const payload: RecurringRuleCreate = {
            type: this.form.type,
            category: this.form.category,
            amount: this.form.amount,
            currency: this.cs.config().code,
            account_id: this.form.account_id,
            frequency: this.form.frequency,
            start_date: toLocalDateStr(this.form.start),
        };
        this.api.createRecurringRule(payload).subscribe({
            next: () => {
                this.saving.set(false);
                this.dialog = false;
                this.feedback.success(this.t('recurring.created'));
                this.load();
            },
            error: () => { this.saving.set(false); this.feedback.error(this.t('common.error')); },
        });
    }

    remove(r: RecurringRule) {
        this.api.deleteRecurringRule(r.id).subscribe({
            next: () => { this.feedback.success(this.t('recurring.deleted')); this.load(); },
            error: () => this.feedback.error(this.t('common.error')),
        });
    }
}
