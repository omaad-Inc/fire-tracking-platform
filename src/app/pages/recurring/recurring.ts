import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { I18nService } from '../../i18n/i18n.service';
import {
    ApiService, LiquidAsset, RecurringRule, RecurringRuleCreate, RecurringFrequency,
    TransactionType, TransactionCategory,
} from '../../core/services/api.service';
import { AppAmountComponent } from '../../core/components/app-amount.component';
import { LoadErrorComponent } from '../../core/components/load-error.component';
import { PageHeaderComponent, UiCardComponent, EmptyStateComponent, ChipComponent } from '../../core/ui';

const INCOME_CATS: TransactionCategory[] = ['salary', 'freelance', 'rental_income', 'other_income'];
const EXPENSE_CATS: TransactionCategory[] = ['housing', 'family_support', 'tontine', 'subscriptions', 'utilities', 'transport', 'groceries', 'other_expense'];

@Component({
    selector: 'app-recurring',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule, FormsModule, ButtonModule, DialogModule, SelectModule,
        InputNumberModule, DatePickerModule, ToastModule,
        AppAmountComponent, LoadErrorComponent,
        PageHeaderComponent, UiCardComponent, EmptyStateComponent, ChipComponent,
    ],
    providers: [MessageService],
    template: `
        <p-toast />
        <app-page-header icon="pi-sync" [title]="t('recurring.title')" [subtitle]="t('recurring.subtitle')">
            <button actions pButton [outlined]="true" size="small" icon="pi pi-bolt"
                    [label]="t('recurring.runNow')" (click)="runNow()"></button>
            <button actions pButton size="small" icon="pi pi-plus"
                    [label]="t('recurring.add')" (click)="openAdd()" styleClass="omaad-cta !rounded-xl"></button>
        </app-page-header>

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
                                    <app-amount [value]="r.amount" />
                                </span>
                                <button pButton icon="pi pi-trash" severity="danger" [text]="true" size="small"
                                        (click)="remove(r)"></button>
                            </div>
                        </div>
                    </app-ui-card>
                }
            </div>
        }

        <p-dialog [(visible)]="dialog" [modal]="true" [draggable]="false" [style]="{ width: '95vw', maxWidth: '520px' }"
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
                    <p-inputnumber [(ngModel)]="form.amount" [min]="0" [maxFractionDigits]="2" styleClass="w-full" inputStyleClass="w-full" />
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('recurring.form.account') }}</label>
                    <p-select [(ngModel)]="form.account_id" [options]="accounts()" optionLabel="name" optionValue="id"
                              styleClass="w-full" appendTo="body" />
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('recurring.form.frequency') }}</label>
                        <p-select [(ngModel)]="form.frequency" [options]="frequencyOptions()" optionLabel="label" optionValue="value"
                                  styleClass="w-full" appendTo="body" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('recurring.form.startDate') }}</label>
                        <p-datepicker [(ngModel)]="form.start" [showIcon]="true" dateFormat="dd/mm/yy" styleClass="w-full" appendTo="body" />
                    </div>
                </div>
            </div>
            <ng-template #footer>
                <button pButton [label]="t('common.cancel')" [outlined]="true" (click)="dialog = false"></button>
                <button pButton [label]="t('common.save')" [loading]="saving()" (click)="save()"
                        styleClass="omaad-cta"></button>
            </ng-template>
        </p-dialog>
    `,
})
export class RecurringPage implements OnInit {
    private api = inject(ApiService);
    private i18n = inject(I18nService);
    private toast = inject(MessageService);
    t(k: string, p?: Record<string, string | number>): string { return this.i18n.t(k, p); }

    rules = signal<RecurringRule[]>([]);
    accounts = signal<LiquidAsset[]>([]);
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

    async ngOnInit() {
        // Opportunistic materialization on load (idempotent), then load rules.
        try { await firstValueFrom(this.api.runRecurring()); } catch { /* backend may lack the route yet */ }
        this.load();
    }

    runNow() {
        this.api.runRecurring().subscribe({
            next: (res) => {
                this.toast.add({ severity: 'success', summary: this.t('recurring.runDone', { count: res.created }) });
                this.load();
            },
            error: () => this.toast.add({ severity: 'error', summary: this.t('common.error') }),
        });
    }

    load() {
        this.loading.set(true);
        this.error.set(false);
        this.api.listRecurringRules().subscribe({
            next: (rules) => { this.rules.set(rules); this.loading.set(false); },
            error: () => { this.error.set(true); this.loading.set(false); },
        });
        this.api.listLiquidAssets().subscribe({ next: (a) => this.accounts.set(a), error: () => {} });
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
        const payload: RecurringRuleCreate = {
            type: this.form.type,
            category: this.form.category,
            amount: this.form.amount,
            currency: 'XOF',
            account_id: this.form.account_id,
            frequency: this.form.frequency,
            start_date: this.form.start.toISOString().slice(0, 10),
        };
        this.api.createRecurringRule(payload).subscribe({
            next: () => {
                this.saving.set(false);
                this.dialog = false;
                this.toast.add({ severity: 'success', summary: this.t('recurring.created') });
                this.load();
            },
            error: () => { this.saving.set(false); this.toast.add({ severity: 'error', summary: this.t('common.error') }); },
        });
    }

    remove(r: RecurringRule) {
        this.api.deleteRecurringRule(r.id).subscribe({
            next: () => { this.toast.add({ severity: 'success', summary: this.t('recurring.deleted') }); this.load(); },
            error: () => this.toast.add({ severity: 'error', summary: this.t('common.error') }),
        });
    }
}
