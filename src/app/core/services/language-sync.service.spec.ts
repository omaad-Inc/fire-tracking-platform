import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { LANGUAGE_SYNC_DEBOUNCE_MS, LanguageSyncService } from './language-sync.service';
import { ApiService, UserUpdate } from './api.service';
import { TokenService, User } from './token.service';
import { I18nService } from '../../i18n/i18n.service';

/**
 * P3-1 guard: the language switch persists on the profile, from ONE place.
 *
 * Before the fix `preferred_language` was written at registration only; every
 * in-app switch flipped the client and left the server rendering (weekly
 * recap, inbox, emails, push) in the registration language.
 */
describe('LanguageSyncService', () => {
    let i18n: I18nService;
    let patches: UserUpdate[];
    let token: string | null;
    let user: User | null;
    let setUserCalls: User[];
    let updateProfile: (data: UserUpdate) => Observable<User>;

    const demo: User = {
        id: 1, email: 'demo@omaad.dev', first_name: 'Demo', last_name: null, avatar_url: null,
        preferred_currency: 'XOF', preferred_language: 'fr', is_verified: true,
    };

    function boot(lang: 'fr' | 'en' = 'fr'): void {
        TestBed.configureTestingModule({
            providers: [
                LanguageSyncService,
                { provide: ApiService, useValue: { updateProfile: (d: UserUpdate) => { patches.push(d); return updateProfile(d); } } },
                { provide: TokenService, useValue: {
                    getToken: () => token,
                    getUser: () => user,
                    setUser: (u: User) => { setUserCalls.push(u); user = u; },
                } },
            ],
        });
        i18n = TestBed.inject(I18nService);
        (i18n as unknown as { dicts: Record<string, unknown> }).dicts = { fr: {}, en: {} };
        i18n.lang.set(lang);
        TestBed.inject(LanguageSyncService);
        TestBed.flushEffects(); // the boot run
    }

    beforeEach(() => {
        patches = [];
        setUserCalls = [];
        token = 'access';
        user = { ...demo };
        updateProfile = d => of({ ...demo, ...d } as User);
    });

    it('does not persist the language the app booted in', fakeAsync(() => {
        boot('en'); // localStorage / URL said EN while the profile says FR
        tick(LANGUAGE_SYNC_DEBOUNCE_MS + 1);
        expect(patches).toEqual([]);
    }));

    it('persists a switch once, after the debounce, and updates the cached profile', fakeAsync(() => {
        boot('fr');
        i18n.setLang('en');
        TestBed.flushEffects();
        tick(1); // the dictionary import resolves, the signal flips
        TestBed.flushEffects();
        expect(patches).toEqual([]); // nothing before the window closes
        tick(LANGUAGE_SYNC_DEBOUNCE_MS);
        expect(patches).toEqual([{ preferred_language: 'en' }]);
        expect(setUserCalls.length).toBe(1);
        expect(setUserCalls[0].preferred_language).toBe('en');
        expect(setUserCalls[0].email).toBe('demo@omaad.dev'); // merged, not replaced
    }));

    it('coalesces a burst and writes only the language the user ends on', fakeAsync(() => {
        boot('fr');
        i18n.lang.set('en');
        TestBed.flushEffects();
        tick(100);
        i18n.lang.set('fr');
        TestBed.flushEffects();
        tick(100);
        i18n.lang.set('en');
        TestBed.flushEffects();
        tick(LANGUAGE_SYNC_DEBOUNCE_MS + 1);
        expect(patches).toEqual([{ preferred_language: 'en' }]);
    }));

    it('writes a switch even when the cached profile already says so (the cache can lag the server)', fakeAsync(() => {
        boot('en'); // client booted in EN, cached profile FR: boot is skipped...
        i18n.lang.set('fr'); // ...a switch back to FR still reaches the server
        TestBed.flushEffects();
        tick(LANGUAGE_SYNC_DEBOUNCE_MS + 1);
        expect(patches).toEqual([{ preferred_language: 'fr' }]);
    }));

    it('ignores a same-value re-sync (the sidebar sets the URL language on every navigation)', fakeAsync(() => {
        boot('fr');
        i18n.setLang('fr');
        TestBed.flushEffects();
        tick(LANGUAGE_SYNC_DEBOUNCE_MS + 1);
        expect(patches).toEqual([]);
    }));

    it('writes nothing without a session (landing pages switch freely)', fakeAsync(() => {
        token = null;
        boot('fr');
        i18n.lang.set('en');
        TestBed.flushEffects();
        tick(LANGUAGE_SYNC_DEBOUNCE_MS + 1);
        expect(patches).toEqual([]);
    }));

    it('swallows a failed write and leaves the cached profile alone', fakeAsync(() => {
        updateProfile = () => throwError(() => new Error('503'));
        boot('fr');
        i18n.lang.set('en');
        TestBed.flushEffects();
        tick(LANGUAGE_SYNC_DEBOUNCE_MS + 1);
        expect(patches.length).toBe(1);
        expect(setUserCalls).toEqual([]);
        expect(user?.preferred_language).toBe('fr');
    }));
});
