import { Component } from '@angular/core';
import { DeptsStats } from './components/debtsstats';
import { DebtsProgress } from './components/debtsprogress';

@Component({
    selector: 'app-debts-dashboard',
    standalone: true,
    imports: [DeptsStats, DebtsProgress],
    template: `
        <div class="grid grid-cols-12 gap-6">
            <app-debts-stats class="contents" />
            <div class="col-span-12">
                <div class="bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5">
                    <app-debts-progress />
                </div>
            </div>
        </div>
    `
})
export class DebtsDashboard {}
