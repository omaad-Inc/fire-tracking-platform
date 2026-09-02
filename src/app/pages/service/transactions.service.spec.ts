import { TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { TransactionsService } from './transactions.service';
import { AssetsStateService } from './assets-state.service';
import { ApiService } from '../../core/services/api.service';
import { CurrencyService } from '../../core/services/currency.service';
import { I18nService } from '../../i18n/i18n.service';

/**
 * Regression guard for the S12 P4 refresh bug: an AI Config write fires the
 * AssetsStateService bus directly (not this service's own write methods), so
 * the service must invalidate its cachedResource on the bus event. Without the
 * constructor subscription the list component reloaded on the event but read the
 * stale cache, and an AI-recorded transaction only appeared after a hard refresh.
 */
describe('TransactionsService (state-bus invalidation)', () => {
    let svc: TransactionsService;
    let state: AssetsStateService;
    let getAll: jasmine.Spy;

    beforeEach(() => {
        getAll = jasmine.createSpy('getAllTransactions').and.returnValue(of([]));
        TestBed.configureTestingModule({
            providers: [
                TransactionsService,
                { provide: ApiService, useValue: { getAllTransactions: getAll } },
                { provide: CurrencyService, useValue: {} },
                { provide: I18nService, useValue: { currentLang: () => 'fr' } },
            ],
        });
        svc = TestBed.inject(TransactionsService);
        state = TestBed.inject(AssetsStateService);
    });

    it('refetches after a transactionsUpdated bus event (fresh cache would otherwise be served)', async () => {
        await svc.getRecords();
        expect(getAll).toHaveBeenCalledTimes(1);

        // A second read inside the TTL, with no event, must NOT refetch.
        await svc.getRecords();
        expect(getAll).toHaveBeenCalledTimes(1);

        // The bus event (what an AI Config create emits) invalidates the cache.
        state.notifyTransactionsUpdated();
        await svc.getRecords();
        expect(getAll).toHaveBeenCalledTimes(2);
    });
});

/**
 * P1-2 guards, both for bugs that shipped a wrong NUMBER rather than a wrong
 * pixel, which is the class of bug this app can least afford.
 */
describe('TransactionsService (P1-2)', () => {
    function setup(txs: unknown[], extra: Record<string, unknown> = {}) {
        const api = {
            getAllTransactions: jasmine.createSpy('getAllTransactions').and.returnValue(of(txs)),
            ...extra,
        };
        TestBed.configureTestingModule({
            providers: [
                TransactionsService,
                { provide: ApiService, useValue: api },
                {
                    provide: CurrencyService,
                    // Identity FX: these tests are about casing and ordering,
                    // not conversion.
                    useValue: { toEurFromNative: (v: number) => v },
                },
                { provide: I18nService, useValue: { currentLang: () => 'fr' } },
            ],
        });
        return { svc: TestBed.inject(TransactionsService), api };
    }

    afterEach(() => TestBed.resetTestingModule());

    it('normalises category casing, so an uppercase row is not rendered as its raw key', async () => {
        // The API returns MIXED casing: the enum VALUE for some rows and its
        // NAME for others, depending on which writer created them. Every
        // frontend dictionary is lowercase, so an uppercase row missed every
        // lookup and the UI printed "SALARY" instead of "Salaire".
        const { svc } = setup([
            { id: 1, date: '2026-08-01', type: 'income', category: 'SALARY', amount: 10, currency: 'XOF' },
            { id: 2, date: '2026-08-02', type: 'expense', category: 'shopping', amount: 20, currency: 'XOF' },
            { id: 3, date: '2026-08-03', type: 'expense', category: 'Groceries', amount: 30, currency: 'XOF' },
        ]);
        const recs = await svc.getRecords();
        expect(recs.map(r => r.category)).toEqual(['salary', 'shopping', 'groceries']);
    });

    it('survives a null category without throwing', async () => {
        const { svc } = setup([
            { id: 1, date: '2026-08-01', type: 'expense', category: null, amount: 10, currency: 'XOF' },
        ]);
        const recs = await svc.getRecords();
        expect(recs[0].category).toBeFalsy();
    });

    it('deletes SEQUENTIALLY, because concurrent deletes lose account-balance updates', async () => {
        // Each delete reverses the transaction's ledger effect with an
        // unlocked read-modify-write on the account, so three parallel deletes
        // of the same account all returned 204 and moved the balance by one
        // transaction's worth instead of three.
        const order: string[] = [];
        let live = 0;
        let maxConcurrent = 0;
        const deleteTransaction = jasmine.createSpy('deleteTransaction').and.callFake((id: number) => {
            live++;
            maxConcurrent = Math.max(maxConcurrent, live);
            order.push('start:' + id);
            return new Observable<void>(sub => {
                setTimeout(() => {
                    live--;
                    order.push('end:' + id);
                    sub.next();
                    sub.complete();
                }, 5);
            });
        });
        const { svc } = setup([], { deleteTransaction });

        await svc.deleteRecords(['1', '2', '3']);

        expect(maxConcurrent).toBe(1);
        expect(order).toEqual(['start:1', 'end:1', 'start:2', 'end:2', 'start:3', 'end:3']);
    });
});
