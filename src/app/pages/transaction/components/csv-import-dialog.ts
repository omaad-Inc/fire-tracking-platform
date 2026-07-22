import {
    ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { I18nService } from '../../../i18n/i18n.service';
import {
    ApiService, ColumnMapping, ColumnsPreviewResponse, LiquidAsset,
    TxnPreviewItem, TransactionCategory, TransactionType,
} from '../../../core/services/api.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { ChipComponent } from '../../../core/ui';

// Category choices per direction (single source: the i18n `categories.*` dict).
const INCOME_CATS: TransactionCategory[] = [
    'salary', 'freelance', 'dividends', 'rental_income', 'interest',
    'gift_received', 'family_support_received', 'tontine_payout', 'other_income',
];
const EXPENSE_CATS: TransactionCategory[] = [
    'housing', 'utilities', 'groceries', 'transport', 'health', 'insurance',
    'entertainment', 'dining', 'shopping', 'education', 'subscriptions', 'travel',
    'gift_given', 'family_support', 'religious', 'ceremony', 'airtime', 'tontine',
    'taxes', 'savings', 'investment', 'debt_payment', 'other_expense',
];

type Step = 'upload' | 'map' | 'review';
type AmountMode = 'single' | 'split';

/** One preview row plus the UI-only `include` flag driving what gets committed. */
interface ReviewRow extends TxnPreviewItem {
    include: boolean;
}

/**
 * CSV import wizard (S3-9): upload -> pick account -> map columns -> parse ->
 * editable, dedup-flagged review -> commit. Preview-then-commit end to end;
 * nothing is written until the user confirms on the review step.
 */
@Component({
    selector: 'app-csv-import-dialog',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule, FormsModule, ButtonModule, DialogModule, SelectModule,
        CheckboxModule, ToggleSwitchModule, ToastModule, ChipComponent,
    ],
    providers: [MessageService],
    template: `
        <p-toast />
        <p-dialog [(visible)]="visible" [modal]="true" [draggable]="false" [dismissableMask]="true"
                  [style]="{ width: '95vw', maxWidth: '860px' }" [header]="t('transactions.import.title')"
                  styleClass="!rounded-2xl" (onHide)="reset()" data-testid="csv-import-dialog">

            <!-- Stepper -->
            <div class="flex items-center gap-2 mb-5 text-xs font-semibold">
                @for (s of steps; track s.key; let i = $index) {
                    <div class="flex items-center gap-2">
                        <span class="w-6 h-6 rounded-full flex items-center justify-center"
                              [class]="step() === s.key
                                  ? 'bg-brand-700 text-white dark:bg-ochre-400 dark:text-surface-950'
                                  : (stepIndex() > i ? 'bg-positive-100 text-positive-600 dark:bg-positive-500/20' : 'bg-surface-100 text-surface-400 dark:bg-surface-800')">
                            @if (stepIndex() > i) { <i class="pi pi-check text-[10px]"></i> } @else { {{ i + 1 }} }
                        </span>
                        <span [class]="step() === s.key ? 'text-surface-900 dark:text-surface-0' : 'text-surface-400'">
                            {{ t(s.label) }}
                        </span>
                    </div>
                    @if (i < steps.length - 1) { <span class="flex-1 h-px bg-surface-200 dark:bg-surface-700"></span> }
                }
            </div>

            <!-- ── Step 1: upload + target account ─────────────────────── -->
            @if (step() === 'upload') {
                <div class="flex flex-col gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('transactions.import.account') }}</label>
                        <p-select [(ngModel)]="accountId" [options]="accounts()" optionLabel="name" optionValue="id"
                                  [placeholder]="t('transactions.form.selectAccount')"
                                  [emptyMessage]="t('transactions.form.noMonetaryAccount')"
                                  styleClass="w-full" appendTo="body" inputId="csv-account"
                                  data-testid="csv-import-account" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('transactions.import.file') }}</label>
                        <label class="flex items-center justify-center gap-2 h-24 rounded-xl border-2 border-dashed
                                      border-surface-300 dark:border-surface-700 cursor-pointer
                                      hover:border-brand-500 transition-colors text-surface-500 dark:text-surface-400">
                            <i class="pi pi-upload"></i>
                            <span>{{ file() ? file()!.name : t('transactions.import.filePlaceholder') }}</span>
                            <input type="file" accept=".csv,text/csv" class="hidden"
                                   (change)="onFile($event)" data-testid="csv-import-file" />
                        </label>
                        @if (previewing()) {
                            <span class="text-xs text-surface-400">{{ t('common.loading') }}</span>
                        }
                    </div>
                </div>
            }

            <!-- ── Step 2: column mapping ──────────────────────────────── -->
            @if (step() === 'map') {
                <div class="flex flex-col gap-4">
                    <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('transactions.import.mapHint') }}</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="flex flex-col gap-1.5">
                            <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('transactions.import.colDate') }} *</label>
                            <p-select [(ngModel)]="mapping.date" [options]="headers()" [placeholder]="t('transactions.import.selectColumn')"
                                      styleClass="w-full" appendTo="body" data-testid="csv-import-map-date" />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('transactions.import.colDescription') }} *</label>
                            <p-select [(ngModel)]="mapping.description" [options]="headers()" [placeholder]="t('transactions.import.selectColumn')"
                                      styleClass="w-full" appendTo="body" data-testid="csv-import-map-description" />
                        </div>
                    </div>

                    <div class="flex gap-2">
                        <button pButton size="small" [outlined]="amountMode() !== 'single'" [label]="t('transactions.import.singleAmount')"
                                (click)="amountMode.set('single')" class="flex-1"></button>
                        <button pButton size="small" [outlined]="amountMode() !== 'split'" [label]="t('transactions.import.splitAmount')"
                                (click)="amountMode.set('split')" class="flex-1"></button>
                    </div>

                    @if (amountMode() === 'single') {
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                            <div class="flex flex-col gap-1.5">
                                <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('transactions.import.colAmount') }} *</label>
                                <p-select [(ngModel)]="mapping.amount" [options]="headers()" [placeholder]="t('transactions.import.selectColumn')"
                                          styleClass="w-full" appendTo="body" data-testid="csv-import-map-amount" />
                            </div>
                            <div class="flex items-center gap-2 pb-2">
                                <p-toggleswitch [(ngModel)]="mapping.expense_is_negative" inputId="csv-sign" />
                                <label for="csv-sign" class="text-sm text-surface-600 dark:text-surface-300">{{ t('transactions.import.expenseNegative') }}</label>
                            </div>
                        </div>
                    } @else {
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div class="flex flex-col gap-1.5">
                                <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('transactions.import.colDebit') }} *</label>
                                <p-select [(ngModel)]="mapping.debit" [options]="headers()" [placeholder]="t('transactions.import.selectColumn')"
                                          styleClass="w-full" appendTo="body" data-testid="csv-import-map-debit" />
                            </div>
                            <div class="flex flex-col gap-1.5">
                                <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('transactions.import.colCredit') }} *</label>
                                <p-select [(ngModel)]="mapping.credit" [options]="headers()" [placeholder]="t('transactions.import.selectColumn')"
                                          styleClass="w-full" appendTo="body" data-testid="csv-import-map-credit" />
                            </div>
                        </div>
                    }

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div class="flex flex-col gap-1.5">
                            <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('transactions.import.colCurrency') }}</label>
                            <p-select [(ngModel)]="mapping.currency" [options]="optionalHeaders()" optionLabel="label" optionValue="value"
                                      styleClass="w-full" appendTo="body" data-testid="csv-import-map-currency" />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('transactions.import.defaultCurrency') }}</label>
                            <p-select [(ngModel)]="mapping.default_currency" [options]="currencyOptions" styleClass="w-full" appendTo="body" />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('transactions.import.decimal') }}</label>
                            <p-select [(ngModel)]="mapping.decimal" [options]="decimalOptions" optionLabel="label" optionValue="value"
                                      styleClass="w-full" appendTo="body" />
                        </div>
                    </div>

                    @if (parseError()) {
                        <div class="text-sm text-negative bg-negative-50 dark:bg-negative-500/10 rounded-lg px-3 py-2">{{ parseError() }}</div>
                    }
                </div>
            }

            <!-- ── Step 3: review ──────────────────────────────────────── -->
            @if (step() === 'review') {
                <div class="flex flex-col gap-3">
                    <div class="flex flex-wrap items-center gap-2 text-sm">
                        <app-chip [label]="t('transactions.import.reviewCount', { n: rows().length })" tone="neutral" />
                        @if (duplicateCount() > 0) {
                            <app-chip [label]="t('transactions.import.reviewDuplicates', { n: duplicateCount() })" tone="negative" />
                        }
                        <span class="flex-1"></span>
                        <span class="text-surface-500 dark:text-surface-400">{{ t('transactions.import.willImport', { n: includedCount() }) }}</span>
                    </div>

                    <div class="overflow-auto max-h-[46vh] rounded-xl border border-surface-200 dark:border-surface-800">
                        <table class="w-full text-sm">
                            <thead class="sticky top-0 bg-surface-50 dark:bg-surface-900 text-surface-500 dark:text-surface-400 text-xs uppercase">
                                <tr>
                                    <th class="p-2 w-8"></th>
                                    <th class="p-2 text-left">{{ t('common.date') }}</th>
                                    <th class="p-2 text-left">{{ t('transactions.form.description') }}</th>
                                    <th class="p-2 text-left">{{ t('transactions.form.category') }}</th>
                                    <th class="p-2 text-right">{{ t('common.amount') }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (row of rows(); track row.import_ref; let i = $index) {
                                    <tr class="border-t border-surface-100 dark:border-surface-800"
                                        [class.opacity-45]="!row.include" data-testid="csv-import-review-row">
                                        <td class="p-2 text-center">
                                            <p-checkbox [(ngModel)]="row.include" [binary]="true" data-testid="csv-import-row-include" />
                                        </td>
                                        <td class="p-2 whitespace-nowrap text-surface-700 dark:text-surface-300">{{ row.date }}</td>
                                        <td class="p-2 max-w-[220px]">
                                            <div class="truncate text-surface-800 dark:text-surface-200">{{ row.description }}</div>
                                            <div class="flex gap-1 mt-0.5">
                                                @if (row.is_duplicate) { <app-chip [label]="t('transactions.import.duplicate')" tone="negative" /> }
                                                @else if (row.possible_duplicate) { <app-chip [label]="t('transactions.import.maybeDuplicate')" tone="warning" /> }
                                            </div>
                                        </td>
                                        <td class="p-2">
                                            <p-select [(ngModel)]="row.category" [options]="categoryOptionsFor(row.type)"
                                                      optionLabel="label" optionValue="value" styleClass="w-full"
                                                      appendTo="body" data-testid="csv-import-category" />
                                        </td>
                                        <td class="p-2 text-right font-semibold whitespace-nowrap tabular-nums"
                                            [class]="row.type === 'income' ? 'text-positive' : 'text-surface-900 dark:text-surface-0'">
                                            {{ row.type === 'income' ? '+' : '−' }}{{ row.amount | number:'1.0-2' }} {{ row.currency }}
                                        </td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            }

            <ng-template #footer>
                <button pButton [label]="t('common.cancel')" [outlined]="true" (click)="visible = false"></button>
                @if (step() === 'upload') {
                    <button pButton [label]="t('common.next')" [disabled]="!canLeaveUpload()"
                            (click)="goMap()" styleClass="omaad-cta" data-testid="csv-import-next"></button>
                } @else if (step() === 'map') {
                    <button pButton [label]="t('common.back')" [outlined]="true" (click)="step.set('upload')"></button>
                    <button pButton [label]="t('transactions.import.parse')" [loading]="parsing()" [disabled]="!mappingValid()"
                            (click)="parse()" styleClass="omaad-cta" data-testid="csv-import-parse"></button>
                } @else {
                    <button pButton [label]="t('common.back')" [outlined]="true" (click)="step.set('map')"></button>
                    <button pButton [label]="t('transactions.import.commit', { n: includedCount() })" [loading]="committing()"
                            [disabled]="includedCount() === 0" (click)="commit()" styleClass="omaad-cta"
                            data-testid="csv-import-commit"></button>
                }
            </ng-template>
        </p-dialog>
    `,
})
export class CsvImportDialog implements OnInit {
    private api = inject(ApiService);
    private i18n = inject(I18nService);
    private cs = inject(CurrencyService);
    private toast = inject(MessageService);
    t(k: string, p?: Record<string, string | number>): string { return this.i18n.t(k, p); }

