import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { I18nService } from '../../../i18n/i18n.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { TransactionRecord } from '../../service/transactions.service';

/**
 * One table row, precomputed by the parent.
 *
 * The parent already owns category resolution (built-in + PRO-4 custom
 * categories), account naming and colours, so it hands down a flat view-model
 * rather than this component re-deriving any of it. That also makes every
 * column a plain sortable field instead of a function call in a sort comparator.
 */
export interface TxTableRow {
    rec: TransactionRecord;
    key: string;
    /** ISO yyyy-mm-dd: sorts lexicographically, which is also chronologically. */
    date: string;
    dateLabel: string;
    label: string;
    catLabel: string;
    catFg: string;
    catBg: string;
    icon: string;
    account: string;
    type: 'Income' | 'Expense' | 'Transfer';
    /** EUR-base magnitude, as stored. */
    amount: number;
    /** Signed, so sorting by amount ranks a big expense against a big income. */
    signed: number;
}

/**
 * The desktop transactions table (P1-2).
 *
 * The FIRST `p-table` in the app, so it sets the precedent: sortable columns,
 * a sticky header inside a scroll container (rather than a paginator, so
 * "select all" and "export" always mean the whole filtered set with no
 * page-vs-all ambiguity), and range selection.
 *
 * Selection is hand-rolled instead of `p-tableCheckbox` because PrimeNG's
 * checkbox column has no shift-range behaviour, which is the one interaction
 * that makes bulk re-categorising a year of groceries bearable.
 */
@Component({
    selector: 'app-transactions-table',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TableModule, ButtonModule, AppAmountComponent],
    template: `
        <div class="bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden">
            <p-table [value]="rows"
                     dataKey="key"
                     [scrollable]="true"
                     scrollHeight="60vh"
                     sortField="date"
                     [sortOrder]="-1"
                     styleClass="omaad-tx-table"
                     data-testid="tx-table">
                <ng-template #header>
                    <tr>
                        @if (!readonly) {
                            <th style="width:3rem" class="!text-center">
                                <input type="checkbox"
                                       class="omaad-check"
                                       data-testid="tx-select-all"
                                       [attr.aria-label]="t('transactions.table.selectAll')"
                                       [checked]="allSelected()"
                                       [indeterminate]="someSelected() && !allSelected()"
                                       (change)="toggleAll()" />
                            </th>
                        }
                        <th pSortableColumn="date" style="width:8.5rem">
                            {{ t('common.date') }} <p-sortIcon field="date" />
                        </th>
                        <th pSortableColumn="label">
                            {{ t('transactions.table.description') }} <p-sortIcon field="label" />
                        </th>
                        <th pSortableColumn="catLabel" style="width:12rem">
                            {{ t('transactions.table.category') }} <p-sortIcon field="catLabel" />
                        </th>
                        <th pSortableColumn="account" style="width:11rem">
                            {{ t('common.account') }} <p-sortIcon field="account" />
                        </th>
                        <th pSortableColumn="signed" style="width:9rem" class="!text-right">
                            {{ t('common.amount') }} <p-sortIcon field="signed" />
                        </th>
                        @if (!readonly) { <th style="width:5.5rem"></th> }
                    </tr>
                </ng-template>

                <ng-template #body let-row let-rowIndex="rowIndex">
                    <tr [class.omaad-row-selected]="isSelected(row.key)"
                        data-testid="tx-row"
                        [attr.data-key]="row.key">
                        @if (!readonly) {
                            <td class="!text-center">
                                <input type="checkbox"
                                       class="omaad-check"
                                       data-testid="tx-row-check"
                                       [attr.aria-label]="t('transactions.table.selectRow')"
                                       [checked]="isSelected(row.key)"
                                       (click)="onCheck($event, rowIndex)" />
                            </td>
                        }
                        <td class="whitespace-nowrap text-surface-500 dark:text-surface-400 text-xs">
                            {{ row.dateLabel }}
                        </td>
                        <td class="min-w-0">
                            <span class="block truncate font-medium text-surface-900 dark:text-surface-0">
                                {{ row.label }}
                            </span>
                        </td>
                        <td>
                            <span class="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full max-w-full"
                                  [style.color]="row.catFg" [style.background]="row.catBg">
                                <i [class]="row.icon + ' text-[10px]'" aria-hidden="true"></i>
                                <span class="truncate">{{ row.catLabel }}</span>
                            </span>
                        </td>
                        <td class="text-surface-500 dark:text-surface-400 text-xs">
                            <span class="block truncate">{{ row.account || '' }}</span>
                        </td>
                        <td class="!text-right font-bold whitespace-nowrap"
                            [ngClass]="row.type === 'Transfer'
                                ? 'text-surface-500 dark:text-surface-400'
                                : (row.type === 'Income' ? 'text-positive' : 'text-negative')">
                            <app-amount [value]="row.amount"
                                        [prefix]="row.type === 'Transfer' ? '' : (row.type === 'Income' ? '+' : '−')" />
                        </td>
                        @if (!readonly) {
                            <td class="!text-right whitespace-nowrap">
                                <button type="button"
                                        class="w-7 h-7 rounded-lg bg-surface-100 dark:bg-surface-800 inline-flex items-center justify-center hover:bg-brand-50 dark:hover:bg-brand-700/30 transition-colors"
                                        [attr.aria-label]="t('common.edit')"
                                        (click)="edit.emit(row.rec)">
                                    <i class="pi pi-pencil text-xs text-surface-500"></i>
                                </button>
                                <button type="button"
                                        class="w-7 h-7 ml-1 rounded-lg bg-surface-100 dark:bg-surface-800 inline-flex items-center justify-center hover:bg-negative-50 dark:hover:bg-negative-700/30 transition-colors"
                                        [attr.aria-label]="t('common.delete')"
                                        (click)="remove.emit(row.rec)">
                                    <i class="pi pi-trash text-xs text-surface-500"></i>
                                </button>
                            </td>
                        }
                    </tr>
                </ng-template>
            </p-table>
        </div>
    `,
    styles: [`
        /* Sticky header that reads as part of the card, not as a floating bar. */
        :host ::ng-deep .omaad-tx-table .p-datatable-thead > tr > th {
            background: var(--surface-50);
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: var(--text-color-secondary);
            border-bottom: 1px solid var(--surface-200);
            padding: 0.625rem 0.75rem;
        }
        :host ::ng-deep .omaad-tx-table .p-datatable-tbody > tr > td {
            padding: 0.625rem 0.75rem;
            font-size: 13px;
            border-bottom: 1px solid var(--surface-100);
        }
        :host ::ng-deep .omaad-tx-table .p-datatable-tbody > tr:hover > td {
            background: var(--surface-50);
        }
        :host ::ng-deep .omaad-tx-table .omaad-row-selected > td {
            background: rgba(199, 123, 60, 0.10);
        }
        /* Range-select with shift must not paint a text selection over the rows. */
        :host ::ng-deep .omaad-tx-table .p-datatable-tbody { user-select: none; }
        .omaad-check { width: 15px; height: 15px; accent-color: #C77B3C; cursor: pointer; }
        /* The app never sets a color-scheme, so a native checkbox paints its
           LIGHT chrome even under .app-dark: white boxes on the navy table.
           accent-color only covers the checked state, hence this. */
        :host-context(.app-dark) .omaad-check { color-scheme: dark; }
    `],
})
export class TransactionsTable {
    private i18n = inject(I18nService);

