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
                <svg viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 lg:w-14 lg:h-14 transition-all duration-200">
                    <g transform="translate(0,300) scale(0.1,-0.1)" fill="var(--primary-color)" stroke="none">
                        <path d="M1655 2196 c-369 -369 -532 -540 -505 -526 14 7 178 165 365 351 188
                    187 344 339 348 339 4 0 7 -52 7 -115 l0 -114 -219 -221 c-121 -121 -223 -229
                    -226 -240 -6 -19 -16 -20 -161 -20 l-154 0 0 -230 0 -230 178 0 177 0 218 218
                    217 217 0 150 0 150 -301 -300 c-201 -200 -299 -292 -295 -275 3 14 6 53 6 88
                    l0 63 57 -2 56 -3 -2 74 -2 73 241 242 241 241 -3 156 -3 156 -240 -242z m205
                    -468 l0 -92 -203 -203 -202 -203 -152 0 -152 0 -6 43 c-7 53 0 321 9 336 5 7
                    47 11 112 11 103 0 105 0 116 -26 16 -35 0 -57 -46 -65 -20 -3 -43 -15 -51
                    -25 -18 -23 -20 -123 -3 -159 25 -56 46 -41 313 225 137 137 253 250 258 250
                    4 0 7 -41 7 -92z"/>
                        <path d="M520 827 l0 -182 40 0 40 0 0 72 0 73 80 0 80 0 0 36 0 36 -80 -4
                    -80 -3 0 43 0 42 90 0 90 0 0 35 0 35 -130 0 -130 0 0 -183z"/>
                        <path d="M842 829 l3 -181 38 -3 37 -2 0 184 0 183 -40 0 -40 0 2 -181z"/>
                        <path d="M1010 827 l0 -184 38 2 37 3 -4 128 -3 129 77 -120 c42 -66 80 -124
                    85 -129 5 -5 25 -10 44 -11 l36 -2 0 184 0 183 -36 0 -35 0 3 -125 c2 -69 2
                    -125 1 -125 -1 0 -38 56 -83 125 -82 125 -82 125 -121 125 l-39 0 0 -183z"/>
                        <path d="M1485 991 c-155 -96 -108 -334 70 -349 29 -2 69 1 88 7 46 16 104 80
                    113 126 17 91 -22 187 -89 218 -48 23 -143 22 -182 -2z"/>
                        <path d="M1780 1003 c0 -5 29 -86 64 -182 l63 -174 44 0 43 0 58 159 c31 87
                    62 169 67 182 10 21 8 22 -32 22 l-43 0 -46 -137 c-25 -76 -48 -131 -51 -123
                    -3 8 -25 70 -48 138 l-42 122 -38 0 c-22 0 -39 -3 -39 -7z"/>
                        <path d="M2166 838 c-37 -95 -70 -178 -72 -185 -4 -8 7 -11 37 -8 38 3 44 6
                    57 39 l14 36 72 0 73 0 11 -38 c11 -35 14 -37 52 -37 22 0 40 1 40 4 0 2 -29
                    79 -65 172 -36 92 -65 172 -65 178 0 6 -19 11 -44 11 l-43 0 -67 -172z"/>
                    </g>
                </svg>
                <!-- Hide text on mobile -->
                <span class="hidden lg:inline">Finova</span>
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
                                <a href="https://help.finova.com" target="_blank" class="flex items-center gap-3 px-4 py-3 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer">
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
