import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { AppTopbar } from './app.topbar';
import { I18nService } from '../../i18n/i18n.service';
import { TokenService } from '../../core/services/token.service';
import { PrivacyService } from '../../core/services/privacy.service';
import { AiAssistantService } from '../../core/services/ai-assistant.service';
import { ShareContextService } from '../../core/services/share-context.service';
import { FeatureFlagsService } from '../../core/services/feature-flags.service';
import { NavService } from '../../core/services/nav.service';
import { LayoutService } from '../service/layout.service';

/**
 * The assistant sparkle is easy to miss on mobile, so a one-shot discovery hint
 * (pulse + coach-mark) fires on first login when the real chat is live, then
 * retires per user. These guard the show/hide gating.
 */
describe('AppTopbar (assistant discovery hint)', () => {
    let navGo: jasmine.Spy;

    function setup(opts: { aiChat: boolean; userId: number | null }): AppTopbar {
        navGo = jasmine.createSpy('go');
        TestBed.configureTestingModule({
            imports: [AppTopbar],
            providers: [
                { provide: Router, useValue: { events: of(), url: '/fr', navigate: () => {} } },
                { provide: I18nService, useValue: { t: (k: string) => k, lang: () => 'fr' } },
                { provide: TokenService, useValue: { user: () => (opts.userId != null ? { id: opts.userId } : null) } },
                { provide: PrivacyService, useValue: { hidden: () => false, toggle: () => {} } },
                { provide: AiAssistantService, useValue: { show: () => {} } },
                { provide: ShareContextService, useValue: { active: () => false } },
                { provide: FeatureFlagsService, useValue: { aiChat: () => opts.aiChat } },
                { provide: NavService, useValue: { go: navGo } },
                { provide: LayoutService, useValue: { layoutConfig: { update: () => {} }, isDarkTheme: () => false } },
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

    it('is per-user: user B still sees it after user A dismissed', () => {
        localStorage.setItem('omaad_assistant_seen:5', '1'); // user A already met it
        const c = setup({ aiChat: true, userId: 9 });        // user B, fresh
        c.ngOnInit();
        expect(c.assistantHint()).toBeTrue();
    });
});
