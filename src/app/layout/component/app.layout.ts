import { Component, HostListener, Renderer2, ViewChild, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AppTopbar } from './app.topbar';
import { AppSidebar } from './app.sidebar';
import { AppMobileNav } from './app.mobile-nav';
import { AppFab } from './app.fab';
import { QuickAddSheet } from './quick-add-sheet';
import { AppAiAssistantPanel } from './app.ai-assistant-panel';
import { LayoutService } from '../service/layout.service';
import { PwaPromptComponent } from './pwa-prompt.component';
import { PinLockComponent } from '../../core/components/pin-lock.component';
import { PinService } from '../../core/services/pin.service';
import { AuthService } from '../../core/services/auth.service';
import { ShareContextService } from '../../core/services/share-context.service';
import { FeatureFlagsService } from '../../core/services/feature-flags.service';
import { I18nService } from '../../i18n/i18n.service';
import { applyChartDefaults } from '../../core/theme/chart-theme';
import { FeedbackHostComponent } from '../../core/ui/feedback-host.component';
import { CommandPalette } from './command-palette';
import { CommandPaletteService } from '../../core/services/command-palette.service';

@Component({
    selector: 'app-layout',
    standalone: true,
    imports: [CommonModule, AppTopbar, AppSidebar, AppMobileNav, AppFab, QuickAddSheet, AppAiAssistantPanel, RouterModule, PwaPromptComponent, PinLockComponent, FeedbackHostComponent, CommandPalette],
    template: `<div class="layout-wrapper" [ngClass]="containerClass">
        <!-- Skip link: first focusable element; visually hidden until focused -->
        <a href="#main-content" (click)="focusMain($event)"
           class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[2000]
                  focus:px-4 focus:py-2 focus:rounded-lg focus:bg-brand-700 focus:text-white focus:font-semibold">
            {{ i18n.t('common.skipToContent') }}
        </a>
        <!-- Immersive routes (add-asset / connect-broker) run full-screen like a
             native app: the shell chrome (topbar, sidebar, mobile nav, FAB) is
             hidden and the page owns the whole viewport. -->
        @if (!immersive()) {
            <app-topbar role="banner"></app-topbar>
            <app-sidebar role="navigation" [attr.aria-label]="i18n.t('menu.navigation')"></app-sidebar>
        }
        <div class="layout-main-container">
            <main id="main-content" tabindex="-1" class="layout-main outline-none">
                <router-outlet></router-outlet>
            </main>
        </div>
        <div class="layout-mask animate-fadein"></div>
        @if (!immersive()) {
            <app-mobile-nav></app-mobile-nav>
        }

        <!-- Write affordances + personal overlays are hidden on a public read-only share -->
        @if (!share.active()) {
            @if (!immersive()) {
                <app-fab (action)="onFabAction()"></app-fab>
            }
            <!-- Both are modals, so they render in immersive shells too (P3-5):
                 Settings > Preferences opens the palette from a button, and the
                 palette's "add a transaction" needs the sheet wherever it runs.
                 The chord itself stays off in immersive routes (a wizard form
                 owns the keyboard there); only the explicit openers work. -->
            <app-quick-add-sheet [open]="quickAddOpen()" (close)="quickAddOpen.set(false)"></app-quick-add-sheet>
            <!-- Command palette (P2-5): Cmd/Ctrl+K anywhere in the shell, or the
                 topbar search button. Not in the share shell: it lists writes. -->
            <app-command-palette />
            @if (!immersive()) {
                <!-- S12: the teaser panel never renders once the real chat
                     surface (aiChat flag) is on; /assistant replaces it. -->
                @if (!flags.aiChat()) {
                    <app-ai-assistant-panel></app-ai-assistant-panel>
                }
                <app-pwa-prompt></app-pwa-prompt>
            }

            <!-- PIN Lock Screen, covers everything when locked (even immersive) -->
            @if (pinService.locked()) {
                <app-pin-lock />
            }
        }

        <!-- The three feedback voices (P1-5), mounted ONCE for the whole shell:
             confirm sheet, success sheet, error snackbar. Outside the share and
             PIN branches on purpose, so a failure can still be reported while
             the app is locked or in the read-only share shell. -->
        <app-feedback-host />
    </div> `
})
export class AppLayout implements OnInit, OnDestroy {
    overlayMenuOpenSubscription: Subscription;

    menuOutsideClickListener: any;

    @ViewChild(AppSidebar) appSidebar!: AppSidebar;
    @ViewChild(AppTopbar) appTopBar!: AppTopbar;

    pinService     = inject(PinService);
    private authService = inject(AuthService);
    share          = inject(ShareContextService);
    flags          = inject(FeatureFlagsService);
    i18n           = inject(I18nService);

    /** Immersive (full-screen, chrome-less) routes: the add-asset flow. Kept a
     *  simple URL match so no route-data plumbing is needed. */
    immersive = signal(false);
    private static readonly IMMERSIVE_URLS = ['/patrimoine/add-asset', '/patrimoine/connect-broker', '/pages/settings', '/pages/plans'];
    private computeImmersive(url: string): boolean {
        return AppLayout.IMMERSIVE_URLS.some(u => url.includes(u));
    }

    /** Skip-link handler: move focus into the main region (a bare #hash
     *  jump scrolls but doesn't move keyboard focus). */
    focusMain(event: Event): void {
        event.preventDefault();
        const main = document.getElementById('main-content');
        main?.focus();
        main?.scrollIntoView();
    }

