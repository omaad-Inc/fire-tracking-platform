import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { SeoService } from '../../../core/services/seo.service';
import { chartTheme, isDarkMode, applyChartDefaults } from '../../../core/theme/chart-theme';
import { LayoutService } from '../../../layout/service/layout.service';
import { PlanService } from './plan.service';
import { fmtFCFAfull } from './data/referentiel';
import calendrier from './data/detachements.json';

const PAGE_TITLE = 'Calendrier des dividendes BRVM : dates de détachement et de paiement | Omaad';
const PAGE_DESC =
    'Dates ex-dividende, dates de paiement et montants nets des dividendes BRVM, issus des avis officiels de la bourse. ' +
    'Timeline visuelle et tableau filtrable, mis à jour automatiquement, gratuits et sans inscription.';
const CANONICAL = 'https://omaad.africa/outils/strategie-brvm/detachements';

interface Detachement {
    emetteur: string;
    exercice: number | null;
    date_paiement: string | null;
    date_ex_dividende: string | null;
    montant_net_fcfa: number | null;
    avis_url: string | null;
    ticker: string | null;
    nom: string;
    secteur: string | null;
}

const ENTRIES: Detachement[] = (calendrier as { entries: Detachement[] }).entries;
const UPDATED_AT: string = (calendrier as { updated_at: string }).updated_at;
const SOURCE_URL: string = (calendrier as { source: string }).source;

/** Au-delà, les secteurs les moins fréquents sont regroupés (jamais de cycle de couleurs). */
const MAX_SECTOR_SERIES = 7;

