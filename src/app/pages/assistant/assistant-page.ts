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
import { MOCK_SCENARIO_IDS, MockScenarioId } from '../../core/ai/mock-scenarios';
import { ChatThreadComponent } from './components/chat-thread';
import { ChatInputBarComponent } from './components/chat-input-bar';
import { ChatEmptyStateComponent } from './components/chat-empty-state';

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
        { provide: CHAT_STREAM_DRIVER, useExisting: MockChatDriver },
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

            <!-- Thread / empty state (top padding clears the dev chip row) -->
            <div class="flex-1 min-h-0 relative" [class.pt-8]="devtools()">
                @if (svc.messages().length === 0) {
                    <app-chat-empty-state (pick)="onStarter($event)" />
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
    `],
})
export class AssistantPage implements OnInit, OnDestroy {
    private i18n = inject(I18nService);
    private route = inject(ActivatedRoute);
    svc = inject(ChatSessionService);
    mock = inject(MockChatDriver);
    t = (k: string) => this.i18n.t(k);

    readonly scenarioIds = MOCK_SCENARIO_IDS;

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
