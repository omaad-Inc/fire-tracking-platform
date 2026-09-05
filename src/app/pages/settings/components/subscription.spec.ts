import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SubscriptionSettings } from './subscription';
import { ApiService, SubscriptionStatus, UsageStatus } from '../../../core/services/api.service';
import { CurrencyService } from '../../../core/services/currency.service';

/**
 * The Abonnement hero card, focused on the GRACE state.
 *
 * A lapsed Premium plan rendered "Premium · Actif — Expire dans 0 jour(s)" with
 * a reset date a month in the future, so it read like a healthy subscription
 * (owner-reported 2026-08-24). The row really is still ACTIVE during the grace
 * window, so the card has to lean on the server's `in_grace` flag instead of the
 * status alone. The REAL BillingService runs over a mocked ApiService so the
 * state machine is exercised, not stubbed.
 */

const LAPSED_AT = '2026-08-23T17:19:14Z';   // period end, in the past
const GRACE_END = '2026-08-28T17:19:14Z';   // + SUBSCRIPTION_GRACE_DAYS

const SUB_PREMIUM_GRACE: SubscriptionStatus = {
    effective_plan: 'premium', beta_courtesy: false, plan: 'premium',
    status: 'active',            // still ACTIVE: the expiry cron has not run yet
    renewal_type: 'prepaid',
    current_period_end: LAPSED_AT, cancel_at: null,
    in_grace: true, grace_ends_at: GRACE_END,
};
const SUB_PREMIUM_LIVE: SubscriptionStatus = {
    ...SUB_PREMIUM_GRACE,
    current_period_end: '2099-01-01T00:00:00Z',
    in_grace: false, grace_ends_at: null,
};

/** The quota window during grace is the period that ALREADY ended, so the
 *  meter's period_end is in the past and must not promise a reset. */
const USAGE_STALE_WINDOW: UsageStatus = {
    used: 49, limit: 300, remaining: 251, kind: 'premium',
    period_start: '2026-07-24T17:19:14Z', period_end: LAPSED_AT,
    exceeded: false, warning: false, exempt: false,
    config: {
        used: 17, limit: 500, remaining: 483, kind: 'premium',
        period_start: '2026-07-24T17:19:14Z', period_end: LAPSED_AT,
        exceeded: false, warning: false, exempt: false,
    },
    advisor: {
        used: 49, limit: 300, remaining: 251, kind: 'premium',
        period_start: '2026-07-24T17:19:14Z', period_end: LAPSED_AT,
        exceeded: false, warning: false, exempt: false,
    },
} as unknown as UsageStatus;

function setup(sub: SubscriptionStatus, usage: UsageStatus | null = null,
               queryParams: Record<string, string> = {}): SubscriptionSettings {
    const api = jasmine.createSpyObj<ApiService>('ApiService', [
        'getSubscription', 'getUsage', 'getPayments', 'getPlans',
    ]);
    api.getSubscription.and.returnValue(of(sub));
    api.getUsage.and.returnValue(of(usage as UsageStatus));
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
        imports: [SubscriptionSettings],
        providers: [
            provideNoopAnimations(),
            provideRouter([]),
            { provide: ApiService, useValue: api },
            { provide: CurrencyService, useValue: cs },
            { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
        ],
    });
    const fixture = TestBed.createComponent(SubscriptionSettings);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    return fixture.componentInstance;
}

describe('SubscriptionSettings grace state', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('a lapsed-but-in-grace plan is NOT reported as an active subscription', () => {
        const c = setup(SUB_PREMIUM_GRACE);
        expect(c.state()).toBe('grace');
        // The old behaviour: status 'active' + prepaid fell through to
        // active_prepaid, which is what printed "Actif / Expire dans 0 jour(s)".
        expect(c.state()).not.toBe('active_prepaid');
    });

    it('a live plan is untouched by the grace branch', () => {
        const c = setup(SUB_PREMIUM_LIVE);
        expect(c.state()).toBe('active_prepaid');
    });

    it('offers the grace end date, so the card can say when access really stops', () => {
        const c = setup(SUB_PREMIUM_GRACE);
        expect(c.graceEndsDate()).toBeTruthy();
        expect(c.graceEndsDate()).not.toBe(c.periodEndDate());
    });

    it('cancel is not offered on a lapsed plan (nothing left to cancel)', () => {
        const c = setup(SUB_PREMIUM_GRACE);
        expect(c.canCancel()).toBeFalse();
    });

    it('a closed quota window reads as "period ended", never as a future reset', () => {
        const c = setup(SUB_PREMIUM_GRACE, USAGE_STALE_WINDOW);
        // This is the second half of the illusion: the meter showed a reset date
        // one month AFTER the subscription died.
        expect(c.windowClosed(LAPSED_AT)).toBeTrue();
        expect(c.windowClosed('2099-01-01T00:00:00Z')).toBeFalse();
        expect(c.windowClosed(null)).toBeFalse();
    });
});

/**
 * PSP return leg (web-checkout round trip, no-IAP strategy): the hosted
 * checkout redirects back here with ?payment=success|error. The banner is
 * informational only — the plan still comes from the server — and the success
 * copy tells the user the mobile app is already upgraded (no deep link).
 */
describe('SubscriptionSettings payment return banner', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('no ?payment param: no banner', () => {
        const c = setup(SUB_PREMIUM_LIVE);
        expect(c.paymentBanner()).toBeNull();
    });

    it('?payment=success shows the success banner without touching the state machine', () => {
        const c = setup(SUB_PREMIUM_LIVE, null, { payment: 'success' });
        expect(c.paymentBanner()).toBe('success');
        expect(c.state()).toBe('active_prepaid');
    });

    it('?payment=error shows the quiet failure note', () => {
        const c = setup(SUB_PREMIUM_LIVE, null, { payment: 'error' });
        expect(c.paymentBanner()).toBe('error');
    });

    it('an unknown outcome is ignored', () => {
        const c = setup(SUB_PREMIUM_LIVE, null, { payment: 'whatever' });
        expect(c.paymentBanner()).toBeNull();
    });

    it('the banner is dismissible', () => {
        const c = setup(SUB_PREMIUM_LIVE, null, { payment: 'success' });
        c.paymentBanner.set(null);
        expect(c.paymentBanner()).toBeNull();
    });
});
