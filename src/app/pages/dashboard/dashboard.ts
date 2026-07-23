import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeHero } from './components/homehero';
import { RecentTransactionsWidget } from './components/recenttransactionswidget';
import { SavingsProgress } from './components/savingsprogresswidget';
import { DebtsOverview } from './components/debtsoverviewwidget';
import { WealthScoreDashboardWidget } from './components/wealthscorewidget';
import { OnboardingComponent } from './components/onboarding';
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
        SectionHeaderComponent
    ],
    template: `
        <!-- One <h1> per page for a correct heading hierarchy; visually hidden
             since the KPI cards carry the visible titles (P2-A11Y-2). -->
        <h1 class="sr-only">{{ t('dashboard.pageTitle') }}</h1>

        <!-- S5-1 "Am I okay?" hero: net worth + trend, this-month cash-flow, the one
             nudge, and FIRE as a secondary indicator. Subsumes the old flat KPI row
             and the top alerts banner. -->
        <app-home-hero />

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

        <!-- S5-2: the widgets below are reordered into a deliberate story with
             higher-altitude band headers (widgets self-title, so headers group
             rather than repeat). Each band pairs HEIGHT-COMPATIBLE widgets so a
             two-up row never puts a tall card (the radar) beside a short one (a
             one-line debts list), which would leave a hollow gap.
             A brand-new user (onboarding guide showing) does not see this stack of
             empty cards at all: the home is hero + onboarding until they add their
             first data, then the story bands appear. -->
        @if (!showOnboarding()) {
        <div class="space-y-8 md:space-y-10">
            <!-- Band 1: where you stand (health score + savings momentum) -->
            <section>
                <app-section-header [title]="t('home.sections.situation')" [subtitle]="t('home.sections.situationSub')" />
                <div class="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8">
                    <div class="col-span-12 md:col-span-6">
                        <app-wealth-score-widget />
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <app-savings-progress />
                    </div>
                </div>
            </section>

            <!-- Band 2: this month (activity) -->
            <section>
                <app-section-header [title]="t('home.sections.month')" [subtitle]="t('home.sections.monthSub')" />
                <app-recent-transactions-widget />
            </section>

            <!-- Band 3: debts (what you owe), full-width list like recent transactions -->
            <section>
                <app-section-header [title]="t('home.sections.debts')" [subtitle]="t('home.sections.debtsSub')" />
                <app-debts-overview />
            </section>
        </div>
        }
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
