import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { SeoService } from '../../../core/services/seo.service';
import { chartTheme, isDarkMode, applyChartDefaults } from '../../../core/theme/chart-theme';
import { LayoutService } from '../../../layout/service/layout.service';
import { PlanService } from './plan.service';
import { DISCLAIMER, fmtFCFA, fmtFCFAfull, IRVM_DEFAUT_PCT } from './data/referentiel';
import { projectDRIP } from './projections';

const PAGE_TITLE = 'Simulateur DRIP BRVM : dividendes réinvestis et revenus passifs | Omaad';
const PAGE_DESC =
    'Simule le réinvestissement de tes dividendes BRVM (DRIP) : capital initial, DCA mensuel, yield, croissance du dividende. ' +
    'Projections de revenus passifs nets, gratuites et sans inscription.';
const CANONICAL = 'https://omaad.africa/outils/strategie-brvm/simulateur';

interface Param {
    key: 'initial' | 'monthly' | 'years' | 'yieldPct' | 'growthDiv' | 'dripYears' | 'taxRate';
    label: string;
    min: number;
    max: number;
    step: number;
    unit: string;
}

@Component({
    selector: 'app-strategie-simulateur-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ChartModule],
    template: `
        <header class="pb-2 pt-8 sm:pt-10">
            <h1 class="max-w-[24ch] text-[clamp(26px,4.5vw,42px)] font-bold leading-[1.1] tracking-tight text-surface-900 dark:text-surface-0">
                Simulateur <em class="not-italic text-ochre-600 dark:text-ochre-400">dividendes réinvestis</em> (DRIP)
            </h1>
            <p class="mt-4 max-w-[64ch] text-[14.5px] leading-relaxed text-surface-600 dark:text-surface-300">
                Le moteur silencieux du plan : chaque dividende réinvesti achète des actions qui verseront à leur tour.
                Règle les hypothèses, observe la courbe. Le yield pondéré de ta grille ({{ planYield }}%) est pré-rempli.
            </p>
        </header>

        <div class="mt-5 grid gap-4 lg:grid-cols-[320px_1fr]">
            <!-- Paramètres -->
            <div class="rounded-2xl border border-surface-200 bg-surface-50 p-5 dark:border-surface-700 dark:bg-surface-800">
                <h2 class="text-[15px] font-bold text-surface-900 dark:text-surface-0">Hypothèses</h2>
                <div class="mt-4 space-y-4">
                    @for (p of params; track p.key) {
                        <label class="block">
                            <span class="flex items-baseline justify-between text-[12.5px]">
                                <span class="font-medium text-surface-600 dark:text-surface-300">{{ p.label }}</span>
                                <span class="font-semibold tabular-nums text-surface-900 dark:text-surface-0">
                                    {{ p.unit === 'F' ? full(value(p.key)) : value(p.key) }} {{ p.unit }}</span>
                            </span>
                            <input type="range" [min]="p.min" [max]="p.max" [step]="p.step"
                                   [ngModel]="value(p.key)" (ngModelChange)="setValue(p.key, $event)"
                                   [attr.aria-label]="p.label" class="mt-1.5 w-full accent-ochre-500">
                        </label>
                    }
                </div>
                <p class="mt-4 text-[11.5px] leading-relaxed text-surface-400 dark:text-surface-500">
                    Hypothèse fixe du modèle : appréciation des cours de 5%/an. Le DRIP s'arrête après
                    « années de réinvestissement » ; ensuite les dividendes sont perçus en revenu.
                </p>
            </div>

            <!-- Résultats -->
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div class="rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800">
                        <div class="text-[11px] uppercase tracking-[0.06em] text-surface-500 dark:text-surface-400">Valeur finale</div>
                        <div class="mt-1.5 text-lg font-extrabold tabular-nums text-surface-900 dark:text-surface-0">{{ compact(final().value) }} F</div>
                    </div>
                    <div class="rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800">
                        <div class="text-[11px] uppercase tracking-[0.06em] text-surface-500 dark:text-surface-400">Capital investi</div>
                        <div class="mt-1.5 text-lg font-extrabold tabular-nums text-surface-900 dark:text-surface-0">{{ compact(final().invested) }} F</div>
                    </div>
                    <div class="rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800">
                        <div class="text-[11px] uppercase tracking-[0.06em] text-surface-500 dark:text-surface-400">Dividendes nets / an</div>
                        <div class="mt-1.5 text-lg font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">{{ compact(final().dividendsNet) }} F</div>
                    </div>
                    <div class="rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800">
                        <div class="text-[11px] uppercase tracking-[0.06em] text-surface-500 dark:text-surface-400">Soit par mois</div>
                        <div class="mt-1.5 text-lg font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">{{ full(final().dividendsMonthly) }} F</div>
                    </div>
                </div>

                <div class="rounded-2xl border border-surface-200 bg-surface-50 p-5 dark:border-surface-700 dark:bg-surface-800">
                    <div class="flex items-baseline justify-between">
                        <h2 class="text-[15px] font-bold text-surface-900 dark:text-surface-0">Valeur du portefeuille et dividendes nets</h2>
                        <button type="button" (click)="showTable.set(!showTable())"
                                class="text-[12.5px] font-medium text-ochre-600 hover:text-ochre-500 dark:text-ochre-400">
                            {{ showTable() ? 'Voir le graphique' : 'Voir le tableau' }}</button>
                    </div>
                    @if (!showTable()) {
                        <div class="mt-3">
                            <p-chart type="line" [data]="chartData" [options]="chartOptions" height="320px" />
                        </div>
                    } @else {
                        <div class="mt-3 overflow-x-auto">
                            <table class="w-full border-collapse text-[13px]">
                                <thead>
                                    <tr class="border-b border-surface-200 text-left text-[11px] uppercase tracking-[0.06em] text-surface-500 dark:border-surface-600 dark:text-surface-400">
                                        <th class="py-2 pr-3 font-semibold">Année</th>
                                        <th class="hidden py-2 pr-3 text-right font-semibold sm:table-cell">Investi</th>
                                        <th class="py-2 pr-3 text-right font-semibold">Valeur</th>
                                        <th class="hidden py-2 pr-3 text-right font-semibold sm:table-cell">Div. nets/an</th>
                                        <th class="py-2 text-right font-semibold">Div. nets/mois</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @for (row of series(); track row.year) {
                                        <tr class="border-b border-surface-200/60 tabular-nums dark:border-surface-700/60">
                                            <td class="py-2 pr-3">{{ row.year }}</td>
                                            <td class="hidden py-2 pr-3 text-right sm:table-cell">{{ full(row.invested) }}</td>
                                            <td class="py-2 pr-3 text-right font-semibold text-surface-900 dark:text-surface-0">{{ full(row.value) }}</td>
                                            <td class="hidden py-2 pr-3 text-right text-emerald-700 dark:text-emerald-400 sm:table-cell">{{ full(row.dividendsNet) }}</td>
                                            <td class="py-2 text-right text-emerald-700 dark:text-emerald-400">{{ full(row.dividendsMonthly) }}</td>
                                        </tr>
                                    }
                                </tbody>
                            </table>
                        </div>
                    }
                </div>

                <p class="text-[12px] leading-relaxed text-surface-400 dark:text-surface-500">{{ disclaimer }}</p>
            </div>
        </div>
    `
})
export class StrategieSimulateurPage {
    private seo = inject(SeoService);
    private platformId = inject(PLATFORM_ID);
    readonly layoutService = inject(LayoutService);
    private planSvc = inject(PlanService);

