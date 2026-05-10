import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { I18nService } from '../../../i18n/i18n.service';

const SLEEP_RATE = 0.02;
const INVEST_RATE = 0.08;

@Component({
    selector: 'pain-calculator-widget',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, ButtonModule, RippleModule],
    template: `
        <section id="pain" class="relative py-20 md:py-28 px-6 lg:px-20 bg-surface-50 dark:bg-surface-950 overflow-hidden">
            <!-- Subtle background pattern -->
            <div class="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]" style="background-image: linear-gradient(rgba(199, 123, 60, 1) 1px, transparent 1px), linear-gradient(90deg, rgba(199, 123, 60, 1) 1px, transparent 1px); background-size: 60px 60px;"></div>

            <div class="relative max-w-6xl mx-auto">
                <!-- Header -->
                <div class="text-center max-w-3xl mx-auto mb-12">
                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-ochre-500/30 dark:border-ochre-400/40 bg-ochre-500/10 dark:bg-ochre-500/15 text-ochre-700 dark:text-ochre-300 text-sm font-medium mb-6">
                        <i class="pi pi-exclamation-triangle text-xs"></i>
                        <span>{{ t('landing.painCalc.eyebrow') }}</span>
                    </div>
                    <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-surface-900 dark:text-white leading-tight mb-4">
                        {{ t('landing.painCalc.h2a') }}<br>
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-brand-700 to-ochre-500 dark:from-ochre-300 dark:to-ochre-400">
                            {{ t('landing.painCalc.h2b') }}
                        </span>
                    </h2>
                    <p class="text-base md:text-lg text-surface-600 dark:text-surface-400 leading-relaxed">
                        {{ t('landing.painCalc.description') }}
                    </p>
                </div>

                <!-- Inputs -->
                <div class="grid md:grid-cols-2 gap-5 mb-10 max-w-3xl mx-auto">
                    <div class="p-5 rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800">
                        <div class="flex items-baseline justify-between mb-3">
                            <label for="pain-monthly" class="text-sm font-medium text-surface-700 dark:text-surface-300">
                                {{ t('landing.painCalc.monthlyLabel') }}
                            </label>
                            <span class="text-lg font-bold text-brand-700 dark:text-ochre-400 tabular-nums">
                                {{ formatNumber(monthlySavings()) }}
                                <span class="text-xs font-normal text-surface-500 ml-1">{{ t('landing.painCalc.monthlyUnit') }}</span>
                            </span>
                        </div>
                        <input id="pain-monthly" type="range" min="25000" max="500000" step="25000"
                               [ngModel]="monthlySavings()"
                               (ngModelChange)="monthlySavings.set($event)"
                               [attr.aria-valuetext]="formatNumber(monthlySavings()) + ' FCFA'"
                               class="w-full h-2 rounded-full bg-surface-200 dark:bg-surface-700 appearance-none cursor-pointer accent-ochre-500" />
                    </div>
                    <div class="p-5 rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800">
                        <div class="flex items-baseline justify-between mb-3">
                            <label for="pain-years" class="text-sm font-medium text-surface-700 dark:text-surface-300">
                                {{ t('landing.painCalc.durationLabel') }}
                            </label>
                            <span class="text-lg font-bold text-brand-700 dark:text-ochre-400 tabular-nums">
                                {{ years() }}
                                <span class="text-xs font-normal text-surface-500 ml-1">{{ t('landing.painCalc.yearsSuffix') }}</span>
                            </span>
                        </div>
                        <input id="pain-years" type="range" min="5" max="40" step="1"
                               [ngModel]="years()"
                               (ngModelChange)="years.set($event)"
                               [attr.aria-valuetext]="years() + ' ' + t('landing.painCalc.yearsSuffix')"
                               class="w-full h-2 rounded-full bg-surface-200 dark:bg-surface-700 appearance-none cursor-pointer accent-ochre-500" />
                    </div>
                </div>

                <!-- Comparison cards -->
                <div class="grid md:grid-cols-2 gap-5 mb-6 max-w-4xl mx-auto">
                    <!-- Sleeping (muted) -->
                    <div class="p-7 rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800">
                        <div class="flex items-center gap-2 text-surface-500 dark:text-surface-400 text-xs font-semibold uppercase tracking-wider mb-3">
                            <i class="pi pi-pause-circle"></i>
                            <span>{{ t('landing.painCalc.sleepingTitle') }}</span>
                        </div>
                        <div class="text-4xl md:text-5xl font-bold text-surface-700 dark:text-surface-300 tabular-nums leading-none mb-2">
                            {{ formatCompact(sleepingValue()) }}
                            <span class="text-lg font-medium text-surface-500 ml-1">XOF</span>
                        </div>
                        <div class="text-xs text-surface-500 dark:text-surface-400 mt-2">{{ t('landing.painCalc.sleepingHint') }}</div>
                        <div class="mt-4 h-2 rounded-full bg-surface-200 dark:bg-surface-800 overflow-hidden">
                            <div class="h-full bg-surface-400 dark:bg-surface-600 rounded-full transition-all duration-500"
                                 [style.width.%]="sleepingBarWidth()"></div>
                        </div>
                    </div>

                    <!-- Invested (winner, ochre accent) -->
                    <div class="p-7 rounded-2xl bg-surface-0 dark:bg-surface-900 border border-ochre-500/40 dark:border-ochre-500/30">
                        <div class="flex items-center gap-2 text-ochre-600 dark:text-ochre-400 text-xs font-semibold uppercase tracking-wider mb-3">
                            <i class="pi pi-chart-line"></i>
                            <span>{{ t('landing.painCalc.investedTitle') }}</span>
                        </div>
                        <div class="text-4xl md:text-5xl font-bold text-surface-900 dark:text-white tabular-nums leading-none mb-2">
                            {{ formatCompact(investedValue()) }}
                            <span class="text-lg font-medium text-ochre-600 dark:text-ochre-400 ml-1">XOF</span>
                        </div>
                        <div class="text-xs text-surface-500 dark:text-surface-400 mt-2">{{ t('landing.painCalc.investedHint') }}</div>
                        <div class="mt-4 h-2 rounded-full bg-surface-200 dark:bg-surface-800 overflow-hidden">
                            <div class="h-full bg-ochre-500 rounded-full transition-all duration-500"
                                 [style.width.%]="100"></div>
                        </div>
                    </div>
                </div>

                <!-- The gap -->
                <div class="max-w-4xl mx-auto p-7 md:p-9 rounded-2xl bg-ochre-50 dark:bg-ochre-900/10 border-l-4 border-ochre-500">
                    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                            <div class="text-xs uppercase tracking-[0.25em] font-semibold text-ochre-600 dark:text-ochre-400 mb-2">
                                {{ t('landing.painCalc.gapTitle') }}
                            </div>
                            <div class="text-5xl md:text-6xl font-black text-surface-900 dark:text-white tabular-nums leading-none">
                                {{ formatCompact(gapValue()) }}
                                <span class="text-2xl font-medium text-ochre-600 dark:text-ochre-400 ml-2">XOF</span>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-surface-500 dark:text-surface-400 text-xs uppercase tracking-wider mb-1">{{ t('landing.painCalc.gapMultiple') }}</div>
                            <div class="text-3xl md:text-4xl font-bold text-ochre-600 dark:text-ochre-400 tabular-nums">
                                ×{{ gapMultiple() }}
                            </div>
                            <div class="text-surface-500 dark:text-surface-400 text-xs mt-1 max-w-[160px]">{{ t('landing.painCalc.gapMultipleSuffix') }}</div>
                        </div>
                    </div>
                </div>

                <!-- Sources + CTA -->
                <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-8 max-w-4xl mx-auto">
                    <p class="text-xs text-surface-500 dark:text-surface-500 leading-relaxed flex-1">
                        {{ t('landing.painCalc.sourcesNote') }}
                    </p>
                    <button pButton pRipple [label]="t('landing.painCalc.ctaTry')"
                            [routerLink]="[currentLang, 'tools', 'compound-interest']"
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
export class PainCalculatorWidget {
    private i18n = inject(I18nService);
    private router = inject(Router);

    monthlySavings = signal(100_000);
    years = signal(20);

    sleepingValue  = computed(() => this.fv(this.monthlySavings(), SLEEP_RATE,  this.years()));
    investedValue  = computed(() => this.fv(this.monthlySavings(), INVEST_RATE, this.years()));
    gapValue       = computed(() => this.investedValue() - this.sleepingValue());
    gapMultiple    = computed(() => {
        const val = this.investedValue() / Math.max(1, this.sleepingValue());
        return new Intl.NumberFormat(this.i18n.lang() === 'fr' ? 'fr-FR' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val);
    });
    sleepingBarWidth = computed(() => Math.round((this.sleepingValue() / this.investedValue()) * 100));

    get currentLang(): string {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        return '/' + (match ? match[1] : 'fr');
    }

    t(key: string): string { return this.i18n.t(key); }

    private fv(monthly: number, annualRate: number, years: number): number {
        const r = annualRate / 12;
        const n = years * 12;
        const growth = Math.pow(1 + r, n);
        return monthly * ((growth - 1) / r);
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
