import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Design-system page header (Sprint 2).
 *
 * The single, consistent top-of-page block: an optional uppercase eyebrow, the
 * page title (semantic `text-heading` token), an optional subtitle, and a
 * right-aligned actions slot. Replaces the ad-hoc `text-2xl/3xl font-bold`
 * headings scattered across 60+ templates so page titles read identically
 * everywhere. Purely presentational, OnPush.
 *
 * Usage:
 *   <app-page-header eyebrow="Patrimoine" title="Mes actifs" subtitle="...">
 *     <button actions ...>Ajouter</button>
 *   </app-page-header>
 */
@Component({
    standalone: true,
    selector: 'app-page-header',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <header class="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div class="flex items-center gap-4 min-w-0">
                @if (icon) {
                    <span class="w-12 h-12 rounded-2xl grid place-items-center shrink-0
                                 bg-brand-100 dark:bg-brand-700/20 text-brand-700 dark:text-ochre-400">
                        <i class="pi {{ icon }} text-xl"></i>
                    </span>
                }
                <div class="min-w-0">
                    @if (eyebrow) {
                        <p class="text-eyebrow uppercase font-semibold text-ochre-600 dark:text-ochre-400 mb-2">
                            {{ eyebrow }}
                        </p>
                    }
                    <h1 class="text-heading font-extrabold text-surface-900 dark:text-surface-0 m-0 truncate">
                        {{ title }}
                    </h1>
                    @if (subtitle) {
                        <p class="text-sm text-surface-500 dark:text-surface-400 mt-1 m-0">{{ subtitle }}</p>
                    }
                </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                <ng-content select="[actions]"></ng-content>
            </div>
        </header>
    `,
})
export class PageHeaderComponent {
    @Input({ required: true }) title = '';
    @Input() eyebrow?: string;
    @Input() subtitle?: string;
    /** Optional leading icon medallion (PrimeIcons class, e.g. "pi-flag-fill"). */
    @Input() icon?: string;
}
