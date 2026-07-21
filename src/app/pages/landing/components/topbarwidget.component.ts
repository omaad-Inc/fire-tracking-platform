import { Component, inject, signal, computed } from '@angular/core';
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
        <a class="flex items-center gap-2 cursor-pointer group shrink-0" [routerLink]="[currentLang, 'landing']" fragment="home">
            <img src="assets/brand/omaad-icon.svg" alt="Omaad Logo"
                     class="w-10 h-10 md:w-12 md:h-12">
            <span class="font-bold text-xl md:text-2xl text-surface-900 dark:text-surface-0 tracking-tight whitespace-nowrap">Omaad</span>
        </a>

        <!-- Desktop Navigation -->
        <nav class="hidden lg:flex items-center gap-2 mx-auto" [attr.aria-label]="_('Navigation principale', 'Main navigation')">
            <a [routerLink]="[currentLang, 'landing']" fragment="home" pRipple
               class="flex items-center px-4 py-2 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base no-underline whitespace-nowrap
                      hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-brand-700 dark:hover:text-brand-200
                      transition-all duration-200 cursor-pointer">
                {{ t('landing.nav.home') }}
            </a>
            <a [routerLink]="[currentLang, 'landing']" fragment="features" pRipple
               class="flex items-center px-4 py-2 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base no-underline whitespace-nowrap
                      hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-brand-700 dark:hover:text-brand-200
                      transition-all duration-200 cursor-pointer">
                {{ t('landing.nav.features') }}
            </a>
            <a [routerLink]="[currentLang, 'landing']" fragment="pricing" pRipple
               class="flex items-center px-4 py-2 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base no-underline whitespace-nowrap
                      hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-brand-700 dark:hover:text-brand-200
                      transition-all duration-200 cursor-pointer">
                {{ t('landing.nav.pricing') }}
            </a>
            <!-- Resources disclosure (click-toggle; hover for mouse) -->
            <div class="relative" (mouseenter)="toolsOpen.set(true)" (mouseleave)="toolsOpen.set(false)"
                 (keydown.escape)="toolsOpen.set(false)">
                <button type="button" pRipple
                   (click)="toolsOpen.set(!toolsOpen()); aboutOpen.set(false)"
                   aria-haspopup="true" [attr.aria-expanded]="toolsOpen()"
                   class="flex items-center gap-1 px-4 py-2 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base bg-transparent border-0 whitespace-nowrap
                          hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-brand-700 dark:hover:text-brand-200
                          transition-all duration-200 cursor-pointer">
                    {{ _('Ressources', 'Resources') }}
                    <i class="pi pi-chevron-down text-[10px] ml-0.5 transition-transform duration-200"
                       [class.rotate-180]="toolsOpen()"></i>
                </button>
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
                    <a routerLink="/outils/comparateur-sgi-brvm" pRipple
                       class="flex items-center gap-3 px-4 py-3 rounded-lg
                              hover:bg-surface-100 dark:hover:bg-surface-700 transition-all cursor-pointer">
                        <div class="w-9 h-9 rounded-lg bg-ochre-100 dark:bg-ochre-700/20 flex items-center justify-center shrink-0">
                            <span class="text-base">🏦</span>
                        </div>
                        <div>
                            <div class="text-sm font-medium text-surface-900 dark:text-surface-0">{{ _('Comparateur SGI BRVM', 'BRVM Broker Comparator') }}</div>
                            <div class="text-xs text-surface-500 dark:text-surface-400">{{ _('Compare les frais des 41 SGI de la BRVM', 'Compare fees of all 41 BRVM brokers') }}</div>
                        </div>
                    </a>
                </div>
            </div>
            <!-- About disclosure (click-toggle; hover for mouse) -->
            <div class="relative" (mouseenter)="aboutOpen.set(true)" (mouseleave)="aboutOpen.set(false)"
                 (keydown.escape)="aboutOpen.set(false)">
                <button type="button" pRipple
                   (click)="aboutOpen.set(!aboutOpen()); toolsOpen.set(false)"
                   aria-haspopup="true" [attr.aria-expanded]="aboutOpen()"
                   class="flex items-center gap-1 px-4 py-2 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base bg-transparent border-0 whitespace-nowrap
                          hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-brand-700 dark:hover:text-brand-200
                          transition-all duration-200 cursor-pointer">
                    {{ t('landing.nav.about') }}
                    <i class="pi pi-chevron-down text-[10px] ml-0.5 transition-transform duration-200"
                       [class.rotate-180]="aboutOpen()"></i>
                </button>
                <div [class.hidden]="!aboutOpen()"
                     class="absolute top-full left-0 mt-1 w-[36rem] rounded-2xl
                            bg-surface-0 dark:bg-surface-800
                            shadow-lg border border-surface-200 dark:border-surface-700
                            p-3 z-30">
                    <div class="grid grid-cols-2 gap-3">
                        <!-- PART 1, featured team card (generic placeholder, swap for real team photo later) -->
                        <a [routerLink]="[currentLang, aboutSlug]" (click)="aboutOpen.set(false)" pRipple
                           class="group block rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700
                                  hover:border-brand-500/50 dark:hover:border-ochre-500/50 transition-all duration-200">
                            <div class="relative h-36 flex items-center justify-center bg-brand-50 dark:bg-surface-900 overflow-hidden">
                                <div class="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-brand-500/10 blur-2xl"></div>
                                <i class="pi pi-users text-5xl text-brand-700/60 dark:text-ochre-300/60 relative"></i>
                            </div>
                            <div class="p-3">
                                <div class="text-sm font-semibold text-surface-900 dark:text-surface-0">{{ t('landing.nav.aboutTeam') }}</div>
                                <div class="text-xs text-surface-500 dark:text-surface-400 mt-0.5 leading-snug">{{ t('landing.nav.aboutTeamDesc') }}</div>
                            </div>
                        </a>

                        <!-- PART 2, links list -->
                        <div class="flex flex-col">
                            <span class="px-3 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                                {{ _('Découvrir', 'Discover') }}
                            </span>
                            <a [routerLink]="[currentLang, aboutSlug]" fragment="securite" (click)="aboutOpen.set(false)" pRipple
                               class="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-all cursor-pointer">
                                <div class="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center shrink-0">
                                    <i class="pi pi-shield text-brand-700 dark:text-brand-300 text-sm"></i>
                                </div>
                                <div>
                                    <div class="text-sm font-medium text-surface-900 dark:text-surface-0">{{ t('landing.nav.aboutSecurity') }}</div>
                                    <div class="text-xs text-surface-500 dark:text-surface-400 leading-snug">{{ t('landing.nav.aboutSecurityDesc') }}</div>
                                </div>
                            </a>
                            <a [routerLink]="[currentLang, aboutSlug]" fragment="principes" (click)="aboutOpen.set(false)" pRipple
                               class="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-all cursor-pointer">
                                <div class="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center shrink-0">
                                    <i class="pi pi-compass text-brand-700 dark:text-brand-300 text-sm"></i>
                                </div>
                                <div>
                                    <div class="text-sm font-medium text-surface-900 dark:text-surface-0">{{ t('landing.nav.aboutPrinciples') }}</div>
                                    <div class="text-xs text-surface-500 dark:text-surface-400 leading-snug">{{ _('Ce qui guide nos décisions produit.', 'What guides our product decisions.') }}</div>
                                </div>
                            </a>
                            <a [routerLink]="[currentLang, aboutSlug]" fragment="contact" (click)="aboutOpen.set(false)" pRipple
                               class="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-all cursor-pointer">
                                <div class="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center shrink-0">
                                    <i class="pi pi-envelope text-brand-700 dark:text-brand-300 text-sm"></i>
                                </div>
                                <div>
                                    <div class="text-sm font-medium text-surface-900 dark:text-surface-0">{{ t('landing.nav.aboutContact') }}</div>
                                    <div class="text-xs text-surface-500 dark:text-surface-400 leading-snug">{{ _('Une question, une idée ? Écrivez-nous.', 'A question or idea? Reach out.') }}</div>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Desktop CTA -->
        <div class="hidden lg:flex items-center gap-3 shrink-0">
            <!-- Theme toggle -->
            <button (click)="toggleDarkMode()" pRipple
                    class="flex items-center justify-center w-9 h-9 rounded-full border border-surface-300 dark:border-surface-600
                           text-surface-700 dark:text-surface-200
                           hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200"
                    [title]="isDark() ? _('Mode clair', 'Light mode') : _('Mode sombre', 'Dark mode')">
                <i class="pi text-sm" [ngClass]="isDark() ? 'pi-sun' : 'pi-moon'"></i>
            </button>
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
                    class="!bg-ochre-500 hover:!bg-ochre-400 !text-warm-900 !border-0 !font-semibold
                           hover:!shadow-lg transition-all duration-300">
            </button>
        </div>

        <!-- Mobile Menu Toggle -->
        <button type="button" pButton [text]="true" severity="secondary" [rounded]="true" pRipple
           class="lg:!hidden !p-2 shrink-0"
           aria-haspopup="true" [attr.aria-expanded]="mobileMenuOpen()"
           [attr.aria-label]="_('Menu', 'Menu')"
           (click)="mobileMenuOpen.set(!mobileMenuOpen())">
            <i class="pi !text-xl" [ngClass]="mobileMenuOpen() ? 'pi-times' : 'pi-bars'"></i>
        </button>

        <!-- Mobile Dropdown -->
        <div [class.hidden]="!mobileMenuOpen()"
             class="lg:!hidden absolute left-0 right-0 top-full mx-4 mt-2 z-20 rounded-xl
                    bg-surface-0/95 dark:bg-surface-900/95 backdrop-blur-lg
                    shadow-lg border border-surface-200/50 dark:border-surface-700/50 p-4">
            <ul class="list-none p-0 m-0 flex flex-col gap-1">
                <li>
                    <a [routerLink]="[currentLang, 'landing']" fragment="home" (click)="mobileMenuOpen.set(false)" pRipple
                       class="flex items-center px-4 py-3 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base no-underline
                              hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer">
                        <i class="pi pi-home mr-2"></i><span>{{ t('landing.nav.home') }}</span>
                    </a>
                </li>
                <li>
                    <a [routerLink]="[currentLang, 'landing']" fragment="features" (click)="mobileMenuOpen.set(false)" pRipple
                       class="flex items-center px-4 py-3 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base no-underline
                              hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer">
                        <i class="pi pi-th-large mr-2"></i><span>{{ t('landing.nav.features') }}</span>
                    </a>
                </li>
                <li>
                    <a [routerLink]="[currentLang, 'landing']" fragment="pricing" (click)="mobileMenuOpen.set(false)" pRipple
                       class="flex items-center px-4 py-3 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base no-underline
                              hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer">
                        <i class="pi pi-tag mr-2"></i><span>{{ t('landing.nav.pricing') }}</span>
                    </a>
                </li>
                <!-- About (mobile) -->
                <li class="border-t border-surface-200 dark:border-surface-700 pt-2 mt-1">
                    <span class="px-4 py-1 text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                        {{ t('landing.nav.about') }}
                    </span>
                </li>
                <li>
                    <a [routerLink]="[currentLang, aboutSlug]" (click)="mobileMenuOpen.set(false)" pRipple
                       class="flex items-center px-4 py-3 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                              hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer">
                        <i class="pi pi-users mr-2"></i><span>{{ t('landing.nav.aboutTeam') }}</span>
                    </a>
                </li>
                <li>
                    <a [routerLink]="[currentLang, aboutSlug]" fragment="securite" (click)="mobileMenuOpen.set(false)" pRipple
                       class="flex items-center px-4 py-3 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                              hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer">
                        <i class="pi pi-shield mr-2"></i><span>{{ t('landing.nav.aboutSecurity') }}</span>
                    </a>
                </li>
                <li>
                    <a [routerLink]="[currentLang, aboutSlug]" fragment="principes" (click)="mobileMenuOpen.set(false)" pRipple
                       class="flex items-center px-4 py-3 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                              hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer">
                        <i class="pi pi-compass mr-2"></i><span>{{ t('landing.nav.aboutPrinciples') }}</span>
                    </a>
                </li>
                <li>
                    <a [routerLink]="[currentLang, aboutSlug]" fragment="contact" (click)="mobileMenuOpen.set(false)" pRipple
                       class="flex items-center px-4 py-3 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                              hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer">
                        <i class="pi pi-envelope mr-2"></i><span>{{ t('landing.nav.aboutContact') }}</span>
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
                <li>
                    <a routerLink="/outils/comparateur-sgi-brvm" (click)="mobileMenuOpen.set(false)" pRipple
                       class="flex items-center px-4 py-3 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                              hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer">
                        <span class="mr-2">🏦</span><span>{{ _('Comparateur SGI BRVM', 'BRVM Broker Comparator') }}</span>
                    </a>
                </li>
            </ul>
            <div class="flex flex-col gap-2 border-t border-surface-200 dark:border-surface-700 pt-4 mt-4">
                <!-- Language toggle (mobile) -->
                <button (click)="toggleDarkMode()" pRipple
                        class="flex items-center gap-3 px-4 py-3 rounded-lg w-full
                               text-surface-700 dark:text-surface-200
                               hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer">
                    <i class="pi" [ngClass]="isDark() ? 'pi-sun' : 'pi-moon'"></i>
                    <span class="font-medium text-base">{{ isDark() ? _('Mode clair', 'Light mode') : _('Mode sombre', 'Dark mode') }}</span>
                </button>
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
                        class="!bg-ochre-500 hover:!bg-ochre-400 !text-warm-900 !border-0 !font-semibold
                               hover:!shadow-lg transition-all duration-300 w-full justify-center">
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
    aboutOpen = signal(false);
    isDark = computed(() => this.layoutService.layoutConfig()?.darkTheme ?? false);

    constructor(public router: Router) {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        this.lang = (match ? match[1] : 'fr') as Lang;
        this.currentLang = '/' + this.lang;
        // Ensure service lang matches URL (in case localStorage differs)
        this.i18n.setLang(this.lang);
        // Theme is no longer forced here, the navbar light/dark toggle controls it,
        // and the saved preference (localStorage via LayoutService) applies on load.
    }

    t(key: string): string { return this.i18n.t(key); }
    _(fr: string, en: string): string { return this.i18n.lang() === 'fr' ? fr : en; }
    get aboutSlug(): string { return this.i18n.lang() === 'fr' ? 'qui-sommes-nous' : 'about'; }

    toggleDarkMode() {
        const next = !this.layoutService.layoutConfig().darkTheme;
        this.layoutService.layoutConfig.update((state) => ({
            ...state,
            darkTheme: next,
            themeMode: next ? 'dark' : 'light',
        }));
    }

    switchLang() {
        this.mobileMenuOpen.set(false);
        const newLang: Lang = this.lang === 'fr' ? 'en' : 'fr';
        // Update the service signal FIRST so all components re-render immediately
        this.i18n.setLang(newLang);
        this.lang = newLang;
        this.currentLang = '/' + newLang;
        // Stay on the current page, just swap the language prefix in the URL
        const currentUrl = this.router.url;
        const newUrl = currentUrl.replace(/^\/(fr|en)/, '/' + newLang);
        this.router.navigateByUrl(newUrl);
    }

}
