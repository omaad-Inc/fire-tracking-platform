import { Routes } from '@angular/router';
import { Empty } from './empty/empty';
import { Transaction } from './transaction/transaction';
import { Patrimoine } from './patrimoine/patrimoine';
import { DebtsDashboard } from './debts/debtsdashboard';
import { AssetDetailPage } from './patrimoine/components/asset-detail';
import { PatrimoineCategoryDetailPage } from './patrimoine/components/patrimoine-category-detail';
import { AddAssetPage } from './patrimoine/components/add-asset-page';
import { ConnectBrokerPage } from './patrimoine/components/connect-broker-page';
import { PlansSettings } from './settings/components/plans';
import { FireDashboardPage } from './fire/fire-dashboard';
import { GoalsDashboardPage } from './goals/goals-dashboard';
import { GoalDetailPage } from './goals/goal-detail-page';
import { WealthScorePage } from './wealth-score/wealth-score';
export default [
    { path: 'plans', component: PlansSettings },       // Standalone — no settings sidebar
    { path: 'transaction', component: Transaction },
    { path: 'patrimoine', component: Patrimoine },
    { path: 'fire', component: FireDashboardPage },
    { path: 'goals', component: GoalsDashboardPage },
    { path: 'goals/:id', component: GoalDetailPage },
    { path: 'wealth-score', component: WealthScorePage },
    { path: 'patrimoine/add-asset', component: AddAssetPage },
    { path: 'patrimoine/connect-broker', component: ConnectBrokerPage },
    { path: 'patrimoine/category/:categoryId', component: PatrimoineCategoryDetailPage },
    { path: 'patrimoine/assets/:id', component: AssetDetailPage },
    { path: 'debts', component: DebtsDashboard },
    { path: 'settings', loadChildren: () => import('./settings/settings.routes') },
    { path: 'empty', component: Empty },
    // child wildcard should redirect within the current :lang tree
    { path: '**', redirectTo: '/fr/notfound' }
] as Routes;
