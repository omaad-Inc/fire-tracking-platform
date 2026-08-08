import { isPlatformBrowser } from '@angular/common';
import {
    ChangeDetectionStrategy, Component, ElementRef, OnDestroy, PLATFORM_ID,
    afterNextRender, computed, inject, input, signal,
} from '@angular/core';

/**
 * Segmented tick bar (ported from omaad-dashboard-v2.html reference).
 *
 * A Finary-style dotted magnitude bar: 3px ticks on a 6px pitch (3px tick +
 * 3px gap). The tick count derives from the bar's REAL rendered width via
 * ResizeObserver (not window:resize), so it adapts to any container.
 * filled = round(pct/100 × count), with a minimum of 1 when pct > 0 so a
 * tiny category (Tontine) never renders as an empty bar.
 */
@Component({
    standalone: true,
    selector: 'app-allocation-ticks',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @for (filled of ticks(); track $index) {
            <span class="w-[3px] min-w-[3px] h-[15px] rounded-[1.5px]"
                  [class.bg-surface-200]="!filled" [class.dark:bg-surface-700]="!filled"
                  [style.backgroundColor]="filled ? color() : null"></span>
        }
    `,
    host: { class: 'flex items-center gap-[3px] h-[15px] overflow-hidden min-w-0', 'aria-hidden': 'true' },
})
export class AllocationTicksComponent implements OnDestroy {
    private el = inject(ElementRef<HTMLElement>);
    private platformId = inject(PLATFORM_ID);
    private ro?: ResizeObserver;

    /** Raw share in percent (0–100). */
    pct = input.required<number>();
    /** Filled-tick color (hex). */
    color = input.required<string>();

    private width = signal(0);

    /** true = filled tick, false = off tick. Pitch 6px (3px tick + 3px gap). */
    ticks = computed(() => {
        const n = Math.max(Math.floor(this.width() / 6), 10);
        const p = this.pct();
        const filled = Math.max(Math.round((p / 100) * n), p > 0 ? 1 : 0);
        return Array.from({ length: n }, (_, i) => i < filled);
    });

    constructor() {
        afterNextRender(() => {
            if (!isPlatformBrowser(this.platformId) || typeof ResizeObserver === 'undefined') return;
            this.ro = new ResizeObserver(entries => this.width.set(entries[0].contentRect.width));
            this.ro.observe(this.el.nativeElement);
        });
    }

    ngOnDestroy(): void {
        this.ro?.disconnect();
    }
}
