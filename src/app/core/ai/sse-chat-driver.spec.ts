import { TestBed } from '@angular/core/testing';
import { SseChatDriver } from './sse-chat-driver';
import { MockChatDriver } from './mock-chat-driver';
import { CHAT_STREAM_DRIVER, ChatStreamDriver } from './chat-stream-driver';
import { ChatStreamEvent } from './chat-events';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';
import { FeatureFlagsService } from '../services/feature-flags.service';
import { I18nService } from '../../i18n/i18n.service';
import { inject as ngInject } from '@angular/core';
import { of, throwError } from 'rxjs';

/**
 * S12 Phase 3 transport tests: the fetch-stream parses a scripted SSE body
 * into the right events in order (token by token), cancel aborts without an
 * error bubble, the auth verdicts follow the survival rules (a 401 gets one
 * refresh + retry and only a definitive refresh rejection logs out — COR-3;
 * non-plan 403 logs out; 403 PLAN_REQUIRED and network errors do not), the
 * confirm park keeps the turn resumable across the closed HTTP body (COR-1),
 * and the feature-flag factory swaps mock <-> real.
 */

/** FIFO close-signal so multi-request turns (park -> confirm) can be awaited
 *  step by step without racing the microtask that fires onClose. */
class CloseSignal {
    private waiters: (() => void)[] = [];
    private pending = 0;
    fire(): void {
        const w = this.waiters.shift();
        if (w) w();
        else this.pending++;
    }
    wait(): Promise<void> {
        if (this.pending > 0) {
            this.pending--;
            return Promise.resolve();
        }
        return new Promise((r) => this.waiters.push(r));
    }
}

