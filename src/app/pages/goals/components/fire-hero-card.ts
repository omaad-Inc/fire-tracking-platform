import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { I18nService } from '../../../i18n/i18n.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { NavService } from '../../../core/services/nav.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { DashboardService, FIREProgress } from '../../service/dashboard.service';
import { AssetsStateService } from '../../service/assets-state.service';

/**
 * Compact "lifetime goal" card surfaced at the top of the Goals page.
 *
 * Visual: circular progress on the left + key numbers on the right + a single
 * action, "Voir le détail", that navigates to /pages/fire (the deep-dive
 * page where the user can both inspect FIRE metrics and configure them inline).
 *
 * When no FIRE target is set, renders an empty state with a single
 * "Configurer mon objectif" CTA pointing to the same /pages/fire page.
 */
@Component({
    selector: 'app-fire-hero-card',
    standalone: true,
    imports: [CommonModule, ButtonModule, AppAmountComponent],
    template: `
        <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 sm:p-6">

            <!-- Header / badge, ochre = "premium accent", reserved for FIRE -->
            <div class="relative flex items-center justify-between gap-3 mb-4">
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-semibold px-2.5 py-1 rounded-full bg-ochre-100 dark:bg-ochre-900/20 border border-ochre-200 dark:border-ochre-700/40 text-ochre-700 dark:text-ochre-400">
                        <i class="pi pi-flag text-[10px]"></i>
                        {{ i18n.t('goals.fire.badge') }}
                    </span>
                    <h2 class="text-base sm:text-lg font-bold text-surface-900 dark:text-surface-0 m-0">
                        {{ i18n.t('goals.fire.title') }}
                    </h2>
                </div>
            </div>

            <!-- Loading -->
            @if (loading()) {
                <div class="relative animate-pulse h-32 bg-surface-100 dark:bg-surface-800 rounded-xl"></div>
            }

            <!-- Not configured -->
            @if (!loading() && !isConfigured()) {
                <div class="relative flex flex-col sm:flex-row items-center gap-4 sm:gap-6 py-4">
                    <div class="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center shrink-0">
                        <i class="pi pi-flag text-2xl text-brand-700 dark:text-ochre-400"></i>
                    </div>
                    <div class="flex-1 text-center sm:text-left">
                        <h3 class="text-sm sm:text-base font-semibold text-surface-900 dark:text-surface-0 m-0 mb-1">
                            {{ i18n.t('goals.fire.notConfiguredTitle') }}
                        </h3>
                        <p class="text-xs sm:text-sm text-surface-500 dark:text-surface-400 m-0">
                            {{ i18n.t('goals.fire.notConfiguredDesc') }}
                        </p>
                    </div>
                    <p-button
                        icon="pi pi-cog"
                        [label]="i18n.t('goals.fire.configureCta')"
                        (onClick)="goConfigure()"
                        styleClass="omaad-cta !rounded-xl shrink-0"
                    />
                </div>
            }

            <!-- Configured -->
            @if (!loading() && isConfigured() && fire(); as f) {
                <div class="relative flex flex-col lg:flex-row items-center lg:items-stretch gap-5 lg:gap-7">
                    <!-- Circular progress -->
                    <div class="relative shrink-0 self-center">
                        <svg [attr.width]="size" [attr.height]="size" [attr.viewBox]="'0 0 ' + size + ' ' + size" class="-rotate-90">
                            <circle [attr.cx]="size/2" [attr.cy]="size/2" [attr.r]="radius" fill="none"
                                class="stroke-surface-200 dark:stroke-surface-700" [attr.stroke-width]="strokeWidth" />
                            <circle [attr.cx]="size/2" [attr.cy]="size/2" [attr.r]="radius" fill="none"
                                stroke="url(#fire-hero-grad)" [attr.stroke-width]="strokeWidth" stroke-linecap="round"
                                [attr.stroke-dasharray]="circumference"
                                [attr.stroke-dashoffset]="dashOffset()"
                                style="transition: stroke-dashoffset 1s ease-out;" />
                            <defs>
                                <!-- The ONE intentional gradient on this card: navy → ochre, the FIRE "lifetime journey" -->
                                <linearGradient id="fire-hero-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stop-color="#1A2740" />
                                    <stop offset="100%" stop-color="#C77B3C" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div class="absolute inset-0 flex flex-col items-center justify-center">
                            <span class="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-0">{{ progressPct() | number:'1.1-1' }}%</span>
                            <span class="text-surface-500 dark:text-surface-400 text-[10px] sm:text-xs mt-0.5">{{ i18n.t('goals.fire.towardsFire') }}</span>
                        </div>
                    </div>

                    <!-- Middle: just the headline numbers + a single time chip -->
                    <div class="flex-1 min-w-0 w-full flex flex-col justify-center gap-3 text-center lg:text-left">
                        <div class="flex flex-wrap items-end justify-center lg:justify-start gap-x-8 gap-y-3">
                            <div class="min-w-0">
                                <div class="text-[11px] uppercase tracking-wide text-surface-500 dark:text-surface-400">
                                    {{ i18n.t('goals.fire.netWorth') }}
                                </div>
                                <div class="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-0 leading-tight">
                                    <app-amount [value]="f.currentNetWorth" />
                                </div>
                            </div>
                            <div class="min-w-0">
                                <div class="text-[11px] uppercase tracking-wide text-surface-500 dark:text-surface-400">
                                    {{ i18n.t('goals.fire.target') }}
                                </div>
                                <div class="text-2xl sm:text-3xl font-bold text-ochre-600 dark:text-ochre-400 leading-tight">
                                    <app-amount [value]="f.targetAmount" />
                                </div>
                            </div>
                        </div>

                        @if (f.yearsToFire != null) {
                            <div class="flex justify-center lg:justify-start">
                                <span class="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-200">
                                    <i class="pi pi-clock text-[10px]"></i>
                                    {{ f.yearsToFire | number:'1.0-1' }}
                                    {{ f.yearsToFire === 1 ? i18n.t('goals.fire.yearSingular') : i18n.t('goals.fire.yearPlural') }}
                                    {{ i18n.t('goals.fire.remaining') }}
                                </span>
                            </div>
                        }
                    </div>

                    <!-- Right: action, vertically centered -->
                    <div class="shrink-0 self-center w-full lg:w-auto">
                        <p-button
                            icon="pi pi-arrow-up-right"
                            iconPos="right"
                            [label]="i18n.t('goals.fire.seeDetails')"
                            (onClick)="goDetails()"
                            [styleClass]="ctaButtonClass"
                        />
                    </div>
                </div>
            }
        </div>
    `,
})
export class FireHeroCardComponent implements OnInit, OnDestroy {
    private dashboard = inject(DashboardService);
    private state = inject(AssetsStateService);
    private router = inject(Router);
    private nav = inject(NavService);
    cs = inject(CurrencyService);
    i18n = inject(I18nService);