@Component({
    selector: 'app-strategie-detachements-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ChartModule],
    template: `
        <header class="pb-2 pt-8 sm:pt-10">
            <h1 class="max-w-[26ch] text-[clamp(26px,4.5vw,42px)] font-bold leading-[1.1] tracking-tight text-surface-900 dark:text-surface-0">
                Calendrier des <em class="not-italic text-ochre-600 dark:text-ochre-400">détachements de dividendes</em> BRVM
            </h1>
            <p class="mt-4 max-w-[64ch] text-[14.5px] leading-relaxed text-surface-600 dark:text-surface-300">
                Les dates ex-dividende et de paiement publiées par la BRVM, avec le montant net par action et le lien
                vers l'avis officiel. C'est la matière première de ton plan d'exécution : qui détache quoi, et quand.
            </p>
            <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-surface-500 dark:text-surface-400">
                <span><i class="pi pi-verified mr-1.5 text-ochre-500" aria-hidden="true"></i>Source :
                    <a [href]="sourceUrl" target="_blank" rel="noopener" class="underline decoration-dotted hover:text-ochre-600">avis officiels BRVM</a></span>
                <span><i class="pi pi-refresh mr-1.5" aria-hidden="true"></i>Données au {{ updatedLabel }}</span>
                <span class="tabular-nums"><i class="pi pi-list mr-1.5" aria-hidden="true"></i>{{ filtered().length }} / {{ total }} lignes</span>
            </div>
        </header>

        <!-- Tuiles factuelles -->
        <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800">
                <div class="text-[11px] font-semibold uppercase tracking-[0.07em] text-surface-500 dark:text-surface-400">Détachements à venir</div>
                <div class="mt-1.5 text-2xl font-extrabold tabular-nums text-surface-900 dark:text-surface-0">{{ upcoming().length }}</div>
                <div class="mt-1 text-[12px] text-surface-500 dark:text-surface-400">dates confirmées au calendrier</div>
            </div>
            <div class="rounded-2xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800">
                <div class="text-[11px] font-semibold uppercase tracking-[0.07em] text-surface-500 dark:text-surface-400">Dans ta grille</div>
                <div class="mt-1.5 text-2xl font-extrabold tabular-nums text-ochre-600 dark:text-ochre-400">{{ upcomingInPlan().length }}</div>
                <div class="mt-1 text-[12px] text-surface-500 dark:text-surface-400">
                    {{ upcomingInPlan().length > 0 ? 'à venir parmi les titres de ton plan' : 'aucun titre de ton plan ne détache prochainement' }}</div>
            </div>
            <div class="rounded-2xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800">
                <div class="text-[11px] font-semibold uppercase tracking-[0.07em] text-surface-500 dark:text-surface-400">Prochain détachement</div>
                @if (next(); as n) {
                    <div class="mt-1.5 text-2xl font-extrabold text-surface-900 dark:text-surface-0">{{ n.ticker ?? n.nom }}</div>
                    <div class="mt-1 text-[12px] tabular-nums text-surface-500 dark:text-surface-400">{{ dateLabel(n.date_ex_dividende) }} · {{ montant(n.montant_net_fcfa!) }} F net/action</div>
                } @else {
                    <div class="mt-1.5 text-2xl font-extrabold text-surface-400">—</div>
                    <div class="mt-1 text-[12px] text-surface-500 dark:text-surface-400">aucune date à venir publiée</div>
                }
            </div>
        </div>

        <!-- Timeline -->
        <div class="mt-4 rounded-2xl border border-surface-200 bg-surface-50 p-5 dark:border-surface-700 dark:bg-surface-800">
            <h2 class="text-[15px] font-bold text-surface-900 dark:text-surface-0">Timeline des détachements</h2>
            <p class="mt-1 text-[12px] text-surface-500 dark:text-surface-400">
                Chaque point est un détachement : position = date ex-dividende, hauteur = montant net par action (échelle log), couleur = secteur. Survole pour le détail.
                @if (undatedCount() > 0) { <span class="text-surface-400">{{ undatedCount() }} annonce(s) sans date ne figurent que dans le tableau.</span> }
            </p>
            <div class="mt-3">
                <p-chart type="bubble" [data]="chartData" [options]="chartOptions" height="300px" />
            </div>
        </div>

        <!-- Filtres -->
        <div class="mt-4 rounded-2xl border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800 sm:p-3.5">
            <div class="flex flex-wrap items-center gap-2.5">
                <div class="relative flex min-w-[200px] flex-1 items-center">
                    <i class="pi pi-search pointer-events-none absolute left-3.5 text-surface-400" aria-hidden="true"></i>
                    <input type="search" [ngModel]="q()" (ngModelChange)="q.set($event)" placeholder="Société ou ticker…"
                           aria-label="Rechercher une société"
                           class="w-full rounded-xl border border-surface-200 bg-surface-0 py-2.5 pl-10 pr-3 text-[14px] text-surface-900
                                  placeholder:text-surface-400 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-0">
                </div>
                <select [ngModel]="exercice()" (ngModelChange)="exercice.set($event)" aria-label="Exercice comptable"
                        class="rounded-xl border border-surface-200 bg-surface-0 px-3 py-2.5 text-[13.5px] text-surface-700 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-200">
                    <option value="">Tous les exercices</option>
                    @for (e of exercices; track e) { <option [value]="e">Exercice {{ e }}</option> }
                </select>
                <select [ngModel]="secteur()" (ngModelChange)="secteur.set($event)" aria-label="Secteur"
                        class="rounded-xl border border-surface-200 bg-surface-0 px-3 py-2.5 text-[13.5px] text-surface-700 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-200">
                    <option value="">Tous les secteurs</option>
                    @for (s of secteurs; track s) { <option [value]="s">{{ s }}</option> }
                </select>
                <button type="button" (click)="aVenir.set(!aVenir())"
                        class="rounded-xl border px-3.5 py-2.5 text-[13.5px] font-medium transition-colors"
                        [class]="aVenir()
                            ? 'border-ochre-500 bg-ochre-500/10 text-ochre-700 dark:text-ochre-400'
                            : 'border-surface-200 bg-surface-0 text-surface-600 dark:border-surface-600 dark:bg-surface-900 dark:text-surface-300'">
                    <i class="pi pi-calendar-plus mr-1.5 text-[12px]" aria-hidden="true"></i>À venir uniquement
                </button>
            </div>
        </div>

        <!-- Table -->
        <div class="mt-4 overflow-x-auto rounded-2xl border border-surface-200 dark:border-surface-700">
            <table class="w-full min-w-[760px] border-collapse text-[13.5px]">
                <thead>
                    <tr class="bg-surface-50 text-left text-[11px] uppercase tracking-[0.07em] text-surface-500 dark:bg-surface-800 dark:text-surface-400">
                        <th class="px-4 py-3 font-semibold">Ex-dividende</th>
                        <th class="px-4 py-3 font-semibold">Paiement</th>
                        <th class="px-4 py-3 font-semibold">Société</th>
                        <th class="px-4 py-3 font-semibold">Secteur</th>
                        <th class="px-4 py-3 font-semibold">Exercice</th>
                        <th class="px-4 py-3 text-right font-semibold">Net / action</th>
                        <th class="px-4 py-3 text-right font-semibold">Avis</th>
                    </tr>
                </thead>
                <tbody class="bg-surface-0 dark:bg-surface-900">
                    @for (d of filtered(); track d.emetteur + d.exercice + d.date_ex_dividende) {
                        <tr class="border-t border-surface-200/70 dark:border-surface-700/60"
                            [class]="isUpcoming(d) ? 'bg-ochre-500/5' : ''">
                            <td class="px-4 py-3 tabular-nums">
                                {{ dateLabel(d.date_ex_dividende) }}
                                @if (isUpcoming(d)) {
                                    <span class="ml-2 rounded-full bg-ochre-500/15 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-ochre-700 dark:text-ochre-400">à venir</span>
                                }
                            </td>
                            <td class="px-4 py-3 tabular-nums text-surface-600 dark:text-surface-300">{{ dateLabel(d.date_paiement) }}</td>
                            <td class="px-4 py-3">
                                <span class="font-semibold text-surface-900 dark:text-surface-0">{{ d.nom }}</span>
                                @if (d.ticker) { <span class="ml-2 font-mono text-[11.5px] font-bold text-brand-700 dark:text-brand-300">{{ d.ticker }}</span> }
                            </td>
                            <td class="px-4 py-3 text-surface-600 dark:text-surface-300">{{ d.secteur ?? '—' }}</td>
                            <td class="px-4 py-3 tabular-nums text-surface-600 dark:text-surface-300">{{ d.exercice ?? '—' }}</td>
                            <td class="px-4 py-3 text-right font-semibold tabular-nums text-surface-900 dark:text-surface-0">
                                {{ d.montant_net_fcfa != null ? montant(d.montant_net_fcfa) + ' F' : '—' }}</td>
                            <td class="px-4 py-3 text-right">
                                @if (d.avis_url) {
                                    <a [href]="d.avis_url" target="_blank" rel="noopener" aria-label="Avis officiel BRVM (PDF)"
                                       class="text-ochre-600 hover:text-ochre-500 dark:text-ochre-400"><i class="pi pi-file-pdf" aria-hidden="true"></i></a>
                                } @else { <span class="text-surface-300 dark:text-surface-600">—</span> }
                            </td>
                        </tr>
                    } @empty {
                        <tr><td colspan="7" class="px-4 py-10 text-center text-[14px] text-surface-500 dark:text-surface-400">
                            Aucune ligne ne correspond à ces filtres.</td></tr>
                    }
                </tbody>
            </table>
        </div>

        <p class="mt-4 max-w-[74ch] text-[12px] leading-relaxed text-surface-400 dark:text-surface-500">
            La date ex-dividende (détachement) est le jour à partir duquel l'action se négocie sans le droit au
            dividende : il faut détenir l'action la veille au plus tard pour le percevoir. Montants nets de l'IRVM,
            tels que publiés dans les avis officiels de la BRVM. Données factuelles uniquement : cet outil ne
            recommande aucun titre.
        </p>
    `
})
export class StrategieDetachementsPage {
    private seo = inject(SeoService);
    private platformId = inject(PLATFORM_ID);
    readonly layoutService = inject(LayoutService);
    private planSvc = inject(PlanService);

