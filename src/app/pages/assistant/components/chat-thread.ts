import {
    ChangeDetectionStrategy, Component, ElementRef, ViewChild,
    computed, effect, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../i18n/i18n.service';
import { ChatSessionService } from '../../../core/ai/chat-session.service';
import { ChatMessageVM } from '../../../core/ai/chat-events';
import { MarkdownLitePipe } from './markdown-lite.pipe';
import { ToolCallCardComponent } from './tool-call-card';
import { NoticeStripComponent } from './notice-strip';
import { ChatErrorBlockComponent } from './chat-error-block';

interface ThreadItem {
    kind: 'sep' | 'msg';
    label?: string;
    msg?: ChatMessageVM;
}

/**
 * The single continuous thread (plan step 3): scroll container with day
 * separators, auto-scroll-to-bottom while the reader is at the bottom, and a
 * "new message" pill when new content arrives while scrolled up.
 */
@Component({
    selector: 'app-chat-thread',
    standalone: true,
    imports: [CommonModule, MarkdownLitePipe, ToolCallCardComponent, NoticeStripComponent, ChatErrorBlockComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div #scroller class="h-full overflow-y-auto overscroll-contain px-1" (scroll)="onScroll()">
            <div class="max-w-2xl mx-auto flex flex-col gap-3 py-4">
                @for (item of items(); track trackItem($index, item)) {
                    @if (item.kind === 'sep') {
                        <div class="flex items-center gap-3 my-2 select-none">
                            <span class="flex-1 h-px bg-surface-200 dark:bg-surface-800"></span>
                            <span class="text-[11px] font-semibold uppercase tracking-wide text-surface-400 dark:text-surface-500">
                                {{ item.label }}
                            </span>
                            <span class="flex-1 h-px bg-surface-200 dark:bg-surface-800"></span>
                        </div>
                    } @else if (item.msg!.role === 'user') {
                        <div class="flex justify-end">
                            <div class="max-w-[85%] sm:max-w-md rounded-2xl rounded-br-md px-4 py-2.5
                                        bg-brand-700 text-white dark:bg-surface-700 dark:text-surface-50
                                        text-[15px] leading-snug whitespace-pre-wrap break-words">{{ item.msg!.text }}</div>
                        </div>
                    } @else {
                        <div class="flex flex-col gap-2 items-start">
                            @for (block of item.msg!.blocks; track $index) {
                                @switch (block.kind) {
                                    @case ('text') {
                                        <div class="chat-md max-w-[95%] sm:max-w-xl text-[15px] leading-relaxed
                                                    text-surface-800 dark:text-surface-100"
                                             [innerHTML]="block.text | markdownLite"></div>
                                    }
                                    @case ('card') {
                                        <app-tool-call-card
                                            [card]="block.card"
                                            (confirm)="svc.confirm($event.cardId, $event.approved)"
                                            (undo)="svc.undo($event)" />
                                    }
                                    @case ('notice') {
                                        <app-notice-strip [notice]="block.notice" />
                                    }
                                    @case ('error') {
                                        <app-chat-error-block
                                            [code]="block.code"
                                            [message]="block.message"
                                            (retry)="svc.retryLast()" />
                                    }
                                }
                            }
                            <!-- Typing indicator: turn open, nothing rendered yet -->
                            @if (isTypingTail(item.msg!)) {
                                <div class="flex items-center gap-2 px-1 py-1" aria-live="polite">
                                    <span class="typing-dot"></span>
                                    <span class="typing-dot" style="animation-delay: 150ms"></span>
                                    <span class="typing-dot" style="animation-delay: 300ms"></span>
                                    <span class="text-xs text-surface-400 dark:text-surface-500">{{ thinkingLabel(item.msg!) }}</span>
                                </div>
                            }
                        </div>
                    }
                }
            </div>
        </div>

        <!-- New-message pill: shown when content arrives while scrolled up -->
        @if (showPill()) {
            <button type="button"
                    class="omaad-press absolute left-1/2 -translate-x-1/2 bottom-3 z-10
                           flex items-center gap-1.5 px-3.5 py-2 rounded-full shadow-lg text-xs font-semibold
                           bg-brand-700 text-white dark:bg-surface-700 dark:text-surface-50
                           hover:bg-brand-800 dark:hover:bg-surface-600 transition-colors"
                    (click)="jumpToBottom()">
                <i class="pi pi-arrow-down" style="font-size: 10px" aria-hidden="true"></i>
                {{ t('assistant.newMessages') }}
            </button>
        }
    `,
    styles: [`
        :host { display: block; position: relative; height: 100%; min-height: 0; }

        .typing-dot {
            width: 6px; height: 6px; border-radius: 9999px;
            background: var(--p-surface-400);
            animation: chat-typing 1s ease-in-out infinite;
        }
        @keyframes chat-typing {
            0%, 60%, 100% { transform: translateY(0); opacity: .45; }
            30% { transform: translateY(-3px); opacity: 1; }
        }

        /* markdown-lite typography inside assistant text */
        .chat-md p + p { margin-top: 0.6rem; }
        .chat-md ul { margin: 0.4rem 0; padding-left: 1.1rem; list-style: disc; }
        .chat-md li { margin: 0.15rem 0; }
        .chat-md strong { font-weight: 600; }
    `],
})
export class ChatThreadComponent {
    private i18n = inject(I18nService);
    svc = inject(ChatSessionService);
    t = (k: string) => this.i18n.t(k);

    @ViewChild('scroller') scroller?: ElementRef<HTMLDivElement>;

    private atBottom = signal(true);
    readonly showPill = signal(false);

    readonly items = computed<ThreadItem[]>(() => {
        const lang = this.i18n.lang();
        const out: ThreadItem[] = [];
        let lastDay = '';
        for (const msg of this.svc.messages()) {
            const day = new Date(msg.ts).toDateString();
            if (day !== lastDay) {
                lastDay = day;
                out.push({ kind: 'sep', label: this.dayLabel(msg.ts, lang) });
            }
            out.push({ kind: 'msg', msg });
        }
        return out;
    });

    constructor() {
        // Follow the stream while the reader is at the bottom; otherwise arm the pill.
        effect(() => {
            this.svc.messages(); // dependency: any content change
            queueMicrotask(() => {
                if (this.atBottom()) this.scrollToBottom('auto');
                else this.showPill.set(true);
            });
        });
    }

    trackItem(index: number, item: ThreadItem): string {
        return item.kind === 'msg' ? item.msg!.id : `sep-${index}`;
    }

    isTypingTail(msg: ChatMessageVM): boolean {
        const msgs = this.svc.messages();
        return this.svc.streaming()
            && msgs[msgs.length - 1] === msg
            && (msg.blocks?.length ?? 0) === 0;
    }

    thinkingLabel(msg: ChatMessageVM): string {
        const key = `assistant.agentThinking.${msg.agent}`;
        const label = this.t(key);
        return label === key ? this.t('assistant.thinking') : label;
    }

    onScroll(): void {
        const el = this.scroller?.nativeElement;
        if (!el) return;
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
        this.atBottom.set(nearBottom);
        if (nearBottom) this.showPill.set(false);
    }

    jumpToBottom(): void {
        this.showPill.set(false);
        this.atBottom.set(true);
        this.scrollToBottom('smooth');
    }

    scrollToBottom(behavior: ScrollBehavior): void {
        const el = this.scroller?.nativeElement;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior });
    }

    private dayLabel(ts: number, lang: 'fr' | 'en'): string {
        const date = new Date(ts);
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 3600_000);
        if (date.toDateString() === today.toDateString()) return this.t('assistant.today');
        if (date.toDateString() === yesterday.toDateString()) return this.t('assistant.yesterday');
        return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
            weekday: 'short', day: 'numeric', month: 'long',
        }).format(date);
    }
}
