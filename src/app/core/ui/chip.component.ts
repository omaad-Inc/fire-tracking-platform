import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type ChipTone = 'neutral' | 'brand' | 'ochre' | 'positive' | 'warning' | 'negative';

/**
 * Design-system chip / badge (Sprint 2).
 *
 * A small labelled pill with tokenized tones. Replaces ad-hoc colored spans for
 * statuses, categories and tags. Tones map to the brand/semantic palette and
 * respect the WCAG note (dark text on ochre). Presentational, OnPush.
 *
 *   <app-chip label="Tontine" tone="ochre" />
 */
@Component({
    standalone: true,
    selector: 'app-chip',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<span [class]="chipClass">{{ label }}</span>`,
})
export class ChipComponent {
    @Input({ required: true }) label = '';
    @Input() tone: ChipTone = 'neutral';

    get chipClass(): string {
        const base =
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap';
        const tones: Record<ChipTone, string> = {
            neutral: 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300',
            brand: 'bg-brand-50 dark:bg-brand-800/50 text-brand-700 dark:text-brand-200',
            // Dark text on ochre — never white (WCAG note in tailwind.config.js).
            ochre: 'bg-ochre-100 dark:bg-ochre-900/40 text-ochre-800 dark:text-ochre-200',
            positive: 'bg-positive-50 dark:bg-positive-700/30 text-positive-700 dark:text-positive-400',
            warning: 'bg-warning-50 dark:bg-warning-700/30 text-warning-700 dark:text-warning-400',
            negative: 'bg-negative-50 dark:bg-negative-700/30 text-negative-700 dark:text-negative-400',
        };
        return `${base} ${tones[this.tone]}`;
    }
}
