import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { filter } from 'rxjs/operators';
import { I18nService } from '../../i18n/i18n.service';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule],
    template: `
        <div class="min-h-screen">

            <!-- ── Mobile header: adapts to nav vs detail view ── -->
            <div class="flex items-center gap-3 mb-5">
                @if (hasActiveChild()) {
                    <!-- Back to settings list on mobile -->
                    <button
                        (click)="goToSettingsNav()"
                        class="lg:hidden w-10 h-10 flex items-center justify-center rounded-full
                               bg-surface-100 dark:bg-surface-800
                               hover:bg-surface-200 dark:hover:bg-surface-700 transition-all shrink-0">
                        <i class="pi pi-arrow-left text-surface-600 dark:text-surface-300"></i>
                    </button>
                }
                <h1 class="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-0 flex-1 truncate">
                    {{ hasActiveChild() ? activePageLabel() : t('settings.title') }}
                </h1>
                <!-- Back to dashboard — desktop only when no child active; always on desktop -->
                <button
                    (click)="goBack()"
                    class="w-10 h-10 flex items-center justify-center rounded-full
                           bg-surface-100 dark:bg-surface-800
                           hover:bg-red-100 dark:hover:bg-red-900/30 transition-all shrink-0"
                    title="{{ t('common.close') }}">
                    <i class="pi pi-times text-surface-600 dark:text-surface-300 hover:text-red-500 transition-colors"></i>
                </button>
            </div>

            <div class="flex flex-col lg:flex-row gap-6">

                <!-- ── Settings nav ──────────────────────────────────
                     Mobile: visible only when NO sub-route is active
                     Desktop: always visible (lg:block)               -->
                <div class="w-full lg:w-64 xl:w-72 shrink-0"
                     [class]="hasActiveChild() ? 'hidden lg:block' : 'block'">
                    <div class="card !p-0 overflow-hidden">

                        <!-- Compte -->
                        <div class="px-4 pt-4 pb-2">
                            <span class="text-[10px] font-semibold text-surface-400 uppercase tracking-widest">{{ t('settings.manageAccount') }}</span>
                        </div>
                        <nav class="pb-2">
                            <a routerLink="account" routerLinkActive="!bg-primary/10 !text-primary font-semibold"
                               class="flex items-center gap-3 px-4 py-3 text-surface-700 dark:text-surface-200
                                      hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors cursor-pointer">
                                <i class="pi pi-user w-4"></i>
                                <span>{{ t('menu.myAccount') }}</span>
                                <i class="pi pi-chevron-right text-xs text-surface-400 ml-auto lg:hidden"></i>
                            </a>
                            <a routerLink="security" routerLinkActive="!bg-primary/10 !text-primary font-semibold"
                               class="flex items-center gap-3 px-4 py-3 text-surface-700 dark:text-surface-200
                                      hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors cursor-pointer">
                                <i class="pi pi-shield w-4"></i>
                                <span>{{ t('menu.security') }}</span>
                                <i class="pi pi-chevron-right text-xs text-surface-400 ml-auto lg:hidden"></i>
                            </a>
                        </nav>

                        <!-- Préférences -->
                        <div class="px-4 pt-3 pb-2 border-t border-surface-200 dark:border-surface-700">
                            <span class="text-[10px] font-semibold text-surface-400 uppercase tracking-widest">{{ t('menu.preferences') }}</span>
                        </div>
                        <nav class="pb-2">
                            <a routerLink="preferences" routerLinkActive="!bg-primary/10 !text-primary font-semibold"
                               class="flex items-center gap-3 px-4 py-3 text-surface-700 dark:text-surface-200
                                      hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors cursor-pointer">
                                <i class="pi pi-cog w-4"></i>
                                <span>{{ t('menu.preferences') }}</span>
                                <i class="pi pi-chevron-right text-xs text-surface-400 ml-auto lg:hidden"></i>
                            </a>
                        </nav>

                        <!-- Indépendance Financière -->
                        <div class="px-4 pt-3 pb-2 border-t border-surface-200 dark:border-surface-700">
                            <span class="text-[10px] font-semibold text-surface-400 uppercase tracking-widest">FIRE</span>
                        </div>
                        <nav class="pb-2">
                            <a routerLink="fire" routerLinkActive="!bg-primary/10 !text-primary font-semibold"
                               class="flex items-center gap-3 px-4 py-3 text-surface-700 dark:text-surface-200
                                      hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors cursor-pointer">
                                <i class="pi pi-flag w-4"></i>
                                <span>Objectif Financier</span>
                                <i class="pi pi-chevron-right text-xs text-surface-400 ml-auto lg:hidden"></i>
                            </a>
                        </nav>

                        <!-- Aide -->
                        <div class="px-4 pt-3 pb-2 border-t border-surface-200 dark:border-surface-700">
                            <span class="text-[10px] font-semibold text-surface-400 uppercase tracking-widest">{{ t('settings.help') }}</span>
                        </div>
                        <nav class="pb-2">
                            <a routerLink="help" routerLinkActive="!bg-primary/10 !text-primary font-semibold"
                               class="flex items-center gap-3 px-4 py-3 text-surface-700 dark:text-surface-200
                                      hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors cursor-pointer">
                                <i class="pi pi-question-circle w-4"></i>
                                <span>{{ t('settings.getHelp') }}</span>
                                <i class="pi pi-chevron-right text-xs text-surface-400 ml-auto lg:hidden"></i>
                            </a>
                        </nav>

                        <!-- Back to Dashboard -->
                        <div class="p-3 border-t border-surface-200 dark:border-surface-700">
                            <button (click)="goBack()"
                                    class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                                           bg-gradient-to-r from-indigo-500/10 to-cyan-500/10
                                           text-primary hover:from-indigo-500/20 hover:to-cyan-500/20 transition-all">
                                <i class="pi pi-home"></i>
                                <span class="font-medium text-sm">{{ t('settings.backToDashboard') }}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- ── Content area ──────────────────────────────────
                     Mobile: visible only when a sub-route IS active
                     Desktop: always visible (lg:block)               -->
                <div class="flex-1 min-w-0"
                     [class]="hasActiveChild() ? 'block' : 'hidden lg:block'">

                    <!-- Desktop placeholder when no section is selected -->
                    @if (!hasActiveChild()) {
                        <div class="hidden lg:flex flex-col items-center justify-center h-full min-h-[320px] text-center p-12 card">
                            <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 flex items-center justify-center mb-4">
                                <i class="pi pi-cog text-3xl text-indigo-400"></i>
                            </div>
                            <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-2">Sélectionnez une section</h3>
                            <p class="text-sm text-surface-500 dark:text-surface-400 max-w-xs">
                                Choisissez une catégorie dans le menu de gauche pour configurer votre compte.
                            </p>
                        </div>
                    }

                    <router-outlet />
                </div>

            </div>
        </div>
    `
})
export class Settings implements OnInit {
    private router = inject(Router);
    private i18n   = inject(I18nService);

