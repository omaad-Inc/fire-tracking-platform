/**
 * S12 chat stream contract (ARCH §4.1).
 *
 * These types ARE the SSE event protocol of POST /api/v1/agents/chat.
 * The MockChatDriver (Phase 1) and the SseChatDriver (Phase 3) both emit
 * exactly these events; the UI renders from them and from nothing else,
 * which is what makes the mock and the real transport interchangeable.
 *
 * Amounts inside `summary`, `text`, `diff` arrive PRE-FORMATTED by the
 * server (formatDisplayNumber). The UI never re-formats a number.
 */

export type ChatAgent = 'config' | 'assistant' | 'onboarding';

export type NoticeKind = 'disclaimer_cima' | 'quota_warning' | 'quota_reached' | 'turn_timeout';

export type ToolResultStatus = 'ok' | 'error' | 'cancelled';

/** One line of a dry-run diff shown before a destructive/bulk write. */
export interface ChatDiffLine {
    /** create | update | delete: drives the icon + tint of the row. */
    op: 'create' | 'update' | 'delete';
    /** Main label, e.g. "Salaire · 850 000 FCFA · Revenus". */
    label: string;
    /** Optional second line, e.g. the account or date. */
    detail?: string;
}

export type ChatStreamEvent =
    | { type: 'routed'; agent: ChatAgent }
    | { type: 'text_delta'; text: string }
    | { type: 'tool_use'; tool: string; args_preview: string; card_id: string }
    | { type: 'tool_result'; card_id: string; status: ToolResultStatus; summary: string; undo_token?: string }
    | { type: 'confirm_required'; card_id: string; diff: ChatDiffLine[] }
    | { type: 'notice'; kind: NoticeKind; message?: string }
    | { type: 'message_stop'; usage_summary?: string }
    | { type: 'error'; code: string; message: string };

// ─── View models built by ChatSessionService from the events ────────────────

export type ToolCardState = 'running' | 'done' | 'confirm' | 'error' | 'undoing' | 'undone' | 'cancelled';

export interface ToolCardVM {
    cardId: string;
    tool: string;
    argsPreview: string;
    state: ToolCardState;
    summary?: string;
    undoToken?: string;
    diff?: ChatDiffLine[];
}

export interface NoticeVM {
    kind: NoticeKind;
    message?: string;
}

/** Ordered content of one assistant turn: text, cards and notices interleave. */
export type AssistantBlock =
    | { kind: 'text'; text: string }
    | { kind: 'card'; card: ToolCardVM }
    | { kind: 'notice'; notice: NoticeVM }
    | { kind: 'error'; code: string; message: string };

/** 👍/👎 on an assistant message (task 2.9). Matches the backend enums. */
export type FeedbackRating = 'up' | 'down';
export type FeedbackReason = 'wrong_number' | 'wrong_tone' | 'off_topic' | 'other';

export interface ChatMessageVM {
    id: string;
    role: 'user' | 'assistant';
    /** epoch ms; drives day separators. */
    ts: number;
    /** user messages: single text; assistant: ordered blocks. */
    text?: string;
    blocks?: AssistantBlock[];
    agent?: ChatAgent;
    /** 👍/👎 the user gave this message; persisted with the thread (task 2.9). */
    feedback?: FeedbackRating;
    /** Reason picked on a 👎 (optional refinement). */
    feedbackReason?: FeedbackReason;
}
