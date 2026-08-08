import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { CurrencyService } from '../../../core/services/currency.service';

export interface AllocationSegment {
    /** Display label (already localized). */
    label: string;
    /** EUR-base amount (display conversion happens at format time). */
    amount: number;
    /** Slice color (hex). */
    color: string;
}

/**
 * Répartition donut (ported from omaad-dashboard-v2.html reference).
 *
 * Renders SVG circle segments from a segments input — no Chart.js. Exact
 * reference geometry: viewBox 260×260, R=110, strokeWidth=20 (thin ring),
 * white gap = 0.35% of circumference between segments, minimum visible
 * segment length so tiny categories (Tontine) never disappear, whole ring
 * rotated -90° so it starts at 12 o'clock. Everything is computed() from
 * the input signal — no magic dasharray values.
 *
 * The center readout is the PARENT's business (ng-content), so amount
 * formatting stays with app-amount/CurrencyService there. Segment hover
 * shows a tooltip with the category's amount.
 */
@Component({
    standalone: true,
    selector: 'app-allocation-donut',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TooltipModule],
    template: `
        <svg viewBox="0 0 260 260" class="w-full h-full -rotate-90" [attr.aria-label]="ariaLabel()" role="img">
            @for (arc of arcs(); track arc.label) {
                <circle cx="130" cy="130" r="110" fill="none" stroke-width="20"
                        [attr.stroke]="arc.color"
                        [attr.stroke-dasharray]="arc.dasharray"
                        [attr.stroke-dashoffset]="arc.dashoffset"
                        [pTooltip]="arc.tooltip" tooltipPosition="top" />
            }
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <ng-content></ng-content>
        </div>
    `,
    host: { class: 'relative block aspect-square' },
})
export class AllocationDonutComponent {
    private cs = inject(CurrencyService);

    segments = input.required<AllocationSegment[]>();
    ariaLabel = input('');

    /** Reference geometry: R=110 → C=2πR; GAP=0.35% of C; min len 1.2. */
    arcs = computed(() => {
        const segs = this.segments();
        const total = segs.reduce((s, x) => s + x.amount, 0);
        if (total <= 0) return [];
        const C = 2 * Math.PI * 110;
        const GAP = C * 0.0035;
        let offset = 0;
        return segs.map(seg => {
            const frac = seg.amount / total;
            const len = Math.max(frac * C - GAP, 1.2);
            const arc = {
                label: seg.label,
                color: seg.color,
                dasharray: `${len} ${C - len}`,
                dashoffset: String(-offset - GAP / 2),
                tooltip: `${seg.label} · ${this.cs.format(seg.amount, 0)}`,
            };
            offset += frac * C;
            return arc;
        });
    });
}
