import {
    ChangeDetectionStrategy, Component, EventEmitter, Output, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { I18nService } from '../../../i18n/i18n.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { FeedbackService } from '../../../core/ui/feedback.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import {
    ApiService, AssetCategory, HoldingPreviewItem,
} from '../../../core/services/api.service';

// Categories that a brokerage statement can plausibly hold.
const HOLDING_CATS: AssetCategory[] = [
    'stocks_brvm', 'stocks_intl', 'fcp', 'bonds', 'crypto', 'commodities', 'other',
];

type Step = 'upload' | 'review';

/** One editable holding row plus the UI-only `include` flag. */
interface HoldingRow extends HoldingPreviewItem {
    include: boolean;
}

/**
 * Broker-portfolio import wizard (S3-10): upload a BRVM/broker PDF ->
 * /imports/holdings/parse -> review and edit parsed holdings (with the raw
 * extracted text shown as a manual-entry fallback) -> commit, creating assets.
 */
@Component({
    selector: 'app-holdings-import-dialog',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule, FormsModule, ButtonModule, DialogModule, SelectModule,
        InputTextModule, InputNumberModule, CheckboxModule, ToastModule,
    ],
    providers: [MessageService],
    styles: [`:host ::ng-deep .import-qty-missing input { box-shadow: inset 0 0 0 1px var(--p-warning-500, #d97706); }`],
    template: `
        <p-toast />
        <p-dialog [transitionOptions]="'320ms cubic-bezier(0.34, 1.30, 0.64, 1)'" [visible]="visible()" (visibleChange)="visible.set($event)" [modal]="true" [draggable]="false" [dismissableMask]="true"
                  [style]="{ width: '95vw', maxWidth: '880px' }" [header]="t('addAssets.holdingsImport.title')"
                  styleClass="!rounded-2xl" (onHide)="reset()" data-testid="holdings-import-dialog">

            <!-- ── Step 1: upload ──────────────────────────────────────── -->
            @if (step() === 'upload') {
                <div class="flex flex-col gap-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="flex flex-col gap-1.5">
                            <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('addAssets.holdingsImport.currency') }}</label>
                            <p-select [(ngModel)]="currency" [options]="currencyOptions" optionLabel="label" optionValue="value"
                                      styleClass="w-full" appendTo="body" data-testid="holdings-import-currency" />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-sm text-surface-500 dark:text-surface-400">
                                {{ t('addAssets.holdingsImport.institution') }} <span class="text-surface-400 text-xs">{{ t('common.optional') }}</span>
                            </label>
                            <input pInputText [(ngModel)]="institution" [placeholder]="t('addAssets.holdingsImport.institutionPlaceholder')"
                                   class="w-full" data-testid="holdings-import-institution" />
                        </div>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('addAssets.holdingsImport.file') }}</label>
                        <label class="flex items-center justify-center gap-2 h-24 rounded-xl border-2 border-dashed
                                      cursor-pointer transition-colors text-surface-500 dark:text-surface-400"
                               [class]="dragOver()
                                   ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-900/30'
                                   : 'border-surface-300 dark:border-surface-700 hover:border-brand-500'"
                               (dragover)="onDragOver($event)" (dragleave)="onDragLeave($event)" (drop)="onDrop($event)">
                            <i class="pi pi-file-pdf"></i>
                            <span>{{ file() ? file()!.name : t('addAssets.holdingsImport.filePlaceholder') }}</span>
                            <input type="file" accept="application/pdf,.pdf" class="hidden"
                                   (change)="onFile($event)" data-testid="holdings-import-file" />
                        </label>
                    </div>
                    <!-- Said up front, not discovered after: SGI statements detail stocks
                         only and print funds (OPCVM / FCP) as one total. -->
                    <p class="m-0 flex items-start gap-2 text-xs text-surface-500 dark:text-surface-400" data-testid="holdings-import-fcp-note">
                        <i class="pi pi-info-circle text-[12px] mt-0.5 text-ochre-600 dark:text-ochre-400" aria-hidden="true"></i>
                        <span>{{ t('addAssets.holdingsImport.fcpManualNote') }}</span>
                    </p>
                    @if (parseError()) {
                        <div class="text-sm text-negative bg-negative-50 dark:bg-negative-500/10 rounded-lg px-3 py-2" data-testid="holdings-import-error">{{ parseError() }}</div>
                    }
                </div>
            }

            <!-- ── Step 2: review ──────────────────────────────────────── -->
            @if (step() === 'review') {
                <div class="flex flex-col gap-3">
                    <div class="flex items-center gap-2 text-sm">
                        <span class="text-surface-500 dark:text-surface-400">{{ t('addAssets.holdingsImport.willImport', { n: includedCount() }) }}</span>
                        @if (statementDate()) {
                            <span class="text-surface-400 text-xs">· {{ t('addAssets.holdingsImport.statementDate', { d: statementDate()! }) }}</span>
                        }
                        <span class="flex-1"></span>
                        <button pButton size="small" [outlined]="true" icon="pi pi-plus"
                                [label]="t('addAssets.holdingsImport.addRow')" (click)="addRow()" data-testid="holdings-import-add-row"></button>
                    </div>

                    @if (fcpTotal() !== null) {
                        <!-- The statement carries funds we could not detail: say how much and offer a pre-filled fcp line. -->
                        <div class="flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-sm bg-ochre-50 dark:bg-ochre-500/10 text-surface-700 dark:text-surface-200"
                             data-testid="holdings-import-fcp-hint">
                            <i class="pi pi-exclamation-circle text-ochre-600 dark:text-ochre-400 mt-0.5" aria-hidden="true"></i>
                            <span class="flex-1">{{ t('addAssets.holdingsImport.fcpManualHint', { amount: fcpAmountLabel() }) }}</span>
                            <button pButton size="small" [text]="true" icon="pi pi-plus"
                                    [label]="t('addAssets.holdingsImport.addFcpRow')" (click)="addRow('fcp')"
                                    data-testid="holdings-import-add-fcp"></button>
                        </div>
                    }

                    <div class="overflow-auto max-h-[42vh] rounded-xl border border-surface-200 dark:border-surface-800">
                        <table class="w-full text-sm">
                            <thead class="sticky top-0 bg-surface-50 dark:bg-surface-900 text-surface-500 dark:text-surface-400 text-xs uppercase">
                                <tr>
                                    <th class="p-2 w-8"></th>
                                    <th class="p-2 text-left">{{ t('addAssets.fields.name') }}</th>
                                    <th class="p-2 text-left">{{ t('addAssets.holdingsImport.category') }}</th>
                                    <th class="p-2 text-right">{{ t('addAssets.fields.quantity') }}</th>
                                    <th class="p-2 text-right">{{ t('addAssets.fields.currentValue') }}</th>
                                    <th class="p-2 w-8"></th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (row of rows(); track $index; let i = $index) {
                                    <tr class="border-t border-surface-100 dark:border-surface-800"
                                        [class.opacity-45]="!row.include" data-testid="holdings-import-review-row">
                                        <td class="p-2 text-center">
                                            <p-checkbox [(ngModel)]="row.include" [binary]="true" data-testid="holdings-import-row-include" />
                                        </td>
                                        <td class="p-2">
                                            <input pInputText [(ngModel)]="row.name" class="w-full !py-1.5 !text-sm"
                                                   [placeholder]="t('addAssets.fields.name')" data-testid="holdings-import-name" />
                                        </td>
                                        <td class="p-2">
                                            <p-select [(ngModel)]="row.category" [options]="categoryOptions()" optionLabel="label" optionValue="value"
                                                      styleClass="w-full" appendTo="body" data-testid="holdings-import-category" />
                                        </td>
                                        <td class="p-2 text-right w-28">
                                            <p-inputnumber [locale]="cs.inputLocale()" [(ngModel)]="row.quantity" [min]="0" [maxFractionDigits]="4"
                                                           styleClass="w-full" inputStyleClass="w-full !py-1.5 !text-right !text-sm"
                                                           [class.import-qty-missing]="row.include && needsQuantity(row.category) && !(row.quantity && row.quantity > 0)"
                                                           data-testid="holdings-import-quantity" />
                                        </td>
                                        <td class="p-2 text-right w-36">
                                            <p-inputnumber [locale]="cs.inputLocale()" [(ngModel)]="row.current_value" [min]="0" [maxFractionDigits]="2"
                                                           styleClass="w-full" inputStyleClass="w-full !py-1.5 !text-right !text-sm" />
                                        </td>
                                        <td class="p-2 text-center">
                                            <button pButton icon="pi pi-trash" severity="danger" [text]="true" size="small"
                                                    (click)="removeRow(i)"></button>
                                        </td>
                                    </tr>
                                }
                                @if (rows().length === 0) {
                                    <tr><td colspan="6" class="p-6 text-center text-surface-400" data-testid="holdings-import-empty">
                                        {{ t(rawText() ? 'addAssets.holdingsImport.emptyParse' : 'addAssets.holdingsImport.emptyScan') }}
                                    </td></tr>
                                }
                            </tbody>
                        </table>
                    </div>
                    @if (rowsMissingQuantity() > 0) {
                        <p class="text-xs text-warning-700 dark:text-warning-300 mt-2 mb-0 flex items-center gap-1.5" data-testid="holdings-import-quantity-hint">
                            <i class="pi pi-exclamation-triangle text-[11px]" aria-hidden="true"></i>{{ t('addAssets.holdingsImport.quantityRequired') }}
                        </p>
                    }

                    <!-- Raw extracted text: manual-entry fallback when parsing misses rows. -->
                    @if (rawText()) {
                        <details class="rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900/50">
                            <summary class="cursor-pointer select-none px-3 py-2 text-sm text-surface-600 dark:text-surface-300">
                                {{ t('addAssets.holdingsImport.rawText') }}
                            </summary>
                            <pre class="px-3 pb-3 text-xs text-surface-500 dark:text-surface-400 whitespace-pre-wrap max-h-56 overflow-auto" data-testid="holdings-import-raw">{{ rawText() }}</pre>
                        </details>
                    }
                </div>
            }

            <ng-template #footer>
                <button pButton [label]="t('common.cancel')" [outlined]="true" (click)="visible.set(false)"></button>
                @if (step() === 'upload') {
                    <button pButton [label]="t('addAssets.holdingsImport.parse')" [loading]="parsing()" [disabled]="!file()"
                            (click)="parse()" styleClass="omaad-cta" data-testid="holdings-import-parse"></button>
                } @else {
                    <button pButton [label]="t('common.back')" [outlined]="true" (click)="step.set('upload')"></button>
                    <button pButton [label]="t('addAssets.holdingsImport.commit', { n: includedCount() })" [loading]="committing()"
                            [disabled]="!canCommit()" (click)="commit()" styleClass="omaad-cta"
                            data-testid="holdings-import-commit"></button>
                }
            </ng-template>
        </p-dialog>
    `,
})
export class HoldingsImportDialog {
    private api = inject(ApiService);
    private feedback = inject(FeedbackService);
    private analytics = inject(AnalyticsService);
    private i18n = inject(I18nService);
    protected cs = inject(CurrencyService);   // template: [locale]
    private toast = inject(MessageService);
    t(k: string, p?: Record<string, string | number>): string { return this.i18n.t(k, p); }

