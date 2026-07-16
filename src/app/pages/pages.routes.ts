import { Routes } from '@angular/router';

// Each feature page is lazy-loaded as its own chunk so tapping "Transactions"
// no longer downloads Patrimoine, Debts, FIRE, Goals and Wealth Score too.
export default [
    { path: 'plans', loadComponent: () => import('./settings/components/plans').then(m => m.PlansSettings) },       // Standalone — no settings sidebar
    { path: 'transaction', loadComponent: () => import('./transaction/transaction').then(m => m.Transaction) },
    { path: 'patrimoine', loadComponent: () => import('./patrimoine/patrimoine').then(m => m.Patrimoine) },
    { path: 'fire', loadComponent: () => import('./fire/fire-dashboard').then(m => m.FireDashboardPage) },
    { path: 'goals', loadComponent: () => import('./goals/goals-dashboard').then(m => m.GoalsDashboardPage) },
    { path: 'goals/:id', loadComponent: () => import('./goals/goal-detail-page').then(m => m.GoalDetailPage) },
    { path: 'wealth-score', loadComponent: () => import('./wealth-score/wealth-score').then(m => m.WealthScorePage) },
    { path: 'patrimoine/add-asset', loadComponent: () => import('./patrimoine/components/add-asset-page').then(m => m.AddAssetPage) },
    { path: 'patrimoine/connect-broker', loadComponent: () => import('./patrimoine/components/connect-broker-page').then(m => m.ConnectBrokerPage) },
    { path: 'patrimoine/category/:categoryId', loadComponent: () => import('./patrimoine/components/patrimoine-category-detail').then(m => m.PatrimoineCategoryDetailPage) },
    { path: 'patrimoine/assets/:id', loadComponent: () => import('./patrimoine/components/asset-detail').then(m => m.AssetDetailPage) },
    { path: 'debts', loadComponent: () => import('./debts/debtsdashboard').then(m => m.DebtsDashboard) },
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
