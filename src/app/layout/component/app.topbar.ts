import { Component, OnDestroy, OnInit, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LayoutService } from '../service/layout.service';
import { I18nService } from '../../i18n/i18n.service';
import { filter } from 'rxjs/operators';
import { TokenService } from '../../core/services/token.service';
import { environment } from '../../../environments/environment';
import { PrivacyService } from '../../core/services/privacy.service';
import { AiAssistantService } from '../../core/services/ai-assistant.service';
import { ShareContextService } from '../../core/services/share-context.service';
import { FeatureFlagsService } from '../../core/services/feature-flags.service';
import { NavService } from '../../core/services/nav.service';
import { SharePortfolioDialog } from './share-portfolio-dialog';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, CommonModule, SharePortfolioDialog],
    template: ` <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            @if (!share.active()) {
                <!-- Mobile ONLY: User avatar (no sidebar on mobile, so avatar lives here) -->
                <a [routerLink]="['/'+lang, 'pages', 'settings']"
                   [attr.aria-label]="t('menu.settings')"
                   class="lg:hidden flex items-center justify-center shrink-0">
                    <div class="w-9 h-9 rounded-full bg-surface-800 dark:bg-surface-700 flex items-center justify-center overflow-hidden">
                        @if (avatarUrl) {
                            <img [src]="avatarUrl" alt="Profile" class="w-full h-full object-cover">
                        } @else {
                            <i class="pi pi-user text-surface-200"></i>
                        }
                    </div>
                </a>
            }
        </div>

        <div class="layout-topbar-actions">
            <!-- Desktop ONLY: dark mode toggle -->
            <div class="layout-config-menu hidden lg:flex">
                <button type="button" class="layout-topbar-action" (click)="toggleDarkMode()"
                        [attr.aria-label]="t('topbar.toggleTheme')" [title]="t('topbar.toggleTheme')">
                    <i aria-hidden="true" [ngClass]="{ 'pi ': true, 'pi-moon': layoutService.isDarkTheme(), 'pi-sun': !layoutService.isDarkTheme() }"></i>
                </button>
            </div>

            @if (!share.active()) {
                <!-- Eye icon (privacy toggle) -->
                <button type="button" class="layout-topbar-action" (click)="privacyService.toggle()"
                        [attr.aria-label]="privacyService.hidden() ? t('topbar.showAmounts') : t('topbar.hideAmounts')"
                        [title]="privacyService.hidden() ? t('topbar.showAmounts') : t('topbar.hideAmounts')">
                    <i aria-hidden="true" class="pi" [ngClass]="privacyService.hidden() ? 'pi-eye-slash' : 'pi-eye'"></i>
                </button>

                <!-- Share portfolio -->
                <button type="button" class="layout-topbar-action" (click)="shareOpen.set(true)"
                        [attr.aria-label]="t('shareDialog.title')" [title]="t('shareDialog.title')">
                    <i class="pi pi-share-alt"></i>
                </button>

                <!-- AI Assistant: routes to /assistant when the S12 flag is on,
                     otherwise opens the coming-soon panel (prod unchanged).
                     First-login discovery hint (pulse + coach-mark) draws a new
                     user to the icon, especially on mobile. -->
                <div class="relative flex">
                    <button type="button"
                            class="layout-topbar-action ai-topbar-btn"
                            [class.ai-hint-active]="assistantHint()"
                            (click)="openAssistant()"
                            [attr.aria-label]="t('aiAssistant.title')"
                            [title]="t('aiAssistant.title')">
                        <i class="pi pi-sparkles"></i>
                    </button>
                    @if (assistantHint()) {
                        <div class="absolute top-full right-0 mt-2 z-[60] w-max max-w-[15rem] cursor-pointer ai-hint-tip"
                             role="status" (click)="dismissAssistantHint()">
                            <span class="absolute -top-1 right-3 w-2.5 h-2.5 rotate-45 bg-ochre-500"></span>
                            <div class="relative rounded-xl bg-ochre-500 text-warm-900 text-[11px] font-semibold leading-snug px-3 py-2 shadow-lg">
                                {{ t('topbar.assistantHint') }}
                            </div>
                        </div>
                    }
                </div>

                <!-- UPGRADE PRO pill -->
                <a [routerLink]="['/'+lang, 'pages', 'plans']"
                   class="flex items-center gap-1 px-2.5 py-1.5 rounded-full
                          bg-ochre-500 hover:bg-ochre-400 text-warm-900 text-[10px] lg:text-xs font-bold
                          tracking-wider transition-all hover:shadow-lg">
                    <i class="pi pi-crown" style="font-size:9px"></i>
                    PRO
                </a>

                <!-- Add Assets Button - Desktop Only -->
                <button
                    type="button"
                    class="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-brand-700 hover:bg-brand-800 dark:bg-surface-700 dark:hover:bg-surface-600 text-white font-medium transition-all hover:shadow-lg"
                    (click)="navigateToAddAsset()"
                >
                    <i class="pi pi-plus"></i>
                    <span>{{ t('topbar.addAssets') }}</span>
                </button>
            } @else {
                <!-- Public share view: invite the visitor to join Omaad -->
                <a [routerLink]="['/']"
                   class="flex items-center gap-2 px-4 py-2 rounded-full bg-brand-700 hover:bg-brand-800 dark:bg-surface-700 dark:hover:bg-surface-600 text-white text-xs lg:text-sm font-semibold transition-all hover:shadow-lg">
                    <i class="pi pi-bolt"></i>
                    <span>{{ t('shareView.joinCtaButton') }}</span>
                </a>
            }
        </div>
    </div>
    @if (!share.active()) {
        <app-share-portfolio-dialog [open]="shareOpen()" (close)="shareOpen.set(false)" />
    }
    `,
    styles: [`
        /* First-login discovery pulse on the assistant sparkle (ochre #C77B3C). */
        .ai-hint-active {
            border-radius: 9999px;
            animation: aiHintPulse 1.8s ease-out infinite;
        }
        @keyframes aiHintPulse {
            0%   { box-shadow: 0 0 0 0 rgba(199, 123, 60, 0.55); }
            70%  { box-shadow: 0 0 0 10px rgba(199, 123, 60, 0); }
            100% { box-shadow: 0 0 0 0 rgba(199, 123, 60, 0); }
        }
        .ai-hint-tip { animation: aiHintTipIn 220ms ease-out both; }
        @keyframes aiHintTipIn {
            from { opacity: 0; transform: translateY(-4px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        /* Respect reduced motion: no pulsing/sliding, keep a static ochre ring
           so the icon is still highlighted for discovery. */
        @media (prefers-reduced-motion: reduce) {
            .ai-hint-active { animation: none; box-shadow: 0 0 0 2px rgba(199, 123, 60, 0.6); }
            .ai-hint-tip { animation: none; }
        }
    `]
})
export class AppTopbar implements OnInit, OnDestroy {
    private router = inject(Router);
    private i18n = inject(I18nService);
    private tokenService = inject(TokenService);
    privacyService  = inject(PrivacyService);
    aiAssistant     = inject(AiAssistantService);
    share           = inject(ShareContextService);
    private flags   = inject(FeatureFlagsService);
    private nav     = inject(NavService);

