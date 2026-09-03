import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeHero } from './components/homehero';
import { RecentTransactionsWidget } from './components/recenttransactionswidget';
import { SavingsProgress } from './components/savingsprogresswidget';
import { DebtsOverview } from './components/debtsoverviewwidget';
import { WealthScoreDashboardWidget } from './components/wealthscorewidget';
import { OnboardingComponent } from './components/onboarding';
import { MarketGlanceWidget } from './components/marketglancewidget';
import { SectionHeaderComponent } from '../../core/ui/section-header.component';
import { Router } from '@angular/router';
import { PatrimoineService } from '../service/patrimoine.service';
import { TransactionsService } from '../service/transactions.service';
import { DashboardService } from '../service/dashboard.service';
import { TokenService } from '../../core/services/token.service';
import { I18nService } from '../../i18n/i18n.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule, HomeHero, SavingsProgress, DebtsOverview,
        RecentTransactionsWidget, WealthScoreDashboardWidget, OnboardingComponent,
        MarketGlanceWidget, SectionHeaderComponent
    ],
    template: `
        <!-- One <h1> per page for a correct heading hierarchy; visually hidden
             since the KPI cards carry the visible titles (P2-A11Y-2). -->
        <h1 class="sr-only">{{ t('dashboard.pageTitle') }}</h1>

        <!-- P2-6: below xl the home is the single column it always was, in the
             historical order (hero, markets, onboarding, situation, month,
             debts). From xl (1200px) it becomes two independent columns: a main
             column (8/12) with the hero, the markets card and this month's
             activity, and a rail (4/12) with the situation band (score over
             savings) and the debts band. The two wrappers are display:contents
             below xl, so their children are the flex column's items and the
             order-N classes keep the phone order; from xl they are real grid
             cells and each column flows on its own, which is what avoids dead
             air between blocks of unequal height. Measured at 1440px the two
             columns land within ~60px of each other. -->
        <div class="flex flex-col xl:grid xl:grid-cols-12 xl:gap-x-8 xl:items-start" data-testid="home-grid">

        <!-- Main column -->
        <div class="contents xl:block xl:col-span-8">
            <!-- S5-1 "Am I okay?" hero: net worth + trend, this-month cash-flow, the one
                 nudge, and FIRE as a secondary indicator. Subsumes the old flat KPI row
                 and the top alerts banner. -->
            <div class="omaad-enter order-1" data-testid="home-hero"><app-home-hero /></div>

            <!-- Markets card (P2-3): the home-screen entry to the market hub. Market
                 reference data, so it shows for a brand-new account as well and
                 sits between the hero and the personal story bands. -->
            <div class="omaad-enter omaad-d1 pb-6 md:pb-8 order-2"><app-market-glance-widget /></div>

            <!-- Onboarding: shown only to a brand-new user; hidden once ANY step is done, or dismissed -->
            @if (showOnboarding()) {
                <div class="pb-6 order-3">
                    <app-onboarding
                        [hasAssets]="hasAssets()"
                        [hasTransactions]="hasTransactions()"
                        [hasFireGoal]="hasFireGoal()"
                        (addAsset)="openAddAsset()"
                        (dismissed)="showOnboarding.set(false)"
                    />
                </div>
            }

            <!-- S5-2: the story bands. Widgets self-title, so band headers group
                 rather than repeat. A brand-new user (onboarding guide showing)
                 does not see this stack of empty cards at all: the home is hero +
                 onboarding until they add their first data. -->
            @if (!showOnboarding()) {
                <!-- Band 2: this month (activity). No band header here (owner call,
                     2026-09-03): the widget titles itself and the extra "Ce mois-ci /
                     Vos transactions recentes" line broke the visual rhythm. -->
                <section class="omaad-enter omaad-d2 order-5" data-testid="home-month">
                    <app-recent-transactions-widget />
                </section>
            }
        </div>

        <!-- Rail -->
        @if (!showOnboarding()) {
        <div class="contents xl:block xl:col-start-9 xl:col-span-4">
            <!-- Band 1: where you stand (health score + savings momentum).
                 Two-up at md; the rail at xl stacks them again. No band header
                 (owner call, 2026-09-03): the cards title themselves and the
                 header broke the alignment with the hero column. -->
            <section class="omaad-enter omaad-d1 order-4" data-testid="home-situation">
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4 md:gap-6 lg:gap-8">
                    <div data-testid="home-score">
                        <app-wealth-score-widget />
                    </div>
                    <div>
                        <app-savings-progress />
                    </div>
                </div>
            </section>

            <!-- Band 3: debts (what you owe) -->
            <section class="omaad-enter omaad-d3 mt-8 md:mt-10 order-6" data-testid="home-debts">
                <app-debts-overview />
            </section>
        </div>
        }
        </div>
    `
})
export class Dashboard implements OnInit {
    private patrimoineService   = inject(PatrimoineService);
    private transactionsService = inject(TransactionsService);
    private dashboardService    = inject(DashboardService);
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

        const fireTarget = this.tokenService.user()?.fire_target_amount ?? 0;
        this.hasFireGoal.set(fireTarget > 0);

        // Reuse the summary the hero already loads (same cachedResource → zero
        // extra request) instead of fetching the full asset + transaction lists
        // just to decide onboarding visibility (perf S-boot: 2 round-trips saved
        // on every dashboard visit, on a slow backend that's real seconds).
        try {
            const stats = await this.dashboardService.getStats();
            const hasAssets = stats.totalAssets > 0;
            const hasFlux = stats.monthlyIncome > 0 || stats.monthlyExpenses > 0;
            if (hasAssets || hasFlux || fireTarget > 0) {
                this.hasAssets.set(hasAssets);
                this.hasTransactions.set(hasFlux);
                this.showOnboarding.set(false);
                return;
            }
        } catch { /* cold summary failure: fall through to the list checks */ }

        // Near-empty account only: the summary can't tell "no transactions ever"
        // from "none this month", so pay for the precise list checks just for
        // the (rare) users who might actually need onboarding.
        const [assets, transactions] = await Promise.all([
            this.patrimoineService.getAssets().catch(() => [] as unknown[]),
            this.transactionsService.getRecords().catch(() => [] as unknown[]),
        ]);

        this.hasAssets.set(assets.length > 0);
        this.hasTransactions.set(transactions.length > 0);

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