    /** Emitted after a successful commit so the parent can reload the list. */
    @Output() imported = new EventEmitter<number>();

    readonly steps = [
        { key: 'upload' as Step, label: 'transactions.import.stepUpload' },
        { key: 'map' as Step, label: 'transactions.import.stepMap' },
        { key: 'review' as Step, label: 'transactions.import.stepReview' },
    ];
    readonly currencyOptions = ['XOF', 'EUR', 'USD'];
    readonly decimalOptions = [
        { label: '1 234.56', value: '.' },
        { label: '1 234,56', value: ',' },
    ];

    visible = false;
    step = signal<Step>('upload');
    stepIndex = signal(0);
    amountMode = signal<AmountMode>('single');

    accounts = signal<LiquidAsset[]>([]);
    accountId: number | null = null;
    file = signal<File | null>(null);
    headers = signal<string[]>([]);

    previewing = signal(false);
    parsing = signal(false);
    committing = signal(false);
    parseError = signal<string | null>(null);

    rows = signal<ReviewRow[]>([]);

    mapping: ColumnMapping = this.blankMapping();

    ngOnInit() {
        this.api.listLiquidAssets().subscribe({
            next: (a) => this.accounts.set(a),
            error: () => this.accounts.set([]),
        });
    }

    /** Public entry point: called by the parent to open the wizard fresh. */
    open() {
        this.reset();
        this.accountId = this.accounts()[0]?.id ?? null;
        this.visible = true;
    }