    readonly disclaimer = DISCLAIMER;
    readonly planYield = this.planSvc.weightedYieldGross();

    readonly params: Param[] = [
        { key: 'initial',   label: 'Capital initial',              min: 0,       max: 20_000_000, step: 100_000, unit: 'F' },
        { key: 'monthly',   label: 'DCA mensuel',                  min: 0,       max: 1_000_000,  step: 5_000,   unit: 'F' },
        { key: 'years',     label: 'Horizon',                      min: 1,       max: 30,         step: 1,       unit: 'ans' },
        { key: 'yieldPct',  label: 'Yield brut de départ',         min: 1,       max: 12,         step: 0.1,     unit: '%' },
        { key: 'growthDiv', label: 'Croissance du dividende',      min: 0,       max: 12,         step: 0.5,     unit: '%/an' },
        { key: 'dripYears', label: 'Années de réinvestissement',   min: 0,       max: 30,         step: 1,       unit: 'ans' },
        { key: 'taxRate',   label: 'IRVM',                         min: 0,       max: 30,         step: 1,       unit: '%' },
    ];

    readonly initial = signal(200_000);
    readonly monthly = signal(this.planSvc.plan().dcaMonthly || 50_000);
    readonly years = signal(15);
    readonly yieldPct = signal(this.planYield > 0 ? this.planYield : 5.5);
    readonly growthDiv = signal(5);
    readonly dripYears = signal(10);
    readonly taxRate = signal(IRVM_DEFAUT_PCT);

