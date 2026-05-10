import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { I18nService } from '../../../i18n/i18n.service';

interface ScenarioPoint {
    pessimistic: number;
    median: number;
    optimistic: number;
}

const HORIZONS = [10, 20, 30] as const;
const RATES = { pess: 0.04, median: 0.07, opti: 0.10 };

@Component({
    selector: 'fire-projection-widget',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, ButtonModule, RippleModule],
    template: `
        <section id="projection" class="relative py-20 md:py-28 px-6 lg:px-20 bg-surface-50 dark:bg-surface-950 overflow-hidden">
            <!-- Subtle background -->
            <div class="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]" style="background-image: linear-gradient(rgba(199, 123, 60, 1) 1px, transparent 1px), linear-gradient(90deg, rgba(199, 123, 60, 1) 1px, transparent 1px); background-size: 60px 60px;"></div>

            <div class="relative max-w-6xl mx-auto">
                <!-- Header -->
                <div class="text-center max-w-3xl mx-auto mb-12">
                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-ochre-500/30 dark:border-ochre-400/40 bg-ochre-500/10 dark:bg-ochre-500/15 text-ochre-700 dark:text-ochre-300 text-sm font-medium mb-6">
                        <i class="pi pi-chart-line text-xs"></i>
                        <span>{{ t('landing.fireProjection.eyebrow') }}</span>
                    </div>
                    <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-surface-900 dark:text-white leading-tight mb-4">
                        {{ t('landing.fireProjection.h2a') }}<br>
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-brand-700 to-ochre-500 dark:from-ochre-300 dark:to-ochre-400">
                            {{ t('landing.fireProjection.h2b') }}
                        </span>
                    </h2>
                    <p class="text-base md:text-lg text-surface-600 dark:text-surface-400 leading-relaxed">
                        {{ t('landing.fireProjection.description') }}
                    </p>
                </div>

                <!-- Inputs -->
                <div class="grid md:grid-cols-2 gap-6 mb-10 max-w-3xl mx-auto">
                    <div class="p-5 rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800">
                        <div class="flex items-baseline justify-between mb-3">
                            <label for="fire-monthly" class="text-sm font-medium text-surface-700 dark:text-surface-300">
                                {{ t('landing.fireProjection.monthlyLabel') }}
                            </label>
                            <span class="text-lg font-bold text-brand-700 dark:text-ochre-400 tabular-nums">
                                {{ formatNumber(monthlySavings()) }}
                                <span class="text-xs font-normal text-surface-500 ml-1">{{ t('landing.fireProjection.monthlyUnit') }}</span>
                            </span>
                        </div>
                        <input id="fire-monthly" type="range" min="25000" max="500000" step="25000"
                               [ngModel]="monthlySavings()"
                               (ngModelChange)="monthlySavings.set($event)"
                               [attr.aria-valuetext]="formatNumber(monthlySavings()) + ' FCFA'"
                               class="w-full h-2 rounded-full bg-surface-200 dark:bg-surface-700 appearance-none cursor-pointer accent-ochre-500" />
                    </div>
                    <div class="p-5 rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800">
                        <div class="flex items-baseline justify-between mb-3">
                            <label for="fire-initial" class="text-sm font-medium text-surface-700 dark:text-surface-300">
                                {{ t('landing.fireProjection.initialLabel') }}
                            </label>
                            <span class="text-lg font-bold text-brand-700 dark:text-ochre-400 tabular-nums">
                                {{ formatNumber(initialCapital()) }}
                                <span class="text-xs font-normal text-surface-500 ml-1">{{ t('landing.fireProjection.initialUnit') }}</span>
                            </span>
                        </div>
                        <input id="fire-initial" type="range" min="0" max="50000000" step="500000"
                               [ngModel]="initialCapital()"
                               (ngModelChange)="initialCapital.set($event)"
                               [attr.aria-valuetext]="formatNumber(initialCapital()) + ' FCFA'"
                               class="w-full h-2 rounded-full bg-surface-200 dark:bg-surface-700 appearance-none cursor-pointer accent-ochre-500" />
                    </div>
                </div>

                <!-- 3 horizon cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                    @for (h of horizons(); track h.years) {
                        <div class="relative p-6 md:p-7 rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 hover:border-ochre-500/40 hover:shadow-lg transition-all duration-300">
                            <!-- Ribbon -->
                            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-100 dark:bg-brand-700/20 text-brand-700 dark:text-brand-300 text-xs font-bold tracking-wider uppercase mb-4">
                                <i class="pi pi-clock text-[9px]"></i>
                                {{ h.years }} {{ t('landing.fireProjection.yearsSuffix') }}
                            </div>

                            <!-- Median (hero number) -->
                            <div class="mb-5">
                                <div class="text-4xl md:text-5xl font-bold text-surface-900 dark:text-white tabular-nums leading-none">
                                    {{ formatCompact(h.scenarios.median) }}
                                </div>
                                <div class="mt-1 text-xs text-surface-500 dark:text-surface-400 font-medium uppercase tracking-wider">
                                    {{ t('landing.fireProjection.medianLabel') }}
                                </div>
                            </div>

                            <!-- Visual bar of pess→opti range -->
                            <div class="mb-5">
                                <div class="relative h-2 rounded-full bg-surface-200 dark:bg-surface-800 overflow-hidden">
                                    <div class="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-negative/40 via-ochre-400 to-positive/60"
                                         [style.width.%]="100"></div>
                                    <!-- Median tick -->
                                    <div class="absolute top-1/2 -translate-y-1/2 w-1 h-3 bg-surface-900 dark:bg-white rounded-full"
                                         [style.left.%]="medianPosition(h.scenarios)"></div>
                                </div>
                            </div>

                            <!-- Pess / Opti rows -->
                            <div class="space-y-2">
                                <div class="flex items-center justify-between text-sm">
                                    <span class="flex items-center gap-2 text-surface-500 dark:text-surface-400">
                                        <span class="w-2 h-2 rounded-full bg-negative/60"></span>
                                        {{ t('landing.fireProjection.pessLabel') }}
                                    </span>
                                    <span class="font-semibold text-surface-700 dark:text-surface-300 tabular-nums">{{ formatCompact(h.scenarios.pessimistic) }}</span>
                                </div>
                                <div class="flex items-center justify-between text-sm">
                                    <span class="flex items-center gap-2 text-surface-500 dark:text-surface-400">
                                        <span class="w-2 h-2 rounded-full bg-positive/70"></span>
                                        {{ t('landing.fireProjection.optiLabel') }}
                                    </span>
                                    <span class="font-semibold text-surface-700 dark:text-surface-300 tabular-nums">{{ formatCompact(h.scenarios.optimistic) }}</span>
                                </div>
                            </div>
                        </div>
                    }
                </div>

                <!-- Disclaimer + CTA -->
                <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 max-w-4xl mx-auto">
                    <p class="text-xs text-surface-500 dark:text-surface-500 leading-relaxed flex-1">
                        ⚠ {{ t('landing.fireProjection.disclaimer') }}
                    </p>
                    <button pButton pRipple [label]="t('landing.fireProjection.ctaSimulate')"
                            [routerLink]="[currentLang, 'tools', 'fire-simulator']"
                            class="!bg-gradient-to-r !from-brand-700 !to-brand-500 dark:!from-ochre-500 dark:!to-ochre-400 !border-0 !font-semibold
                                   dark:!text-warm-900 !rounded-full !px-6 !py-2.5 !text-sm shrink-0
                                   hover:!shadow-lg transition-all duration-300">
                    </button>
                </div>
            </div>
        </section>
    `,
    styles: [`
        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 9999px;
            background: linear-gradient(135deg, #C77B3C 0%, #E89F5C 100%);
            cursor: pointer;
            border: 3px solid var(--surface-0, white);
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        input[type="range"]::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 9999px;
            background: linear-gradient(135deg, #C77B3C 0%, #E89F5C 100%);
            cursor: pointer;
            border: 3px solid var(--surface-0, white);
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
    `]
})
export class FireProjectionWidget {
    private i18n = inject(I18nService);
    private router = inject(Router);

