import { Injectable, computed, inject, signal } from '@angular/core';
import { CHAT_STREAM_DRIVER, ChatTurnHandle } from './chat-stream-driver';
import {
    AssistantBlock, ChatMessageVM, ChatStreamEvent, FeedbackRating, FeedbackReason, ToolCardVM,
} from './chat-events';
import { AssetsStateService } from '../../pages/service/assets-state.service';
import { ApiService } from '../services/api.service';
import { CHAT_THREAD_KEY_PREFIX, TokenService } from '../services/token.service';

/**
 * Thread state for the S12 chat surface (Phase 1).
 *
 * Builds view models from ChatStreamEvents, whoever emits them (mock now, SSE
 * in Phase 3). One continuous thread per user (ARCH §9: no multi-conversation
 * UI in v1). Finished turns persist to localStorage, keyed by user id, so the
 * thread survives navigation while the backend conversation store is not the
 * source of truth for the UI. The per-user key plus a purge of foreign threads
 * on open means a shared browser never shows one user's conversation to the
 * next (logout wipes them all; see TokenService.clear).
 */

const MAX_PERSISTED = 200;

let uid = 0;
const nextId = () => `m${Date.now().toString(36)}-${++uid}`;

/**
 * Provided by the assistant page (component-level injector) together with the
 * CHAT_STREAM_DRIVER token, so Phase 3 swaps transports in ONE place.
 */
@Injectable()
export class ChatSessionService {
    private driver = inject(CHAT_STREAM_DRIVER);
    private assetsState = inject(AssetsStateService);
    private tokens = inject(TokenService);
    private api = inject(ApiService);

    readonly messages = signal<ChatMessageVM[]>(this.restore());
    /** True while a turn is streaming (input disabled, Stop visible). */
    readonly streaming = signal(false);
    /** card_id of a pending dry-run confirmation; blocks the composer. */
    readonly pendingConfirm = signal<string | null>(null);

    /** Composer availability: no send while streaming or awaiting a confirm. */
    readonly inputLocked = computed(() => this.streaming() || this.pendingConfirm() !== null);

    private handle: ChatTurnHandle | null = null;

    // ─── Actions ─────────────────────────────────────────────────────────────

    send(text: string): void {
        const trimmed = text.trim();
        if (!trimmed || this.inputLocked()) return;

        // Offline short-circuit: degraded bubble, no turn started.
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            this.append({ id: nextId(), role: 'user', ts: Date.now(), text: trimmed });
            this.append({
                id: nextId(), role: 'assistant', ts: Date.now(),
                blocks: [{ kind: 'error', code: 'OFFLINE', message: '' }],
            });
            this.persist();
            return;
        }