    readonly showTable = signal(false);

    readonly series = computed(() => projectDRIP({
        initial: this.initial(),
        monthly: this.monthly(),
        years: this.years(),
        yieldPct: this.yieldPct(),
        growthDiv: this.growthDiv(),
        dripYears: Math.min(this.dripYears(), this.years()),
        taxRate: this.taxRate(),
    }));

    readonly final = computed(() => this.series()[this.series().length - 1]);

    chartData: any = null;
    chartOptions: any = null;

    constructor() {
        applyChartDefaults();
        this.seo.apply({ title: PAGE_TITLE, description: PAGE_DESC, canonical: CANONICAL });
        effect(() => {
            this.series();
            this.layoutService.isDarkTheme();
            this.buildChart();
        });
    }

    value(key: Param['key']): number { return (this as any)[key](); }
    setValue(key: Param['key'], v: unknown): void { (this as any)[key].set(Number(v) || 0); }

    private buildChart(): void {
        if (!isPlatformBrowser(this.platformId)) return;
        const t = chartTheme(isDarkMode());
        const rows = this.series();
        this.chartData = {
            labels: rows.map((r) => r.year),
            datasets: [
                {
                    label: 'Valeur du portefeuille',
                    data: rows.map((r) => r.value),
                    borderColor: t.series.primary,
                    backgroundColor: t.series.primarySoft,
                    fill: true,
                    tension: 0.25,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHitRadius: 12,
                },
                {
                    label: 'Capital investi',
                    data: rows.map((r) => r.invested),
                    borderColor: t.series.muted,
                    borderDash: [5, 4],
                    fill: false,
                    tension: 0.25,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHitRadius: 12,
                },
                {
                    label: 'Dividendes nets / an',
                    data: rows.map((r) => r.dividendsNet),
                    borderColor: t.series.accent,
                    backgroundColor: t.series.accentSoft,
                    fill: true,
                    tension: 0.25,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHitRadius: 12,
                },
            ],
        };
        this.chartOptions = {
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'bottom', labels: { color: t.textMuted, usePointStyle: true, boxWidth: 8, font: { size: 11 } } },
                tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.dataset.label} : ${fmtFCFAfull(ctx.parsed.y)} F` } },
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: t.textMuted, font: { size: 11 } }, title: { display: true, text: 'Années', color: t.textMuted, font: { size: 11 } } },
                y: { grid: { color: t.grid }, ticks: { color: t.textMuted, font: { size: 11 }, callback: (v: number) => fmtFCFA(v) } },
            },
        };
    }

    full(v: number): string { return fmtFCFAfull(v); }
    compact(v: number): string { return fmtFCFA(v); }
}
