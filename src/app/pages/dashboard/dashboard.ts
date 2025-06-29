import { Component } from '@angular/core';
import { StatsWidget } from './components/statswidget';
import { RecentTransactionsWidget } from './components/recenttransactionswidget';
import { SavingsProgress } from './components/savingsprogresswidget';
import { DebtsOverview } from './components/debtsoverviewwidget';
import { WorthProgress } from './components/worthprogresswidget';
import { WorthDistributionWidget } from './components/worthdistributionwidget';
import { AllExpensesProgression } from './components/allexpenseprogressionwidget';

@Component({
    selector: 'app-dashboard',
    imports: [StatsWidget, WorthProgress, SavingsProgress, DebtsOverview, RecentTransactionsWidget, WorthDistributionWidget, AllExpensesProgression],
    template: `
        <div class="grid grid-cols-12 gap-8">
            <app-stats-widget class="contents" />

            <div class="col-span-12 xl:col-span-6">
                <app-savings-progress />
            </div>
            <div class="col-span-12 xl:col-span-6">
                <app-debts-overview />
            </div>
            <div class="col-span-12 xl:col-span-7">
                <app-worth-progress />
            </div>

            <div class="col-span-12 xl:col-span-5">
               <app-worth-distribution-widget /> 
            </div>

             <div class="col-span-12 xl:col-span-7">
               <app-recent-transactions-widget /> 
            </div>
           

            <div class="col-span-12 xl:col-span-5">
                <app-expenses-progression-widget />
            </div>
            
        </div>
    `
})
export class Dashboard {}
