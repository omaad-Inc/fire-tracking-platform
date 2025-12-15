import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { AppConfigurator } from './app.configurator';
import { LayoutService } from '../service/layout.service';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { I18nService } from '../../i18n/i18n.service';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, CommonModule, StyleClassModule, AppConfigurator, AvatarModule, DividerModule],
    template: ` <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <!-- Hamburger menu - hidden on mobile -->
            <button class="layout-menu-button layout-topbar-action hidden lg:flex" (click)="layoutService.onMenuToggle()">
                <i class="pi pi-bars"></i>
            </button>
            <a class="layout-topbar-logo flex items-center gap-2" routerLink="/">

                <svg
                    viewBox="0 0 54 40"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    preserveAspectRatio="xMidYMid meet"
                    >
                    <!-- Outer orbit arcs -->
                    <path
                        d="M6 20C8 7 46 6 48 20"
                        stroke="var(--primary-color)"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        opacity="0.85"
                    />

                    <path
                        d="M48 20C46 33 8 34 6 20"
                        stroke="var(--primary-color)"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        opacity="0.45"
                    />

                    <!-- Africa silhouette (more accurate proportions) -->
                    <path
                        d="M26 8
                        C23 9 21 12 20 15
                        C19 18 20 21 21 24
                        C22 27 24 30 27 32
                        C29 30 31 27 32 24
                        C33 21 34 18 33 15
                        C32 12 30 10 28 9
                        C27 8.5 26.5 8.2 26 8
                        Z"
                        fill="var(--primary-color)"
                        opacity="0.35"
                    />

                    <!-- Central 8-point star -->
                    <path
                        d="M27 13
                        L29.5 18
                        L35 20
                        L29.5 22
                        L27 27
                        L24.5 22
                        L19 20
                        L24.5 18
                        Z"
                        stroke="var(--primary-color)"
                        stroke-width="1.3"
                        fill="none"
                        stroke-linejoin="round"
                    />

                    <!-- Connection lines -->
                    <path
                        d="M27 20 L27 7"
                        stroke="var(--primary-color)"
                        stroke-width="1"
                        opacity="0.6"
                    />
                    <path
                        d="M27 20 L44 20"
                        stroke="var(--primary-color)"
                        stroke-width="1"
                        opacity="0.6"
                    />
                    <path
                        d="M27 20 L27 33"
                        stroke="var(--primary-color)"
                        stroke-width="1"
                        opacity="0.6"
                    />
                    <path
                        d="M27 20 L10 20"
                        stroke="var(--primary-color)"
                        stroke-width="1"
                        opacity="0.6"
                    />

                    <!-- Orbit nodes -->
                    <circle cx="27" cy="6.5" r="1.2" fill="var(--primary-color)" />
                    <circle cx="45.5" cy="20" r="1.2" fill="var(--primary-color)" />
                    <circle cx="27" cy="33.5" r="1.2" fill="var(--primary-color)" />
                    <circle cx="8.5" cy="20" r="1.2" fill="var(--primary-color)" />
                </svg>




                <!-- Hide text on mobile -->
                <span class="hidden lg:inline">Afrin Nexus</span>
            </a>
        </div>

        <div class="layout-topbar-actions">
            <div class="layout-config-menu">
                <button type="button" class="layout-topbar-action" (click)="toggleDarkMode()">
                    <i [ngClass]="{ 'pi ': true, 'pi-moon': layoutService.isDarkTheme(), 'pi-sun': !layoutService.isDarkTheme() }"></i>
                </button>
                <!-- Palette config - hidden on mobile -->
                <div class="relative hidden lg:block">
                    <button
                        class="layout-topbar-action layout-topbar-action-highlight"
                        pStyleClass="@next"
                        enterFromClass="hidden"
                        enterActiveClass="animate-scalein"
                        leaveToClass="hidden"
                        leaveActiveClass="animate-fadeout"
                        [hideOnOutsideClick]="true"
                    >
                        <i class="pi pi-palette"></i>
                    </button>
                    <app-configurator />
                </div>
            </div>

            <!-- Mobile ONLY: Simple user icon - redirects directly to settings -->
            <a 
                [routerLink]="['/'+lang, 'pages', 'settings', 'account']" 
                class="layout-topbar-action mobile-user-icon items-center justify-center"
            >
                <div class="w-9 h-9 rounded-full bg-surface-800 dark:bg-surface-700 flex items-center justify-center">
                    <i class="pi pi-user text-surface-200"></i>
                </div>
            </a>

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
                            pStyleClass="@next"
                            enterFromClass="hidden"
                            enterActiveClass="animate-scalein"
                            leaveToClass="hidden"
                            leaveActiveClass="animate-fadeout"
                            [hideOnOutsideClick]="true"
                        >
                            <p-avatar 
                                label="MS" 
                                shape="circle" 
                                [style]="{ 'background': 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)', 'color': 'white', 'font-weight': '600', 'font-size': '0.75rem' }"
                                size="normal"
                            />
                        </button>
                        <!-- User Dropdown Menu -->
                        <div class="hidden absolute top-[3.25rem] right-0 w-72 bg-surface-0 dark:bg-surface-900 border border-surface rounded-xl origin-top shadow-xl overflow-hidden z-50">
                            <!-- User Header -->
                            <div class="p-4 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 border-b border-surface">
                                <div class="flex items-center gap-3">
                                    <p-avatar 
                                        label="MS" 
                                        shape="circle" 
                                        size="large"
                                        [style]="{ 'background': 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)', 'color': 'white', 'font-weight': '600' }"
                                    />
                                    <div class="flex-1 min-w-0">
                                        <div class="font-semibold text-surface-900 dark:text-surface-0 truncate">Mbaye Sene</div>
                                        <div class="text-sm text-surface-500 dark:text-surface-400 truncate">mbaye.sene&#64;email.com</div>
                                    </div>
                                    <i class="pi pi-chevron-right text-surface-400"></i>
                                </div>
                            </div>
                            
                            <!-- Menu Items -->
                            <div class="py-2">
                                <a [routerLink]="['/'+lang, 'pages', 'settings', 'account']" class="flex items-center gap-3 px-4 py-3 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer">
                                    <i class="pi pi-user text-indigo-500"></i>
                                    <span class="text-surface-700 dark:text-surface-200">{{ t('menu.myAccount') }}</span>
                                </a>
                                <a [routerLink]="['/'+lang, 'pages', 'settings', 'security']" class="flex items-center gap-3 px-4 py-3 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer">
                                    <i class="pi pi-shield text-cyan-500"></i>
                                    <span class="text-surface-700 dark:text-surface-200">{{ t('menu.security') }}</span>
                                </a>
                                <a [routerLink]="['/'+lang, 'pages', 'settings', 'preferences']" class="flex items-center gap-3 px-4 py-3 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer">
                                    <i class="pi pi-cog text-emerald-500"></i>
                                    <span class="text-surface-700 dark:text-surface-200">{{ t('menu.preferences') }}</span>
                                </a>
                            </div>

                            <p-divider styleClass="!my-0" />

                            <!-- Help Section -->
                            <div class="py-2">
                                <a href="https://help.afrinnexus.app" target="_blank" class="flex items-center gap-3 px-4 py-3 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer">
                                    <i class="pi pi-question-circle text-amber-500"></i>
                                    <span class="text-surface-700 dark:text-surface-200">{{ t('settings.getHelp') }}</span>
                                    <i class="pi pi-external-link text-xs text-surface-400 ml-auto"></i>
                                </a>
                            </div>

                            <p-divider styleClass="!my-0" />

                            <!-- Logout -->
                            <div class="py-2">
                                <a [routerLink]="['/'+lang, 'auth', 'login']" class="flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer group">
                                    <i class="pi pi-sign-out text-red-500"></i>
                                    <span class="text-red-500 group-hover:text-red-600">{{ t('topbar.logout') }}</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`
})
export class AppTopbar implements OnInit {
    items!: MenuItem[];
    lang = 'fr';

    constructor(
        public layoutService: LayoutService, 
        private router: Router,
        private i18n: I18nService
    ) {
        // Listen to route changes to update language
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe(() => {
            this.lang = this.getCurrentLang();
        });
    }

    ngOnInit() {
        this.lang = this.getCurrentLang();
    }

    private getCurrentLang(): string {
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        return match ? match[1] : 'fr';
    }

    toggleDarkMode() {
        this.layoutService.layoutConfig.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
    }

    t(key: string): string {
        return this.i18n.t(key);
    }
}
