import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { OnboardingComponent } from './onboarding';
import { I18nService } from '../../../i18n/i18n.service';
import { TokenService } from '../../../core/services/token.service';

/**
 * The dashboard onboarding card is now the light "prochaines etapes" nudge
 * (S12 Phase 6): the guided first-run lives in the full-screen concierge. The
 * nudge renders its copy and reopens /:lang/onboarding; dismiss still emits.
 */
describe('OnboardingComponent (prochaines etapes nudge)', () => {
    let navigate: jasmine.Spy;

    async function setup() {
        navigate = jasmine.createSpy('navigate');
        TestBed.configureTestingModule({
            imports: [OnboardingComponent],
            providers: [
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

    it('renders the nudge and reopens the concierge at /:lang/onboarding', async () => {
        const fixture = await setup();
        const text = (fixture.nativeElement as HTMLElement).textContent || '';
        expect(text).toContain('Prochaines étapes');

        fixture.componentInstance.start();
        expect(navigate).toHaveBeenCalledWith(['/', 'fr', 'onboarding']);
    });

    it('emits dismissed when hidden', async () => {
        const fixture = await setup();
        const spy = jasmine.createSpy('dismissed');
        fixture.componentInstance.dismissed.subscribe(spy);
        fixture.componentInstance.dismiss();
        expect(spy).toHaveBeenCalled();
    });
});
