import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsWidget } from './components/statswidget';
import { RecentTransactionsWidget } from './components/recenttransactionswidget';
import { SavingsProgress } from './components/savingsprogresswidget';
import { DebtsOverview } from './components/debtsoverviewwidget';
import { TopMoversWidget } from './components/topmoverswidget';
import { WealthScoreDashboardWidget } from './components/wealthscorewidget';
import { OnboardingComponent } from './components/onboarding';
import { MoneyMovementHero } from './components/money-movement-hero';
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
        RecentTransactionsWidget, TopMoversWidget, WealthScoreDashboardWidget,
        OnboardingComponent, MoneyMovementHero
    ],
    template: `
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

        <!-- ── Money movement first: what the user actually touches day to day ── -->
        <div class="mb-4 md:mb-6">
            <app-money-movement-hero />
        </div>

        <div class="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8">
            <div class="col-span-12 xl:col-span-6">
                <app-recent-transactions-widget />
            </div>
            <div class="col-span-12 xl:col-span-6">
                <app-debts-overview />
            </div>
        </div>

        <!-- ── Aspiration layer: the long game, no longer the entry point ── -->
        <div class="mt-8 md:mt-10">
            <h2 class="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-4">
                {{ i18n.t('dashboard.aspirationTitle') }}
            </h2>
            <div class="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8">
                <!-- KPI cards row (net worth + cash flow + FIRE) -->
                <app-stats-widget class="contents" />

                <div class="col-span-12 md:col-span-6 xl:col-span-6">
                    <app-wealth-score-widget />
                </div>
                <div class="col-span-12 md:col-span-6 xl:col-span-6">
                    <app-savings-progress />
                </div>
                <div class="col-span-12">
                    <app-top-movers-widget />
                </div>
            </div>
        </div>
    `
})
export class Dashboard implements OnInit {
    private patrimoineService   = inject(PatrimoineService);
    private transactionsService = inject(TransactionsService);
    private tokenService        = inject(TokenService);
    private router              = inject(Router);
    readonly i18n               = inject(I18nService);

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
        // the user has grasped the tool — stop showing the onboarding guide.
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
