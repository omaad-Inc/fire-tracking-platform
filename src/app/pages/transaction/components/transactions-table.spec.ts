import { TestBed } from '@angular/core/testing';
import { I18nService } from '../../../i18n/i18n.service';
import { TransactionsTable, TxTableRow } from './transactions-table';
import { TransactionRecord } from '../../service/transactions.service';

/**
 * P1-2 guards for the desktop power table.
 *
 * Shift-range selection is hand-rolled (PrimeNG's checkbox column has no range
 * behaviour), so the anchor arithmetic is pinned here: it is the one piece of
 * this table that is easy to break and invisible until someone bulk-deletes
 * the wrong rows.
 */

function row(i: number, over: Partial<TxTableRow> = {}): TxTableRow {
    const rec = { id: String(i), date: '2026-08-0' + i, type: 'Expense', amount: i * 100 } as TransactionRecord;
    return {
        rec,
        key: String(i),
        date: '2026-08-0' + i,
        dateLabel: `0${i} août`,
        label: 'row ' + i,
        catLabel: 'Shopping',
        catFg: '#000',
        catBg: '#fff',
        icon: 'pi pi-tag',
        account: 'Wave',
        type: 'Expense',
        amount: i * 100,
        signed: -i * 100,
        ...over,
    };
}

describe('TransactionsTable (selection)', () => {
    let table: TransactionsTable;
    let emitted: string[][];

    function click(index: number, shift = false): void {
        table.onCheck({ shiftKey: shift } as unknown as Event, index);
    }

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [{ provide: I18nService, useValue: { t: (k: string) => k, lang: () => 'fr' } }],
        });
        table = TestBed.runInInjectionContext(() => new TransactionsTable());
        table.rows = [1, 2, 3, 4, 5].map(i => row(i));
        emitted = [];
        table.selectionChange.subscribe(v => emitted.push(v));
    });

    afterEach(() => TestBed.resetTestingModule());

    it('toggles a single row on a plain click', () => {
        click(0);
        expect(table.isSelected('1')).toBeTrue();
        click(0);
        expect(table.isSelected('1')).toBeFalse();
    });

    it('selects the inclusive range on shift-click, in rendered order', () => {
        click(0);
        click(3, true);
        expect([1, 2, 3, 4].every(i => table.isSelected(String(i)))).toBeTrue();
        expect(table.isSelected('5')).toBeFalse();
    });

    it('selects the range when shift-clicking BACKWARDS', () => {
        click(4);
        click(1, true);
        expect([2, 3, 4, 5].every(i => table.isSelected(String(i)))).toBeTrue();
        expect(table.isSelected('1')).toBeFalse();
    });

    it('adds to the existing selection rather than replacing it', () => {
        click(0);          // row 1
        click(2);          // row 3, becomes the new anchor
        click(4, true);    // 3..5
        expect([1, 3, 4, 5].every(i => table.isSelected(String(i)))).toBeTrue();
        expect(table.isSelected('2')).toBeFalse();
    });

    it('treats a shift-click with no anchor as a plain toggle', () => {
        click(2, true);
        expect(table.isSelected('3')).toBeTrue();
        expect(table.isSelected('1')).toBeFalse();
    });

    it('select-all covers every row, and toggles back off', () => {
        table.toggleAll();
        expect(table.allSelected()).toBeTrue();
        table.toggleAll();
        expect(table.allSelected()).toBeFalse();
        expect(table.someSelected()).toBeFalse();
    });

    it('reports selection out on every change, so the bulk bar can follow', () => {
        click(0);
        click(2, true);
        expect(emitted.length).toBe(2);
        expect(emitted[emitted.length - 1].sort()).toEqual(['1', '2', '3']);
    });

    it('clears on demand (after a bulk action completes)', () => {
        table.toggleAll();
        table.clearSelection();
        expect(table.someSelected()).toBeFalse();
        // Anchor is dropped too: the next shift-click must not resurrect a
        // range from the selection the user just acted on.
        click(2, true);
        expect(emitted[emitted.length - 1]).toEqual(['3']);
    });

    it('ignores an out-of-range index instead of selecting undefined', () => {
        click(99);
        expect(table.someSelected()).toBeFalse();
    });

    it('allSelected is false for an empty table (no vacuous select-all)', () => {
        table.rows = [];
        expect(table.allSelected()).toBeFalse();
    });
});
