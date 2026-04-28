import { Component, ElementRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { AppMenu } from './app.menu';
import { TokenService } from '../../core/services/token.service';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../i18n/i18n.service';
import { LayoutService } from '../service/layout.service';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule, RouterModule, AvatarModule, DividerModule, AppMenu],
    template: `
        <div class="layout-sidebar">
            <!-- Logo header — click to toggle sidebar; hover swaps logo for hamburger -->
            <button type="button" class="sidebar-logo" (click)="layoutService.onMenuToggle()" aria-label="Toggle sidebar">
                <img src="assets/omaad-icon.png" alt="Omaad" class="sidebar-logo-img" />
                <svg class="sidebar-logo-toggle" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="4" y1="7" x2="20" y2="7"/>
                    <line x1="4" y1="12" x2="20" y2="12"/>
                    <line x1="4" y1="17" x2="20" y2="17"/>
                </svg>
                <span class="sidebar-logo-text">Omaad</span>
            </button>

            <!-- Menu (scrollable) -->
            <div class="sidebar-menu-wrapper">
                <app-menu></app-menu>
            </div>

            <!-- User footer -->
            <div class="sidebar-user-footer relative">
                <button type="button"
                        class="sidebar-user-button"
                        (click)="userMenuOpen.set(!userMenuOpen())">
                    <div class="sidebar-avatar">
                        @if (avatarUrl) {
                            <img [src]="avatarUrl" alt="Profile" class="w-full h-full object-cover rounded-full">
                        } @else {
                            <p-avatar [label]="userInitials" shape="circle"
                                [style]="{ 'background': 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)', 'color': 'white', 'font-weight': '600', 'font-size': '0.75rem', 'width': '100%', 'height': '100%' }" />
                        }
                    </div>
                    <div class="sidebar-user-info">
                        <div class="sidebar-user-name">{{ userFirstName }}</div>
                    </div>
                    <i class="pi pi-ellipsis-v sidebar-user-toggle"></i>
                </button>

                <!-- User dropdown menu (popover above the footer button) -->
                <div [class.hidden]="!userMenuOpen()"
                     class="sidebar-user-dropdown">
                    <a [routerLink]="['/'+lang, 'pages', 'settings', 'account']" (click)="userMenuOpen.set(false)"
                       class="dropdown-item">
                        <i class="pi pi-user text-indigo-500"></i>
                        <span>{{ t('menu.myAccount') }}</span>
                    </a>
                    <a [routerLink]="['/'+lang, 'pages', 'settings', 'security']" (click)="userMenuOpen.set(false)"
                       class="dropdown-item">
                        <i class="pi pi-shield text-cyan-500"></i>
                        <span>{{ t('menu.security') }}</span>
                    </a>
                    <a [routerLink]="['/'+lang, 'pages', 'settings', 'preferences']" (click)="userMenuOpen.set(false)"
                       class="dropdown-item">
                        <i class="pi pi-cog text-emerald-500"></i>
                        <span>{{ t('menu.preferences') }}</span>
                    </a>
                    <a [routerLink]="['/'+lang, 'pages', 'fire']" (click)="userMenuOpen.set(false)"
                       class="dropdown-item">
                        <i class="pi pi-flag text-emerald-600"></i>
                        <span>{{ t('menu.financialGoal') }}</span>
                    </a>
                    <p-divider styleClass="!my-0" />
                    <a [routerLink]="['/'+lang, 'pages', 'settings', 'help']" (click)="userMenuOpen.set(false)"
                       class="dropdown-item">
                        <i class="pi pi-question-circle text-amber-500"></i>
                        <span>{{ t('settings.getHelp') }}</span>
                    </a>
                    <p-divider styleClass="!my-0" />
                    <button type="button" (click)="logout(); userMenuOpen.set(false)"
                            class="dropdown-item w-full text-left group">
                        <i class="pi pi-sign-out text-red-500"></i>
                        <span class="text-red-500 group-hover:text-red-600">{{ t('topbar.logout') }}</span>
                    </button>
                </div>
            </div>
        </div>
    `
})
export class AppSidebar {
    private router = inject(Router);
    private tokenService = inject(TokenService);
    private authService = inject(AuthService);
    private i18n = inject(I18nService);
    layoutService = inject(LayoutService);

    user = this.tokenService.user;
    userMenuOpen = signal(false);
    lang = 'fr';

    constructor(public el: ElementRef) {
        this.lang = this.getCurrentLang();
        this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
            this.lang = this.getCurrentLang();
            this.userMenuOpen.set(false);
        });
    }

    private getCurrentLang(): string {
        const m = this.router.url.match(/^\/(fr|en)(\/|$)/);
        return m ? m[1] : 'fr';
    }

    get avatarUrl(): string | null {
        const u = this.user();
        if (!u?.avatar_url) return null;
        if (u.avatar_url.startsWith('/uploads/')) {
            return environment.apiUrl.replace('/api/v1', '') + u.avatar_url;
        }
        return u.avatar_url;
    }

    get userInitials(): string {
        const u = this.user();
        if (!u) return 'U';
        const f = u.first_name || '', l = u.last_name || '';
        return (f || l) ? `${f.charAt(0)}${l.charAt(0)}`.toUpperCase() : u.email?.charAt(0).toUpperCase() || 'U';
    }

    get userFirstName(): string {
        const u = this.user();
        if (!u) return 'User';
        if (u.first_name) return u.first_name;
        return u.email?.split('@')[0] || 'User';
    }

    logout() {
        this.authService.logout();
    }

    t(key: string) {
        return this.i18n.t(key);
    }
}
