import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, DEFAULT_CURRENCY_CODE, LOCALE_ID, isDevMode, inject, provideAppInitializer } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { I18nService } from './app/i18n/i18n.service';
import localeFr from '@angular/common/locales/fr';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import Aura from '@primeng/themes/aura';
import { definePreset } from '@primeng/themes';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';

/**
 * Custom Omaad preset built on top of Aura.
 *
 * Aura defaults primary to emerald-500 and injects that at runtime via JS,
 * which beats any `:root { --p-primary-color: ... }` override we set in SCSS.
 * Defining the preset's primary palette is the only reliable way to make
 * every PrimeNG component (buttons, focus rings, links, sliders, the active
 * sidebar menu item) inherit our Midnight Navy.
 */
const OmaadPreset = definePreset(Aura, {
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
    },
});

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(appRoutes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }), withEnabledBlockingInitialNavigation()),
        provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
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
