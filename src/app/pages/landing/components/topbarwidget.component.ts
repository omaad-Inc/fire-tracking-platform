import { Component, inject } from '@angular/core';
import { StyleClassModule } from 'primeng/styleclass';
import { Router, RouterModule } from '@angular/router';
import { RippleModule } from 'primeng/ripple';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { LayoutService } from '../../../layout/service/layout.service';
import { I18nService, Lang } from '../../../i18n/i18n.service';

@Component({
    selector: 'topbar-widget',
    standalone: true,
    imports: [RouterModule, StyleClassModule, ButtonModule, RippleModule, CommonModule],
    template: `
        <!-- Logo -->
        <a class="flex items-center gap-2 cursor-pointer group shrink-0" [routerLink]="[currentLang, 'landing']" fragment="home">
            <img src="assets/afrin-nexus-logo.svg" alt="Omaad Logo"
                     class="w-10 h-10 md:w-12 md:h-12 transition-transform duration-300 group-hover:scale-110">
            <span class="font-bold text-xl md:text-2xl text-surface-900 dark:text-surface-0 tracking-tight whitespace-nowrap">Omaad Wealth</span>
        </a>

        <!-- Desktop Navigation -->
        <nav class="hidden lg:flex items-center gap-2 mx-auto">
            <a (click)="navigateTo('home')" pRipple
               class="flex items-center px-4 py-2 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                      hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-indigo-600 dark:hover:text-indigo-400
                      transition-all duration-200 cursor-pointer">
                {{ t('landing.nav.home') }}
            </a>
            <a (click)="navigateTo('features')" pRipple
               class="flex items-center px-4 py-2 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                      hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-indigo-600 dark:hover:text-indigo-400
                      transition-all duration-200 cursor-pointer">
                {{ t('landing.nav.features') }}
            </a>
            <a (click)="navigateTo('highlights')" pRipple
               class="flex items-center px-4 py-2 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                      hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-indigo-600 dark:hover:text-indigo-400
                      transition-all duration-200 cursor-pointer">
                {{ t('landing.nav.highlights') }}
            </a>
            <a [routerLink]="[currentLang, 'advisory']" pRipple
               class="flex items-center px-4 py-2 rounded-lg font-medium text-base
                      text-indigo-600 dark:text-indigo-400
                      hover:bg-indigo-50 dark:hover:bg-indigo-900/30
                      transition-all duration-200 cursor-pointer">
                {{ t('landing.nav.advisory') }}
            </a>
            <a (click)="navigateTo('pricing')" pRipple
               class="flex items-center px-4 py-2 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                      hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-indigo-600 dark:hover:text-indigo-400
                      transition-all duration-200 cursor-pointer">
                {{ t('landing.nav.pricing') }}
            </a>
        </nav>

        <!-- Desktop CTA -->
        <div class="hidden lg:flex items-center gap-3 shrink-0">
            <!-- Language toggle -->
            <button (click)="switchLang()" pRipple
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-surface-300 dark:border-surface-600
                           text-sm font-semibold text-surface-700 dark:text-surface-200
                           hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200"
                    [title]="t('landing.lang.switchLabel')">
                <i class="pi pi-globe text-xs"></i>
                <span>{{ t('landing.lang.current') }}</span>
            </button>
            <!-- Theme toggle -->
            <button (click)="toggleDarkMode()" pRipple
                    class="w-9 h-9 rounded-full flex items-center justify-center
                           text-surface-600 dark:text-surface-300
                           hover:bg-surface-100 dark:hover:bg-surface-800
                           transition-all duration-200">
                <i [class]="layoutService.isDarkTheme() ? 'pi pi-sun text-base' : 'pi pi-moon text-base'"></i>
            </button>
            <button pButton pRipple [label]="t('landing.nav.login')"
                    [routerLink]="[currentLang, 'auth', 'login']"
                    [rounded]="true" [text]="true"
                    class="!font-medium !text-surface-700 dark:!text-surface-200 hover:!text-indigo-600 dark:hover:!text-indigo-400">
            </button>
            <button pButton pRipple [label]="t('landing.nav.register')"
                    [routerLink]="[currentLang, 'auth', 'register']"
                    [rounded]="true"
                    class="!bg-gradient-to-r !from-indigo-600 !to-cyan-500 !border-0 !font-semibold
                           hover:!shadow-lg hover:!shadow-indigo-500/25 transition-all duration-300">
            </button>
        </div>

        <!-- Mobile Menu Toggle -->
        <a pButton [text]="true" severity="secondary" [rounded]="true" pRipple
           class="lg:!hidden !p-2 shrink-0"
           pStyleClass="@next" enterFromClass="hidden" leaveToClass="hidden" [hideOnOutsideClick]="true">
            <i class="pi pi-bars !text-xl"></i>
        </a>

        <!-- Mobile Dropdown -->
        <div class="hidden lg:!hidden absolute left-0 right-0 top-full mx-4 mt-2 z-20 rounded-xl
                    bg-surface-0/95 dark:bg-surface-900/95 backdrop-blur-lg
                    shadow-lg border border-surface-200/50 dark:border-surface-700/50 p-4">
            <ul class="list-none p-0 m-0 flex flex-col gap-1">
                <li>
                    <a (click)="navigateTo('home')" pRipple
                       class="flex items-center px-4 py-3 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                              hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer">
                        <i class="pi pi-home mr-2"></i><span>{{ t('landing.nav.home') }}</span>
                    </a>
                </li>
                <li>
                    <a (click)="navigateTo('features')" pRipple
                       class="flex items-center px-4 py-3 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                              hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer">
                        <i class="pi pi-th-large mr-2"></i><span>{{ t('landing.nav.features') }}</span>
                    </a>
                </li>
                <li>
                    <a (click)="navigateTo('highlights')" pRipple
                       class="flex items-center px-4 py-3 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                              hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer">
                        <i class="pi pi-bolt mr-2"></i><span>{{ t('landing.nav.highlights') }}</span>
                    </a>
                </li>
                <li>
                    <a [routerLink]="[currentLang, 'advisory']" pRipple
                       class="flex items-center px-4 py-3 rounded-lg font-medium text-base
                              text-indigo-600 dark:text-indigo-400
                              hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-200 cursor-pointer">
                        <i class="pi pi-briefcase mr-2"></i><span>{{ t('landing.nav.advisory') }}</span>
                    </a>
                </li>
                <li>
                    <a (click)="navigateTo('pricing')" pRipple
                       class="flex items-center px-4 py-3 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                              hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer">
                        <i class="pi pi-tag mr-2"></i><span>{{ t('landing.nav.pricing') }}</span>
                    </a>
                </li>
            </ul>
            <div class="flex flex-col gap-2 border-t border-surface-200 dark:border-surface-700 pt-4 mt-4">
                <!-- Language toggle (mobile) -->
                <button (click)="switchLang()" pRipple
                        class="flex items-center gap-3 px-4 py-3 rounded-lg w-full
                               text-surface-700 dark:text-surface-200
                               hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer">
                    <i class="pi pi-globe"></i>
                    <span class="font-medium text-base">{{ t('landing.lang.switchLabel') }}</span>
                </button>
                <!-- Theme toggle (mobile) -->
                <button (click)="toggleDarkMode()" pRipple
                        class="flex items-center gap-3 px-4 py-3 rounded-lg w-full
                               text-surface-700 dark:text-surface-200
                               hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer">
                    <i [class]="layoutService.isDarkTheme() ? 'pi pi-sun' : 'pi pi-moon'"></i>
                    <span class="font-medium text-base">{{ layoutService.isDarkTheme() ? 'Mode clair' : 'Mode sombre' }}</span>
                </button>
                <button pButton pRipple [label]="t('landing.nav.login')"
                        [routerLink]="[currentLang, 'auth', 'login']"
                        [rounded]="true" [text]="true"
                        class="!font-medium !text-surface-700 dark:!text-surface-200 hover:!text-indigo-600 w-full justify-center">
                </button>
                <button pButton pRipple [label]="t('landing.nav.register')"
                        [routerLink]="[currentLang, 'auth', 'register']"
                        [rounded]="true"
                        class="!bg-gradient-to-r !from-indigo-600 !to-cyan-500 !border-0 !font-semibold
                               hover:!shadow-lg hover:!shadow-indigo-500/25 transition-all duration-300 w-full justify-center">
                </button>
            </div>
        </div>
    `
})
export class TopbarWidget {
    layoutService = inject(LayoutService);
    private i18n  = inject(I18nService);

    currentLang = '/fr';
    private lang: Lang = 'fr';

    constructor(public router: Router) {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        this.lang = (match ? match[1] : 'fr') as Lang;
        this.currentLang = '/' + this.lang;
        // Ensure service lang matches URL (in case localStorage differs)
        this.i18n.setLang(this.lang);
    }

    t(key: string): string { return this.i18n.t(key); }

    navigateTo(fragment: string) {
        this.router.navigate([this.currentLang + '/landing'], { fragment });
    }

    switchLang() {
        const newLang: Lang = this.lang === 'fr' ? 'en' : 'fr';
        // Update the service signal FIRST so all components re-render immediately
        this.i18n.setLang(newLang);
        this.lang = newLang;
        this.currentLang = '/' + newLang;
        // Stay on the current page — just swap the language prefix in the URL
        const currentUrl = this.router.url;
        const newUrl = currentUrl.replace(/^\/(fr|en)/, '/' + newLang);
        this.router.navigateByUrl(newUrl);
    }

    toggleDarkMode() {
        this.layoutService.layoutConfig.update((state) => ({
            ...state,
            themeMode: state.darkTheme ? 'light' : 'dark',
            darkTheme: !state.darkTheme
        }));
    }
}
