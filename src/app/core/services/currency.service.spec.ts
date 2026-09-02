import { TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { of } from 'rxjs';

import { CurrencyService } from './currency.service';
import { ApiService } from './api.service';
import { TokenService } from './token.service';
import { AnalyticsService } from './analytics.service';
import { ShareContextService } from './share-context.service';
import { PrivacyService } from './privacy.service';

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

    // The fr-FR group separator is U+202F (narrow no-break space), which has no
    // glyph in our Inter subset nor in many Android system fonts: it rendered as
    // a tofu box inside FCFA amounts (user report 2026-07-26). Formatters must
    // emit U+00A0 instead.
    it('formatters never emit U+202F and group with a regular NBSP', () => {
        for (const s of [svc.format(1000), svc.formatNumber(1000), svc.formatDisplayNumber(655957)]) {
            expect(s).not.toContain('\u202f');
        }
        expect(svc.format(1000)).toBe('655\u00a0957 FCFA');
        expect(svc.formatNumber(1000)).toBe('655\u00a0957');
        expect(svc.formatDisplayNumber(655957)).toBe('655\u00a0957');
    });
});

/**
 * P0-3: privacy mode is enforced HERE, in the formatters, not only inside
 * `<app-amount>`. A component can mask template text and nothing else, while
 * chart tooltips, axis ticks, aria-labels and option labels all take a string
 * and so went straight round it. These tests pin which formatters mask and,
 * just as importantly, which one must not.
 */
describe('CurrencyService (privacy mode)', () => {
    let svc: CurrencyService;
    let hidden: WritableSignal<boolean>;

    beforeEach(() => {
        hidden = signal(false);
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                CurrencyService,
                { provide: ApiService, useValue: { getFxRates: () => of({ rates: {}, as_of: '' }), updateProfile: () => of({}) } },
                { provide: TokenService, useValue: { user: () => ({ preferred_currency: 'XOF' }), setUser: () => {} } },
                { provide: AnalyticsService, useValue: { track: () => {} } },
                { provide: ShareContextService, useValue: { active: () => false, currency: () => 'EUR' } },
                { provide: PrivacyService, useValue: { hidden } },
            ],
        });
        svc = TestBed.inject(CurrencyService);
    });

    it('shows real amounts while the eye is open', () => {
        expect(svc.format(1000)).toBe('655\u00a0957 FCFA');
        expect(svc.formatNumber(1000)).toBe('655\u00a0957');
        // 1000 EUR is 655 957 FCFA, so the tick takes the thousands branch.
        expect(svc.tickFormatter()(1000)).toBe('656K');
    });

    it('masks EUR-base user amounts once the eye is shut', () => {
        hidden.set(true);
        // The symbol survives: it says which currency is withheld, not how much.
        expect(svc.format(1000)).toBe('••••• FCFA');
        expect(svc.formatNumber(1000)).toBe('•••••');
        // No digit of the real figure may survive anywhere in the output.
        expect(svc.format(1000)).not.toMatch(/\d/);
        expect(svc.formatNumber(1000)).not.toMatch(/\d/);
    });

    it('masks chart axis ticks, which would otherwise hand over the scale', () => {
        hidden.set(true);
        for (const v of [0, 1_000, 250_000, 5_000_000]) {
            expect(svc.tickFormatter()(v)).toBe('•••');
        }
    });

    it('does NOT mask formatDisplayNumber: prices and typed input must stay readable', () => {
        hidden.set(true);
        // Subscription prices (you cannot check out against a mask) and the
        // figure a user is currently typing both come through here.
        expect(svc.formatDisplayNumber(655957)).toBe('655\u00a0957');
    });

    it('reverses cleanly, so nothing caches the mask', () => {
        hidden.set(true);
        expect(svc.formatNumber(1000)).toBe('•••••');
        hidden.set(false);
        expect(svc.formatNumber(1000)).toBe('655\u00a0957');
    });
});
