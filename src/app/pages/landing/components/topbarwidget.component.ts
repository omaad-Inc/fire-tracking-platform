import { Component, inject, signal } from '@angular/core';
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
        <!-- Logo (pulled flush-left, Finary-style) -->
        <a class="flex items-center gap-2 cursor-pointer group shrink-0 -ml-4 md:-ml-8 lg:-ml-16" [routerLink]="[currentLang, 'landing']" fragment="home">
            <img src="assets/brand/omaad-icon.svg" alt="Omaad Logo"
                     class="w-10 h-10 md:w-12 md:h-12 transition-transform duration-300 group-hover:scale-110">
            <span class="font-bold text-xl md:text-2xl text-surface-900 dark:text-surface-0 tracking-tight whitespace-nowrap">{{ isAdvisory() ? 'Omaad Advisory' : 'Omaad Wealth' }}</span>
        </a>

        <!-- Desktop Navigation -->
        <nav class="hidden lg:flex items-center gap-2 mx-auto">
            <a (click)="navigateTo('home')" pRipple
               class="flex items-center px-4 py-2 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                      hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-brand-700 dark:hover:text-brand-200
                      transition-all duration-200 cursor-pointer">
                {{ t('landing.nav.home') }}
            </a>
            <a (click)="navigateTo('features')" pRipple
               class="flex items-center px-4 py-2 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                      hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-brand-700 dark:hover:text-brand-200
                      transition-all duration-200 cursor-pointer">
                {{ t('landing.nav.features') }}
            </a>
            <a [routerLink]="[currentLang, 'advisory']" pRipple
               class="flex items-center px-4 py-2 rounded-lg font-medium text-base
                      text-brand-700 dark:text-brand-300
                      hover:bg-brand-50 dark:hover:bg-brand-700/30 hover:text-brand-900 dark:hover:text-brand-200
                      transition-all duration-200 cursor-pointer">
                {{ t('landing.nav.advisory') }}
            </a>
            <a (click)="navigateTo('pricing')" pRipple
               class="flex items-center px-4 py-2 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                      hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-brand-700 dark:hover:text-brand-200
                      transition-all duration-200 cursor-pointer">
                {{ t('landing.nav.pricing') }}
            </a>
            <a [routerLink]="[currentLang, aboutSlug]" pRipple
               class="flex items-center px-4 py-2 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                      hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-brand-700 dark:hover:text-brand-200
                      transition-all duration-200 cursor-pointer">
                {{ t('landing.nav.about') }}
            </a>
            <!-- Resources dropdown -->
            <div class="relative" (mouseenter)="toolsOpen.set(true)" (mouseleave)="toolsOpen.set(false)">
                <a pRipple
                   class="flex items-center gap-1 px-4 py-2 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                          hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-brand-700 dark:hover:text-brand-200
                          transition-all duration-200 cursor-pointer">
                    {{ _('Ressources', 'Resources') }}
                    <i class="pi pi-chevron-down text-[10px] ml-0.5 transition-transform duration-200"
                       [class.rotate-180]="toolsOpen()"></i>
                </a>
                <div [class.hidden]="!toolsOpen()"
                     class="absolute top-full left-0 mt-1 w-72 rounded-xl
                            bg-surface-0 dark:bg-surface-800
                            shadow-lg border border-surface-200 dark:border-surface-700
                            p-2 z-30">
                    <a [routerLink]="[currentLang, 'blog']" pRipple
                       class="flex items-center gap-3 px-4 py-3 rounded-lg
                              hover:bg-surface-100 dark:hover:bg-surface-700 transition-all cursor-pointer">
                        <div class="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center shrink-0">
                            <i class="pi pi-book text-brand-700 dark:text-brand-300 text-sm"></i>
                        </div>
                        <div>
                            <div class="text-sm font-medium text-surface-900 dark:text-surface-0">Blog</div>
                            <div class="text-xs text-surface-500 dark:text-surface-400">{{ _('Toutes les éditions FIRE Africa', 'All FIRE Africa editions') }}</div>
                        </div>
                    </a>
                    <a [routerLink]="[currentLang, 'tools', 'fire-simulator']" pRipple
                       class="flex items-center gap-3 px-4 py-3 rounded-lg
                              hover:bg-surface-100 dark:hover:bg-surface-700 transition-all cursor-pointer">
                        <div class="w-9 h-9 rounded-lg bg-ochre-100 dark:bg-ochre-700/20 flex items-center justify-center shrink-0">
                            <span class="text-base">🔥</span>
                        </div>
                        <div>
                            <div class="text-sm font-medium text-surface-900 dark:text-surface-0">{{ _('Simulateur FIRE', 'FIRE Simulator') }}</div>
                            <div class="text-xs text-surface-500 dark:text-surface-400">{{ _('Calcule ton objectif d\u2019indépendance financière', 'Calculate your financial independence goal') }}</div>
                        </div>
                    </a>
                    <a [routerLink]="[currentLang, 'tools', 'compound-interest']" pRipple
                       class="flex items-center gap-3 px-4 py-3 rounded-lg
                              hover:bg-surface-100 dark:hover:bg-surface-700 transition-all cursor-pointer">
                        <div class="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center shrink-0">
                            <i class="pi pi-chart-bar text-brand-700 dark:text-brand-300 text-sm"></i>
                        </div>
                        <div>
                            <div class="text-sm font-medium text-surface-900 dark:text-surface-0">{{ _('Intérêts composés', 'Compound Interest') }}</div>
                            <div class="text-xs text-surface-500 dark:text-surface-400">{{ _('Visualise la puissance des intérêts composés', 'Visualize the power of compound interest') }}</div>
                        </div>
                    </a>
                </div>
            </div>
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
            <button pButton pRipple [label]="t('landing.nav.login')"
                    [routerLink]="[currentLang, 'auth', 'login']"
                    [rounded]="true" [text]="true"
                    class="!font-medium !text-surface-700 dark:!text-surface-200 hover:!text-brand-700 dark:text-brand-300 dark:hover:!text-brand-700 dark:text-brand-300">
            </button>
            <button pButton pRipple [label]="t('landing.nav.register')"
                    [routerLink]="[currentLang, 'auth', 'register']"
                    [rounded]="true"
                    class="!bg-gradient-to-r !from-brand-700 !to-brand-500 dark:!from-ochre-500 dark:!to-ochre-400 !border-0 !font-semibold
                           dark:!text-warm-900 hover:!shadow-lg hover:!shadow-card transition-all duration-300">
            </button>
        </div>

        <!-- Mobile Menu Toggle -->
        <a pButton [text]="true" severity="secondary" [rounded]="true" pRipple
           class="lg:!hidden !p-2 shrink-0"
           (click)="mobileMenuOpen.set(!mobileMenuOpen())">
            <i class="pi !text-xl" [ngClass]="mobileMenuOpen() ? 'pi-times' : 'pi-bars'"></i>
        </a>

        <!-- Mobile Dropdown -->
        <div [class.hidden]="!mobileMenuOpen()"
             class="lg:!hidden absolute left-0 right-0 top-full mx-4 mt-2 z-20 rounded-xl
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
                    <a [routerLink]="[currentLang, 'advisory']" pRipple
                       class="flex items-center px-4 py-3 rounded-lg font-medium text-base
                              text-brand-700 dark:text-brand-300
                              hover:bg-brand-50 dark:hover:bg-brand-700/30 hover:text-brand-900 dark:hover:text-brand-200
                              transition-all duration-200 cursor-pointer">
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
                <li>
                    <a [routerLink]="[currentLang, aboutSlug]" (click)="mobileMenuOpen.set(false)" pRipple
                       class="flex items-center px-4 py-3 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                              hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer">
                        <i class="pi pi-info-circle mr-2"></i><span>{{ t('landing.nav.about') }}</span>
                    </a>
                </li>
                <!-- Resources (mobile) -->
                <li class="border-t border-surface-200 dark:border-surface-700 pt-2 mt-1">
                    <span class="px-4 py-1 text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                        {{ _('Ressources', 'Resources') }}
                    </span>
                </li>
                <li>
                    <a [routerLink]="[currentLang, 'blog']" (click)="mobileMenuOpen.set(false)" pRipple
                       class="flex items-center px-4 py-3 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                              hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer">
                        <i class="pi pi-book mr-2"></i><span>Blog</span>
                    </a>
                </li>
                <li>
                    <a [routerLink]="[currentLang, 'tools', 'fire-simulator']" (click)="mobileMenuOpen.set(false)" pRipple
                       class="flex items-center px-4 py-3 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                              hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer">
                        <span class="mr-2">🔥</span><span>{{ _('Simulateur FIRE', 'FIRE Simulator') }}</span>
                    </a>
                </li>
                <li>
                    <a [routerLink]="[currentLang, 'tools', 'compound-interest']" (click)="mobileMenuOpen.set(false)" pRipple
                       class="flex items-center px-4 py-3 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                              hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer">
                        <i class="pi pi-chart-bar mr-2"></i><span>{{ _('Intérêts composés', 'Compound Interest') }}</span>
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
                <button pButton pRipple [label]="t('landing.nav.login')"
                        [routerLink]="[currentLang, 'auth', 'login']"
                        [rounded]="true" [text]="true"
                        class="!font-medium !text-surface-700 dark:!text-surface-200 hover:!text-brand-700 dark:text-brand-300 w-full justify-center">
                </button>
                <button pButton pRipple [label]="t('landing.nav.register')"
                        [routerLink]="[currentLang, 'auth', 'register']"
                        [rounded]="true"
                        class="!bg-gradient-to-r !from-brand-700 !to-brand-500 dark:!from-ochre-500 dark:!to-ochre-400 !border-0 !font-semibold
                               dark:!text-warm-900 hover:!shadow-lg hover:!shadow-card transition-all duration-300 w-full justify-center">
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
    mobileMenuOpen = signal(false);
    toolsOpen = signal(false);

    constructor(public router: Router) {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        this.lang = (match ? match[1] : 'fr') as Lang;
        this.currentLang = '/' + this.lang;
        // Ensure service lang matches URL (in case localStorage differs)
        this.i18n.setLang(this.lang);
        // Public pages (landing, advisory, tools, blog...) are always light-themed —
        // the dark/light selector lives inside the authenticated app's settings.
        this.layoutService.layoutConfig.update((state) => ({
            ...state,
            themeMode: 'light',
            darkTheme: false,
        }));
    }

    t(key: string): string { return this.i18n.t(key); }
    _(fr: string, en: string): string { return this.i18n.lang() === 'fr' ? fr : en; }
    get aboutSlug(): string { return this.i18n.lang() === 'fr' ? 'qui-sommes-nous' : 'about'; }

    isAdvisory(): boolean { return this.router.url.includes('/advisory'); }

    navigateTo(fragment: string) {
        this.mobileMenuOpen.set(false);
        this.router.navigate([this.currentLang + '/landing'], { fragment });
    }

    switchLang() {
        this.mobileMenuOpen.set(false);
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

}
