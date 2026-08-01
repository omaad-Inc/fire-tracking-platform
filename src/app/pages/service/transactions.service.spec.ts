import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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