    private visibilityHandler = () => {
        if (document.hidden) {
            this.pinService.onBackground();
        } else {
            this.pinService.onForeground();
        }
    };

    constructor(
        public layoutService: LayoutService,
        public renderer: Renderer2,
        public router: Router
    ) {
        // Apply Chart.js global defaults now that we're inside the authenticated
        // shell (dashboard/patrimoine/goals/wealth all live here). Idempotent, and
        // keeps Chart.js off the anonymous landing/login path (P2-FE-4).
        applyChartDefaults();
        this.overlayMenuOpenSubscription = this.layoutService.overlayOpen$.subscribe(() => {
            if (!this.menuOutsideClickListener) {
                this.menuOutsideClickListener = this.renderer.listen('document', 'click', (event) => {
                    if (this.isOutsideClicked(event)) {
                        this.hideMenu();
                    }
                });
            }

            if (this.layoutService.layoutState().staticMenuMobileActive) {
                this.blockBodyScroll();
            }
        });

        // Seed immersive state from the entry URL, then keep it in sync.
        this.immersive.set(this.computeImmersive(this.router.url));
        this.router.events.pipe(
            filter((event) => event instanceof NavigationEnd),
            takeUntilDestroyed(),
        ).subscribe((event) => {
            this.immersive.set(this.computeImmersive((event as NavigationEnd).urlAfterRedirects));
            this.hideMenu();
        });
    }

    isOutsideClicked(event: MouseEvent) {
        const sidebarEl = document.querySelector('.layout-sidebar');
        const topbarEl = document.querySelector('.layout-menu-button');
        const eventTarget = event.target as Node;

        return !(sidebarEl?.isSameNode(eventTarget) || sidebarEl?.contains(eventTarget) || topbarEl?.isSameNode(eventTarget) || topbarEl?.contains(eventTarget));
    }

    hideMenu() {
        this.layoutService.layoutState.update((prev) => ({ ...prev, overlayMenuActive: false, staticMenuMobileActive: false, menuHoverActive: false }));
        if (this.menuOutsideClickListener) {
            this.menuOutsideClickListener();
            this.menuOutsideClickListener = null;
        }
        this.unblockBodyScroll();
    }

    blockBodyScroll(): void {
        if (document.body.classList) {
            document.body.classList.add('blocked-scroll');
        } else {
            document.body.className += ' blocked-scroll';
        }
    }

    unblockBodyScroll(): void {
        if (document.body.classList) {
            document.body.classList.remove('blocked-scroll');
        } else {
            document.body.className = document.body.className.replace(new RegExp('(^|\\b)' + 'blocked-scroll'.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
        }
    }

    get containerClass() {
        return {
            'layout-overlay': this.layoutService.layoutConfig().menuMode === 'overlay',
            'layout-static': this.layoutService.layoutConfig().menuMode === 'static',
            'layout-static-inactive': this.layoutService.layoutState().staticMenuDesktopInactive && this.layoutService.layoutConfig().menuMode === 'static',
            'layout-overlay-active': this.layoutService.layoutState().overlayMenuActive,
            'layout-mobile-active': this.layoutService.layoutState().staticMenuMobileActive,
            'layout-immersive': this.immersive(),
        };
    }

    ngOnInit(): void {
        // Public shared portfolio: no user, no PIN, no auto-lock/logout.
        if (this.share.active()) return;

        // Lock on startup if PIN is configured
        this.pinService.initLockOnStartup();

        // Wire forced logout (after 5 failed PIN attempts)
        this.pinService.onForcedLogout = () => this.authService.logout();

        // Auto-lock when app goes to background and returns
        document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    quickAddOpen = signal(false);

    private palette = inject(CommandPaletteService);
    private paletteQuickAdd = this.palette.quickAddRequested
        .pipe(takeUntilDestroyed())
        .subscribe(() => this.quickAddOpen.set(true));

    /**
     * Cmd+K / Ctrl+K toggles the command palette from anywhere in the shell.
     * Off in the share shell (it lists writes) and while the PIN lock is up;
     * the chord itself is checked so no browser shortcut is overridden.
     */
    @HostListener('document:keydown', ['$event'])
    onDocumentKeydown(ev: KeyboardEvent): void {
        const chord = CommandPaletteService.isChord(ev);
        // `?` outside a field opens the palette on its keyboard legend (P3-5).
        const help = !chord && !this.palette.open() && CommandPaletteService.isHelpKey(ev);
        if (!chord && !help) return;
        if (this.share.active() || this.pinService.locked() || this.immersive()) return;
        ev.preventDefault();
        if (help) this.palette.showHelp(); else this.palette.toggle();
    }

    /**
     * The FAB adds "the thing this page is about": on the portfolio screen it
     * opens the add-asset wizard; everywhere else it opens the sub-5s
     * quick-add transaction sheet (manual entry is the main ingestion path).
     */
    onFabAction(): void {
        if (this.router.url.includes('/pages/patrimoine')) {
            this.onAddAsset();
        } else {
            this.quickAddOpen.set(true);
        }
    }

    onAddAsset(): void {
        const match = this.router.url.match(/^\/(fr|en)\//);
        const lang = match ? match[1] : 'fr';
        this.router.navigate(['/', lang, 'pages', 'patrimoine', 'add-asset']);
    }

    ngOnDestroy() {
        if (this.overlayMenuOpenSubscription) {
            this.overlayMenuOpenSubscription.unsubscribe();
        }

        if (this.menuOutsideClickListener) {
            this.menuOutsideClickListener();
        }

        document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
}
