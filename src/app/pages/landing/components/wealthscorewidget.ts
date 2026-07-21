import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { I18nService } from '../../../i18n/i18n.service';

const BEFORE_DATA = [30, 55, 10, 15, 20];
const AFTER_DATA  = [75, 70, 60, 85, 65];

interface AxisInsight {
    labelKey: string;
    insightKey: string;
    before: number;
    after: number;
    icon: string;
}

@Component({
    selector: 'wealth-score-widget',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, RippleModule],
    template: `
        <section id="wealth-score" class="py-20 md:py-28 px-6 lg:px-20 bg-surface-50 dark:bg-surface-900 overflow-hidden">
            <div class="max-w-6xl mx-auto">
                <!-- Header -->
                <div class="text-center max-w-3xl mx-auto mb-14">
                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-ochre-500/30 dark:border-ochre-400/40 bg-ochre-500/10 dark:bg-ochre-500/15 text-ochre-700 dark:text-ochre-300 text-sm font-medium mb-6">
                        <i class="pi pi-gauge text-xs"></i>
                        <span>{{ t('landing.wealthScore.eyebrow') }}</span>
                    </div>
                    <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-surface-900 dark:text-white leading-tight mb-4">
                        {{ t('landing.wealthScore.h2a') }}
                        <span class="text-brand-700 dark:text-ochre-400">
                            {{ t('landing.wealthScore.h2b') }}
                        </span>
                    </h2>
                    <p class="text-base md:text-lg text-surface-600 dark:text-surface-400 leading-relaxed">
                        {{ t('landing.wealthScore.description') }}
                    </p>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <!-- Left: Radar chart + toggle -->
                    <div class="p-6 md:p-8 rounded-2xl bg-surface-0 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-sm">
                        <!-- Toggle -->
                        <div class="flex items-center justify-center gap-2 mb-6">
                            <button (click)="setShowAfter(false)"
                                    class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300"
                                    [class]="!showAfter() ? 'bg-surface-200 dark:bg-surface-600 text-surface-900 dark:text-white' : 'text-surface-500 dark:text-surface-300 hover:text-surface-700 dark:hover:text-white'">
                                {{ t('landing.wealthScore.toggleBefore') }}
                            </button>
                            <button (click)="setShowAfter(true)"
                                    class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300"
                                    [class]="showAfter() ? 'bg-ochre-500 text-warm-900' : 'text-surface-500 dark:text-surface-300 hover:text-surface-700 dark:hover:text-white'">
                                {{ t('landing.wealthScore.toggleAfter') }}
                            </button>
                        </div>

                        <!-- Score display -->
                        <div class="text-center mb-4">
                            <span class="text-6xl font-black tabular-nums transition-all duration-500"
                                  [class]="showAfter() ? 'text-ochre-500 dark:text-ochre-400' : 'text-surface-600 dark:text-surface-400'">
                                {{ showAfter() ? t('landing.wealthScore.scoreAfter') : t('landing.wealthScore.scoreBefore') }}
                            </span>
                            <span class="text-xl font-medium text-surface-500 dark:text-surface-400 ml-1">{{ t('landing.wealthScore.scoreLabel') }}</span>
                        </div>

                        <!-- Radar chart — hand-rolled inline SVG (no Chart.js on landing, P3-5) -->
                        <div class="w-full max-w-[360px] mx-auto">
                            <svg viewBox="0 0 410 310" class="w-full" role="img" [attr.aria-label]="radarAria()">
                                <!-- grid rings -->
                                @for (ring of rings; track $index) {
                                    <polygon [attr.points]="ring" fill="none" stroke-width="1"
                                             class="stroke-surface-200 dark:stroke-surface-700" />
                                }
                                <!-- axis spokes -->
                                @for (s of spokes; track $index) {
                                    <line [attr.x1]="s.x1" [attr.y1]="s.y1" [attr.x2]="s.x2" [attr.y2]="s.y2"
                                          stroke-width="1" class="stroke-surface-200 dark:stroke-surface-700" />
                                }
                                <!-- data polygon -->
                                <polygon [attr.points]="radarPolygon()" [attr.fill]="seriesFill()"
                                         [attr.stroke]="seriesColor()" stroke-width="2.5" stroke-linejoin="round"
                                         class="transition-all duration-500 ease-out" />
                                <!-- vertices -->
                                @for (v of radarVertices(); track $index) {
                                    <circle [attr.cx]="v.x" [attr.cy]="v.y" r="4.5" [attr.fill]="seriesColor()"
                                            class="transition-all duration-500 ease-out" />
                                }
                                <!-- axis labels -->
                                @for (lbl of axisLabels; track lbl.key) {
                                    <text [attr.x]="lbl.x" [attr.y]="lbl.y" [attr.text-anchor]="lbl.anchor"
                                          dominant-baseline="middle"
                                          class="fill-surface-600 dark:fill-surface-300 font-semibold" style="font-size:10px">{{ t(lbl.key) }}</text>
                                }
                            </svg>
                        </div>
                    </div>

                    <!-- Right: 5 axis breakdown -->
                    <div class="space-y-4">
                        @for (axis of axes; track axis.labelKey) {
                            <div class="p-5 rounded-2xl bg-surface-0 dark:bg-surface-800 border border-surface-200 dark:border-surface-700
                                        hover:border-ochre-500/30 transition-all duration-300">
                                <div class="flex items-start gap-4">
                                    <div class="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
                                         [class]="axisIconBg(axis)">
                                        <i class="pi {{ axis.icon }} text-sm" [class]="axisIconColor(axis)"></i>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center justify-between mb-1.5">
                                            <span class="text-sm font-bold text-surface-900 dark:text-white">{{ t(axis.labelKey) }}</span>
                                            <div class="flex items-center gap-2 text-xs tabular-nums">
                                                <span class="text-surface-600 dark:text-surface-300 font-semibold">{{ axis.before }}</span>
                                                <i class="pi pi-arrow-right text-[10px] text-ochre-500"></i>
                                                <span class="font-bold" [class]="scoreColor(axis.after)">{{ axis.after }}</span>
                                            </div>
                                        </div>
                                        <!-- Progress bar -->
                                        <div class="h-1.5 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden mb-2">
                                            <div class="h-full rounded-full transition-all duration-700 ease-out"
                                                 [class]="barColor(showAfter() ? axis.after : axis.before)"
                                                 [style.width.%]="showAfter() ? axis.after : axis.before"></div>
                                        </div>
                                        <p class="text-xs text-surface-500 dark:text-surface-400 leading-relaxed">
                                            {{ t(axis.insightKey) }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        }

                        <!-- CTA -->
                        <div class="pt-2">
                            <button pButton pRipple [label]="t('landing.wealthScore.ctaScore')"
                                    [routerLink]="['/', currentLang, 'pages', 'wealth-score']"
                                    icon="pi pi-arrow-right" iconPos="right"
                                    class="!w-full !bg-ochre-500 hover:!bg-ochre-400 !border-0 !font-semibold
                                           !text-warm-900 !rounded-full !py-3 transition-all duration-300">
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `
})
export class WealthScoreWidget {
    private i18n = inject(I18nService);
    private router = inject(Router);

