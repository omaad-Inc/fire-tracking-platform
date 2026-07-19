import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { SeoService } from '../../../core/services/seo.service';
import { SgiStars } from './components/sgi-stars';
import { SgiComparePanel } from './components/compare-panel';
import { SgiToolTopbar } from './components/tool-topbar';
import { SgiCompareService } from './compare.service';
import { PDF_BASE, SGIS, Sgi, fmtPct, getById, isFree } from './sgi-data';

@Component({
    selector: 'app-sgi-detail',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterModule, SgiStars, SgiComparePanel, SgiToolTopbar],
    template: `
        <div class="min-h-screen bg-surface-0 dark:bg-surface-900">
            <app-sgi-tool-topbar />

            <main class="mx-auto max-w-[900px] px-5 py-8 sm:px-6 sm:py-12">
                <a routerLink="/outils/comparateur-sgi-brvm"
                   class="mb-6 inline-flex items-center gap-2 text-sm text-surface-500 transition-colors hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-100">
                    <i class="pi pi-arrow-left text-xs" aria-hidden="true"></i> Toutes les SGI
                </a>

                @if (sgi(); as s) {
                    <!-- HERO BAND -->
                    <div class="relative overflow-hidden rounded-3xl border border-brand-600 p-7 sm:p-10"
                         style="background: radial-gradient(700px 360px at 90% -30%, rgba(199,123,60,0.22), transparent 60%), linear-gradient(160deg,#1b2a4a,#13203a)">
                        <div class="mb-4 flex flex-wrap items-center gap-3">
                            <span class="rounded-full border border-ochre-400/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-ochre-300">
                                {{ s.pays || '—' }}
                            </span>
                            <app-sgi-stars [note]="s.note" />
                        </div>
                        <h1 class="max-w-[20ch] text-[clamp(28px,5vw,46px)] font-bold leading-[1.08] text-white">{{ s.nom }}</h1>
                        <div class="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-[13.5px] text-surface-300">
                            @if (s.agrement) {
                                <span class="inline-flex items-center gap-2"><i class="pi pi-verified text-ochre-400" aria-hidden="true"></i> {{ s.agrement }}</span>
                            }
                            @if (s.decision) {
                                <span class="inline-flex items-center gap-2"><i class="pi pi-file-check text-ochre-400" aria-hidden="true"></i> {{ s.decision }}</span>
                            }
                            @if (s.min_ouverture) {
                                <span class="inline-flex items-center gap-2"><i class="pi pi-wallet text-ochre-400" aria-hidden="true"></i>
                                    Ouverture dès {{ s.min_ouverture }}{{ s.frais_ouverture ? ' (frais ' + s.frais_ouverture + ')' : '' }}
                                </span>
                            }
                        </div>
                        @if (hasTarif()) {
                            <div class="mt-7 inline-flex items-baseline gap-3 rounded-2xl border border-white/15 bg-white/10 px-6 py-4 backdrop-blur">
                                <div>
                                    <div class="text-[10.5px] uppercase tracking-[0.16em] text-surface-300">Courtage / transaction</div>
                                    <div class="text-[42px] font-extrabold leading-none tabular-nums text-white">{{ courtage() }}</div>
                                </div>
                            </div>
                        }
                    </div>

                    @if (s.note_extra) {
                        <p class="mt-6 rounded-2xl border-l-[3px] border-ochre-500 bg-ochre-50 dark:bg-ochre-700/10 px-5 py-4 text-[14px] text-surface-700 dark:text-surface-200">
                            ℹ️ {{ s.note_extra }}
                        </p>
                    }

                    <!-- FEES -->
                    @if (hasTarif()) {
                        <div class="mt-6 overflow-hidden rounded-3xl border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-800 shadow-card">
                            <div class="border-b border-surface-200 dark:border-surface-700 px-6 py-5 sm:px-8">
                                <h2 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Grille tarifaire homologuée</h2>
                                <p class="mt-1 text-[12.5px] text-surface-500 dark:text-surface-400">Plafonds AMF-UMOA (ex-CREPMF). Certains tarifs sont négociables.</p>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full min-w-[480px] border-collapse text-[13.5px]">
                                    <thead>
                                        <tr class="text-left text-[10.5px] uppercase tracking-[0.08em] text-surface-500 dark:text-surface-400">
                                            <th class="px-6 py-3 sm:px-8">Rubrique</th>
                                            <th class="px-4 py-3">Base de calcul</th>
                                            <th class="px-6 py-3 text-right sm:px-8">Tarif</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @for (f of s.fees; track $index) {
                                            <tr class="border-t border-surface-100 dark:border-surface-700">
                                                <td class="px-6 py-3.5 font-semibold text-surface-900 dark:text-surface-0 sm:px-8">{{ f.label }}</td>
                                                <td class="px-4 py-3.5 text-[12px] text-surface-500 dark:text-surface-400">{{ f.base }}</td>
                                                <td class="px-6 py-3.5 text-right font-semibold sm:px-8"
                                                    [class]="free(f.value) ? 'text-positive' : 'text-surface-900 dark:text-surface-0'">{{ f.value }}</td>
                                            </tr>
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    } @else {
                        <div class="mt-6 rounded-3xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 p-8 text-center text-surface-500 dark:text-surface-400 shadow-card">
                            Grille tarifaire non disponible dans nos sources pour cette SGI.
                        </div>
                    }

                    <!-- ACTIONS -->
                    <div class="mt-6 flex flex-wrap gap-3">
                        @if (s.source_pdf) {
                            <a [href]="pdfHref()" target="_blank" rel="noreferrer"
                               class="inline-flex items-center gap-2.5 rounded-xl bg-brand-700 px-5 py-3.5 text-[13.5px] font-medium text-white transition-colors hover:bg-brand-600">
                                <i class="pi pi-file-pdf text-ochre-300" aria-hidden="true"></i> Voir la grille officielle (PDF)
                            </a>
                        }
                        @if (hasTarif()) {
                            <button type="button" (click)="compare.toggle(s.id)"
                                    class="inline-flex items-center gap-2.5 rounded-xl px-5 py-3.5 text-[13.5px] font-semibold transition-colors"
                                    [class]="compare.isSelected(s.id)
                                        ? 'bg-positive/15 text-positive'
                                        : 'border border-ochre-500 text-ochre-600 dark:text-ochre-400 hover:bg-ochre-50 dark:hover:bg-ochre-700/10'">
                                {{ compare.isSelected(s.id) ? '✓ Ajoutée au comparateur' : 'Ajouter au comparateur' }}
                            </button>
                        }
                    </div>

                    <!-- RELATED -->
                    @if (related().length > 0) {
                        <section class="mt-12">
                            <h2 class="mb-4 text-xl font-bold text-surface-900 dark:text-surface-0">Autres SGI — {{ s.pays }}</h2>
                            <div class="flex flex-wrap gap-3">
                                @for (r of related(); track r.id) {
                                    <a [routerLink]="['/outils/comparateur-sgi-brvm/sgi', r.id]"
                                       class="group flex items-center gap-3 rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 px-4 py-3 transition-colors hover:border-ochre-400">
                                        <span class="text-[14px] font-medium text-surface-800 dark:text-surface-100 group-hover:text-ochre-600 dark:group-hover:text-ochre-400">{{ r.nom }}</span>
                                        <span class="rounded-md bg-surface-100 dark:bg-surface-700 px-2 py-0.5 text-[12px] font-semibold tabular-nums text-ochre-600 dark:text-ochre-300">{{ pct(r) }}</span>
                                    </a>
                                }
                            </div>
                        </section>
                    }

                    <p class="mt-10 text-[11.5px] leading-relaxed text-surface-500 dark:text-surface-400">
                        Tarifs = plafonds homologués (souvent négociables). Vérifie toujours la grille à jour auprès de la SGI.
                        Contenu informatif, pas un conseil en investissement.
                    </p>
                } @else {
                    <p class="py-20 text-center text-surface-500 dark:text-surface-400">
                        SGI introuvable.
                        <a routerLink="/outils/comparateur-sgi-brvm" class="text-ochre-600 underline dark:text-ochre-400">Retour au comparateur</a>
                    </p>
                }
            </main>

            <app-sgi-compare-panel />
        </div>
    `
})
export class SgiDetailPage {
    private seo = inject(SeoService);
    private route = inject(ActivatedRoute);
    compare = inject(SgiCompareService);

