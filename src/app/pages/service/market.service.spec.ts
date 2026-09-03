import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { MarketService, SeriesPoint } from './market.service';
import { ApiService } from '../../core/services/api.service';
import { CurrencyService } from '../../core/services/currency.service';

/**
 * P3-7 guard: the visible window says whether it is really the one asked for.
 *
 * `slice()` stands in the last two points of a series when the requested
 * window holds fewer than two, so the chart can always draw. The change line
 * above the chart then compares two dates that may sit far outside the
 * period the user picked, and used to label itself with that period anyway.
 * `sliceInfo()` exposes the fallback so the page can name the real span.
 */
describe('MarketService.sliceInfo', () => {
    let svc: MarketService;
    const DAY = 86_400_000;
    const at = (daysAgo: number, value: number): SeriesPoint =>
        ({ date: new Date(Date.now() - daysAgo * DAY).toISOString().slice(0, 10), value });

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                MarketService,
                { provide: ApiService, useValue: {
                    getBrvmIndices: () => of({ indices: [], market_open: false }),
                    getBrvmQuotes: () => of([]), getBrvmInstruments: () => of([]), getFcpInstruments: () => of([]),
                } },
                { provide: CurrencyService, useValue: {
                    config: () => ({ code: 'XOF', symbol: 'FCFA', locale: 'fr-FR', rate: 655.957 }),
                    format: () => '', formatNumber: () => '', formatDisplayNumber: () => '',
                } },
            ],
        });
        svc = TestBed.inject(MarketService);
    });

    it('keeps the points inside the window and reports no fallback', () => {
        const pts = [at(40, 100), at(20, 110), at(5, 120), at(1, 125)];
        const r = svc.sliceInfo(pts, 31);
        expect(r.fallback).toBeFalse();
        expect(r.points.map(p => p.value)).toEqual([110, 120, 125]);
        expect(svc.slice(pts, 31)).toEqual(r.points);
    });

    it('falls back to the last two points when the window holds fewer than two, and says so', () => {
        const pts = [at(400, 100), at(200, 90), at(60, 95)];
        const r = svc.sliceInfo(pts, 31);
        expect(r.fallback).toBeTrue();
        expect(r.points.map(p => p.value)).toEqual([90, 95]);
        // The change is real, over the fallback span, never null here.
        expect(svc.sliceChange(r.points)).toEqual({ abs: 5, pct: (5 / 90) * 100 });
    });

    it('a single-point series falls back to that one point, and the change stays null', () => {
        const r = svc.sliceInfo([at(200, 100)], 7);
        expect(r.fallback).toBeTrue();
        expect(r.points.length).toBe(1);
        expect(svc.sliceChange(r.points)).toBeNull();
    });

    it('"max" (days <= 0) is the whole series and never a fallback', () => {
        const pts = [at(900, 1), at(2, 2)];
        expect(svc.sliceInfo(pts, 0)).toEqual({ points: pts, fallback: false });
    });
});
