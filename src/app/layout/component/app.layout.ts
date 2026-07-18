import { Component, Renderer2, ViewChild, OnInit, OnDestroy, inject, signal } from '@angular/core';
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

@Component({
    selector: 'app-layout',
    standalone: true,
    imports: [CommonModule, AppTopbar, AppSidebar, AppMobileNav, AppFab, QuickAddSheet, AppAiAssistantPanel, RouterModule, PwaPromptComponent, PinLockComponent],
    template: `<div class="layout-wrapper" [ngClass]="containerClass">
        <app-topbar></app-topbar>
        <app-sidebar></app-sidebar>
        <div class="layout-main-container">
            <div class="layout-main">
                <router-outlet></router-outlet>
            </div>
        </div>
        <div class="layout-mask animate-fadein"></div>
        <app-mobile-nav></app-mobile-nav>

        <!-- Write affordances + personal overlays are hidden on a public read-only share -->
        @if (!share.active()) {
            <app-fab (action)="onFabAction()"></app-fab>
            <app-quick-add-sheet [open]="quickAddOpen()" (close)="quickAddOpen.set(false)"></app-quick-add-sheet>
            <app-ai-assistant-panel></app-ai-assistant-panel>
            <app-pwa-prompt></app-pwa-prompt>

            <!-- PIN Lock Screen — covers everything when locked -->
            @if (pinService.locked()) {
                <app-pin-lock />
            }
        }
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

        this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
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
            'layout-mobile-active': this.layoutService.layoutState().staticMenuMobileActive
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