        this.append({ id: nextId(), role: 'user', ts: Date.now(), text: trimmed });
        this.append({ id: nextId(), role: 'assistant', ts: Date.now(), blocks: [] });
        this.streaming.set(true);
        this.handle = this.driver.startTurn(
            trimmed,
            (e) => this.reduce(e),
            () => this.closeTurn(),
        );
    }

    /** Stop button: cancel the in-flight stream, keep what already arrived. */
    stop(): void {
        this.handle?.cancel();
    }

    /** Confirmer / Annuler on a dry-run card. Resumes the SAME turn. */
    confirm(cardId: string, approved: boolean): void {
        this.pendingConfirm.set(null);
        this.updateCard(cardId, (c) => ({ ...c, state: approved ? 'running' : c.state }));
        this.driver.confirm(cardId, approved);
    }

    /** Annuler on a done card: REST restore via the driver, no LLM involved. */
    undo(cardId: string): void {
        const card = this.findCard(cardId);
        if (!card?.undoToken || card.state !== 'done') return;
        const undoToken = card.undoToken;
        this.updateCard(cardId, (c) => ({ ...c, state: 'undoing' }));
        this.driver.undo(undoToken).then(
            () => {
                this.updateCard(cardId, (c) => ({ ...c, state: 'undone' }));
                this.persist();
                // The row was removed; refresh the same data views the create touched.
                this.notifyDataChanged(undoToken);
            },
            () => this.updateCard(cardId, (c) => ({ ...c, state: 'done' })),
        );
    }

    /**
     * Record a 👍/👎 on one assistant message (task 2.9). Optimistic and
     * best-effort: the UI reflects the choice immediately and the POST is
     * fire-and-forget (reverting only on failure). `reason` refines a 👎.
     */
    sendFeedback(messageId: string, rating: FeedbackRating, reason?: FeedbackReason): void {
        const prev = this.messages().find((m) => m.id === messageId);
        if (!prev || prev.role !== 'assistant') return;
        // Toggling the same 👍 off is not a thing here: a rating is sticky, and a
        // re-tap of the same thumb just re-affirms it (idempotent server-side).
        const nextReason = rating === 'down' ? reason : undefined;
        this.patchMessage(messageId, (m) => ({ ...m, feedback: rating, feedbackReason: nextReason }));
        this.persist();
        this.api.postAssistantFeedback(messageId, rating, nextReason).subscribe({
            error: () => {
                // Feedback is non-critical: on failure, roll back to the prior state.
                this.patchMessage(messageId, (m) => ({
                    ...m, feedback: prev.feedback, feedbackReason: prev.feedbackReason,
                }));
                this.persist();
            },
        });
    }

    /** Retry after an error bubble: resend the last user message. */
    retryLast(): void {
        if (this.inputLocked()) return;
        const msgs = this.messages();
        const lastUser = [...msgs].reverse().find((m) => m.role === 'user');
        if (!lastUser?.text) return;
        // Drop the failed assistant tail so the thread does not stack error bubbles.
        const last = msgs[msgs.length - 1];
        if (last.role === 'assistant' && last.blocks?.every((b) => b.kind === 'error')) {
            this.messages.set(msgs.slice(0, -1));
        }
        const text = lastUser.text;
        this.messages.set(this.messages().filter((m) => m !== lastUser));
        this.send(text);
    }

    /** Dev switch: wipe the local thread. */
    clear(): void {
        this.stop();
        this.messages.set([]);
        this.pendingConfirm.set(null);
        this.persist();
    }

    /** Dev switch: seed a two-day-old exchange so day separators are demoable. */
    seedHistory(lang: 'fr' | 'en'): void {
        const twoDays = Date.now() - 2 * 24 * 3600_000;
        const yesterday = Date.now() - 24 * 3600_000;
        const fr = lang === 'fr';
        const seeded: ChatMessageVM[] = [
            { id: nextId(), role: 'user', ts: twoDays, text: fr ? 'Comment va mon patrimoine ?' : 'How is my wealth doing?' },
            {
                id: nextId(), role: 'assistant', ts: twoDays + 4000, agent: 'assistant',
                blocks: [{ kind: 'text', text: fr ? 'Ton patrimoine net progresse de +1,8% ce mois-ci, porté par ton épargne régulière.' : 'Your net worth is up +1.8% this month, driven by your steady savings.' }],
            },
            { id: nextId(), role: 'user', ts: yesterday, text: fr ? 'Ajoute mon salaire de juillet' : 'Add my July salary' },
            {
                id: nextId(), role: 'assistant', ts: yesterday + 5000, agent: 'config',
                blocks: [
                    { kind: 'text', text: fr ? 'Je crée ça pour toi.' : 'Creating that for you.' },
                    { kind: 'card', card: { cardId: 'seed-1', tool: 'create_txn', argsPreview: fr ? 'Salaire · Revenus' : 'Salary · Income', state: 'done', summary: fr ? 'Salaire · +850 000 FCFA' : 'Salary · +850,000 FCFA', undoToken: 'undo-seed-1' } },
                ],
            },
        ];
        this.messages.set([...seeded, ...this.messages()]);
        this.persist();
    }

    // ─── Event reducer ───────────────────────────────────────────────────────

    private reduce(e: ChatStreamEvent): void {
        switch (e.type) {
            case 'routed':
                this.patchTail((m) => ({ ...m, agent: e.agent }));
                break;
            case 'text_delta':
                this.patchTail((m) => {
                    const blocks = [...(m.blocks ?? [])];
                    const last = blocks[blocks.length - 1];
                    if (last?.kind === 'text') {
                        blocks[blocks.length - 1] = { kind: 'text', text: last.text + e.text };
                    } else {
                        blocks.push({ kind: 'text', text: e.text });
                    }
                    return { ...m, blocks };
                });
                break;
            case 'tool_use':
                this.pushBlock({ kind: 'card', card: { cardId: e.card_id, tool: e.tool, argsPreview: e.args_preview, state: 'running' } });
                break;
            case 'tool_result':
                this.updateCard(e.card_id, (c) => ({
                    ...c,
                    state: e.status === 'ok' ? 'done' : e.status === 'cancelled' ? 'cancelled' : 'error',
                    summary: e.summary,
                    undoToken: e.undo_token,
                }));
                // A successful write must refresh the app's data views (patrimoine,
                // dashboard/net worth, …); otherwise the created row only appears
                // after a hard reload. Covers both the streamed create and the
                // confirm-executed creates (same onEvent path).
                if (e.status === 'ok' && e.undo_token) this.notifyDataChanged(e.undo_token);
                break;
            case 'confirm_required':
                // The bulk confirm gate parks with a FRESH card_id and NO preceding
                // tool_use (the batched creates never streamed), so there is no card
                // to update. Create one from the event itself; only fall back to
                // updating when a card already exists (e.g. a single-tool preview).
                // Without this the diff never rendered, the empty turn was dropped,
                // and pendingConfirm silently locked the composer -> "nothing answered".
                if (this.findCard(e.card_id)) {
                    this.updateCard(e.card_id, (c) => ({ ...c, state: 'confirm', diff: e.diff }));
                } else {
                    this.pushBlock({
                        kind: 'card',
                        card: { cardId: e.card_id, tool: 'preview', argsPreview: '', state: 'confirm', diff: e.diff },
                    });
                }
                this.pendingConfirm.set(e.card_id);
                break;
            case 'notice':
                this.pushBlock({ kind: 'notice', notice: { kind: e.kind, message: e.message } });
                break;
            case 'error':
                this.pushBlock({ kind: 'error', code: e.code, message: e.message });
                break;
            case 'message_stop':
                // Terminal bookkeeping happens in closeTurn(); nothing to render.
                break;
        }
    }

    private closeTurn(): void {
        this.streaming.set(false);
        this.handle = null;
        // Drop an assistant shell that never received content (e.g. stopped
        // before the first event) so no empty bubble lingers.
        const msgs = this.messages();
        const last = msgs[msgs.length - 1];
        if (last?.role === 'assistant' && (last.blocks?.length ?? 0) === 0) {
            this.messages.set(msgs.slice(0, -1));
        }
        this.persist();
    }

    /**
     * A Config write succeeded (or was undone): invalidate the affected data
     * views via AssetsStateService so the patrimoine list, dashboard KPIs and
     * net worth reflect it without a reload. The undo_token segment names what
     * changed ("assets/12", "transactions/7", "savings/3", "debts/1"; the goal
     * route lives under /savings). A transaction also moves its linked account
     * balance (S11-TX-1), so it refreshes assets too. Unknown segments are a
     * no-op — better a missed refresh than a wrong one.
     */
    private notifyDataChanged(undoToken: string): void {
        const segment = undoToken.split('/')[0];
        switch (segment) {
            case 'assets':
                this.assetsState.notifyAssetsUpdated();
                break;
            case 'transactions':
                this.assetsState.notifyTransactionsUpdated();
                this.assetsState.notifyAssetsUpdated(); // the account balance moved
                break;
            case 'savings':
                this.assetsState.notifySavingsUpdated();
                break;
            case 'debts':
                this.assetsState.notifyDebtsUpdated();
                break;
        }
    }

    // ─── State helpers (immutable updates for OnPush) ────────────────────────

    private append(m: ChatMessageVM): void {
        this.messages.set([...this.messages(), m]);
    }

    private patchTail(fn: (m: ChatMessageVM) => ChatMessageVM): void {
        const msgs = this.messages();
        const last = msgs[msgs.length - 1];
        if (!last || last.role !== 'assistant') return;
        this.messages.set([...msgs.slice(0, -1), fn(last)]);
    }

    /** Immutable update of a specific message by id (used by feedback). */
    private patchMessage(id: string, fn: (m: ChatMessageVM) => ChatMessageVM): void {
        const msgs = this.messages();
        const idx = msgs.findIndex((m) => m.id === id);
        if (idx === -1) return;
        const next = [...msgs];
        next[idx] = fn(msgs[idx]);
        this.messages.set(next);
    }

    private pushBlock(block: AssistantBlock): void {
        this.patchTail((m) => ({ ...m, blocks: [...(m.blocks ?? []), block] }));
    }

    private updateCard(cardId: string, fn: (c: ToolCardVM) => ToolCardVM): void {
        const msgs = this.messages();
        for (let i = msgs.length - 1; i >= 0; i--) {
            const m = msgs[i];
            if (m.role !== 'assistant' || !m.blocks) continue;
            const idx = m.blocks.findIndex((b) => b.kind === 'card' && b.card.cardId === cardId);
            if (idx === -1) continue;
            const blocks = [...m.blocks];
            const block = blocks[idx] as { kind: 'card'; card: ToolCardVM };
            blocks[idx] = { kind: 'card', card: fn(block.card) };
            const next = [...msgs];
            next[i] = { ...m, blocks };
            this.messages.set(next);
            return;
        }
    }

    private findCard(cardId: string): ToolCardVM | null {
        for (const m of this.messages()) {
            for (const b of m.blocks ?? []) {
                if (b.kind === 'card' && b.card.cardId === cardId) return b.card;
            }
        }
        return null;
    }

    // ─── Persistence ─────────────────────────────────────────────────────────

    /** localStorage key for the CURRENT user's thread, or null when no user is
     *  identified (then the thread is memory-only and never touches a shared key). */
    private storageKey(): string | null {
        const id = this.tokens.user()?.id;
        return id != null ? `${CHAT_THREAD_KEY_PREFIX}:${id}` : null;
    }

    private persist(): void {
        const key = this.storageKey();
        if (!key) return; // unidentified: keep in memory only, never write a shared key
        try {
            const slim = this.messages().slice(-MAX_PERSISTED);
            localStorage.setItem(key, JSON.stringify(slim));
        } catch { /* quota/SSR: thread stays in memory */ }
    }

    /**
     * Drop every persisted thread that is NOT the current user's, including the
     * legacy un-scoped key from before per-user scoping. Runs on chat open so a
     * reused browser purges (and never renders) another user's conversation even
     * if they closed the tab without logging out.
     */
    private purgeForeignThreads(): void {
        if (typeof localStorage === 'undefined') return;
        try {
            const keep = this.storageKey();
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (!k) continue;
                if ((k === CHAT_THREAD_KEY_PREFIX || k.startsWith(CHAT_THREAD_KEY_PREFIX + ':')) && k !== keep) {
                    localStorage.removeItem(k);
                }
            }
        } catch { /* storage unavailable */ }
    }

    private restore(): ChatMessageVM[] {
        this.purgeForeignThreads();
        const key = this.storageKey();
        if (!key) return [];
        try {
            const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
            if (!raw) return [];
            const parsed = JSON.parse(raw) as ChatMessageVM[];
            if (!Array.isArray(parsed)) return [];
            // A confirm card frozen mid-pause cannot resume across a reload
            // (the mock turn is gone): mark it cancelled for honesty.
            return parsed.map((m) => ({
                ...m,
                blocks: m.blocks?.map((b) =>
                    b.kind === 'card' && (b.card.state === 'confirm' || b.card.state === 'running' || b.card.state === 'undoing')
                        ? { kind: 'card' as const, card: { ...b.card, state: 'cancelled' as const } }
                        : b),
            }));
        } catch {
            return [];
        }
    }
}