    /** Emitted after a successful commit (count of created assets). */
    @Output() imported = new EventEmitter<number>();

    // Deliberately NOT offering XAF: this imports a BRVM statement, and BRVM
    // instruments are quoted in XOF (UEMOA). A Central-Africa user still reads
    // the resulting holdings in their own display currency.
    readonly currencyOptions = [
        { label: 'FCFA (XOF)', value: 'XOF' },
        { label: 'Euro (€)', value: 'EUR' },
        { label: 'Dollar ($)', value: 'USD' },
    ];

    visible = signal(false);
    step = signal<Step>('upload');

    currency = 'XOF';
    institution: string | null = null;
    file = signal<File | null>(null);
    dragOver = signal(false);

    parsing = signal(false);
    committing = signal(false);
    parseError = signal<string | null>(null);
    rawText = signal('');
    rows = signal<HoldingRow[]>([]);
    /** OPCVM / FCP total printed on the statement without per-fund lines. */
    fcpTotal = signal<number | null>(null);
    statementDate = signal<string | null>(null);

    /** Public entry point: called by the parent to open the wizard fresh. */
    open(currency = 'XOF', institution?: string | null) {
        this.reset();
        this.currency = currency;
        this.institution = institution ?? null;
        this.visible.set(true);
    }

    reset() {
        this.step.set('upload');
        this.file.set(null);
        this.rows.set([]);
        this.rawText.set('');
        this.fcpTotal.set(null);
        this.statementDate.set(null);
        this.parseError.set(null);
        this.parsing.set(false);
        this.committing.set(false);
    }

