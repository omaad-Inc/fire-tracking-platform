import { Routes } from '@angular/router';

// Mirror of pages.routes.ts for the PUBLIC read-only share, minus every
// write/settings flow (add-asset, connect-broker, settings, plans). Same lazy
// components as the everyday app so the shared view is pixel-identical.
export default [
    { path: 'transaction', loadComponent: () => import('./transaction/transaction').then(m => m.Transaction) },
    { path: 'patrimoine', loadComponent: () => import('./patrimoine/patrimoine').then(m => m.Patrimoine) },
    { path: 'patrimoine/category/:categoryId', loadComponent: () => import('./patrimoine/components/patrimoine-category-detail').then(m => m.PatrimoineCategoryDetailPage) },
    { path: 'patrimoine/assets/:id', loadComponent: () => import('./patrimoine/components/asset-detail').then(m => m.AssetDetailPage) },
    { path: 'fire', loadComponent: () => import('./fire/fire-dashboard').then(m => m.FireDashboardPage) },
    { path: 'goals', loadComponent: () => import('./goals/goals-dashboard').then(m => m.GoalsDashboardPage) },
    { path: 'goals/:id', loadComponent: () => import('./goals/goal-detail-page').then(m => m.GoalDetailPage) },
    { path: 'wealth-score', loadComponent: () => import('./wealth-score/wealth-score').then(m => m.WealthScorePage) },
    { path: 'debts', loadComponent: () => import('./debts/debtsdashboard').then(m => m.DebtsDashboard) },
    {
        path: '**',
        redirectTo: () => {
            const m = typeof window !== 'undefined' ? window.location.pathname.match(/^\/share\/([^/]+)/) : null;
            return m ? `/share/${m[1]}` : '/';
        },
    },
] as Routes;