    monthlySavings = signal(75_000);
    initialCapital = signal(0);

    horizons = computed(() =>
        HORIZONS.map(years => ({
            years,
            scenarios: {
                pessimistic: this.fv(this.initialCapital(), this.monthlySavings(), RATES.pess, years),
                median:      this.fv(this.initialCapital(), this.monthlySavings(), RATES.median, years),
                optimistic:  this.fv(this.initialCapital(), this.monthlySavings(), RATES.opti, years),
            } as ScenarioPoint
        }))
    );

    get currentLang(): string {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        return '/' + (match ? match[1] : 'fr');
    }

    t(key: string): string { return this.i18n.t(key); }

    /** Future value of an annuity-due-style monthly investment with starting capital. */
    private fv(initial: number, monthly: number, annualRate: number, years: number): number {
        const r = annualRate / 12;
        const n = years * 12;
        const growth = Math.pow(1 + r, n);
        const principalGrowth = initial * growth;
        const annuityGrowth = monthly * ((growth - 1) / r);
        return principalGrowth + annuityGrowth;
    }

    medianPosition(s: ScenarioPoint): number {
        const range = s.optimistic - s.pessimistic;
        if (range <= 0) return 50;
        return Math.max(5, Math.min(95, ((s.median - s.pessimistic) / range) * 100));
    }

    formatNumber(n: number): string {
        return new Intl.NumberFormat(this.i18n.lang() === 'fr' ? 'fr-FR' : 'en-US').format(Math.round(n));
    }

    formatCompact(n: number): string {
        const lang = this.i18n.lang();
        const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
        if (n >= 1_000_000) {
            const v = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n / 1_000_000);
            return v.replace(/[,.]0$/, '') + (lang === 'fr' ? ' M' : 'M');
        }
        if (n >= 1_000) return Math.round(n / 1_000) + (lang === 'fr' ? ' k' : 'k');
        return Math.round(n).toString();
    }
}
