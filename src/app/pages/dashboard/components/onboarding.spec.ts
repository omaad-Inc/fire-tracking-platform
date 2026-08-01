import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { OnboardingComponent } from './onboarding';
import { I18nService } from '../../../i18n/i18n.service';
import { FeatureFlagsService } from '../../../core/services/feature-flags.service';
import { TokenService } from '../../../core/services/token.service';

/**
 * Onboarding steers new users to the Config assistant as the primary path,
 * but only when the aiChat flag is on. With the flag off (prod default) the
 * card must fall back to the three manual steps unchanged, so shipping this
 * dark is a no-op for users who don't have the chat yet.
 */
describe('OnboardingComponent (assistant-first onboarding)', () => {
    let navigate: jasmine.Spy;
    let aiChatOn: boolean;

    async function setup(flag: boolean) {
        aiChatOn = flag;
        navigate = jasmine.createSpy('navigate');
        TestBed.configureTestingModule({
            imports: [OnboardingComponent],
            providers: [
                { provide: FeatureFlagsService, useValue: { aiChat: () => aiChatOn } },
                { provide: TokenService, useValue: { user: () => ({ first_name: 'Awa' }) } },
                { provide: Router, useValue: { url: '/fr/dashboard', navigate } },
            ],
        });
        await TestBed.inject(I18nService).loadLang('fr');
        const fixture = TestBed.createComponent(OnboardingComponent);
        fixture.detectChanges();
        return fixture;
    }

    afterEach(() => TestBed.resetTestingModule());

    it('offers the assistant path and routes to /pages/assistant when the flag is on', async () => {
        const fixture = await setup(true);
        const text = (fixture.nativeElement as HTMLElement).textContent || '';
        expect(text).toContain('Configure en 2 minutes en discutant');

        fixture.componentInstance.openAssistant();
        expect(navigate).toHaveBeenCalledWith(['/', 'fr', 'pages', 'assistant']);
    });

    it('hides the assistant path and keeps the manual steps when the flag is off', async () => {
        const fixture = await setup(false);
        const text = (fixture.nativeElement as HTMLElement).textContent || '';
        expect(text).not.toContain('Configure en 2 minutes en discutant');
        // The three manual steps remain the fallback.
        expect(text).toContain('Ajoutez un actif');
    });
});
