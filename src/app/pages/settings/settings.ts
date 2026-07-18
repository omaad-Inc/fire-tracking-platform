import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { filter } from 'rxjs/operators';
import { I18nService } from '../../i18n/i18n.service';
import { TokenService } from '../../core/services/token.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule],
    template: `
        <div class="min-h-screen max-w-3xl mx-auto">

            <!-- ═══════════════════════════════════════════
                 MASTER VIEW — settings menu list
                 Visible when NO sub-route is active
            ═══════════════════════════════════════════ -->
            @if (!hasActiveChild()) {
                <!-- Header -->
                <div class="flex items-center justify-between mb-6">
                    <button (click)="goBack()"
                            class="w-10 h-10 flex items-center justify-center rounded-full
                                   bg-surface-100 dark:bg-surface-800 transition-all shrink-0">
                        <i class="pi pi-arrow-left text-surface-600 dark:text-surface-300"></i>
                    </button>
                    <a routerLink="help"
                       class="flex items-center gap-1.5 px-4 py-2 rounded-full border border-surface-300 dark:border-surface-600
                              text-surface-700 dark:text-surface-200 text-sm font-medium
                              hover:bg-surface-100 dark:hover:bg-surface-800 transition-all">
                        {{ t('settings.getHelp') }}
                        <i class="pi pi-question-circle text-xs"></i>
                    </a>
                </div>

                <!-- Profile section -->
                <div class="flex items-center gap-4 mb-6 px-1">
                    <div class="w-16 h-16 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center overflow-hidden shrink-0">
                        @if (avatarUrl()) {
                            <img [src]="avatarUrl()" alt="Profile" class="w-full h-full object-cover">
                        } @else {
                            <span class="text-2xl font-bold text-surface-500">{{ userInitials() }}</span>
                        }
                    </div>
                    <div class="min-w-0">
                        <h2 class="text-xl font-bold text-surface-900 dark:text-surface-0 truncate">{{ userName() }}</h2>
                        <p class="text-sm text-surface-500 dark:text-surface-400">
                            Membre Omaad depuis {{ memberSince() }}
                        </p>
                    </div>
                </div>

                <!-- PRO upgrade banner -->
                <a [routerLink]="['/', lang, 'pages', 'plans']"
                   class="block mb-8 p-4 rounded-2xl bg-ochre-100 dark:bg-ochre-900/20
                          border border-ochre-200 dark:border-ochre-700/40
                          hover:shadow-sm transition-all">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-ochre-500 flex items-center justify-center shrink-0">
                            <i class="pi pi-crown text-warm-900"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="font-semibold text-ochre-700 dark:text-ochre-400 text-sm">Passer à Omaad Pro</p>
                            <p class="text-xs text-surface-600 dark:text-ochre-400/70">Débloquez les fonctionnalités avancées</p>
                        </div>
                        <i class="pi pi-chevron-right text-ochre-500 dark:text-ochre-400 text-xs shrink-0"></i>
                    </div>
                </a>

                <!-- Section: Mon Omaad -->
                <h3 class="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-3 px-1">Mon Omaad</h3>
                <div class="mb-8 rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 overflow-hidden divide-y divide-surface-100 dark:divide-surface-800">
                    @for (item of mainMenuItems; track item.route) {
                        <a [routerLink]="item.route"
                           class="flex items-center gap-4 py-4 px-4 cursor-pointer
                                  hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-all">
                            <div class="w-9 h-9 rounded-xl bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center shrink-0">
                                <i class="pi {{ item.icon }} text-brand-700 dark:text-ochre-400 text-sm"></i>
                            </div>
                            <span class="flex-1 text-surface-900 dark:text-surface-0 font-medium">{{ item.label }}</span>
                            <i class="pi pi-chevron-right text-surface-400 text-xs"></i>
                        </a>
                    }
                </div>

                <!-- Section: Aide -->
                <h3 class="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-3 px-1">{{ t('settings.help') }}</h3>
                <div class="mb-8 rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 overflow-hidden">
                    <a routerLink="help"
                       class="flex items-center gap-4 py-4 px-4 cursor-pointer
                              hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-all">
                        <div class="w-9 h-9 rounded-xl bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center shrink-0">
                            <i class="pi pi-question-circle text-brand-700 dark:text-ochre-400 text-sm"></i>
                        </div>
                        <span class="flex-1 text-surface-900 dark:text-surface-0 font-medium">{{ t('settings.getHelp') }}</span>
                        <i class="pi pi-chevron-right text-surface-400 text-xs"></i>
                    </a>
                </div>

                <!-- Logout -->
                <div class="mb-6">
                    <button (click)="logout()"
                            class="px-5 py-2.5 rounded-xl bg-surface-200 dark:bg-surface-800
                                   text-surface-700 dark:text-surface-300 text-sm font-medium
                                   hover:bg-surface-300 dark:hover:bg-surface-700 transition-colors">
                        {{ t('settings.account.logoutButton') }}
                    </button>
                </div>

                <!-- Version -->
                <div class="text-center pb-8">
                    <p class="text-xs text-surface-400 dark:text-surface-500">
                        Omaad Wealth · v1.0.0 · <span class="text-positive">●</span> production
                    </p>
                </div>
            }

            <!-- ═══════════════════════════════════════════
                 DETAIL VIEW — sub-page content
                 Visible when a sub-route IS active
            ═══════════════════════════════════════════ -->
            @if (hasActiveChild()) {
                <!-- Sub-page header with back arrow -->
                <div class="flex items-center gap-3 mb-5">
                    <button (click)="goToSettingsNav()"
                            class="w-10 h-10 flex items-center justify-center rounded-full
                                   bg-surface-100 dark:bg-surface-800 transition-all shrink-0">
                        <i class="pi pi-arrow-left text-surface-600 dark:text-surface-300"></i>
                    </button>
                    <h1 class="text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-0 flex-1 truncate">
                        {{ activePageLabel() }}
                    </h1>
                    <button (click)="goBack()"
                            class="w-10 h-10 flex items-center justify-center rounded-full
                                   bg-surface-100 dark:bg-surface-800
                                   hover:bg-negative-50 dark:hover:bg-negative-700/30 transition-all shrink-0"
                            title="Fermer">
                        <i class="pi pi-times text-surface-600 dark:text-surface-300"></i>
                    </button>
                </div>

                <router-outlet />
            }
        </div>
    `
})
export class Settings implements OnInit {
    private router       = inject(Router);
    private i18n         = inject(I18nService);
    private tokenService = inject(TokenService);
    private authService  = inject(AuthService);

