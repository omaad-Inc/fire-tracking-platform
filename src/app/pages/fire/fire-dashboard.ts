import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';


import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { DashboardService, FIREProgress } from '../service/dashboard.service';
import { AssetsStateService } from '../service/assets-state.service';
import { AppAmountComponent } from '../../core/components/app-amount.component';
import { CurrencyService } from '../../core/services/currency.service';
import { TokenService } from '../../core/services/token.service';
import { I18nService } from '../../i18n/i18n.service';
import { FireSettings } from '../settings/components/fire-settings';

@Component({
    selector: 'app-fire-dashboard',
    standalone: true,
    imports: [CommonModule, ButtonModule, DividerModule, AppAmountComponent, FireSettings],
    template: `
        <div class="flex flex-col gap-6">

            <!-- Breadcrumb / back -->
            <div class="flex items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
                <button
                    type="button"
                    (click)="back()"
                    class="inline-flex items-center gap-1.5 hover:text-surface-900 dark:hover:text-surface-0 transition-colors"
                >
                    <i class="pi pi-arrow-left text-xs"></i>
                    {{ i18n.t('goals.title') }}
                </button>
                <i class="pi pi-angle-right text-[10px]"></i>
                <span class="text-surface-900 dark:text-surface-0 font-medium truncate">{{ i18n.t('menu.financialGoal') }}</span>
            </div>

            <!-- Header -->
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-2xl bg-brand-700 dark:bg-brand-300 flex items-center justify-center shadow-card">
                    <i class="pi pi-flag text-white dark:text-brand-900 text-xl"></i>
                </div>
                <div>
                    <h1 class="text-2xl md:text-3xl font-bold text-warm-900 dark:text-warm-50 m-0">{{ i18n.t('menu.financialGoal') }}</h1>
                    <p class="text-warm-500 dark:text-warm-400 text-sm m-0">Construis. Protège. Règne.</p>
                </div>
            </div>

            <!-- No FIRE target configured -->
            @if (!loading() && (!fire() || (fire()!.targetAmount) === 0)) {
                <div class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 p-6 text-center py-12">
                    <div class="absolute inset-0 bg-gradient-to-br from-brand-50/40 via-surface-50 to-ochre-50/20 dark:from-brand-900/15 dark:via-surface-800 dark:to-ochre-900/10"></div>
                    <div class="absolute top-4 right-4 w-20 h-20 rounded-full bg-brand-100/30 dark:bg-brand-800/10 blur-lg"></div>
                    <div class="relative w-20 h-20 mx-auto rounded-full bg-brand-50 dark:bg-brand-900/40 flex items-center justify-center mb-4">
                        <i class="pi pi-flag text-3xl text-brand-700 dark:text-brand-300"></i>
                    </div>
                    <h2 class="relative text-xl font-semibold text-warm-900 dark:text-warm-50 mb-2">{{ i18n.lang() === 'fr' ? 'Définissez votre objectif financier' : 'Set your financial goal' }}</h2>
                    <p class="relative text-warm-500 dark:text-warm-400 text-sm max-w-md mx-auto mb-6">
                        Le capital à atteindre pour que vos revenus passifs couvrent vos dépenses — et que vous ayez le choix de travailler ou non.
                    </p>
                </div>
            }

            <!-- FIRE configured: show progress hero -->
            @if (!loading() && fire() && (fire()!.targetAmount) > 0) {
                <!-- Hero progress card -->
                <div class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 p-8">
                    <div class="absolute inset-0 bg-gradient-to-br from-brand-50 via-surface-50 to-ochre-50/30 dark:from-brand-900/20 dark:via-surface-800 dark:to-ochre-900/10"></div>
                    <div class="absolute top-4 right-4 w-24 h-24 rounded-full bg-brand-100/30 dark:bg-brand-800/10 blur-lg"></div>
                    <div class="absolute bottom-4 left-4 w-16 h-16 rounded-full bg-ochre-100/30 dark:bg-ochre-800/10 blur-md"></div>
                    <div class="relative flex flex-col lg:flex-row items-center gap-8">
                        <!-- Circular progress — navy → ochre, the lifetime journey -->
                        <div class="relative shrink-0">
                            <svg width="180" height="180" viewBox="0 0 180 180" class="-rotate-90">
                                <circle cx="90" cy="90" r="78" fill="none"
                                    class="stroke-warm-200 dark:stroke-warm-700" stroke-width="12" />
                                <circle cx="90" cy="90" r="78" fill="none"
                                    stroke="url(#fire-grad)" stroke-width="12" stroke-linecap="round"
                                    [attr.stroke-dasharray]="circumference"
                                    [attr.stroke-dashoffset]="dashOffset()"
                                    style="transition: stroke-dashoffset 1s ease-out;" />
                                <defs>
                                    <linearGradient id="fire-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stop-color="#1A2740" />
                                        <stop offset="100%" stop-color="#C77B3C" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div class="absolute inset-0 flex flex-col items-center justify-center">
                                <span class="text-4xl font-bold text-warm-900 dark:text-warm-50">{{ progressPct() | number:'1.1-1' }}%</span>
                                <span class="text-warm-500 dark:text-warm-400 text-xs mt-1">vers FIRE</span>
                            </div>
                        </div>

                        <!-- Main numbers -->
                        <div class="flex-1 text-center lg:text-left">
                            <p class="text-warm-500 dark:text-warm-400 text-sm mb-1">Patrimoine net actuel</p>
                            <div class="text-3xl md:text-4xl font-bold text-warm-900 dark:text-warm-50 mb-3">
                                <app-amount [value]="fire()!.currentNetWorth" />
                            </div>
                            <p class="text-warm-500 dark:text-warm-400 text-sm">
                                sur un objectif de
                                <span class="font-semibold text-ochre-600 dark:text-ochre-400">
                                    <app-amount [value]="fire()!.targetAmount!" />
                                </span>
                            </p>
                            @if (remaining() > 0) {
                                <p class="text-warm-500 dark:text-warm-400 text-sm mt-1">
                                    Encore <span class="font-semibold text-warm-900 dark:text-warm-50">
                                        <app-amount [value]="remaining()" />
                                    </span> à constituer
                                </p>
                            }
                        </div>
                    </div>
                </div>

                <!-- KPI Row -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                    <!-- Years to FIRE -->
                    <div class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 p-6 text-center h-full min-h-[140px] flex flex-col justify-center">
                        <div class="absolute inset-0 bg-gradient-to-br from-brand-50/40 via-surface-50 to-surface-50 dark:from-brand-900/10 dark:via-surface-800 dark:to-surface-800"></div>
                        <p class="relative text-surface-500 text-xs uppercase tracking-wide mb-2 truncate">Années restantes</p>
                        @if (fire()!.yearsToFire != null) {
                            <div class="relative text-3xl font-bold text-surface-900 dark:text-surface-0 truncate">
                                {{ fire()!.yearsToFire | number:'1.0-1' }}
                                <span class="text-surface-400 text-base font-normal ml-1">{{ fire()!.yearsToFire === 1 ? 'an' : 'ans' }}</span>
                            </div>
                            @if (fire()!.estimatedDate) {
                                <p class="relative text-surface-400 text-xs mt-1 truncate">~ {{ formatDate(fire()!.estimatedDate!) }}</p>
                            }
                        } @else {
                            <div class="relative text-2xl text-surface-400">—</div>
                            <p class="relative text-surface-400 text-xs mt-1">Augmentez votre épargne pour estimer</p>
                        }
                    </div>

                    <!-- Monthly passive income at FIRE -->
                    <div class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 p-6 text-center h-full min-h-[140px] flex flex-col justify-center">
                        <div class="absolute inset-0 bg-gradient-to-br from-surface-50 via-surface-50 to-ochre-50/30 dark:from-surface-800 dark:via-surface-800 dark:to-ochre-900/10"></div>
                        <p class="relative text-surface-500 text-xs uppercase tracking-wide mb-2 truncate">Revenus passifs visés</p>
                        @if ((fire()!.monthlyPassiveIncomeNeeded) > 0) {
                            <div class="relative text-3xl font-bold text-surface-900 dark:text-surface-0 truncate">
                                <app-amount [value]="fire()!.monthlyPassiveIncomeNeeded!" />
                            </div>
                            <p class="relative text-surface-400 text-xs mt-1 truncate">par mois (estimé)</p>
                        } @else {
                            <div class="relative text-2xl text-surface-400">—</div>
                        }
                    </div>

                    <!-- Savings rate -->
                    <div class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 p-6 text-center h-full min-h-[140px] flex flex-col justify-center">
                        <div class="absolute inset-0 bg-gradient-to-br from-surface-50 via-surface-50 to-brand-50/20 dark:from-surface-800 dark:via-surface-800 dark:to-brand-900/10"></div>
                        <p class="relative text-warm-500 dark:text-warm-400 text-xs uppercase tracking-wide mb-2 truncate">Taux d'épargne</p>
                        @if ((fire()!.savingsRate) > 0) {
                            <div class="relative text-3xl font-bold truncate"
                                 [class.text-positive]="(fire()!.savingsRate) >= 20"
                                 [class.text-warning]="(fire()!.savingsRate) < 20 && (fire()!.savingsRate) >= 10"
                                 [class.text-negative]="(fire()!.savingsRate) < 10">
                                {{ fire()!.savingsRate | number:'1.0-1' }}%
                            </div>
                            <p class="relative text-warm-400 text-xs mt-1 truncate">
                                @if ((fire()!.savingsRate) >= 20) { Excellent rythme }
                                @else if ((fire()!.savingsRate) >= 10) { Bon rythme }
                                @else { À améliorer }
                            </p>
                        } @else {
                            <div class="relative text-2xl text-warm-400">—</div>
                            <p class="relative text-warm-400 text-xs mt-1">Ajoutez des transactions</p>
                        }
                    </div>
                </div>
            }

            <!-- Loading skeleton -->
            @if (loading()) {
                <div class="rounded-2xl border border-surface-200 dark:border-surface-700 p-5 animate-pulse">
                    <div class="h-32 bg-surface-200 dark:bg-surface-700 rounded-xl"></div>
                </div>
            }

            <!-- Settings (always visible — to configure or update target) -->
            <app-fire-settings />
        </div>
    `
})
export class FireDashboardPage implements OnInit, OnDestroy {
    private dashboardService = inject(DashboardService);
    private stateService = inject(AssetsStateService);
    private tokenService = inject(TokenService);
    private router = inject(Router);
    cs = inject(CurrencyService);
    i18n = inject(I18nService);

