import { inject } from '@angular/core';
import { Routes, Router } from '@angular/router';
import { unsavedChangesGuard } from '../core/guards/unsaved-changes.guard';
import { aiChatGuard } from '../core/guards/feature-flag.guard';

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
    // Analyse BRVM: the whole sleeve (stocks + FCP), same surface as the mobile
    // app's /analyse-brvm, reached from the chart pill in the Patrimoine hero.
    { path: 'patrimoine/analyse-brvm', loadComponent: () => import('./patrimoine/components/analyse-brvm-page').then(m => m.AnalyseBrvmPage) },
    { path: 'patrimoine/category/:categoryId', loadComponent: () => import('./patrimoine/components/patrimoine-category-detail').then(m => m.PatrimoineCategoryDetailPage) },
    { path: 'patrimoine/assets/:id', loadComponent: () => import('./patrimoine/components/asset-detail').then(m => m.AssetDetailPage) },
    { path: 'debts', loadComponent: () => import('./debts/debtsdashboard').then(m => m.DebtsDashboard) },
    { path: 'insights', loadComponent: () => import('./insights/insights').then(m => m.InsightsPage) },
    // Notification center (P1-1). Reached from the topbar bell, not from the
    // nav model: like Settings, it is a utility surface, not a sixth hub.
    { path: 'notifications', loadComponent: () => import('./notifications/notification-center').then(m => m.NotificationCenterPage) },
    // Marchés (P2-3): free market reference data. Reached from the sidebar and
    // from the Patrimoine hero (the mobile app's only entry point).
    { path: 'marches', loadComponent: () => import('./marches/marches-hub').then(m => m.MarchesHubPage) },
    { path: 'marches/actions', loadComponent: () => import('./marches/brvm-board-page').then(m => m.BrvmBoardPage) },
    { path: 'marches/fcp', loadComponent: () => import('./marches/fcp-board-page').then(m => m.FcpBoardPage) },
    { path: 'marches/action/:id', data: { kind: 'stock' }, loadComponent: () => import('./marches/instrument-detail-page').then(m => m.InstrumentDetailPage) },
    { path: 'marches/fonds/:id', data: { kind: 'fund' }, loadComponent: () => import('./marches/instrument-detail-page').then(m => m.InstrumentDetailPage) },
    { path: 'marches/indice/:id', data: { kind: 'index' }, loadComponent: () => import('./marches/instrument-detail-page').then(m => m.InstrumentDetailPage) },
    // Weekly recap (P2-4): the in-app view the Monday push and the inbox
    // deep-link to (NOTIF_WEB_ROUTES.weekly_report).
    { path: 'reports/weekly', loadComponent: () => import('./reports/weekly-report-page').then(m => m.WeeklyReportPage) },
    // S12: the ONE chat surface, dark-shipped behind featureFlags.aiChat.
    { path: 'assistant', canMatch: [aiChatGuard], loadComponent: () => import('./assistant/assistant-page').then(m => m.AssistantPage) },
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
