import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { SgiCompareService } from '../compare.service';
import { COMPARE_ROWS, Sgi, findFee, isFree } from '../sgi-data';

/**
 * Barre flottante (dès 2 SGI sélectionnées) + tableau comparatif en dialog, * équivalent des CompareBar/CompareModal de l'app React d'origine.
 */
@Component({
    selector: 'app-sgi-compare-panel',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DialogModule],
    template: `
        @if (compare.count() >= 2) {
            <div class="fixed inset-x-3.5 bottom-3.5 z-50 flex items-center justify-between gap-4 rounded-2xl border px-5 py-3 shadow-lifted
                        border-surface-200 dark:border-surface-700 bg-surface-0/95 dark:bg-surface-800/95 backdrop-blur
                        sm:inset-x-auto sm:bottom-5 sm:left-1/2 sm:min-w-[380px] sm:-translate-x-1/2">
                <span class="text-[13.5px] text-surface-700 dark:text-surface-200">
                    <b class="text-ochre-600 dark:text-ochre-400">{{ compare.count() }}</b> SGI sélectionnées
                </span>
                <div class="flex items-center gap-3">
                    <button type="button" (click)="compare.clear()" class="text-[13px] text-surface-500 dark:text-surface-400 underline">Effacer</button>
                    <button type="button" (click)="compare.dialogOpen.set(true)"
                            class="inline-flex items-center gap-2 rounded-xl bg-ochre-500 px-4 py-2.5 text-sm font-semibold text-warm-900 transition-colors hover:bg-ochre-600">
                        Comparer
                    </button>
                </div>
            </div>
        }

        <p-dialog [visible]="compare.dialogOpen()" (visibleChange)="compare.dialogOpen.set($event)"
                  [modal]="true" [dismissableMask]="true" [draggable]="false" [resizable]="false"
                  [breakpoints]="{ '640px': '96vw' }" [style]="{ width: '1000px', maxWidth: '96vw' }"
                  [header]="'Comparer ' + compare.list().length + ' SGI'">
            <div class="-mx-1 mb-4 overflow-x-auto">
                <table class="w-full min-w-[520px] border-collapse text-[13px]">
                    <thead>
                        <tr>
                            <th class="sticky left-0 bg-surface-0 dark:bg-surface-800 p-3 text-left"></th>
                            @for (s of compare.list(); track s.id) {
                                <th class="p-3 text-left align-bottom text-[15px] font-bold text-surface-900 dark:text-surface-0">
                                    {{ s.nom }}
                                    <span class="mt-1.5 block text-[10px] font-normal uppercase tracking-wide text-ochre-600 dark:text-ochre-400">{{ s.pays }}</span>
                                </th>
                            }
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="sticky left-0 min-w-[130px] border-b border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-800 p-3 text-left text-[11.5px] font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">Note</td>
                            @for (s of compare.list(); track s.id) {
                                <td class="border-b border-surface-200 dark:border-surface-700 p-3 align-top text-surface-900 dark:text-surface-100">
                                    {{ s.note != null ? noteLabel(s) : ', ' }}
                                </td>
                            }
                        </tr>
                        @for (row of rows; track row.key) {
                            <tr>
                                <td class="sticky left-0 min-w-[130px] border-b border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-800 p-3 text-left text-[11.5px] font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">{{ row.label }}</td>
                                @for (s of compare.list(); track s.id) {
                                    <td class="border-b border-surface-200 dark:border-surface-700 p-3 align-top"
                                        [class]="isBest(row.key, s) ? 'font-bold text-positive' : 'text-surface-900 dark:text-surface-100'">
                                        {{ fee(s, row.key) || ', ' }}{{ isBest(row.key, s) ? ' ✓' : '' }}
                                    </td>
                                }
                            </tr>
                        }
                    </tbody>
                </table>
            </div>
            <p class="text-[11.5px] leading-relaxed text-surface-500 dark:text-surface-400">
                Plafonds homologués (souvent négociables). ✓ = meilleure valeur de la sélection. Pas un conseil en investissement.
            </p>
        </p-dialog>
    `
})
export class SgiComparePanel {
    compare = inject(SgiCompareService);
    rows = COMPARE_ROWS;

    private minCourtage = computed(() => Math.min(...this.compare.list().map((s) => s.courtage_pct ?? 99)));

    fee(s: Sgi, key: string): string | null {
        return findFee(s, key);
    }

    noteLabel(s: Sgi): string {
        return `${String(s.note).replace('.', ',')}/5`;
    }

    isBest(key: string, s: Sgi): boolean {
        return (
            (key === 'transactions ordinaires' && s.courtage_pct === this.minCourtage()) ||
            (key === 'tenue de compte' && isFree(this.fee(s, key)))
        );
    }
}