    private id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id') ?? '')), { initialValue: this.route.snapshot.paramMap.get('id') ?? '' });

    sgi = computed<Sgi | undefined>(() => getById(this.id()));
    hasTarif = computed(() => this.sgi()?.tarif_status === 'complet');
    courtage = computed(() => fmtPct(this.sgi()?.courtage_pct ?? null));
    pdfHref = computed(() => PDF_BASE + encodeURIComponent(this.sgi()?.source_pdf ?? ''));
    related = computed<Sgi[]>(() => {
        const s = this.sgi();
        if (!s) return [];
        return SGIS.filter((x) => x.pays === s.pays && x.id !== s.id && x.tarif_status === 'complet').slice(0, 4);
    });

    constructor() {
        // SEO par fiche — l'effect se rejoue quand on navigue de fiche en fiche
        // (les liens « Autres SGI » réutilisent la même instance de composant).
        effect(() => {
            const s = this.sgi();
            if (!s) return;
            const courtage = fmtPct(s.courtage_pct);
            this.seo.apply({
                title: `${s.nom} — frais et tarifs SGI BRVM (${s.pays}) | Omaad`,
                description:
                    s.tarif_status === 'complet'
                        ? `Grille tarifaire officielle de ${s.nom} (SGI, ${s.pays}) : courtage ${courtage}, droits de garde, tenue de compte. Comparez avec les 41 SGI de la BRVM.`
                        : `${s.nom} (SGI agréée AMF-UMOA, ${s.pays}) : agrément, informations de base et comparaison avec les 41 SGI de la BRVM.`,
                canonical: `https://omaad.africa/outils/comparateur-sgi-brvm/sgi/${s.id}`,
                image: 'https://omaad.africa/og/comparateur-sgi-og-1200x630.png'
            });
        });
    }

    pct(s: Sgi): string | null {
        return fmtPct(s.courtage_pct);
    }

    free(v: string): boolean {
        return isFree(v);
    }
}
