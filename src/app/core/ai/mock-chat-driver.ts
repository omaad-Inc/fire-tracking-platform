import { Injectable, inject, signal } from '@angular/core';
import { I18nService } from '../../i18n/i18n.service';
import { ChatStreamEvent } from './chat-events';
import { ChatStreamDriver, ChatTurnHandle } from './chat-stream-driver';
import { MOCK_SCENARIO_IDS, MockScenarioId, MockScript, MockStep, buildScript } from './mock-scenarios';

/**
 * Phase 1 transport: replays scripted event sequences on a timer, exactly as
 * the real SSE stream will deliver them (ARCH §4.1). Supports cancel (Stop
 * button), the confirm pause/resume, and a fake undo.
 *
 * The active scenario is a signal so the dev switch can pin the next reply;
 * 'auto' picks a scenario from the message content (demo free-typing).
 */
@Injectable({ providedIn: 'root' })
export class MockChatDriver implements ChatStreamDriver {
    private i18n = inject(I18nService);

    /** Scenario used for the NEXT turn. Exposed for the dev switch. */
    readonly scenario = signal<MockScenarioId>('auto');
    readonly scenarios = MOCK_SCENARIO_IDS;

    private timer: ReturnType<typeof setTimeout> | null = null;
    private active: {
        script: MockScript;
        onEvent: (e: ChatStreamEvent) => void;
        onClose: () => void;
        awaitingConfirm: boolean;
        closed: boolean;
    } | null = null;

    startTurn(message: string, onEvent: (e: ChatStreamEvent) => void, onClose: () => void): ChatTurnHandle {
        this.teardown(); // one turn at a time; a new turn supersedes a stale one
        const script = buildScript(this.scenario(), message, this.i18n.lang());
        this.active = { script, onEvent, onClose, awaitingConfirm: false, closed: false };
        this.play(script.steps);
        return { cancel: () => this.finish() };
    }

    confirm(cardId: string, approved: boolean): void {
        const a = this.active;
        if (!a || !a.awaitingConfirm) return;
        a.awaitingConfirm = false;
        const continuation = approved ? a.script.onApprove : a.script.onCancel;
        this.play(continuation ?? []);
    }

    undo(_undoToken: string): Promise<void> {
        // Real driver: REST call to the restore endpoint (works without the LLM).
        return new Promise((resolve) => setTimeout(resolve, 600));
    }

    // ─── Internals ───────────────────────────────────────────────────────────

    /** Emit steps sequentially; pause on confirm_required, close after last. */
    private play(steps: MockStep[]): void {
        const a = this.active;
        if (!a) return;
        const queue = [...steps];
        const next = () => {
            if (!this.active || this.active !== a || a.closed) return;
            const step = queue.shift();
            if (!step) {
                // End of script: close unless we stopped on a confirm pause.
                if (!a.awaitingConfirm) this.finish();
                return;
            }
            this.timer = setTimeout(() => {
                a.onEvent(step.event);
                if (step.event.type === 'confirm_required') {
                    a.awaitingConfirm = true;
                    return; // parked: resume via confirm()
                }
                next();
            }, step.delay);
        };
        next();
    }

    private finish(): void {
        const a = this.active;
        const wasClosed = a?.closed ?? true;
        this.teardown();
        if (a && !wasClosed) {
            a.onClose();
        }
    }

    private teardown(): void {
        if (this.timer) { clearTimeout(this.timer); this.timer = null; }
        if (this.active) { this.active.closed = true; }
        this.active = null;
    }
}
