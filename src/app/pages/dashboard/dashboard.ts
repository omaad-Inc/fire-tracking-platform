import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsWidget } from './components/statswidget';
import { RecentTransactionsWidget } from './components/recenttransactionswidget';
import { SavingsProgress } from './components/savingsprogresswidget';
import { DebtsOverview } from './components/debtsoverviewwidget';
import { TopMoversWidget } from './components/topmoverswidget';
import { WealthScoreDashboardWidget } from './components/wealthscorewidget';
import { OnboardingComponent } from './components/onboarding';
import { Router } from '@angular/router';
import { PatrimoineService } from '../service/patrimoine.service';
import { TransactionsService } from '../service/transactions.service';
import { TokenService } from '../../core/services/token.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule, StatsWidget, SavingsProgress, DebtsOverview,
        RecentTransactionsWidget, TopMoversWidget, WealthScoreDashboardWidget, OnboardingComponent
    ],
    template: `
        <!-- Onboarding: shown until all 3 steps are done, or dismissed -->
        @if (showOnboarding()) {
            <div class="pb-6">
                <app-onboarding
                    [hasAssets]="hasAssets()"
                    [hasTransactions]="hasTransactions()"
                    [hasFireGoal]="hasFireGoal()"
                    (addAsset)="openAddAsset()"
                    (dismissed)="showOnboarding.set(false)"
                />
            </div>
        }

        <div class="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8">
            <!-- KPI cards row -->
            <app-stats-widget class="contents" />

            <!-- Second row: Savings + Debts -->
            <div class="col-span-12 md:col-span-6 xl:col-span-6">
                <app-savings-progress />
            </div>
            <div class="col-span-12 md:col-span-6 xl:col-span-6">
                <app-debts-overview />
            </div>

            <!-- Third row: Wealth Score + Top Movers -->
            <div class="col-span-12 md:col-span-6 xl:col-span-6">
                <app-wealth-score-widget />
            </div>
            <div class="col-span-12 md:col-span-6 xl:col-span-6">
                <app-top-movers-widget />
            </div>

            <!-- Fourth row: Recent Transactions -->
            <div class="col-span-12">
                <app-recent-transactions-widget />
            </div>
        </div>
    `
})
export class Dashboard implements OnInit {
    private patrimoineService   = inject(PatrimoineService);
    private transactionsService = inject(TransactionsService);
    private tokenService        = inject(TokenService);
    private router              = inject(Router);

    showOnboarding  = signal(false);
    hasAssets       = signal(false);
    hasTransactions = signal(false);
    hasFireGoal     = signal(false);

    async ngOnInit() {
        if (localStorage.getItem('omaad_onboarding_dismissed') === 'true') return;

        const [assets, transactions] = await Promise.all([
            this.patrimoineService.getAssets().catch(() => [] as unknown[]),
            this.transactionsService.getRecords().catch(() => [] as unknown[]),
        ]);

        const fireTarget = this.tokenService.user()?.fire_target_amount ?? 0;

        this.hasAssets.set(assets.length > 0);
        this.hasTransactions.set(transactions.length > 0);
        this.hasFireGoal.set(fireTarget > 0);

        const allDone = this.hasAssets() && this.hasTransactions() && this.hasFireGoal();
        this.showOnboarding.set(!allDone);
    }

    openAddAsset() {
        const match = this.router.url.match(/^\/(fr|en)\//);
        const lang = match ? match[1] : 'fr';
        this.router.navigate(['/', lang, 'pages', 'patrimoine', 'add-asset']);
    }
}
