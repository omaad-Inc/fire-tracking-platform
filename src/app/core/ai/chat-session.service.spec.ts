import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ChatSessionService } from './chat-session.service';
import { CHAT_STREAM_DRIVER, ChatStreamDriver, ChatTurnHandle } from './chat-stream-driver';
import { ChatStreamEvent, ToolCardVM } from './chat-events';
import { AssetsStateService } from '../../pages/service/assets-state.service';
import { CHAT_THREAD_KEY_PREFIX, TokenService } from '../services/token.service';
import { ApiService } from '../services/api.service';
import { of } from 'rxjs';

/** Remove every chat-thread key so a persisted thread never leaks between tests. */
function clearThreads(): void {
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (k === CHAT_THREAD_KEY_PREFIX || k.startsWith(CHAT_THREAD_KEY_PREFIX + ':'))) {
            localStorage.removeItem(k);
        }
    }
}

/**
 * Reducer/state-machine tests for the S12 chat store (Phase 1, plan step 11):
 * streaming appends, card state transitions, confirm flow locks the composer,
 * undo flips state. The driver is a hand-cranked fake so every event sequence
 * is deterministic.
 */
class FakeDriver implements ChatStreamDriver {
    emit!: (e: ChatStreamEvent) => void;
    close!: () => void;
    cancelled = false;
    confirmCalls: { cardId: string; approved: boolean }[] = [];
    private undoResolve!: () => void;
    private undoReject!: (e: unknown) => void;

    startTurn(_m: string, onEvent: (e: ChatStreamEvent) => void, onClose: () => void): ChatTurnHandle {
        this.emit = onEvent;
        this.close = onClose;
        this.cancelled = false;
        return { cancel: () => { this.cancelled = true; onClose(); } };
    }

    confirm(cardId: string, approved: boolean): void {
        this.confirmCalls.push({ cardId, approved });
    }

    undo(_t: string): Promise<void> {
        return new Promise<void>((res, rej) => { this.undoResolve = res; this.undoReject = rej; });
    }

    resolveUndo(): void { this.undoResolve(); }
    rejectUndo(): void { this.undoReject(new Error('restore failed')); }
}

