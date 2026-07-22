import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Design-system empty state (Sprint 2).
 *
 * A designed "nothing here yet" block: centered icon medallion, title, message,
 * and a content-projected CTA slot. Standardizes the bare "Aucune donnée" text
 * that appeared inconsistently across lists. Presentational, OnPush.
 *
 *   <app-empty-state icon="pi-wallet" title="Aucun actif"
 *                    message="Ajoutez votre premier actif pour commencer.">
 *     <button ...>Ajouter un actif</button>
 *   </app-empty-state>
 */
@Component({
    standalone: true,
    selector: 'app-empty-state',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="flex flex-col items-center justify-center text-center px-6 py-12">
            @if (icon) {
                <span class="w-14 h-14 rounded-2xl grid place-items-center mb-4
                             bg-surface-100 dark:bg-surface-800 text-surface-400 dark:text-surface-500">
                    <i class="pi {{ icon }} text-2xl"></i>
                </span>
            }
            <h3 class="text-subheading font-bold text-surface-900 dark:text-surface-0 m-0">{{ title }}</h3>
            @if (message) {
                <p class="text-sm text-surface-500 dark:text-surface-400 mt-2 mb-0 max-w-sm">{{ message }}</p>
            }
            <div class="mt-5 empty:hidden">
                <ng-content></ng-content>
            </div>
        </div>
    `,
})
export class EmptyStateComponent {
    @Input({ required: true }) title = '';
    @Input() icon?: string;
    @Input() message?: string;
}
