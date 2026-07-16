// Omaad AI Assistant — slide-out panel (Monarch-style)
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiAssistantService } from '../../core/services/ai-assistant.service';
import { I18nService } from '../../i18n/i18n.service';

@Component({
    selector: 'app-ai-assistant-panel',
    standalone: true,
    imports: [CommonModule],
    template: `
        <!-- Full panel (open and not minimized) -->
        @if (svc.visible()) {
            <!-- Backdrop on mobile only -->
            <div
                class="fixed inset-0 z-[1000] bg-black/40 lg:hidden"
                (click)="svc.hide()"
            ></div>

            <aside
                class="ai-panel fixed z-[1001] bg-white dark:bg-brand-900 shadow-2xl flex flex-col overflow-hidden
                       inset-x-0 bottom-0 h-[85vh] rounded-t-2xl
                       lg:inset-auto lg:bottom-5 lg:right-5 lg:h-[80vh] lg:max-h-[820px] lg:rounded-2xl"
                [class.ai-panel-wide]="svc.expanded()"
                [class.ai-panel-narrow]="!svc.expanded()"
                role="dialog"
                aria-modal="true"
            >
                <!-- Header -->
                <header class="relative flex items-center gap-2 px-3 py-3 border-b border-surface-200 dark:border-surface-700">
                    <!-- Chat title + dropdown chevron -->
                    <button
                        type="button"
                        class="flex items-center gap-1.5 flex-1 min-w-0 px-2 py-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-left"
                        (click)="toggleDropdown()"
                    >
                        <span class="truncate font-semibold text-sm text-surface-900 dark:text-surface-50">
                            {{ headerTitle() }}
                        </span>
                        <span class="ai-coming-soon-badge shrink-0">
                            {{ i18n.t('aiAssistant.comingSoon') }}
                        </span>
                        <i
                            class="pi pi-chevron-down text-xs text-surface-500 transition-transform"
                            [class.rotate-180]="dropdownOpen()"
                        ></i>
                    </button>

                    <!-- Action icons -->
                    <div class="flex items-center gap-0.5 shrink-0">
                        <button
                            type="button"
                            class="ai-icon-btn inline-flex"
                            (click)="onNewChat()"
                            [attr.aria-label]="i18n.t('aiAssistant.newChat')"
                            [title]="i18n.t('aiAssistant.newChat')"
                        >
                            <i class="pi pi-pencil"></i>
                        </button>
                        <button
                            type="button"
                            class="ai-icon-btn inline-flex"
                            [attr.aria-label]="i18n.t('aiAssistant.settings')"
                            [title]="i18n.t('aiAssistant.settings')"
                        >
                            <i class="pi pi-cog"></i>
                        </button>
                        <button
                            type="button"
                            class="ai-icon-btn hidden lg:inline-flex"
                            (click)="svc.toggleExpand()"
                            [attr.aria-label]="svc.expanded() ? i18n.t('aiAssistant.collapse') : i18n.t('aiAssistant.expand')"
                            [title]="svc.expanded() ? i18n.t('aiAssistant.collapse') : i18n.t('aiAssistant.expand')"
                        >
                            <i [class]="svc.expanded() ? 'pi pi-window-minimize' : 'pi pi-window-maximize'"></i>
                        </button>
                        <button
                            type="button"
                            class="ai-icon-btn inline-flex"
                            (click)="svc.minimize()"
                            [attr.aria-label]="i18n.t('aiAssistant.minimize')"
                            [title]="i18n.t('aiAssistant.minimize')"
                        >
                            <i class="pi pi-minus"></i>
                        </button>
                        <button
                            type="button"
                            class="ai-icon-btn inline-flex"
                            (click)="svc.hide()"
                            [attr.aria-label]="i18n.t('common.close')"
                            [title]="i18n.t('common.close')"
                        >
                            <i class="pi pi-times"></i>
                        </button>
                    </div>

                    <!-- Chats dropdown -->
                    @if (dropdownOpen()) {
                        <div
                            class="absolute top-full left-3 right-3 mt-1 z-20 bg-white dark:bg-brand-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-xl overflow-hidden"
                        >
                            <button
                                type="button"
                                class="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors text-left"
                                style="color: #C77B3C;"
                                (click)="onNewChat()"
                            >
                                <i class="pi pi-plus"></i>
                                <span>{{ i18n.t('aiAssistant.newChat') }}</span>
                            </button>

                            @if (svc.chats().length > 0) {
                                <div class="border-t border-surface-200 dark:border-surface-700 max-h-64 overflow-y-auto">
                                    @for (chat of svc.chats(); track chat.id) {
                                        <div
                                            class="flex items-center px-3 py-2 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors group"
                                            [class.bg-surface-50]="chat.id === svc.currentChatId()"
                                            [class.dark:bg-surface-700]="chat.id === svc.currentChatId()"
                                        >
                                            <button
                                                type="button"
                                                class="flex-1 min-w-0 text-left text-sm text-surface-700 dark:text-surface-200 truncate"
                                                (click)="onSelectChat(chat.id)"
                                            >
                                                {{ chat.title }}
                                            </button>
                                            <button
                                                type="button"
                                                class="ml-2 w-7 h-7 flex items-center justify-center rounded-md text-surface-400 hover:text-negative hover:bg-surface-100 dark:hover:bg-surface-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                (click)="svc.deleteChat(chat.id)"
                                                [attr.aria-label]="i18n.t('aiAssistant.deleteChat')"
                                                [title]="i18n.t('aiAssistant.deleteChat')"
                                            >
                                                <i class="pi pi-trash text-xs"></i>
                                            </button>
                                        </div>
                                    }
                                </div>
                            } @else {
                                <div class="px-3 py-4 text-xs text-surface-500 text-center border-t border-surface-200 dark:border-surface-700">
                                    {{ i18n.t('aiAssistant.noChats') }}
                                </div>
                            }
                        </div>
                    }
                </header>

                <!-- Body -->
                <div class="flex-1 overflow-y-auto px-5 py-6 space-y-5">
                    <!-- Coming-soon notice — clearly visible preview banner -->
                    <div class="ai-coming-soon-notice flex items-start gap-2.5 rounded-xl px-3.5 py-3">
                        <i class="pi pi-info-circle mt-0.5 shrink-0"></i>
                        <div class="text-sm leading-snug">
                            <strong class="block font-semibold">
                                {{ i18n.t('aiAssistant.comingSoonTitle') }}
                            </strong>
                            <span class="block opacity-90">
                                {{ i18n.t('aiAssistant.comingSoonBody') }}
                            </span>
                        </div>
                    </div>

                    <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-50">
                        {{ i18n.t('aiAssistant.subtitle') }}
                    </h2>

                    <div class="space-y-3">
                        @for (s of suggestions(); track s) {
                            <button
                                type="button"
                                disabled
                                class="w-full text-left px-4 py-3 rounded-2xl border border-surface-200 dark:border-surface-700 text-sm text-surface-500 dark:text-surface-400 bg-surface-50/50 dark:bg-surface-800/30 cursor-not-allowed opacity-70"
                            >
                                {{ s }}
                            </button>
                        }
                    </div>
                </div>

                <!-- Footer -->
                <footer class="border-t border-surface-200 dark:border-surface-700 px-5 py-4 space-y-2">
                    <div class="flex items-center gap-2 px-4 py-2.5 rounded-full border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 opacity-70">
                        <input
                            type="text"
                            disabled
                            class="flex-1 bg-transparent outline-none text-sm text-surface-900 dark:text-surface-50 placeholder:text-surface-400 cursor-not-allowed"
                            [placeholder]="i18n.t('aiAssistant.placeholderDisabled')"
                        />
                        <button
                            type="button"
                            disabled
                            class="w-8 h-8 flex items-center justify-center rounded-full text-surface-400 cursor-not-allowed"
                            aria-label="Send"
                        >
                            <i class="pi pi-arrow-up text-sm"></i>
                        </button>
                    </div>
                    <p class="text-[11px] leading-snug text-surface-500 text-center px-2">
                        {{ i18n.t('aiAssistant.disclaimer') }}
                    </p>
                </footer>
            </aside>
        }

        <!-- Minimized pill (open but minimized) -->
        @if (svc.open() && svc.minimized()) {
            <button
                type="button"
                class="ai-minimized-pill fixed z-[998] flex items-center gap-2 px-4 py-2.5 rounded-full shadow-xl bg-brand-900 dark:bg-brand-800 text-white border border-brand-700"
                (click)="svc.restoreFromMinimized()"
                [attr.aria-label]="i18n.t('aiAssistant.restore')"
            >
                <i class="pi pi-sparkles text-sm" style="color: #C77B3C;"></i>
                <span class="text-sm font-medium truncate max-w-[160px]">{{ headerTitle() }}</span>
                <i class="pi pi-chevron-up text-xs opacity-70"></i>
            </button>
        }
    `,
    styles: [`
        :host { display: contents; }

        /* Header badge — small ochre pill next to the chat title */
        .ai-coming-soon-badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            border-radius: 999px;
            background: rgba(199, 123, 60, 0.14);
            color: #C77B3C;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            white-space: nowrap;
            line-height: 1.4;
        }
        :host-context(.app-dark) .ai-coming-soon-badge {
            background: rgba(199, 123, 60, 0.20);
            color: #D4945A;
        }

        /* Body notice banner — clearly visible "preview only" callout */
        .ai-coming-soon-notice {
            background: rgba(199, 123, 60, 0.08);
            border: 1px solid rgba(199, 123, 60, 0.25);
            color: #8a4f1f;
        }
        .ai-coming-soon-notice i {
            color: #C77B3C;
            font-size: 1rem;
        }
        :host-context(.app-dark) .ai-coming-soon-notice {
            background: rgba(199, 123, 60, 0.12);
            border-color: rgba(199, 123, 60, 0.35);
            color: #E5C9A8;
        }

        .ai-panel {
            animation: aiPanelInMobile 0.25s ease-out;
        }

        .ai-panel-narrow { /* desktop default width */ }
        @media (min-width: 992px) {
            .ai-panel { animation: aiPanelInDesktop 0.25s ease-out; }
            .ai-panel-narrow { width: 420px; }
            .ai-panel-wide   { width: min(720px, 60vw); }
        }

        @keyframes aiPanelInMobile {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
        }

        @keyframes aiPanelInDesktop {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
        }

        .ai-icon-btn {
            width: 32px;
            height: 32px;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            color: rgb(100 116 139);  /* surface-500 */
            transition: background 0.15s, color 0.15s;
            cursor: pointer;
        }

        .ai-icon-btn:hover {
            background: rgb(241 245 249);  /* surface-100 */
            color: rgb(30 41 59);          /* surface-800 */
        }

        :host-context(.app-dark) .ai-icon-btn { color: rgb(148 163 184); }
        :host-context(.app-dark) .ai-icon-btn:hover {
            background: rgb(30 41 59);
            color: rgb(241 245 249);
        }

        .ai-icon-btn i { font-size: 0.875rem; }

        .ai-coming-soon-badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.02em;
            line-height: 1.4;
            background: rgba(199, 123, 60, 0.12);
            color: #C77B3C;
            border: 1px solid rgba(199, 123, 60, 0.3);
            white-space: nowrap;
        }

        :host-context(.app-dark) .ai-coming-soon-badge {
            background: rgba(199, 123, 60, 0.18);
            color: #E2A06B;
            border-color: rgba(199, 123, 60, 0.45);
        }

        .rotate-180 { transform: rotate(180deg); }

        /* Minimized pill: bottom-left on mobile (avoids the bottom-right FAB),
           bottom-right on desktop where there is no FAB. */
        .ai-minimized-pill {
            bottom: calc(70px + 12px + env(safe-area-inset-bottom, 0px));
            left: 16px;
            animation: aiPillIn 0.2s ease-out;
        }
        @media (min-width: 992px) {
            .ai-minimized-pill {
                bottom: 20px;
                left: auto;
                right: 20px;
            }
        }

        @keyframes aiPillIn {
            from { transform: translateY(20px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
        }
    `]
})
export class AppAiAssistantPanel {
    svc  = inject(AiAssistantService);
    i18n = inject(I18nService);

    readonly dropdownOpen = signal(false);

    readonly headerTitle = computed(() => {
        const chat = this.svc.currentChat();
        return chat ? chat.title : this.i18n.t('aiAssistant.title');
    });

    readonly suggestions = computed(() => {
        this.i18n.lang(); // recompute on language switch
        return [
            this.i18n.t('aiAssistant.suggestion1'),
            this.i18n.t('aiAssistant.suggestion2'),
            this.i18n.t('aiAssistant.suggestion3'),
        ];
    });

    toggleDropdown(): void {
        this.dropdownOpen.set(!this.dropdownOpen());
    }

    onNewChat(): void {
        this.svc.newChat();
        this.dropdownOpen.set(false);
    }

    onSelectChat(id: string): void {
        this.svc.selectChat(id);
        this.dropdownOpen.set(false);
    }
}

