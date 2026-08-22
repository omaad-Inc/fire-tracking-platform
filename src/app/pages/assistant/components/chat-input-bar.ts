import {
    ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output,
    ViewChild, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../../i18n/i18n.service';

/**
 * Native-feeling composer (plan step 6): autosizing textarea (1-4 lines),
 * Enter-to-send on desktop / explicit button on mobile, Stop while streaming,
 * locked (with an explanatory placeholder) while a confirm card is pending.
 */
@Component({
    selector: 'app-chat-input-bar',
    standalone: true,
    imports: [CommonModule, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="flex items-end gap-2 rounded-2xl border px-3 py-2 transition-colors
                    bg-surface-0 dark:bg-surface-900
                    border-surface-300 dark:border-surface-600
                    focus-within:border-brand-400 dark:focus-within:border-ochre-500">
            <textarea #box
                rows="1"
                class="flex-1 resize-none bg-transparent outline-none border-0 text-[15px] leading-snug py-1.5
                       text-surface-900 dark:text-surface-50
                       placeholder:text-surface-400 dark:placeholder:text-surface-500
                       disabled:opacity-60"
                [placeholder]="placeholder()"
                [disabled]="confirmPending"
                [(ngModel)]="draft"
                (ngModelChange)="autosize()"
                (focus)="composerFocus.emit()"
                (keydown.enter)="onEnter($event)"
                [attr.aria-label]="t('assistant.inputAria')"
                autocomplete="off"
                autocapitalize="sentences"
                enterkeyhint="send"></textarea>

            @if (streaming) {
                <button type="button"
                        class="omaad-press shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                               bg-surface-200 dark:bg-surface-700
                               text-surface-700 dark:text-surface-100
                               hover:bg-surface-300 dark:hover:bg-surface-600 transition-colors"
                        (click)="stop.emit()"
                        [attr.aria-label]="t('assistant.stop')"
                        [title]="t('assistant.stop')">
                    <i class="pi pi-stop-circle text-lg" aria-hidden="true"></i>
                </button>
            } @else {
                <button type="button"
                        class="omaad-press shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                               bg-brand-700 hover:bg-brand-800 text-white
                               dark:bg-ochre-400 dark:hover:bg-ochre-300 dark:text-warm-900
                               transition-colors disabled:opacity-40 disabled:pointer-events-none"
                        [disabled]="!canSend()"
                        (click)="submit()"
                        [attr.aria-label]="t('assistant.send')"
                        [title]="t('assistant.send')">
                    <i class="pi pi-arrow-up text-base" aria-hidden="true"></i>
                </button>
            }
        </div>
    `,
})
export class ChatInputBarComponent {
    private i18n = inject(I18nService);
    t = (k: string) => this.i18n.t(k);

    @Input() streaming = false;
    @Input() confirmPending = false;
    @Output() send = new EventEmitter<string>();
    @Output() stop = new EventEmitter<void>();
    /** True while the composer holds text -> lets the empty state hide its
     *  starter chips (on mobile a tall draft would otherwise cover them). */
    @Output() typing = new EventEmitter<boolean>();
    /** Fires when the user focuses the composer — the earliest reliable sign a
     *  message is coming, and the moment the page uses to warm the prompt cache
     *  (cost audit 2026-08-22). Focus is intentional on mobile: it opens the
     *  keyboard. Emitted on every focus; the page warms once per visit and the
     *  server refuses a warm while the prefix is hot. */
    @Output() composerFocus = new EventEmitter<void>();

    @ViewChild('box') box?: ElementRef<HTMLTextAreaElement>;

    draft = '';
    /** Re-render hook for the button disabled state (ngModel keeps `draft` fresh). */
    private tick = signal(0);

    placeholder(): string {
        return this.confirmPending
            ? this.t('assistant.inputConfirmPending')
            : this.t('assistant.inputPlaceholder');
    }

    canSend(): boolean {
        this.tick();
        return this.draft.trim().length > 0 && !this.confirmPending;
    }

    /** Cap the textarea at ~4 lines; scroll inside beyond that (no layout jump). */
    autosize(): void {
        this.tick.update((n) => n + 1);
        this.typing.emit(this.draft.trim().length > 0);
        const el = this.box?.nativeElement;
        if (!el) return;
        el.style.height = 'auto';
        const lineHeight = 22; // 15px text * snug leading, measured
        const max = lineHeight * 4 + 12;
        el.style.height = Math.min(el.scrollHeight, max) + 'px';
        el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
    }

    /** Desktop: Enter sends, Shift+Enter breaks. Mobile keeps Enter = newline. */
    onEnter(event: Event): void {
        const e = event as KeyboardEvent;
        const desktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 992px)').matches;
        if (!desktop || e.shiftKey) return; // let the newline happen
        e.preventDefault();
        this.submit();
    }

    /** Called by the page after a starter-prompt tap to refocus the composer. */
    focus(): void {
        this.box?.nativeElement.focus();
    }

    /** AI-75: seed the composer with a suggested question from an "Ask AI" entry
     *  point, then focus so the user can review, edit, and send. */
    prefill(text: string): void {
        this.draft = text;
        this.tick.update((n) => n + 1);
        this.typing.emit(text.trim().length > 0);
        queueMicrotask(() => {
            const el = this.box?.nativeElement;
            if (el) { el.value = text; el.focus(); }
            this.autosize();
        });
    }

    submit(): void {
        const text = this.draft.trim();
        if (!text || this.confirmPending) return;
        this.send.emit(text);
        this.draft = '';
        this.tick.update((n) => n + 1);
        // Clear the DOM value NOW: ngModel writes '' only on the next change
        // detection, and autosize measured against the stale text keeps the
        // composer tall (visible layout shift on mobile).
        const el = this.box?.nativeElement;
        if (el) el.value = '';
        this.autosize();
    }
}