    @Input({ required: true }) rows: TxTableRow[] = [];
    /** Public share shell: no selection, no row actions. */
    @Input() readonly = false;

    @Output() edit = new EventEmitter<TransactionRecord>();
    @Output() remove = new EventEmitter<TransactionRecord>();
    @Output() selectionChange = new EventEmitter<string[]>();

    /** Selected row keys. Kept as a Set of keys, not records, so it survives a
     *  data refresh that replaces the record objects. */
    private selected = signal<Set<string>>(new Set());
    /** Anchor for shift-range selection. */
    private anchor: number | null = null;

    readonly allSelected = computed(() => {
        const s = this.selected();
        return this.rows.length > 0 && this.rows.every(r => s.has(r.key));
    });
    readonly someSelected = computed(() => this.selected().size > 0);

    t(key: string, params?: Record<string, string | number>): string {
        return this.i18n.t(key, params);
    }

    isSelected(key: string): boolean {
        return this.selected().has(key);
    }

    /** Clear selection from the parent after a bulk action completes. */
    clearSelection(): void {
        this.anchor = null;
        this.commit(new Set());
    }

    toggleAll(): void {
        this.anchor = null;
        this.commit(this.allSelected() ? new Set() : new Set(this.rows.map(r => r.key)));
    }

    /**
     * Plain click toggles one row; shift-click selects every row between the
     * anchor and here, which is what makes re-categorising a long run of rows
     * one gesture instead of thirty.
     *
     * Note `rowIndex` is the index in the SORTED, rendered order that p-table
     * hands back, so a shift-range always matches what the user sees.
     */
    onCheck(event: Event, rowIndex: number): void {
        const shift = (event as MouseEvent).shiftKey;
        const next = new Set(this.selected());
        if (shift && this.anchor !== null) {
            const [from, to] = this.anchor <= rowIndex ? [this.anchor, rowIndex] : [rowIndex, this.anchor];
            // A shift-range ADDS, matching file managers and spreadsheets.
            for (let i = from; i <= to; i++) {
                const row = this.rows[i];
                if (row) next.add(row.key);
            }
        } else {
            const row = this.rows[rowIndex];
            if (!row) return;
            if (next.has(row.key)) next.delete(row.key);
            else next.add(row.key);
            this.anchor = rowIndex;
        }
        this.commit(next);
    }

    private commit(next: Set<string>): void {
        this.selected.set(next);
        this.selectionChange.emit([...next]);
    }
}
