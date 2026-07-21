import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { CurrencyService } from './currency.service';
import { ApiService } from './api.service';
import { TokenService } from './token.service';
import { AnalyticsService } from './analytics.service';
import { ShareContextService } from './share-context.service';

/**
 * Pure money-math unit tests for CurrencyService (P4-TEST-1). The injected
 * deps are stubbed so the FX fetch is a no-op and the "user currency" is XOF;
 * with no live rates the hardcoded EUR-peg fallbacks apply, making the maths
 * deterministic (1000 EUR == 655 957 FCFA).
 */
describe('CurrencyService (rate math)', () => {
    let svc: CurrencyService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                CurrencyService,
                { provide: ApiService, useValue: { getFxRates: () => of({ rates: {}, as_of: '' }), updateProfile: () => of({}) } },
                { provide: TokenService, useValue: { user: () => ({ preferred_currency: 'XOF' }), setUser: () => {} } },
                { provide: AnalyticsService, useValue: { track: () => {} } },
                { provide: ShareContextService, useValue: { active: () => false, currency: () => 'EUR' } },
            ],
        });
        svc = TestBed.inject(CurrencyService);
    });

    it('rateOf returns the EUR-peg fallbacks and defaults unknown to 1', () => {
        expect(svc.rateOf('XOF')).toBeCloseTo(655.957, 3);
        expect(svc.rateOf('EUR')).toBe(1);
        expect(svc.rateOf(null)).toBe(1);       // null => EUR
        expect(svc.rateOf('ZZZ')).toBe(1);      // unknown => 1
    });

    it('toEurFromNative divides native by its rate', () => {
        expect(svc.toEurFromNative(655957, 'XOF')).toBeCloseTo(1000, 2);
        expect(svc.toEurFromNative(1080, 'USD')).toBeCloseTo(1000, 2);
        expect(svc.toEurFromNative(0, 'XOF')).toBe(0);
    });

    it('convert multiplies a EUR value into the display currency (XOF user)', () => {
        expect(svc.convert(1000)).toBeCloseTo(655957, 0);
    });

    it('toBaseAmount round-trips display -> EUR', () => {
        expect(svc.toBaseAmount(655957)).toBeCloseTo(1000, 2);
    });

    it('toBaseAmountWithRate uses the explicit rate', () => {
        expect(svc.toBaseAmountWithRate(2000, 2)).toBe(1000);
        expect(svc.toBaseAmountWithRate(2000, 0)).toBe(2000); // guards /0
    });
});
