import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { AppTopbar } from './app.topbar';
import { I18nService } from '../../i18n/i18n.service';
import { TokenService } from '../../core/services/token.service';
import { PrivacyService } from '../../core/services/privacy.service';
import { AiAssistantService } from '../../core/services/ai-assistant.service';
import { ShareContextService } from '../../core/services/share-context.service';
import { FeatureFlagsService } from '../../core/services/feature-flags.service';
import { NavService } from '../../core/services/nav.service';
import { LayoutService } from '../service/layout.service';
import { BillingService } from '../../core/services/billing.service';

/**
 * The assistant sparkle is easy to miss on mobile, so a one-shot discovery hint
 * (pulse + coach-mark) fires on first login when the real chat is live, then
 * retires per user. These guard the show/hide gating.
 */
describe('AppTopbar (assistant discovery hint)', () => {
    let navGo: jasmine.Spy;
    let routerEvents: Subject<NavigationEnd>;

    function setup(opts: { aiChat: boolean; userId: number | null }): AppTopbar {
        navGo = jasmine.createSpy('go');
        routerEvents = new Subject<NavigationEnd>();
        TestBed.configureTestingModule({
            imports: [AppTopbar],
            providers: [
                { provide: Router, useValue: { events: routerEvents, url: '/fr', navigate: () => {} } },
                { provide: I18nService, useValue: { t: (k: string) => k, lang: () => 'fr' } },
                { provide: TokenService, useValue: { user: () => (opts.userId != null ? { id: opts.userId } : null) } },
                { provide: PrivacyService, useValue: { hidden: () => false, toggle: () => {} } },
                { provide: AiAssistantService, useValue: { show: () => {} } },
                { provide: ShareContextService, useValue: { active: () => false } },
                { provide: FeatureFlagsService, useValue: { aiChat: () => opts.aiChat } },
                { provide: NavService, useValue: { go: navGo } },
                { provide: LayoutService, useValue: { layoutConfig: { update: () => {} }, isDarkTheme: () => false } },
                // The topbar grew a tier-aware crown pill after these tests were
                // written, which pulled in BillingService -> ApiService ->
                // HttpClient and made all five fail on a missing provider. The
                // pill is not what they are about, so it is stubbed out.
                {
                    provide: BillingService,
                    useValue: {
                        load: () => {},
                        state: () => 'ready',
                        effectivePlan: () => 'free',
                        betaCourtesy: () => false,
                    },
                },
            ],
        });
        return TestBed.createComponent(AppTopbar).componentInstance;
    }

    afterEach(() => {
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k && k.startsWith('omaad_assistant_seen')) localStorage.removeItem(k);
        }
        TestBed.resetTestingModule();
    });

    it('shows the hint on first login when the chat is live', () => {
        const c = setup({ aiChat: true, userId: 5 });
        c.ngOnInit();
        expect(c.assistantHint()).toBeTrue();
    });

    it('does not show it once the user has seen it', () => {
        localStorage.setItem('omaad_assistant_seen:5', '1');
        const c = setup({ aiChat: true, userId: 5 });
        c.ngOnInit();
        expect(c.assistantHint()).toBeFalse();
    });

    it('does not show it when the chat flag is off (teaser only)', () => {
        const c = setup({ aiChat: false, userId: 5 });
        c.ngOnInit();
        expect(c.assistantHint()).toBeFalse();
    });

    it('opening the assistant retires the hint and persists seen', () => {
        const c = setup({ aiChat: true, userId: 5 });
        c.ngOnInit();
        expect(c.assistantHint()).toBeTrue();

        c.openAssistant();

        expect(c.assistantHint()).toBeFalse();
        expect(localStorage.getItem('omaad_assistant_seen:5')).toBe('1');
        expect(navGo).toHaveBeenCalledWith('pages', 'assistant');
    });

    // ── P0-4: the coach-mark must not follow the user around ──────────────
    //
    // It hangs over the page (growing the topbar to fit it would shift the whole
    // layout), so on a 390px screen it lands on the first card's heading. That
    // is fine for the seconds it takes to read on the screen it appeared on, and
    // not fine on the next three screens. Nothing used to take it down but its
    // own 8s timer.
    it('navigating away takes the coach-mark down', () => {
        const c = setup({ aiChat: true, userId: 5 });
        c.ngOnInit();
        expect(c.assistantHint()).toBeTrue();

        routerEvents.next(new NavigationEnd(1, '/fr', '/fr/pages/patrimoine'));

        expect(c.assistantHint()).toBeFalse();
    });

    it('navigating does NOT spend the one-shot: the hint can still teach later', () => {
        const c = setup({ aiChat: true, userId: 5 });
        c.ngOnInit();
        routerEvents.next(new NavigationEnd(1, '/fr', '/fr/pages/patrimoine'));

        // A user who navigated straight away never read it. Marking it seen here
        // would mean the hint silently never does its job for that user.
        expect(localStorage.getItem('omaad_assistant_seen:5')).toBeNull();
    });

    it('opening the assistant retires it for good even once it is off screen', () => {
        const c = setup({ aiChat: true, userId: 5 });
        c.ngOnInit();
        routerEvents.next(new NavigationEnd(1, '/fr', '/fr/pages/patrimoine'));
        expect(c.assistantHint()).toBeFalse();

        // They found the assistant on their own; re-teaching next session nags.
        c.openAssistant();

        expect(localStorage.getItem('omaad_assistant_seen:5')).toBe('1');
    });

    it('Escape dismisses it, and that counts as seen', () => {
        const c = setup({ aiChat: true, userId: 5 });
        c.ngOnInit();
        expect(c.assistantHint()).toBeTrue();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(c.assistantHint()).toBeFalse();
        expect(localStorage.getItem('omaad_assistant_seen:5')).toBe('1');
    });

    it('a click on the page dismisses it, so it is never in the way twice', () => {
        const c = setup({ aiChat: true, userId: 5 });
        c.ngOnInit();
        expect(c.assistantHint()).toBeTrue();

        document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

        expect(c.assistantHint()).toBeFalse();
        expect(localStorage.getItem('omaad_assistant_seen:5')).toBe('1');
    });

    it('stops listening once retired, so a later click is not swallowed', () => {
        const c = setup({ aiChat: true, userId: 5 });
        c.ngOnInit();
        document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        localStorage.removeItem('omaad_assistant_seen:5');

        // With the listener detached, another click must not re-write the key.
        document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

        expect(localStorage.getItem('omaad_assistant_seen:5')).toBeNull();
    });

    it('is per-user: user B still sees it after user A dismissed', () => {
        localStorage.setItem('omaad_assistant_seen:5', '1'); // user A already met it
        const c = setup({ aiChat: true, userId: 9 });        // user B, fresh
        c.ngOnInit();
        expect(c.assistantHint()).toBeTrue();
    });
});
