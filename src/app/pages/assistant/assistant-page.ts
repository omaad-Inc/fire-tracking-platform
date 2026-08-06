import {
    ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewChild,
    computed, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
import { I18nService } from '../../i18n/i18n.service';
import { ChatSessionService } from '../../core/ai/chat-session.service';
import { CHAT_STREAM_DRIVER } from '../../core/ai/chat-stream-driver';
import { MockChatDriver } from '../../core/ai/mock-chat-driver';
import { SseChatDriver } from '../../core/ai/sse-chat-driver';
import { ApiService } from '../../core/services/api.service';
import { FeatureFlagsService } from '../../core/services/feature-flags.service';
import { MOCK_SCENARIO_IDS, MockScenarioId } from '../../core/ai/mock-scenarios';
import { ChatThreadComponent } from './components/chat-thread';
import { ChatInputBarComponent } from './components/chat-input-bar';
import { ChatEmptyStateComponent } from './components/chat-empty-state';
import { DashboardService } from '../service/dashboard.service';

/**
 * /assistant: the ONE conversational surface (ARCH §2). S12 Phase 1 renders it
 * against the MockChatDriver; Phase 3 swaps the provider below for the real
 * SSE transport and nothing else changes.
 *
 * Layout: owns the space between the topbar and (on mobile) the bottom nav.
 * The thread scrolls internally; the composer never moves (no layout shift).
 * The mobile keyboard is handled through visualViewport so the composer rides
 * above the keyboard instead of being covered by it.
 */
@Component({
    selector: 'app-assistant-page',
    standalone: true,
    imports: [CommonModule, ChatThreadComponent, ChatInputBarComponent, ChatEmptyStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        ChatSessionService,
        // S12 Phase 3 swap (the Phase 1 contract bet cashed in HERE, and only
        // here): the real SSE transport when aiChat is on, the mock otherwise
        // (dev-switch scenario demos). ChatSessionService and every component
        // stay byte-identical.
        {
            provide: CHAT_STREAM_DRIVER,
            useFactory: () => {
                const flags = inject(FeatureFlagsService);
                return flags.aiChat() ? inject(SseChatDriver) : inject(MockChatDriver);
            },
        },
    ],
    template: `
        <div class="chat-shell" [style.height.px]="kbShellHeight() || null">

            <!-- Dev scenario switch (plan step 9): hidden in prod builds unless
                 the devtools override is set on the device. -->
            @if (devtools()) {
                <div class="absolute top-1 right-1 z-20 flex items-center gap-1 rounded-full px-2 py-1
                            bg-surface-100/90 dark:bg-surface-800/90 backdrop-blur border border-surface-200 dark:border-surface-700">
                    <i class="pi pi-wrench text-[10px] text-surface-400" aria-hidden="true"></i>
                    <select class="bg-transparent text-[11px] text-surface-600 dark:text-surface-300 outline-none max-w-28"
                            [value]="mock.scenario()"
                            (change)="setScenario($event)"
                            aria-label="Mock scenario">
                        @for (id of scenarioIds; track id) {
                            <option [value]="id">{{ id }}</option>
                        }
                    </select>
                    <button type="button" class="dev-btn" (click)="seed()" title="Seed history">
                        <i class="pi pi-history text-[11px]" aria-hidden="true"></i>
                    </button>
                    <button type="button" class="dev-btn" (click)="svc.clear()" title="Clear thread">
                        <i class="pi pi-trash text-[11px]" aria-hidden="true"></i>
                    </button>
                </div>
            }

            <!-- New conversation: start fresh (clears the visible thread AND the
                 agent's server-side memory). Shown only when there's something to
                 clear; nudged left when the dev chip is present. -->
            @if (svc.messages().length > 0) {
                <button type="button" class="new-conv-btn" (click)="newConversation()"
                        [disabled]="svc.streaming()" [style.right.px]="devtools() ? 132 : 8"
                        [title]="t('assistant.newConversation.action')"
                        [attr.aria-label]="t('assistant.newConversation.action')">
                    <i class="pi pi-pen-to-square text-[13px]" aria-hidden="true"></i>
                </button>
            }

            <!-- Undo toast: the reset is delayed to this window, so undo restores
                 the thread with the agent's memory intact. -->
            @if (showUndo()) {
                <div class="new-conv-undo">
                    <span>{{ t('assistant.newConversation.done') }}</span>
                    <button type="button" (click)="undoNewConversation()">{{ t('assistant.newConversation.undo') }}</button>
                </div>
            }

            <!-- Thread / empty state (top padding clears the dev chip row) -->
            <div class="flex-1 min-h-0 relative" [class.pt-8]="devtools()">
                @if (svc.messages().length === 0) {
                    <app-chat-empty-state [populated]="populated()"
                        [hideSuggestions]="composerHasText()" (pick)="onStarter($event)" />
                } @else {
                    <app-chat-thread />
                }
            </div>

            <!-- Composer: pinned under the thread, never moves -->
            <div class="shrink-0 max-w-2xl mx-auto w-full px-1 pb-1">
                <app-chat-input-bar
                    [streaming]="svc.streaming()"
                    [confirmPending]="svc.pendingConfirm() !== null"
                    (send)="svc.send($event)"
                    (typing)="composerHasText.set($event)"
                    (stop)="svc.stop()" />
                <p class="text-center text-[11px] text-surface-400 dark:text-surface-500 mt-1.5 px-4 select-none">
                    {{ t('assistant.inputHint') }}
                </p>
            </div>
        </div>
    `,
    styles: [`
        :host { display: block; }

        /* Own the space between topbar and viewport bottom (desktop) or bottom
           nav (mobile). Numbers mirror the shell: topbar container padding-top
           4.5rem (+ safe area), layout-main padding-bottom 2rem, mobile bottom
           nav 70px and the container's 150px mobile clearance (cancelled via
           the negative margin so the document never scrolls). */
        .chat-shell {
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            height: calc(100dvh - 4.5rem - env(safe-area-inset-top, 0px) - 2rem);
        }
        @media (max-width: 991px) {
            .chat-shell {
                height: calc(100dvh - 4.5rem - env(safe-area-inset-top, 0px) - 70px - env(safe-area-inset-bottom, 0px));
                margin-bottom: calc(-80px - 2rem);
            }
        }

        .dev-btn {
            width: 1.4rem; height: 1.4rem; border-radius: 9999px;
            display: inline-flex; align-items: center; justify-content: center;
            color: var(--p-surface-500);
        }
        .dev-btn:hover { background: var(--p-surface-200); }

        .new-conv-btn {
            position: absolute; top: 0.35rem; z-index: 20;
            width: 1.9rem; height: 1.9rem; border-radius: 9999px;
            display: inline-flex; align-items: center; justify-content: center;
            background: var(--p-surface-0); color: var(--p-surface-500);
            border: 1px solid var(--p-surface-200); cursor: pointer;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .new-conv-btn:hover:not(:disabled) { background: var(--p-surface-100); color: var(--p-surface-700); }
        .new-conv-btn:disabled { opacity: 0.4; cursor: default; }

        .new-conv-undo {
            position: absolute; bottom: 5.5rem; left: 50%; transform: translateX(-50%);
            z-index: 30; display: flex; align-items: center; gap: 0.75rem;
            background: #1A2740; color: #fff; padding: 0.45rem 0.5rem 0.45rem 1rem;
            border-radius: 9999px; font-size: 0.82rem; box-shadow: 0 6px 20px rgba(0,0,0,0.25);
            animation: undoIn 0.2s ease-out;
        }
        .new-conv-undo button {
            background: rgba(228,169,107,0.16); color: #E4A96B; border: 0; cursor: pointer;
            padding: 0.3rem 0.75rem; border-radius: 9999px; font-weight: 600; font-size: 0.8rem;
        }
        .new-conv-undo button:hover { background: rgba(228,169,107,0.28); }
        @keyframes undoIn { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
    `],
})
export class AssistantPage implements OnInit, OnDestroy {
    private i18n = inject(I18nService);
    private route = inject(ActivatedRoute);
    private dashboard = inject(DashboardService);
    private api = inject(ApiService);
    private flags = inject(FeatureFlagsService);
    svc = inject(ChatSessionService);
    mock = inject(MockChatDriver);
    t = (k: string) => this.i18n.t(k);

    /** Portfolio already has data -> the empty state leads with advice (both
     * agents share this panel). Reads the dashboard summary (hydrated from the
     * device snapshot for a returning user, and force-loaded in ngOnInit for a
     * cold one); a brand-new user with no data falls back to the recording-led
     * variant. DashboardSummary is snake_case (net_worth / total_assets). */
    readonly populated = computed(() => {
        const s = this.dashboard.summaryData();
        return !!s && ((s.net_worth ?? 0) > 0 || (s.total_assets ?? 0) > 0);
    });

    readonly scenarioIds = MOCK_SCENARIO_IDS;

    /** True while the composer holds a draft -> the empty state drops its
     *  starter chips so a tall mobile draft never covers them. */
    readonly composerHasText = signal(false);

    /** Undo affordance for "New conversation" (the server reset is delayed to
     *  this window, so undo restores the thread with the agent's memory intact). */
    readonly showUndo = signal(false);
    private undoTimer: ReturnType<typeof setTimeout> | null = null;

    newConversation(): void {
        if (this.svc.streaming()) return;
        this.svc.newConversation();
        this.showUndo.set(true);
        if (this.undoTimer) clearTimeout(this.undoTimer);
        this.undoTimer = setTimeout(() => this.showUndo.set(false), 6000);
    }

    undoNewConversation(): void {
        this.svc.undoNewConversation();
        this.showUndo.set(false);
        if (this.undoTimer) { clearTimeout(this.undoTimer); this.undoTimer = null; }
    }

    @ViewChild(ChatThreadComponent) thread?: ChatThreadComponent;
    @ViewChild(ChatInputBarComponent) input?: ChatInputBarComponent;

    /** Shell height override while the mobile keyboard is open (px), else 0. */
    readonly kbShellHeight = signal(0);

    readonly devtools = computed(() => {
        if (!environment.production) return true;
        try { return localStorage.getItem('omaad_ff_devtools') === '1'; } catch { return false; }
    });

    private vvHandler = () => this.onViewportChange();

    ngOnInit(): void {
        // Ensure the dashboard summary is loaded so `populated` is accurate even
        // when the user lands on /assistant without visiting the dashboard first
        // (dedups + cached; a returning user is already hydrated from the device
        // snapshot). Fire-and-forget: an empty/failed summary just keeps the
        // recording-led variant.
        void this.dashboard.loadDashboard();
        // PERF-4: warm the prompt cache for this user's landing agent so the
        // first real message reads a warm prefix instead of paying the cold
        // start. Real transport only (the mock driver makes no model calls);
        // fire-and-forget: a failed warm just means the first turn is slower.
        if (this.flags.aiChat()) {
            this.api.warmChat().subscribe({ error: () => { /* best-effort */ } });
        }
        // Deep-linkable scenario for device demos: /assistant?scenario=bulk_confirm
        const wanted = this.route.snapshot.queryParamMap.get('scenario') as MockScenarioId | null;
        if (wanted && MOCK_SCENARIO_IDS.includes(wanted)) {
            this.mock.scenario.set(wanted);
        }
        if (typeof window !== 'undefined' && window.visualViewport) {
            window.visualViewport.addEventListener('resize', this.vvHandler);
            window.visualViewport.addEventListener('scroll', this.vvHandler);
        }
    }

    ngOnDestroy(): void {
        this.svc.stop();
        if (this.undoTimer) clearTimeout(this.undoTimer);
        if (typeof window !== 'undefined' && window.visualViewport) {
            window.visualViewport.removeEventListener('resize', this.vvHandler);
            window.visualViewport.removeEventListener('scroll', this.vvHandler);
        }
    }

    onStarter(prompt: string): void {
        this.svc.send(prompt);
    }

    setScenario(event: Event): void {
        this.mock.scenario.set((event.target as HTMLSelectElement).value as MockScenarioId);
    }

    seed(): void {
        this.svc.seedHistory(this.i18n.lang());
    }

    /**
     * Mobile keyboard (plan step 3, keyboard-safe): when the visual viewport
     * shrinks by more than a keyboard-ish amount, size the shell to what is
     * actually visible so the composer sits right above the keyboard. The
     * bottom nav is behind the keyboard at that point, so it drops out of the
     * equation. Restore the CSS-driven height when the keyboard closes.
     */
    private onViewportChange(): void {
        const vv = typeof window !== 'undefined' ? window.visualViewport : null;
        if (!vv) return;
        const overlap = window.innerHeight - vv.height;
        const keyboardOpen = overlap > 120;
        if (keyboardOpen) {
            const topbarBottom = document.querySelector('.layout-topbar')?.getBoundingClientRect().bottom ?? 72;
            this.kbShellHeight.set(Math.max(240, Math.round(vv.height - topbarBottom)));
            window.scrollTo(0, 0);
            queueMicrotask(() => this.thread?.scrollToBottom('auto'));
        } else if (this.kbShellHeight() !== 0) {
            this.kbShellHeight.set(0);
        }
    }
}
