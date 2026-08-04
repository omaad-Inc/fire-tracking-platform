import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { OnboardingPage } from './onboarding-page';
import { I18nService } from '../../i18n/i18n.service';
import { TokenService } from '../../core/services/token.service';
import { CurrencyService } from '../../core/services/currency.service';
import { DashboardService } from '../service/dashboard.service';
import { AssetsStateService } from '../service/assets-state.service';
import { SseChatDriver } from '../../core/ai/sse-chat-driver';
import { ApiService } from '../../core/services/api.service';
import { ChatStreamEvent } from '../../core/ai/chat-events';
import { of } from 'rxjs';

/**
 * The first-run concierge (S12 Phase 6): renders the tap-first beats and drives
 * the SSE transport with context={onboarding:true,...}, advancing a beat only
 * when its expected tool_result(ok) lands (so turns stay serialized).
 */
describe('OnboardingPage (concierge)', () => {
    let navigate: jasmine.Spy;
    let lastStart: { message: string; onEvent: (e: ChatStreamEvent) => void; onClose: () => void; context?: any };

    const fakeDriver = {
        startTurn: (message: string, onEvent: any, onClose: any, context?: any) => {
            lastStart = { message, onEvent, onClose, context };
            return { cancel: () => {} };
        },
    };

    async function setup() {
        navigate = jasmine.createSpy('navigate');
        TestBed.configureTestingModule({
            imports: [OnboardingPage],
            providers: [
                { provide: TokenService, useValue: { user: () => ({ first_name: 'Awa' }) } },
                { provide: Router, useValue: { url: '/fr/onboarding', navigate } },
                { provide: CurrencyService, useValue: { convert: (e: number) => e, formatDisplayNumber: (v: number) => `${Math.round(v)} FCFA` } },
                { provide: DashboardService, useValue: { loadDashboard: () => Promise.resolve(), summaryData: () => ({ total_assets: 500000, total_debts: 0 }) } },
                { provide: AssetsStateService, useValue: { notifyAssetsUpdated: () => {} } },
                { provide: ApiService, useValue: { warmOnboarding: () => of({ warmed: true }) } },
            ],
        });
        // The component provides its OWN SseChatDriver; override it with the fake.
        TestBed.overrideComponent(OnboardingPage, {
            set: { providers: [{ provide: SseChatDriver, useValue: fakeDriver }] },
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
        expect(text).toContain('Awa');
        expect(text).toContain('FCFA (XOF)');
        expect(text).toContain('Euro (EUR)');
    });

    it('sends the onboarding-surface context and advances to the asset beat on the currency write', async () => {
        const fixture = await setup();
        const cmp = fixture.componentInstance;

        cmp.pickCurrency('XOF');
        expect(lastStart.context?.onboarding).toBe(true);
        expect(lastStart.context?.first_name).toBe('Awa');
        expect(lastStart.message).toContain('XOF');
        expect(cmp.streaming()).toBe(true);

        // The agent calls update_user_ai_profile and it succeeds.
        lastStart.onEvent({ type: 'tool_use', tool: 'update_user_ai_profile', args_preview: '', card_id: 'c1' });
        lastStart.onEvent({ type: 'tool_result', card_id: 'c1', status: 'ok', summary: 'ok' });
        expect(cmp.beat()).toBe('asset');

        lastStart.onClose();
        expect(cmp.streaming()).toBe(false);
    });

    it('reveals net worth after the first asset, then reaches done + navigates on handoff', async () => {
        const fixture = await setup();
        const cmp = fixture.componentInstance;

        // Jump to the asset beat and add one via a tile.
        cmp.beat.set('asset');
        cmp.selectTile({ key: 'wave', label: 'Wave', category: 'mobile_money', icon: 'pi-wallet' } as any);
        cmp.assetName.set('Wave');
        cmp.assetAmount.set(500000);
        cmp.submitAsset();
        expect(lastStart.message).toContain('mobile_money');

        const assetTurn = lastStart;
        assetTurn.onEvent({ type: 'tool_use', tool: 'create_asset', args_preview: '', card_id: 'a1' });
        assetTurn.onEvent({ type: 'tool_result', card_id: 'a1', status: 'ok', summary: 'Wave', undo_token: 'assets/1' });
        await Promise.resolve(); await Promise.resolve(); // let reveal()'s awaited loadDashboard settle
        expect(cmp.addedCount()).toBe(1);
        expect(cmp.beat()).toBe('reveal');
        assetTurn.onClose(); // the asset turn ends -> streaming resets so the next tap works

        // Continue -> objective -> pick -> handoff.
        cmp.goObjective();
        expect(cmp.beat()).toBe('objective');
        cmp.pickObjective({ key: 'financial_freedom', label: 'Liberté financière' } as any);
        const objTurn = lastStart;
        objTurn.onEvent({ type: 'tool_use', tool: 'update_user_ai_profile', args_preview: '', card_id: 'o1' });
        objTurn.onEvent({ type: 'tool_result', card_id: 'o1', status: 'ok', summary: 'ok' });
        // The objective write triggers the handoff: beat -> done and a new turn starts.
        expect(cmp.beat()).toBe('done');

        // Handoff turn completes -> navigate to the dashboard.
        const handoffTurn = lastStart;
        handoffTurn.onEvent({ type: 'tool_use', tool: 'mark_onboarding_complete', args_preview: '', card_id: 'h1' });
        handoffTurn.onEvent({ type: 'tool_result', card_id: 'h1', status: 'ok', summary: 'done' });
        expect(navigate).toHaveBeenCalledWith(['/', 'fr'], { replaceUrl: true });
    });

    it('surfaces a gentle error when a turn fails, without dead-ending', async () => {
        const fixture = await setup();
        const cmp = fixture.componentInstance;
        cmp.pickCurrency('EUR');
        // Optimistic: the screen advances to the asset beat immediately; the write
        // runs in the background.
        expect(cmp.beat()).toBe('asset');
        lastStart.onEvent({ type: 'error', code: 'ai_unavailable', message: 'x' });
        // A gentle error is surfaced with a retry (not a dead-end); currency is
        // stored locally, so the user can still proceed.
        expect(cmp.error()).toBeTruthy();
    });
});