    reset() {
        this.step.set('upload');
        this.stepIndex.set(0);
        this.amountMode.set('single');
        this.file.set(null);
        this.headers.set([]);
        this.rows.set([]);
        this.parseError.set(null);
        this.previewing.set(false);
        this.parsing.set(false);
        this.committing.set(false);
        this.mapping = this.blankMapping();
    }

    private blankMapping(): ColumnMapping {
        return {
            date: '', description: '', amount: null, debit: null, credit: null,
            currency: null, reference: null, date_format: null, decimal: '.',
            default_currency: this.cs?.config()?.code ?? 'XOF', expense_is_negative: true,
        };
    }

    // ── Step 1 ──────────────────────────────────────────────────────────────
    canLeaveUpload(): boolean {
        return !!this.file() && this.headers().length > 0 && this.accountId != null;
    }

    onFile(ev: Event) {
        const input = ev.target as HTMLInputElement;
        const f = input.files?.[0];
        if (!f) return;
        this.file.set(f);
        this.headers.set([]);
        this.previewing.set(true);
        this.api.previewImportColumns(f).subscribe({
            next: (res) => {
                this.headers.set(res.headers);
                this.guessMapping(res);
                this.previewing.set(false);
            },
            error: () => {
                this.previewing.set(false);
                this.toast.add({ severity: 'error', summary: this.t('transactions.import.previewError') });
            },
        });
    }

