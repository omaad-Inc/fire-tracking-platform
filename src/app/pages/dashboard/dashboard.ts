import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsWidget } from './components/statswidget';
import { RecentTransactionsWidget } from './components/recenttransactionswidget';
import { SavingsProgress } from './components/savingsprogresswidget';
import { DebtsOverview } from './components/debtsoverviewwidget';
import { TopMoversWidget } from './components/topmoverswidget';
import { WealthScoreDashboardWidget } from './components/wealthscorewidget';
import { OnboardingComponent } from './components/onboarding';
import { AlertsWidget } from './components/alertswidget';
import { Router } from '@angular/router';
import { PatrimoineService } from '../service/patrimoine.service';
import { TransactionsService } from '../service/transactions.service';
import { TokenService } from '../../core/services/token.service';
import { I18nService } from '../../i18n/i18n.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule, StatsWidget, SavingsProgress, DebtsOverview,
        RecentTransactionsWidget, TopMoversWidget, WealthScoreDashboardWidget, OnboardingComponent,
        AlertsWidget
    ],
    template: `
        <!-- One <h1> per page for a correct heading hierarchy; visually hidden
             since the KPI cards carry the visible titles (P2-A11Y-2). -->
        <h1 class="sr-only">{{ t('dashboard.pageTitle') }}</h1>

        <!-- Attention feed: budget/insight alerts (renders only when there's something to flag) -->
        <app-alerts-widget />

        <!-- Onboarding: shown only to a brand-new user; hidden once ANY step is done, or dismissed -->
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
    private i18n                = inject(I18nService);

    t(key: string): string { return this.i18n.t(key); }

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

        // Only guide a truly brand-new user. As soon as ANY step is done,
        // the user has grasped the tool, stop showing the onboarding guide.
        // (A future config agent will take over richer guidance from here.)
        const anyDone = this.hasAssets() || this.hasTransactions() || this.hasFireGoal();
        this.showOnboarding.set(!anyDone);
    }

    openAddAsset() {
        const match = this.router.url.match(/^\/(fr|en)\//);
        const lang = match ? match[1] : 'fr';
        this.router.navigate(['/', lang, 'pages', 'patrimoine', 'add-asset']);
    }
}
