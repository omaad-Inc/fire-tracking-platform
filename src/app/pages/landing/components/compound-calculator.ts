import { Component, inject, signal, computed, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { isDarkMode, applyChartDefaults } from '../../../core/theme/chart-theme';
import { LayoutService } from '../../../layout/service/layout.service';
import type { Lang } from '../../../i18n/i18n.service';
import { SeoService } from '../../../core/services/seo.service';
import { SEO_PAGES } from '../../../core/services/seo-content';
import { AnalyticsService } from '../../../core/services/analytics.service';

interface YearPoint {
    year: number;
    deposits: number;
    interests: number;
    total: number;
}

@Component({
    selector: 'app-compound-calculator',
    standalone: true,
    imports: [
        CommonModule, FormsModule, RouterModule, ChartModule,
        ButtonModule, RippleModule
    ],
    template: `
        <div class="min-h-screen bg-surface-0 dark:bg-surface-900 relative overflow-hidden">

            <!-- Background glow (dark) -->
            <div class="absolute inset-0 pointer-events-none hidden dark:block">
                <div class="absolute -top-40 right-1/4 w-[600px] h-[600px] rounded-full opacity-10"
                     style="background: radial-gradient(circle, #1A2740 0%, transparent 70%)"></div>
                <div class="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full opacity-8"
                     style="background: radial-gradient(circle, #C77B3C 0%, transparent 70%)"></div>
            </div>
            <!-- Background glow (light) -->
            <div class="absolute inset-0 pointer-events-none dark:hidden">
                <div class="absolute -top-40 right-1/4 w-[600px] h-[600px] rounded-full opacity-[0.03]"
                     style="background: radial-gradient(circle, #1A2740 0%, transparent 70%)"></div>
                <div class="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full opacity-[0.04]"
                     style="background: radial-gradient(circle, #C77B3C 0%, transparent 70%)"></div>
            </div>

            <!-- Topbar -->
            <div class="relative z-10 border-b border-surface-200 dark:border-surface-700/50">
                <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <a [routerLink]="[currentLang, 'landing']" class="flex items-center gap-3 group cursor-pointer">
                        <img [src]="isDark() ? 'assets/brand/omaad-icon-inverse.svg' : 'assets/brand/omaad-icon.svg'"
                             alt="Omaad" class="w-10 h-10 md:w-12 md:h-12">
                        <span class="font-bold text-xl md:text-2xl text-surface-900 dark:text-surface-0 tracking-tight">Omaad</span>
                    </a>
                    <div class="flex items-center gap-3">
                        <button (click)="toggleCurrency()"
                                class="px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all
                                       border border-ochre-200 dark:border-ochre-700/40
                                       text-ochre-600 dark:text-ochre-400
                                       bg-ochre-50 dark:bg-ochre-700/10
                                       hover:bg-ochre-100 dark:hover:bg-ochre-700/20">
                            {{ currency() }}
                        </button>
                        <button (click)="toggleDarkMode()"
                                class="w-9 h-9 rounded-full flex items-center justify-center
                                       text-surface-600 dark:text-surface-300
                                       hover:bg-surface-100 dark:hover:bg-surface-800
                                       transition-all duration-200">
                            <i [class]="layoutService.isDarkTheme() ? 'pi pi-sun text-base' : 'pi pi-moon text-base'"></i>
                        </button>
                        <a [routerLink]="[currentLang, 'landing']"
                           class="text-sm text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-colors">
                            \u2190 {{ isFr ? 'Retour' : 'Back' }}
                        </a>
                    </div>
                </div>
            </div>

            <div class="relative z-10 max-w-7xl mx-auto px-6 py-10 md:py-16">

                <!-- Title -->
                <div class="text-center mb-12">
                    <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                                border border-brand-200 dark:border-brand-700
                                bg-brand-700/10 dark:bg-brand-300/15
                                text-brand-700 dark:text-brand-300 text-sm mb-4">
                        <i class="pi pi-chart-bar text-xs"></i>
                        <span class="font-medium">{{ isFr ? 'Outils' : 'Tools' }}</span>
                    </div>
                    <h1 class="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 text-surface-900 dark:text-surface-0">
                        {{ isFr ? 'Int\u00e9r\u00eats compos\u00e9s' : 'Compound Interest' }}
                    </h1>
                    <p class="text-base md:text-lg max-w-2xl mx-auto text-surface-600 dark:text-surface-300">
                        {{ isFr
                            ? 'Calcule les int\u00e9r\u00eats compos\u00e9s que tu peux g\u00e9n\u00e9rer gr\u00e2ce \u00e0 tes investissements. Entre tes chiffres et visualise la puissance du temps.'
                            : 'Calculate the compound interest your investments can generate. Enter your numbers and see the power of time.' }}
                    </p>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    <!-- LEFT: Inputs -->
                    <div class="lg:col-span-4">
                        <div class="rounded-2xl p-6 md:p-8 space-y-6
                                    bg-surface-50 dark:bg-surface-800
                                    border border-surface-200 dark:border-surface-700">

                            <h2 class="text-lg font-semibold mb-2 text-surface-900 dark:text-surface-0">
                                {{ isFr ? 'Tes param\u00e8tres' : 'Your parameters' }}
                            </h2>

                            <!-- Initial Capital -->
                            <div class="space-y-2">
                                <label class="flex justify-between text-sm">
                                    <span class="text-surface-600 dark:text-surface-300">{{ isFr ? 'Capital initial' : 'Initial capital' }}</span>
                                    <span class="font-semibold text-surface-900 dark:text-surface-0">{{ formatAmount(initialCapital()) }}</span>
                                </label>
                                <input type="range" [min]="0" [max]="currMax('capital')" [step]="currStep('capital')"
                                       [value]="initialCapital()"
                                       (input)="initialCapital.set(+$any($event.target).value)"
                                       class="w-full accent-slider">
                            </div>

                            <!-- Monthly Savings -->
                            <div class="space-y-2">
                                <label class="flex justify-between text-sm">
                                    <span class="text-surface-600 dark:text-surface-300">{{ isFr ? '\u00c9pargne mensuelle' : 'Monthly savings' }}</span>
                                    <span class="font-semibold text-surface-900 dark:text-surface-0">{{ formatAmount(monthlySavings()) }}</span>
                                </label>
                                <input type="range" [min]="0" [max]="currMax('savings')" [step]="currStep('savings')"
                                       [value]="monthlySavings()"
                                       (input)="monthlySavings.set(+$any($event.target).value)"
                                       class="w-full accent-slider">
                            </div>

                            <!-- Horizon -->
                            <div class="space-y-2">
                                <label class="flex justify-between text-sm">
                                    <span class="text-surface-600 dark:text-surface-300">{{ isFr ? 'Horizon de placement' : 'Investment horizon' }}</span>
                                    <span class="font-semibold text-surface-900 dark:text-surface-0">{{ horizon() }} {{ isFr ? 'ans' : 'yrs' }}</span>
                                </label>
                                <input type="range" [min]="1" [max]="40" [step]="1"
                                       [value]="horizon()"
                                       (input)="horizon.set(+$any($event.target).value)"
                                       class="w-full accent-slider">
                            </div>

                            <!-- Interest Rate -->
                            <div class="space-y-2">
                                <label class="flex justify-between text-sm">
                                    <span class="text-surface-600 dark:text-surface-300">{{ isFr ? 'Taux d\u2019int\u00e9r\u00eat annuel' : 'Annual interest rate' }}</span>
                                    <span class="font-semibold text-surface-900 dark:text-surface-0">{{ interestRate() }}%</span>
                                </label>
                                <input type="range" [min]="0.5" [max]="20" [step]="0.5"
                                       [value]="interestRate()"
                                       (input)="interestRate.set(+$any($event.target).value)"
                                       class="w-full accent-slider">
                            </div>

                            <!-- Compounding frequency -->
                            <div class="space-y-2">
                                <label class="text-sm text-surface-600 dark:text-surface-300">
                                    {{ isFr ? 'Fr\u00e9quence de capitalisation' : 'Compounding frequency' }}
                                </label>
                                <div class="grid grid-cols-2 gap-2">
                                    @for (f of frequencies; track f.value) {
                                        <button (click)="compoundFreq.set(f.value)"
                                                class="px-3 py-2 rounded-lg text-xs font-medium transition-all border"
                                                [class]="compoundFreq() === f.value
                                                    ? 'bg-brand-700 dark:bg-brand-300 text-white dark:text-brand-900 border-brand-700 dark:border-brand-300'
                                                    : 'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 border-surface-200 dark:border-surface-600 hover:bg-surface-200 dark:hover:bg-surface-600'">
                                            {{ isFr ? f.labelFr : f.labelEn }}
                                        </button>
                                    }
                                </div>
                            </div>

                        </div>

                        <!-- Formula -->
                        <div class="mt-4 rounded-xl p-5
                                    bg-surface-50 dark:bg-surface-800
                                    border border-surface-200 dark:border-surface-700">
                            <h3 class="text-xs font-semibold uppercase tracking-wider mb-3 text-brand-700 dark:text-brand-300">
                                {{ isFr ? 'La formule' : 'The formula' }}
                            </h3>
                            <div class="text-center py-3 px-2 rounded-lg bg-surface-100 dark:bg-surface-700/50 mb-3">
                                <span class="font-mono text-sm text-surface-900 dark:text-surface-0">
                                    Vf = Vi \u00d7 (1 + r/n)<sup>n\u00d7t</sup> + PMT \u00d7 [(1 + r/n)<sup>n\u00d7t</sup> - 1] / (r/n)
                                </span>
                            </div>
                            <ul class="space-y-1 text-xs text-surface-500 dark:text-surface-400">
                                <li><strong class="text-surface-700 dark:text-surface-200">Vf</strong> = {{ isFr ? 'Valeur future' : 'Future value' }}</li>
                                <li><strong class="text-surface-700 dark:text-surface-200">Vi</strong> = {{ isFr ? 'Capital initial' : 'Initial capital' }} ({{ formatAmount(initialCapital()) }})</li>
                                <li><strong class="text-surface-700 dark:text-surface-200">PMT</strong> = {{ isFr ? '\u00c9pargne mensuelle' : 'Monthly savings' }} ({{ formatAmount(monthlySavings()) }})</li>
                                <li><strong class="text-surface-700 dark:text-surface-200">r</strong> = {{ isFr ? 'Taux annuel' : 'Annual rate' }} ({{ interestRate() }}%)</li>
                                <li><strong class="text-surface-700 dark:text-surface-200">n</strong> = {{ isFr ? 'Capitalisations/an' : 'Compounds/year' }} ({{ compoundFreq() }})</li>
                                <li><strong class="text-surface-700 dark:text-surface-200">t</strong> = {{ isFr ? 'Dur\u00e9e en ann\u00e9es' : 'Duration in years' }} ({{ horizon() }})</li>
                            </ul>
                        </div>

                        <!-- Disclaimer -->
                        <div class="mt-4 px-4 py-3 rounded-xl
                                    bg-surface-100 dark:bg-surface-800/60
                                    border border-surface-200 dark:border-surface-700/50">
                            <p class="text-xs leading-relaxed text-surface-500 dark:text-surface-400">
                                {{ isFr
                                    ? '\u26a0\ufe0f Cet outil est fourni \u00e0 titre informatif uniquement. Il ne constitue pas un conseil en investissement.'
                                    : '\u26a0\ufe0f This tool is for informational purposes only. It does not constitute investment advice.' }}
                            </p>
                        </div>
                    </div>

                    <!-- RIGHT: Results + Chart -->
                    <div class="lg:col-span-8 space-y-6">

                        <!-- Key metrics -->
                        <div class="grid grid-cols-3 gap-4">
                            <div class="rounded-xl p-5 text-center
                                        bg-surface-50 dark:bg-surface-800
                                        border border-surface-200 dark:border-surface-700">
                                <div class="text-xs font-medium uppercase tracking-wider mb-2 text-surface-500 dark:text-surface-400">
                                    {{ isFr ? 'Capital final' : 'Final capital' }}
                                </div>
                                <div class="text-xl md:text-2xl font-bold text-ochre-600 dark:text-ochre-400">
                                    {{ formatCompact(finalCapital()) }}
                                </div>
                            </div>
                            <div class="rounded-xl p-5 text-center
                                        bg-surface-50 dark:bg-surface-800
                                        border border-surface-200 dark:border-surface-700">
                                <div class="text-xs font-medium uppercase tracking-wider mb-2 text-surface-500 dark:text-surface-400">
                                    {{ isFr ? 'Versements' : 'Deposits' }}
                                </div>
                                <div class="text-xl md:text-2xl font-bold text-brand-700 dark:text-brand-300">
                                    {{ formatCompact(totalDeposits()) }}
                                </div>
                            </div>
                            <div class="rounded-xl p-5 text-center
                                        bg-surface-50 dark:bg-surface-800
                                        border border-surface-200 dark:border-surface-700">
                                <div class="text-xs font-medium uppercase tracking-wider mb-2 text-surface-500 dark:text-surface-400">
                                    {{ isFr ? 'Int\u00e9r\u00eats' : 'Interest' }}
                                </div>
                                <div class="text-xl md:text-2xl font-bold text-positive dark:text-positive-400">
                                    {{ formatCompact(totalInterest()) }}
                                </div>
                            </div>
                        </div>

                        <!-- Summary sentence -->
                        <div class="rounded-xl px-5 py-4
                                    bg-surface-50 dark:bg-surface-800
                                    border border-surface-200 dark:border-surface-700">
                            <p class="text-sm leading-relaxed text-surface-700 dark:text-surface-200">
                                {{ isFr
                                    ? 'Avec un capital initial de ' + formatAmount(initialCapital()) + ' et en investissant mensuellement ' + formatAmount(monthlySavings()) + ' pendant ' + horizon() + ' ans \u00e0 ' + interestRate() + '%, tu obtiens un capital de '
                                    : 'With an initial capital of ' + formatAmount(initialCapital()) + ' and investing ' + formatAmount(monthlySavings()) + ' monthly for ' + horizon() + ' years at ' + interestRate() + '%, you get a capital of ' }}
                                <strong class="text-ochre-600 dark:text-ochre-400">{{ formatAmount(finalCapital()) }}</strong>.
                            </p>
                        </div>

                        <!-- Chart -->
                        <div class="rounded-2xl p-5 md:p-6
                                    bg-surface-50 dark:bg-surface-800
                                    border border-surface-200 dark:border-surface-700">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-sm font-semibold text-surface-900 dark:text-surface-0">
                                    {{ isFr ? '\u00c9volution de ton capital' : 'Capital evolution' }}
                                </h3>
                                <div class="flex items-center gap-4 text-xs text-surface-500 dark:text-surface-400">
                                    <span class="flex items-center gap-1.5">
                                        <span class="w-3 h-0.5 rounded bg-ochre-500"></span>
                                        {{ isFr ? 'Int\u00e9r\u00eats' : 'Interest' }}
                                    </span>
                                    <span class="flex items-center gap-1.5">
                                        <span class="w-3 h-0.5 rounded bg-brand-700 dark:bg-brand-300"></span>
                                        {{ isFr ? 'Versements' : 'Deposits' }}
                                    </span>
                                </div>
                            </div>
                            @if (chartData) {
                                <p-chart type="bar" [data]="chartData" [options]="chartOptions"
                                         class="w-full" [style]="{ height: '440px' }" />
                            }
                        </div>

                        <!-- Year-by-year table (condensed) -->
                        <div class="rounded-2xl overflow-hidden
                                    bg-surface-50 dark:bg-surface-800
                                    border border-surface-200 dark:border-surface-700">
                            <div class="px-5 py-4 border-b border-surface-200 dark:border-surface-700">
                                <h3 class="text-sm font-semibold text-surface-900 dark:text-surface-0">
                                    {{ isFr ? 'D\u00e9tail ann\u00e9e par ann\u00e9e' : 'Year-by-year breakdown' }}
                                </h3>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full text-sm">
                                    <thead>
                                        <tr class="border-b border-surface-200 dark:border-surface-700">
                                            <th class="text-left px-5 py-3 text-xs font-medium uppercase tracking-wider text-surface-500 dark:text-surface-400">
                                                {{ isFr ? 'Ann\u00e9e' : 'Year' }}
                                            </th>
                                            <th class="text-right px-5 py-3 text-xs font-medium uppercase tracking-wider text-surface-500 dark:text-surface-400">
                                                {{ isFr ? 'Versements' : 'Deposits' }}
                                            </th>
                                            <th class="text-right px-5 py-3 text-xs font-medium uppercase tracking-wider text-surface-500 dark:text-surface-400">
                                                {{ isFr ? 'Int\u00e9r\u00eats' : 'Interest' }}
                                            </th>
                                            <th class="text-right px-5 py-3 text-xs font-medium uppercase tracking-wider text-surface-500 dark:text-surface-400">
                                                {{ isFr ? 'Total' : 'Total' }}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @for (p of projections(); track p.year) {
                                            @if (p.year > 0 && (p.year <= 5 || p.year % 5 === 0 || p.year === horizon())) {
                                                <tr class="border-b border-surface-100 dark:border-surface-700/50
                                                           hover:bg-surface-100 dark:hover:bg-surface-700/30 transition-colors"
                                                    [class]="p.year === horizon() ? 'bg-ochre-50/50 dark:bg-ochre-700/5' : ''">
                                                    <td class="px-5 py-3 font-medium text-surface-900 dark:text-surface-0">{{ p.year }}</td>
                                                    <td class="px-5 py-3 text-right text-brand-700 dark:text-brand-300">{{ formatCompact(p.deposits) }}</td>
                                                    <td class="px-5 py-3 text-right text-positive dark:text-positive-400">{{ formatCompact(p.interests) }}</td>
                                                    <td class="px-5 py-3 text-right font-semibold text-surface-900 dark:text-surface-0">{{ formatCompact(p.total) }}</td>
                                                </tr>
                                            }
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- Other tools link -->
                <div class="mt-12 text-center">
                    <a [routerLink]="[currentLang, 'tools', 'fire-simulator']"
                       class="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                              bg-surface-50 dark:bg-surface-800
                              border border-surface-200 dark:border-surface-700
                              text-surface-700 dark:text-surface-200
                              hover:bg-surface-100 dark:hover:bg-surface-700 transition-all">
                        <span>🔥</span>
                        <span class="font-medium text-sm">{{ isFr ? 'Essaie aussi le simulateur FIRE' : 'Also try the FIRE simulator' }}</span>
                        <i class="pi pi-arrow-right text-xs text-brand-700 dark:text-brand-300"></i>
                    </a>
                </div>

                <!-- Footer -->
                <div class="text-center mt-16 pb-8">
                    <div class="flex items-center justify-center gap-2 mb-3 opacity-50">
                        <img [src]="isDark() ? 'assets/brand/omaad-icon-inverse.svg' : 'assets/brand/omaad-icon.svg'"
                             alt="Omaad" class="w-6 h-6">
                        <span class="text-sm font-semibold text-ochre-600 dark:text-ochre-400">Construis. Prot\u00e8ge. R\u00e8gne.</span>
                    </div>
                    <p class="text-xs text-surface-500 dark:text-surface-400">
                        \u00a9 {{ currentYear }} Omaad \u00b7
                        <a href="https://omaad.africa" class="text-brand-700 dark:text-brand-300 hover:underline" target="_blank">omaad.africa</a>
                    </p>
                </div>
            </div>
        </div>
    `,
    styles: [`
        :host { display: block; }

        .accent-slider {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 6px;
            border-radius: 3px;
            outline: none;
        }
        :host-context(.app-dark) .accent-slider { background: rgba(138, 152, 174, 0.15); }
        .accent-slider { background: rgba(26, 39, 64, 0.1); }

        .accent-slider::-webkit-slider-thumb {
            -webkit-appearance: none; appearance: none;
            width: 20px; height: 20px; border-radius: 50%;
            background: #C77B3C; cursor: pointer;
            box-shadow: 0 0 0 4px rgba(199, 123, 60, 0.15);
            transition: box-shadow 0.2s;
        }
        .accent-slider::-webkit-slider-thumb:hover { box-shadow: 0 0 0 6px rgba(199, 123, 60, 0.25); }
        .accent-slider::-moz-range-thumb {
            width: 20px; height: 20px; border-radius: 50%;
            background: #C77B3C; cursor: pointer; border: none;
            box-shadow: 0 0 0 4px rgba(199, 123, 60, 0.15);
        }
        .accent-slider::-moz-range-track { height: 6px; border-radius: 3px; }
        :host-context(.app-dark) .accent-slider::-moz-range-track { background: rgba(138, 152, 174, 0.15); }
    `]
})
export class CompoundCalculator {
    private router = inject(Router);
    private seo = inject(SeoService);
    private platformId = inject(PLATFORM_ID);
    private analytics = inject(AnalyticsService);
    layoutService = inject(LayoutService);

    constructor() {
        applyChartDefaults(); // Chart.js defaults on demand (P2-FE-4)
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        const lang = (match ? match[1] : 'fr') as Lang;
        this.seo.applyLocalized({ lang, ...SEO_PAGES.compoundInterest });
        this.analytics.trackPublic('tool_view', { tool: 'compound-interest', lang });
    }

    readonly currentYear = new Date().getFullYear();

    currency = signal<'FCFA' | 'EUR'>('FCFA');
    initialCapital = signal(1_000_000);
    monthlySavings = signal(100_000);
    horizon = signal(20);
    interestRate = signal(8);
    compoundFreq = signal(12);

    chartData: any = null;
    chartOptions: any = null;

    readonly frequencies = [
        { value: 1, labelFr: 'Annuel', labelEn: 'Annual' },
        { value: 4, labelFr: 'Trimestriel', labelEn: 'Quarterly' },
        { value: 12, labelFr: 'Mensuel', labelEn: 'Monthly' },
        { value: 365, labelFr: 'Quotidien', labelEn: 'Daily' }
    ];

    get currentLang(): string {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        return '/' + (match ? match[1] : 'fr');
    }

    get isFr(): boolean { return this.currentLang === '/fr'; }

    isDark(): boolean {
        if (!isPlatformBrowser(this.platformId)) return true;
        return isDarkMode();
    }

    toggleDarkMode() {
        this.layoutService.layoutConfig.update((state) => ({
            ...state,
            themeMode: state.darkTheme ? 'light' : 'dark',
            darkTheme: !state.darkTheme
        }));
        setTimeout(() => this.buildChart(), 50);
    }

    toggleCurrency() {
        const wasFcfa = this.currency() === 'FCFA';
        if (wasFcfa) {
            this.currency.set('EUR');
            this.initialCapital.set(Math.round(this.initialCapital() / 655.957));
            this.monthlySavings.set(Math.round(this.monthlySavings() / 655.957));
        } else {
            this.currency.set('FCFA');
            this.initialCapital.set(Math.round(this.initialCapital() * 655.957));
            this.monthlySavings.set(Math.round(this.monthlySavings() * 655.957));
        }
    }

    currMax(type: string): number {
        const isFcfa = this.currency() === 'FCFA';
        switch (type) {
            case 'capital': return isFcfa ? 500_000_000 : 800_000;
            case 'savings': return isFcfa ? 5_000_000 : 8_000;
            default: return 0;
        }
    }

    currStep(type: string): number {
        const isFcfa = this.currency() === 'FCFA';
        switch (type) {
            case 'capital': return isFcfa ? 500_000 : 1_000;
            case 'savings': return isFcfa ? 25_000 : 50;
            default: return 1;
        }
    }

    projections = computed<YearPoint[]>(() => {
        const n = this.compoundFreq();
        const r = this.interestRate() / 100;
        const pmt = this.monthlySavings();
        const vi = this.initialCapital();
        const years = this.horizon();

        const result: YearPoint[] = [
            { year: 0, deposits: vi, interests: 0, total: vi }
        ];

        for (let y = 1; y <= years; y++) {
            const periods = n * y;
            const ratePerPeriod = r / n;
            const compoundFactor = Math.pow(1 + ratePerPeriod, periods);

            const pmtPerPeriod = pmt * 12 / n;
            const futureValue = vi * compoundFactor + pmtPerPeriod * (compoundFactor - 1) / ratePerPeriod;
            const totalDeposits = vi + pmt * 12 * y;
            const interests = futureValue - totalDeposits;

            result.push({
                year: y,
                deposits: Math.round(totalDeposits),
                interests: Math.round(Math.max(0, interests)),
                total: Math.round(futureValue)
            });
        }
        return result;
    });

    finalCapital = computed(() => {
        const p = this.projections();
        return p[p.length - 1].total;
    });

    totalDeposits = computed(() => {
        const p = this.projections();
        return p[p.length - 1].deposits;
    });

    totalInterest = computed(() => {
        const p = this.projections();
        return p[p.length - 1].interests;
    });

    private chartEffect = effect(() => {
        this.projections();
        if (isPlatformBrowser(this.platformId)) {
            this.buildChart();
        }
    });

    formatAmount(value: number): string {
        const curr = this.currency();
        if (curr === 'FCFA') {
            if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1).replace('.0', '') + ' Mds FCFA';
            if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace('.0', '') + ' M FCFA';
            return new Intl.NumberFormat('fr-FR').format(value) + ' FCFA';
        }
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
    }

    formatCompact(value: number): string {
        const curr = this.currency();
        if (curr === 'FCFA') {
            if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1).replace('.0', '') + ' Mds';
            if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace('.0', '') + ' M';
            return new Intl.NumberFormat('fr-FR').format(value);
        }
        if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace('.0', '') + ' M\u20ac';
        if (value >= 1_000) return (value / 1_000).toFixed(0) + ' k\u20ac';
        return new Intl.NumberFormat('fr-FR').format(value) + ' \u20ac';
    }

    private buildChart() {
        const proj = this.projections();
        const dark = this.isDark();

        const depositColor = dark ? 'rgba(138, 152, 174, 0.35)' : 'rgba(26, 39, 64, 0.2)';
        const interestColor = dark ? 'rgba(199, 123, 60, 0.5)' : 'rgba(199, 123, 60, 0.45)';
        const tickColor = dark ? 'rgba(138, 152, 174, 0.5)' : 'rgba(26, 39, 64, 0.35)';
        const gridColor = dark ? 'rgba(138, 152, 174, 0.06)' : 'rgba(26, 39, 64, 0.06)';
        const tooltipBg = dark ? 'rgba(15, 26, 46, 0.95)' : 'rgba(255, 255, 255, 0.95)';
        const tooltipTitle = dark ? '#FAF8F4' : '#1A2740';
        const tooltipBody = dark ? '#C2BDB1' : '#6E6A60';
        const tooltipBorder = dark ? 'rgba(199, 123, 60, 0.25)' : 'rgba(26, 39, 64, 0.1)';

        this.chartData = {
            labels: proj.map(p => p.year === 0 ? (this.isFr ? 'Auj.' : 'Now') : `${p.year}`),
            datasets: [
                {
                    label: this.isFr ? 'Versements' : 'Deposits',
                    data: proj.map(p => p.deposits),
                    backgroundColor: depositColor,
                    borderColor: 'transparent',
                    borderWidth: 0,
                    borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 4, bottomRight: 4 },
                    stack: 'wealth'
                },
                {
                    label: this.isFr ? 'Int\u00e9r\u00eats compos\u00e9s' : 'Compound interest',
                    data: proj.map(p => p.interests),
                    backgroundColor: interestColor,
                    borderColor: 'transparent',
                    borderWidth: 0,
                    borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
                    stack: 'wealth'
                }
            ]
        };

        const isFr = this.isFr;
        const formatFn = this.formatCompact.bind(this);

        this.chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: tooltipBg,
                    titleColor: tooltipTitle,
                    bodyColor: tooltipBody,
                    borderColor: tooltipBorder,
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    callbacks: {
                        title: (ctx: any) => {
                            const yr = ctx[0]?.label;
                            return yr === (isFr ? 'Auj.' : 'Now')
                                ? (isFr ? 'Aujourd\u2019hui' : 'Today')
                                : (isFr ? `Ann\u00e9e ${yr}` : `Year ${yr}`);
                        },
                        label: (ctx: any) => `${ctx.dataset.label}: ${formatFn(ctx.raw)}`
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: { color: tickColor, font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
                    grid: { display: false }
                },
                y: {
                    stacked: true,
                    ticks: { color: tickColor, font: { size: 11 }, callback: (v: number) => formatFn(v), maxTicksLimit: 6 },
                    grid: { color: gridColor, drawBorder: false }
                }
            }
        };
    }
}