describe('ChatSessionService (event reducer)', () => {
    let svc: ChatSessionService;
    let driver: FakeDriver;

    const lastAssistant = () => {
        const msgs = svc.messages();
        return [...msgs].reverse().find((m) => m.role === 'assistant')!;
    };
    const card = (id: string): ToolCardVM => {
        for (const m of svc.messages()) {
            for (const b of m.blocks ?? []) {
                if (b.kind === 'card' && b.card.cardId === id) return b.card;
            }
        }
        throw new Error(`card ${id} not found`);
    };

    beforeEach(() => {
        clearThreads();
        driver = new FakeDriver();
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                ChatSessionService,
                { provide: CHAT_STREAM_DRIVER, useValue: driver },
            ],
        });
        svc = TestBed.inject(ChatSessionService);
    });

    it('send appends the user message and an assistant shell, and locks the composer', () => {
        svc.send('Bonjour');
        expect(svc.messages().length).toBe(2);
        expect(svc.messages()[0].role).toBe('user');
        expect(svc.messages()[0].text).toBe('Bonjour');
        expect(svc.streaming()).toBeTrue();
        expect(svc.inputLocked()).toBeTrue();
    });

    it('text_delta events accumulate into ONE streaming text block', () => {
        svc.send('question');
        driver.emit({ type: 'routed', agent: 'assistant' });
        driver.emit({ type: 'text_delta', text: 'Ton patrimoine ' });
        driver.emit({ type: 'text_delta', text: 'progresse.' });
        const blocks = lastAssistant().blocks!;
        expect(blocks.length).toBe(1);
        expect(blocks[0]).toEqual({ kind: 'text', text: 'Ton patrimoine progresse.' });
        expect(lastAssistant().agent).toBe('assistant');
    });

    it('tool_use opens a running card; tool_result flips it done in place', () => {
        svc.send('ajoute ma maison');
        driver.emit({ type: 'tool_use', tool: 'create_asset', args_preview: 'Maison · Dakar', card_id: 'c1' });
        expect(card('c1').state).toBe('running');
        driver.emit({ type: 'tool_result', card_id: 'c1', status: 'ok', summary: 'Maison · 75 000 000 FCFA', undo_token: 'u1' });
        expect(card('c1').state).toBe('done');
        expect(card('c1').summary).toContain('75');
        expect(card('c1').undoToken).toBe('u1');
        driver.emit({ type: 'message_stop' });
        driver.close();
        expect(svc.streaming()).toBeFalse();
    });

    it('a successful write notifies the data views so patrimoine refreshes without a reload', () => {
        const state = TestBed.inject(AssetsStateService);
        const assets = spyOn(state, 'notifyAssetsUpdated');
        const txns = spyOn(state, 'notifyTransactionsUpdated');

        svc.send('ajoute ma maison');
        driver.emit({ type: 'tool_use', tool: 'create_asset', args_preview: 'Maison', card_id: 'c1' });
        driver.emit({ type: 'tool_result', card_id: 'c1', status: 'ok', summary: 'Maison', undo_token: 'assets/12' });
        expect(assets).toHaveBeenCalledTimes(1);

        // a transaction moves its linked account balance -> refresh BOTH
        driver.emit({ type: 'tool_use', tool: 'create_transaction', args_preview: 'Salaire', card_id: 'c2' });
        driver.emit({ type: 'tool_result', card_id: 'c2', status: 'ok', summary: 'Salaire', undo_token: 'transactions/7' });
        expect(txns).toHaveBeenCalledTimes(1);
        expect(assets).toHaveBeenCalledTimes(2);
    });

    it('a failed write does NOT notify the data views', () => {
        const state = TestBed.inject(AssetsStateService);
        const assets = spyOn(state, 'notifyAssetsUpdated');
        svc.send('ajoute ma maison');
        driver.emit({ type: 'tool_use', tool: 'create_asset', args_preview: 'Maison', card_id: 'c1' });
        driver.emit({ type: 'tool_result', card_id: 'c1', status: 'error', summary: 'Détails invalides.' });
        expect(assets).not.toHaveBeenCalled();
    });

    it('confirm_required parks the turn and blocks the composer until a decision', () => {
        svc.send('importe mon relevé');
        driver.emit({ type: 'tool_use', tool: 'bulk_import', args_preview: '3 transactions', card_id: 'c2' });
        driver.emit({ type: 'confirm_required', card_id: 'c2', diff: [{ op: 'create', label: 'Salaire · +850 000 FCFA' }] });
        expect(card('c2').state).toBe('confirm');
        expect(card('c2').diff!.length).toBe(1);
        expect(svc.pendingConfirm()).toBe('c2');
        expect(svc.inputLocked()).toBeTrue();

        svc.confirm('c2', true);
        expect(svc.pendingConfirm()).toBeNull();
        expect(driver.confirmCalls).toEqual([{ cardId: 'c2', approved: true }]);
        expect(card('c2').state).toBe('running'); // resumed, awaiting tool_result

        driver.emit({ type: 'tool_result', card_id: 'c2', status: 'ok', summary: '3 transactions créées' });
        expect(card('c2').state).toBe('done');
    });

    it('confirm_required with NO preceding tool_use still renders (real bulk-park path)', () => {
        // The backend bulk gate parks with a fresh card_id and no tool_use card.
        // Before the fix this silently rendered nothing and locked the composer.
        svc.send('ajoute une maison à Thiès 30M et une voiture 8M');
        driver.emit({ type: 'routed', agent: 'config' });
        driver.emit({
            type: 'confirm_required', card_id: 'park-1',
            diff: [
                { op: 'create', label: 'Maison Thiès · 30 000 000 FCFA' },
                { op: 'create', label: 'Toyota · 8 000 000 FCFA' },
            ],
        });
        // a confirm card now exists and carries the 2-line diff
        expect(card('park-1').state).toBe('confirm');
        expect(card('park-1').diff!.length).toBe(2);
        expect(svc.pendingConfirm()).toBe('park-1');

        // the turn ending must NOT drop the bubble (it has the confirm card)
        driver.close();
        expect(card('park-1').state).toBe('confirm');

        // approving resumes and executes
        svc.confirm('park-1', true);
        expect(svc.pendingConfirm()).toBeNull();
        expect(driver.confirmCalls).toEqual([{ cardId: 'park-1', approved: true }]);
    });

    it('confirm re-locks the composer for the continuation, until its close (COR-1)', () => {
        svc.send('ajoute ma maison et ma voiture');
        driver.emit({ type: 'confirm_required', card_id: 'p1', diff: [{ op: 'create', label: 'x' }] });
        // Real SSE park: the parked HTTP body closes before the user decides.
        driver.close();
        expect(svc.streaming()).toBeFalse();
        expect(svc.inputLocked()).toBeTrue(); // pendingConfirm still holds the lock

        svc.confirm('p1', true);
        expect(svc.streaming()).toBeTrue(); // continuation in flight: Stop visible, composer locked

        driver.emit({ type: 'tool_result', card_id: 'p1', status: 'ok', summary: 'Créé' });
        driver.emit({ type: 'message_stop' });
        driver.close();
        expect(svc.streaming()).toBeFalse();
        expect(svc.inputLocked()).toBeFalse();
    });

    it('the turn handle survives the park close, so Stop aborts the continuation (COR-1)', () => {
        svc.send('ajoute ma maison et ma voiture');
        driver.emit({ type: 'confirm_required', card_id: 'p2', diff: [{ op: 'create', label: 'x' }] });
        driver.close(); // park: handle must be KEPT (pendingConfirm is set)
        svc.confirm('p2', true);
        svc.stop();
        expect(driver.cancelled).toBeTrue();
    });

    it('a declined confirm leads to a cancelled card', () => {
        svc.send('importe mon relevé');
        driver.emit({ type: 'tool_use', tool: 'bulk_import', args_preview: '3 transactions', card_id: 'c3' });
        driver.emit({ type: 'confirm_required', card_id: 'c3', diff: [{ op: 'create', label: 'x' }] });
        svc.confirm('c3', false);
        driver.emit({ type: 'tool_result', card_id: 'c3', status: 'cancelled', summary: 'Import annulé' });
        expect(card('c3').state).toBe('cancelled');
    });

    it('undo flips done -> undoing -> undone through the driver promise', async () => {
        svc.send('ajoute');
        driver.emit({ type: 'tool_use', tool: 'create_asset', args_preview: 'a', card_id: 'c4' });
        driver.emit({ type: 'tool_result', card_id: 'c4', status: 'ok', summary: 'ok', undo_token: 'u4' });
        driver.emit({ type: 'message_stop' });
        driver.close();

        svc.undo('c4');
        expect(card('c4').state).toBe('undoing');
        driver.resolveUndo();
        await Promise.resolve(); await Promise.resolve();
        expect(card('c4').state).toBe('undone');
    });

    it('a failed undo restores the done state (button stays usable)', async () => {
        svc.send('ajoute');
        driver.emit({ type: 'tool_use', tool: 'create_asset', args_preview: 'a', card_id: 'c5' });
        driver.emit({ type: 'tool_result', card_id: 'c5', status: 'ok', summary: 'ok', undo_token: 'u5' });
        driver.close();

        svc.undo('c5');
        driver.rejectUndo();
        await Promise.resolve(); await Promise.resolve();
        expect(card('c5').state).toBe('done');
    });

    it('error events render an error block and the turn closes cleanly', () => {
        svc.send('question');
        driver.emit({ type: 'text_delta', text: 'Je regarde' });
        driver.emit({ type: 'error', code: 'UPSTREAM_UNAVAILABLE', message: 'indisponible' });
        driver.close();
        const blocks = lastAssistant().blocks!;
        expect(blocks[blocks.length - 1]).toEqual({ kind: 'error', code: 'UPSTREAM_UNAVAILABLE', message: 'indisponible' });
        expect(svc.streaming()).toBeFalse();
        expect(svc.inputLocked()).toBeFalse();
    });

    it('stop cancels the stream and drops an empty assistant shell', () => {
        svc.send('question');
        expect(svc.messages().length).toBe(2);
        svc.stop();
        expect(driver.cancelled).toBeTrue();
        expect(svc.streaming()).toBeFalse();
        expect(svc.messages().length).toBe(1); // empty shell dropped, user msg kept
    });

    it('notices are appended as blocks in stream order', () => {
        svc.send('conseil ?');
        driver.emit({ type: 'text_delta', text: 'Voici mon analyse.' });
        driver.emit({ type: 'notice', kind: 'disclaimer_cima' });
        const blocks = lastAssistant().blocks!;
        expect(blocks[1]).toEqual({ kind: 'notice', notice: { kind: 'disclaimer_cima', message: undefined } });
    });
});