    /** Best-effort auto-mapping from common FR/EN bank-statement header names. */
    private guessMapping(res: ColumnsPreviewResponse) {
        const find = (...needles: string[]) =>
            res.headers.find(h => needles.some(n => h.toLowerCase().includes(n))) ?? '';
        this.mapping.date = find('date') || this.mapping.date;
        this.mapping.description = find('desc', 'libell', 'label', 'motif', 'intitul') || this.mapping.description;
        const debit = find('debit', 'débit', 'retrait');
        const credit = find('credit', 'crédit', 'depot', 'dépôt', 'versement');
        if (debit && credit) {
            this.amountMode.set('split');
            this.mapping.debit = debit;
            this.mapping.credit = credit;
        } else {
            this.mapping.amount = find('montant', 'amount', 'valeur') || null;
        }
        this.mapping.currency = find('devise', 'currency', 'monnaie') || null;
        this.mapping.reference = find('reference', 'référence', 'ref') || null;
    }

    goMap() {
        if (!this.canLeaveUpload()) return;
        this.step.set('map');
        this.stepIndex.set(1);
    }

    // ── Step 2 ──────────────────────────────────────────────────────────────
    optionalHeaders(): { label: string; value: string | null }[] {
        return [{ label: this.t('transactions.import.none'), value: null },
            ...this.headers().map(h => ({ label: h, value: h }))];
    }

