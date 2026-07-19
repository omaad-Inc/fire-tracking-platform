import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
    selector: 'app-sgi-stars',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (note() != null) {
            <span class="inline-flex items-center gap-1" [title]="note() + '/5'">
                <span class="inline-flex items-center">
                    @for (i of [0, 1, 2, 3, 4]; track i) {
                        <svg width="14" height="14" viewBox="0 0 24 24"
                             [attr.fill]="i < full() ? 'currentColor' : 'none'"
                             [class]="i < full() ? 'text-ochre-500' : 'text-surface-300 dark:text-surface-600'"
                             stroke="currentColor" stroke-width="1.5">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                    }
                </span>
                <span class="ml-1 text-xs font-medium tabular-nums text-surface-500 dark:text-surface-400">{{ noteLabel() }}</span>
            </span>
        } @else {
            <span class="text-surface-400 dark:text-surface-500">—</span>
        }
    `
})
export class SgiStars {
    note = input<number | null>(null);
    full = computed(() => Math.round(this.note() ?? 0));
    noteLabel = computed(() => String(this.note() ?? '').replace('.', ','));
}
