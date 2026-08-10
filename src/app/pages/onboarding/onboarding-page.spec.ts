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

    /** The app's thousands separator: a NO-BREAK space (U+00A0). Intl emits the
     *  narrow U+202F for fr-FR and CurrencyService normalizes it (nbspSafe) —
     *  budget Android fonts have no glyph for U+202F. Spelled out here so the
     *  expectations below never hinge on an invisible character. */
    const NB = '\u00A0';

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
                {
                    provide: CurrencyService, useValue: {
                        convert: (e: number) => e,
                        // Mirrors the real formatter: grouped, no symbol, 0 decimals.
                        formatDisplayNumber: (v: number) =>
                            String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0'),
                    },
                },
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

    it('offers no BRVM tile — a BRVM stock needs the app catalog picker (ticker + price + qty)', async () => {
        const fixture = await setup();
        const cmp = fixture.componentInstance;

        const tiles = cmp.tiles();
        expect(tiles.some(t => t.category === 'stocks_brvm')).toBeFalse();
        expect(tiles.some(t => t.key === 'brvm')).toBeFalse();
        // Every remaining tile is a category that needs no predefined list.
        expect(tiles.map(t => t.category)).toEqual([
            'mobile_money', 'mobile_money', 'savings_account', 'real_estate',
            'vehicle', 'cash', 'tontine', 'other',
        ]);

        cmp.beat.set('asset');
        fixture.detectChanges();
        expect((fixture.nativeElement as HTMLElement).textContent || '').not.toContain('BRVM');
    });

    it('groups the amount as it is typed and still writes the raw number', async () => {
        const fixture = await setup();
        const cmp = fixture.componentInstance;

        const el = document.createElement('input');
        el.value = '75000';
        cmp.onAmountInput({ target: el } as unknown as Event);

        // Displayed grouped, stored raw.
        expect(cmp.amountText()).toBe(`75${NB}000`);
        expect(el.value).toBe(`75${NB}000`);
        expect(cmp.assetAmount()).toBe(75000);

        // Re-typing over an already-grouped value stays stable (no digit loss),
        // and junk characters never reach the value.
        el.value = `75${NB}000a`;
        cmp.onAmountInput({ target: el } as unknown as Event);
        expect(cmp.assetAmount()).toBe(75000);
        expect(el.value).toBe(`75${NB}000`);

        // The payload keeps the plain number the API expects.
        cmp.beat.set('asset');
        cmp.selectTile({ key: 'wave', label: 'Wave', category: 'mobile_money', icon: 'pi-wallet' } as any);
        cmp.assetName.set('Wave');
        cmp.onAmountInput({ target: Object.assign(document.createElement('input'), { value: '50000000' }) } as unknown as Event);
        expect(cmp.amountText()).toBe(`50${NB}000${NB}000`);
        cmp.submitAsset();
        await tick();
        expect(action).toHaveBeenCalledWith('create_asset', {
            name: 'Wave', category: 'mobile_money', current_value: 50000000, currency: 'XOF',
        });
    });

    it('clears the amount when the tile changes so no stale value carries over', async () => {
        const fixture = await setup();
        const cmp = fixture.componentInstance;

        cmp.beat.set('asset');
        cmp.selectTile({ key: 'wave', label: 'Wave', category: 'mobile_money', icon: 'pi-wallet' } as any);
        cmp.onAmountInput({ target: Object.assign(document.createElement('input'), { value: '1000' }) } as unknown as Event);
        expect(cmp.assetAmount()).toBe(1000);

        cmp.cancelTile();
        expect(cmp.assetAmount()).toBeNull();
        expect(cmp.amountText()).toBe('');
        expect(cmp.canSaveAsset()).toBeFalse();
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
