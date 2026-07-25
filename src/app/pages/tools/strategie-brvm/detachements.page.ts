import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SeoService } from '../../../core/services/seo.service';
import { fmtFCFAfull } from './data/referentiel';
import calendrier from './data/detachements.json';

const PAGE_TITLE = 'Calendrier des dividendes BRVM : dates de détachement et de paiement | Omaad';
const PAGE_DESC =
    'Dates ex-dividende, dates de paiement et montants nets des dividendes BRVM, issus des avis officiels de la bourse. ' +
    'Mis à jour automatiquement, gratuit, sans inscription.';
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

@Component({
    selector: 'app-strategie-detachements-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule],
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

        <!-- Filtres -->
        <div class="mt-5 rounded-2xl border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800 sm:p-3.5">
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

    constructor() {
        this.seo.apply({ title: PAGE_TITLE, description: PAGE_DESC, canonical: CANONICAL });
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
}
