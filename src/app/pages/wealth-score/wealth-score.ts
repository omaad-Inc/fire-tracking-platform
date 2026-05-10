import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { WealthScoreService } from '../service/wealth-score.service';
import { I18nService } from '../../i18n/i18n.service';
import { AxisScore } from '../../core/services/api.service';

@Component({
    selector: 'app-wealth-score-page',
    standalone: true,
    imports: [CommonModule, RouterModule, ChartModule, ButtonModule, RippleModule],
    template: `
        <div class="px-2 md:px-0">
            <!-- Header -->
            <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 class="text-2xl md:text-3xl font-bold text-surface-900 dark:text-white mb-1">
                        {{ t('landing.wealthScore.pageTitle') }}
                    </h1>
                    <p class="text-surface-600 dark:text-surface-400">
                        {{ t('landing.wealthScore.pageSubtitle') }}
                    </p>
                </div>
                <button pButton pRipple [label]="t('landing.wealthScore.refreshBtn')"
                        icon="pi pi-refresh" [loading]="scoreService.loading()"
                        (click)="scoreService.refresh()"
                        class="!rounded-full !px-5 !py-2 !text-sm">
                </button>
            </div>

            @if (scoreService.loading() && !scoreService.hasData()) {
                <div class="flex items-center justify-center py-20">
                    <i class="pi pi-spin pi-spinner text-4xl text-surface-400"></i>
                </div>
            } @else if (!scoreService.hasData()) {
                <div class="card text-center py-16">
                    <div class="w-20 h-20 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4 mx-auto">
                        <i class="pi pi-gauge text-3xl text-surface-400"></i>
                    </div>
                    <h2 class="text-xl font-bold text-surface-900 dark:text-white mb-2">{{ t('landing.wealthScore.noDataTitle') }}</h2>
                    <p class="text-surface-500 dark:text-surface-400 max-w-md mx-auto">{{ t('landing.wealthScore.noDataDesc') }}</p>
                </div>
            } @else {
                <div class="grid grid-cols-12 gap-6">
                    <!-- Left: Radar + total score -->
                    <div class="col-span-12 lg:col-span-5">
                        <div class="card !mb-0 text-center">
                            <!-- Total score -->
                            <div class="mb-4">
                                <span class="text-7xl font-black tabular-nums" [class]="totalScoreColor()">
                                    {{ scoreService.totalScore() }}
                                </span>
                                <span class="text-2xl font-medium text-surface-400 ml-1">/ 100</span>
                            </div>

                            <!-- Radar chart -->
                            <div class="w-full max-w-[360px] mx-auto">
                                <p-chart type="radar" [data]="chartData" [options]="chartOptions" class="w-full"></p-chart>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Axis breakdown -->
                    <div class="col-span-12 lg:col-span-7">
                        <div class="card !mb-0">
                            <h2 class="text-lg font-bold text-surface-900 dark:text-white mb-5">
                                {{ t('landing.wealthScore.axisDetail') }}
                            </h2>
                            <div class="space-y-5">
                                @for (axis of scoreService.axes(); track axis.axis) {
                                    <div class="p-4 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-ochre-500/30 transition-colors">
                                        <!-- Axis header -->
                                        <div class="flex items-center justify-between mb-3">
                                            <div class="flex items-center gap-3">
                                                <div class="w-9 h-9 rounded-lg flex items-center justify-center" [class]="iconBg(axis.score)">
                                                    <i class="pi text-sm" [class]="axisIcon(axis.axis) + ' ' + iconColor(axis.score)"></i>
                                                </div>
                                                <span class="font-bold text-surface-900 dark:text-white">{{ axisLabel(axis.axis) }}</span>
                                            </div>
                                            <span class="text-2xl font-black tabular-nums" [class]="scoreColor(axis.score)">
                                                {{ axis.score }}
                                            </span>
                                        </div>

                                        <!-- Progress bar -->
                                        <div class="h-2 rounded-full bg-surface-200 dark:bg-surface-800 overflow-hidden mb-3">
                                            <div class="h-full rounded-full transition-all duration-700"
                                                 [class]="barColor(axis.score)"
                                                 [style.width.%]="axis.score"></div>
                                        </div>

                                        <!-- Insight -->
                                        <p class="text-sm text-surface-600 dark:text-surface-400 mb-3">
                                            {{ getInsight(axis) }}
                                        </p>

                                        <!-- Sub-scores -->
                                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            @for (sub of axis.sub_scores; track sub.label) {
                                                <div class="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                                                    <span class="text-xs text-surface-500 dark:text-surface-400">{{ subLabel(sub.label) }}</span>
                                                    <span class="text-xs font-bold" [class]="scoreColor(sub.score * 100 / sub.max_score)">
                                                        {{ sub.score }}/{{ sub.max_score }}
                                                    </span>
                                                </div>
                                            }
                                        </div>
                                    </div>
                                }
                            </div>
                        </div>
                    </div>
                </div>
            }
        </div>
    `
})
export class WealthScorePage implements OnInit {
    scoreService = inject(WealthScoreService);
    private i18n = inject(I18nService);
    private router = inject(Router);

