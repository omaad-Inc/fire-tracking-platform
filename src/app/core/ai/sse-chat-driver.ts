import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { I18nService } from '../../i18n/i18n.service';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';
import { ChatStreamEvent } from './chat-events';
import { ChatStreamDriver, ChatTurnHandle } from './chat-stream-driver';

/**
 * S12 Phase 3 transport: the real pipe to POST /api/v1/agents/chat.
 *
 * Uses fetch + a ReadableStream reader, NOT native EventSource: EventSource is
 * GET-only and cannot carry the in-memory access token as an Authorization
 * header. The response body is an SSE stream; each `data:` line is one
 * ChatStreamEvent (chat-events.ts), so this driver and the MockChatDriver are
 * interchangeable and ChatSessionService never learns which one it has.
 *
 * The Phase 1 contract bet: swapping the mock for this driver is a single
 * provider change in assistant-page; components and ChatSessionService are
 * untouched.
 *
 * Session-survival rules ([[session-survival-rules]]): a 401 gets ONE
 * single-flight /auth/refresh attempt and a retry of the same request (the
 * same treatment AuthInterceptor gives every HttpClient call — this driver
 * bypasses interceptors, so it applies the rule itself). Only a DEFINITIVE
 * refresh rejection logs out. A 403 PLAN_REQUIRED is the upsell gate,
 * surfaced as an error event, never a logout. Every other failure (network,
 * 429, 5xx, mid-stream drop) is a degraded-mode error bubble, never a logout.
 */

/** One driver turn. `controller` and `finish` are reassigned per HTTP request
 *  (the parked request, then the /confirm continuation), while the callbacks
 *  stay those given to startTurn: confirmation is a pause, not a new turn. */
interface ActiveTurn {
    onEvent: (e: ChatStreamEvent) => void;
    onClose: () => void;
    controller: AbortController;
    /** True once confirm_required streamed: the server closed the HTTP body
     *  but the turn is only paused, so the callbacks must survive that close
     *  for confirm() to resume through them (ARCH §4.1). */
    parked: boolean;
    /** Finalizer of the CURRENT request (idempotent). Kept on the turn so
     *  cancel() always settles the request actually in flight. */
    finish: () => void;
}

@Injectable({ providedIn: 'root' })
export class SseChatDriver implements ChatStreamDriver {
    private token = inject(TokenService);
    private auth = inject(AuthService);
    private i18n = inject(I18nService);
    private base = environment.apiUrl;

    /** The in-flight turn, so confirm() can resume the SAME turn. */
    private active: ActiveTurn | null = null;

    /** True while the in-flight turn is the first-run onboarding concierge, so
     *  its requests carry X-Omaad-Surface and the backend exempts them from the
     *  tight AI chat rate limit (a first-run flow must never 429). */
    private onboardingSurface = false;

    startTurn(
        message: string,
        onEvent: (e: ChatStreamEvent) => void,
        onClose: () => void,
        context?: Record<string, unknown>,
    ): ChatTurnHandle {
        this.abortActive(); // one turn at a time; a new turn supersedes a stale one
        const state: ActiveTurn = {
            onEvent,
            onClose,
            controller: new AbortController(),
            parked: false,
            finish: () => {},
        };
        this.active = state;
        this.onboardingSurface = context?.['onboarding'] === true;
        const body = context ? { message, context } : { message };
        void this.run('/agents/chat', body, state);
        return {
            cancel: () => {
                // Read controller/finish at call time: confirm() reassigns them,
                // so Stop during a continuation aborts THAT fetch, not the dead
                // controller of the already-closed parked request.
                state.parked = false; // a stopped turn is over, not paused
                state.controller.abort();
                state.finish();
                // Cancel while parked: the parked request's finish already ran,
                // so release the slot here.
                if (this.active === state) this.active = null;
            },
        };
    }

    confirm(cardId: string, approved: boolean): void {
        const state = this.active;
        if (!state) return; // no parked turn (e.g. reloaded mid-pause): nothing to resume
        // Resume the same turn: a fresh request whose events pipe back into the
        // ORIGINAL onEvent/onClose. The continuation always terminates (the
        // backend's resume path ends in message_stop), so un-park now.
        state.parked = false;
        state.controller = new AbortController();
        void this.run(
            '/agents/chat/confirm',
            { card_id: cardId, approved },
            state,
        );
    }

    undo(undoToken: string): Promise<void> {
        // Undo is a plain REST call (ARCH §4.1: "undo is a REST call, not a chat
        // message"); it must work even if Anthropic is down. Undoing an AI CREATE
        // means removing the just-created row, so it is a soft DELETE, not a
        // restore: DELETE /api/v1/<resource>/<id> soft-deletes and, for a
        // transaction, reverses the account-balance ledger (S11-TX-1). Phase 4
        // emits undoToken as "<resource>/<id>" (e.g. "assets/42"), which is
        // exactly the DELETE route. (The /restore route un-deletes and is the
        // opposite direction; it 409s on a live row — see S12 P4 4.6.)
        return fetch(`${this.base}/${undoToken}`, {
            method: 'DELETE',
            headers: this.authHeaders(),
        }).then((res) => {
            if (!res.ok) throw new Error(`undo (delete) failed: ${res.status}`);
        });
    }

    // ─── Internals ───────────────────────────────────────────────────────────

