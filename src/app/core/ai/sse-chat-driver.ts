import { Injectable, inject } from '@angular/core';
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
 * Session-survival rules ([[session-survival-rules]]): ONLY a 401 (invalid
 * session) or a non-entitlement 403 logs out. A 403 PLAN_REQUIRED is the
 * upsell gate, surfaced as an error event, never a logout. Every other
 * failure (network, 429, 5xx, mid-stream drop) is a degraded-mode error
 * bubble, never a logout.
 */
@Injectable({ providedIn: 'root' })
export class SseChatDriver implements ChatStreamDriver {
    private token = inject(TokenService);
    private auth = inject(AuthService);
    private i18n = inject(I18nService);
    private base = environment.apiUrl;

    /** The in-flight turn's callbacks + abort, so confirm() can resume the
     *  SAME turn (ARCH §4.1: confirmation is a pause, not a new conversation). */
    private active: {
        onEvent: (e: ChatStreamEvent) => void;
        close: () => void;
        controller: AbortController;
    } | null = null;

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
        const controller = new AbortController();
        let closed = false;
        const close = () => {
            if (closed) return;
            closed = true;
            if (this.active?.controller === controller) this.active = null;
            onClose();
        };
        this.active = { onEvent, close, controller };
        this.onboardingSurface = context?.['onboarding'] === true;
        const body = context ? { message, context } : { message };
        void this.run('/agents/chat', body, onEvent, close, controller);
        return {
            cancel: () => {
                controller.abort();
                close();
            },
        };
    }

    confirm(cardId: string, approved: boolean): void {
        const a = this.active;
        if (!a) return; // echo never parks; nothing to resume in Phase 3
        // Resume the same turn: a fresh request whose events pipe back into the
        // ORIGINAL onEvent/close. Phase 4's parked Config loop streams here.
        const controller = new AbortController();
        a.controller = controller;
        void this.run(
            '/agents/chat/confirm',
            { card_id: cardId, approved },
            a.onEvent,
            a.close,
            controller,
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
        onEvent: (e: ChatStreamEvent) => void,
        close: () => void,
        controller: AbortController,
    ): Promise<void> {
        try {
            const res = await fetch(`${this.base}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            if (!res.ok || !res.body) {
                await this.handleHttpError(res, onEvent);
                close();
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                let sep: number;
                // SSE frames are separated by a blank line.
                while ((sep = buffer.indexOf('\n\n')) !== -1) {
                    const frame = buffer.slice(0, sep);
                    buffer = buffer.slice(sep + 2);
                    this.dispatchFrame(frame, onEvent);
                }
            }
            // Server closes the body after message_stop / error, so a clean
            // end of stream is the single close signal.
            close();
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
            close();
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

        // 401: the session is genuinely invalid -> logout (survival rule).
        if (res.status === 401) {
            this.auth.logout();
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
                    ? 'assistant.errorState.quotaReached'
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
