import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SgiStars } from './sgi-stars';
import { SgiCompareService } from '../compare.service';
import { Sgi, findFee, fmtPct } from '../sgi-data';

@Component({
    selector: 'app-sgi-card',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterModule, SgiStars],
    template: `
        <article class="group relative flex h-full flex-col rounded-2xl border p-5 shadow-card transition-transform duration-200 hover:-translate-y-1 hover:shadow-lifted
                        bg-surface-0 dark:bg-surface-800 border-surface-200 dark:border-surface-700"
                 [class.opacity-90]="!hasTarif()">

            @if (isCheapest()) {
                <div class="absolute -right-px top-4 flex items-center gap-1.5 rounded-l-lg bg-ochre-500 py-1.5 pl-2.5 pr-3 text-[11px] font-semibold text-white shadow-lifted">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>
                    Le moins cher
                </div>
            }

            <div class="mb-3.5 flex items-center justify-between gap-2.5">
                <span class="rounded-full border border-ochre-300 dark:border-ochre-700/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-ochre-600 dark:text-ochre-400">
                    {{ sgi().pays || '—' }}
                </span>
                <app-sgi-stars [note]="sgi().note" />
            </div>

            <a [routerLink]="['/outils/comparateur-sgi-brvm/sgi', sgi().id]"
               class="flex min-h-[50px] items-start text-[20px] font-bold leading-snug text-surface-900 dark:text-surface-0 transition-colors hover:text-ochre-600 dark:hover:text-ochre-400">
                {{ sgi().nom }}
            </a>

            @if (hasTarif()) {
                <div class="my-4 border-y border-surface-200 dark:border-surface-700 py-4">
                    <div class="mb-1 text-[10.5px] uppercase tracking-[0.16em] text-surface-500 dark:text-surface-400">Courtage / transaction</div>
                    <div class="text-[38px] font-extrabold leading-none tabular-nums text-brand-700 dark:text-surface-0">
                        {{ courtage() || '—' }}
                    </div>
                </div>
            } @else {
                <div class="my-4 flex min-h-[74px] items-center border-y border-surface-200 dark:border-surface-700 py-4">
                    <span class="text-sm italic text-surface-500 dark:text-surface-400">Tarifs non publiés ici</span>
                </div>
            }

            @if (hasTarif()) {
                <div class="mb-4 flex flex-col gap-2 text-[12.5px]">
                    @if (garde()) {
                        <div class="flex items-baseline justify-between gap-3">
                            <span class="flex-none text-surface-500 dark:text-surface-400">Droits de garde</span>
                            <span class="min-w-0 break-words text-right font-semibold text-surface-900 dark:text-surface-100">{{ garde() }}</span>
                        </div>
                    }
                    @if (tenue()) {
                        <div class="flex items-baseline justify-between gap-3">
                            <span class="text-surface-500 dark:text-surface-400">Tenue de compte</span>
                            <span class="text-right font-semibold text-surface-900 dark:text-surface-100">{{ tenue() }}</span>
                        </div>
                    }
                </div>
            }

            <div class="mb-4 flex flex-wrap gap-1.5">
                @if (sgi().tenue_gratuite === true) {
                    <span class="inline-flex items-center gap-1.5 rounded-md bg-positive/10 px-2.5 py-1 text-[11px] font-semibold text-positive">✓ Tenue gratuite</span>
                }
                @if (sgi().agrement) {
                    <span class="inline-flex items-center gap-1.5 rounded-md bg-surface-100 dark:bg-surface-700 px-2.5 py-1 text-[11px] font-semibold text-surface-700 dark:text-surface-200">Agréée AMF-UMOA</span>
                }
                @if (sgi().min_ouverture) {
                    <span class="inline-flex items-center gap-1.5 rounded-md bg-surface-100 dark:bg-surface-700 px-2.5 py-1 text-[11px] font-semibold text-surface-700 dark:text-surface-200">Dès {{ sgi().min_ouverture }}</span>
                }
            </div>

            <div class="mt-auto flex items-center justify-between gap-3 pt-1">
                <a [routerLink]="['/outils/comparateur-sgi-brvm/sgi', sgi().id]"
                   class="inline-flex items-center gap-1.5 py-1.5 text-sm font-semibold text-ochre-600 dark:text-ochre-400">
                    Voir la fiche
                    <span class="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
                </a>
                <label class="inline-flex items-center gap-2 text-[12.5px] text-surface-500 dark:text-surface-400"
                       [class.cursor-pointer]="hasTarif()" [class.cursor-not-allowed]="!hasTarif()" [class.opacity-40]="!hasTarif()">
                    <input type="checkbox" [checked]="compare.isSelected(sgi().id)" [disabled]="!hasTarif()"
                           (change)="compare.toggle(sgi().id)" class="h-4 w-4 accent-ochre-500" />
                    Comparer
                </label>
            </div>
        </article>
    `
})
export class SgiCard {
    compare = inject(SgiCompareService);

    sgi = input.required<Sgi>();
    cheapest = input<number | null>(null);

    hasTarif = computed(() => this.sgi().tarif_status === 'complet');
    isCheapest = computed(() => this.hasTarif() && this.cheapest() != null && this.sgi().courtage_pct === this.cheapest());
    courtage = computed(() => fmtPct(this.sgi().courtage_pct));
    garde = computed(() => findFee(this.sgi(), 'garde'));
    tenue = computed(() => findFee(this.sgi(), 'tenue de compte'));
}
