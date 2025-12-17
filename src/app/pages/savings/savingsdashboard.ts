import { Component } from '@angular/core';
import { SavingsProgress } from './components/savingsprogress';
import { SavingsTransactions } from './components/savingstransactions';
import { SavingsStats } from './components/savingstats';
import { SavingsGoals } from './components/savingsgoals';

@Component({
    selector: 'app-savings-dashboard',
    standalone: true,
    imports: [SavingsProgress, SavingsTransactions, SavingsStats, SavingsGoals],
    template: `
        <div class="grid grid-cols-12 gap-8">
            <div class="col-span-12 xl:col-span-8">
                <app-savings-progress />
            </div>
            <app-savings-stats class="col-span-12 xl:col-span-4" />
            <div class="col-span-12">
                <app-savings-goals />
            </div>
            <div class="col-span-12">
                <app-savings-transactions />
            </div>
        </div>
    `
})
export class SavingsDashboard {}
