import { Injectable, computed, signal } from '@angular/core';
import { Sgi, getById } from './sgi-data';

const MAX_SELECTION = 4;

/**
 * Sélection partagée entre la liste, les fiches SGI, la barre de comparaison
 * et le tableau comparatif, même logique que l'app React d'origine
 * (max 4 SGI, uniquement celles au tarif complet).
 */
@Injectable({ providedIn: 'root' })
export class SgiCompareService {
    private selection = signal<string[]>([]);

    readonly ids = this.selection.asReadonly();
    readonly count = computed(() => this.selection().length);
    readonly list = computed<Sgi[]>(() =>
        this.selection().map((id) => getById(id)).filter((s): s is Sgi => !!s)
    );

    readonly dialogOpen = signal(false);

    isSelected(id: string): boolean {
        return this.selection().includes(id);
    }

    toggle(id: string): void {
        this.selection.update((s) =>
            s.includes(id) ? s.filter((x) => x !== id) : s.length < MAX_SELECTION ? [...s, id] : s
        );
    }

    clear(): void {
        this.selection.set([]);
        this.dialogOpen.set(false);
    }
}
