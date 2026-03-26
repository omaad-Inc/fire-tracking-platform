import { Component } from '@angular/core';
import { StatsWidget } from './components/statswidget';
import { RecentTransactionsWidget } from './components/recenttransactionswidget';
import { SavingsProgress } from './components/savingsprogresswidget';
import { DebtsOverview } from './components/debtsoverviewwidget';
import { TopMoversWidget } from './components/topmoverswidget';

@Component({
    selector: 'app-dashboard',
    imports: [StatsWidget, SavingsProgress, DebtsOverview, RecentTransactionsWidget, TopMoversWidget],
    template: `
        <div class="grid grid-cols-12 gap-8">
            <!-- KPI cards row -->
            <app-stats-widget class="contents" />

            <!-- Second row: Savings + Debts -->
            <div class="col-span-12 xl:col-span-6">
                <app-savings-progress />
            </div>
            <div class="col-span-12 xl:col-span-6">
                <app-debts-overview />
            </div>

            <!-- Third row: Recent Transactions + Top Movers -->
            <div class="col-span-12 xl:col-span-6">
                <app-recent-transactions-widget />
            </div>
            <div class="col-span-12 xl:col-span-6">
                <app-top-movers-widget />
            </div>
        </div>
    `
})
export class Dashboard {}