    mappingValid(): boolean {
        if (!this.mapping.date || !this.mapping.description) return false;
        return this.amountMode() === 'single'
            ? !!this.mapping.amount
            : !!(this.mapping.debit && this.mapping.credit);
    }

    parse() {
        const f = this.file();
        if (!f || !this.mappingValid()) return;
        // Send only the mode's amount columns so the backend picks the right branch.
        const m: ColumnMapping = { ...this.mapping };
        if (this.amountMode() === 'single') { m.debit = null; m.credit = null; }
        else { m.amount = null; }
        this.parsing.set(true);
        this.parseError.set(null);
        this.api.parseImportTransactions(f, m).subscribe({
            next: (res) => {
                this.rows.set(res.items.map(it => ({ ...it, include: !it.is_duplicate })));
                this.parsing.set(false);
                this.step.set('review');
                this.stepIndex.set(2);
                if (res.items.length === 0) {
                    this.toast.add({ severity: 'info', summary: this.t('transactions.import.emptyParse') });
                }
            },
            error: (e) => {
                this.parsing.set(false);
                this.parseError.set(e?.error?.detail ?? this.t('common.error'));
            },
        });
    }

    // ── Step 3 ──────────────────────────────────────────────────────────────
    categoryOptionsFor(type: TransactionType): { label: string; value: TransactionCategory }[] {
        const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;
        return cats.map(c => ({ value: c, label: this.i18n.categoryLabel(c) }));
    }

    duplicateCount(): number { return this.rows().filter(r => r.is_duplicate).length; }
    includedCount(): number { return this.rows().filter(r => r.include).length; }

    commit() {
        const included = this.rows().filter(r => r.include);
        if (this.accountId == null || included.length === 0) return;
        this.committing.set(true);
        this.api.commitImportTransactions({
            account_id: this.accountId,
            items: included.map(r => ({
                date: r.date, amount: Math.abs(r.amount), type: r.type, category: r.category,
                currency: r.currency, description: r.description, import_ref: r.import_ref,
            })),
        }).subscribe({
            next: (res) => {
                this.committing.set(false);
                this.visible = false;
                this.toast.add({
                    severity: 'success',
                    summary: this.t('transactions.import.done', { created: res.created, skipped: res.skipped }),
                });
                this.imported.emit(res.created);
            },
            error: () => {
                this.committing.set(false);
                this.toast.add({ severity: 'error', summary: this.t('transactions.import.commitError') });
            },
        });
    }
}
