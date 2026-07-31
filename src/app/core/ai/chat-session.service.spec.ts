import { TestBed } from '@angular/core/testing';
import { ChatSessionService } from './chat-session.service';
import { CHAT_STREAM_DRIVER, ChatStreamDriver, ChatTurnHandle } from './chat-stream-driver';
import { ChatStreamEvent, ToolCardVM } from './chat-events';

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
        localStorage.removeItem('omaad_chat_thread_v1');
        driver = new FakeDriver();
        TestBed.configureTestingModule({
            providers: [
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
