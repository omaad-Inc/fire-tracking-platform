import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { I18nService } from '../../../i18n/i18n.service';
import { MarketService, SeriesPoint } from '../../service/market.service';

const W = 600;
const H = 220;
const PAD = 26; // room for the high/low callouts above and below the line

/**
 * Detail chart of one market series: 2px line over a soft area, a dotted
 * reference at the window's opening value, high/low callouts, and the hover
 * layer a web chart owes its reader (crosshair snapping to the nearest date,
 * one tooltip with the date and the value, keyboard arrows when focused).
 * Every value the tooltip shows is also readable from the callouts and the
 * change line, so hover enhances, it never gates.
 */
@Component({
    standalone: true,
    selector: 'app-hilo-chart',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="relative select-none outline-none rounded-xl focus-visible:ring-2 focus-visible:ring-ochre-500"
             [style.height.px]="height"
             tabindex="0" role="img" [attr.aria-label]="ariaLabel()"
             (pointermove)="onPointer($event)" (pointerleave)="hover.set(null)"
             (keydown)="onKey($event)" (blur)="hover.set(null)">
            <svg class="block w-full h-full" [attr.viewBox]="'0 0 ' + W + ' ' + height" preserveAspectRatio="none" aria-hidden="true">
                <line x1="0" x2="600" [attr.y1]="refY()" [attr.y2]="refY()"
                      class="text-surface-400 dark:text-surface-500" stroke="currentColor" stroke-opacity="0.5"
                      stroke-dasharray="3 8" vector-effect="non-scaling-stroke" />
                <g [class]="toneClass()">
                    <path [attr.d]="area()" fill="currentColor" fill-opacity="0.18" />
                    <path [attr.d]="line()" fill="none" stroke="currentColor" stroke-width="2"
                          vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" />
                </g>
            </svg>

            <!-- High / low callouts (HTML so the text never stretches with the SVG) -->
            @if (hi(); as h) {
                <span class="absolute -translate-x-1/2 -translate-y-full px-2 py-0.5 rounded-lg text-[11px] font-semibold tabular-nums
                             bg-surface-0 dark:bg-surface-800 text-surface-700 dark:text-surface-200 shadow-card"
                      [style.left.%]="h.x" [style.top.px]="h.y - 6">{{ formatValue()(h.v) }}</span>
            }
            @if (lo(); as l) {
                <span class="absolute -translate-x-1/2 px-2 py-0.5 rounded-lg text-[11px] font-semibold tabular-nums
                             bg-surface-0 dark:bg-surface-800 text-surface-700 dark:text-surface-200 shadow-card"
                      [style.left.%]="l.x" [style.top.px]="l.y + 6">{{ formatValue()(l.v) }}</span>
            }

            <!-- Hover layer: crosshair + one tooltip, snapped to the nearest date -->
            @if (hoverPoint(); as hp) {
                <div class="absolute top-0 bottom-0 w-px bg-surface-400 dark:bg-surface-500 pointer-events-none" [style.left.%]="hp.x"></div>
                <div class="absolute w-2.5 h-2.5 rounded-full -translate-x-1/2 -translate-y-1/2 ring-2 ring-surface-0 dark:ring-surface-900 pointer-events-none"
                     [class]="dotClass()" [style.left.%]="hp.x" [style.top.px]="hp.y"></div>
                <div class="absolute top-1 -translate-x-1/2 px-2.5 py-1.5 rounded-xl text-xs whitespace-nowrap pointer-events-none
                            bg-surface-900 dark:bg-surface-0 text-surface-0 dark:text-surface-900 shadow-lifted"
                     [style.left.%]="hp.tx" role="status">
                    <span class="font-bold tabular-nums">{{ formatValue()(hp.value) }}</span>
                    <span class="opacity-70 ml-1.5">{{ market.shortDate(hp.date) }}</span>
                </div>
            }
        </div>
    `,
})
export class HiloChartComponent {
    readonly market = inject(MarketService);
    private i18n = inject(I18nService);
    readonly W = W;
    readonly height = H;

    points = input.required<SeriesPoint[]>();
    tone = input<'positive' | 'negative' | 'neutral'>('neutral');
    formatValue = input<(v: number) => string>(v => String(v));
    /** Index of the hovered / focused point, null when idle. */
    readonly hover = signal<number | null>(null);

    readonly toneClass = computed(() => ({
        positive: 'text-positive dark:text-positive-400',
        negative: 'text-negative dark:text-negative-400',
        neutral: 'text-ochre-500 dark:text-ochre-400',
    })[this.tone()]);
    readonly dotClass = computed(() => ({
        positive: 'bg-positive dark:bg-positive-400',
        negative: 'bg-negative dark:bg-negative-400',
        neutral: 'bg-ochre-500 dark:bg-ochre-400',
    })[this.tone()]);

    private readonly scale = computed(() => {
        const v = this.points().map(p => p.value);
        const min = Math.min(...v), max = Math.max(...v), range = max - min || 1;
        const n = v.length;
        return {
            x: (i: number) => n > 1 ? (i / (n - 1)) * W : W / 2,
            y: (val: number) => H - PAD - ((val - min) / range) * (H - PAD * 2),
        };
    });

    readonly line = computed(() => {
        const pts = this.points();
        if (pts.length < 2) return '';
        const { x, y } = this.scale();
        return pts.map((p, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
    });
    readonly area = computed(() => this.line() ? `${this.line()} L ${W} ${H} L 0 ${H} Z` : '');
    readonly refY = computed(() => this.points().length ? this.scale().y(this.points()[0].value).toFixed(1) : '0');

    private extreme(pick: 'max' | 'min') {
        const pts = this.points();
        if (pts.length < 2) return null;
        let idx = 0;
        pts.forEach((p, i) => { if (pick === 'max' ? p.value > pts[idx].value : p.value < pts[idx].value) idx = i; });
        const { x, y } = this.scale();
        return { idx, v: pts[idx].value, x: clampPct((x(idx) / W) * 100), y: y(pts[idx].value) };
    }
    readonly hi = computed(() => this.extreme('max'));
    readonly lo = computed(() => {
        const l = this.extreme('min');
        const h = this.hi();
        return l && h && l.idx !== h.idx ? l : null;
    });

    readonly hoverPoint = computed(() => {
        const i = this.hover();
        const pts = this.points();
        if (i === null || i < 0 || i >= pts.length) return null;
        const { x, y } = this.scale();
        const xp = (x(i) / W) * 100;
        return { ...pts[i], x: xp, y: y(pts[i].value), tx: clampPct(xp, 14) };
    });

    readonly ariaLabel = computed(() => {
        const pts = this.points();
        if (!pts.length) return '';
        const f = this.formatValue();
        return this.i18n.t('markets.chartAria', {
            from: f(pts[0].value), to: f(pts[pts.length - 1].value),
            start: this.market.shortDate(pts[0].date), end: this.market.shortDate(pts[pts.length - 1].date),
        });
    });

    onPointer(ev: PointerEvent): void {
        const el = ev.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        const frac = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
        this.hover.set(Math.round(frac * (this.points().length - 1)));
    }

    onKey(ev: KeyboardEvent): void {
        const n = this.points().length;
        if (!n) return;
        const cur = this.hover() ?? n - 1;
        if (ev.key === 'ArrowLeft') { this.hover.set(Math.max(0, cur - 1)); ev.preventDefault(); }
        else if (ev.key === 'ArrowRight') { this.hover.set(Math.min(n - 1, cur + 1)); ev.preventDefault(); }
        else if (ev.key === 'Home') { this.hover.set(0); ev.preventDefault(); }
        else if (ev.key === 'End') { this.hover.set(n - 1); ev.preventDefault(); }
        else if (ev.key === 'Escape') { this.hover.set(null); }
    }
}

function clampPct(x: number, margin = 6): number {
    return Math.min(100 - margin, Math.max(margin, x));
}