    categoryOptions(): { label: string; value: AssetCategory }[] {
        return HOLDING_CATS.map(c => ({ value: c, label: this.t('addAssets.wizard.cards.' + c + '.label') }));
    }

    onFile(ev: Event) {
        const input = ev.target as HTMLInputElement;
        this.handleFile(input.files?.[0]);
    }

    // Drag-and-drop. preventDefault on dragover is REQUIRED for drop to fire;
    // without it (and on drop) the browser navigates to the dropped file,
    // unloading the SPA and dropping the in-memory session.
    onDragOver(ev: DragEvent) { ev.preventDefault(); this.dragOver.set(true); }
    onDragLeave(ev: DragEvent) { ev.preventDefault(); this.dragOver.set(false); }
    onDrop(ev: DragEvent) {
        ev.preventDefault();
        ev.stopPropagation();
        this.dragOver.set(false);
        this.handleFile(ev.dataTransfer?.files?.[0]);
    }

    private handleFile(f: File | null | undefined) {
        if (f) { this.file.set(f); this.parseError.set(null); }
    }

    parse() {
        const f = this.file();
        if (!f) return;
        this.parsing.set(true);
        this.parseError.set(null);
        this.api.parseImportHoldings(f, this.currency, this.institution).subscribe({
            next: (res) => {
                // The footer names the SGI: fill the field the user left blank.
                if (!this.institution?.trim() && res.institution_guess) this.institution = res.institution_guess;
                this.rows.set(res.holdings.map(h => ({ ...h, include: true })));
                this.rawText.set(res.text ?? '');
                const fcp = res.unparsed_totals?.['opcvm'];
                this.fcpTotal.set(typeof fcp === 'number' && fcp > 0 ? fcp : null);
                this.statementDate.set(res.statement_date ? this.formatDate(res.statement_date) : null);
                this.parsing.set(false);
                this.step.set('review');
                // Counts and the guessed SGI only: no text, amounts or names.
                this.analytics.track('holdings_import_parsed', {
                    rows: res.holdings.length,
                    has_text: !!res.text,
                    has_fcp_total: this.fcpTotal() !== null,
                    institution_guess: res.institution_guess ?? null,
                    currency: this.currency,
                });
                if (res.holdings.length === 0) {
                    this.toast.add({
                        severity: 'info',
                        summary: this.t(res.text ? 'addAssets.holdingsImport.emptyParseHint' : 'addAssets.holdingsImport.emptyScanHint'),
                    });
                }
            },
            error: (e) => {
                this.parsing.set(false);
                this.parseError.set(this.errorText(e));
            },
        });
    }

