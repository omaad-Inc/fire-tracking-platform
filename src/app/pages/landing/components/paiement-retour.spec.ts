import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { PaiementRetourPage } from './paiement-retour';

/**
 * PSP return landing (public). The redirect carries ?payment=success|error and
 * decides nothing; the page only tells the user what happened and how to get
 * back to the app. Must work with NO web session (app users pay in a bare
 * browser), so nothing here touches auth.
 */
function setup(queryParams: Record<string, string> = {}): PaiementRetourPage {
    TestBed.configureTestingModule({
        imports: [PaiementRetourPage],
        providers: [
            provideNoopAnimations(),
            provideRouter([]),
            // The shared landing topbar/footer pull ApiService; no request is made.
            provideHttpClient(),
            provideHttpClientTesting(),
            { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
        ],
    });
    const fixture = TestBed.createComponent(PaiementRetourPage);
    fixture.detectChanges();
    return fixture.componentInstance;
}

describe('PaiementRetourPage', () => {
    afterEach(() => {
        document.head.querySelector('meta[name="robots"]')?.remove();
        TestBed.resetTestingModule();
    });

    it('success: confirms and points at the Abonnement page with the success flag', () => {
        const c = setup({ payment: 'success' });
        expect(c.outcome()).toBe('success');
        expect(c.title()).toBe('Paiement confirmé');
        expect(c.webLink()).toBe('/fr/settings/subscription');
        expect(c.webQuery()).toEqual({ payment: 'success' });
    });

    it('error: nothing charged, retry goes to the plans page', () => {
        const c = setup({ payment: 'error' });
        expect(c.outcome()).toBe('error');
        expect(c.body()).toContain('Rien n\'a été débité');
        expect(c.webLink()).toBe('/fr/pages/plans');
        expect(c.webQuery()).toBeNull();
    });

    it('missing or unknown outcome reads as "in progress", never as a failure', () => {
        expect(setup().outcome()).toBe('unknown');
        TestBed.resetTestingModule();
        const c = setup({ payment: 'whatever' });
        expect(c.outcome()).toBe('unknown');
        expect(c.title()).toBe('Paiement en cours de traitement');
        expect(c.webQuery()).toEqual({ payment: 'pending' });
    });

    it('is a private transit page: noindex while mounted', () => {
        setup({ payment: 'success' });
        const robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
        expect(robots?.content).toContain('noindex');
    });

    it('the app hand-off is only offered on phones (desktop test runner: hidden)', () => {
        const c = setup({ payment: 'success' });
        expect(c.mobile()).toBeFalse();
    });
});
