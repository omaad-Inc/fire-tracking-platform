import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';

/** One AI write in flight (AI kanban PERF-3): streamed as a tool_use by the
 *  chat, not yet confirmed by its tool_result. Data views render it as an
 *  optimistic pending row so the app reacts before the model turn finishes.
 *  `label` is the amount-free args_preview (guard 12: no raw numbers). */
export interface PendingAiWrite {
    cardId: string;
    kind: 'asset' | 'transaction' | 'goal' | 'debt';
    label: string;
}

/**
 * Shared state service for assets - allows components to react to asset changes
 */
@Injectable({ providedIn: 'root' })
export class AssetsStateService {
    // ── Optimistic AI writes (PERF-3) ──
    private readonly _pendingAiWrites = signal<PendingAiWrite[]>([]);
    /** AI writes streamed but not yet resolved; views render these as pending rows. */
    readonly pendingAiWrites = this._pendingAiWrites.asReadonly();
    /** Pending AI asset creates, for the patrimoine view. */
    readonly pendingAiAssets = computed(() =>
        this._pendingAiWrites().filter(w => w.kind === 'asset'));

    /** Register an in-flight AI write (idempotent per cardId). */
    addPendingAiWrite(write: PendingAiWrite): void {
        if (this._pendingAiWrites().some(w => w.cardId === write.cardId)) return;
        this._pendingAiWrites.set([...this._pendingAiWrites(), write]);
    }

    /** The write's tool_result landed (ok or error): drop the pending row.
     *  On success the caller fires the matching notify*Updated() right after,
     *  so the real row replaces the pending one without double-rendering. */
    resolvePendingAiWrite(cardId: string): void {
        const next = this._pendingAiWrites().filter(w => w.cardId !== cardId);
        if (next.length !== this._pendingAiWrites().length) {
            this._pendingAiWrites.set(next);
        }
    }

    /** Turn ended (close, stop, or stream error): no pending row may outlive
     *  its turn, whatever state the stream died in. */
    clearPendingAiWrites(): void {
        if (this._pendingAiWrites().length) this._pendingAiWrites.set([]);
    }
    // Signal to notify when assets have been updated
    private _assetsUpdated = new Subject<void>();
    public assetsUpdated$ = this._assetsUpdated.asObservable();
    
    // Signal to notify when debts have been updated
    private _debtsUpdated = new Subject<void>();
    public debtsUpdated$ = this._debtsUpdated.asObservable();
    
    // Signal to notify when savings have been updated
    private _savingsUpdated = new Subject<void>();
    public savingsUpdated$ = this._savingsUpdated.asObservable();
    
    // Signal to notify when transactions have been updated
    private _transactionsUpdated = new Subject<void>();
    public transactionsUpdated$ = this._transactionsUpdated.asObservable();

    /**
     * Notify all subscribers that assets have been updated
     */
    notifyAssetsUpdated(): void {
        this._assetsUpdated.next();
    }
    
    /**
     * Notify all subscribers that debts have been updated
     */
    notifyDebtsUpdated(): void {
        this._debtsUpdated.next();
    }
    
    /**
     * Notify all subscribers that savings have been updated
     */
    notifySavingsUpdated(): void {
        this._savingsUpdated.next();
    }
    
    /**
     * Notify all subscribers that transactions have been updated
     */
    notifyTransactionsUpdated(): void {
        this._transactionsUpdated.next();
    }
}

