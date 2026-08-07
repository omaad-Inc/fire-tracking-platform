import { ChangeDetectionStrategy, Component, OnDestroy, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
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

        <!-- ═══ COMMENT UTILISER CET OUTIL ═══ -->
        <section aria-label="Comment utiliser cet outil" class="mt-2 rounded-2xl border border-ochre-500/30 bg-ochre-500/[0.05] p-5 sm:p-6">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
                <h2 class="text-[16px] font-bold text-surface-900 dark:text-surface-0">Comment utiliser cet outil</h2>
                <span class="text-[12px] text-surface-500 dark:text-surface-400">4 étapes · 2 minutes pour démarrer</span>
            </div>
            <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                @for (s of guideSteps; track s.n) {
                    <button type="button" (click)="scrollToSection(s.anchor)"
                            class="group flex flex-col rounded-xl border border-surface-200 bg-surface-0 p-4 text-left transition-colors hover:border-ochre-400 dark:border-surface-600 dark:bg-surface-900">
                        <span class="flex h-7 w-7 items-center justify-center rounded-full bg-ochre-500 font-mono text-[13px] font-bold text-warm-900">{{ s.n }}</span>
                        <span class="mt-2.5 text-[14px] font-semibold text-surface-900 dark:text-surface-0">{{ s.title }}</span>
                        <span class="mt-1 flex-1 text-[12.5px] leading-relaxed text-surface-500 dark:text-surface-400">{{ s.desc }}</span>
                        <span class="mt-2.5 inline-flex items-center gap-1 text-[12px] font-medium text-ochre-600 group-hover:underline dark:text-ochre-400">
                            {{ s.cta }} <i class="pi pi-arrow-down text-[10px]" aria-hidden="true"></i></span>
                    </button>
                }
            </div>
            <p class="mt-4 text-[12.5px] leading-relaxed text-surface-500 dark:text-surface-400">
                Ensuite, deux compagnons de route : l'onglet
                <a routerLink="/outils/strategie-brvm/detachements" class="font-semibold text-ochre-600 hover:underline dark:text-ochre-400">Détachements</a>
                te dit quelle société verse un dividende et à quelle date, et le
                <a routerLink="/outils/strategie-brvm/simulateur" class="font-semibold text-ochre-600 hover:underline dark:text-ochre-400">Simulateur</a>
                projette où ton plan te mène dans 10, 15 ou 20 ans.
            </p>
        </section>

        <!-- ═══ LA MÉTHODE (template) ═══ -->
        <section id="methode" class="mt-6 scroll-mt-20 rounded-2xl border border-surface-200 bg-surface-50 p-6 dark:border-surface-700 dark:bg-surface-800 sm:p-8">
            <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <span class="rounded-full bg-ochre-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ochre-700 dark:text-ochre-400">Étape 1</span>
                <h2 class="text-lg font-bold text-surface-900 dark:text-surface-0">La méthode Core / Satellite, en 4 phases</h2>
            </div>
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
            <div id="parametres" class="mt-4 scroll-mt-20 rounded-2xl border border-surface-200 bg-surface-50 p-5 dark:border-surface-700 dark:bg-surface-800">
                <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                    <span class="rounded-full bg-ochre-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ochre-700 dark:text-ochre-400">Étape 2</span>
                    <h3 class="text-[15px] font-bold text-surface-900 dark:text-surface-0">Mes paramètres</h3>
                </div>
                <div class="mt-4 grid gap-4 sm:grid-cols-3">
                    <label class="block">
                        <span class="text-[12px] font-medium uppercase tracking-[0.06em] text-surface-500 dark:text-surface-400">DCA mensuel (FCFA)</span>
                        <input type="number" min="0" step="5000" [ngModel]="plan().dcaMonthly" (ngModelChange)="svc.update({ dcaMonthly: num($event) })"
                               class="mt-1.5 w-full rounded-xl border border-surface-200 bg-surface-0 px-3 py-2.5 text-[15px] tabular-nums text-surface-900 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-0">
                        <span class="mt-1.5 block text-[11.5px] leading-relaxed text-surface-400 dark:text-surface-500">Le montant que tu investis chaque mois, quel que soit le marché.</span>
                    </label>
                    <label class="block">
                        <span class="text-[12px] font-medium uppercase tracking-[0.06em] text-surface-500 dark:text-surface-400">Objectif net (FCFA/mois)</span>
                        <input type="number" min="0" step="25000" [ngModel]="plan().targetMonthlyIncome" (ngModelChange)="svc.update({ targetMonthlyIncome: num($event) })"
                               class="mt-1.5 w-full rounded-xl border border-surface-200 bg-surface-0 px-3 py-2.5 text-[15px] tabular-nums text-surface-900 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-0">
                        <span class="mt-1.5 block text-[11.5px] leading-relaxed text-surface-400 dark:text-surface-500">Le revenu de dividendes mensuel que tu vises, après impôt.</span>
                    </label>
                    <label class="block">
                        <span class="text-[12px] font-medium uppercase tracking-[0.06em] text-surface-500 dark:text-surface-400">IRVM (%)</span>
                        <input type="number" min="0" max="30" [ngModel]="plan().taxRatePct" (ngModelChange)="svc.update({ taxRatePct: num($event) })"
                               class="mt-1.5 w-full rounded-xl border border-surface-200 bg-surface-0 px-3 py-2.5 text-[15px] tabular-nums text-surface-900 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-0">
                        <span class="mt-1.5 block text-[11.5px] leading-relaxed text-surface-400 dark:text-surface-500">L'impôt retenu à la source sur les dividendes (15% par défaut en zone UEMOA).</span>
                    </label>
                </div>
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
                                <button type="button" (click)="svc.setWeight(w.ticker, 0)" aria-label="Retirer ce titre de la grille"
                                        class="rounded-md px-1.5 py-1 text-surface-400 transition-colors hover:bg-red-500/10 hover:text-red-600">
                                    <i class="pi pi-trash text-[12px]" aria-hidden="true"></i></button>
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

            <!-- Mes lignes (portefeuille actuel) -->
            <div id="lignes" class="mt-4 scroll-mt-20 rounded-2xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800 sm:p-5">
                <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                    <span class="rounded-full bg-ochre-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ochre-700 dark:text-ochre-400">Étape 3 · optionnelle</span>
                    <h3 class="text-[15px] font-bold text-surface-900 dark:text-surface-0">Mes lignes, ce que je possède déjà</h3>
                </div>
                <p class="mt-1 max-w-[72ch] text-[12.5px] leading-relaxed text-surface-500 dark:text-surface-400">
                    Recopie ici ton relevé SGI : pour chaque action que tu détiens, son code (ticker), le nombre
                    d'actions et ton prix d'achat moyen. L'outil compare alors ton allocation réelle à ta grille
                    cible et mesure ta progression vers ton objectif de dividendes. Si tu ne possèdes encore rien,
                    passe directement au calendrier d'exécution ci-dessous.
                </p>
                <form class="mt-3 grid grid-cols-2 items-end gap-2.5 sm:grid-cols-6" (ngSubmit)="addLine()">
                    <label class="block">
                        <span class="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.07em] text-surface-500 dark:text-surface-400">Titre (code)</span>
                        <input [(ngModel)]="formTicker" name="ticker" placeholder="SNTS" maxlength="6" required aria-label="Code du titre (ticker)"
                               list="brvm-tickers" autocomplete="off" autocapitalize="characters"
                               class="h-11 w-full rounded-lg border border-surface-200 bg-surface-0 px-2.5 font-mono text-base font-semibold uppercase text-surface-900 placeholder:font-normal placeholder:text-surface-300 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-0 sm:text-[13px]">
                    </label>
                    <label class="block">
                        <span class="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.07em] text-surface-500 dark:text-surface-400">Nb d'actions</span>
                        <input [(ngModel)]="formQty" name="qty" type="number" min="1" step="1" inputmode="numeric" placeholder="4" required aria-label="Nombre d'actions détenues"
                               class="h-11 w-full rounded-lg border border-surface-200 bg-surface-0 px-2.5 text-base tabular-nums text-surface-900 placeholder:text-surface-300 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-0 sm:text-[13px]">
                    </label>
                    <label class="block">
                        <span class="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.07em] text-surface-500 dark:text-surface-400">Prix d'achat moyen</span>
                        <div class="relative">
                            <input [(ngModel)]="formPru" name="pru" type="number" min="1" inputmode="numeric" placeholder="29 260" required aria-label="Prix d'achat moyen par action (PRU) en FCFA"
                                   class="h-11 w-full rounded-lg border border-surface-200 bg-surface-0 py-0 pl-2.5 pr-7 text-base tabular-nums text-surface-900 placeholder:text-surface-300 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-0 sm:text-[13px]">
                            <span class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-surface-400">F</span>
                        </div>
                    </label>
                    <label class="block">
                        <span class="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.07em] text-surface-500 dark:text-surface-400">Cours actuel <span class="normal-case">(opt.)</span></span>
                        <div class="relative">
                            <input [(ngModel)]="formPrix" name="prix" type="number" min="0" inputmode="numeric" placeholder="auto" aria-label="Cours actuel (optionnel, sinon référence datée)"
                                   class="h-11 w-full rounded-lg border border-surface-200 bg-surface-0 py-0 pl-2.5 pr-7 text-base tabular-nums text-surface-900 placeholder:text-surface-300 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-0 sm:text-[13px]">
                            <span class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-surface-400">F</span>
                        </div>
                    </label>
                    <label class="block">
                        <span class="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.07em] text-surface-500 dark:text-surface-400">Rendement <span class="normal-case">(opt.)</span></span>
                        <div class="relative">
                            <input [(ngModel)]="formYield" name="yield" type="number" min="0" max="20" step="0.01" inputmode="decimal" placeholder="auto" aria-label="Rendement dividende brut en % (optionnel, sinon référence datée)"
                                   class="h-11 w-full rounded-lg border border-surface-200 bg-surface-0 py-0 pl-2.5 pr-7 text-base tabular-nums text-surface-900 placeholder:text-surface-300 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-0 sm:text-[13px]">
                            <span class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-surface-400">%</span>
                        </div>
                    </label>
                    <button type="submit" [disabled]="!formTicker.trim() || !formQty || !formPru"
                            class="col-span-2 h-11 rounded-lg bg-ochre-500 text-[14px] font-semibold text-warm-900 transition-colors hover:bg-ochre-400 disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-1 sm:text-[13px]">
                        <i class="pi pi-plus mr-1 text-[11px]" aria-hidden="true"></i>Ajouter la ligne</button>
                </form>
                <p class="mt-2 text-[11.5px] text-surface-400 dark:text-surface-500">
                    Cours actuel et rendement sont facultatifs : sans saisie, l'outil utilise les valeurs de référence du {{ refDateLabel }} pour les titres connus.
                </p>
                @if (lines().length > 0) {
                    <div class="mt-4 overflow-x-auto">
                        <table class="w-full border-collapse text-[13px]">
                            <thead>
                                <tr class="border-b border-surface-200 text-left text-[11px] uppercase tracking-[0.06em] text-surface-500 dark:border-surface-600 dark:text-surface-400">
                                    <th class="py-2 pr-3 font-semibold">Titre</th>
                                    <th class="py-2 pr-3 text-right font-semibold">Nb d'actions</th>
                                    <th class="hidden py-2 pr-3 text-right font-semibold sm:table-cell">Prix d'achat moyen</th>
                                    <th class="hidden py-2 pr-3 text-right font-semibold sm:table-cell">Cours retenu</th>
                                    <th class="py-2 pr-3 text-right font-semibold">Valeur actuelle</th>
                                    <th class="hidden py-2 pr-3 text-right font-semibold sm:table-cell">Rendement</th>
                                    <th class="py-2 font-semibold"><span class="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (l of lines(); track l.ticker) {
                                    <tr class="border-b border-surface-200/60 dark:border-surface-700/60">
                                        <td class="py-2.5 pr-3"><span class="font-mono font-bold text-surface-900 dark:text-surface-0">{{ l.ticker }}</span>
                                            <span class="ml-2 hidden text-surface-500 dark:text-surface-400 sm:inline">{{ l.nom }}</span></td>
                                        <td class="py-2.5 pr-3 text-right tabular-nums">{{ l.qty }}</td>
                                        <td class="hidden py-2.5 pr-3 text-right tabular-nums sm:table-cell">{{ full(l.pru) }} F</td>
                                        <td class="hidden py-2.5 pr-3 text-right tabular-nums sm:table-cell">{{ full(l.prixEffectif) }} F</td>
                                        <td class="py-2.5 pr-3 text-right font-semibold tabular-nums text-surface-900 dark:text-surface-0">{{ full(l.valeur) }} F</td>
                                        <td class="hidden py-2.5 pr-3 text-right tabular-nums sm:table-cell">{{ l.yieldEffectif }}%</td>
                                        <td class="py-2.5 text-right">
                                            <button type="button" (click)="svc.removeLine(l.ticker)" aria-label="Supprimer la ligne"
                                                    class="flex h-10 w-10 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-red-500/10 hover:text-red-600">
                                                <i class="pi pi-trash text-[13px]" aria-hidden="true"></i></button>
                                        </td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                        <p class="mt-2 text-[11.5px] text-surface-400 dark:text-surface-500">
                            Cours retenu = ta saisie, sinon le cours de référence du {{ refDateLabel }}, sinon ton prix d'achat. Valeur actuelle = nb d'actions × cours retenu.
                        </p>
                    </div>
                }
            </div>

            <!-- Calendrier d'exécution (mobile-first : cartes par mois, cibles tactiles 44px) -->
            <div id="calendrier" class="mt-4 scroll-mt-20 rounded-2xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800 sm:p-5">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                            <span class="rounded-full bg-ochre-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ochre-700 dark:text-ochre-400">Étape 4</span>
                            <h3 class="text-[15px] font-bold text-surface-900 dark:text-surface-0">Calendrier d'exécution</h3>
                        </div>
                        <p class="mt-1 text-[12px] text-surface-500 dark:text-surface-400">
                            Mois par mois : ce que tu prévois d'acheter, pourquoi, et coche quand c'est exécuté. C'est le plan qui enlève l'émotion au moment de passer l'ordre.
                        </p>
                    </div>
                    <form class="flex items-stretch gap-2" (ngSubmit)="onAddMonth()">
                        <input type="month" [(ngModel)]="newMonthId" name="newMonth" required aria-label="Mois à planifier"
                               class="h-11 min-w-0 flex-1 rounded-xl border border-surface-200 bg-surface-0 px-3 text-base tabular-nums text-surface-900 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-0 sm:flex-none sm:text-[13px]">
                        <button type="submit" data-testid="add-month"
                                class="h-11 shrink-0 rounded-xl bg-ochre-500 px-4 text-[14px] font-semibold text-warm-900 transition-colors hover:bg-ochre-400 sm:text-[13px]">
                            <i class="pi pi-plus mr-1 text-[11px]" aria-hidden="true"></i>Ajouter</button>
                    </form>
                </div>

                <!-- Datalist partagée des tickers connus (référentiel + calendrier + lignes) -->
                <datalist id="brvm-tickers">
                    @for (t of knownTickers(); track t) { <option [value]="t"></option> }
                </datalist>

                @if (plan().months.length === 0) {
                    <p class="mt-4 rounded-xl border border-dashed border-surface-300 bg-surface-0 p-5 text-center text-[13px] text-surface-500 dark:border-surface-600 dark:bg-surface-900 dark:text-surface-400">
                        Aucun mois planifié. Ajoute ton premier mois et note tes achats prévus (ex. : SNTS 1 × 29 500).
                    </p>
                } @else {
                    <div class="mt-4 space-y-3">
                        @for (m of plan().months; track m.id) {
                            <div data-testid="month-row"
                                 class="rounded-xl border bg-surface-0 p-3.5 dark:bg-surface-900 sm:p-4"
                                 [class]="m.done ? 'border-emerald-500/30' : 'border-surface-200 dark:border-surface-600'">
                                <!-- En-tête du mois : coche · mois · total · suppression -->
                                <div class="flex items-center gap-3">
                                    <label class="flex h-11 w-11 shrink-0 -my-1.5 -ml-1.5 cursor-pointer items-center justify-center">
                                        <input type="checkbox" [checked]="m.done" (change)="svc.patchMonth(m.id, { done: !m.done })"
                                               [attr.aria-label]="'Mois ' + monthLabel(m.id) + ' exécuté'" data-testid="month-done"
                                               class="h-5 w-5 cursor-pointer accent-emerald-600">
                                    </label>
                                    <div class="min-w-0 flex-1">
                                        <div class="text-[15px] font-bold capitalize tabular-nums"
                                             [class]="m.done ? 'text-surface-400 line-through' : 'text-surface-900 dark:text-surface-0'">
                                            {{ monthLabel(m.id) }}</div>
                                        @if (m.done) { <div class="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Exécuté</div> }
                                    </div>
                                    <div class="text-right">
                                        <div data-testid="month-total" class="text-[15px] font-bold tabular-nums"
                                             [class]="monthTotal(m) > plan().dcaMonthly && plan().dcaMonthly > 0
                                                 ? 'text-amber-600 dark:text-amber-400'
                                                 : 'text-surface-900 dark:text-surface-0'">
                                            {{ monthTotal(m) > 0 ? full(monthTotal(m)) + ' F' : '—' }}</div>
                                        @if (monthTotal(m) > plan().dcaMonthly && plan().dcaMonthly > 0) {
                                            <div class="text-[10.5px] font-medium text-amber-600 dark:text-amber-400">dépasse le DCA</div>
                                        }
                                    </div>
                                    <button type="button" (click)="svc.removeMonth(m.id)" aria-label="Supprimer ce mois" data-testid="month-delete"
                                            class="flex h-11 w-11 shrink-0 -my-1.5 -mr-1.5 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-red-500/10 hover:text-red-600">
                                        <i class="pi pi-trash text-[14px]" aria-hidden="true"></i></button>
                                </div>

                                <!-- Achats du mois -->
                                @if (m.achats.length > 0) {
                                    <ul class="mt-3 space-y-1.5">
                                        @for (a of m.achats; track $index) {
                                            <li class="flex items-center gap-2.5 rounded-lg bg-surface-50 py-1.5 pl-3 pr-1 dark:bg-surface-800"
                                                [class]="m.done ? 'opacity-60' : ''">
                                                <span class="w-14 shrink-0 font-mono text-[13px] font-bold text-brand-700 dark:text-brand-300">{{ a.ticker }}</span>
                                                <span class="min-w-0 flex-1 text-[13px] tabular-nums text-surface-600 dark:text-surface-300">{{ a.qty }} × {{ full(a.prix) }} F</span>
                                                <span class="text-[13px] font-semibold tabular-nums text-surface-900 dark:text-surface-0">{{ full(a.qty * a.prix) }} F</span>
                                                <button type="button" (click)="svc.removeAchat(m.id, $index)" aria-label="Retirer cet achat"
                                                        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-red-500/10 hover:text-red-600">
                                                    <i class="pi pi-times text-[12px]" aria-hidden="true"></i></button>
                                            </li>
                                        }
                                    </ul>
                                }

                                <!-- Ajout d'un achat -->
                                @if (editingMonth() === m.id) {
                                    <form (ngSubmit)="commitAchat(m.id)" data-testid="achat-form"
                                          class="mt-3 rounded-xl border border-ochre-500/40 bg-ochre-500/[0.06] p-3">
                                        <div class="grid grid-cols-3 gap-2">
                                            <label class="block">
                                                <span class="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.07em] text-surface-500 dark:text-surface-400">Titre</span>
                                                <input [(ngModel)]="achatTicker" name="aTicker" placeholder="SNTS" maxlength="6" required
                                                       list="brvm-tickers" data-testid="achat-ticker" aria-label="Ticker" autocomplete="off" autocapitalize="characters"
                                                       class="h-11 w-full rounded-lg border border-surface-200 bg-surface-0 px-2.5 font-mono text-base font-semibold uppercase text-surface-900
                                                              placeholder:font-normal placeholder:text-surface-300 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-0 sm:text-[13px]">
                                            </label>
                                            <label class="block">
                                                <span class="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.07em] text-surface-500 dark:text-surface-400">Quantité</span>
                                                <input [(ngModel)]="achatQty" name="aQty" type="number" min="1" step="1" inputmode="numeric" placeholder="3" required
                                                       data-testid="achat-qty" aria-label="Quantité"
                                                       class="h-11 w-full rounded-lg border border-surface-200 bg-surface-0 px-2.5 text-base tabular-nums text-surface-900
                                                              placeholder:text-surface-300 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-0 sm:text-[13px]">
                                            </label>
                                            <label class="block">
                                                <span class="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.07em] text-surface-500 dark:text-surface-400">Prix unit.</span>
                                                <div class="relative">
                                                    <input [(ngModel)]="achatPrix" name="aPrix" type="number" min="1" step="5" inputmode="numeric" placeholder="29500" required
                                                           data-testid="achat-prix" aria-label="Prix unitaire en FCFA"
                                                           class="h-11 w-full rounded-lg border border-surface-200 bg-surface-0 py-0 pl-2.5 pr-7 text-base tabular-nums text-surface-900
                                                                  placeholder:text-surface-300 focus:border-ochre-500 focus:outline-none dark:border-surface-600 dark:bg-surface-900 dark:text-surface-0 sm:text-[13px]">
                                                    <span class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-surface-400">F</span>
                                                </div>
                                            </label>
                                        </div>
                                        <div class="mt-2.5 text-[13px] tabular-nums text-surface-500 dark:text-surface-400" data-testid="achat-subtotal">
                                            @if (draftTotal() > 0) {
                                                Sous-total : <strong class="text-surface-900 dark:text-surface-0">{{ full(draftTotal()) }} F</strong>
                                            } @else {
                                                Ticker, quantité et prix
                                            }
                                        </div>
                                        <!-- Actions en bas de carte, pleine largeur : accessibles au pouce -->
                                        <div class="mt-2.5 flex items-stretch gap-2">
                                            <button type="button" (click)="editingMonth.set(null)" aria-label="Fermer le formulaire"
                                                    class="h-11 shrink-0 rounded-lg px-3.5 text-[13px] font-medium text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-700 dark:hover:text-surface-0">
                                                Fermer</button>
                                            <button type="submit" [disabled]="draftTotal() <= 0"
                                                    class="h-11 flex-1 rounded-lg bg-ochre-500 text-[14px] font-semibold text-warm-900 transition-colors hover:bg-ochre-400 disabled:cursor-not-allowed disabled:opacity-40">
                                                <i class="pi pi-check mr-1 text-[11px]" aria-hidden="true"></i>Ajouter l'achat</button>
                                        </div>
                                    </form>
                                } @else {
                                    <button type="button" (click)="openAchatForm(m.id)"
                                            class="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-surface-300 text-[13px] font-medium text-surface-500 transition-colors hover:border-ochre-400 hover:text-ochre-600 dark:border-surface-600 dark:text-surface-400">
                                        <i class="pi pi-plus text-[11px]" aria-hidden="true"></i>Ajouter un achat</button>
                                }

                                <!-- Logique du mois (commit au blur : évite la réécriture à chaque frappe) -->
                                <input [value]="m.note" (change)="svc.patchMonth(m.id, { note: $any($event.target).value })"
                                       placeholder="Pourquoi ces achats ce mois-ci ?" aria-label="Logique du mois" data-testid="month-note"
                                       class="mt-3 h-11 w-full rounded-lg border border-transparent bg-surface-50 px-3 text-base italic text-surface-600
                                              placeholder:not-italic placeholder:text-surface-400 focus:border-ochre-500 focus:bg-surface-0 focus:outline-none dark:bg-surface-800 dark:text-surface-300 dark:focus:bg-surface-900 sm:text-[12.5px]">
                            </div>
                        }
                    </div>
                    <div class="mt-4 flex flex-col gap-1 border-t border-surface-200 pt-3 text-[13px] dark:border-surface-600 sm:flex-row sm:items-baseline sm:justify-between">
                        <div class="font-semibold tabular-nums text-surface-900 dark:text-surface-0">
                            Total planifié : {{ full(calendarTotal()) }} F</div>
                        @if (plan().dcaMonthly > 0) {
                            <div class="text-[12px] text-surface-500 dark:text-surface-400">
                                Budget DCA : {{ full(plan().dcaMonthly) }} F/mois · un total ambre dépasse le budget du mois</div>
                        }
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

            <!-- Pont V2 : réactiver au lancement officiel de la bêta Omaad.
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
            -->


            <p class="mt-6 text-[12px] leading-relaxed text-surface-400 dark:text-surface-500">{{ disclaimer }}</p>
        </section>
    `
})
export class StrategiePlanPage implements OnDestroy {
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

    /** Parcours guidé sous le hero : répond à « comment on utilise cet outil ? »
     *  au premier regard ; chaque étape scrolle vers sa section (badge assorti). */
    readonly guideSteps = [
        { n: 1, title: 'Choisis ta phase', desc: 'Selon ton capital actuel. La grille de poids cibles se pré-remplit avec le template de la méthode.', cta: 'Voir les phases', anchor: 'methode' },
        { n: 2, title: 'Règle tes chiffres', desc: "Ton investissement mensuel (DCA) et ton objectif de dividendes : l'outil calcule le capital requis.", cta: 'Mes paramètres', anchor: 'parametres' },
        { n: 3, title: 'Recopie ton relevé SGI', desc: 'Optionnel : tes actions déjà détenues, pour comparer ton allocation réelle à la grille cible.', cta: 'Mes lignes', anchor: 'lignes' },
        { n: 4, title: 'Planifie tes achats', desc: "Mois par mois : note ce que tu comptes acheter, puis coche quand c'est exécuté.", cta: 'Le calendrier', anchor: 'calendrier' },
    ] as const;

    scrollToSection(anchor: string): void {
        if (!isPlatformBrowser(this.platformId)) return;
        document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    readonly plan = this.svc.plan;
    readonly lines = this.svc.lineViews;
    readonly totalValue = this.svc.totalValue;

    readonly editingMonth = signal<string | null>(null);
    achatTicker = '';
    achatQty: number | null = null;
    achatPrix: number | null = null;

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
        this.seo.setJsonLd('jsonld-breadcrumb-strategie', {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Omaad', item: 'https://omaad.africa/fr/landing/' },
                { '@type': 'ListItem', position: 2, name: 'Outils', item: `${CANONICAL}/` },
                { '@type': 'ListItem', position: 3, name: 'Planificateur de stratégie BRVM', item: `${CANONICAL}/` }
            ]
        });
        effect(() => {
            this.lines();
            this.layoutService.isDarkTheme();
            this.buildDonut();
        });
    }

    ngOnDestroy(): void {
        this.seo.removeJsonLd('jsonld-breadcrumb-strategie');
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

    // ── Calendrier d'exécution ──

    newMonthId = this.svc.nextMonthSuggestion();

    readonly knownTickers = computed(() => {
        const fromLines = this.plan().lines.map((l) => l.ticker);
        const fromMonths = this.plan().months.flatMap((m) => m.achats.map((a) => a.ticker));
        return [...new Set([...TITRES.map((t) => t.ticker), ...fromLines, ...fromMonths])].sort();
    });

    onAddMonth(): void {
        if (!this.newMonthId) return;
        const id = this.svc.addMonth(this.newMonthId);
        this.newMonthId = this.svc.nextMonthSuggestion();
        this.openAchatForm(id);
    }

    openAchatForm(monthId: string): void {
        this.editingMonth.set(monthId);
        this.achatTicker = '';
        this.achatQty = this.achatPrix = null;
    }

    /** Sous-total en direct du formulaire d'achat (0 si saisie incomplète). */
    draftTotal(): number {
        if (!this.achatTicker.trim() || !this.achatQty || !this.achatPrix) return 0;
        return Math.round(this.achatQty) * Math.round(this.achatPrix);
    }

    commitAchat(monthId: string): void {
        const ticker = this.achatTicker.trim().toUpperCase();
        if (!ticker || !this.achatQty || !this.achatPrix) return;
        this.svc.addAchat(monthId, {
            ticker,
            qty: Math.max(1, Math.round(this.achatQty)),
            prix: Math.max(1, Math.round(this.achatPrix)),
        });
        this.achatTicker = '';
        this.achatQty = this.achatPrix = null;
    }

    monthLabel(id: string): string {
        const [y, m] = id.split('-').map(Number);
        return new Date(y, (m || 1) - 1, 1).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    }

    monthTotal(m: { achats: { qty: number; prix: number }[] }): number {
        return m.achats.reduce((s, a) => s + a.qty * a.prix, 0);
    }

    calendarTotal(): number {
        return this.plan().months.reduce((s, m) => s + this.monthTotal(m), 0);
    }

    num(v: unknown): number { return Math.max(0, Number(v) || 0); }
    abs(v: number): number { return Math.abs(v); }
    full(v: number): string { return fmtFCFAfull(v); }
    compact(v: number): string { return fmtFCFA(v); }
}