    back() {
        this.router.navigate(['/', this.i18n.lang(), 'pages', 'goals']);
    }

    readonly circumference = 2 * Math.PI * 78; // r=78

    fire = signal<FIREProgress | null>(null);
    loading = signal(true);

    private subscription?: Subscription;

    progressPct = signal(0);

    dashOffset = signal(this.circumference);

    remaining(): number {
        const f = this.fire();
        if (!f || !f.targetAmount) return 0;
        return Math.max(0, f.targetAmount - f.currentNetWorth);
    }

    async ngOnInit() {
        await this.load();
        this.subscription = this.stateService.assetsUpdated$.subscribe(() => this.load());
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

    private async load() {
        this.loading.set(true);
        try {
            const data = await this.dashboardService.getFIREMetrics();
            this.fire.set(data);
            const pct = Math.min(100, Math.max(0, data?.progressPct ?? 0));
            this.progressPct.set(pct);
            // Animate the SVG ring
            setTimeout(() => {
                this.dashOffset.set(this.circumference - (pct / 100) * this.circumference);
            }, 50);
        } catch (e) {
            console.error('Failed to load FIRE metrics', e);
            this.fire.set(null);
        } finally {
            this.loading.set(false);
        }
    }

    formatDate(iso: string): string {
        const d = new Date(iso);
        const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
        return `${months[d.getMonth()]} ${d.getFullYear()}`;
    }
}
