import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EARLY_ACCESS_FLAGS, FeatureFlagsService } from './feature-flags.service';
import { BillingService } from './billing.service';
import { TokenService } from './token.service';

/**
 * PREM-4 early access: a registry flag is ON for a real Premium user before
 * its general flip; everything else keeps the env/localStorage resolution.
 * `aiMock` (env default false) stands in for a future dark-shipped feature;
 * `aiChat` must never be early-access (infra kill-switch, ENT-1).
 */
describe('FeatureFlagsService early access (PREM-4)', () => {
    const plan = signal<'free' | 'pro' | 'premium'>('free');
    const loaded = signal(false);
    let ensureLoadedCalls = 0;
    const billing = {
        effectivePlan: plan,
        betaCourtesy: signal(false),
        loaded,
        ensureLoaded: () => { ensureLoadedCalls++; loaded.set(true); return Promise.resolve(); },
    };
    const user = signal<{ id: number } | null>({ id: 1 });

    function build(registry: string[]): FeatureFlagsService {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                { provide: BillingService, useValue: billing },
                { provide: TokenService, useValue: { user } },
                { provide: EARLY_ACCESS_FLAGS, useValue: registry },
            ],
        });
        return TestBed.inject(FeatureFlagsService);
    }

    beforeEach(() => {
        localStorage.removeItem('omaad_ff_aiMock');
        localStorage.setItem('omaad_ff_aiChat', '0'); // simulate the kill-switch OFF
        plan.set('free'); loaded.set(false); ensureLoadedCalls = 0; user.set({ id: 1 });
    });
    afterEach(() => { localStorage.removeItem('omaad_ff_aiChat'); localStorage.removeItem('omaad_ff_aiMock'); });

    it('turns a registry flag on for a real Premium user', () => {
        const svc = build(['aiMock']);
        expect(svc.isOn('aiMock')).toBeFalse();
        plan.set('premium');
        expect(svc.isOn('aiMock')).toBeTrue();
        expect(svc.isEarlyAccess('aiMock')).toBeTrue();
    });

    it('leaves free and courtesy-Pro users on the normal resolution', () => {
        const svc = build(['aiMock']);
        billing.betaCourtesy.set(true);
        plan.set('free');
        expect(svc.isOn('aiMock')).toBeFalse();
        plan.set('pro');
        expect(svc.isOn('aiMock')).toBeFalse();
        expect(svc.isEarlyAccess('aiMock')).toBeFalse();
    });

    it('never grants aiChat through early access (kill-switch stays off)', () => {
        const svc = build(['aiMock']);
        plan.set('premium');
        expect(svc.isOn('aiChat')).toBeFalse();
        expect(svc.isEarlyAccess('aiChat')).toBeFalse();
    });

    it('is not "early access" once the flag is generally on', () => {
        const svc = build(['aiMock']);
        plan.set('premium');
        svc.setOverride('aiMock', true);
        expect(svc.isOn('aiMock')).toBeTrue();
        expect(svc.isEarlyAccess('aiMock')).toBeFalse();
    });

    it('resolve() waits for the subscription read for a signed-in user, then answers', async () => {
        const svc = build(['aiMock']);
        plan.set('premium');
        expect(await svc.resolve('aiMock')).toBeTrue();
        expect(ensureLoadedCalls).toBe(1);
        // Outside the registry: synchronous, no billing read.
        expect(await svc.resolve('aiChat')).toBeFalse();
        expect(ensureLoadedCalls).toBe(1);
    });

    it('resolve() does not touch billing when signed out', async () => {
        const svc = build(['aiMock']);
        user.set(null);
        expect(await svc.resolve('aiMock')).toBeFalse();
        expect(ensureLoadedCalls).toBe(0);
    });
});