    readonly sourceUrl = SOURCE_URL;
    readonly total = ENTRIES.length;
    readonly updatedLabel = new Date(UPDATED_AT + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    private readonly todayIso = new Date().toISOString().slice(0, 10);

    readonly q = signal('');
    readonly exercice = signal<string>('');
    readonly secteur = signal<string>('');
    readonly aVenir = signal(false);

    readonly exercices = [...new Set(ENTRIES.map((e) => e.exercice).filter((v): v is number => v != null))].sort((a, b) => b - a);
    readonly secteurs = [...new Set(ENTRIES.map((e) => e.secteur).filter((v): v is string => !!v))].sort();

    chartData: any = null;
    chartOptions: any = null;

    readonly filtered = computed(() => {
        const q = this.q().trim().toLowerCase();
        const ex = this.exercice();
        const sec = this.secteur();
        const upcomingOnly = this.aVenir();
        return ENTRIES.filter((d) => {
            if (q && !(`${d.nom} ${d.emetteur} ${d.ticker ?? ''}`.toLowerCase().includes(q))) return false;
            if (ex && String(d.exercice) !== ex) return false;
            if (sec && d.secteur !== sec) return false;
            if (upcomingOnly && !this.isUpcoming(d)) return false;
            return true;
        });
    });

    readonly upcoming = computed(() => ENTRIES.filter((d) => this.isUpcoming(d))
        .sort((a, b) => (a.date_ex_dividende ?? '').localeCompare(b.date_ex_dividende ?? '')));

    /** Détachements à venir dont le ticker figure dans la grille du plan de l'utilisateur. */
    readonly upcomingInPlan = computed(() => {
        const weights = this.planSvc.plan().weights;
        return this.upcoming().filter((d) => d.ticker && d.ticker in weights);
    });

    readonly next = computed(() => this.upcoming()[0] ?? null);

    readonly undatedCount = computed(() => this.filtered().filter((d) => !d.date_ex_dividende).length);

    constructor() {
        applyChartDefaults();
        this.seo.apply({ title: PAGE_TITLE, description: PAGE_DESC, canonical: CANONICAL });
        effect(() => {
            this.filtered();
            this.layoutService.isDarkTheme();
            this.buildChart();
        });
    }

    isUpcoming(d: Detachement): boolean {
        return !!d.date_ex_dividende && d.date_ex_dividende >= this.todayIso;
    }

    dateLabel(iso: string | null): string {
        if (!iso) return 'À préciser';
        return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    montant(v: number): string {
        return Number.isInteger(v) ? fmtFCFAfull(v) : v.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
    }

    // ── Timeline (bubble chart) ──

    private buildChart(): void {
        if (!isPlatformBrowser(this.platformId)) return;
        const t = chartTheme(isDarkMode());
        const dated = this.filtered().filter((d) => d.date_ex_dividende && d.montant_net_fcfa != null);
        if (dated.length === 0) { this.chartData = { datasets: [] }; return; }

        // Axe X : mois fractionnaires depuis le 1er du premier mois de la fenêtre.
        const dates = dated.map((d) => d.date_ex_dividende!).sort();
        const [minY, minM] = dates[0].split('-').map(Number);
        const [maxY, maxM] = dates[dates.length - 1].split('-').map(Number);
        const monthCount = (maxY - minY) * 12 + (maxM - minM) + 1;
        const monthLabels = Array.from({ length: monthCount + 1 }, (_, i) => {
            const dt = new Date(minY, minM - 1 + i, 1);
            return dt.toLocaleDateString('fr-FR', { month: 'short', year: monthCount > 10 ? '2-digit' : undefined });
        });
        const xOf = (iso: string): number => {
            const [y, m, day] = iso.split('-').map(Number);
            const daysInMonth = new Date(y, m, 0).getDate();
            return (y - minY) * 12 + (m - minM) + (day - 1) / daysInMonth;
        };

        // Séries par secteur (ordre = fréquence décroissante, jamais de cycle : au-delà → "Autres").
        const freq = new Map<string, number>();
        for (const d of dated) freq.set(d.secteur ?? 'Autres', (freq.get(d.secteur ?? 'Autres') ?? 0) + 1);
        const order = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
        const mainSectors = order.slice(0, MAX_SECTOR_SERIES);
        const sectorOf = (d: Detachement) => {
            const s = d.secteur ?? 'Autres';
            return mainSectors.includes(s) ? s : 'Autres';
        };
        const seriesNames = [...new Set(dated.map(sectorOf))];

        this.chartData = {
            datasets: seriesNames.map((name, i) => ({
                label: name,
                data: dated.filter((d) => sectorOf(d) === name).map((d) => ({
                    x: xOf(d.date_ex_dividende!),
                    y: Math.max(0.5, d.montant_net_fcfa!),
                    r: 7,
                    meta: d,
                })),
                backgroundColor: t.categorical[i % t.categorical.length],
                borderColor: t.surface,
                borderWidth: 1.5,
                hoverRadius: 3,
            })),
        };
        this.chartOptions = {
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: t.textMuted, usePointStyle: true, boxWidth: 8, font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        title: () => '',
                        label: (ctx: any) => {
                            const d: Detachement = ctx.raw.meta;
                            return ` ${d.nom}${d.ticker ? ' (' + d.ticker + ')' : ''} · ${this.dateLabel(d.date_ex_dividende)} · ${this.montant(d.montant_net_fcfa!)} F net`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    min: -0.15,
                    max: monthCount + 0.15,
                    grid: { display: false },
                    ticks: {
                        stepSize: 1,
                        color: t.textMuted,
                        font: { size: 11 },
                        callback: (v: number) => Number.isInteger(v) ? (monthLabels[v] ?? '') : '',
                    },
                },
                y: {
                    type: 'logarithmic',
                    grid: { display: false },
                    border: { display: false },
                    title: { display: true, text: 'Net / action (F, échelle log)', color: t.textMuted, font: { size: 11 } },
                    ticks: {
                        color: t.textMuted,
                        font: { size: 11 },
                        callback: (v: number) => [1, 10, 100, 1000, 10000].includes(v) ? fmtFCFAfull(v) : '',
                    },
                },
            },
        };
    }
}
