import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { InsightsService } from './insights.service';
import { AssetsStateService } from './assets-state.service';
import { ApiService, InsightsResponse } from '../../core/services/api.service';
import { CACHE_RESET } from '../../core/services/cache-reset.token';

/**
 * P1-3 guards.
 *
 * The Analyses page used to read a FIXED 6-month window: the 6 was hardcoded at
 * this service's call site even though ApiService.getInsights and the backend
 * both already took the parameter. Now that the page offers 3M/6M/12M/Max,
 * this keeps ONE cachedResource per window, so toggling back to a window
 * already seen serves from cache instead of refetching (and never reflashes
 * the skeleton).
 */
describe('InsightsService', () => {
    let getInsights: jasmine.Spy;

    function payload(period: string): InsightsResponse {
        return {
            period, income: 1, expenses: 1, net: 0, savings_rate: 0,
            expenses_by_category: [], trend: [], anomalies: [],
        } as unknown as InsightsResponse;
    }

    function setup(): InsightsService {
        getInsights = jasmine.createSpy('getInsights')
            .and.callFake((_p: unknown, months: number) => of(payload('m' + months)));
        TestBed.configureTestingModule({
            providers: [
                InsightsService,
                { provide: ApiService, useValue: { getInsights } },
            ],
        });
        return TestBed.inject(InsightsService);
    }

    afterEach(() => TestBed.resetTestingModule());

    it('passes the requested window through to the API', async () => {
        const svc = setup();
        await svc.get(12);
        expect(getInsights).toHaveBeenCalledWith(undefined, 12);
    });

    it('defaults to 6 months when no window is given', async () => {
        const svc = setup();
        await svc.get();
        expect(getInsights).toHaveBeenCalledWith(undefined, 6);
    });

    it('caches PER WINDOW: re-reading a seen window does not refetch', async () => {
        const svc = setup();
        await svc.get(6);
        await svc.get(12);
        expect(getInsights).toHaveBeenCalledTimes(2);

        // Back to 6: already cached and inside the TTL, so no third request.
        await svc.get(6);
        expect(getInsights).toHaveBeenCalledTimes(2);
        expect(svc.hasCached(6)).toBeTrue();
        expect(svc.getCached(6)!.period).toBe('m6');
        expect(svc.getCached(12)!.period).toBe('m12');
    });

    it('does not report one window as cached because another is', async () => {
        const svc = setup();
        await svc.get(6);
        expect(svc.hasCached(6)).toBeTrue();
        // Otherwise the page skips its skeleton and renders the wrong window's
        // numbers while the real one loads.
        expect(svc.hasCached(24)).toBeFalse();
        expect(svc.getCached(24)).toBeNull();
    });

    it('stales EVERY window on a transaction write, not just the visible one', async () => {
        const svc = setup();
        await svc.get(6);
        await svc.get(12);
        expect(getInsights).toHaveBeenCalledTimes(2);

        TestBed.inject(AssetsStateService).notifyTransactionsUpdated();
        await svc.get(6);
        await svc.get(12);
        expect(getInsights).toHaveBeenCalledTimes(4);
    });

    it('clamps the window to the backend bounds (2..24)', () => {
        // /insights declares months minimum 2, maximum 24; an out-of-range
        // value from a hand-edited URL must not produce a 422.
        expect(InsightsService.clampMonths(1)).toBe(2);
        expect(InsightsService.clampMonths(0)).toBe(2);
        expect(InsightsService.clampMonths(-5)).toBe(2);
        expect(InsightsService.clampMonths(240)).toBe(24);
        expect(InsightsService.clampMonths(12)).toBe(12);
        expect(InsightsService.clampMonths(NaN)).toBe(6);
    });

    it('treats a clamped window as the SAME cache entry', async () => {
        const svc = setup();
        await svc.get(999);          // clamps to 24
        await svc.get(24);
        expect(getInsights).toHaveBeenCalledTimes(1);
        expect(getInsights).toHaveBeenCalledWith(undefined, 24);
    });
});

describe('InsightsService (logout)', () => {
    it('clears every window on CACHE_RESET so a user switch cannot bleed analytics', async () => {
        const getInsights = jasmine.createSpy('getInsights')
            .and.callFake((_p: unknown, months: number) => of({ period: 'm' + months } as unknown as InsightsResponse));
        const reset = new Subject<void>();
        TestBed.configureTestingModule({
            providers: [
                InsightsService,
                { provide: ApiService, useValue: { getInsights } },
                { provide: CACHE_RESET, useValue: reset },
            ],
        });
        const svc = TestBed.inject(InsightsService);
        await svc.get(6);
        expect(svc.hasCached(6)).toBeTrue();

        reset.next();
        expect(svc.hasCached(6)).toBeFalse();
        TestBed.resetTestingModule();
    });
});
