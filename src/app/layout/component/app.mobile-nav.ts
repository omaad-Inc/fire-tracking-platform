import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
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
        </nav>
    `,
    styles: [`
        .mobile-bottom-nav {
            display: none;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 70px;
            background: rgba(255, 255, 255, 0.95);
            border-top: 1px solid var(--surface-border);
            padding: 0 0.5rem;
            padding-bottom: env(safe-area-inset-bottom, 0);
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
            min-width: 64px;
            text-decoration: none;
            color: var(--text-color-secondary);
            transition: all 0.2s ease;
            -webkit-tap-highlight-color: transparent;
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

        /* Dark mode */
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
    lang = 'fr';
    currentUrl = '';

    constructor(
        private router: Router,
        private i18n: I18nService
    ) {
        // Listen to route changes
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: NavigationEnd) => {
            this.currentUrl = event.urlAfterRedirects;
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
            {
                label: this.t('menu.dashboard'),
                icon: 'pi pi-home',
                route: ['/', this.lang]
            },
            {
                label: this.t('menu.patrimony'),
                icon: 'pi pi-wallet',
                route: ['/', this.lang, 'pages', 'patrimoine']
            },
            {
                label: this.t('menu.transactions'),
                icon: 'pi pi-arrow-right-arrow-left',
                route: ['/', this.lang, 'pages', 'transaction']
            },
            {
                label: this.t('menu.myGoals'),
                icon: 'pi pi-bullseye',
                route: ['/', this.lang, 'pages', 'goals']
            },
            {
                label: this.t('menu.debts'),
                icon: 'pi pi-credit-card',
                route: ['/', this.lang, 'pages', 'debts']
            }
        ];
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

    private t(key: string): string {
        return this.i18n.t(key);
    }
}