    showAfter = signal(false);

    readonly axes: AxisInsight[] = [
        { labelKey: 'landing.wealthScore.axisEpargne',         insightKey: 'landing.wealthScore.insightEpargne',         before: BEFORE_DATA[0], after: AFTER_DATA[0], icon: 'pi-wallet' },
        { labelKey: 'landing.wealthScore.axisInvestissement',   insightKey: 'landing.wealthScore.insightInvestissement',   before: BEFORE_DATA[1], after: AFTER_DATA[1], icon: 'pi-chart-line' },
        { labelKey: 'landing.wealthScore.axisProtection',       insightKey: 'landing.wealthScore.insightProtection',       before: BEFORE_DATA[2], after: AFTER_DATA[2], icon: 'pi-shield' },
        { labelKey: 'landing.wealthScore.axisPlanification',    insightKey: 'landing.wealthScore.insightPlanification',    before: BEFORE_DATA[3], after: AFTER_DATA[3], icon: 'pi-flag' },
        { labelKey: 'landing.wealthScore.axisDiversification',  insightKey: 'landing.wealthScore.insightDiversification',  before: BEFORE_DATA[4], after: AFTER_DATA[4], icon: 'pi-th-large' },
    ];

    // ── Radar geometry (hand-rolled SVG, 5 axes, pentagon) ────────────────────
    private readonly CX = 205;
    private readonly CY = 152;
    private readonly R = 98;
    private theta(i: number): number { return (-90 + i * 72) * Math.PI / 180; }
    private polar(frac: number, i: number): { x: number; y: number } {
        const t = this.theta(i);
        return { x: this.CX + this.R * frac * Math.cos(t), y: this.CY + this.R * frac * Math.sin(t) };
    }
    private pentagon(frac: number): string {
        return this.axes.map((_, i) => { const p = this.polar(frac, i); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ');
    }
    /** Concentric grid rings at 25/50/75/100%. */
    readonly rings = [0.25, 0.5, 0.75, 1].map(f => this.pentagon(f));
    /** Spokes from centre to each axis tip. */
    readonly spokes = this.axes.map((_, i) => { const p = this.polar(1, i); return { x1: this.CX, y1: this.CY, x2: p.x.toFixed(1), y2: p.y.toFixed(1) }; });
    /** Axis label anchors just outside each tip. */
    readonly axisLabels = this.axes.map((a, i) => {
        const p = this.polar(1.14, i);
        const c = Math.cos(this.theta(i));
        return { key: a.labelKey, x: p.x.toFixed(1), y: p.y.toFixed(1), anchor: c > 0.15 ? 'start' : c < -0.15 ? 'end' : 'middle' };
    });

    private data = computed(() => this.showAfter() ? AFTER_DATA : BEFORE_DATA);
    readonly radarPolygon = computed(() => this.data().map((v, i) => { const p = this.polar(v / 100, i); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' '));
    readonly radarVertices = computed(() => this.data().map((v, i) => { const p = this.polar(v / 100, i); return { x: p.x.toFixed(1), y: p.y.toFixed(1) }; }));
    readonly seriesColor = computed(() => this.showAfter() ? '#C77B3C' : '#8A98AE');
    readonly seriesFill = computed(() => this.showAfter() ? 'rgba(199,123,60,0.18)' : 'rgba(138,152,174,0.14)');
    /** Screen-reader alternative to the radar (dataviz check 6). */
    readonly radarAria = computed(() =>
        (this.showAfter() ? this.t('landing.wealthScore.toggleAfter') : this.t('landing.wealthScore.toggleBefore')) + ': ' +
        this.axes.map((a, i) => `${this.t(a.labelKey)} ${this.data()[i]}/100`).join(', '));

    get currentLang(): string {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        return '/' + (match ? match[1] : 'fr');
    }

    t(key: string): string { return this.i18n.t(key); }

    setShowAfter(val: boolean): void {
        this.showAfter.set(val);
    }

    scoreColor(val: number): string {
        if (val >= 70) return 'text-positive-600 dark:text-positive-400';
        if (val >= 40) return 'text-ochre-600 dark:text-ochre-400';
        return 'text-negative dark:text-red-400';
    }

    barColor(val: number): string {
        if (val >= 70) return 'bg-positive-500';
        if (val >= 40) return 'bg-ochre-500';
        return 'bg-negative';
    }

    axisIconBg(axis: AxisInsight): string {
        const val = this.showAfter() ? axis.after : axis.before;
        if (val >= 70) return 'bg-positive-100 dark:bg-positive-700/30';
        if (val >= 40) return 'bg-ochre-100 dark:bg-ochre-800/30';
        return 'bg-red-100 dark:bg-red-800/30';
    }

    axisIconColor(axis: AxisInsight): string {
        const val = this.showAfter() ? axis.after : axis.before;
        if (val >= 70) return 'text-positive-600 dark:text-positive-400';
        if (val >= 40) return 'text-ochre-600 dark:text-ochre-400';
        return 'text-negative dark:text-red-400';
    }
}
