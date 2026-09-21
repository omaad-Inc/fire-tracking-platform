import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SubscriptionSettings } from './subscription';
import { ApiService, SubscriptionStatus, UsageStatus } from '../../../core/services/api.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { AnalyticsService } from '../../../core/services/analytics.service';

/** Captures product events the page emits (subscribe_completed, subscription_cancelled). */
let analyticsTrack: jasmine.Spy;
/** The last fixture `setup` built, for the tests that assert rendered copy
 *  rather than component state (the end-of-courtesy card is about words). */
let lastFixture: ComponentFixture<SubscriptionSettings>;

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
    effective_plan: 'premium', beta_courtesy: false, beta_courtesy_ends_at: null, is_gift: false, plan: 'premium',
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
        methods: { momo: true, card: true },
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
            { provide: AnalyticsService, useValue: { track: (analyticsTrack = jasmine.createSpy('track')), trackPublic: () => undefined } },
            { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
        ],
    });
    const fixture = TestBed.createComponent(SubscriptionSettings);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    lastFixture = fixture;
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
        // The funnel step is recorded on the way back; the grant itself stays webhook-only.
        expect(analyticsTrack).toHaveBeenCalledWith('subscribe_completed', jasmine.objectContaining({ source: 'psp_return' }));
    });

    it('?payment=error shows the quiet failure note', () => {
        const c = setup(SUB_PREMIUM_LIVE, null, { payment: 'error' });
        expect(c.paymentBanner()).toBe('error');
        expect(analyticsTrack).not.toHaveBeenCalledWith('subscribe_completed', jasmine.anything());
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


/**
 * End of the beta courtesy (cutover 2026-09-24 23:59 GMT).
 *
 * Two promises the card must never get wrong that week: while the courtesy
 * window has an announced end, the hero has to name it instead of saying
 * "aucun paiement pour l'instant" under a gift that stops on Thursday; and
 * once the thank-you month is granted, a plan nobody paid for must not read
 * like a bill is coming.
 */
const CUTOVER = '2026-09-24T23:59:00Z';

const SUB_COURTESY_DATED: SubscriptionStatus = {
    effective_plan: 'free', beta_courtesy: true, beta_courtesy_ends_at: CUTOVER,
    is_gift: false, plan: null, status: null, renewal_type: null,
    current_period_end: null, cancel_at: null, in_grace: false, grace_ends_at: null,
};
const SUB_COURTESY_OPEN_ENDED: SubscriptionStatus = {
    ...SUB_COURTESY_DATED, beta_courtesy_ends_at: null,
};
const SUB_GIFT_MONTH: SubscriptionStatus = {
    effective_plan: 'pro', beta_courtesy: false, beta_courtesy_ends_at: null,
    is_gift: true, plan: 'pro', status: 'active', renewal_type: 'prepaid',
    current_period_end: '2026-10-24T23:59:00Z', cancel_at: null,
    in_grace: false, grace_ends_at: null,
};

describe('SubscriptionSettings end of beta courtesy', () => {
    afterEach(() => TestBed.resetTestingModule());

    // The TestBed has no translation layer, so the template renders i18n KEYS.
    // That is what these assert: which copy the card chooses per state (the
    // wording itself lives in fr.ts/en.ts and is guarded by i18n:guard).
    const rendered = () => lastFixture.nativeElement.textContent as string;

    it('names the day the free Pro access stops', () => {
        const c = setup(SUB_COURTESY_DATED);
        expect(c.state()).toBe('beta');
        expect(c.courtesyEndsDate()).toBe('24 septembre 2026');
        expect(rendered()).toContain('subscription.body.betaEndsOn');
        expect(rendered()).not.toContain('subscription.body.betaNoPayment');
    });

    it('a deadline makes "garder Pro" the offer, not "passer à Premium"', () => {
        setup(SUB_COURTESY_DATED);
        expect(rendered()).toContain('subscription.cta.keepPro');
        expect(rendered()).not.toContain('subscription.cta.discoverPremium');
    });

    it('an open-ended courtesy window is untouched (pre-cutover behaviour)', () => {
        const c = setup(SUB_COURTESY_OPEN_ENDED);
        expect(c.courtesyEndsDate()).toBe('');
        expect(rendered()).toContain('subscription.body.betaNoPayment');
        expect(rendered()).toContain('subscription.cta.discoverPremium');
    });

    it('the thank-you month reads as a gift, never as a bill coming due', () => {
        const c = setup(SUB_GIFT_MONTH);
        expect(c.state()).toBe('active_prepaid');
        expect(c.isGift()).toBeTrue();
        expect(rendered()).toContain('subscription.pills.gift');
        expect(rendered()).toContain('subscription.body.giftMonth');
        expect(rendered()).not.toContain('subscription.pills.active');
    });

    it('a PAID plan keeps the plain active pill and no gift line', () => {
        const c = setup(SUB_PREMIUM_LIVE);
        expect(c.isGift()).toBeFalse();
        expect(rendered()).toContain('subscription.pills.active');
        expect(rendered()).not.toContain('subscription.body.giftMonth');
    });
});
