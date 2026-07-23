import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeHero } from './components/homehero';
import { RecentTransactionsWidget } from './components/recenttransactionswidget';
import { SavingsProgress } from './components/savingsprogresswidget';
import { DebtsOverview } from './components/debtsoverviewwidget';
import { TopMoversWidget } from './components/topmoverswidget';
import { WealthScoreDashboardWidget } from './components/wealthscorewidget';
import { OnboardingComponent } from './components/onboarding';
import { SectionHeaderComponent } from '../../core/ui/section-header.component';
import { Router } from '@angular/router';
import { PatrimoineService } from '../service/patrimoine.service';
import { TransactionsService } from '../service/transactions.service';
import { TokenService } from '../../core/services/token.service';
import { I18nService } from '../../i18n/i18n.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule, HomeHero, SavingsProgress, DebtsOverview,
        RecentTransactionsWidget, TopMoversWidget, WealthScoreDashboardWidget, OnboardingComponent,
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

            <!-- Band 3: debts + asset movers -->
            <section>
                <app-section-header [title]="t('home.sections.assets')" [subtitle]="t('home.sections.assetsSub')" />
                <div class="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8">
                    <div class="col-span-12 md:col-span-6">
                        <app-debts-overview />
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <app-top-movers-widget />
                    </div>
                </div>
            </section>
        </div>
        }
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
