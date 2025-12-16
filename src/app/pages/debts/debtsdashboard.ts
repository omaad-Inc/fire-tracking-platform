import { Component } from '@angular/core';
import { DeptsStats } from './components/debtsstats';
import { DebtsProgress } from './components/debtsprogress';

@Component({
    selector: 'app-debts-dashboard',
    standalone: true,
    imports: [DeptsStats, DebtsProgress],
    template: `
        <div class="grid grid-cols-12 gap-8">
            <app-debts-stats class="contents" />
            <div class="col-span-12">
                <app-debts-progress />
            </div>
        </div>

      
    `
})
export class DebtsDashboard {}