    chartData: any = {};
    chartOptions: any = {};

    t(key: string): string { return this.i18n.t(key); }

    async ngOnInit() {
        await this.scoreService.load();
        this.buildChart();
    }

    totalScoreColor(): string {
        return this.scoreColor(this.scoreService.totalScore());
    }

    scoreColor(score: number): string {
        if (score >= 70) return 'text-positive-600 dark:text-positive-400';
        if (score >= 40) return 'text-ochre-600 dark:text-ochre-400';
        return 'text-negative dark:text-red-400';
    }

    barColor(score: number): string {
        if (score >= 70) return 'bg-positive-500';
        if (score >= 40) return 'bg-ochre-500';
        return 'bg-red-500';
    }

    iconBg(score: number): string {
        if (score >= 70) return 'bg-positive-100 dark:bg-positive-700/20';
        if (score >= 40) return 'bg-ochre-100 dark:bg-ochre-900/20';
        return 'bg-red-100 dark:bg-red-900/20';
    }

    iconColor(score: number): string {
        if (score >= 70) return 'text-positive-600 dark:text-positive-400';
        if (score >= 40) return 'text-ochre-600 dark:text-ochre-400';
        return 'text-red-600 dark:text-red-400';
    }

    axisIcon(axis: string): string {
        const icons: Record<string, string> = {
            epargne: 'pi-wallet',
            investissement: 'pi-chart-line',
            protection: 'pi-shield',
            planification: 'pi-flag',
            diversification: 'pi-th-large',
        };
        return icons[axis] || 'pi-circle';
    }

    axisLabel(axis: string): string {
        const key = 'landing.wealthScore.axis' + axis.charAt(0).toUpperCase() + axis.slice(1);
        return this.t(key);
    }

    subLabel(label: string): string {
        return this.t('landing.wealthScore.subLabel.' + label);
    }

    getInsight(axis: AxisScore): string {
        const parts = axis.insight_key.split('.');
        const insightName = parts[parts.length - 1];
        return this.t('landing.wealthScore.insight.' + insightName);
    }

    private buildChart(): void {
        const axes = this.scoreService.axes();
        if (!axes.length) return;

        this.chartData = {
            labels: axes.map(a => this.axisLabel(a.axis)),
            datasets: [{
                data: axes.map(a => a.score),
                borderColor: '#C77B3C',
                backgroundColor: 'rgba(199, 123, 60, 0.15)',
                borderWidth: 2.5,
                pointBackgroundColor: '#C77B3C',
                pointBorderColor: '#C77B3C',
                pointRadius: 4,
                pointHoverRadius: 6,
            }]
        };

        this.chartOptions = {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(148, 163, 184, 0.3)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    callbacks: { label: (ctx: any) => `${ctx.raw} / 100` }
                }
            },
            scales: {
                r: {
                    min: 0, max: 100,
                    ticks: { display: false, stepSize: 25 },
                    grid: { color: 'rgba(148, 163, 184, 0.25)', circular: true },
                    angleLines: { color: 'rgba(148, 163, 184, 0.25)' },
                    pointLabels: { color: 'rgba(71, 85, 105, 0.9)', font: { size: 12, weight: '600' } },
                }
            },
            animation: { duration: 600, easing: 'easeOutQuart' },
        };
    }
}
