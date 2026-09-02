import { Injectable, computed, inject, signal } from '@angular/core';
import { I18nService } from '../../i18n/i18n.service';

/**
 * The three-voice feedback contract (P1-5), ported from Flutter
 * (`omaad-mobile-app/lib/core/ui/{confirm_sheet,success_sheet,error_snack}.dart`).
 *
 * The rule the mobile app already follows and the web did not:
 *
 *   confirm BEFORE a destructive action  -> ONE sheet
 *   success AFTER any mutation           -> ONE sheet, rises and leaves
 *   failure                              -> a snackbar, never the sheet
 *
 * so success and failure can never look alike. On the web they did: both went
 * through `MessageService.add()` and rendered as the same `p-toast` card,
 * differing only in colour. A user who glances at a toast could not tell
 * "saved" from "could not save" without reading it.
 *
 * Confirms had drifted too. All eleven call sites were destructive (ten
 * deletes plus a subscription cancel), and the destructive button was styled
 * three different ways
 * (`!bg-negative !border-negative`, `p-button-danger`, `!bg-red-600 ...`).
 * One surface owns that now.
 *
 * State lives here and ONE host component renders it (see
 * `feedback-host.component.ts`, mounted in `app.layout.ts`), which also
 * removes the need for a per-page `MessageService` provider + `<p-toast>` pair.
 */

export interface ConfirmOptions {
    /** The question, in plain words. */
    title: string;
    /** Optional second line: the consequence, not a restatement of the title. */
    message?: string;
    /** Defaults to `common.delete`, since every current caller is a delete. */
    confirmLabel?: string;
    /** Defaults to `common.cancel`. */
    cancelLabel?: string;
    /** PrimeIcons glyph without the `pi ` prefix. */
    icon?: string;
    /**
     * Destructive by default, which is what every current caller is. Pass
     * false for an opt-IN (enabling something): the medallion and the CTA go
     * ochre instead of red, because painting "Activer" in the delete colour
     * tells the user the opposite of the truth. One surface, two tones, never
     * a second sheet.
     */
    destructive?: boolean;
}

/** Internal: a pending confirm plus the resolver its buttons settle. */
interface PendingConfirm extends ConfirmOptions {
    resolve: (ok: boolean) => void;
}

export interface SuccessState {
    message: string;
    icon: string;
}

export interface ErrorState {
    message: string;
    /** Bumped per call so a repeat of the same message still re-triggers. */
    seq: number;
}

/** How long the success sheet stays: long enough to read, never long enough
 *  to trap (it is dismissible throughout). Mirrors the Flutter 3200ms. */
const SUCCESS_DWELL_MS = 3200;
const ERROR_DWELL_MS = 5000;

@Injectable({ providedIn: 'root' })
export class FeedbackService {
    private i18n = inject(I18nService);

    private _confirm = signal<PendingConfirm | null>(null);
    private _success = signal<SuccessState | null>(null);
    private _error = signal<ErrorState | null>(null);
    private errorSeq = 0;

    private successTimer: ReturnType<typeof setTimeout> | null = null;
    private errorTimer: ReturnType<typeof setTimeout> | null = null;

    /** Read by the host component only. */
    readonly confirmState = this._confirm.asReadonly();
    readonly successState = this._success.asReadonly();
    readonly errorState = this._error.asReadonly();
    readonly confirmOpen = computed(() => this._confirm() !== null);

    /**
     * Ask before doing something irreversible. Resolves true ONLY when the
     * action was explicitly chosen; dismissing by any other means is false.
     *
     * Await it instead of passing an `accept` callback, so the caller's flow
     * reads top-to-bottom:
     *
     *   if (!await this.feedback.confirm({ title: ... })) return;
     */
    confirm(opts: ConfirmOptions): Promise<boolean> {
        // A second confirm while one is open would silently strand the first
        // caller's promise, so settle it as "declined" first.
        this._confirm()?.resolve(false);
        return new Promise<boolean>(resolve => {
            this._confirm.set({ ...opts, resolve });
        });
    }

    /** Called by the host when a button is pressed or the sheet is dismissed. */
    settleConfirm(ok: boolean): void {
        const pending = this._confirm();
        if (!pending) return;
        this._confirm.set(null);
        pending.resolve(ok);
    }

    /** The mutation-success voice. Rises over the unchanged screen, then goes. */
    success(message: string, icon = 'pi-check'): void {
        if (this.successTimer) clearTimeout(this.successTimer);
        this._success.set({ message, icon });
        this.successTimer = setTimeout(() => this._success.set(null), SUCCESS_DWELL_MS);
    }

    dismissSuccess(): void {
        if (this.successTimer) clearTimeout(this.successTimer);
        this.successTimer = null;
        this._success.set(null);
    }

    /**
     * The failure voice. Deliberately NOT the success surface: a snackbar,
     * negative-tinted, with the error glyph. Longer dwell than success,
     * because a failure usually needs reading and often an action.
     */
    error(message: string): void {
        if (this.errorTimer) clearTimeout(this.errorTimer);
        this._error.set({ message, seq: ++this.errorSeq });
        this.errorTimer = setTimeout(() => this._error.set(null), ERROR_DWELL_MS);
    }

    dismissError(): void {
        if (this.errorTimer) clearTimeout(this.errorTimer);
        this.errorTimer = null;
        this._error.set(null);
    }

    /** Resolved labels for the host, so defaults live in one place. */
    confirmLabels = computed(() => {
        const c = this._confirm();
        return {
            confirm: c?.confirmLabel || this.i18n.t('common.delete'),
            cancel: c?.cancelLabel || this.i18n.t('common.cancel'),
            icon: c?.icon || 'pi-trash',
            destructive: c?.destructive !== false,
        };
    });
}