    private lang = 'fr';

    /** True when the URL has a settings sub-page (account, security, preferences, fire) */
    hasActiveChild = signal(false);

    ngOnInit() {
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        this.lang = match ? match[1] : 'fr';
        this.i18n.setLang(this.lang as 'fr' | 'en');

        // Set initial state
        this.updateActiveChild(this.router.url);

        // Update on every navigation
        this.router.events
            .pipe(filter(e => e instanceof NavigationEnd))
            .subscribe((e: NavigationEnd) => this.updateActiveChild(e.urlAfterRedirects));
    }

    private updateActiveChild(url: string) {
        // Match any URL that goes past /settings/
        this.hasActiveChild.set(/\/settings\/.+/.test(url));
    }

    /** Label shown in the mobile header when a sub-page is active */
    activePageLabel(): string {
        const url = this.router.url;
        if (url.includes('/security'))    return this.t('menu.security');
        if (url.includes('/account'))     return this.t('menu.myAccount');
        if (url.includes('/preferences')) return this.t('menu.preferences');
        if (url.includes('/fire'))        return 'Objectif Financier';
        if (url.includes('/plans'))       return 'Omaad Pro';
        if (url.includes('/help'))        return this.t('settings.getHelp');
        return this.t('settings.title');
    }

    /** Navigate back to the settings nav list (mobile) */
    goToSettingsNav() {
        this.router.navigate(['/', this.lang, 'pages', 'settings']);
        this.hasActiveChild.set(false);
    }

    goBack() {
        this.router.navigate(['/', this.lang]);
    }

    t(key: string, params?: Record<string, string | number>): string {
        return this.i18n.t(key, params);
    }
}
