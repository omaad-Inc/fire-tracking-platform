import { Component, OnInit, OnDestroy, DestroyRef, signal, inject, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { I18nService } from '../../i18n/i18n.service';
import { TokenService } from '../../core/services/token.service';
import { AuthService } from '../../core/services/auth.service';
import { BillingService } from '../../core/services/billing.service';
import { CurrencyService } from '../../core/services/currency.service';
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
        <!-- No min-h-screen here: the immersive layout container already owns
             100dvh, and a viewport-height floor + its top padding forces a
             needless scroll on one-screen pages (mobile home menu). -->
        <div class="max-w-6xl mx-auto px-1 sm:px-4">

            <!-- ═══════ DESKTOP header: profile + title + close ═══════ -->
            <div class="hidden lg:flex items-start justify-between gap-4 pt-6 mb-10">
                <div class="flex items-center gap-4 min-w-0">
                    <div class="w-14 h-14 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center overflow-hidden shrink-0">
                        @if (avatarUrl()) {
                            <img [src]="avatarUrl()" alt="" class="w-full h-full object-cover" width="40" height="40">
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
                        <!-- Rail plan card: same owned-object identity as the mobile home. -->
                        @if (!billingLoading()) {
                            <a [routerLink]="planCardLink()" [queryParams]="planCardParams()"
                               class="relative block overflow-hidden rounded-xl p-3 mt-3 transition-all hover:shadow-lifted"
                               [ngClass]="planCardClass()">
                                @if (planTier() === 'premium') {
                                    <div class="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-ochre-400 via-ochre-500 to-ochre-400" aria-hidden="true"></div>
                                }
                                <div class="absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl" [ngClass]="planCardGlow()" aria-hidden="true"></div>
                                <p class="relative text-[9px] font-semibold uppercase tracking-[0.16em] mb-1" [ngClass]="pcMuted()">
                                    {{ t('subscription.yourPlan') }}
                                </p>
                                <div class="relative flex items-center justify-between gap-2">
                                    <span class="text-sm font-bold" [ngClass]="pcText()">{{ planName() }}</span>
                                    <span class="flex items-center gap-1 text-[11px] font-medium" [ngClass]="pcLink()">
                                        {{ planTier() === 'free' ? t('subscription.cta.goPro') : t('subscription.viewBenefits') }}
                                        <i class="pi pi-chevron-right !text-[9px]" aria-hidden="true"></i>
                                    </span>
                                </div>
                            </a>
                        }
                    </div>
                    <div class="mt-8 px-3">
                        <button (click)="logout()"
                                class="text-sm font-medium text-surface-600 dark:text-surface-300 hover:text-negative transition-colors">
                            {{ t('settings.account.logoutButton') }}
                        </button>
                        <p class="text-xs text-surface-500 dark:text-surface-400 mt-3">Omaad · v{{ appVersion }}</p>
                    </div>
                </nav>

                <div class="flex-1 min-w-0 pb-2 lg:pb-10">

                    <!-- ═══════ MOBILE home menu (Finary settings home) ═══════ -->
                    @if (!activeSection()) {
                        <div class="lg:hidden">
                            <!-- Top bar: back to app + tier-aware pill (Revolut's Upgrade slot:
                                 non-premium users get the upgrade pill, Premium gets help) -->
                            <div class="flex items-center justify-between pt-1 mb-4">
                                <button (click)="close()" [attr.aria-label]="t('common.back')"
                                        class="w-10 h-10 flex items-center justify-center rounded-full shrink-0
                                               hover:bg-surface-100 dark:hover:bg-surface-800 transition-all">
                                    <i class="pi pi-arrow-left text-surface-700 dark:text-surface-200" aria-hidden="true"></i>
                                </button>
                                @if (upsellTarget(); as up) {
                                    <a [routerLink]="['/', lang, 'pages', 'plans']" [queryParams]="{ tier: up }"
                                       class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-ochre-500 hover:bg-ochre-400
                                              text-warm-900 text-sm font-bold transition-all">
                                        <i class="pi pi-crown text-xs" aria-hidden="true"></i>
                                        {{ up === 'pro' ? 'Pro' : 'Premium' }}
                                    </a>
                                } @else {
                                    <a [routerLink]="['/', lang, 'pages', 'settings', 'help']"
                                       class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-ochre-100 dark:bg-ochre-900/30
                                              text-ochre-700 dark:text-ochre-300 text-sm font-semibold transition-all
                                              hover:bg-ochre-200 dark:hover:bg-ochre-900/50">
                                        {{ t('settings.getHelp') }}
                                        <i class="pi pi-question-circle text-xs" aria-hidden="true"></i>
                                    </a>
                                }
                            </div>

                            <!-- Identity: centered and celebrated, avatar ringed in the tier color -->
                            <div class="flex flex-col items-center text-center mb-6 px-1">
                                <div class="w-20 h-20 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center overflow-hidden shrink-0"
                                     [ngClass]="avatarRing()">
                                    @if (avatarUrl()) {
                                        <img [src]="avatarUrl()" alt="" class="w-full h-full object-cover" width="40" height="40">
                                    } @else {
                                        <span class="text-3xl font-bold text-surface-500">{{ userInitials() }}</span>
                                    }
                                </div>
                                <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0 truncate max-w-full mt-3">{{ userName() }}</h1>
                                <p class="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
                                    {{ t('settings.memberSince', { date: memberSince() }) }}
                                </p>
                            </div>

                            <!-- Plan card: the plan as an owned object, ALWAYS visible (free users
                                 get the aspiration variant, never a promo strip; Premium finally
                                 gets its status back). Tier ambiance shared with plans/Abonnement. -->
                            @if (billingLoading()) {
                                <div class="rounded-2xl h-[4.5rem] bg-surface-100 dark:bg-surface-800/60 animate-pulse mb-6"></div>
                            } @else {
                                <a [routerLink]="planCardLink()" [queryParams]="planCardParams()"
                                   class="relative block overflow-hidden rounded-2xl p-4 mb-6 transition-all hover:shadow-lifted"
                                   [ngClass]="planCardClass()">
                                    @if (planTier() === 'premium') {
                                        <div class="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-ochre-400 via-ochre-500 to-ochre-400" aria-hidden="true"></div>
                                    }
                                    <div class="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-2xl" [ngClass]="planCardGlow()" aria-hidden="true"></div>
                                    <p class="relative text-[10px] font-semibold uppercase tracking-[0.16em] mb-1.5" [ngClass]="pcMuted()">
                                        {{ t('subscription.yourPlan') }}
                                    </p>
                                    <div class="relative flex items-center justify-between gap-3">
                                        <span class="flex items-center gap-2 text-xl font-bold tracking-tight" [ngClass]="pcText()">
                                            {{ planName() }}
                                            @if (billing.state() === 'beta') {
                                                <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/12 text-white inline-flex items-center gap-1">
                                                    <i class="pi pi-gift !text-[9px]" aria-hidden="true"></i>{{ t('settings.planBeta') }}
                                                </span>
                                            }
                                        </span>
                                        <span class="flex items-center gap-1.5 text-[12.5px] font-medium shrink-0" [ngClass]="pcLink()">
                                            {{ planTier() === 'free' ? t('subscription.cta.goPro') : t('subscription.viewBenefits') }}
                                            <i class="pi pi-chevron-right !text-[10px]" aria-hidden="true"></i>
                                        </span>
                                    </div>
                                </a>
                            }

                            <!-- Grouped rounded containers (Revolut sheet feel): neutral icon
                                 chips, one accent on the page (the plan card), living values. -->
                            @for (group of rowGroups; track group.titleKey) {
                                <h2 class="text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2 px-1">
                                    {{ t(group.titleKey) }}
                                </h2>
                                <div class="mb-5 rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900/50
                                            shadow-sm overflow-hidden divide-y divide-surface-100 dark:divide-surface-800">
                                    @for (sec of group.rows; track sec.key) {
                                        <a [routerLink]="['/', lang, 'pages', 'settings', sec.key]"
                                           class="flex items-center gap-3.5 px-4 py-3.5 cursor-pointer
                                                  hover:bg-surface-50 dark:hover:bg-surface-900/60 transition-all">
                                            <span class="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0">
                                                <i class="pi {{ sec.icon }} text-surface-500 dark:text-surface-400 !text-sm" aria-hidden="true"></i>
                                            </span>
                                            <span class="flex-1 min-w-0 text-[14.5px] font-medium text-surface-900 dark:text-surface-0 truncate">{{ sec.label() }}</span>
                                            @if (sec.value(); as v) {
                                                <span class="text-[12.5px] text-surface-400 dark:text-surface-500 shrink-0">{{ v }}</span>
                                            }
                                            <i class="pi pi-chevron-right text-surface-400 !text-xs shrink-0" aria-hidden="true"></i>
                                        </a>
                                    }
                                </div>
                            }

                            <!-- Logout + version, centered footer -->
                            <div class="flex flex-col items-center pt-1">
                                <button (click)="logout()"
                                        class="px-6 py-2 rounded-full bg-surface-200 dark:bg-surface-800
                                               text-surface-700 dark:text-surface-200 text-sm font-semibold
                                               hover:bg-surface-300 dark:hover:bg-surface-700 transition-colors">
                                    {{ t('settings.account.logoutButton') }}
                                </button>
                                <p class="text-xs text-surface-500 dark:text-surface-400 mt-3 pb-1 text-center">Omaad · v{{ appVersion }}</p>
                            </div>
                        </div>
                    }

                    <router-outlet />
                </div>
            </div>
        </div>
    `
})
export class Settings implements OnInit, OnDestroy {
    private router       = inject(Router);
    private destroyRef   = inject(DestroyRef);
    private i18n         = inject(I18nService);
    appVersion = environment.version;
    private tokenService = inject(TokenService);
    private authService  = inject(AuthService);
    protected billing    = inject(BillingService);
    private cs           = inject(CurrencyService);

    lang = 'fr';
    /** Active section key, or null on the (mobile) home menu. */
    activeSection = signal<string | null>(null);

    readonly sections = [
        { key: 'account',       icon: 'pi-user',   label: () => this.t('menu.myAccount') },
        { key: 'security',      icon: 'pi-shield', label: () => this.t('menu.security') },
        { key: 'connections',   icon: 'pi-link',   label: () => this.t('settings.myConnections') },
        { key: 'preferences',   icon: 'pi-cog',    label: () => this.t('menu.preferences') },
        { key: 'categories',    icon: 'pi-tags',   label: () => this.t('menu.categories') },
        { key: 'alerts',        icon: 'pi-flag',   label: () => this.t('menu.alerts') },
        { key: 'notifications', icon: 'pi-bell',   label: () => this.t('menu.notifications') },
        { key: 'subscription',  icon: 'pi-credit-card', label: () => this.t('menu.subscription') },
        { key: 'help',          icon: 'pi-question-circle', label: () => this.t('settings.getHelp') },
    ];

    /** Mobile home rows in three semantic groups (subscription is NOT a row:
     *  the plan card above the groups owns that destination). `value` feeds the
     *  right-hand living value; it must only read state already in memory. */
    readonly rowGroups: { titleKey: string; rows: { key: string; icon: string; label: () => string; value: () => string | null }[] }[] = [
        {
            titleKey: 'settings.groups.account',
            rows: [
                { key: 'account',     icon: 'pi-user',   label: () => this.t('menu.myAccount'),        value: () => null },
                { key: 'security',    icon: 'pi-shield', label: () => this.t('menu.security'),         value: () => null },
                { key: 'connections', icon: 'pi-link',   label: () => this.t('settings.myConnections'), value: () => null },
            ],
        },
        {
            titleKey: 'settings.groups.app',
            rows: [
                { key: 'preferences',   icon: 'pi-sliders-h', label: () => this.t('menu.preferences'),   value: () => `${this.lang.toUpperCase()} · ${this.cs.config().symbol}` },
                { key: 'categories',    icon: 'pi-tags',      label: () => this.t('menu.categories'),    value: () => null },
                { key: 'alerts',        icon: 'pi-flag',      label: () => this.t('menu.alerts'),        value: () => null },
                { key: 'notifications', icon: 'pi-bell',      label: () => this.t('menu.notifications'), value: () => null },
            ],
        },
        {
            titleKey: 'settings.help',
            rows: [
                { key: 'help', icon: 'pi-question-circle', label: () => this.t('settings.getHelp'), value: () => null },
            ],
        },
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

    activeSectionLabel = computed(() => {
        const key = this.activeSection();
        return this.sections.find(s => s.key === key)?.label() ?? this.t('settings.title');
    });

    /** The tier the user has effectively reached. Beta courtesy lifts everyone
     *  to at least Pro (mirrors billing_service.has_plan / notice-strip), so the
     *  upsell banner never nags a courtesy-Pro user to "upgrade to Pro". */
    private reachedTier = computed<'free' | 'pro' | 'premium'>(() => {
        const plan = this.billing.effectivePlan() as 'free' | 'pro' | 'premium';
        if (plan === 'premium') return 'premium';
        return this.billing.betaCourtesy() ? 'pro' : plan;
    });

    /** What the upsell banner should offer, or null to hide it entirely.
     *  free -> Pro, pro -> Premium, premium -> nothing. Hidden while the
     *  subscription is still loading so no wrong CTA flashes. */
    upsellTarget = computed<'pro' | 'premium' | null>(() => {
        if (this.billing.state() === 'loading') return null;
        switch (this.reachedTier()) {
            case 'free':    return 'pro';
            case 'pro':     return 'premium';
            case 'premium': return null;
        }
    });

    // ── Plan card (the owned-object slot, mobile home + rail) ───────────────

    readonly planTier = this.reachedTier;
    billingLoading = computed(() => this.billing.state() === 'loading');

    planName(): string {
        const tier = this.planTier();
        return tier === 'free' ? this.t('plans.free') : tier === 'pro' ? 'Pro' : 'Premium';
    }

    /** Paid/beta users land on their Abonnement page; free users on the plans
     *  page, Pro tab (the aspiration path). */
    planCardLink(): unknown[] {
        return this.planTier() === 'free'
            ? ['/', this.lang, 'pages', 'plans']
            : ['/', this.lang, 'pages', 'settings', 'subscription'];
    }
    planCardParams(): Record<string, string> | null {
        return this.planTier() === 'free' ? { tier: 'pro' } : null;
    }

    // Tier ambiance, shared identity with /pages/plans and the Abonnement hero.
    planCardClass(): string {
        switch (this.planTier()) {
            case 'premium': return 'bg-brand-950 border border-brand-700/50 shadow-md';
            case 'pro':     return 'bg-gradient-to-br from-brand-700 to-brand-800 shadow-md';
            case 'free':    return 'bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm';
        }
    }
    planCardGlow(): string {
        switch (this.planTier()) {
            case 'premium': return 'bg-ochre-400/15';
            case 'pro':     return 'bg-ochre-500/25';
            case 'free':    return 'bg-brand-700/10';
        }
    }
    pcText(): string {
        return this.planTier() === 'free' ? 'text-surface-900 dark:text-surface-0' : 'text-white';
    }
    pcMuted(): string {
        return this.planTier() === 'free' ? 'text-surface-400 dark:text-surface-500' : 'text-white/55';
    }
    pcLink(): string {
        return this.planTier() === 'free' ? 'text-ochre-600 dark:text-ochre-400' : 'text-white/70';
    }

    /** Avatar ring in the tier color (quiet for free). */
    avatarRing(): string {
        switch (this.planTier()) {
            case 'premium': return 'ring-2 ring-ochre-400';
            case 'pro':     return 'ring-2 ring-ochre-500/80';
            case 'free':    return 'ring-1 ring-surface-200 dark:ring-surface-700';
        }
    }

    ngOnInit() {
        // Settings pages scroll without showing a scrollbar (Finary feel).
        document.documentElement.classList.add('settings-no-scrollbar');
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        this.lang = match ? match[1] : 'fr';
        this.i18n.setLang(this.lang as 'fr' | 'en');
        // Warm the subscription cache so the upsell banner reflects the real tier
        // (free -> Pro, pro -> Premium, premium -> hidden) instead of the default.
        this.billing.load();
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

    ngOnDestroy() {
        document.documentElement.classList.remove('settings-no-scrollbar');
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