    layoutService = inject(LayoutService);

    /** S12: flag on -> the real chat surface; flag off -> the teaser panel. */
    openAssistant(): void {
        this.markAssistantSeen(); // opening it is discovery: the hint has done its job
        if (this.flags.aiChat()) this.nav.go('pages', 'assistant');
        else this.aiAssistant.show();
    }

    lang = 'fr';
    shareOpen = signal(false);
    user = this.tokenService.user;

    /** One-shot discovery hint on the assistant sparkle (pulse + coach-mark),
     *  shown once on first login until the user opens the assistant. Mobile users
     *  in particular can miss the icon; this points them at it. */
    assistantHint = signal(false);
    private hintTimer: ReturnType<typeof setTimeout> | null = null;
    private hintDecided = false;

    constructor() {
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            takeUntilDestroyed(),
        ).subscribe(() => {
            this.lang = this.getCurrentLang();
        });
        // On a fresh login the user id lands after /auth/me, i.e. AFTER ngOnInit;
        // react when it first appears so the hint fires on first login too, not
        // only on a reload (where the cached profile makes it available at init).
        effect(() => {
            if (this.user()?.id != null) this.maybeShowAssistantHint();
        });
    }

    ngOnInit() {
        this.lang = this.getCurrentLang();
        this.maybeShowAssistantHint();
    }

    ngOnDestroy() {
        if (this.hintTimer) clearTimeout(this.hintTimer);
    }

    private seenKey(): string | null {
        const id = this.user()?.id;
        return id != null ? `omaad_assistant_seen:${id}` : null;
    }

    /** Show the hint only when the real chat is live and this user hasn't met it
     *  yet. Auto-retires after a few seconds so it never becomes a nag. */
    private maybeShowAssistantHint(): void {
        if (this.hintDecided) return;
        const key = this.seenKey();
        if (!key) return; // user id not ready yet: retry when it lands (see effect)
        this.hintDecided = true; // decide once now that we can
        if (!this.flags.aiChat()) return;
        try { if (localStorage.getItem(key) === '1') return; } catch { return; }
        this.assistantHint.set(true);
        this.hintTimer = setTimeout(() => this.markAssistantSeen(), 8000);
    }

    /** Tap on the coach-mark dismisses it (and marks it seen). */
    dismissAssistantHint(): void {
        this.markAssistantSeen();
    }

    private markAssistantSeen(): void {
        if (!this.assistantHint()) return;
        this.assistantHint.set(false);
        if (this.hintTimer) { clearTimeout(this.hintTimer); this.hintTimer = null; }
        const key = this.seenKey();
        if (key) { try { localStorage.setItem(key, '1'); } catch { /* storage off: shown once this session */ } }
    }

    get avatarUrl(): string | null {
        const user = this.user();
        if (!user?.avatar_url) return null;
        if (user.avatar_url.startsWith('/uploads/')) {
            return environment.apiUrl.replace('/api/v1', '') + user.avatar_url;
        }
        return user.avatar_url;
    }

    private getCurrentLang(): string {
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        return match ? match[1] : 'fr';
    }

    toggleDarkMode() {
        this.layoutService.layoutConfig.update((state) => {
            const isCurrentlyDark = state.darkTheme ?? false;
            return {
                ...state,
                themeMode: isCurrentlyDark ? 'light' : 'dark',
                darkTheme: !isCurrentlyDark
            };
        });
    }

    navigateToAddAsset(): void {
        this.router.navigate(['/', this.lang, 'pages', 'patrimoine', 'add-asset']);
    }

    t(key: string): string {
        return this.i18n.t(key);
    }
}
