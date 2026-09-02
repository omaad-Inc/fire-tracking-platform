import { TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AiConsentService } from './ai-consent.service';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { TokenService, User } from '../services/token.service';

/**
 * The gate's state machine (P0-1). What is actually load-bearing here is not
 * "does it read the timestamps" but WHEN it is allowed to act on them: an
 * unrefreshed profile reads exactly like a user who was never asked, and acting
 * on that would push the consent sheet at someone who accepted months ago, on
 * every cold start. These tests pin that distinction.
 */
describe('AiConsentService', () => {
    let user: WritableSignal<User | null>;
    let svc: AiConsentService;
    let setUser: jasmine.Spy;
    let getCurrentUser: jasmine.Spy;
    let setAiConsent: jasmine.Spy;

    const profile = (over: Partial<User> = {}): User => ({
        id: 1, email: 'demo@omaad.dev', first_name: null, last_name: null,
        avatar_url: null, preferred_currency: 'XOF', preferred_language: 'fr',
        is_verified: true, ...over,
    } as User);

    function build(initial: User | null): AiConsentService {
        user = signal<User | null>(initial);
        // setUser mirrors the real service: it replaces the signal, so the
        // computed state re-derives exactly as it does in the app.
        setUser = jasmine.createSpy('setUser').and.callFake((u: User) => user.set(u));
        getCurrentUser = jasmine.createSpy('getCurrentUser').and.returnValue(of(profile()));
        setAiConsent = jasmine.createSpy('setAiConsent').and.returnValue(of(profile()));
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                AiConsentService,
                { provide: TokenService, useValue: { user, setUser } },
                { provide: AuthService, useValue: { getCurrentUser } },
                { provide: ApiService, useValue: { setAiConsent } },
            ],
        });
        return TestBed.inject(AiConsentService);
    }

    it('reads the two timestamps, and treats no decision as no consent', () => {
        svc = build(profile());
        expect(svc.state()).toBe('unknown');

        svc = build(profile({ ai_consent_at: '2026-09-01T10:00:00Z' }));
        expect(svc.state()).toBe('granted');

        svc = build(profile({ ai_consent_declined_at: '2026-09-01T10:00:00Z' }));
        expect(svc.state()).toBe('declined');
    });

    it('does NOT act on an unrefreshed profile: undecided, so nothing asks yet', () => {
        svc = build(profile());
        expect(svc.settled()).toBeFalse();
        expect(svc.undecided()).toBeTrue();
        // Crucially not gated either: the room shows a short wait, not a gate
        // built on a verdict the server has not given.
        expect(svc.gated()).toBeFalse();
    });

    it('opens immediately on a CACHED grant, with no wait for the server', () => {
        svc = build(profile({ ai_consent_at: '2026-09-01T10:00:00Z' }));
        expect(svc.undecided()).toBeFalse();
        expect(svc.gated()).toBeFalse();
    });

    it('gates once the server confirms there is no consent', () => {
        svc = build(profile());
        svc.ensureSettled();
        expect(getCurrentUser).toHaveBeenCalledTimes(1);
        expect(svc.settled()).toBeTrue();
        expect(svc.undecided()).toBeFalse();
        expect(svc.gated()).toBeTrue();
    });

    it('refreshes once per user, not once per caller', () => {
        svc = build(profile());
        svc.ensureSettled();
        svc.ensureSettled();
        expect(getCurrentUser).toHaveBeenCalledTimes(1);
    });

    it('an unreachable profile gates rather than spinning forever', () => {
        svc = build(profile());
        getCurrentUser.and.returnValue(throwError(() => new Error('offline')));
        svc.ensureSettled();
        expect(svc.settled()).toBeFalse();
        expect(svc.unreachable()).toBeTrue();
        expect(svc.undecided()).toBeFalse();
        expect(svc.gated()).toBeTrue();
    });

    it('does not inherit the previous account\'s verdict on a device swap', () => {
        svc = build(profile());
        svc.ensureSettled();
        expect(svc.settled()).toBeTrue();
        // Someone else signs in on the same browser.
        user.set(profile({ id: 2 }));
        expect(svc.settled()).toBeFalse();
        expect(svc.undecided()).toBeTrue();
    });

    it('stores an answer and refreshes the cached user from the response', () => {
        svc = build(profile());
        setAiConsent.and.returnValue(of(profile({ ai_consent_at: '2026-09-02T08:00:00Z' })));
        svc.setConsent(true).subscribe();
        expect(setAiConsent).toHaveBeenCalledWith(true);
        expect(setUser).toHaveBeenCalled();
        expect(svc.state()).toBe('granted');
        expect(svc.settled()).toBeTrue();
    });

    it('keeps the error on a failed write: an unstored consent is not a consent', () => {
        svc = build(profile());
        setAiConsent.and.returnValue(throwError(() => new Error('500')));
        let errored = false;
        svc.setConsent(true).subscribe({ error: () => { errored = true; } });
        expect(errored).toBeTrue();
        expect(svc.state()).toBe('unknown');
    });

    it('drops the local grant when the server refuses a turn for want of consent', () => {
        svc = build(profile({ ai_consent_at: '2026-09-01T10:00:00Z' }));
        expect(svc.gated()).toBeFalse();
        svc.markRefusedByServer();
        expect(svc.state()).toBe('unknown');
        expect(svc.settled()).toBeTrue();
        expect(svc.gated()).toBeTrue();
    });

    it('has nothing to say with nobody signed in (auth owns that case)', () => {
        svc = build(null);
        expect(svc.undecided()).toBeFalse();
        expect(svc.gated()).toBeFalse();
        svc.ensureSettled();
        expect(getCurrentUser).not.toHaveBeenCalled();
    });
});
