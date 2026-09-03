import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, DEFAULT_CURRENCY_CODE, ErrorHandler, LOCALE_ID, isDevMode, inject, provideAppInitializer } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { I18nService } from './app/i18n/i18n.service';
import localeFr from '@angular/common/locales/fr';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling, withPreloading, PreloadAllModules } from '@angular/router';
import { AuraLean } from './app/core/theme/aura-lean';
import { definePreset } from '@primeng/themes';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { AuthService } from './app/core/services/auth.service';
import { TokenService } from './app/core/services/token.service';
import { LanguageSyncService } from './app/core/services/language-sync.service';
import { ERROR_REPORTER, EventsErrorReporter, GlobalErrorHandler } from './app/core/services/error-reporter';

/**
 * Custom Omaad preset built on top of Aura.
 *
 * Aura defaults primary to emerald-500 and injects that at runtime via JS,
 * which beats any `:root { --p-primary-color: ... }` override we set in SCSS.
 * Defining the preset's primary palette is the only reliable way to make
 * every PrimeNG component (buttons, focus rings, links, sliders, the active
 * sidebar menu item) inherit our Midnight Navy.
 *
 * Built on AuraLean, not Aura: the same tokens, only for the components the
 * app renders (P3-2, see core/theme/aura-lean.ts and `npm run theme:guard`).
 */
const OmaadPreset = definePreset(AuraLean, {
    semantic: {
        primary: {
            50:  '#EFF2F7',
            100: '#D8DFEC',
            200: '#B6BFCD',
            300: '#8A98AE',
            400: '#4D5F80',
            500: '#1A2740', // brand-700 — the canonical "primary"
            600: '#14203A',
            700: '#0F1A2E',
            800: '#0F1A2E',
            900: '#08111E',
            950: '#08111E',
        },
        // Single source of truth for the `surface-*` scale (dark-mode audit
        // Batch 1). The runtime updateSurfacePalette('slate') injection is
        // gone; both Tailwind utilities (via tailwindcss-primeui) and PrimeNG
        // component tokens resolve from here.
        colorScheme: {
            light: {
                // Identical to the palette the app shipped with (slate,
                // 500 AA-tuned): light mode is intentionally unchanged.
                surface: {
                    0: '#ffffff',
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#617187',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                    950: '#020617',
                },
            },
            dark: {
                // Dedicated Omaad dark ramp: Midnight-Navy-tinted, not slate.
                // Same direction as light (0 lightest → 950 darkest) so the
                // ~2900 existing `dark:*-surface-*` usages keep their meaning.
                // Anchors: 950 canvas, 900 cards, 800 nested, 700 highest.
                surface: {
                    0: '#F5F7FB',
                    50: '#EBEFF5',
                    100: '#DEE4EE',
                    200: '#CBD3E1',
                    300: '#AEB9CC',
                    400: '#8593AB',
                    500: '#5C6B89',
                    600: '#3D4C68',
                    700: '#1F2D47',
                    800: '#18243A',
                    900: '#111B2E',
                    950: '#0B1322',
                },
                // In dark mode the interactive accent is Savanna Ochre, so
                // toggles ON, radios, checkboxes, selected states and focus
                // read as brand instead of a grey-blue that looks disabled.
                // Ochre backgrounds take dark text (WCAG note in tailwind
                // config: never white on ochre-400/500/600).
                primary: {
                    color: '#D8A369',         // ochre-400
                    contrastColor: '#14130F', // warm-900
                    hoverColor: '#DFB78A',    // ochre-300
                    activeColor: '#EBD0B0',   // ochre-200
                },
                highlight: {
                    background: 'rgba(216, 163, 105, 0.16)',
                    focusBackground: 'rgba(216, 163, 105, 0.24)',
                    color: 'rgba(255, 255, 255, 0.87)',
                    focusColor: 'rgba(255, 255, 255, 0.87)',
                },
                // Overlay tier sits one step ABOVE the cards (B6 depth
                // hierarchy): canvas 950 < cards 900 < overlays 800.
                overlay: {
                    select: { background: '{surface.800}', borderColor: '{surface.700}' },
                    popover: { background: '{surface.800}', borderColor: '{surface.700}' },
                    modal: { background: '{surface.800}', borderColor: '{surface.700}' },
                },
            },
        },
    },
});

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(
            appRoutes,
            withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
            withEnabledBlockingInitialNavigation(),
            // Preload every lazy chunk after the first navigation settles, so
            // switching hubs never waits on a chunk download (perf S-boot). The
            // chunks are small (~10-60 kB gz each) and the service worker then
            // keeps them for repeat visits.
            withPreloading(PreloadAllModules),
        ),
        provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
        // S8 groundwork: uncaught errors flow to /events (bounded, throttled)
        // until Sentry replaces the reporter. Swap ERROR_REPORTER only.
        { provide: ERROR_REPORTER, useClass: EventsErrorReporter },
        { provide: ErrorHandler, useClass: GlobalErrorHandler },
        provideAnimationsAsync(),
        providePrimeNG({ theme: { preset: OmaadPreset, options: { darkModeSelector: '.app-dark' } } }),
        { provide: LOCALE_ID, useValue: 'fr-FR' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'EUR' },
        // Await the active locale's dictionary before first render so t() is
        // populated (P2-FE-3 lazy dictionaries) — including during prerender.
        provideAppInitializer(() => {
            const i18n = inject(I18nService);
            return i18n.loadLang(i18n.lang());
        }),
        // Persist in-app language switches on the profile (P3-1). Instantiated
        // here so its effect watches the lang signal from the first render;
        // it is a no-op during prerender and while signed out.
        provideAppInitializer(() => { inject(LanguageSyncService); }),
        // Kick (do NOT await) the cookie session restore at bootstrap when the
        // device has a session hint, so the /auth/refresh round-trip overlaps
        // JS boot + route activation instead of serializing after them. The
        // guard and the interceptor share this same single-flight.
        provideAppInitializer(() => {
            if (typeof window === 'undefined') return; // prerender: no session
            const tokenService = inject(TokenService);
            if (tokenService.getUser() && !tokenService.getToken()) {
                // Transient failures are no verdict on the session (the guard
                // owns the logout decision); swallow them here.
                inject(AuthService).ensureSession().subscribe({ error: () => {} });
            }
        }),
        provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
        })
    ]
};

// Register French locale data for pipes (currency, date, number)
registerLocaleData(localeFr);

// Chart.js global defaults are applied lazily by the first chart component to
// render (see `applyChartDefaults()` in core/theme/chart-theme.ts) so Chart.js
// stays off the landing/login critical path entirely (P2-FE-4).
