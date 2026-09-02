import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { I18nService } from '../../i18n/i18n.service';
import { FeedbackService } from './feedback.service';

/**
 * Renders the three feedback voices (P1-5). Mounted ONCE, in `app.layout.ts`,
 * so no page needs its own provider or markup for them.
 *
 * Sheet grammar follows the house idiom (plan-checkout-sheet.ts): p-dialog
 * with `[showHeader]="false"`, `!rounded-2xl`, the
 * `320ms cubic-bezier(0.34, 1.30, 0.64, 1)` spring, and `omaad-press` on the
 * CTAs. The confirm sheet is a real dialog because it is a decision and must
 * take focus; the success sheet is a non-modal floating card because it is an
 * announcement and must NOT block the screen it is confirming.
 */
@Component({
    selector: 'app-feedback-host',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, DialogModule],
    host: {
        // Escape must dismiss the confirm, and dismissing is DECLINING.
        // Handled here rather than left to PrimeNG: `[closable]="false"` hides
        // the X (this sheet has its own Annuler) but also switches off the
        // component's own escape handling, so a modal decision surface was
        // left with no keyboard way out.
        '(document:keydown.escape)': 'onEscape()',
    },
    template: `
        <!-- ── 1. Confirm: the ONE decision surface ───────────────────── -->
        <p-dialog [visible]="fb.confirmOpen()"
                  (visibleChange)="onVisibleChange($event)"
                  [modal]="true" [draggable]="false" [resizable]="false"
                  [dismissableMask]="true" [closable]="false"
                  [style]="{ width: '92vw', maxWidth: '420px' }"
                  [transitionOptions]="'320ms cubic-bezier(0.34, 1.30, 0.64, 1)'"
                  styleClass="!rounded-2xl overflow-hidden" [showHeader]="false">
            @if (fb.confirmState(); as c) {
                <div class="flex flex-col items-stretch px-6 pt-7 pb-4 text-center"
                     data-testid="confirm-sheet">
                    <!-- Semantic medallion: red for destructive, ochre for an opt-in. -->
                    <span class="self-center w-14 h-14 rounded-full grid place-items-center mb-4"
                          [class]="labels().destructive
                              ? 'bg-negative/10 text-negative'
                              : 'bg-ochre-500/15 text-ochre-600 dark:text-ochre-400'">
                        <i class="pi {{ labels().icon }} text-xl" aria-hidden="true"></i>
                    </span>

                    <h2 class="text-lg font-bold text-surface-900 dark:text-surface-0 m-0"
                        data-testid="confirm-title">{{ c.title }}</h2>
                    @if (c.message) {
                        <p class="text-sm text-surface-500 dark:text-surface-400 mt-1.5 mb-0 leading-relaxed">
                            {{ c.message }}
                        </p>
                    }

                    <!-- Full-width pill, then a quiet way out. -->
                    <button type="button"
                            (click)="fb.settleConfirm(true)"
                            data-testid="confirm-accept"
                            class="omaad-press mt-6 w-full rounded-xl py-3 font-bold transition-colors"
                            [class]="labels().destructive
                                ? 'bg-negative hover:bg-negative-700 text-white'
                                : 'bg-ochre-500 hover:bg-ochre-400 text-warm-900'">
                        {{ labels().confirm }}
                    </button>
                    <button type="button"
                            (click)="fb.settleConfirm(false)"
                            data-testid="confirm-cancel"
                            class="omaad-press mt-1.5 w-full rounded-xl py-3 text-sm font-semibold
                                   text-surface-500 dark:text-surface-400
                                   hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                        {{ labels().cancel }}
                    </button>
                </div>
            }
        </p-dialog>

        <!-- ── 2. Success: rises over the unchanged screen, then leaves ── -->
        @if (fb.successState(); as s) {
            <!-- Non-modal and pointer-transparent except the card itself: a
                 confirmation must never trap the user or block the thing it
                 is confirming. -->
            <div class="fixed inset-x-0 bottom-0 z-[1200] flex justify-center px-3 pb-4 pointer-events-none"
                 role="status" aria-live="polite" data-testid="success-sheet">
                <div class="pointer-events-auto w-full max-w-md rounded-2xl shadow-xl
                            bg-surface-0 dark:bg-surface-800
                            border border-surface-200 dark:border-surface-700
                            px-5 py-4 flex items-center gap-3.5 omaad-success-in"
                     (click)="fb.dismissSuccess()">
                    <span class="w-10 h-10 rounded-full grid place-items-center shrink-0
                                 bg-positive/15 text-positive">
                        <i class="pi {{ s.icon }} text-base" aria-hidden="true"></i>
                    </span>
                    <span class="flex-1 text-sm font-semibold text-surface-900 dark:text-surface-0 leading-snug">
                        {{ s.message }}
                    </span>
                </div>
            </div>
        }

        <!-- ── 3. Failure: a snackbar, unmistakably not success ────────── -->
        @if (fb.errorState(); as e) {
            <div class="fixed inset-x-0 top-0 z-[1300] flex justify-center px-3 pt-3 pointer-events-none"
                 role="alert" aria-live="assertive" data-testid="error-snack">
                <div class="pointer-events-auto w-full max-w-md rounded-xl shadow-lg
                            bg-negative-50 dark:bg-negative-900/60
                            border border-negative/40
                            px-4 py-3 flex items-start gap-3 omaad-error-in">
                    <i class="pi pi-exclamation-circle text-negative shrink-0 mt-0.5" aria-hidden="true"></i>
                    <span class="flex-1 text-sm text-negative-700 dark:text-negative-100 leading-snug">
                        {{ e.message }}
                    </span>
                    <button type="button" (click)="fb.dismissError()"
                            [attr.aria-label]="t('common.close')"
                            data-testid="error-dismiss"
                            class="shrink-0 -mr-1 -mt-0.5 w-7 h-7 grid place-items-center rounded-lg
                                   hover:bg-negative/10 transition-colors">
                        <i class="pi pi-times text-negative text-xs" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
        }
    `,
    styles: [`
        .omaad-success-in { animation: omaadSuccessIn 320ms cubic-bezier(0.34, 1.30, 0.64, 1) both; }
        @keyframes omaadSuccessIn {
            from { opacity: 0; transform: translateY(14px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        .omaad-error-in { animation: omaadErrorIn 200ms cubic-bezier(0, 0, 0.2, 1) both; }
        @keyframes omaadErrorIn {
            from { opacity: 0; transform: translateY(-10px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        /* Reduced motion: appear, do not travel. */
        @media (prefers-reduced-motion: reduce) {
            .omaad-success-in, .omaad-error-in { animation: none; }
        }
    `],
})
export class FeedbackHostComponent {
    fb = inject(FeedbackService);
    private i18n = inject(I18nService);

    labels = this.fb.confirmLabels;

    t(key: string): string {
        return this.i18n.t(key);
    }

    /** Dismissing the mask counts as declining, never as accepting. */
    onVisibleChange(open: boolean): void {
        if (!open) this.fb.settleConfirm(false);
    }

    /** No-op unless a confirm is actually open, so Escape stays available to
     *  whatever else on the page wants it. */
    onEscape(): void {
        if (this.fb.confirmOpen()) this.fb.settleConfirm(false);
    }
}
