import { Component, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { inject } from '@angular/core';
import { I18nService } from '../../i18n/i18n.service';
import { NavService } from '../../core/services/nav.service';
import { filter } from 'rxjs/operators';

interface NavItem {
    label: string;
    icon: string;
    route: string[];
    active?: boolean;
}

@Component({
    selector: 'app-mobile-nav',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
        <!-- "More" sheet: secondary destinations that don't fit the 5-slot bar -->
        @if (moreOpen) {
            <div class="more-backdrop" (click)="closeMore()"></div>
            <div class="more-sheet" role="dialog" aria-modal="true" [attr.aria-label]="t('menu.more')"
                 (keydown.escape)="closeMore()">
                <div class="more-grabber"></div>
                @for (item of moreItems; track item.route.join('/')) {
                    <a [routerLink]="item.route" (click)="closeMore()" class="more-item"
                       [class.active]="isActive(item.route)">
                        <span class="more-icon"><i [class]="item.icon"></i></span>
                        <span class="more-label">{{ item.label }}</span>
                        <i class="pi pi-chevron-right more-chevron"></i>
                    </a>
                }
            </div>
        }

        <nav class="mobile-bottom-nav">
            <a
                *ngFor="let item of navItems"
                [routerLink]="item.route"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: item.route.length <= 2 }"
                class="nav-item"
            >
                <div class="nav-icon-wrapper" [class.active]="isActive(item.route)">
                    <i [class]="item.icon"></i>
                </div>
                <span class="nav-label">{{ item.label }}</span>
                <!-- Active dot indicator -->
                <span class="nav-dot" [class.active]="isActive(item.route)"></span>
            </a>
            <!-- More: opens the secondary-destinations sheet -->
            <button type="button" class="nav-item" (click)="toggleMore()"
                    [attr.aria-expanded]="moreOpen" [attr.aria-label]="t('menu.more')">
                <div class="nav-icon-wrapper" [class.active]="moreOpen || moreActive()">
                    <i class="pi pi-ellipsis-h"></i>
                </div>
                <span class="nav-label">{{ t('menu.more') }}</span>
                <span class="nav-dot" [class.active]="moreActive()"></span>
            </button>
        </nav>
    `,
    styles: [`
        .mobile-bottom-nav {
            display: none;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: calc(70px + env(safe-area-inset-bottom, 0px));
            background: rgba(255, 255, 255, 0.95);
            border-top: 1px solid var(--surface-border);
            padding: 0 0.5rem;
            padding-bottom: env(safe-area-inset-bottom, 0px);
            z-index: 999;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
        }

        @media (max-width: 991px) {
            .mobile-bottom-nav {
                display: flex;
                justify-content: space-around;
                align-items: center;
            }
        }

        .nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 0.5rem;
            min-width: 56px;
            text-decoration: none;
            color: var(--text-color-secondary);
            transition: all 0.2s ease;
            -webkit-tap-highlight-color: transparent;
            /* reset for the <button> More item */
            background: none;
            border: none;
            cursor: pointer;
            font-family: inherit;
        }

        .nav-item:active {
            transform: scale(0.95);
        }

        .nav-icon-wrapper {
            width: 48px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 16px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            margin-bottom: 4px;
        }

        .nav-icon-wrapper i {
            font-size: 1.15rem;
            transition: all 0.3s ease;
            color: #8A98AE;
        }

        .nav-icon-wrapper.active {
            background: rgba(199, 123, 60, 0.12);
            transform: scale(1.05);
        }

        .nav-icon-wrapper.active i {
            color: #C77B3C;
            font-size: 1.3rem;
        }

        .nav-label {
            font-size: 0.65rem;
            font-weight: 500;
            color: #8A98AE;
            transition: color 0.3s ease;
        }

        .nav-item.active .nav-label {
            color: #C77B3C;
            font-weight: 700;
        }

        .nav-dot {
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: transparent;
            transition: background 0.3s ease, transform 0.3s ease;
            margin-top: 2px;
        }

        .nav-dot.active {
            background: #C77B3C;
            transform: scale(1);
        }

        /* ── "More" sheet ── */
        .more-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.4);
            z-index: 1000;
            animation: more-fade 0.2s ease;
        }

        .more-sheet {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 1001;
            background: var(--surface-0, #fff);
            border-top-left-radius: 20px;
            border-top-right-radius: 20px;
            padding: 0.75rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px));
            box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.15);
            animation: more-slide 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .more-grabber {
            width: 36px;
            height: 4px;
            border-radius: 2px;
            background: var(--surface-300, #d4d4d8);
            margin: 0 auto 0.75rem;
        }

        .more-item {
            display: flex;
            align-items: center;
            gap: 0.875rem;
            padding: 0.875rem 0.5rem;
            text-decoration: none;
            color: var(--text-color, #1a2740);
            border-radius: 12px;
            transition: background 0.2s ease;
        }

        .more-item:active {
            background: var(--surface-100, #f4f4f5);
        }

        .more-icon {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
            background: rgba(199, 123, 60, 0.12);
        }

        .more-icon i {
            font-size: 1.15rem;
            color: #C77B3C;
        }

        .more-label {
            flex: 1;
            font-size: 0.95rem;
            font-weight: 600;
        }

        .more-item.active .more-label {
            color: #C77B3C;
        }

        .more-chevron {
            font-size: 0.75rem;
            color: var(--text-color-secondary, #8A98AE);
        }

        @keyframes more-fade {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes more-slide {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
        }

        /* Dark mode */
        :host-context(.app-dark) .more-sheet {
            background: #0F1A2E;
        }

        :host-context(.app-dark) .more-item {
            color: #E8EAED;
        }

        :host-context(.app-dark) .more-item:active {
            background: rgba(255, 255, 255, 0.06);
        }

        :host-context(.app-dark) .more-grabber {
            background: rgba(255, 255, 255, 0.2);
        }

        :host-context(.app-dark) .mobile-bottom-nav {
            background: rgba(15, 26, 46, 0.95);
            border-top-color: rgba(255, 255, 255, 0.08);
        }

        :host-context(.app-dark) .nav-icon-wrapper i {
            color: #5A6478;
        }

        :host-context(.app-dark) .nav-icon-wrapper.active {
            background: rgba(199, 123, 60, 0.15);
        }

        :host-context(.app-dark) .nav-icon-wrapper.active i {
            color: #D4945A;
        }

        :host-context(.app-dark) .nav-label {
            color: #5A6478;
        }

        :host-context(.app-dark) .nav-item.active .nav-label {
            color: #D4945A;
        }

        :host-context(.app-dark) .nav-dot.active {
            background: #D4945A;
        }
    `]
})
export class AppMobileNav implements OnInit {
    navItems: NavItem[] = [];
    /** Secondary destinations shown in the "More" sheet (don't fit 5 slots). */
    moreItems: NavItem[] = [];
    moreOpen = false;
    lang = 'fr';
    currentUrl = '';
    private nav = inject(NavService);

    constructor(
        private router: Router,
        private i18n: I18nService
    ) {
        // Listen to route changes
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            takeUntilDestroyed(),
        ).subscribe((event: NavigationEnd) => {
            this.currentUrl = event.urlAfterRedirects;
            this.closeMore();      // never leave the sheet open after navigating
            this.updateNavItems();
        });
    }

    ngOnInit() {
        this.currentUrl = this.router.url;
        this.updateNavItems();
    }

    private updateNavItems() {
        this.lang = this.getCurrentLang();

        this.navItems = [
            { label: this.t('menu.dashboard'),    icon: 'pi pi-home',                    route: this.nav.link() },
            { label: this.t('menu.patrimony'),    icon: 'pi pi-wallet',                  route: this.nav.link('pages', 'patrimoine') },
            { label: this.t('menu.transactions'), icon: 'pi pi-arrow-right-arrow-left',  route: this.nav.link('pages', 'transaction') },
            { label: this.t('menu.myGoals'),      icon: 'pi pi-bullseye',                route: this.nav.link('pages', 'goals') },
        ];

        // FIRE + Wealth Score are first-class destinations but the bar only
        // holds ~5 slots on a phone, so they live in the "More" sheet with Debts.
        this.moreItems = [
            { label: this.t('menu.fire'),        icon: 'pi pi-chart-line',   route: this.nav.link('pages', 'fire') },
            { label: this.t('menu.wealthScore'), icon: 'pi pi-gauge',        route: this.nav.link('pages', 'wealth-score') },
            { label: this.t('menu.debts'),       icon: 'pi pi-credit-card',  route: this.nav.link('pages', 'debts') },
        ];
    }

    toggleMore() {
        this.moreOpen = !this.moreOpen;
    }

    closeMore() {
        this.moreOpen = false;
    }

    /** True when the current route is one of the "More" destinations. */
    moreActive(): boolean {
        return this.moreItems.some(i => this.isActive(i.route));
    }

    private getCurrentLang(): 'fr' | 'en' {
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        return (match ? match[1] : 'fr') as 'fr' | 'en';
    }

    isActive(route: string[]): boolean {
        const routePath = route.join('/');
        // For dashboard (exact match)
        if (route.length <= 2) {
            return this.currentUrl === routePath || this.currentUrl === routePath + '/';
        }
        // For other routes (starts with)
        return this.currentUrl.startsWith(routePath);
    }

    t(key: string): string {
        return this.i18n.t(key);
    }
}

