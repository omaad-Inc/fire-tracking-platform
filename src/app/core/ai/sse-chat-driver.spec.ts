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

/**
 * S12 Phase 3 transport tests: the fetch-stream parses a scripted SSE body
 * into the right events in order (token by token), cancel aborts without an
 * error bubble, the auth verdicts follow the survival rules (401 / non-plan
 * 403 log out; 403 PLAN_REQUIRED and network errors do not), and the
 * feature-flag factory swaps mock <-> real.
 */

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
        authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['logout']);
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

    it('401 logs out, no error bubble (survival rule)', (done) => {
        fetchSpy.and.resolveTo(sseResponse([], 401));
        const events: ChatStreamEvent[] = [];
        driver.startTurn('salut', (e) => events.push(e), () => {
            expect(authSpy.logout).toHaveBeenCalledTimes(1);
            expect(events.some((e) => e.type === 'error')).toBeFalse();
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
