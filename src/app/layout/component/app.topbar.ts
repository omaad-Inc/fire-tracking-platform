import { Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LayoutService } from '../service/layout.service';
import { I18nService } from '../../i18n/i18n.service';
import { filter } from 'rxjs/operators';
import { TokenService } from '../../core/services/token.service';
import { BillingService } from '../../core/services/billing.service';
import { environment } from '../../../environments/environment';
import { PrivacyService } from '../../core/services/privacy.service';
import { AiAssistantService } from '../../core/services/ai-assistant.service';
import { ShareContextService } from '../../core/services/share-context.service';
import { FeatureFlagsService } from '../../core/services/feature-flags.service';
import { NavService } from '../../core/services/nav.service';
import { CommandPaletteService } from '../../core/services/command-palette.service';
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
                            <img [src]="avatarUrl" alt="Profile" class="w-full h-full object-cover" width="40" height="40">
                        } @else {
                            <i class="pi pi-user text-surface-200"></i>
                        }
                    </div>
                </a>
            }
        </div>

        <div class="layout-topbar-actions">
            <!-- Desktop ONLY: command palette trigger (P2-5) + dark mode toggle -->
            <div class="layout-config-menu hidden lg:flex">
                @if (!share.active()) {
                    <button type="button" class="layout-topbar-action" (click)="palette.show()" data-testid="palette-trigger"
                            [attr.aria-label]="paletteTriggerLabel" [title]="paletteTriggerLabel">
                        <i aria-hidden="true" class="pi pi-search"></i>
                    </button>
                }
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

                <!-- The notification bell (P1-1) left the topbar in the PWA
                     topbar diet: the inbox is reached from the command
                     palette ("Notifications") and /pages/notifications. -->

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
                        <!-- A real button, not a role=status div: tapping it goes to
                             the assistant (mobile parity), which is the thing the
                             copy is inviting, so it must be reachable by keyboard
                             and announced as an action. Anchored to the sparkle's
                             own wrapper, so it follows the icon wherever the topbar
                             layout puts it (the crown pill changes width by tier)
                             with no offset to keep in sync. -->
                        <button type="button"
                                class="absolute top-full right-0 mt-2 z-[60] w-max max-w-[15rem] text-left ai-hint-tip"
                                (click)="openAssistant()">
                            <span class="absolute -top-1 right-3 w-2.5 h-2.5 rotate-45 bg-ochre-500"></span>
                            <span class="relative block rounded-xl bg-ochre-500 text-warm-900 text-[11px] font-semibold leading-snug px-3 py-2 shadow-lg">
                                {{ t('topbar.assistantHint') }}
                            </span>
                        </button>
                    }
                </div>

                <!-- Tier-aware crown pill: free -> aspirational Pro CTA,
                     pro -> quiet Premium CTA, premium -> prestige status chip,
                     hidden while loading (no wrong-tier flash). -->
                @if (pillMode() === 'upsell_pro') {
                    <a [routerLink]="['/'+lang, 'pages', 'plans']"
                       class="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                              bg-gradient-to-br from-ochre-400 to-ochre-500 text-warm-900
                              text-[10px] lg:text-xs font-bold tracking-wide
                              ring-1 ring-ochre-300/40 shadow-sm
                              transition-all hover:shadow-lg hover:-translate-y-px active:translate-y-0"
                       [attr.aria-label]="t('topbar.upgradeToPro')" [title]="t('topbar.upgradeToPro')">
                        <i class="pi pi-crown" style="font-size:9px" aria-hidden="true"></i>
                        {{ t('topbar.tierPro') }}
                    </a>
                } @else if (pillMode() === 'upsell_premium') {
                    <a [routerLink]="['/'+lang, 'pages', 'plans']"
                       class="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                              bg-ochre-500/10 text-ochre-700 dark:text-ochre-300
                              text-[10px] lg:text-xs font-bold tracking-wide
                              ring-1 ring-ochre-500/40
                              transition-all hover:bg-ochre-500/20 hover:ring-ochre-500/60 hover:shadow-md"
                       [attr.aria-label]="t('topbar.upgradeToPremium')" [title]="t('topbar.upgradeToPremium')">
                        <i class="pi pi-crown" style="font-size:9px" aria-hidden="true"></i>
                        {{ t('topbar.tierPremium') }}
                    </a>
                } @else if (pillMode() === 'status_premium') {
                    <a [routerLink]="['/'+lang, 'pages', 'settings', 'subscription']"
                       class="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                              bg-gradient-to-br from-ochre-500 to-ochre-600 text-warm-900
                              text-[10px] lg:text-xs font-semibold tracking-wide
                              ring-1 ring-ochre-200/50 shadow-sm
                              transition-all hover:shadow-md"
                       [attr.aria-label]="t('topbar.yourPlanPremium')" [title]="t('topbar.yourPlanPremium')">
                        <i class="pi pi-crown" style="font-size:9px" aria-hidden="true"></i>
                        {{ t('topbar.tierPremium') }}
                    </a>
                }

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
    palette         = inject(CommandPaletteService);
    private paletteI18n = inject(I18nService);
    /** "Search or act (⌘K)": the shortcut hint follows the platform, the copy the language. */
    get paletteTriggerLabel(): string {
        return this.paletteI18n.t('palette.trigger', { shortcut: CommandPaletteService.shortcutLabel() });
    }
    aiAssistant     = inject(AiAssistantService);
    share           = inject(ShareContextService);
    private flags   = inject(FeatureFlagsService);
    private nav     = inject(NavService);
    private billing = inject(BillingService);
    layoutService = inject(LayoutService);

    /** Tier the user has effectively reached. Beta courtesy lifts everyone to at
     *  least Pro (mirrors billing_service.has_plan / settings.ts / notice-strip),
     *  so a courtesy-Pro user is never nagged to "upgrade to Pro". */
    private reachedTier = computed<'free' | 'pro' | 'premium'>(() => {
        const plan = this.billing.effectivePlan() as 'free' | 'pro' | 'premium';
        if (plan === 'premium') return 'premium';
        return this.billing.betaCourtesy() ? 'pro' : plan;
    });

    /** What the topbar crown pill should be, or null to hide it:
     *  free -> aspirational "Pro" upsell CTA (-> /plans)
     *  pro  -> aspirational "Premium" upsell CTA (-> /plans)
     *  premium -> quiet "Premium" prestige status chip (-> Abonnement)
     *  Hidden while the subscription is still loading (no wrong-tier flash). */
    pillMode = computed<'upsell_pro' | 'upsell_premium' | 'status_premium' | null>(() => {
        if (this.billing.state() === 'loading') return null;
        switch (this.reachedTier()) {
            case 'free':    return 'upsell_pro';
            case 'pro':     return 'upsell_premium';
            case 'premium': return 'status_premium';
        }
    });

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
    /** Dismisses the coach-mark on the first interaction outside it. */
    private outsideHandler: ((e: Event) => void) | null = null;

    constructor() {
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            takeUntilDestroyed(),
        ).subscribe(() => {
            this.lang = this.getCurrentLang();
            // Retire the coach-mark on navigation (P0-4). The bubble hangs over
            // the page (it has to: growing the topbar to fit it would shift the
            // whole layout), so on a 390px screen it sits squarely on the first
            // card's heading. That is a fair price for the two seconds it takes
            // to read on the screen it appeared on, and no price at all worth
            // paying on the next three screens the user visits. Nothing used to
            // clear it but its own 8s timer, so it followed them around.
            //
            // Hidden WITHOUT marking it seen: a user who navigates immediately
            // never read it, and burning the one-shot on that would mean the
            // hint silently never does its job. It stays available for a later
            // visit; the timer, a click, or opening the assistant retire it for
            // good.
            this.hideAssistantHint();
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
        // Warm the subscription cache so the crown pill reflects the real tier
        // (free -> Pro CTA, pro -> Premium CTA, premium -> status chip).
        this.billing.load();
        this.maybeShowAssistantHint();
    }

    ngOnDestroy() {
        if (this.hintTimer) clearTimeout(this.hintTimer);
        this.detachOutsideDismiss();
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
        this.attachOutsideDismiss();
    }

    /**
     * The first click or Escape anywhere else retires it. Since the bubble
     * covers page content, the user must never have to work around it: one tap
     * on whatever they were actually reaching for is enough to clear it, and
     * that tap still reaches its target (the listener only observes).
     */
    private attachOutsideDismiss(): void {
        if (typeof document === 'undefined' || this.outsideHandler) return;
        this.outsideHandler = (e: Event) => {
            if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
            // A click on the bubble or the sparkle is handled by their own
            // click, which opens the assistant; don't race it.
            const target = e.target as Node | null;
            if (e.type === 'pointerdown' && target instanceof Element
                && target.closest('.ai-hint-tip, .ai-topbar-btn')) return;
            this.markAssistantSeen();
        };
        // pointerdown, not click: it fires before the page reacts, so the
        // bubble is gone by the time the user's actual target responds.
        document.addEventListener('pointerdown', this.outsideHandler, true);
        document.addEventListener('keydown', this.outsideHandler, true);
    }

    private detachOutsideDismiss(): void {
        if (typeof document === 'undefined' || !this.outsideHandler) return;
        document.removeEventListener('pointerdown', this.outsideHandler, true);
        document.removeEventListener('keydown', this.outsideHandler, true);
        this.outsideHandler = null;
    }

    /** Take the bubble down without spending the one-shot (used on navigation). */
    private hideAssistantHint(): void {
        if (!this.assistantHint()) return;
        this.assistantHint.set(false);
        if (this.hintTimer) { clearTimeout(this.hintTimer); this.hintTimer = null; }
        this.detachOutsideDismiss();
    }

    /**
     * Retire the hint for good. Unlike hideAssistantHint() this does NOT require
     * the bubble to be on screen: a user who navigated away (which hides it) and
     * then found the assistant anyway has discovered it, and re-teaching them
     * next session would be a nag.
     */
    private markAssistantSeen(): void {
        this.hideAssistantHint();
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
