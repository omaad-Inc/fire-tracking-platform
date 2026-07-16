import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { I18nService } from '../../i18n/i18n.service';

export interface AiChat {
    id: string;
    title: string;
    createdAt: number;
}

interface PersistedState {
    open: boolean;
    minimized: boolean;
    expanded: boolean;
    chats: AiChat[];
    currentChatId: string | null;
}

const STORAGE_KEY = 'omaad_ai_assistant';

@Injectable({ providedIn: 'root' })
export class AiAssistantService {
    private i18n = inject(I18nService);

    readonly open          = signal(false);
    readonly minimized     = signal(false);
    readonly expanded      = signal(false);
    readonly chats         = signal<AiChat[]>([]);
    readonly currentChatId = signal<string | null>(null);

    readonly currentChat = computed(() => {
        const id = this.currentChatId();
        return this.chats().find((c) => c.id === id) ?? null;
    });

    /** True when the panel should be fully rendered (not closed, not minimized). */
    readonly visible = computed(() => this.open() && !this.minimized());

    constructor() {
        this.restore();
        effect(() => {
            const state: PersistedState = {
                open: this.open(),
                minimized: this.minimized(),
                expanded: this.expanded(),
                chats: this.chats(),
                currentChatId: this.currentChatId(),
            };
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            } catch {}
        });
    }

    show(): void {
        this.open.set(true);
        this.minimized.set(false);
    }

    hide(): void {
        this.open.set(false);
        this.minimized.set(false);
    }

    toggle(): void {
        this.open() ? this.hide() : this.show();
    }

    minimize(): void {
        this.minimized.set(true);
    }

    restoreFromMinimized(): void {
        this.minimized.set(false);
        this.open.set(true);
    }

    toggleExpand(): void {
        this.expanded.update((v) => !v);
    }

    newChat(): AiChat {
        const chat: AiChat = {
            id: this.uuid(),
            title: this.i18n.t('aiAssistant.newChatTitle'),
            createdAt: Date.now(),
        };
        this.chats.update((arr) => [chat, ...arr]);
        this.currentChatId.set(chat.id);
        return chat;
    }

    deleteChat(id: string): void {
        this.chats.update((arr) => arr.filter((c) => c.id !== id));
        if (this.currentChatId() === id) {
            const remaining = this.chats();
            this.currentChatId.set(remaining[0]?.id ?? null);
        }
    }

    selectChat(id: string): void {
        this.currentChatId.set(id);
    }

    private restore(): void {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const s = JSON.parse(raw) as Partial<PersistedState>;
            this.open.set(!!s.open);
            this.minimized.set(!!s.minimized);
            this.expanded.set(!!s.expanded);
            this.chats.set(Array.isArray(s.chats) ? s.chats : []);
            this.currentChatId.set(s.currentChatId ?? null);
        } catch {}
    }

    private uuid(): string {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return 'c_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
}