    lang = 'fr';
    hasActiveChild = signal(false);

    private user = this.tokenService.user;

    userName = computed(() => {
        const u = this.user();
        if (!u) return '';
        const first = u.first_name || '';
        const last = u.last_name || '';
        if (!first && !last) return u.email?.split('@')[0] || '';
        return `${first} ${last}`.trim();
    });

    userInitials = computed(() => {
        const u = this.user();
        if (!u) return 'U';
        const f = u.first_name || '';
        const l = u.last_name || '';
        if (!f && !l) return u.email?.charAt(0).toUpperCase() || 'U';
        return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
    });

    avatarUrl = computed(() => {
        const u = this.user();
        if (!u?.avatar_url) return null;
        if (u.avatar_url.startsWith('/uploads/')) {
            return environment.apiUrl.replace('/api/v1', '') + u.avatar_url;
        }
        return u.avatar_url;
    });

    memberSince = computed(() => {
        const u = this.user();
        if (!u?.created_at) return '';
        const d = new Date(u.created_at);
        return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    });

    get mainMenuItems() {
        return [
            { route: 'account',     icon: 'pi-user',      label: 'Mon compte' },
            { route: 'security',    icon: 'pi-shield',    label: 'Sécurité' },
            { route: 'connections', icon: 'pi-link',      label: 'Mes connexions' },
            { route: 'preferences', icon: 'pi-cog',       label: 'Préférences' },
        ];
    }

    ngOnInit() {
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        this.lang = match ? match[1] : 'fr';
        this.i18n.setLang(this.lang as 'fr' | 'en');
        this.updateActiveChild(this.router.url);
        this.router.events
            .pipe(filter(e => e instanceof NavigationEnd))
            .subscribe((e: NavigationEnd) => this.updateActiveChild(e.urlAfterRedirects));
    }

    private updateActiveChild(url: string) {
        this.hasActiveChild.set(/\/settings\/.+/.test(url));
    }

    activePageLabel(): string {
        const url = this.router.url;
        if (url.includes('/security'))    return this.t('menu.security');
        if (url.includes('/account'))     return this.t('menu.myAccount');
        if (url.includes('/connections')) return 'Mes connexions';
        if (url.includes('/preferences')) return this.t('menu.preferences');
        if (url.includes('/fire'))        return 'Objectif Financier';
        if (url.includes('/plans'))       return 'Omaad Pro';
        if (url.includes('/help'))        return this.t('settings.getHelp');
        return this.t('settings.title');
    }

    goToSettingsNav() {
        this.router.navigate(['/', this.lang, 'pages', 'settings']);
        this.hasActiveChild.set(false);
    }

    goBack() {
        this.router.navigate(['/', this.lang]);
    }

    logout() {
        this.authService.logout();
    }

    t(key: string, params?: Record<string, string | number>): string {
        return this.i18n.t(key, params);
    }
}
