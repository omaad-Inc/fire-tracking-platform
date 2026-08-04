import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { OnboardingPage } from './onboarding-page';
import { I18nService } from '../../i18n/i18n.service';
import { TokenService } from '../../core/services/token.service';
import { CurrencyService } from '../../core/services/currency.service';
import { DashboardService } from '../service/dashboard.service';
import { AssetsStateService } from '../service/assets-state.service';
import { ApiService } from '../../core/services/api.service';
import { of, throwError } from 'rxjs';

/**
 * The first-run concierge (S12 Phase 6): tap-first with DETERMINISTIC writes.
 * Each beat calls POST /agents/onboarding/action (ApiService.onboardingAction) —
 * no LLM in the write path — so a tap always produces the intended write. These
 * tests assert the beat machine advances on ok and never dead-ends on failure.
 */
describe('OnboardingPage (concierge)', () => {
    let navigate: jasmine.Spy;
    let action: jasmine.Spy;
    // Per-test override: return an error result (or throw) for a given tool.
    let failTool: string | null;
    let throwTool: string | null;

    const tick = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

    async function setup() {
        navigate = jasmine.createSpy('navigate');
        failTool = null;
        throwTool = null;
        action = jasmine.createSpy('onboardingAction').and.callFake((tool: string) => {
            if (throwTool === tool) return throwError(() => new Error('net'));
            if (failTool === tool) return of({ status: 'error', summary: 'x' });
            return of({ status: 'ok', summary: 'ok', undo_token: tool === 'create_asset' ? 'assets/1' : null });
        });
        TestBed.configureTestingModule({
            imports: [OnboardingPage],
            providers: [
                { provide: TokenService, useValue: { user: () => ({ first_name: 'Luffy' }) } },
                { provide: Router, useValue: { url: '/fr/onboarding', navigate } },
                { provide: CurrencyService, useValue: { convert: (e: number) => e, formatDisplayNumber: (v: number) => `${Math.round(v)} FCFA` } },
                { provide: DashboardService, useValue: { loadDashboard: () => Promise.resolve(), summaryData: () => ({ total_assets: 500000, total_debts: 0 }) } },
                { provide: AssetsStateService, useValue: { notifyAssetsUpdated: () => {} } },
                { provide: ApiService, useValue: { warmOnboarding: () => of({ warmed: true }), onboardingAction: action } },
            ],
        });
        await TestBed.inject(I18nService).loadLang('fr');
        const fixture = TestBed.createComponent(OnboardingPage);
        fixture.detectChanges();
        return fixture;
    }

    afterEach(() => TestBed.resetTestingModule());

    it('renders the currency beat with both chips and greets by first name', async () => {
        const fixture = await setup();
        const text = (fixture.nativeElement as HTMLElement).textContent || '';
        expect(text).toContain('Luffy');
        expect(text).toContain('FCFA (XOF)');
        expect(text).toContain('Euro (EUR)');
    });

    it('currency tap advances to the asset beat instantly and writes the currency', async () => {
        const fixture = await setup();
        const cmp = fixture.componentInstance;

        cmp.pickCurrency('XOF');
        // Optimistic + instant: no waiting on the (fire-and-forget) write.
        expect(cmp.beat()).toBe('asset');
        expect(action).toHaveBeenCalledWith('update_user_ai_profile', { preferred_currency: 'XOF' });
    });

    it('adds one asset, reveals net worth, then reaches done and navigates on handoff', async () => {
        const fixture = await setup();
        const cmp = fixture.componentInstance;

        cmp.beat.set('asset');
        cmp.selectTile({ key: 'wave', label: 'Wave', category: 'mobile_money', icon: 'pi-wallet' } as any);
        cmp.assetName.set('Wave');
        cmp.assetAmount.set(500000);
        cmp.submitAsset();
        await tick(); // let the awaited onboardingAction + reveal settle
        expect(action).toHaveBeenCalledWith('create_asset', {
            name: 'Wave', category: 'mobile_money', current_value: 500000, currency: 'XOF',
        });
        expect(cmp.addedCount()).toBe(1);
        expect(cmp.beat()).toBe('reveal');

        cmp.goObjective();
        expect(cmp.beat()).toBe('objective');
        cmp.pickObjective({ key: 'financial_freedom', label: 'Liberté financière' } as any);
        expect(cmp.beat()).toBe('done'); // optimistic
        await tick(); // objective write + handoff (mark_complete) + navigate
        expect(action).toHaveBeenCalledWith('update_user_ai_profile', { objective: 'financial_freedom' });
        expect(action).toHaveBeenCalledWith('mark_onboarding_complete', {});
        expect(navigate).toHaveBeenCalledWith(['/', 'fr'], { replaceUrl: true });
    });

    it('surfaces a gentle error (with retry) when the asset write fails, without dead-ending', async () => {
        const fixture = await setup();
        const cmp = fixture.componentInstance;
        failTool = 'create_asset';

        cmp.beat.set('asset');
        cmp.selectTile({ key: 'wave', label: 'Wave', category: 'mobile_money', icon: 'pi-wallet' } as any);
        cmp.assetName.set('Wave');
        cmp.assetAmount.set(500000);
        cmp.submitAsset();
        await tick();
        // Stays on the asset beat with an inline error + retry, not a dead-end.
        expect(cmp.error()).toBeTruthy();
        expect(cmp.beat()).toBe('asset');

        // Retry now succeeds -> reveal.
        failTool = null;
        cmp.retry();
        await tick();
        expect(cmp.beat()).toBe('reveal');
        expect(cmp.error()).toBeNull();
    });

    it('handoff still navigates even if mark_onboarding_complete fails (never strands)', async () => {
        const fixture = await setup();
        const cmp = fixture.componentInstance;
        throwTool = 'mark_onboarding_complete';

        cmp.beat.set('objective');
        cmp.finishNoObjective();
        await tick();
        expect(navigate).toHaveBeenCalledWith(['/', 'fr'], { replaceUrl: true });
    });
});
