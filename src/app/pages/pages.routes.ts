import { Routes } from '@angular/router';
import { Documentation } from './documentation/documentation';
import { Crud } from './crud/crud';
import { Empty } from './empty/empty';
import { Transaction } from './transaction/transaction';
import { Patrimoine } from './patrimoine/patrimoine';
import { SavingsDashboard } from './savings/savingsdashboard';
import { DebtsDashboard } from './debts/debtsdashboard';

export default [
    { path: 'documentation', component: Documentation },
    { path: 'crud', component: Crud },
    { path: 'transaction', component: Transaction },
    { path: 'savings', component: SavingsDashboard },
    { path: 'patrimoine', component: Patrimoine },
    { path: 'debts', component: DebtsDashboard },
    { path: 'empty', component: Empty },
    { path: '**', redirectTo: '/notfound' }
] as Routes;
