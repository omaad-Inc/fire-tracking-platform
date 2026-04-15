import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsWidget } from './components/statswidget';
import { RecentTransactionsWidget } from './components/recenttransactionswidget';
import { SavingsProgress } from './components/savingsprogresswidget';
import { DebtsOverview } from './components/debtsoverviewwidget';
import { TopMoversWidget } from './components/topmoverswidget';
import { OnboardingComponent } from './components/onboarding';
import { Router } from '@angular/router';
import { PatrimoineService } from '../service/patrimoine.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule, StatsWidget, SavingsProgress, DebtsOverview,
        RecentTransactionsWidget, TopMoversWidget, OnboardingComponent
    ],
    template: `
        <!-- Onboarding for new users: shown when no assets and not dismissed -->
        @if (showOnboarding()) {
            <div class="pb-6">
                <app-onboarding
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
export class Dashboard implements OnInit {
    private patrimoineService = inject(PatrimoineService);
    private router = inject(Router);

    showOnboarding = signal(false);

    async ngOnInit() {
        // Show onboarding if user has no assets and hasn't dismissed it before
        const dismissed = localStorage.getItem('omaad_onboarding_dismissed') === 'true';
        if (!dismissed) {
            try {
                const assets = await this.patrimoineService.getAssets();
                this.showOnboarding.set(assets.length === 0);
            } catch {
                // If API fails, don't show onboarding
            }
        }
    }

    openAddAsset() {
        const match = this.router.url.match(/^\/(fr|en)\//);
        const lang = match ? match[1] : 'fr';
        this.router.navigate(['/', lang, 'pages', 'patrimoine', 'add-asset']);
    }
}