function sseResponse(frames: string[], status = 200, jsonBody?: unknown): Response {
    if (status !== 200) {
        return new Response(JSON.stringify(jsonBody ?? {}), {
            status,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    const body = new ReadableStream<Uint8Array>({
        start(controller) {
            const enc = new TextEncoder();
            for (const f of frames) controller.enqueue(enc.encode(f));
            controller.close();
        },
    });
    return new Response(body, {
        status,
        headers: { 'Content-Type': 'text/event-stream' },
    });
}

function frame(event: ChatStreamEvent): string {
    return `data: ${JSON.stringify(event)}\n\n`;
}

describe('SseChatDriver', () => {
    let driver: SseChatDriver;
    let authSpy: jasmine.SpyObj<AuthService>;
    let fetchSpy: jasmine.Spy;

    beforeEach(() => {
        authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['logout', 'forceRefresh']);
        TestBed.configureTestingModule({
            providers: [
                SseChatDriver,
                { provide: TokenService, useValue: { getToken: () => 'test-token' } },
                { provide: AuthService, useValue: authSpy },
                { provide: I18nService, useValue: { t: (k: string) => k } },
            ],
        });
        driver = TestBed.inject(SseChatDriver);
        fetchSpy = spyOn(window, 'fetch');
    });

    function runTurn(frames: string[]): Promise<ChatStreamEvent[]> {
        fetchSpy.and.resolveTo(sseResponse(frames));
        return new Promise((resolve) => {
            const events: ChatStreamEvent[] = [];
            driver.startTurn('salut', (e) => events.push(e), () => resolve(events));
        });
    }

    it('parses a scripted SSE body into ordered events (token by token)', async () => {
        const events = await runTurn([
            frame({ type: 'routed', agent: 'assistant' }),
            frame({ type: 'text_delta', text: 'Oui' }),
            frame({ type: 'text_delta', text: ', plutôt.' }),
            frame({ type: 'message_stop' }),
        ]);
        expect(events.map((e) => e.type)).toEqual(['routed', 'text_delta', 'text_delta', 'message_stop']);
        const text = events.filter((e): e is Extract<ChatStreamEvent, { type: 'text_delta' }> => e.type === 'text_delta')
            .map((e) => e.text).join('');
        expect(text).toBe('Oui, plutôt.');
    });

    it('handles multiple frames arriving in one chunk', async () => {
        // Two events in a single network chunk must both be dispatched.
        const merged = frame({ type: 'text_delta', text: 'a' }) + frame({ type: 'message_stop' });
        const events = await runTurn([frame({ type: 'routed', agent: 'assistant' }), merged]);
        expect(events.map((e) => e.type)).toEqual(['routed', 'text_delta', 'message_stop']);
    });

    it('sends the Authorization header and POSTs to /agents/chat', async () => {
        await runTurn([frame({ type: 'message_stop' })]);
        const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
        expect(url).toContain('/agents/chat');
        expect(init.method).toBe('POST');
        expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-token');
        expect(JSON.parse(init.body as string)).toEqual({ message: 'salut' });
    });

    it('cancel aborts without emitting an error bubble', (done) => {
        // A body that never closes, so cancel() is what drives onClose.
        const body = new ReadableStream<Uint8Array>({ start() { /* never closes */ } });
        fetchSpy.and.resolveTo(new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }));

        const events: ChatStreamEvent[] = [];
        let closes = 0;
        const handle = driver.startTurn('salut', (e) => events.push(e), () => { closes++; });
        setTimeout(() => {
            handle.cancel();
            expect(closes).toBe(1);
            expect(events.some((e) => e.type === 'error')).toBeFalse();
            done();
        }, 20);
    });

    // ─── COR-3: 401 gets one refresh + retry; only a failed refresh logs out ──

    it('401 triggers ONE refresh then retries the turn: success streams, no logout', (done) => {
        authSpy.forceRefresh.and.returnValue(of('fresh-token'));
        let call = 0;
        fetchSpy.and.callFake(() =>
            Promise.resolve(++call === 1
                ? sseResponse([], 401)
                : sseResponse([frame({ type: 'text_delta', text: 'Oui.' }), frame({ type: 'message_stop' })])));
        const events: ChatStreamEvent[] = [];
        driver.startTurn('salut', (e) => events.push(e), () => {
            expect(authSpy.forceRefresh).toHaveBeenCalledTimes(1);
            expect(authSpy.logout).not.toHaveBeenCalled();
            expect(fetchSpy).toHaveBeenCalledTimes(2);
            expect(events.map((e) => e.type)).toEqual(['text_delta', 'message_stop']);
            done();
        });
    });

    it('401 with a DEFINITIVELY rejected refresh logs out, no error bubble', (done) => {
        authSpy.forceRefresh.and.returnValue(of(null)); // refresh itself 401/403'd
        fetchSpy.and.resolveTo(sseResponse([], 401));
        const events: ChatStreamEvent[] = [];
        driver.startTurn('salut', (e) => events.push(e), () => {
            expect(authSpy.logout).toHaveBeenCalledTimes(1);
            expect(events.some((e) => e.type === 'error')).toBeFalse();
            done();
        });
    });

    it('401 with a TRANSIENT refresh failure keeps the session: degraded bubble, no logout', (done) => {
        authSpy.forceRefresh.and.returnValue(throwError(() => new Error('network down')));
        fetchSpy.and.resolveTo(sseResponse([], 401));
        const events: ChatStreamEvent[] = [];
        driver.startTurn('salut', (e) => events.push(e), () => {
            expect(authSpy.logout).not.toHaveBeenCalled();
            const err = events.find((e) => e.type === 'error');
            expect(err && err.type === 'error' && err.code).toBe('unavailable');
            done();
        });
    });

    it('a 401 repeated AFTER a successful refresh does not log out (one attempt only)', (done) => {
        authSpy.forceRefresh.and.returnValue(of('fresh-token'));
        fetchSpy.and.resolveTo(sseResponse([], 401)); // both attempts 401
        const events: ChatStreamEvent[] = [];
        driver.startTurn('salut', (e) => events.push(e), () => {
            expect(authSpy.forceRefresh).toHaveBeenCalledTimes(1);
            expect(authSpy.logout).not.toHaveBeenCalled();
            expect(events.some((e) => e.type === 'error')).toBeTrue();
            done();
        });
    });

    it('403 PLAN_REQUIRED surfaces an upsell error, does NOT log out', (done) => {
        fetchSpy.and.resolveTo(sseResponse([], 403, { detail: { code: 'PLAN_REQUIRED' } }));
        const events: ChatStreamEvent[] = [];
        driver.startTurn('salut', (e) => events.push(e), () => {
            expect(authSpy.logout).not.toHaveBeenCalled();
            const err = events.find((e) => e.type === 'error');
            expect(err && err.type === 'error' && err.code).toBe('PLAN_REQUIRED');
            done();
        });
    });

    it('a plain 403 (not PLAN_REQUIRED) logs out', (done) => {
        fetchSpy.and.resolveTo(sseResponse([], 403, { detail: {} }));
        driver.startTurn('salut', () => {}, () => {
            expect(authSpy.logout).toHaveBeenCalledTimes(1);
            done();
        });
    });

    it('a network error is a degraded bubble, not a logout', (done) => {
        fetchSpy.and.rejectWith(new TypeError('network down'));
        const events: ChatStreamEvent[] = [];
        driver.startTurn('salut', (e) => events.push(e), () => {
            expect(authSpy.logout).not.toHaveBeenCalled();
            expect(events.some((e) => e.type === 'error')).toBeTrue();
            done();
        });
    });

    it('429 is a degraded bubble, not a logout', (done) => {
        fetchSpy.and.resolveTo(sseResponse([], 429, { detail: 'slow down' }));
        const events: ChatStreamEvent[] = [];
        driver.startTurn('salut', (e) => events.push(e), () => {
            expect(authSpy.logout).not.toHaveBeenCalled();
            const err = events.find((e) => e.type === 'error');
            expect(err && err.type === 'error' && err.code).toBe('rate_limited');
            done();
        });
    });

    // ─── COR-1: the confirm park survives the closed HTTP body ────────────────

    it('park -> confirm resumes via /agents/chat/confirm into the SAME callbacks', async () => {
        const closes = new CloseSignal();
        const events: ChatStreamEvent[] = [];
        // Parked request: confirm_required, then the server closes the body
        // WITHOUT message_stop (orchestrator's parked return).
        fetchSpy.and.resolveTo(sseResponse([
            frame({ type: 'confirm_required', card_id: 'card-1', diff: [
                { op: 'create', label: 'Maison Thiès · 30 000 000 FCFA' },
                { op: 'create', label: 'Toyota · 8 000 000 FCFA' },
            ] }),
        ]));
        driver.startTurn('ajoute ma maison et ma voiture', (e) => events.push(e), () => closes.fire());
        await closes.wait();
        expect(events.map((e) => e.type)).toEqual(['confirm_required']);

        // Confirm: a fresh request to /confirm whose events pipe back into the
        // original onEvent, and whose end fires the original onClose again.
        fetchSpy.and.resolveTo(sseResponse([
            frame({ type: 'tool_use', tool: 'create_asset', args_preview: 'Maison', card_id: 't1' }),
            frame({ type: 'tool_result', card_id: 't1', status: 'ok', summary: 'Maison créée', undo_token: 'assets/1' }),
            frame({ type: 'message_stop' }),
        ]));
        driver.confirm('card-1', true);
        await closes.wait();

        const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
        expect(url).toContain('/agents/chat/confirm');
        expect(JSON.parse(init.body as string)).toEqual({ card_id: 'card-1', approved: true });
        expect(events.map((e) => e.type)).toEqual(
            ['confirm_required', 'tool_use', 'tool_result', 'message_stop']);
    });

    it('deny posts approved:false through the same resume path', async () => {
        const closes = new CloseSignal();
        fetchSpy.and.resolveTo(sseResponse([
            frame({ type: 'confirm_required', card_id: 'card-2', diff: [{ op: 'create', label: 'x' }] }),
        ]));
        driver.startTurn('deux créations', () => {}, () => closes.fire());
        await closes.wait();

        fetchSpy.and.resolveTo(sseResponse([
            frame({ type: 'tool_result', card_id: 'card-2', status: 'cancelled', summary: 'Annulé.' }),
            frame({ type: 'message_stop' }),
        ]));
        driver.confirm('card-2', false);
        await closes.wait();

        const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
        expect(url).toContain('/agents/chat/confirm');
        expect(JSON.parse(init.body as string)).toEqual({ card_id: 'card-2', approved: false });
    });

    it('Stop during a confirm continuation aborts the CONTINUATION fetch', async () => {
        const closes = new CloseSignal();
        fetchSpy.and.resolveTo(sseResponse([
            frame({ type: 'confirm_required', card_id: 'card-3', diff: [{ op: 'create', label: 'x' }] }),
        ]));
        const handle = driver.startTurn('deux créations', () => {}, () => closes.fire());
        await closes.wait();
        const firstSignal = (fetchSpy.calls.argsFor(0)[1] as RequestInit).signal as AbortSignal;

        // Continuation that never closes on its own.
        const hanging = new ReadableStream<Uint8Array>({ start() { /* never closes */ } });
        fetchSpy.and.resolveTo(new Response(hanging, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }));
        driver.confirm('card-3', true);
        await Promise.resolve(); // let the confirm fetch register its signal
        const secondSignal = (fetchSpy.calls.mostRecent().args[1] as RequestInit).signal as AbortSignal;

        handle.cancel();
        expect(secondSignal.aborted).toBeTrue(); // the live fetch, not the dead one
        expect(firstSignal.aborted).toBeFalse();
        await closes.wait(); // onClose fires again for the aborted continuation
    });

    it('undo DELETEs the created row (no LLM); undoing a create is a soft delete', async () => {
        fetchSpy.and.resolveTo(new Response(null, { status: 204 }));
        await driver.undo('assets/42');
        const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
        expect(url).toContain('/assets/42');
        expect(url).not.toContain('/restore');
        expect(init.method).toBe('DELETE');
    });
});

describe('CHAT_STREAM_DRIVER feature-flag swap', () => {
    function resolveWith(aiChatOn: boolean): ChatStreamDriver {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                { provide: TokenService, useValue: { getToken: () => null } },
                { provide: AuthService, useValue: {} },
                { provide: I18nService, useValue: { t: (k: string) => k } },
                { provide: FeatureFlagsService, useValue: { aiChat: () => aiChatOn } },
                // Mirrors the assistant-page provider exactly.
                {
                    provide: CHAT_STREAM_DRIVER,
                    useFactory: () => {
                        const flags = ngInject(FeatureFlagsService);
                        return flags.aiChat() ? ngInject(SseChatDriver) : ngInject(MockChatDriver);
                    },
                },
            ],
        });
        return TestBed.inject(CHAT_STREAM_DRIVER);
    }

    it('uses the real SSE driver when aiChat is on', () => {
        expect(resolveWith(true)).toBeInstanceOf(SseChatDriver);
    });

    it('keeps the mock driver when aiChat is off', () => {
        expect(resolveWith(false)).toBeInstanceOf(MockChatDriver);
    });
});
