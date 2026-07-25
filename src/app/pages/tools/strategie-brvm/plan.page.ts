import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { SeoService } from '../../../core/services/seo.service';
import { chartTheme, isDarkMode, applyChartDefaults } from '../../../core/theme/chart-theme';
import { LayoutService } from '../../../layout/service/layout.service';
import { PlanService, PlanLine } from './plan.service';
import {
    DISCLAIMER, EXCLUSIONS_ETHIQUES, JALONS, MARCHE_REF_DATE, PHASES,
    REGLES_SATELLITE, TITRES, TITRE_MAP, fmtFCFA, fmtFCFAfull,
} from './data/referentiel';
import { computeDividendTargets } from './projections';

const PAGE_TITLE = 'Planificateur de stratégie BRVM : la méthode Core / Satellite (gratuit) | Omaad';
const PAGE_DESC =
    "Construis ton plan d'investissement BRVM : allocation Core / Satellite, DCA mensuel, règles écrites et objectifs de dividendes. " +
    'La méthode FIRE Africa, gratuite, sans inscription, sauvegardée sur ton appareil.';
const CANONICAL = 'https://omaad.africa/outils/strategie-brvm';

@Component({
    selector: 'app-strategie-plan-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, RouterModule, ChartModule],
    template: `
        <!-- ═══ HERO ═══ -->
        <header class="pb-4 pt-8 sm:pt-12">
            <div class="mb-5 inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.30em] text-ochre-600 dark:text-ochre-400">
                <span class="h-px w-8 bg-ochre-500"></span> Omaad, Outils
            </div>
            <h1 class="max-w-[20ch] text-[clamp(32px,5.5vw,58px)] font-bold leading-[1.05] tracking-tight text-surface-900 dark:text-surface-0">
                Ta stratégie BRVM, <em class="not-italic text-ochre-600 dark:text-ochre-400">écrite noir sur blanc</em>
            </h1>
            <p class="mt-5 max-w-[62ch] text-[clamp(15px,2.4vw,18px)] text-surface-600 dark:text-surface-300">
                Investir en bourse, ce n'est pas trouver LA bonne action. C'est avoir un plan : une allocation cible,
                un DCA régulier et des règles écrites qui enlèvent l'émotion. Copie la méthode Core / Satellite de la
                vidéo FIRE Africa, puis adapte-la : tout se passe ici, gratuitement, sans inscription.
            </p>
            <div class="mt-4 inline-flex items-center gap-2 text-[13px] font-medium text-surface-500 dark:text-surface-400">
                <i class="pi pi-lock text-sm" aria-hidden="true"></i> Ton plan est sauvegardé localement, sur cet appareil uniquement
            </div>
        </header>

        <!-- ═══ LA MÉTHODE (template) ═══ -->
        <section class="mt-6 rounded-2xl border border-surface-200 bg-surface-50 p-6 dark:border-surface-700 dark:bg-surface-800 sm:p-8">
            <h2 class="text-lg font-bold text-surface-900 dark:text-surface-0">La méthode Core / Satellite, en 4 phases</h2>
            <p class="mt-2 max-w-[70ch] text-[14px] leading-relaxed text-surface-600 dark:text-surface-300">
                Le cœur défensif porte le rendement et n'est jamais vendu (rééquilibrage par dilution) ; la poche
                satellite, plafonnée, saisit les fenêtres. Les phases ne font que doser le ratio entre les deux à
                mesure que le capital grandit. Filtre éthique de la méthode : {{ exclusions.join(' et ').toLowerCase() }} exclus,
                quel que soit le rendement.
            </p>
            <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                @for (ph of phases; track ph.phase) {
                    <button type="button" (click)="selectPhase(ph.phase)"
                            class="rounded-xl border p-4 text-left transition-colors"
                            [class]="plan().phase === ph.phase
                                ? 'border-ochre-500 bg-ochre-500/10'
                                : 'border-surface-200 bg-surface-0 hover:border-ochre-400 dark:border-surface-600 dark:bg-surface-900'">
                        <div class="text-[11px] font-semibold uppercase tracking-[0.08em]"
                             [class]="plan().phase === ph.phase ? 'text-ochre-600 dark:text-ochre-400' : 'text-surface-400'">
                            Phase {{ ph.phase }}</div>
                        <div class="mt-1 text-[14px] font-semibold text-surface-900 dark:text-surface-0">{{ ph.label.split('· ')[1] }}</div>
                        <div class="mt-2 text-[12px] tabular-nums text-surface-500 dark:text-surface-400">
                            {{ ph.capitalRange }} · cœur {{ ph.coreRatio }}% · satellite {{ ph.satelliteRatio }}%
                        </div>
                    </button>
                }
            </div>
            <p class="mt-4 text-[12px] text-surface-500 dark:text-surface-400">
                <i class="pi pi-info-circle mr-1" aria-hidden="true"></i>
                Sélectionner une phase pré-remplit ta grille de poids cibles avec le template de la méthode ; tu peux ensuite tout modifier.
            </p>
        </section>

        <!-- ═══ MON PLAN ═══ -->
        <section class="mt-8">
            <div class="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 class="text-lg font-bold text-surface-900 dark:text-surface-0">Mon plan</h2>
                    <p class="mt-1 text-[13px] text-surface-500 dark:text-surface-400">
                        Cours et yields de référence au {{ refDateLabel }} ; modifiables ligne par ligne.
                    </p>
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" (click)="exportPlan()"
                            class="rounded-lg border border-surface-200 px-3 py-2 text-[13px] font-medium text-surface-700 hover:border-ochre-400 dark:border-surface-600 dark:text-surface-200">
                        <i class="pi pi-download mr-1.5 text-[12px]" aria-hidden="true"></i>Exporter</button>
                    <label class="cursor-pointer rounded-lg border border-surface-200 px-3 py-2 text-[13px] font-medium text-surface-700 hover:border-ochre-400 dark:border-surface-600 dark:text-surface-200">
                        <i class="pi pi-upload mr-1.5 text-[12px]" aria-hidden="true"></i>Importer
                        <input type="file" accept="application/json" class="hidden" (change)="importPlan($event)">
                    </label>
                    <button type="button" (click)="resetPlan()"
                            class="rounded-lg border border-surface-200 px-3 py-2 text-[13px] font-medium text-surface-500 hover:border-red-400 hover:text-red-600 dark:border-surface-600">
                        Réinitialiser</button>
                </div>
            </div>
            @if (importError()) {
                <p class="mt-2 text-[13px] text-red-600 dark:text-red-400">{{ importError() }}</p>
            }

            <!-- Paramètres -->
            <div class="mt-4 grid gap-4 rounded-2xl border border-surface-200 bg-surface-50 p-5 dark:border-surface-700 dark:bg-surface-800 sm:grid-cols-3">
                <label class="block">
                    <span class="text-[12px] font-medium uppercase tracking-[0.06em] text-surface-500 dark:text-surface-400">DCA mensuel (FCFA)</span>
                    <input type="number" min="0" step="5000" [ngModel]="plan().dcaMonthly" (ngModelChange)="svc.update({ dcaMonthly: num($event) })"
                           class="mt-1.5 w-full rounded-xl border border-surface-200 bg-surface-0 px-3 py-2.5 text-[15px] tabular-nums text-surface-900 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-0">
                </label>
                <label class="block">
                    <span class="text-[12px] font-medium uppercase tracking-[0.06em] text-surface-500 dark:text-surface-400">Objectif net (FCFA/mois)</span>
                    <input type="number" min="0" step="25000" [ngModel]="plan().targetMonthlyIncome" (ngModelChange)="svc.update({ targetMonthlyIncome: num($event) })"
                           class="mt-1.5 w-full rounded-xl border border-surface-200 bg-surface-0 px-3 py-2.5 text-[15px] tabular-nums text-surface-900 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-0">
                </label>
                <label class="block">
                    <span class="text-[12px] font-medium uppercase tracking-[0.06em] text-surface-500 dark:text-surface-400">IRVM (%)</span>
                    <input type="number" min="0" max="30" [ngModel]="plan().taxRatePct" (ngModelChange)="svc.update({ taxRatePct: num($event) })"
                           class="mt-1.5 w-full rounded-xl border border-surface-200 bg-surface-0 px-3 py-2.5 text-[15px] tabular-nums text-surface-900 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-0">
                </label>
            </div>

            <!-- Jalon en cours -->
            @if (milestone(); as m) {
                <div class="mt-4 rounded-2xl border border-surface-200 bg-surface-50 p-5 dark:border-surface-700 dark:bg-surface-800 sm:p-6">
                    <div class="flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                            <span class="text-[12px] font-semibold uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-400">Objectif dividendes</span>
                            <div class="mt-1 text-2xl font-extrabold tabular-nums text-surface-900 dark:text-surface-0">
                                {{ full(plan().targetMonthlyIncome) }} <span class="text-sm font-medium text-surface-500">F net/mois</span>
                            </div>
                        </div>
                        <div class="text-right text-[13px] text-surface-500 dark:text-surface-400">
                            Capital requis ≈ <strong class="tabular-nums text-surface-900 dark:text-surface-0">{{ compact(m.requiredCapital) }} F</strong>
                            · yield net pondéré {{ m.weightedYieldNet }}%
                        </div>
                    </div>
                    <div class="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
                        <div class="h-full rounded-full bg-emerald-600 transition-all" [style.width.%]="m.progressPct"></div>
                    </div>
                    <div class="mt-2 flex flex-wrap justify-between gap-2 text-[12px] tabular-nums text-surface-500 dark:text-surface-400">
                        <span>Aujourd'hui : {{ compact(m.currentValue) }} F ({{ m.progressPct }}%)</span>
                        @if (plan().dcaMonthly > 0) {
                            <span>Au DCA actuel : ≈ {{ m.fullYears > 0 ? m.fullYears + ' an(s) ' : '' }}{{ m.remainingMonths }} mois restants</span>
                        }
                    </div>
                </div>
            }

            <div class="mt-4 grid gap-4 lg:grid-cols-2">
                <!-- Grille de poids cibles -->
                <div class="rounded-2xl border border-surface-200 bg-surface-50 p-5 dark:border-surface-700 dark:bg-surface-800">
                    <div class="flex items-baseline justify-between">
                        <h3 class="text-[15px] font-bold text-surface-900 dark:text-surface-0">Grille de poids cibles</h3>
                        <span class="text-[12px] tabular-nums" [class]="weightsTotal() === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">
                            Total {{ weightsTotal() }}%{{ weightsTotal() === 100 ? '' : ' (viser 100%)' }}</span>
                    </div>
                    <div class="mt-3 space-y-2">
                        @for (w of weightEntries(); track w.ticker) {
                            <div class="flex items-center gap-3">
                                <span class="w-14 shrink-0 rounded-md bg-brand-700/10 px-2 py-1 text-center font-mono text-[12px] font-bold text-brand-700 dark:bg-brand-300/10 dark:text-brand-300">{{ w.ticker }}</span>
                                <span class="min-w-0 flex-1 truncate text-[13px] text-surface-600 dark:text-surface-300">{{ w.nom }}</span>
                                <input type="number" min="0" max="100" [ngModel]="w.weight" (ngModelChange)="svc.setWeight(w.ticker, num($event))"
                                       aria-label="Poids cible" class="w-20 rounded-lg border border-surface-200 bg-surface-0 px-2 py-1.5 text-right text-[14px] tabular-nums text-surface-900 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-0">
                                <span class="w-4 text-[13px] text-surface-400">%</span>
                            </div>
                        }
                    </div>
                    <div class="mt-3 flex items-center gap-2">
                        <select [ngModel]="''" (ngModelChange)="addWeightTicker($event)" aria-label="Ajouter un titre à la grille"
                                class="rounded-lg border border-surface-200 bg-surface-0 px-2 py-1.5 text-[13px] text-surface-700 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-200">
                            <option value="" disabled>Ajouter un titre…</option>
                            @for (t of addableTickers(); track t.ticker) {
                                <option [value]="t.ticker">{{ t.ticker }} · {{ t.nom }}</option>
                            }
                        </select>
                    </div>
                </div>

                <!-- Allocation actuelle -->
                <div class="rounded-2xl border border-surface-200 bg-surface-50 p-5 dark:border-surface-700 dark:bg-surface-800">
                    <h3 class="text-[15px] font-bold text-surface-900 dark:text-surface-0">Allocation actuelle vs cibles</h3>
                    @if (lines().length === 0) {
                        <p class="mt-3 text-[13px] leading-relaxed text-surface-500 dark:text-surface-400">
                            Ajoute tes lignes ci-dessous pour voir ton allocation réelle face à ta grille cible.
                        </p>
                    } @else {
                        <div class="mx-auto mt-2 max-w-[240px]">
                            <p-chart type="doughnut" [data]="donutData" [options]="donutOptions" height="220px" />
                        </div>
                        <div class="mt-3 space-y-1.5">
                            @for (l of lines(); track l.ticker) {
                                <div class="flex items-center justify-between gap-2 border-b border-surface-200/60 pb-1.5 text-[13px] last:border-0 dark:border-surface-700/60">
                                    <span class="font-mono font-bold text-surface-900 dark:text-surface-0">{{ l.ticker }}</span>
                                    <span class="tabular-nums text-surface-500 dark:text-surface-400">{{ l.qty }} × {{ full(l.prixEffectif) }} F</span>
                                    <span class="tabular-nums font-semibold text-surface-900 dark:text-surface-0">{{ l.allocPct }}%
                                        <span class="font-normal text-surface-400">/ {{ l.ciblePct }}%</span></span>
                                    <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
                                          [class]="abs(l.ecartPp) > 5 ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'">
                                        {{ l.ecartPp >= 0 ? '+' : '' }}{{ l.ecartPp }}pp</span>
                                </div>
                            }
                            <div class="flex justify-between pt-1 text-[13px] font-semibold tabular-nums text-surface-900 dark:text-surface-0">
                                <span>Total</span><span>{{ full(totalValue()) }} F</span>
                            </div>
                        </div>
                    }
                </div>
            </div>

            <!-- Mes lignes (CRUD) -->
            <div class="mt-4 rounded-2xl border border-surface-200 bg-surface-50 p-5 dark:border-surface-700 dark:bg-surface-800">
                <h3 class="text-[15px] font-bold text-surface-900 dark:text-surface-0">Mes lignes</h3>
                <p class="mt-1 text-[12px] text-surface-500 dark:text-surface-400">Ticker, quantité et prix de revient unitaire ; cours/yield optionnels (sinon référence du {{ refDateLabel }}).</p>
                <form class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6" (ngSubmit)="addLine()">
                    <input [(ngModel)]="formTicker" name="ticker" placeholder="Ticker" maxlength="6" required aria-label="Ticker"
                           class="rounded-lg border border-surface-200 bg-surface-0 px-2.5 py-2 font-mono text-[13px] uppercase text-surface-900 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-0">
                    <input [(ngModel)]="formQty" name="qty" type="number" min="1" placeholder="Quantité" required aria-label="Quantité"
                           class="rounded-lg border border-surface-200 bg-surface-0 px-2.5 py-2 text-[13px] tabular-nums text-surface-900 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-0">
                    <input [(ngModel)]="formPru" name="pru" type="number" min="1" placeholder="PRU (F)" required aria-label="Prix de revient unitaire"
                           class="rounded-lg border border-surface-200 bg-surface-0 px-2.5 py-2 text-[13px] tabular-nums text-surface-900 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-0">
                    <input [(ngModel)]="formPrix" name="prix" type="number" min="0" placeholder="Cours (opt.)" aria-label="Cours actuel (optionnel)"
                           class="rounded-lg border border-surface-200 bg-surface-0 px-2.5 py-2 text-[13px] tabular-nums text-surface-900 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-0">
                    <input [(ngModel)]="formYield" name="yield" type="number" min="0" max="20" step="0.01" placeholder="Yield % (opt.)" aria-label="Yield brut (optionnel)"
                           class="rounded-lg border border-surface-200 bg-surface-0 px-2.5 py-2 text-[13px] tabular-nums text-surface-900 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-0">
                    <button type="submit"
                            class="rounded-lg bg-ochre-500 px-3 py-2 text-[13px] font-semibold text-warm-900 transition-colors hover:bg-ochre-400">
                        <i class="pi pi-plus mr-1 text-[11px]" aria-hidden="true"></i>Ajouter</button>
                </form>
                @if (lines().length > 0) {
                    <div class="mt-4 overflow-x-auto">
                        <table class="w-full min-w-[560px] border-collapse text-[13px]">
                            <thead>
                                <tr class="border-b border-surface-200 text-left text-[11px] uppercase tracking-[0.06em] text-surface-500 dark:border-surface-600 dark:text-surface-400">
                                    <th class="py-2 pr-3 font-semibold">Ticker</th>
                                    <th class="py-2 pr-3 font-semibold">Qté</th>
                                    <th class="py-2 pr-3 text-right font-semibold">PRU</th>
                                    <th class="py-2 pr-3 text-right font-semibold">Cours retenu</th>
                                    <th class="py-2 pr-3 text-right font-semibold">Valeur</th>
                                    <th class="py-2 pr-3 text-right font-semibold">Yield</th>
                                    <th class="py-2 font-semibold"><span class="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (l of lines(); track l.ticker) {
                                    <tr class="border-b border-surface-200/60 dark:border-surface-700/60">
                                        <td class="py-2.5 pr-3"><span class="font-mono font-bold text-surface-900 dark:text-surface-0">{{ l.ticker }}</span>
                                            <span class="ml-2 hidden text-surface-500 dark:text-surface-400 sm:inline">{{ l.nom }}</span></td>
                                        <td class="py-2.5 pr-3 tabular-nums">{{ l.qty }}</td>
                                        <td class="py-2.5 pr-3 text-right tabular-nums">{{ full(l.pru) }} F</td>
                                        <td class="py-2.5 pr-3 text-right tabular-nums">{{ full(l.prixEffectif) }} F</td>
                                        <td class="py-2.5 pr-3 text-right font-semibold tabular-nums text-surface-900 dark:text-surface-0">{{ full(l.valeur) }} F</td>
                                        <td class="py-2.5 pr-3 text-right tabular-nums">{{ l.yieldEffectif }}%</td>
                                        <td class="py-2.5 text-right">
                                            <button type="button" (click)="svc.removeLine(l.ticker)" aria-label="Supprimer la ligne"
                                                    class="rounded-md px-2 py-1 text-surface-400 transition-colors hover:bg-red-500/10 hover:text-red-600">
                                                <i class="pi pi-trash text-[13px]" aria-hidden="true"></i></button>
                                        </td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                }
            </div>

            <!-- Règles écrites -->
            <div class="mt-4 grid gap-4 lg:grid-cols-2">
                <div class="rounded-2xl border border-surface-200 bg-surface-50 p-5 dark:border-surface-700 dark:bg-surface-800">
                    <h3 class="text-[15px] font-bold text-surface-900 dark:text-surface-0">Mes règles écrites</h3>
                    <p class="mt-1 text-[12px] text-surface-500 dark:text-surface-400">
                        Le cœur de la méthode : décider à froid, exécuter à chaud. Écris tes règles avant d'en avoir besoin.
                    </p>
                    <form class="mt-3 flex gap-2" (ngSubmit)="addRule()">
                        <input [(ngModel)]="formRule" name="rule" placeholder="Ex. : je n'achète jamais après un rallye de +20%"
                               aria-label="Nouvelle règle"
                               class="min-w-0 flex-1 rounded-lg border border-surface-200 bg-surface-0 px-3 py-2 text-[13px] text-surface-900 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-0">
                        <button type="submit" class="rounded-lg bg-ochre-500 px-3 py-2 text-[13px] font-semibold text-warm-900 hover:bg-ochre-400">Ajouter</button>
                    </form>
                    @if (plan().rules.length > 0) {
                        <ol class="mt-3 space-y-2">
                            @for (r of plan().rules; track $index) {
                                <li class="flex items-start gap-2.5 text-[13px] text-surface-700 dark:text-surface-200">
                                    <span class="mt-0.5 shrink-0 font-mono text-[11px] font-bold text-ochre-600 dark:text-ochre-400">{{ ($index + 1) < 10 ? '0' + ($index + 1) : $index + 1 }}</span>
                                    <span class="min-w-0 flex-1">{{ r }}</span>
                                    <button type="button" (click)="svc.removeRule($index)" aria-label="Supprimer la règle"
                                            class="shrink-0 rounded-md px-1.5 text-surface-400 hover:text-red-600"><i class="pi pi-times text-[11px]" aria-hidden="true"></i></button>
                                </li>
                            }
                        </ol>
                    }
                    <div class="mt-4 rounded-xl border border-surface-200 bg-surface-0 p-3.5 text-[12px] leading-relaxed text-surface-500 dark:border-surface-600 dark:bg-surface-900 dark:text-surface-400">
                        <strong class="text-surface-700 dark:text-surface-200">Règles satellites de la méthode :</strong>
                        max {{ reglesSatellite.maxParLigne }}% par ligne · {{ reglesSatellite.maxSimultanes }} satellites simultanés max.
                        Entrée : {{ reglesSatellite.entree }} Sortie (écrite avant l'achat) : {{ reglesSatellite.sortie.join(' · ') }}.
                    </div>
                </div>

                <!-- Jalons -->
                <div class="rounded-2xl border border-surface-200 bg-surface-50 p-5 dark:border-surface-700 dark:bg-surface-800">
                    <h3 class="text-[15px] font-bold text-surface-900 dark:text-surface-0">L'échelle des jalons</h3>
                    <p class="mt-1 text-[12px] text-surface-500 dark:text-surface-400">Capital indicatif au yield net pondéré de ta grille ({{ milestone()?.weightedYieldNet }}%).</p>
                    <div class="mt-3 space-y-2.5">
                        @for (j of jalonViews(); track j.cible) {
                            <div class="flex items-center justify-between rounded-xl border p-3.5"
                                 [class]="j.cible === plan().targetMonthlyIncome
                                     ? 'border-emerald-500/40 bg-emerald-500/10'
                                     : 'border-surface-200 bg-surface-0 dark:border-surface-600 dark:bg-surface-900'">
                                <div>
                                    <div class="text-[14px] font-bold tabular-nums text-surface-900 dark:text-surface-0">{{ full(j.cible) }} F/mois</div>
                                    <div class="text-[12px] text-surface-500 dark:text-surface-400">{{ j.note }}</div>
                                </div>
                                <button type="button" (click)="svc.update({ targetMonthlyIncome: j.cible })"
                                        class="shrink-0 text-right text-[12px] tabular-nums text-surface-500 hover:text-ochre-600 dark:text-surface-400 dark:hover:text-ochre-400">
                                    ≈ {{ compact(j.capital) }} F<br><span class="text-[11px] underline decoration-dotted">choisir</span>
                                </button>
                            </div>
                        }
                    </div>
                </div>
            </div>

            <!-- Pont V2 -->
            <div class="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl bg-brand-900 p-6 sm:flex-row sm:items-center sm:p-7">
                <div>
                    <h3 class="text-[16px] font-bold text-white">Suivre ce plan avec ton portefeuille réel ?</h3>
                    <p class="mt-1 max-w-[52ch] text-[13px] leading-relaxed text-brand-200">
                        Ton plan vit sur cet appareil. Avec un compte Omaad gratuit, tu suis ton patrimoine complet
                        (actions, épargne, objectifs) et ton chemin vers l'indépendance financière.
                    </p>
                </div>
                <a routerLink="/fr/auth/register"
                   class="shrink-0 rounded-xl bg-ochre-500 px-5 py-3 text-[14px] font-semibold text-warm-900 transition-colors hover:bg-ochre-400">
                    Créer mon compte gratuit</a>
            </div>

            <p class="mt-6 text-[12px] leading-relaxed text-surface-400 dark:text-surface-500">{{ disclaimer }}</p>
        </section>
    `
})
export class StrategiePlanPage {
    private seo = inject(SeoService);
    private platformId = inject(PLATFORM_ID);
    readonly layoutService = inject(LayoutService);
    readonly svc = inject(PlanService);

