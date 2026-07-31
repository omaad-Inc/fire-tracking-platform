import { Injectable } from '@angular/core';
import { ChatStreamEvent } from './chat-events';
import { ChatStreamDriver, ChatTurnHandle } from './chat-stream-driver';

/**
 * Phase 3 transport (STUB — do not wire before the backend exists).
 *
 * Will implement the real pipe against POST /api/v1/agents/chat:
 *  - fetch-based SSE reader (POST body, so EventSource alone is not enough),
 *  - confirm() -> POST /api/v1/agents/chat/confirm {card_id, approved},
 *  - undo()    -> the Phase 2 restore endpoints (no LLM involved).
 *
 * The Phase 1 contract bet: when this lands, ONLY the provider in
 * assistant-page changes. Components and ChatSessionService stay untouched.
 */
@Injectable({ providedIn: 'root' })
export class SseChatDriver implements ChatStreamDriver {
    startTurn(
        _message: string,
        _onEvent: (e: ChatStreamEvent) => void,
        _onClose: () => void,
    ): ChatTurnHandle {
        throw new Error('SseChatDriver lands in S12 Phase 3 (backend transport).');
    }

    confirm(_cardId: string, _approved: boolean): void {
        throw new Error('SseChatDriver lands in S12 Phase 3 (backend transport).');
    }

    undo(_undoToken: string): Promise<void> {
        return Promise.reject(new Error('SseChatDriver lands in S12 Phase 3 (backend transport).'));
    }
}
