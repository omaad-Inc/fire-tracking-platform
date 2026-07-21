import { Component, inject, OnInit, signal } from '@angular/core';
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
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center shrink-0">
                        <i class="pi pi-gauge text-brand-700 dark:text-ochre-400 text-xl"></i>
                    </div>
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-surface-900 dark:text-surface-0 mb-1">
                            {{ t('landing.wealthScore.pageTitle') }}
                        </h1>
                        <p class="text-surface-600 dark:text-surface-400">
                            {{ t('landing.wealthScore.pageSubtitle') }}
                        </p>
                    </div>
                </div>
                <button pButton pRipple [label]="t('landing.wealthScore.refreshBtn')"
                        icon="pi pi-refresh" [loading]="scoreService.loading()"
                        (click)="scoreService.refresh()"
                        class="omaad-cta !rounded-xl !px-5 !py-2 !text-sm">
                </button>
            </div>

            <!-- Explanation card — what the score means, what's a good score, how it updates -->
            <div class="mb-6 overflow-hidden rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 border-l-4 border-l-ochre-500">
                <button
                    type="button"
                    (click)="toggleHelp()"
                    [attr.aria-expanded]="helpOpen()"
                    class="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-10 h-10 rounded-xl bg-ochre-100 dark:bg-ochre-900/20 flex items-center justify-center shrink-0">
                            <i class="pi pi-info-circle text-ochre-600 dark:text-ochre-400"></i>
                        </div>
                        <div class="min-w-0">
                            <h2 class="text-base md:text-lg font-bold text-surface-900 dark:text-surface-0 truncate">
                                {{ t('landing.wealthScore.help.title') }}
                            </h2>
                            <p class="hidden sm:block text-xs md:text-sm text-surface-500 dark:text-surface-400 truncate">
                                {{ t('landing.wealthScore.help.subtitle') }}
                            </p>
                        </div>
                    </div>
                    <i class="pi pi-chevron-down shrink-0 text-surface-500 transition-transform duration-200"
                       [class.rotate-180]="helpOpen()"></i>
                </button>

                @if (helpOpen()) {
                    <div class="px-5 pb-5 pt-1 space-y-6 border-t border-surface-200 dark:border-surface-800">
                        <!-- Step 1: What is it -->
                        <section class="pt-4">
                            <h3 class="text-[11px] font-bold uppercase tracking-[0.08em] text-ochre-600 dark:text-ochre-400 mb-2">
                                {{ t('landing.wealthScore.help.whatTitle') }}
                            </h3>
                            <p class="text-sm md:text-[15px] text-surface-700 dark:text-surface-300 leading-relaxed">
                                {{ t('landing.wealthScore.help.whatBody') }}
                            </p>
                        </section>

                        <!-- Step 2: The 5 axes -->
                        <section>
                            <h3 class="text-[11px] font-bold uppercase tracking-[0.08em] text-ochre-600 dark:text-ochre-400 mb-3">
                                {{ t('landing.wealthScore.help.axesTitle') }}
                            </h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                @for (axis of axisInfo; track axis.key) {
                                    <div class="flex items-start gap-3 p-3 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50">
                                        <div class="w-9 h-9 rounded-lg bg-ochre-100 dark:bg-ochre-900/20 flex items-center justify-center shrink-0">
                                            <i class="pi text-ochre-600 dark:text-ochre-400" [ngClass]="axisIcon(axis.key)"></i>
                                        </div>
                                        <div class="min-w-0 flex-1">
                                            <div class="flex items-center gap-2 flex-wrap">
                                                <strong class="text-sm font-semibold text-surface-900 dark:text-surface-0">
                                                    {{ axisLabel(axis.key) }}
                                                </strong>
                                                <span class="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-ochre-100 dark:bg-ochre-900/20 border border-ochre-200 dark:border-ochre-700/40 text-ochre-700 dark:text-ochre-400">
                                                    {{ axis.weight }}%
                                                </span>
                                            </div>
                                            <p class="text-xs text-surface-600 dark:text-surface-400 mt-1 leading-snug">
                                                {{ t('landing.wealthScore.help.axes.' + axis.key) }}
                                            </p>
                                        </div>
                                    </div>
                                }
                            </div>
                        </section>

                        <!-- Step 3: Score bands -->
                        <section>
                            <h3 class="text-[11px] font-bold uppercase tracking-[0.08em] text-ochre-600 dark:text-ochre-400 mb-3">
                                {{ t('landing.wealthScore.help.bandsTitle') }}
                            </h3>
                            <div class="space-y-2">
                                @for (band of scoreBands; track band.key) {
                                    <div class="flex items-center gap-3 p-2.5 rounded-lg" [ngClass]="band.bg">
                                        <span class="shrink-0 min-w-[70px] text-center text-[11px] font-bold tabular-nums px-2.5 py-1 rounded-md text-white" [ngClass]="band.pill">
                                            {{ t('landing.wealthScore.help.bands.' + band.key + 'Range') }}
                                        </span>
                                        <div class="min-w-0 text-sm leading-snug">
                                            <strong class="text-surface-900 dark:text-surface-0">
                                                {{ t('landing.wealthScore.help.bands.' + band.key + 'Label') }}
                                            </strong>
                                            <span class="text-surface-600 dark:text-surface-400">
                                                — {{ t('landing.wealthScore.help.bands.' + band.key + 'Desc') }}
                                            </span>
                                        </div>
                                    </div>
                                }
                            </div>
                        </section>

                        <!-- Step 4: How it updates -->
                        <section>
                            <h3 class="text-[11px] font-bold uppercase tracking-[0.08em] text-ochre-600 dark:text-ochre-400 mb-2">
                                {{ t('landing.wealthScore.help.updateTitle') }}
                            </h3>
                            <p class="text-sm md:text-[15px] text-surface-700 dark:text-surface-300 leading-relaxed">
                                {{ t('landing.wealthScore.help.updateBody') }}
                            </p>
                        </section>
                    </div>
                }
            </div>

            @if (scoreService.loading() && !scoreService.hasData()) {
                <!-- Skeleton reserving the radar + axis-list layout (P3-9) — no spinner→content jump -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
                    <div class="h-72 rounded-2xl bg-surface-100 dark:bg-surface-800"></div>
                    <div class="space-y-3">
                        @for (i of [1, 2, 3, 4, 5]; track i) {
                            <div class="h-16 rounded-2xl bg-surface-100 dark:bg-surface-800"></div>
                        }
                    </div>
                </div>
            } @else if (!scoreService.hasData()) {
                <div class="text-center py-16 rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800">
                    <div class="w-20 h-20 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4 mx-auto">
                        <i class="pi pi-gauge text-3xl text-surface-400"></i>
                    </div>
                    <h2 class="text-xl font-bold text-surface-900 dark:text-surface-0 mb-2">{{ t('landing.wealthScore.noDataTitle') }}</h2>
                    <p class="text-surface-500 dark:text-surface-400 max-w-md mx-auto">{{ t('landing.wealthScore.noDataDesc') }}</p>
                </div>
            } @else {
                <div class="grid grid-cols-12 gap-6">
                    <!-- Left: Radar + total score -->
                    <div class="col-span-12 lg:col-span-5">
                        <div class="rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 sm:p-6 text-center">
                            <!-- Total score -->
                            <div class="mb-4">
                                <span class="text-7xl font-black tabular-nums" [class]="totalScoreColor()">
                                    {{ scoreService.totalScore() }}
                                </span>
                                <span class="text-2xl font-medium text-surface-400 ml-1">/ 100</span>
                            </div>

                            <!-- Radar chart -->
                            <div class="w-full max-w-[360px] mx-auto">
                                <p-chart type="radar" [data]="chartData" [options]="chartOptions" class="w-full"
                                         role="img" [attr.aria-label]="chartAriaLabel()"></p-chart>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Axis breakdown -->
                    <div class="col-span-12 lg:col-span-7">
                        <div class="rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 sm:p-6">
                            <h2 class="text-lg font-bold text-surface-900 dark:text-surface-0 mb-5">
                                {{ t('landing.wealthScore.axisDetail') }}
                            </h2>
                            <div class="space-y-5">
                                @for (axis of scoreService.axes(); track axis.axis) {
                                    <div class="p-4 rounded-xl border border-surface-200 dark:border-surface-800 hover:border-ochre-500/30 transition-colors">
                                        <!-- Axis header -->
                                        <div class="flex items-center justify-between mb-3">
                                            <div class="flex items-center gap-3">
                                                <div class="w-9 h-9 rounded-lg flex items-center justify-center" [class]="iconBg(axis.score)">
                                                    <i class="pi text-sm" [class]="axisIcon(axis.axis) + ' ' + iconColor(axis.score)"></i>
                                                </div>
                                                <span class="font-bold text-surface-900 dark:text-surface-0">{{ axisLabel(axis.axis) }}</span>
                                            </div>
                                            <span class="text-2xl font-black tabular-nums" [class]="scoreColor(axis.score)">
                                                {{ axis.score }}
                                            </span>
                                        </div>

                                        <!-- Progress bar -->
                                        <div class="h-2 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden mb-3">
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

    // Help card — collapsible explanation panel, state persisted in localStorage
    private readonly HELP_STORAGE_KEY = 'omaad_wealth_score_help_open';
    helpOpen = signal(this.loadHelpState());

    readonly axisInfo: ReadonlyArray<{ key: string; weight: number }> = [
        { key: 'epargne',         weight: 25 },
        { key: 'investissement',  weight: 20 },
        { key: 'protection',      weight: 15 },
        { key: 'planification',   weight: 25 },
        { key: 'diversification', weight: 15 },
    ];

    readonly scoreBands: ReadonlyArray<{ key: string; bg: string; pill: string }> = [
        { key: 'excellent', bg: 'bg-positive-50 dark:bg-positive-900/10', pill: 'bg-positive-500' },
        { key: 'healthy',   bg: 'bg-ochre-50 dark:bg-ochre-900/10',       pill: 'bg-ochre-500'    },
        { key: 'growing',   bg: 'bg-surface-100 dark:bg-surface-800/40',  pill: 'bg-surface-500'  },
        { key: 'starting',  bg: 'bg-negative-50 dark:bg-negative-500/10',  pill: 'bg-negative-500' },
    ];

    toggleHelp(): void {
        this.helpOpen.update(v => !v);
        try { localStorage.setItem(this.HELP_STORAGE_KEY, String(this.helpOpen())); } catch {}
    }

    private loadHelpState(): boolean {
        try {
            const v = localStorage.getItem(this.HELP_STORAGE_KEY);
            if (v === null) return true;
            return v === 'true';
        } catch { return true; }
    }

    t(key: string): string { return this.i18n.t(key); }

    /** Screen-reader summary of the radar; per-axis scores render as text below. */
    chartAriaLabel(): string {
        return `${this.t('nav.wealthScore')}: ${this.scoreService.totalScore()}/100`;
    }

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
        return 'text-negative-600 dark:text-negative-400';
    }

    barColor(score: number): string {
        if (score >= 70) return 'bg-positive-500';
        if (score >= 40) return 'bg-ochre-500';
        return 'bg-negative-500';
    }

    iconBg(score: number): string {
        if (score >= 70) return 'bg-positive-50 dark:bg-positive-500/15';
        if (score >= 40) return 'bg-ochre-100 dark:bg-ochre-900/20';
        return 'bg-negative-50 dark:bg-negative-500/15';
    }

    iconColor(score: number): string {
        if (score >= 70) return 'text-positive-600 dark:text-positive-400';
        if (score >= 40) return 'text-ochre-600 dark:text-ochre-400';
        return 'text-negative-600 dark:text-negative-400';
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

        // Brand-tokenized radar palette. Ochre = the single accent (data-viz);
        // grid / labels use warm neutrals so it reads on both themes.
        const isDark = document.documentElement.classList.contains('app-dark');
        const gridColor = isDark ? 'rgba(138,152,174,0.20)' : 'rgba(26,39,64,0.12)';
        const labelColor = isDark ? '#9C988C' : '#6E6A60'; // warm-400 / warm-500

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
                    backgroundColor: 'rgba(20, 19, 15, 0.95)',
                    titleColor: '#FAF8F4',
                    bodyColor: '#DEDAD0',
                    borderColor: 'rgba(199, 123, 60, 0.30)',
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
                    grid: { color: gridColor, circular: true },
                    angleLines: { color: gridColor },
                    pointLabels: { color: labelColor, font: { size: 12, weight: '600' } },
                }
            },
            animation: { duration: 600, easing: 'easeOutQuart' },
        };
    }
}
