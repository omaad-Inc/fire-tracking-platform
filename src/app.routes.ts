import { Routes, Router, CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import localeEn from '@angular/common/locales/en';
import { LOCALE_ID } from '@angular/core';
import { AppLayout } from './app/layout/component/app.layout';
import { Dashboard } from './app/pages/dashboard/dashboard';
import { Landing } from './app/pages/landing/landing';
import { Notfound } from './app/pages/notfound/notfound';
import { authGuard } from './app/core/guards/auth.guard';
import { AdvisoryPage } from './app/pages/landing/components/advisory';
import { AdvisoryAuditPage } from './app/pages/landing/components/advisory-audit';
import { AdvisoryMissionPage } from './app/pages/landing/components/advisory-mission';
import { AdvisoryFormationPage } from './app/pages/landing/components/advisory-formation';
import { FireAfricaWelcome } from './app/pages/landing/components/fire-africa-welcome';
import { FireSimulator } from './app/pages/landing/components/fire-simulator';
import { CompoundCalculator } from './app/pages/landing/components/compound-calculator';

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
        component: Landing,
        canActivate: [oauthTokenRedirect]
    },
    { path: ':lang/landing', component: Landing },
    { path: ':lang/advisory', component: AdvisoryPage },
    { path: ':lang/advisory/audit', component: AdvisoryAuditPage },
    { path: ':lang/advisory/mission', component: AdvisoryMissionPage },
    { path: ':lang/advisory/formation', component: AdvisoryFormationPage },
    { path: ':lang/fire-africa/welcome', component: FireAfricaWelcome },
    { path: ':lang/tools/fire-simulator', component: FireSimulator },
    { path: ':lang/tools/compound-interest', component: CompoundCalculator },
    
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
            { path: '', component: Dashboard },
            { path: 'pages', loadChildren: () => import('./app/pages/pages.routes') }
        ]
    },
    
    // Other standalone routes
    { path: ':lang/notfound', component: Notfound },
    { path: ':lang/auth', loadChildren: () => import('./app/pages/auth/auth.routes') },
    { path: '**', redirectTo: '' }
];
