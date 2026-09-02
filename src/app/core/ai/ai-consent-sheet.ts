import {
    ChangeDetectionStrategy, Component, EventEmitter, Output, inject, model, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { I18nService } from '../../i18n/i18n.service';
import { AiConsentService } from './ai-consent.service';

/**
 * The consent sheet, and the two quiet surfaces that stand in for the composer
 * once consent is missing. Kept in one file next to [AiConsentService] so the
 * whole gate (the state, the question, and what the room looks like while the
 * answer is no) reads in one place, the way its mobile counterpart does
 * (`lib/features/assistant/ai_consent.dart`).
 */

/**
 * Asks for consent. Persisting is the sheet's own job: a consent we failed to
 * store is not a consent, so a failed write keeps the sheet up with a retryable
 * line rather than closing on an answer the server never recorded.
 */
@Component({
    selector: 'app-ai-consent-sheet',
    standalone: true,
    imports: [CommonModule, DialogModule, ButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog [(visible)]="open" [modal]="true" [draggable]="false" [resizable]="false"
                  [dismissableMask]="true" [style]="{ width: '95vw', maxWidth: '480px' }"
                  [transitionOptions]="'320ms cubic-bezier(0.34, 1.30, 0.64, 1)'"
                  styleClass="!rounded-2xl overflow-hidden" [showHeader]="false"
                  [attr.aria-label]="t('assistant.consent.title')">

            <div class="flex flex-col">

                <!-- Header: the ask, in one sentence -->
                <div class="px-6 pt-7 pb-5 text-center">
                    <span class="w-14 h-14 rounded-2xl inline-flex items-center justify-center mb-4
                                 bg-ochre-100 dark:bg-ochre-900/30">
                        <i class="pi pi-sparkles text-2xl text-ochre-600 dark:text-ochre-300" aria-hidden="true"></i>
                    </span>
                    <h2 class="text-xl font-bold text-surface-900 dark:text-surface-0 m-0 leading-snug">
                        {{ t('assistant.consent.title') }}
                    </h2>
                    <p class="text-sm text-surface-500 dark:text-surface-400 mt-2 leading-relaxed">
                        {{ t('assistant.consent.intro') }}
                    </p>
                </div>

                <!-- The disclosure. Three plain lines carry the whole notice: a
                     wall of legal prose is not consent, it is something people
                     tap past. -->
                <div class="px-6 pb-1 flex flex-col gap-4 max-h-[52vh] overflow-y-auto">
                    @for (p of points; track p.key) {
                        <div class="flex items-start gap-3.5">
                            <i class="pi {{ p.icon }} text-surface-400 dark:text-surface-500 mt-0.5 shrink-0"
                               style="font-size: 15px" aria-hidden="true"></i>
                            <div class="min-w-0">
                                <p class="text-sm font-bold text-surface-900 dark:text-surface-0 m-0">
                                    {{ t('assistant.consent.' + p.key + '.title') }}
                                </p>
                                <p class="text-[13px] text-surface-500 dark:text-surface-400 mt-0.5 leading-relaxed m-0">
                                    {{ t('assistant.consent.' + p.key + '.body') }}
                                </p>
                            </div>
                        </div>
                    }
                    <p class="text-[11px] text-surface-400 dark:text-surface-500 text-center leading-relaxed pt-1 m-0">
                        {{ t('assistant.consent.revocable') }}
                    </p>
                </div>

                <!-- Answer -->
                <div class="px-6 pt-4 pb-6">
                    @if (failed()) {
                        <p class="text-[13px] text-negative dark:text-negative-400 text-center mb-3 flex items-center justify-center gap-1.5">
                            <i class="pi pi-exclamation-circle" style="font-size: 12px" aria-hidden="true"></i>
                            {{ t('assistant.consent.saveFailed') }}
                        </p>
                    }
                    <button pButton (click)="answer(true)" [disabled]="busy()"
                            [label]="t('assistant.consent.accept')"
                            [icon]="busy() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"
                            class="omaad-press w-full !rounded-full !py-3.5 !font-bold !bg-ochre-500
                                   !bg-gradient-to-r !from-ochre-400 !to-ochre-500 !border-0 !text-warm-900
                                   hover:!from-ochre-500 hover:!to-ochre-600 shadow-lifted transition-all
                                   disabled:!opacity-70"></button>
                    <button type="button" (click)="answer(false)" [disabled]="busy()"
                            class="w-full mt-1 py-3 rounded-full text-sm font-semibold
                                   text-surface-500 dark:text-surface-400
                                   hover:bg-surface-100 dark:hover:bg-surface-800
                                   transition-colors disabled:opacity-60">
                        {{ t('assistant.consent.decline') }}
                    </button>
                </div>
            </div>
        </p-dialog>
    `,
})
export class AiConsentSheet {
    private i18n = inject(I18nService);
    private consent = inject(AiConsentService);

    /** Two-way visibility, so a parent opens the sheet by setting it true. */
    open = model<boolean>(false);

    /** Emitted once an answer has actually been STORED. Surfaces that read the
     *  consent state need nothing from this (the state is the single source of
     *  truth); Settings uses it to confirm the change with a toast. */
    @Output() answered = new EventEmitter<boolean>();

    readonly busy = signal(false);
    readonly failed = signal(false);

    readonly points = [
        { key: 'reads', icon: 'pi-eye' },
        { key: 'destination', icon: 'pi-cloud' },
        { key: 'neverSent', icon: 'pi-user-minus' },
    ] as const;

    t = (k: string) => this.i18n.t(k);

    answer(granted: boolean): void {
        if (this.busy()) return;
        this.busy.set(true);
        this.failed.set(false);
        this.consent.setConsent(granted).subscribe({
            next: () => {
                this.busy.set(false);
                this.open.set(false);
                this.answered.emit(granted);
            },
            error: () => {
                // Stay on the sheet and let them answer again rather than
                // opening the assistant on a write that never landed.
                this.busy.set(false);
                this.failed.set(true);
            },
        });
    }
}

/**
 * What the assistant shows instead of its empty state once consent is missing
 * and there is no history to read. Deliberately not a dead end and not a nag:
 * the room stays open, the way back in is one click, and the wording says what
 * is off rather than scolding.
 */
@Component({
    selector: 'app-ai-consent-panel',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="h-full flex flex-col items-center justify-center px-6 text-center omaad-enter">
            <span class="w-14 h-14 rounded-2xl flex items-center justify-center mb-4
                         bg-surface-100 dark:bg-surface-800">
                <i class="pi pi-sparkles text-2xl text-surface-400 dark:text-surface-500" aria-hidden="true"></i>
            </span>
            <h1 class="text-lg font-bold text-surface-900 dark:text-surface-0 mb-1">
                {{ t('assistant.consent.dormantTitle') }}
            </h1>
            <p class="text-sm text-surface-500 dark:text-surface-400 mb-6 max-w-xs leading-relaxed">
                {{ t('assistant.consent.dormantBody') }}
            </p>
            <button type="button" (click)="enable.emit()"
                    class="omaad-press inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold
                           bg-ochre-500 hover:bg-ochre-400 text-warm-900 shadow-lifted transition-colors">
                <i class="pi pi-sparkles" style="font-size: 12px" aria-hidden="true"></i>
                {{ t('assistant.consent.enable') }}
            </button>
        </div>
    `,
})
export class AiConsentPanel {
    private i18n = inject(I18nService);
    @Output() enable = new EventEmitter<void>();
    t = (k: string) => this.i18n.t(k);
}

/**
 * The composer's stand-in when consent is missing but the thread HAS history.
 *
 * The mobile screen replaces the whole room in this state; the web can do
 * better and honour the contract more closely ("the screen opens, the history
 * is readable, and nothing is sent"): past answers stay scrollable above, and
 * only the box that would send something is swapped out.
 */
@Component({
    selector: 'app-ai-consent-bar',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="flex items-center gap-3 px-4 py-3 rounded-2xl border
                    border-ochre-200 dark:border-ochre-700/50
                    bg-ochre-50 dark:bg-ochre-900/20">
            <i class="pi pi-sparkles text-ochre-600 dark:text-ochre-300 shrink-0"
               style="font-size: 14px" aria-hidden="true"></i>
            <p class="flex-1 min-w-0 text-[13px] leading-snug text-surface-600 dark:text-surface-300 m-0">
                {{ t('assistant.consent.barBody') }}
            </p>
            <button type="button" (click)="enable.emit()"
                    class="omaad-press shrink-0 px-3.5 py-2 rounded-full text-xs font-bold
                           bg-ochre-500 hover:bg-ochre-400 text-warm-900 transition-colors">
                {{ t('assistant.consent.enableShort') }}
            </button>
        </div>
    `,
})
export class AiConsentBar {
    private i18n = inject(I18nService);
    @Output() enable = new EventEmitter<void>();
    t = (k: string) => this.i18n.t(k);
}
