import { Component, OnInit, DestroyRef, signal, inject, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { I18nService } from '../../i18n/i18n.service';
import { TokenService } from '../../core/services/token.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Settings shell (S9, Finary-benchmarked, same immersive treatment as
 * add-asset): full-screen page with a close X, a left rail on desktop that
 * collapses to horizontal chips on mobile, and ONE section per route in the
 * content outlet (account, security, connections, preferences,
 * notifications, help). /settings redirects to /settings/account.
 */
@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
        <div class="min-h-screen max-w-6xl mx-auto px-1 sm:px-4">

            <!-- Header: profile + title + close -->
            <div class="flex items-start justify-between gap-4 pt-2 sm:pt-6 mb-6 sm:mb-10">
                <div class="flex items-center gap-4 min-w-0">
                    <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center overflow-hidden shrink-0">
                        @if (avatarUrl()) {
                            <img [src]="avatarUrl()" alt="" class="w-full h-full object-cover">
                        } @else {
                            <span class="text-xl font-bold text-surface-500">{{ userInitials() }}</span>
                        }
                    </div>
                    <div class="min-w-0">
                        <h1 class="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-0 truncate">{{ t('settings.title') }}</h1>
                        <p class="text-sm text-surface-500 dark:text-surface-400 truncate">
                            {{ userName() }} · {{ t('settings.memberSince', { date: memberSince() }) }}
                        </p>
                    </div>
                </div>
                <button (click)="close()" [attr.aria-label]="t('common.close')"
                        class="w-10 h-10 flex items-center justify-center rounded-full
                               bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700
                               transition-all shrink-0">
                    <i class="pi pi-times text-surface-600 dark:text-surface-300" aria-hidden="true"></i>
                </button>
            </div>

            <div class="flex flex-col lg:flex-row gap-4 lg:gap-16">

                <!-- Section rail: horizontal chips on mobile, sticky column on desktop -->
                <nav class="w-full lg:w-60 shrink-0 lg:sticky lg:top-8 lg:self-start
                            sticky top-0 z-10 -mx-1 px-1 py-2 lg:py-0 lg:m-0
                            bg-surface-50/95 dark:bg-surface-950/95 backdrop-blur lg:bg-transparent lg:backdrop-blur-none"
                     [attr.aria-label]="t('settings.title')">
                    <div class="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
                        @for (sec of sections; track sec.key) {
                            <a [routerLink]="['/', lang, 'pages', 'settings', sec.key]"
                               [attr.aria-current]="activeSection() === sec.key ? 'page' : null"
                               class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left shrink-0 lg:w-full"
                               [ngClass]="activeSection() === sec.key
                                   ? 'bg-brand-100 dark:bg-brand-700/20 text-brand-700 dark:text-ochre-400 font-semibold'
                                   : 'text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700'">
                                <i class="pi {{ sec.icon }} !text-sm shrink-0" aria-hidden="true"></i>
                                <span class="text-sm whitespace-nowrap">{{ sec.label() }}</span>
                            </a>
                        }
                        <!-- Pro plans: separate page, Finary "Premium" group -->
                        <a [routerLink]="['/', lang, 'pages', 'plans']"
                           class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left shrink-0 lg:w-full
                                  text-ochre-700 dark:text-ochre-400 hover:bg-ochre-100 dark:hover:bg-ochre-900/20">
                            <i class="pi pi-crown !text-sm shrink-0" aria-hidden="true"></i>
                            <span class="text-sm whitespace-nowrap font-medium">{{ t('settings.upgradeProTitle') }}</span>
                        </a>
                    </div>

                    <!-- Desktop rail footer: logout + version -->
                    <div class="hidden lg:block mt-8 px-3">
                        <button (click)="logout()"
                                class="text-sm font-medium text-surface-600 dark:text-surface-300 hover:text-negative transition-colors">
                            {{ t('settings.account.logoutButton') }}
                        </button>
                        <p class="text-xs text-surface-500 dark:text-surface-400 mt-3">Omaad · v{{ appVersion }}</p>
                    </div>
                </nav>

                <!-- Active section -->
                <div class="flex-1 min-w-0 pb-10">
                    <router-outlet />

                    <!-- Mobile footer: logout + version -->
                    <div class="lg:hidden text-center pt-8 pb-6">
                        <button (click)="logout()"
                                class="px-5 py-2.5 rounded-xl bg-surface-200 dark:bg-surface-800
                                       text-surface-700 dark:text-surface-300 text-sm font-medium
                                       hover:bg-surface-300 dark:hover:bg-surface-700 transition-colors">
                            {{ t('settings.account.logoutButton') }}
                        </button>
                        <p class="text-xs text-surface-500 dark:text-surface-400 mt-4">Omaad · v{{ appVersion }}</p>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class Settings implements OnInit {
    private router       = inject(Router);
    private destroyRef   = inject(DestroyRef);
    private i18n         = inject(I18nService);
    appVersion = environment.version;
    private tokenService = inject(TokenService);
    private authService  = inject(AuthService);

    lang = 'fr';
    activeSection = signal('account');

    readonly sections = [
        { key: 'account',       icon: 'pi-user',   label: () => this.t('menu.myAccount') },
        { key: 'security',      icon: 'pi-shield', label: () => this.t('menu.security') },
        { key: 'connections',   icon: 'pi-link',   label: () => this.t('settings.myConnections') },
        { key: 'preferences',   icon: 'pi-cog',    label: () => this.t('menu.preferences') },
        { key: 'notifications', icon: 'pi-bell',   label: () => this.t('menu.notifications') },
        { key: 'help',          icon: 'pi-question-circle', label: () => this.t('settings.getHelp') },
    ];

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
        const locale = this.i18n.lang() === 'en' ? 'en-US' : 'fr-FR';
        return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    });

    ngOnInit() {
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        this.lang = match ? match[1] : 'fr';
        this.i18n.setLang(this.lang as 'fr' | 'en');
        this.syncActiveSection(this.router.url);
        this.router.events
            .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
            .subscribe((e: NavigationEnd) => this.syncActiveSection(e.urlAfterRedirects));
    }

    private syncActiveSection(url: string) {
        const match = url.match(/\/settings\/([a-z-]+)/);
        this.activeSection.set(match ? match[1] : 'account');
    }

    close() {
        this.router.navigate(['/', this.lang]);
    }

    logout() {
        this.authService.logout();
    }

    t(key: string, params?: Record<string, string | number>): string {
        return this.i18n.t(key, params);
    }
}