    // Slightly smaller than the dedicated FIRE page (was 78). 60 keeps the
    // card compact so short-term goals remain visible without scrolling on a laptop.
    readonly radius = 60;
    readonly strokeWidth = 10;
    readonly size = (this.radius + this.strokeWidth / 2 + 4) * 2; // includes padding for stroke
    readonly circumference = 2 * Math.PI * this.radius;

    fire = signal<FIREProgress | null>(null);
    loading = signal(true);
    progressPct = signal(0);
    dashOffset = signal(this.circumference);

    isConfigured = computed(() => {
        const f = this.fire();
        return !!(f && f.targetAmount && f.targetAmount > 0);
    });

    /** Inline class string is cleaner than reading it inline in the template. */
    readonly ctaButtonClass =
        'omaad-cta !rounded-xl !py-3 !px-5 w-full lg:w-auto';

    private sub?: Subscription;

    async ngOnInit() {
        await this.load();
        this.sub = this.state.assetsUpdated$.subscribe(() => this.load());
    }

    ngOnDestroy() {
        this.sub?.unsubscribe();
    }

    private async load() {
        this.loading.set(true);
        try {
            const data = await this.dashboard.getFIREMetrics();
            this.fire.set(data);
            const pct = Math.min(100, Math.max(0, data?.progressPct ?? 0));
            this.progressPct.set(pct);
            setTimeout(() => {
                this.dashOffset.set(this.circumference - (pct / 100) * this.circumference);
            }, 50);
        } catch (err) {
            console.error('Failed to load FIRE metrics', err);
            this.fire.set(null);
        } finally {
            this.loading.set(false);
        }
    }

    goDetails() {
        this.nav.go('pages', 'fire');
    }

    /** Empty-state CTA, same destination as the configured-state action. */
    goConfigure() {
        this.goDetails();
    }
}
