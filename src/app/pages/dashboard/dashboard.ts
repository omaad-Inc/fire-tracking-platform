import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsWidget } from './components/statswidget';
import { RecentTransactionsWidget } from './components/recenttransactionswidget';
import { SavingsProgress } from './components/savingsprogresswidget';
import { DebtsOverview } from './components/debtsoverviewwidget';
import { TopMoversWidget } from './components/topmoverswidget';
import { OnboardingComponent } from './components/onboarding';
import { PatrimoineService } from '../service/patrimoine.service';
import { LayoutService } from '../../layout/service/layout.service';

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
            <app-onboarding
                (addAsset)="openAddAsset()"
                (dismissed)="showOnboarding.set(false)"
            />
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
    private layoutService     = inject(LayoutService);

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
        // Trigger the topbar's add asset dialog via LayoutService
        this.layoutService.onMenuToggle();
        // The topbar listens for this and opens the dialog
        // For a direct approach, dispatch a custom event
        window.dispatchEvent(new CustomEvent('omaad:open-add-asset'));
    }
}
