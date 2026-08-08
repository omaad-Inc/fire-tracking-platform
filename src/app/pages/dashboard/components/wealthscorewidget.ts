import { Component, computed, effect, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { ScoreLever, WealthScoreService } from '../../service/wealth-score.service';
import { CoachingService } from '../../service/coaching.service';
import { I18nService } from '../../../i18n/i18n.service';
import { NavService } from '../../../core/services/nav.service';
import { prefersReducedMotion } from '../../../core/theme/chart-theme';
import { LayoutService } from '../../../layout/service/layout.service';
import { UiCardComponent } from '../../../core/ui';

/** Where a sub-score sends the user when coaching has no recommendation for its
 *  axis. Segments are lang-prefixed by NavService; `?` carries query params. */
const LEVER_ROUTES: Readonly<Record<string, string>> = {
    savings_rate:          'pages/transaction',
    emergency_fund_months: 'pages/goals',
    active_goals:          'pages/goals',
    investment_rate:       'pages/patrimoine',
    has_investments:       'pages/patrimoine',
    portfolio_diversity:   'pages/patrimoine',
    debt_ratio:            'pages/debts',
    emergency_goal:        'pages/goals',
    expense_stability:     'pages/transaction',
    fire_target_set:       'pages/goals?tab=fire',
    goals_defined:         'pages/goals',
    fire_progress:         'pages/goals?tab=fire',
    asset_class_count:     'pages/patrimoine',
    concentration_hhi:     'pages/patrimoine',
    multi_currency:        'pages/patrimoine',
};

@Component({
    selector: 'app-wealth-score-widget',
    standalone: true,
    imports: [CommonModule, RouterModule, ChartModule, UiCardComponent],
    template: `
        <app-ui-card [flush]="true" padding="md" innerClass="relative overflow-hidden h-full flex flex-col">
            <div class="relative flex items-center justify-between mb-4">
                <div class="font-semibold text-xl text-surface-900 dark:text-surface-0">
                    {{ t('landing.wealthScore.eyebrow') }}
                </div>
                <a [routerLink]="link('pages', 'wealth-score')"
                   class="text-sm font-medium text-brand-700 dark:text-ochre-400 hover:underline cursor-pointer">
                    {{ t('landing.wealthScore.axisDetail') }} →
                </a>
            </div>

            @if (scoreService.loading()) {
                <div class="relative flex-1 flex items-center justify-center">
                    <div class="animate-pulse flex flex-col items-center gap-4">
                        <div class="w-32 h-32 rounded-full bg-surface-200 dark:bg-surface-700"></div>
                        <div class="h-4 w-20 rounded bg-surface-200 dark:bg-surface-700"></div>
                    </div>
                </div>
            } @else if (!scoreService.hasData()) {
                <div class="relative flex-1 flex flex-col items-center justify-center text-center py-8">
                    <div class="w-14 h-14 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-3">
                        <i class="pi pi-gauge text-2xl text-surface-400"></i>
                    </div>
                    <p class="text-surface-600 dark:text-surface-400 text-sm">{{ t('landing.wealthScore.noDataTitle') }}</p>
                    <p class="text-surface-400 dark:text-surface-500 text-xs mt-1">{{ t('landing.wealthScore.noDataDesc') }}</p>
                </div>
            } @else {
                <div class="relative flex-1 flex flex-col items-center justify-center">
                    <!-- Score number -->
                    <div class="text-center mb-2">
                        <span class="text-5xl font-black tabular-nums" [class]="scoreColor()">
                            {{ scoreService.totalScore() }}
                        </span>
                        <span class="text-lg font-medium text-surface-400 dark:text-surface-500 ml-1">/ 100</span>
                    </div>

                    <!-- Mini radar -->
                    <div class="w-full max-w-[220px]">
                        <p-chart type="radar" [data]="chartData" [options]="chartOptions" class="w-full"></p-chart>
                    </div>

                    <!-- Axis pills -->
                    <div class="flex flex-wrap justify-center gap-2 mt-3">
                        @for (axis of scoreService.axes(); track axis.axis) {
                            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                                 [class]="pillClass(axis.score)">
                                <span class="w-1.5 h-1.5 rounded-full" [class]="dotClass(axis.score)"></span>
                                {{ axisLabel(axis.axis) }}
                                <span class="font-bold">{{ axis.score }}</span>
                            </div>
                        }
                    </div>
                </div>

                <!-- The one move that buys the most points, derived from the
                     sub-score gaps weighted by their axis. -->
                @if (lever(); as lv) {
                    <button type="button" (click)="actOnLever(lv)"
                            class="omaad-press mt-4 w-full flex items-center gap-2.5 text-left rounded-xl px-3 py-2.5
                                   border border-ochre-200 dark:border-white/10 bg-ochre-50/60 dark:bg-surface-800
                                   hover:bg-ochre-50 dark:hover:bg-surface-700 transition-colors">
                        <span class="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center
                                     bg-ochre-100 dark:bg-ochre-900/30 text-ochre-600 dark:text-ochre-400">
                            <i class="pi pi-bolt text-xs"></i>
                        </span>
                        <span class="min-w-0 flex-1">
                            <span class="block text-[10px] font-semibold uppercase tracking-wide text-surface-400 dark:text-ochre-400">
                                {{ t('landing.wealthScore.lever.title') }}
                            </span>
                            <span class="block text-sm text-surface-800 dark:text-surface-200 truncate">
                                {{ leverLabel(lv) }}
                            </span>
                        </span>
                        <span class="shrink-0 text-xs font-bold tabular-nums text-positive-600 dark:text-positive-400">
                            {{ t('landing.wealthScore.lever.gain', { points: lv.points }) }}
                        </span>
                    </button>
                }
            }
        </app-ui-card>
    `
})
export class WealthScoreDashboardWidget implements OnInit {
    scoreService = inject(WealthScoreService);
    private coaching = inject(CoachingService);
    private i18n = inject(I18nService);
    private router = inject(Router);
    private nav = inject(NavService);
    private layout = inject(LayoutService);

    chartData: any = {};
    chartOptions: any = {};

    readonly lever = computed(() => this.scoreService.biggestLever());

    /** Rebuild the radar on theme flips (grid/point colors are theme-dependent). */
    private themeEffect = effect(() => {
        this.layout.isDarkTheme();                    // tracked dependency
        if (this.scoreService.axes().length) this.buildChart();
    });

    t(key: string, params?: Record<string, string | number>): string { return this.i18n.t(key, params); }

    link(...segments: string[]): any[] {
        return this.nav.link(...segments);
    }

    async ngOnInit() {
        await this.scoreService.load();
        this.buildChart();
        // Shared cached fetch (the hero loads it too), so this costs no extra request.
        this.coaching.load().catch(() => { /* the lever falls back to its generic label */ });
    }

    scoreColor(): string {
        const s = this.scoreService.totalScore();
        if (s >= 70) return 'text-positive-600 dark:text-positive-400';
        if (s >= 40) return 'text-ochre-600 dark:text-ochre-400';
        return 'text-negative dark:text-red-400';
    }

    pillClass(score: number): string {
        if (score >= 70) return 'bg-positive-50 dark:bg-positive-900/15 text-positive-700 dark:text-positive-400';
        if (score >= 40) return 'bg-ochre-50 dark:bg-ochre-900/15 text-ochre-700 dark:text-ochre-400';
        return 'bg-red-50 dark:bg-red-900/15 text-red-700 dark:text-red-400';
    }

    dotClass(score: number): string {
        if (score >= 70) return 'bg-positive-500';
        if (score >= 40) return 'bg-ochre-500';
        return 'bg-red-500';
    }

    axisLabel(axis: string): string {
        const key = 'landing.wealthScore.axis' + axis.charAt(0).toUpperCase() + axis.slice(1);
        return this.t(key);
    }

    /** Prefer the coaching recommendation for that axis (it is specific and
     *  already localized); otherwise name the sub-score to improve. */
    leverLabel(lv: ScoreLever): string {
        const rec = this.coaching.forAxis(lv.axis);
        if (rec) return this.coaching.action(rec);
        return this.t('landing.wealthScore.lever.improve', {
            label: this.t('landing.wealthScore.subLabel.' + lv.subLabel),
        });
    }

    actOnLever(lv: ScoreLever): void {
        const rec = this.coaching.forAxis(lv.axis);
        const route = rec ? rec.action_route : LEVER_ROUTES[lv.subLabel] ?? 'pages/wealth-score';
        const [path, query] = route.replace(/^\//, '').split('?');
        const segments = path.split('/').filter(Boolean);

        const queryParams: Record<string, string> = {};
        if (query) for (const pair of query.split('&')) {
            const [k, v] = pair.split('=');
            if (k) queryParams[k] = v ?? '';
        }
        this.router.navigate(this.nav.link(...segments), { queryParams });
    }

    private buildChart(): void {
        const axes = this.scoreService.axes();
        if (!axes.length) return;

        const isDark = this.layout.isDarkTheme();
        const gridColor = isDark ? 'rgba(245, 247, 251, 0.10)' : 'rgba(26, 39, 64, 0.12)';

        this.chartData = {
            labels: axes.map(a => this.axisLabel(a.axis)),
            datasets: [{
                data: axes.map(a => a.score),
                borderColor: '#C77B3C',
                backgroundColor: 'rgba(199, 123, 60, 0.15)',
                borderWidth: 2,
                pointBackgroundColor: '#C77B3C',
                pointBorderColor: isDark ? '#0F1A2E' : '#ffffff',
                pointBorderWidth: 1.5,
                pointRadius: 3,
                pointHoverRadius: 5,
            }]
        };

        this.chartOptions = {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                r: {
                    min: 0, max: 100,
                    ticks: { display: false, stepSize: 25 },
                    grid: { color: gridColor, circular: true },
                    angleLines: { color: gridColor },
                    pointLabels: { display: false },
                }
            },
            animation: prefersReducedMotion() ? false : { duration: 400 },
        };
    }
}
