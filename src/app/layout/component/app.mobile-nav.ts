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
            background: var(--surface-card);
            border-top: 1px solid var(--surface-border);
            padding: 0 0.5rem;
            padding-bottom: env(safe-area-inset-bottom, 0);
            z-index: 999;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
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
            font-size: 1.25rem;
            transition: all 0.3s ease;
        }

        .nav-icon-wrapper.active {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%);
        }

        .nav-icon-wrapper.active i {
            background: linear-gradient(135deg, #6366f1 0%, #06b6d4 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .nav-label {
            font-size: 0.7rem;
            font-weight: 500;
            transition: color 0.3s ease;
        }

        .nav-item.active .nav-label,
        .nav-item:hover .nav-label {
            color: var(--primary-color);
        }

        /* Dark mode adjustments */
        :host-context(.app-dark) .mobile-bottom-nav {
            background: rgba(15, 23, 42, 0.95);
            border-top-color: rgba(255, 255, 255, 0.1);
        }

        :host-context(.app-dark) .nav-icon-wrapper.active {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(6, 182, 212, 0.25) 100%);
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
                label: this.t('menu.savings'),
                icon: 'pi pi-dollar',
                route: ['/', this.lang, 'pages', 'savings']
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