    addRow(category: AssetCategory = 'stocks_brvm') {
        this.rows.update(rs => [...rs, {
            name: '', category, current_value: 0, currency: this.currency,
            quantity: null, purchase_value: null, institution: this.institution, include: true,
        }]);
    }

    /** A 422 detail may be a string, a {code,message} object or a pydantic
     *  error list: never let "[object Object]" reach the screen. */
    private errorText(e: unknown): string {
        const detail = (e as { error?: { detail?: unknown } })?.error?.detail;
        if (typeof detail === 'string' && detail.trim()) return detail;
        if (detail && typeof detail === 'object') {
            const msg = (detail as { message?: unknown }).message;
            if (typeof msg === 'string' && msg.trim()) return msg;
        }
        return this.t('common.error');
    }

    /** The statement total is a RAW amount in the statement's currency: format
     *  it as-is (no EUR-base conversion) with the currency label. */
    fcpAmountLabel(): string {
        const v = this.fcpTotal();
        if (v === null) return '';
        const symbol = ({ XOF: 'FCFA', EUR: '€', USD: '$' } as Record<string, string>)[this.currency] ?? this.currency;
        return `${this.cs.formatDisplayNumber(v, 0)} ${symbol}`;
    }

    private formatDate(iso: string): string {
        const d = new Date(iso + 'T00:00:00');
        return isNaN(d.getTime()) ? iso : d.toLocaleDateString(this.i18n.lang() === 'en' ? 'en-GB' : 'fr-FR');
    }

    removeRow(i: number) {
        this.rows.update(rs => rs.filter((_, idx) => idx !== i));
    }

    includedCount(): number {
        return this.rows().filter(r => r.include && r.name.trim() && r.current_value >= 0).length;
    }

    /** Stock/fund rows without a unit count: the API refuses them (422
     *  QUANTITY_REQUIRED) because close × quantity is how they are priced. */
    rowsMissingQuantity(): number {
        return this.rows().filter(r => r.include && this.needsQuantity(r.category) && !(r.quantity && r.quantity > 0)).length;
    }

    needsQuantity(category: string): boolean {
        return category === 'stocks_brvm' || category === 'fcp';
    }

    canCommit(): boolean {
        // Every included row needs a name; value defaults to 0 (allowed by the
        // API); a BRVM stock / FCP row also needs its quantity.
        const included = this.rows().filter(r => r.include);
        return included.length > 0 && included.every(r => !!r.name.trim()) && this.rowsMissingQuantity() === 0;
    }

    commit() {
        if (!this.canCommit()) return;
        const included = this.rows().filter(r => r.include);
        this.committing.set(true);
        this.api.commitImportHoldings({
            items: included.map(r => ({
                name: r.name.trim(),
                category: r.category,
                current_value: r.current_value || 0,
                currency: this.currency,
                quantity: r.quantity ?? null,
                purchase_value: r.purchase_value && r.purchase_value > 0 ? r.purchase_value : null,
                institution: this.institution ?? undefined,
            })),
        }).subscribe({
            next: (res) => {
                this.committing.set(false);
                this.visible.set(false);
                this.analytics.track('holdings_import_committed', {
                    created: res.created,
                    skipped: res.skipped ?? 0,
                    fcp_rows: included.filter(r => r.category === 'fcp').length,
                    institution_guess: this.institution ?? null,
                });
                this.feedback.success(this.t('addAssets.holdingsImport.done', { created: res.created }));
                this.imported.emit(res.created);
            },
            error: () => {
                this.committing.set(false);
                this.feedback.error(this.t('addAssets.holdingsImport.commitError'));
            },
        });
    }
}
