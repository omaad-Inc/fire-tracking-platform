import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { WealthScoreService } from '../../service/wealth-score.service';
import { I18nService } from '../../../i18n/i18n.service';

@Component({
    selector: 'app-wealth-score-widget',
    standalone: true,
    imports: [CommonModule, RouterModule, ChartModule],
    template: `
        <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 h-full flex flex-col">
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
            }
        </div>
    `
})
export class WealthScoreDashboardWidget implements OnInit {
    scoreService = inject(WealthScoreService);
    private i18n = inject(I18nService);
    private router = inject(Router);

    chartData: any = {};
    chartOptions: any = {};

    t(key: string): string { return this.i18n.t(key); }

    link(...segments: string[]): any[] {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        const lang = match ? match[1] : 'fr';
        return ['/', lang, ...segments];
    }

    async ngOnInit() {
        await this.scoreService.load();
        this.buildChart();
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

    private buildChart(): void {
        const axes = this.scoreService.axes();
        if (!axes.length) return;

        this.chartData = {
            labels: axes.map(a => this.axisLabel(a.axis)),
            datasets: [{
                data: axes.map(a => a.score),
                borderColor: '#C77B3C',
                backgroundColor: 'rgba(199, 123, 60, 0.15)',
                borderWidth: 2,
                pointBackgroundColor: '#C77B3C',
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
                    grid: { color: 'rgba(148, 163, 184, 0.25)', circular: true },
                    angleLines: { color: 'rgba(148, 163, 184, 0.25)' },
                    pointLabels: { display: false },
                }
            },
            animation: { duration: 400 },
        };
    }
}