/**
 * Privacy: the thread is persisted per user, and opening the chat on a reused
 * browser must never render (or retain) another user's conversation. Regression
 * guard for the un-scoped global key that leaked one user's thread to the next.
 */
describe('ChatSessionService (per-user thread isolation)', () => {
    const P = CHAT_THREAD_KEY_PREFIX;

    function makeFor(userId: number | null): ChatSessionService {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                ChatSessionService,
                { provide: CHAT_STREAM_DRIVER, useValue: new FakeDriver() },
                { provide: AssetsStateService, useValue: {} },
                { provide: TokenService, useValue: { user: () => (userId != null ? { id: userId } : null) } },
            ],
        });
        return TestBed.inject(ChatSessionService);
    }

    afterEach(() => clearThreads());

    it('does not restore another user\'s thread and purges it (incl. the legacy key) on open', () => {
        localStorage.setItem(`${P}:2`, JSON.stringify([{ id: 'x', role: 'user', ts: 1, text: 'salaire secret' }]));
        localStorage.setItem(P, JSON.stringify([{ id: 'y', role: 'user', ts: 1, text: 'legacy' }]));

        const svc = makeFor(1); // user 1 has no thread of their own

        expect(svc.messages()).toEqual([]);
        expect(localStorage.getItem(`${P}:2`)).toBeNull(); // foreign thread purged
        expect(localStorage.getItem(P)).toBeNull();         // legacy un-scoped key purged
    });

    it('restores the current user\'s own thread and leaves it intact while dropping others', () => {
        localStorage.setItem(`${P}:1`, JSON.stringify([{ id: 'a', role: 'user', ts: 1, text: 'a moi' }]));
        localStorage.setItem(`${P}:2`, JSON.stringify([{ id: 'b', role: 'user', ts: 1, text: 'a eux' }]));

        const svc = makeFor(1);

        expect(svc.messages().length).toBe(1);
        expect(svc.messages()[0].text).toBe('a moi');
        expect(localStorage.getItem(`${P}:1`)).not.toBeNull(); // own thread kept
        expect(localStorage.getItem(`${P}:2`)).toBeNull();      // foreign purged
    });

    it('persists under the per-user key, never the shared/legacy key', () => {
        const svc = makeFor(7);
        svc.seedHistory('fr'); // any write path persists

        expect(localStorage.getItem(`${P}:7`)).not.toBeNull();
        expect(localStorage.getItem(P)).toBeNull();
    });

    it('stays memory-only when no user is identified (never writes a shared key)', () => {
        const svc = makeFor(null);
        svc.seedHistory('fr');
        expect(svc.messages().length).toBeGreaterThan(0); // in memory
        expect(localStorage.getItem(P)).toBeNull();        // but nothing persisted globally
    });
});

