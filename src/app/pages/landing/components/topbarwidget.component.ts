import { Component, DestroyRef, ElementRef, HostListener, PLATFORM_ID, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { I18nService, Lang } from '../../../i18n/i18n.service';
import { trackLandingCta } from './landing-shared';

/**
 * Public header (landing redesign 2026-10). Shared by the landing, FAQ,
 * legal, support and about pages.
 *
 * Desktop: logo, three links + an Outils disclosure, FR/EN, Se connecter and
 * the ONE primary action (S'inscrire). Phone: logo, S'inscrire stays visible
 * outside the menu, and a 44 px menu button opens a bottom sheet that is
 * focus-trapped, closes on Escape, backdrop tap and link tap, and locks the
 * page scroll. No theme toggle: public pages are light only.
 */
@Component({
    selector: 'topbar-widget',
    standalone: true,
    imports: [RouterModule],
    host: { class: 'block' },
    template: `
        <header class="lp-header" [class.is-scrolled]="scrolled()">
            <div class="lp-container lp-header-row">
                <a class="flex items-center gap-2 shrink-0 no-underline rounded-full focus-visible:outline-2 focus-visible:outline-ochre-500"
                   [routerLink]="homeLink" [attr.aria-label]="t('landing.nav.homeAria')">
                    <img src="assets/brand/omaad-icon.svg" alt="" class="w-9 h-9 md:w-10 md:h-10" width="40" height="40">
                    <span class="font-bold text-[20px] md:text-[22px] tracking-tight text-[color:var(--lp-ink)]">Omaad</span>
                </a>

                <nav class="lp-desktop-only flex items-center gap-0.5 mx-auto" [attr.aria-label]="t('landing.nav.mainAria')">
                    <a class="lp-nav-link" [routerLink]="homeLink" fragment="features">{{ t('landing.nav.features') }}</a>
                    <a class="lp-nav-link" [routerLink]="[currentLang, 'tarifs']">{{ t('landing.nav.pricing') }}</a>
                    <div class="relative" (mouseenter)="hoverTools(true)" (mouseleave)="hoverTools(false)"
                         (keydown.escape)="closeTools()" (focusout)="onToolsFocusOut($event)">
                        <button type="button" class="lp-nav-link gap-1" aria-haspopup="true" aria-controls="lp-mega-tools"
                                [attr.aria-expanded]="toolsOpen()" (click)="toggleTools()">
                            {{ t('landing.nav.tools') }}
                            <i class="pi pi-chevron-down text-[10px] transition-transform" [class.rotate-180]="toolsOpen()" aria-hidden="true"></i>
                        </button>
                        @if (toolsOpen()) {
                            <div id="lp-mega-tools" class="lp-mega">
                                <div class="lp-mega-card">
                                    <div>
                                        <span class="lp-mega-group">{{ t('landing.nav.toolsHighlights') }}</span>
                                        @for (h of highlights; track h.key) {
                                            <a class="lp-mega-highlight" [routerLink]="h.link" (click)="closeTools()">
                                                <span><img [src]="h.image" alt="" width="96" height="72" loading="lazy"></span>
                                                <span class="flex flex-col min-w-0">
                                                    <span class="text-[15px] font-semibold leading-tight">{{ t('landing.nav.' + h.key) }}</span>
                                                    <span class="mt-1 text-[13px] leading-snug lp-muted">{{ t('landing.nav.' + h.key + 'Teaser') }}</span>
                                                </span>
                                            </a>
                                        }
                                    </div>
                                    <div>
                                        <span class="lp-mega-group">{{ t('landing.nav.toolsAll') }}</span>
                                        @for (item of tools; track item.key) {
                                            <a class="lp-menu-item !min-h-[44px] !py-1.5" [routerLink]="item.link" (click)="closeTools()">
                                                <span class="lp-icon-tile !w-8 !h-8 !rounded-[9px] text-[14px]"><i class="pi" [class]="item.icon" aria-hidden="true"></i></span>
                                                <span class="flex flex-col min-w-0">
                                                    <span class="text-[14px] font-semibold leading-tight">{{ t('landing.nav.' + item.key) }}</span>
                                                    <span class="text-[12px] leading-snug lp-muted">{{ t('landing.nav.' + item.key + 'Desc') }}</span>
                                                </span>
                                            </a>
                                        }
                                    </div>
                                    <div class="lp-mega-foot">
                                        <span>{{ t('landing.nav.toolsFoot') }}</span>
                                        <a class="lp-link !min-h-0 text-[14px]" [routerLink]="[currentLang, 'auth', 'register']" (click)="trackCta('nav_tools_register'); closeTools()">
                                            {{ t('landing.nav.toolsFootCta') }}
                                            <i class="pi pi-arrow-right text-[11px]" aria-hidden="true"></i>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        }
                    </div>
                    <a class="lp-nav-link" [routerLink]="[currentLang, aboutSlug]">{{ t('landing.nav.about') }}</a>
                </nav>

                <div class="flex items-center gap-1 sm:gap-2 shrink-0">
                    <button type="button" class="lp-nav-link lp-desktop-only" (click)="switchLang()" [attr.aria-label]="t('landing.lang.switchLabel')">
                        {{ t('landing.lang.switchTo') }}
                    </button>
                    <a class="lp-nav-link lp-desktop-only" [routerLink]="[currentLang, 'auth', 'login']" (click)="trackCta('nav_login')">{{ t('landing.nav.login') }}</a>
                    <a class="lp-btn lp-btn-primary lp-btn-sm" [routerLink]="[currentLang, 'auth', 'register']" (click)="trackCta('nav_register')">{{ t('landing.nav.register') }}</a>
                    <button #menuBtn type="button" class="lp-icon-btn lp-mobile-only" aria-controls="lp-sheet"
                            [attr.aria-expanded]="sheetOpen()" [attr.aria-label]="t('landing.nav.menu')" (click)="openSheet()">
                        <i class="pi pi-bars text-[20px]" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
        </header>
        <!-- Spacer for the fixed header -->
        <div class="h-[60px] lg:h-[68px]" style="margin-top: env(safe-area-inset-top, 0px)"></div>

        @if (sheetOpen()) {
            <div class="lp-sheet-scrim lp-mobile-only" (click)="closeSheet()" aria-hidden="true"></div>
            <div #sheet id="lp-sheet" class="lp-sheet lp-mobile-only" role="dialog" aria-modal="true" [attr.aria-label]="t('landing.nav.menu')" (keydown)="onSheetKeydown($event)">
                <div class="lp-sheet-handle" aria-hidden="true"></div>
                <div class="flex items-center justify-between">
                    <span class="font-bold text-[18px]">Omaad</span>
                    <button #closeBtn type="button" class="lp-icon-btn" (click)="closeSheet()" [attr.aria-label]="t('landing.nav.close')">
                        <i class="pi pi-times text-[18px]" aria-hidden="true"></i>
                    </button>
                </div>
                <nav class="mt-2" [attr.aria-label]="t('landing.nav.mainAria')">
                    <a class="lp-menu-item text-[17px] font-semibold" [routerLink]="homeLink" fragment="features" (click)="closeSheet()">{{ t('landing.nav.features') }}</a>
                    <a class="lp-menu-item text-[17px] font-semibold" [routerLink]="[currentLang, 'tarifs']" (click)="closeSheet()">{{ t('landing.nav.pricing') }}</a>
                    <a class="lp-menu-item text-[17px] font-semibold" [routerLink]="[currentLang, aboutSlug]" (click)="closeSheet()">{{ t('landing.nav.about') }}</a>
                    <span class="lp-sheet-group">{{ t('landing.nav.tools') }}</span>
                    @for (item of tools; track item.key) {
                        <a class="lp-menu-item" [routerLink]="item.link" (click)="closeSheet()">
                            <span class="lp-icon-tile !w-9 !h-9 !rounded-[10px] text-[15px]"><i class="pi" [class]="item.icon" aria-hidden="true"></i></span>
                            <span class="text-[16px] font-medium">{{ t('landing.nav.' + item.key) }}</span>
                        </a>
                    }
                </nav>
                <div class="mt-4 pt-4 border-t border-[color:var(--lp-line)] flex items-center justify-between gap-3">
                    <div class="lp-segment" role="group" [attr.aria-label]="t('landing.lang.groupAria')">
                        <button type="button" [attr.aria-pressed]="lang === 'fr'" (click)="setLang('fr')">FR</button>
                        <button type="button" [attr.aria-pressed]="lang === 'en'" (click)="setLang('en')">EN</button>
                    </div>
                    <a class="lp-link" [routerLink]="[currentLang, 'auth', 'login']" (click)="trackCta('sheet_login'); closeSheet()">{{ t('landing.nav.login') }}</a>
                </div>
                <a class="lp-btn lp-btn-primary lp-btn-block mt-4" [routerLink]="[currentLang, 'auth', 'register']" (click)="trackCta('sheet_register'); closeSheet()">{{ t('landing.nav.registerLong') }}</a>
            </div>
        }
    `,
})
export class TopbarWidget {
    private analytics = inject(AnalyticsService);
    private i18n = inject(I18nService);
    private platformId = inject(PLATFORM_ID);
    private router = inject(Router);

    private sheet = viewChild<ElementRef<HTMLElement>>('sheet');
    private closeBtn = viewChild<ElementRef<HTMLButtonElement>>('closeBtn');
    private menuBtn = viewChild<ElementRef<HTMLButtonElement>>('menuBtn');

    currentLang = '/fr';
    lang: Lang = 'fr';
    sheetOpen = signal(false);
    toolsOpen = signal(false);
    scrolled = signal(false);

    readonly tools = [
        { key: 'toolFire', icon: 'pi-bolt', link: ['/fr', 'tools', 'fire-simulator'] as (string | string[])[] },
        { key: 'toolCompound', icon: 'pi-chart-bar', link: ['/fr', 'tools', 'compound-interest'] },
        { key: 'toolSgi', icon: 'pi-building', link: ['/outils/comparateur-sgi-brvm'] },
        { key: 'toolStrategy', icon: 'pi-compass', link: ['/outils/strategie-brvm'] },
        { key: 'toolBlog', icon: 'pi-book', link: ['/fr', 'blog'] },
    ];
    /** Mega-panel highlights: the two tools that convert best, each with a dedicated 96x72 visual (tools/render-highlight-visuals.mjs). */
    readonly highlights = [
        { key: 'toolFire', image: 'assets/marketing/highlight-fire.webp', link: ['/fr', 'tools', 'fire-simulator'] as (string | string[])[] },
        { key: 'toolSgi', image: 'assets/marketing/highlight-sgi.webp', link: ['/outils/comparateur-sgi-brvm'] },
    ];
    private hoverTimer: ReturnType<typeof setTimeout> | null = null;
    private openedByHoverAt = 0;

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        this.lang = (match ? match[1] : 'fr') as Lang;
        this.currentLang = '/' + this.lang;
        this.i18n.setLang(this.lang);
        for (const item of [...this.tools, ...this.highlights]) if (item.link[0] === '/fr') item.link[0] = this.currentLang;
        afterNextRender(() => { this.scrolled.set(window.scrollY > 8); });
        // The sheet may be open when a navigation destroys the header (back
        // button, auth redirect): never leave the page scroll locked behind.
        inject(DestroyRef).onDestroy(() => { if (isPlatformBrowser(this.platformId)) document.body.classList.remove('lp-scroll-lock'); });
    }

    /** Anchors stay on the current route when it IS the landing (so "/" never jumps to /fr/landing). */
    get homeLink(): string[] {
        const path = this.router.url.split(/[?#]/)[0];
        return /^\/(?:(?:fr|en)\/landing\/?)?$/.test(path) ? ['.'] : [this.currentLang, 'landing'];
    }

    get aboutSlug(): string { return this.lang === 'fr' ? 'qui-sommes-nous' : 'about'; }

    t(key: string): string { return this.i18n.t(key); }

    trackCta(placement: string): void { trackLandingCta(this.analytics, this.router, placement); }

    @HostListener('window:scroll')
    onScroll(): void { if (isPlatformBrowser(this.platformId)) this.scrolled.set(window.scrollY > 8); }

    // ── Outils mega panel: hover intent + click, never "hover opens, click closes" ──
    hoverTools(enter: boolean): void {
        if (this.hoverTimer) clearTimeout(this.hoverTimer);
        this.hoverTimer = setTimeout(() => {
            if (enter && !this.toolsOpen()) { this.toolsOpen.set(true); this.openedByHoverAt = Date.now(); }
            if (!enter) this.toolsOpen.set(false);
        }, enter ? 80 : 180);
    }

    toggleTools(): void {
        if (this.hoverTimer) clearTimeout(this.hoverTimer);
        // A click right after a hover-open is the same intent as the hover: keep it open.
        if (this.toolsOpen() && Date.now() - this.openedByHoverAt < 600) return;
        this.toolsOpen.set(!this.toolsOpen());
    }

    closeTools(): void {
        if (this.hoverTimer) clearTimeout(this.hoverTimer);
        this.toolsOpen.set(false);
    }

    /** Keyboard users tabbing out of the panel close it (no stale open panel behind the page). */
    onToolsFocusOut(ev: FocusEvent): void {
        const root = ev.currentTarget as HTMLElement;
        const next = ev.relatedTarget as Node | null;
        if (!next || !root.contains(next)) this.closeTools();
    }

    openSheet(): void {
        this.sheetOpen.set(true);
        document.body.classList.add('lp-scroll-lock');
        setTimeout(() => this.closeBtn()?.nativeElement.focus(), 0);
    }

    closeSheet(): void {
        if (!this.sheetOpen()) return;
        this.sheetOpen.set(false);
        document.body.classList.remove('lp-scroll-lock');
        this.menuBtn()?.nativeElement.focus();
    }

    /** Escape closes; Tab cycles inside the sheet (a11y: focus trap for role=dialog). */
    onSheetKeydown(ev: KeyboardEvent): void {
        if (ev.key === 'Escape') { ev.preventDefault(); this.closeSheet(); return; }
        if (ev.key !== 'Tab') return;
        const root = this.sheet()?.nativeElement;
        if (!root) return;
        const focusable = Array.from(root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
            .filter((el) => el.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
        else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
    }

    setLang(next: Lang): void {
        if (next === this.lang) return;
        this.switchLang();
    }

    switchLang(): void {
        const next: Lang = this.lang === 'fr' ? 'en' : 'fr';
        this.i18n.setLang(next);
        this.lang = next;
        this.currentLang = '/' + next;
        for (const item of [...this.tools, ...this.highlights]) if (/^\/(fr|en)$/.test(item.link[0] as string)) item.link[0] = this.currentLang;
        this.closeSheet();
        const url = this.router.url;
        const path = url.split(/[?#]/)[0];
        if (/^\/(fr|en)(\/|$)/.test(url)) {
            this.router.navigateByUrl(url.replace(/^\/(fr|en)/, '/' + next));
        } else if (path === '/' || path === '') {
            // "/" has no prefix: the other language lives at /<lang>/landing.
            this.router.navigateByUrl(`/${next}/landing`);
        }
        // Other prefix-less public pages (/support, /confidentialite, /paiement/retour...)
        // stay where they are: only the copy switches.
    }
}
