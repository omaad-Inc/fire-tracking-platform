import { InjectionToken } from '@angular/core';
import { ChatStreamEvent } from './chat-events';

/**
 * The transport seam of S12 Phase 1 (ARCH §4.1).
 *
 * Two implementations:
 *  - MockChatDriver (Phase 1): replays scripted event sequences, no network.
 *  - SseChatDriver  (Phase 3): POST /api/v1/agents/chat + EventSource.
 *
 * ChatSessionService talks ONLY to this interface; swapping mock -> real is a
 * provider change, the components never see the difference.
 */

export interface ChatTurnHandle {
    /** Stop the stream (user pressed Stop / navigated away). Idempotent. */
    cancel(): void;
}

export interface ChatStreamDriver {
    /**
     * Send a user message and stream the reply.
     * Events flow through onEvent in order; onClose fires exactly once when
     * the stream ends (after message_stop, after error, or after cancel).
     *
     * `context` is the optional per-turn screen context (guard 11: the backend
     * wraps it as data-not-instructions). The onboarding concierge passes
     * { onboarding: true, first_name } here so the router keeps first-run turns
     * on the onboarding agent (S12 Phase 6); the assistant page passes nothing.
     */
    startTurn(
        message: string,
        onEvent: (e: ChatStreamEvent) => void,
        onClose: () => void,
        context?: Record<string, unknown>,
    ): ChatTurnHandle;

    /**
     * Resolve a confirm_required pause (ARCH: "confirmation is a pause, not a
     * second conversation"). The original stream resumes through the SAME
     * onEvent callbacks registered by startTurn.
     * Real driver: POST /agents/chat/confirm {card_id, approved}.
     */
    confirm(cardId: string, approved: boolean): void;

    /**
     * Undo a write (ARCH: "undo is a REST call, not a chat message"; must work
     * even if Anthropic is down). Real driver: calls the restore endpoint.
     * Resolves when the restore succeeded, rejects on failure.
     */
    undo(undoToken: string): Promise<void>;
}

export const CHAT_STREAM_DRIVER = new InjectionToken<ChatStreamDriver>('CHAT_STREAM_DRIVER');
