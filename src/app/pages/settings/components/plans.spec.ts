import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PlansSettings } from './plans';
import { ApiService, SubscriptionStatus, UsageStatus } from '../../../core/services/api.service';
import { CurrencyService } from '../../../core/services/currency.service';

/**
 * The plans page's context-aware CTA matrix (§3.4 of the Revolut redesign) and
 * the ?tier= landing behavior. The REAL BillingService runs on top of a mocked
 * ApiService so the state machine (beta courtesy, prepaid, cancelling...) is
 * exercised, not stubbed.
 */

const SUB_FREE: SubscriptionStatus = {
    effective_plan: 'free', beta_courtesy: false, plan: null,
    status: null, renewal_type: null, current_period_end: null, cancel_at: null,
    in_grace: false, grace_ends_at: null,
};
const SUB_BETA: SubscriptionStatus = { ...SUB_FREE, beta_courtesy: true };
const SUB_PRO_PREPAID: SubscriptionStatus = {
    effective_plan: 'pro', beta_courtesy: false, plan: 'pro',
    status: 'active', renewal_type: 'prepaid',
    current_period_end: '2099-01-01T00:00:00Z', cancel_at: null,
    in_grace: false, grace_ends_at: null,
};
const SUB_PREMIUM_PREPAID: SubscriptionStatus = {
    ...SUB_PRO_PREPAID, effective_plan: 'premium', plan: 'premium',
};

function setup(sub: SubscriptionStatus, queryParams: Record<string, string> = {}): PlansSettings {
    const api = jasmine.createSpyObj<ApiService>('ApiService', [
        'getSubscription', 'getUsage', 'getPayments', 'getPlans',
    ]);
    api.getSubscription.and.returnValue(of(sub));
    api.getUsage.and.returnValue(of(null as unknown as UsageStatus));
    api.getPayments.and.returnValue(of([]));
    api.getPlans.and.returnValue(of({
        plans: [
            { plan: 'pro' as const, durations: [{ duration_key: 'm1' as const, label: '1 mois', days: 30, xof: 4000, eur: 5.0 }] },
            { plan: 'premium' as const, durations: [{ duration_key: 'm1' as const, label: '1 mois', days: 30, xof: 10000, eur: 12.0 }] },
        ],
    }));

    const cs = {
        config: () => ({ symbol: 'FCFA' }),
        currencyCode: () => 'XOF',
        formatDisplayNumber: (v: number) => String(v),
        // decimalsFor: the width now derives from the amount (money-decimal rule),
        // so the double has to answer it. XOF has no minor unit -> always 0.
        decimalsFor: (_v: number, code?: string) => ((code ?? 'XOF').toUpperCase() === 'EUR' ? 2 : 0),
        minorUnitsFor: (code?: string) => ((code ?? 'XOF').toUpperCase() === 'EUR' ? 2 : 0),
        minorUnits: () => 0,
    };

    TestBed.configureTestingModule({
        imports: [PlansSettings],
        providers: [
            provideNoopAnimations(),
            provideRouter([]),
            { provide: ApiService, useValue: api },
            { provide: CurrencyService, useValue: cs },
            { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
        ],
    });
    const fixture = TestBed.createComponent(PlansSettings);
    fixture.detectChanges();
    TestBed.flushEffects();
    return fixture.componentInstance;
}

describe('PlansSettings CTA matrix', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('free user: join above, current on Gratuit, lands on Pro tab', () => {
        const c = setup(SUB_FREE);
        expect(c.ctaKind('free')).toBe('current');
        expect(c.ctaKind('pro')).toBe('join');
        expect(c.ctaKind('premium')).toBe('join');
        expect(c.viewedTier()).toBe('pro');
    });

    it('beta courtesy: currentBeta on Pro, join on Premium, no cancellable downgrade', () => {
        const c = setup(SUB_BETA);
        expect(c.ctaKind('pro')).toBe('currentBeta');
        expect(c.ctaKind('premium')).toBe('join');
        expect(c.ctaKind('free')).toBe('downgradeFree');
        expect(c.canCancel()).toBeFalse();
        expect(c.viewedTier()).toBe('premium');
    });

    it('pro prepaid: renew on Pro, join on Premium, cancellable downgrade to free', () => {
        const c = setup(SUB_PRO_PREPAID);
        expect(c.ctaKind('pro')).toBe('renew');
        expect(c.ctaKind('premium')).toBe('join');
        expect(c.ctaKind('free')).toBe('downgradeFree');
        expect(c.canCancel()).toBeTrue();
        expect(c.nextUpTier()).toBe('premium');
    });

    it('premium prepaid: renew on Premium, quiet downgrade on Pro', () => {
        const c = setup(SUB_PREMIUM_PREPAID);
        expect(c.ctaKind('premium')).toBe('renew');
        expect(c.ctaKind('pro')).toBe('downgradePro');
        expect(c.ctaKind('free')).toBe('downgradeFree');
        expect(c.viewedTier()).toBe('premium');
    });
});

describe('PlansSettings ?tier= landing', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('?tier=pro selects the tab and highlights the card, without opening checkout', () => {
        const c = setup(SUB_FREE, { tier: 'pro' });
        expect(c.viewedTier()).toBe('pro');
        expect(c.highlightTier()).toBe('pro');
        expect(c.sheetVisible()).toBeFalse();
    });

    it('?tier=premium&checkout=1 opens the checkout sheet on that tier', () => {
        const c = setup(SUB_FREE, { tier: 'premium', checkout: '1' });
        expect(c.viewedTier()).toBe('premium');
        expect(c.sheetVisible()).toBeTrue();
        expect(c.sheetTier()).toBe('premium');
    });

    it('an explicit ?tier= beats the default next-tier-up landing', () => {
        const c = setup(SUB_PREMIUM_PREPAID, { tier: 'free' });
        expect(c.viewedTier()).toBe('free');
    });
});
