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
 * Settings shell (S9, Finary-benchmarked, immersive full-screen).
 *
 * Desktop: profile header + close X, left rail, one routed section.
 * Mobile: /settings is a HOME MENU (profile block, Pro banner, flat grouped
 * rows with hairlines, logout pill) — the Finary mobile pattern; a section
 * page shows a slim header (back arrow to the menu + centered title).
 * On large screens /settings auto-forwards to the account section so the
 * rail always has an active entry.
 */
@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
        <div class="min-h-screen max-w-6xl mx-auto px-1 sm:px-4">

            <!-- ═══════ DESKTOP header: profile + title + close ═══════ -->
            <div class="hidden lg:flex items-start justify-between gap-4 pt-6 mb-10">
                <div class="flex items-center gap-4 min-w-0">
                    <div class="w-14 h-14 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center overflow-hidden shrink-0">
                        @if (avatarUrl()) {
                            <img [src]="avatarUrl()" alt="" class="w-full h-full object-cover">
                        } @else {
                            <span class="text-xl font-bold text-surface-500">{{ userInitials() }}</span>
                        }
                    </div>
                    <div class="min-w-0">
                        <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0 truncate">{{ t('settings.title') }}</h1>
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

            <!-- ═══════ MOBILE, section page: back arrow + centered title ═══════ -->
            @if (activeSection()) {
                <div class="lg:hidden flex items-center gap-2 pt-2 pb-4">
                    <button (click)="goHome()" [attr.aria-label]="t('common.back')"
                            class="w-10 h-10 flex items-center justify-center rounded-full shrink-0
                                   hover:bg-surface-100 dark:hover:bg-surface-800 transition-all">
                        <i class="pi pi-arrow-left text-surface-700 dark:text-surface-200" aria-hidden="true"></i>
                    </button>
                    <h1 class="flex-1 text-center text-lg font-semibold text-surface-900 dark:text-surface-0 truncate pr-10">
                        {{ activeSectionLabel() }}
                    </h1>
                </div>
            }

            <div class="flex flex-col lg:flex-row lg:gap-16">

                <!-- ═══════ DESKTOP rail ═══════ -->
                <nav class="hidden lg:block w-60 shrink-0 lg:sticky lg:top-8 lg:self-start"
                     [attr.aria-label]="t('settings.title')">
                    <div class="flex flex-col gap-2">
                        @for (sec of sections; track sec.key) {
                            <a [routerLink]="['/', lang, 'pages', 'settings', sec.key]"
                               [attr.aria-current]="activeSection() === sec.key ? 'page' : null"
                               class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left w-full"
                               [ngClass]="activeSection() === sec.key
                                   ? 'bg-brand-100 dark:bg-brand-700/20 text-brand-700 dark:text-ochre-400 font-semibold'
                                   : 'text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700'">
                                <i class="pi {{ sec.icon }} !text-sm shrink-0" aria-hidden="true"></i>
                                <span class="text-sm whitespace-nowrap">{{ sec.label() }}</span>
                            </a>
                        }
                        <a [routerLink]="['/', lang, 'pages', 'plans']"
                           class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left w-full
                                  text-ochre-700 dark:text-ochre-400 hover:bg-ochre-100 dark:hover:bg-ochre-900/20">
                            <i class="pi pi-crown !text-sm shrink-0" aria-hidden="true"></i>
                            <span class="text-sm whitespace-nowrap font-medium">{{ t('settings.upgradeProTitle') }}</span>
                        </a>
                    </div>
                    <div class="mt-8 px-3">
                        <button (click)="logout()"
                                class="text-sm font-medium text-surface-600 dark:text-surface-300 hover:text-negative transition-colors">
                            {{ t('settings.account.logoutButton') }}
                        </button>
                        <p class="text-xs text-surface-500 dark:text-surface-400 mt-3">Omaad · v{{ appVersion }}</p>
                    </div>
                </nav>

                <div class="flex-1 min-w-0 pb-10">

                    <!-- ═══════ MOBILE home menu (Finary settings home) ═══════ -->
                    @if (!activeSection()) {
                        <div class="lg:hidden">
                            <!-- Top bar: back to app + help pill -->
                            <div class="flex items-center justify-between pt-2 mb-6">
                                <button (click)="close()" [attr.aria-label]="t('common.back')"
                                        class="w-10 h-10 flex items-center justify-center rounded-full shrink-0
                                               hover:bg-surface-100 dark:hover:bg-surface-800 transition-all">
                                    <i class="pi pi-arrow-left text-surface-700 dark:text-surface-200" aria-hidden="true"></i>
                                </button>
                                <a [routerLink]="['/', lang, 'pages', 'settings', 'help']"
                                   class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-ochre-100 dark:bg-ochre-900/30
                                          text-ochre-700 dark:text-ochre-300 text-sm font-semibold transition-all
                                          hover:bg-ochre-200 dark:hover:bg-ochre-900/50">
                                    {{ t('settings.getHelp') }}
                                    <i class="pi pi-question-circle text-xs" aria-hidden="true"></i>
                                </a>
                            </div>

                            <!-- Profile block -->
                            <div class="flex items-center gap-4 mb-6 px-1">
                                <div class="w-16 h-16 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center overflow-hidden shrink-0">
                                    @if (avatarUrl()) {
                                        <img [src]="avatarUrl()" alt="" class="w-full h-full object-cover">
                                    } @else {
                                        <span class="text-2xl font-bold text-surface-500">{{ userInitials() }}</span>
                                    }
                                </div>
                                <div class="min-w-0">
                                    <h1 class="text-xl font-bold text-surface-900 dark:text-surface-0 truncate">{{ userName() }}</h1>
                                    <p class="text-sm text-surface-500 dark:text-surface-400">
                                        {{ t('settings.memberSince', { date: memberSince() }) }}
                                    </p>
                                </div>
                            </div>

                            <!-- Omaad Pro banner -->
                            <a [routerLink]="['/', lang, 'pages', 'plans']"
                               class="block mb-8 p-4 rounded-2xl bg-ochre-100 dark:bg-ochre-900/20
                                      border border-ochre-200 dark:border-ochre-700/40 hover:shadow-sm transition-all">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-ochre-500 flex items-center justify-center shrink-0">
                                        <i class="pi pi-crown text-warm-900" aria-hidden="true"></i>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="font-semibold text-ochre-700 dark:text-ochre-400 text-sm">{{ t('settings.upgradeProTitle') }}</p>
                                        <p class="text-xs text-surface-600 dark:text-ochre-400/70">{{ t('settings.upgradeProDesc') }}</p>
                                    </div>
                                    <i class="pi pi-chevron-right text-ochre-500 dark:text-ochre-400 text-xs shrink-0" aria-hidden="true"></i>
                                </div>
                            </a>

                            <!-- Group: Mon Omaad — flat hairline rows, Finary-style -->
                            <h2 class="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-2 px-1">{{ t('settings.myOmaad') }}</h2>
                            <div class="mb-8 divide-y divide-surface-200 dark:divide-surface-800">
                                @for (sec of mainSections; track sec.key) {
                                    <a [routerLink]="['/', lang, 'pages', 'settings', sec.key]"
                                       class="flex items-center gap-4 py-4 px-1 cursor-pointer
                                              hover:bg-surface-50 dark:hover:bg-surface-900/60 transition-all">
                                        <i class="pi {{ sec.icon }} text-ochre-600 dark:text-ochre-400 text-lg w-6 text-center shrink-0" aria-hidden="true"></i>
                                        <span class="flex-1 text-surface-900 dark:text-surface-0 font-medium">{{ sec.label() }}</span>
                                        <i class="pi pi-chevron-right text-surface-400 text-xs shrink-0" aria-hidden="true"></i>
                                    </a>
                                }
                            </div>

                            <!-- Group: Aide -->
                            <h2 class="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-2 px-1">{{ t('settings.help') }}</h2>
                            <div class="mb-10 divide-y divide-surface-200 dark:divide-surface-800">
                                <a [routerLink]="['/', lang, 'pages', 'settings', 'help']"
                                   class="flex items-center gap-4 py-4 px-1 cursor-pointer
                                          hover:bg-surface-50 dark:hover:bg-surface-900/60 transition-all">
                                    <i class="pi pi-question-circle text-ochre-600 dark:text-ochre-400 text-lg w-6 text-center shrink-0" aria-hidden="true"></i>
                                    <span class="flex-1 text-surface-900 dark:text-surface-0 font-medium">{{ t('settings.getHelp') }}</span>
                                    <i class="pi pi-chevron-right text-surface-400 text-xs shrink-0" aria-hidden="true"></i>
                                </a>
                            </div>

                            <!-- Logout pill + version -->
                            <button (click)="logout()"
                                    class="px-6 py-2.5 rounded-full bg-surface-200 dark:bg-surface-800
                                           text-surface-700 dark:text-surface-200 text-sm font-semibold
                                           hover:bg-surface-300 dark:hover:bg-surface-700 transition-colors">
                                {{ t('settings.account.logoutButton') }}
                            </button>
                            <p class="text-xs text-surface-500 dark:text-surface-400 mt-6 pb-8 px-1">Omaad · v{{ appVersion }}</p>
                        </div>
                    }

                    <router-outlet />
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
    /** Active section key, or null on the (mobile) home menu. */
    activeSection = signal<string | null>(null);

    readonly sections = [
        { key: 'account',       icon: 'pi-user',   label: () => this.t('menu.myAccount') },
        { key: 'security',      icon: 'pi-shield', label: () => this.t('menu.security') },
        { key: 'connections',   icon: 'pi-link',   label: () => this.t('settings.myConnections') },
        { key: 'preferences',   icon: 'pi-cog',    label: () => this.t('menu.preferences') },
        { key: 'notifications', icon: 'pi-bell',   label: () => this.t('menu.notifications') },
        { key: 'help',          icon: 'pi-question-circle', label: () => this.t('settings.getHelp') },
    ];
    /** Home-menu rows ("Mon Omaad" group): everything except help, which has its own group. */
    readonly mainSections = this.sections.filter(s => s.key !== 'help');

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

    activeSectionLabel = computed(() => {
        const key = this.activeSection();
        return this.sections.find(s => s.key === key)?.label() ?? this.t('settings.title');
    });

    ngOnInit() {
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        this.lang = match ? match[1] : 'fr';
        this.i18n.setLang(this.lang as 'fr' | 'en');
        this.syncActiveSection(this.router.url);
        this.router.events
            .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
            .subscribe((e: NavigationEnd) => this.syncActiveSection(e.urlAfterRedirects));

        // Desktop always shows a section (the rail needs an active entry);
        // mobile stays on the home menu. lg breakpoint = 1024px.
        if (!this.activeSection() && typeof window !== 'undefined' && window.innerWidth >= 1024) {
            this.router.navigate(['/', this.lang, 'pages', 'settings', 'account'], { replaceUrl: true });
        }
    }

    private syncActiveSection(url: string) {
        const match = url.match(/\/settings\/([a-z-]+)/);
        this.activeSection.set(match ? match[1] : null);
    }

    goHome() {
        this.router.navigate(['/', this.lang, 'pages', 'settings']);
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
