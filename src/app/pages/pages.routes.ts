import { Routes } from '@angular/router';
import { Empty } from './empty/empty';
import { Transaction } from './transaction/transaction';
import { Patrimoine } from './patrimoine/patrimoine';
import { SavingsDashboard } from './savings/savingsdashboard';
import { DebtsDashboard } from './debts/debtsdashboard';

export default [
    { path: 'transaction', component: Transaction },
    { path: 'savings', component: SavingsDashboard },
    { path: 'patrimoine', component: Patrimoine },
    { path: 'debts', component: DebtsDashboard },
    { path: 'settings', loadChildren: () => import('./settings/settings.routes') },
    { path: 'empty', component: Empty },
    // child wildcard should redirect within the current :lang tree
    { path: '**', redirectTo: '/fr/notfound' }
] as Routes;