describe('ChatSessionService (new conversation)', () => {
    let svc: ChatSessionService;
    let driver: FakeDriver;
    let api: { resetConversation: jasmine.Spy };

    beforeEach(() => {
        clearThreads();
        driver = new FakeDriver();
        api = { resetConversation: jasmine.createSpy('resetConversation').and.returnValue(of({ ok: true })) };
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                ChatSessionService,
                { provide: CHAT_STREAM_DRIVER, useValue: driver },
                { provide: ApiService, useValue: api },
            ],
        });
        svc = TestBed.inject(ChatSessionService);
    });

    afterEach(() => clearThreads());

    it('clears the visible thread instantly but DELAYS the server reset (undo window)', () => {
        svc.send('bonjour');
        expect(svc.messages().length).toBeGreaterThan(0);
        svc.newConversation();
        expect(svc.messages()).toEqual([]);
        expect(api.resetConversation).not.toHaveBeenCalled(); // delayed, not fired yet
    });

    it('undo restores the thread and never resets the server', () => {
        svc.send('bonjour');
        const before = svc.messages().length;
        svc.newConversation();
        expect(svc.undoNewConversation()).toBeTrue();
        expect(svc.messages().length).toBe(before);
        expect(api.resetConversation).not.toHaveBeenCalled();
    });

    it('committing (sending in the window) resets the server exactly once, first', () => {
        svc.send('bonjour');
        svc.newConversation();
        expect(api.resetConversation).not.toHaveBeenCalled();
        svc.send('nouvelle question'); // send flushes the pending reset before the turn
        expect(api.resetConversation).toHaveBeenCalledTimes(1);
    });
});