    private authHeaders(): Record<string, string> {
        const token = this.token.getToken();
        const headers: Record<string, string> = token
            ? { Authorization: `Bearer ${token}` }
            : {};
        // Onboarding turns are exempt from the tight AI chat rate limit server-side.
        if (this.onboardingSurface) headers['X-Omaad-Surface'] = 'onboarding';
        return headers;
    }

    private async run(
        path: string,
        body: Record<string, unknown>,
        state: ActiveTurn,
        retriedAfterRefresh = false,
    ): Promise<void> {
        const controller = state.controller;
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            // A parked request keeps the turn alive for confirm(); anything
            // else releases the slot before notifying the UI.
            if (!state.parked && this.active === state) this.active = null;
            state.onClose();
        };
        state.finish = finish;
        const onEvent = (e: ChatStreamEvent) => {
            if (e.type === 'confirm_required') state.parked = true;
            state.onEvent(e);
        };
        try {
            const res = await fetch(`${this.base}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            // COR-3: a 401 gets the same one-refresh-then-retry treatment the
            // AuthInterceptor gives XHR calls; this fetch bypasses interceptors.
            if (res.status === 401 && !retriedAfterRefresh) {
                const outcome = await this.refreshOutcome();
                if (outcome === 'refreshed') {
                    // authHeaders() reads the fresh token at call time.
                    await this.run(path, body, state, true);
                    return; // the retry owns state.finish now
                }
                if (outcome === 'dead') {
                    // The refresh itself was definitively rejected: the one
                    // verdict that justifies a logout (survival rule).
                    this.auth.logout();
                    finish();
                    return;
                }
                // Transient refresh failure: no verdict on the session.
                onEvent({
                    type: 'error',
                    code: 'unavailable',
                    message: this.t('assistant.errorState.unavailable'),
                });
                finish();
                return;
            }

            if (!res.ok || !res.body) {
                await this.handleHttpError(res, onEvent);
                finish();
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            for (;;) {
                const { done: eof, value } = await reader.read();
                if (eof) break;
                buffer += decoder.decode(value, { stream: true });
                let sep: number;
                // SSE frames are separated by a blank line.
                while ((sep = buffer.indexOf('\n\n')) !== -1) {
                    const frame = buffer.slice(0, sep);
                    buffer = buffer.slice(sep + 2);
                    this.dispatchFrame(frame, onEvent);
                }
            }
            // Server closes the body after message_stop / confirm_required /
            // error, so a clean end of stream is the single close signal.
            finish();
        } catch (err) {
            // AbortError == user pressed Stop / navigated away: just close, no
            // error bubble. Anything else is a degraded-mode bubble, no logout.
            if (!(err instanceof DOMException && err.name === 'AbortError')) {
                onEvent({
                    type: 'error',
                    code: 'stream_error',
                    message: this.t('assistant.errorState.offline'),
                });
            }
            finish();
        }
    }

    /**
     * One single-flight refresh attempt (shared with AuthInterceptor via
     * AuthService.forceRefresh). 'refreshed' = new token in TokenService;
     * 'dead' = the session was definitively rejected; 'transient' = the
     * refresh call itself failed with no verdict (network/5xx).
     */
    private async refreshOutcome(): Promise<'refreshed' | 'dead' | 'transient'> {
        try {
            const token = await firstValueFrom(this.auth.forceRefresh());
            return token ? 'refreshed' : 'dead';
        } catch {
            return 'transient';
        }
    }

    private dispatchFrame(frame: string, onEvent: (e: ChatStreamEvent) => void): void {
        for (const line of frame.split('\n')) {
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            try {
                onEvent(JSON.parse(payload) as ChatStreamEvent);
            } catch {
                // A malformed frame is not fatal: skip it, keep the stream alive.
            }
        }
    }

    private async handleHttpError(
        res: Response,
        onEvent: (e: ChatStreamEvent) => void,
    ): Promise<void> {
        let detail: { code?: string } = {};
        try {
            const parsed = await res.json();
            detail = parsed?.detail ?? parsed ?? {};
        } catch {
            /* no JSON body */
        }

        // 401 after a successful refresh + retry: mirror AuthInterceptor (a
        // replayed request's 401 surfaces retryably, only a refresh rejection
        // logs out). Degraded bubble, keep the session.
        if (res.status === 401) {
            onEvent({
                type: 'error',
                code: 'unavailable',
                message: this.t('assistant.errorState.unavailable'),
            });
            return;
        }
        // 403 PLAN_REQUIRED is the entitlement gate, not an auth failure: no
        // logout, surface it so the UI can route to the upsell.
        if (res.status === 403 && detail?.code === 'PLAN_REQUIRED') {
            onEvent({
                type: 'error',
                code: 'PLAN_REQUIRED',
                message: this.t('assistant.errorState.quotaReached'),
            });
            return;
        }
        // Any other 403 is a real forbidden verdict -> logout (survival rule).
        if (res.status === 403) {
            this.auth.logout();
            return;
        }
        // 429 / 5xx / everything else: degraded bubble, keep the session.
        onEvent({
            type: 'error',
            code: res.status === 429 ? 'rate_limited' : 'unavailable',
            message: this.t(
                res.status === 429
                    ? 'assistant.errorState.rateLimited'
                    : 'assistant.errorState.unavailable',
            ),
        });
    }

    private abortActive(): void {
        if (this.active) {
            this.active.controller.abort();
            this.active = null;
        }
    }

    private t(key: string): string {
        return this.i18n.t(key);
    }
}