    readonly phases = PHASES;
    readonly jalons = JALONS;
    readonly reglesSatellite = REGLES_SATELLITE;
    readonly exclusions = EXCLUSIONS_ETHIQUES;
    readonly disclaimer = DISCLAIMER;
    readonly refDateLabel = new Date(MARCHE_REF_DATE + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    readonly plan = this.svc.plan;
    readonly lines = this.svc.lineViews;
    readonly totalValue = this.svc.totalValue;

    formTicker = '';
    formQty: number | null = null;
    formPru: number | null = null;
    formPrix: number | null = null;
    formYield: number | null = null;
    formRule = '';
    importError = signal<string | null>(null);

    donutData: any = null;
    donutOptions: any = null;

    readonly weightEntries = computed(() =>
        Object.entries(this.plan().weights)
            .map(([ticker, weight]) => ({ ticker, weight, nom: TITRE_MAP[ticker]?.nom ?? ticker }))
            .sort((a, b) => b.weight - a.weight));

    readonly weightsTotal = computed(() => Object.values(this.plan().weights).reduce((s, w) => s + w, 0));

    readonly addableTickers = computed(() => TITRES.filter((t) => !(t.ticker in this.plan().weights)));

    readonly milestone = computed(() => {
        const p = this.plan();
        const stocks = this.stocksForEngine();
        const res = computeDividendTargets({
            targets: [p.targetMonthlyIncome * 12],
            stocks,
            phaseWeights: p.weights,
            currentHoldings: p.lines.map((l) => ({ ticker: l.ticker, qty: l.qty })),
            taxRate: p.taxRatePct,
            dcaMonthly: p.dcaMonthly,
        });
        return res[0] ?? null;
    });

    readonly jalonViews = computed(() => {
        const yNet = (this.milestone()?.weightedYieldNet ?? 0) / 100;
        return JALONS.map((j) => ({ ...j, capital: yNet > 0 ? Math.round((j.cible * 12) / yNet) : 0 }));
    });

    constructor() {
        applyChartDefaults();
        this.seo.apply({ title: PAGE_TITLE, description: PAGE_DESC, canonical: CANONICAL });
        effect(() => {
            this.lines();
            this.layoutService.isDarkTheme();
            this.buildDonut();
        });
    }

    private stocksForEngine() {
        const p = this.plan();
        const tickers = new Set([...Object.keys(p.weights), ...p.lines.map((l) => l.ticker)]);
        return [...tickers].map((ticker) => {
            const line = p.lines.find((l) => l.ticker === ticker);
            const ref = TITRE_MAP[ticker];
            return {
                ticker,
                nom: ref?.nom ?? line?.nom ?? ticker,
                prix: line?.prix ?? ref?.prixRef ?? line?.pru ?? 0,
                yieldPct: line?.yieldPct ?? ref?.yieldRef ?? 0,
            };
        }).filter((s) => s.prix > 0);
    }

    private buildDonut(): void {
        if (!isPlatformBrowser(this.platformId)) return;
        const lines = this.lines();
        if (lines.length === 0) { this.donutData = null; return; }
        const t = chartTheme(isDarkMode());
        this.donutData = {
            labels: lines.map((l) => l.ticker),
            datasets: [{
                data: lines.map((l) => l.allocPct),
                backgroundColor: lines.map((_, i) => t.categorical[i % t.categorical.length]),
                borderColor: t.surface,
                borderWidth: 2,
            }],
        };
        this.donutOptions = {
            plugins: {
                legend: { position: 'bottom', labels: { color: t.textMuted, usePointStyle: true, boxWidth: 8, font: { size: 11 } } },
                tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.label} : ${ctx.parsed}%` } },
            },
            cutout: '62%',
            maintainAspectRatio: false,
        };
    }

    selectPhase(phase: number): void {
        this.svc.applyPhaseTemplate(phase);
    }

    addWeightTicker(ticker: string): void {
        if (!ticker) return;
        this.svc.setWeight(ticker, 5);
    }

    addLine(): void {
        const ticker = this.formTicker.trim().toUpperCase();
        if (!ticker || !this.formQty || !this.formPru) return;
        const line: PlanLine = {
            ticker,
            nom: TITRE_MAP[ticker]?.nom ?? ticker,
            qty: Math.max(1, Math.round(this.formQty)),
            pru: Math.max(1, Math.round(this.formPru)),
            prix: this.formPrix ? Math.round(this.formPrix) : null,
            yieldPct: this.formYield ?? null,
        };
        this.svc.upsertLine(line);
        this.formTicker = '';
        this.formQty = this.formPru = this.formPrix = this.formYield = null;
    }

    addRule(): void {
        this.svc.addRule(this.formRule);
        this.formRule = '';
    }

    resetPlan(): void {
        if (typeof window !== 'undefined' && !window.confirm('Réinitialiser ton plan ? Cette action efface tes lignes et règles sur cet appareil.')) return;
        this.svc.reset();
    }

    exportPlan(): void {
        if (!isPlatformBrowser(this.platformId)) return;
        const blob = new Blob([this.svc.exportJson()], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'omaad-plan-brvm.json';
        a.click();
        URL.revokeObjectURL(a.href);
    }

    importPlan(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        file.text().then((raw) => {
            this.importError.set(this.svc.importJson(raw));
            input.value = '';
        });
    }

    num(v: unknown): number { return Math.max(0, Number(v) || 0); }
    abs(v: number): number { return Math.abs(v); }
    full(v: number): string { return fmtFCFAfull(v); }
    compact(v: number): string { return fmtFCFA(v); }
}
