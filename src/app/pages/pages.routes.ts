import { inject } from '@angular/core';
import { Routes, Router } from '@angular/router';
import { unsavedChangesGuard } from '../core/guards/unsaved-changes.guard';

// S5-3e: FIRE and Wealth-Score are no longer standalone destinations; they are
// tabs of the Objectifs / Analyses hubs. Keep the old paths working (bookmarks,
// old links, the dashboard widgets) by redirecting them to the hub tab, in the
// user's current language.
function langPrefix(): string {
    const m = typeof window !== 'undefined' ? window.location.pathname.match(/^\/(fr|en)(\/|$)/) : null;
    return m ? m[1] : 'fr';
}

// Each feature page is lazy-loaded as its own chunk so tapping "Transactions"
// no longer downloads Patrimoine, Debts, FIRE, Goals and Wealth Score too.
export default [
    { path: 'plans', loadComponent: () => import('./settings/components/plans').then(m => m.PlansSettings) },       // Standalone, no settings sidebar
    { path: 'transaction', loadComponent: () => import('./transaction/transaction').then(m => m.Transaction) },
    { path: 'patrimoine', loadComponent: () => import('./patrimoine/patrimoine').then(m => m.Patrimoine) },
    { path: 'fire', redirectTo: () => inject(Router).createUrlTree(['/', langPrefix(), 'pages', 'goals'], { queryParams: { tab: 'fire' } }) },
    { path: 'goals', loadComponent: () => import('./goals/goals-dashboard').then(m => m.GoalsDashboardPage) },
    { path: 'goals/:id', loadComponent: () => import('./goals/goal-detail-page').then(m => m.GoalDetailPage) },
    { path: 'wealth-score', redirectTo: () => inject(Router).createUrlTree(['/', langPrefix(), 'pages', 'insights'], { queryParams: { tab: 'score' } }) },
    { path: 'patrimoine/add-asset', loadComponent: () => import('./patrimoine/components/add-asset-page').then(m => m.AddAssetPage), canDeactivate: [unsavedChangesGuard] },
    { path: 'patrimoine/connect-broker', loadComponent: () => import('./patrimoine/components/connect-broker-page').then(m => m.ConnectBrokerPage) },
    { path: 'patrimoine/category/:categoryId', loadComponent: () => import('./patrimoine/components/patrimoine-category-detail').then(m => m.PatrimoineCategoryDetailPage) },
    { path: 'patrimoine/assets/:id', loadComponent: () => import('./patrimoine/components/asset-detail').then(m => m.AssetDetailPage) },
    { path: 'debts', loadComponent: () => import('./debts/debtsdashboard').then(m => m.DebtsDashboard) },
    { path: 'insights', loadComponent: () => import('./insights/insights').then(m => m.InsightsPage) },
    { path: 'settings', loadChildren: () => import('./settings/settings.routes') },
    // Unknown child path: send the user to the not-found page in their CURRENT language
    // (functional redirect so we don't hardcode /fr and don't break relative resolution).
    {
        path: '**',
        redirectTo: () => {
            const match = typeof window !== 'undefined'
                ? window.location.pathname.match(/^\/(fr|en)(\/|$)/)
                : null;
            const lang = match ? match[1] : 'fr';
            return `/${lang}/notfound`;
        }
    }
] as Routes;
