import { Routes, Router, CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import localeEn from '@angular/common/locales/en';
import { LOCALE_ID } from '@angular/core';
import { AppLayout } from './app/layout/component/app.layout';
import { authGuard } from './app/core/guards/auth.guard';

// Everything except the app shell (AppLayout) is lazy-loaded so a returning
// logged-in user never downloads the marketing site, and a first-time visitor
// never downloads the dashboard. Each route ships as its own chunk.

// Guard to redirect OAuth tokens from root to callback handler
const oauthTokenRedirect: CanActivateFn = () => {
    if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('token')) {
            const router = inject(Router);
            router.navigate(['/auth/callback'], { 
                queryParams: { token: urlParams.get('token'), new_user: urlParams.get('new_user') },
                replaceUrl: true 
            });
            return false;
        }
    }
    return true;
};

const localeResolver = () => {
    const url = window.location.pathname;
    const match = url.match(/^\/(fr|en)(\/|$)/);
    const locale = match ? (match[1] === 'fr' ? 'fr-FR' : 'en-US') : 'fr-FR';
    // Register locale data once
    registerLocaleData(locale.startsWith('fr') ? localeFr : localeEn);
    return locale;
};

export const appRoutes: Routes = [
    // OAuth callback route without lang prefix (must be before root route to catch /auth/callback)
    { path: 'auth', loadChildren: () => import('./app/pages/auth/auth.routes') },
    
    // Landing page as the first route (home) - but check for OAuth token first
    {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./app/pages/landing/landing').then(m => m.Landing),
        canActivate: [oauthTokenRedirect]
    },
    { path: ':lang/landing', loadComponent: () => import('./app/pages/landing/landing').then(m => m.Landing) },
    { path: ':lang/fire-africa/welcome', loadComponent: () => import('./app/pages/landing/components/fire-africa-welcome').then(m => m.FireAfricaWelcome) },
    { path: ':lang/tools/fire-simulator', loadComponent: () => import('./app/pages/landing/components/fire-simulator').then(m => m.FireSimulator) },
    { path: ':lang/tools/compound-interest', loadComponent: () => import('./app/pages/landing/components/compound-calculator').then(m => m.CompoundCalculator) },
    { path: ':lang/blog', loadComponent: () => import('./app/pages/landing/blog/blog-list').then(m => m.BlogList) },
    { path: ':lang/blog/:slug', loadComponent: () => import('./app/pages/landing/blog/blog-article').then(m => m.BlogArticle) },
    { path: ':lang/faq', loadComponent: () => import('./app/pages/landing/components/faq').then(m => m.FaqPage) },
    { path: ':lang/legal/mentions', loadComponent: () => import('./app/pages/landing/components/legal-mentions').then(m => m.LegalMentionsPage) },
    { path: ':lang/legal/privacy', loadComponent: () => import('./app/pages/landing/components/legal-privacy').then(m => m.LegalPrivacyPage) },
    { path: ':lang/legal/terms', loadComponent: () => import('./app/pages/landing/components/legal-terms').then(m => m.LegalTermsPage) },
    { path: ':lang/qui-sommes-nous', loadComponent: () => import('./app/pages/landing/components/qui-sommes-nous').then(m => m.QuiSommesNousPage) },
    { path: ':lang/about', loadComponent: () => import('./app/pages/landing/components/qui-sommes-nous').then(m => m.QuiSommesNousPage) },

    // Public read-only shared goal (no login, no lang prefix) — /g/<token>
    { path: 'g/:token', loadComponent: () => import('./app/pages/public/public-goal').then(m => m.PublicGoalPage) },

    // Main app with layout (protected routes)
    {
        path: ':lang',
        component: AppLayout,
        canActivate: [authGuard],
        providers: [
            {
                provide: LOCALE_ID,
                useFactory: localeResolver
            }
        ],
        children: [
            { path: '', loadComponent: () => import('./app/pages/dashboard/dashboard').then(m => m.Dashboard) },
            { path: 'pages', loadChildren: () => import('./app/pages/pages.routes') }
        ]
    },

    // Other standalone routes
    { path: ':lang/notfound', loadComponent: () => import('./app/pages/notfound/notfound').then(m => m.Notfound) },
    { path: ':lang/auth', loadChildren: () => import('./app/pages/auth/auth.routes') },
    { path: '**', redirectTo: '' }
];
