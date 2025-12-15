import { Routes } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import localeEn from '@angular/common/locales/en';
import { LOCALE_ID } from '@angular/core';
import { AppLayout } from './app/layout/component/app.layout';
import { Dashboard } from './app/pages/dashboard/dashboard';
import { Landing } from './app/pages/landing/landing';
import { Notfound } from './app/pages/notfound/notfound';

const localeResolver = () => {
    const url = window.location.pathname;
    const match = url.match(/^\/(fr|en)(\/|$)/);
    const locale = match ? (match[1] === 'fr' ? 'fr-FR' : 'en-US') : 'fr-FR';
    // Register locale data once
    registerLocaleData(locale.startsWith('fr') ? localeFr : localeEn);
    return locale;
};

export const appRoutes: Routes = [
    // Landing page as the first route (home)
    { path: '', pathMatch: 'full', component: Landing },
    { path: ':lang/landing', component: Landing },
    
    // Main app with layout
    {
        path: ':lang',
        component: AppLayout,
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
