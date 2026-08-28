import { Routes, Router, CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import localeEn from '@angular/common/locales/en';
import { LOCALE_ID } from '@angular/core';
import { authGuard } from './app/core/guards/auth.guard';
import { shareBootstrapGuard } from './app/core/guards/share.guard';
import { aiChatGuard } from './app/core/guards/feature-flag.guard';
import { onboardingRedirectGuard } from './app/core/guards/onboarding-redirect.guard';

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
    { path: ':lang/fire-africa/guides', loadComponent: () => import('./app/pages/landing/components/fire-africa-guides').then(m => m.FireAfricaGuides) },
    { path: ':lang/tools/fire-simulator', loadComponent: () => import('./app/pages/landing/components/fire-simulator').then(m => m.FireSimulator) },
    { path: ':lang/tools/compound-interest', loadComponent: () => import('./app/pages/landing/components/compound-calculator').then(m => m.CompoundCalculator) },

    // Outil public SEO (FR, sans préfixe :lang, prérendu au build) — comparateur des 41 SGI de la BRVM.
    { path: 'outils/comparateur-sgi-brvm', loadComponent: () => import('./app/pages/tools/comparateur-sgi-brvm/comparateur-sgi-brvm.page').then(m => m.ComparateurSgiBrvmPage) },
    { path: 'outils/comparateur-sgi-brvm/sgi/:id', loadComponent: () => import('./app/pages/tools/comparateur-sgi-brvm/sgi-detail.page').then(m => m.SgiDetailPage) },

    // Outil public SEO — planificateur de stratégie BRVM (playbook Core/Satellite).
    // UX en tabs, chaque tab est une route (prérendue, indexable, partageable).
    {
        path: 'outils/strategie-brvm',
        loadComponent: () => import('./app/pages/tools/strategie-brvm/strategie-brvm.shell').then(m => m.StrategieBrvmShell),
        children: [
            { path: '', loadComponent: () => import('./app/pages/tools/strategie-brvm/plan.page').then(m => m.StrategiePlanPage) },
            { path: 'detachements', loadComponent: () => import('./app/pages/tools/strategie-brvm/detachements.page').then(m => m.StrategieDetachementsPage) },
            { path: 'simulateur', loadComponent: () => import('./app/pages/tools/strategie-brvm/simulateur.page').then(m => m.StrategieSimulateurPage) },
        ],
    },
    // Pages légales publiques exigées par Google Play (FR, sans préfixe :lang,
    // prérendues) : politique de confidentialité + chemin de suppression de
    // compte joignable depuis le web (store/LISTING_PACK.md "Blocking URLs").
    { path: 'confidentialite', loadComponent: () => import('./app/pages/landing/components/confidentialite').then(m => m.ConfidentialitePage) },
    { path: 'supprimer-mon-compte', loadComponent: () => import('./app/pages/landing/components/supprimer-mon-compte').then(m => m.SupprimerMonComptePage) },

    { path: ':lang/blog', loadComponent: () => import('./app/pages/landing/blog/blog-list').then(m => m.BlogList) },
    { path: ':lang/blog/:slug', loadComponent: () => import('./app/pages/landing/blog/blog-article').then(m => m.BlogArticle) },
    { path: ':lang/faq', loadComponent: () => import('./app/pages/landing/components/faq').then(m => m.FaqPage) },
    { path: ':lang/legal/mentions', loadComponent: () => import('./app/pages/landing/components/legal-mentions').then(m => m.LegalMentionsPage) },
    // L'ancienne politique bilingue /:lang/legal/privacy est remplacée par
    // /confidentialite (Netlify 301 dans public/_redirects pour les URLs déjà
    // indexées ; cette route couvre les navigations internes côté SPA).
    { path: ':lang/legal/privacy', redirectTo: '/confidentialite' },
    { path: ':lang/legal/terms', loadComponent: () => import('./app/pages/landing/components/legal-terms').then(m => m.LegalTermsPage) },
    { path: ':lang/qui-sommes-nous', loadComponent: () => import('./app/pages/landing/components/qui-sommes-nous').then(m => m.QuiSommesNousPage) },
    { path: ':lang/about', loadComponent: () => import('./app/pages/landing/components/qui-sommes-nous').then(m => m.QuiSommesNousPage) },

    // Public read-only shared goal (no login, no lang prefix) — /g/<token>
    { path: 'g/:token', loadComponent: () => import('./app/pages/public/public-goal').then(m => m.PublicGoalPage) },

    // Public, navigable, read-only shared PORTFOLIO ("Bilan partageable") — no
    // login, works in incognito. Reuses the exact everyday shell + pages, fed
    // by a frozen snapshot (see shareBootstrapGuard + ShareContextService).
    // Gate/unavailable are shell-less siblings; the main entry puts the guard
    // DIRECTLY on the AppLayout route (token param is on this route — avoids the
    // empty-child-of-componentless-parent guard fragility).
    { path: 'share/:token/protected', loadComponent: () => import('./app/pages/share/share-code-gate').then(m => m.ShareCodeGate) },
    { path: 'share/:token/unavailable', loadComponent: () => import('./app/pages/share/share-unavailable').then(m => m.ShareUnavailable) },
    {
        path: 'share/:token',
        loadComponent: () => import('./app/layout/component/app.layout').then(m => m.AppLayout),
        canActivate: [shareBootstrapGuard],
        children: [
            { path: '', loadComponent: () => import('./app/pages/dashboard/dashboard').then(m => m.Dashboard) },
            { path: 'pages', loadChildren: () => import('./app/pages/share-pages.routes') },
        ],
    },

    // Post-registration onboarding (full-screen, no app shell). Behind authGuard
    // because the user is already signed in (token minted at verify-code / OAuth).
    // Reached only at account creation; returning users never land here.
    { path: ':lang/welcome', loadComponent: () => import('./app/pages/auth/welcome').then(m => m.Welcome), canActivate: [authGuard] },

    // First-run concierge (S12 Phase 6, full-screen, no app shell). Auto-launched
    // from Welcome.finish for a brand-new user; behind ff_aiChat (aiChatGuard
    // bounces to the dashboard when the flag is off, never notfound).
    { path: ':lang/onboarding', canMatch: [aiChatGuard], canActivate: [authGuard], loadComponent: () => import('./app/pages/onboarding/onboarding-page').then(m => m.OnboardingPage) },

    // Main app with layout (protected routes)
    {
        path: ':lang',
        loadComponent: () => import('./app/layout/component/app.layout').then(m => m.AppLayout),
        canActivate: [authGuard],
        providers: [
            {
                provide: LOCALE_ID,
                useFactory: localeResolver
            }
        ],
        children: [
            { path: '', canActivate: [onboardingRedirectGuard], loadComponent: () => import('./app/pages/dashboard/dashboard').then(m => m.Dashboard) },
            { path: 'pages', loadChildren: () => import('./app/pages/pages.routes') }
        ]
    },

    // Other standalone routes
    { path: ':lang/notfound', loadComponent: () => import('./app/pages/notfound/notfound').then(m => m.Notfound) },
    { path: ':lang/auth', loadChildren: () => import('./app/pages/auth/auth.routes') },
    { path: '**', redirectTo: '' }
];
