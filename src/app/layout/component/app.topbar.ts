import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { LayoutService } from '../service/layout.service';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { I18nService } from '../../i18n/i18n.service';
import { filter } from 'rxjs/operators';
import { TokenService } from '../../core/services/token.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { PrivacyService } from '../../core/services/privacy.service';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [
        RouterModule, CommonModule, StyleClassModule, AvatarModule, DividerModule
    ],
    template: ` <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <!-- Hamburger menu - hidden on mobile -->
            <button class="layout-menu-button layout-topbar-action hidden lg:flex" (click)="layoutService.onMenuToggle()">
                <i class="pi pi-bars"></i>
            </button>

            <!-- Mobile ONLY: User avatar in the logo area (replaces logo on mobile) -->
            <a [routerLink]="['/'+lang, 'pages', 'settings']"
               class="lg:hidden flex items-center justify-center shrink-0">
                <div class="w-9 h-9 rounded-full bg-surface-800 dark:bg-surface-700 flex items-center justify-center overflow-hidden">
                    @if (avatarUrl) {
                        <img [src]="avatarUrl" alt="Profile" class="w-full h-full object-cover">
                    } @else {
                        <i class="pi pi-user text-surface-200"></i>
                    }
                </div>
            </a>

            <!-- Desktop: Logo + text (hidden on mobile) -->
            <div class="layout-topbar-logo hidden lg:flex items-center gap-2">
                <img src="assets/omaad-icon.png" alt="Omaad Logo" class="w-12 h-12">
                <span class="whitespace-nowrap">Omaad</span>
            </div>
        </div>

        <div class="layout-topbar-actions">
            <!-- Desktop ONLY: dark mode toggle -->
            <div class="layout-config-menu hidden lg:flex">
                <button type="button" class="layout-topbar-action" (click)="toggleDarkMode()">
                    <i [ngClass]="{ 'pi ': true, 'pi-moon': layoutService.isDarkTheme(), 'pi-sun': !layoutService.isDarkTheme() }"></i>
                </button>
            </div>

            <!-- Eye icon (privacy toggle) — one button, visible on ALL sizes -->
            <button type="button" class="layout-topbar-action" (click)="privacyService.toggle()"
                    [title]="privacyService.hidden() ? 'Afficher les montants' : 'Masquer les montants'">
                <i class="pi" [ngClass]="privacyService.hidden() ? 'pi-eye-slash' : 'pi-eye'"></i>
            </button>

            <!-- UPGRADE PRO pill — visible on ALL sizes -->
            <a [routerLink]="['/'+lang, 'pages', 'plans']"
               class="flex items-center gap-1 px-2.5 py-1.5 rounded-full
                      bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] lg:text-xs font-bold
                      tracking-wider transition-all hover:scale-105 hover:shadow-lg hover:shadow-amber-500/30">
                <i class="pi pi-crown" style="font-size:9px"></i>
                PRO
            </a>

            <!-- Add Assets Button - Desktop Only -->
            <button
                type="button"
                class="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-medium transition-all hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/30"
                (click)="navigateToAddAsset()"
            >
                <i class="pi pi-plus"></i>
                <span>{{ t('topbar.addAssets') }}</span>
            </button>

            <!-- Desktop ONLY: menu with dropdown -->
            <div class="layout-topbar-menu desktop-menu">
                <div class="layout-topbar-menu-content">
                    <!-- Notifications -->
                    <button type="button" class="layout-topbar-action">
                        <i class="pi pi-bell"></i>
                        <span>{{ t('topbar.notifications') }}</span>
                    </button>
                    <!-- User Profile Menu with dropdown -->
                    <div class="relative">
                        <button
                            type="button"
                            class="layout-topbar-action"
                            (click)="userMenuOpen.set(!userMenuOpen())"
                        >
                            @if (avatarUrl) {
                                <img [src]="avatarUrl"
                                     alt="Profile"
                                     class="w-8 h-8 rounded-full object-cover">
                            } @else {
                                <p-avatar
                                    [label]="userInitials"
                                    shape="circle"
                                    [style]="{ 'background': 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)', 'color': 'white', 'font-weight': '600', 'font-size': '0.75rem' }"
                                    size="normal"
                                />
                            }
                        </button>
                        <!-- User Dropdown Menu -->
                        <div [class.hidden]="!userMenuOpen()"
                             class="absolute top-[3.25rem] right-0 w-72 bg-surface-0 dark:bg-surface-900 border border-surface rounded-xl origin-top shadow-xl overflow-hidden z-50">
                            <!-- User Header -->
                            <div class="p-4 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 border-b border-surface">
                                <div class="flex items-center gap-3">
                                    @if (avatarUrl) {
                                        <img [src]="avatarUrl"
                                             alt="Profile"
                                             class="w-12 h-12 rounded-full object-cover">
                                    } @else {
                                        <p-avatar
                                            [label]="userInitials"
                                            shape="circle"
                                            size="large"
                                            [style]="{ 'background': 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)', 'color': 'white', 'font-weight': '600' }"
                                        />
                                    }
                                    <div class="flex-1 min-w-0">
                                        <div class="font-semibold text-surface-900 dark:text-surface-0 truncate">{{ userName }}</div>
                                        <div class="text-sm text-surface-500 dark:text-surface-400 truncate">{{ user()?.email }}</div>
                                    </div>
                                    <i class="pi pi-chevron-right text-surface-400"></i>
                                </div>
                            </div>

                            <!-- Menu Items -->
                            <div class="py-2">
                                <a [routerLink]="['/'+lang, 'pages', 'settings', 'account']" (click)="userMenuOpen.set(false)" class="flex items-center gap-3 px-4 py-3 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer">
                                    <i class="pi pi-user text-indigo-500"></i>
                                    <span class="text-surface-700 dark:text-surface-200">{{ t('menu.myAccount') }}</span>
                                </a>
                                <a [routerLink]="['/'+lang, 'pages', 'settings', 'security']" (click)="userMenuOpen.set(false)" class="flex items-center gap-3 px-4 py-3 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer">
                                    <i class="pi pi-shield text-cyan-500"></i>
                                    <span class="text-surface-700 dark:text-surface-200">{{ t('menu.security') }}</span>
                                </a>
                                <a [routerLink]="['/'+lang, 'pages', 'settings', 'preferences']" (click)="userMenuOpen.set(false)" class="flex items-center gap-3 px-4 py-3 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer">
                                    <i class="pi pi-cog text-emerald-500"></i>
                                    <span class="text-surface-700 dark:text-surface-200">{{ t('menu.preferences') }}</span>
                                </a>
                                <a [routerLink]="['/'+lang, 'pages', 'settings', 'fire']" (click)="userMenuOpen.set(false)" class="flex items-center gap-3 px-4 py-3 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer">
                                    <i class="pi pi-flag text-emerald-600"></i>
                                    <span class="text-surface-700 dark:text-surface-200">Objectif FIRE</span>
                                </a>
                            </div>

                            <p-divider styleClass="!my-0" />

                            <!-- Help Section -->
                            <div class="py-2">
                                <a [routerLink]="['/'+lang, 'pages', 'settings', 'help']" (click)="userMenuOpen.set(false)" class="flex items-center gap-3 px-4 py-3 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer">
                                    <i class="pi pi-question-circle text-amber-500"></i>
                                    <span class="text-surface-700 dark:text-surface-200">{{ t('settings.getHelp') }}</span>
                                </a>
                            </div>

                            <p-divider styleClass="!my-0" />

                            <!-- Logout -->
                            <div class="py-2">
                                <button (click)="logout(); userMenuOpen.set(false)" class="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer group">
                                    <i class="pi pi-sign-out text-red-500"></i>
                                    <span class="text-red-500 group-hover:text-red-600">{{ t('topbar.logout') }}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    `
})
export class AppTopbar implements OnInit {
    private router = inject(Router);
    private i18n = inject(I18nService);
    private tokenService = inject(TokenService);
    private authService = inject(AuthService);
    privacyService  = inject(PrivacyService);

    layoutService = inject(LayoutService);

    lang = 'fr';

    // User dropdown menu (desktop)
    userMenuOpen = signal(false);

    user = this.tokenService.user;

    constructor() {
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe(() => {
            this.lang = this.getCurrentLang();
            // Close the user dropdown on any navigation
            this.userMenuOpen.set(false);
        });
    }

    ngOnInit() {
        this.lang = this.getCurrentLang();
    }

    get avatarUrl(): string | null {
        const user = this.user();
        if (!user?.avatar_url) return null;

        if (user.avatar_url.startsWith('/uploads/')) {
            const baseUrl = environment.apiUrl.replace('/api/v1', '');
            return `${baseUrl}${user.avatar_url}`;
        }
        return user.avatar_url;
    }

    get userInitials(): string {
        const currentUser = this.user();
        if (!currentUser) return 'U';

        const first = currentUser.first_name || '';
        const last = currentUser.last_name || '';

        if (!first && !last) {
            return currentUser.email?.charAt(0).toUpperCase() || 'U';
        }
        return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    }

    get userName(): string {
        const currentUser = this.user();
        if (!currentUser) return 'User';

        const first = currentUser.first_name || '';
        const last = currentUser.last_name || '';

        if (!first && !last) {
            return currentUser.email?.split('@')[0] || 'User';
        }
        return `${first} ${last}`.trim();
    }

    private getCurrentLang(): string {
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        return match ? match[1] : 'fr';
    }

    toggleDarkMode() {
        this.layoutService.layoutConfig.update((state) => {
            const currentMode = state.themeMode || 'system';
            const isCurrentlyDark = state.darkTheme ?? false;

            if (currentMode === 'system') {
                return {
                    ...state,
                    themeMode: isCurrentlyDark ? 'light' : 'dark',
                    darkTheme: !isCurrentlyDark
                };
            } else {
                return {
                    ...state,
                    themeMode: isCurrentlyDark ? 'light' : 'dark',
                    darkTheme: !isCurrentlyDark
                };
            }
        });
    }

    logout(): void {
        this.authService.logout();
    }

    navigateToAddAsset(): void {
        this.router.navigate(['/', this.lang, 'pages', 'patrimoine', 'add-asset']);
    }

    t(key: string): string {
        return this.i18n.t(key);
    }
}
