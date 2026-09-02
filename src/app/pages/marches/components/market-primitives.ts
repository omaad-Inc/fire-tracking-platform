import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../../../i18n/i18n.service';
import { MarketService } from '../../service/market.service';

/**
 * The one signed-percent widget of the Marchés surface. Three states, never a
 * fake zero: null draws a dash in tertiary ink; up draws a ▲ in positive; down
 * a ▼ in negative; flat has no arrow and secondary ink (flat is neither green
 * nor red). The arrow carries the sign, the number is absolute.
 */
@Component({
    standalone: true,
    selector: 'app-market-change',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (percent() === null || percent() === undefined) {
            <span class="tabular-nums font-bold text-surface-400 dark:text-surface-500" [class]="sizeClass()" aria-hidden="true">—</span>
        } @else {
            <span class="tabular-nums font-bold whitespace-nowrap" [class]="sizeClass() + ' ' + toneClass()"
                  [attr.aria-label]="ariaLabel()">
                @if (sign() > 0) { <span aria-hidden="true">▲ </span> }
                @else if (sign() < 0) { <span aria-hidden="true">▼ </span> }
                {{ market.pct(percent()!) }}
            </span>
        }
    `,
})
export class MarketChangeComponent {
    readonly market = inject(MarketService);
    percent = input<number | null | undefined>(null);
    size = input<'sm' | 'md'>('sm');

    /** Sign of the DISPLAYED value: -0.03% prints as 0,0 %, and an arrow next
     *  to a zero would contradict the number, so it reads flat. */
    readonly sign = computed(() => {
        const p = this.percent() ?? 0;
        return Math.abs(p) < 0.05 ? 0 : Math.sign(p);
    });
    readonly sizeClass = computed(() => this.size() === 'md' ? 'text-[13px]' : 'text-xs');
    readonly toneClass = computed(() => {
        const s = this.sign();
        if (s > 0) return 'text-positive dark:text-positive-400';
        if (s < 0) return 'text-negative dark:text-negative-400';
        return 'text-surface-500 dark:text-surface-400';
    });
    readonly ariaLabel = computed(() => {
        const s = this.sign();
        return `${s > 0 ? '+' : s < 0 ? '-' : ''}${this.market.pct(this.percent() ?? 0)}`;
    });
}

/** Round monogram badge: first two characters of a ticker, or a company's initials. */
@Component({
    standalone: true,
    selector: 'app-ticker-circle',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <span class="inline-grid place-items-center rounded-full shrink-0 font-bold uppercase
                     bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300"
              [class]="size() === 'lg' ? 'w-12 h-12 text-sm' : 'w-10 h-10 text-xs'" aria-hidden="true">{{ monogram() }}</span>
    `,
})
export class TickerCircleComponent {
    label = input.required<string>();
    size = input<'md' | 'lg'>('md');
    /** Two letters: initials when the label has two words, else its first two characters. */
    readonly monogram = computed(() => {
        const src = (this.label() || '?').trim();
        const words = src.split(/\s+/).filter(Boolean);
        return words.length >= 2 ? words[0][0] + words[1][0] : src.slice(0, 2);
    });
}

/** Axis-free single series, 2px stroke, soft area fade; nothing below two points. */
@Component({
    standalone: true,
    selector: 'app-market-sparkline',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (path()) {
            <svg class="block w-full" [style.height.px]="height()" viewBox="0 0 100 44" preserveAspectRatio="none"
                 [class]="toneClass()" aria-hidden="true">
                <path [attr.d]="area()" fill="currentColor" fill-opacity="0.18" />
                <path [attr.d]="path()" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"
                      stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        }
    `,
})
export class MarketSparklineComponent {
    values = input.required<number[]>();
    tone = input<'positive' | 'negative' | 'neutral'>('neutral');
    height = input(44);

    readonly toneClass = computed(() => ({
        positive: 'text-positive dark:text-positive-400',
        negative: 'text-negative dark:text-negative-400',
        neutral: 'text-ochre-500 dark:text-ochre-400',
    })[this.tone()]);

    readonly path = computed(() => {
        const v = this.values();
        if (!v || v.length < 2) return '';
        const min = Math.min(...v), max = Math.max(...v), range = max - min || 1;
        const pad = 4, span = 44 - pad * 2;
        return v.map((x, i) => `${i ? 'L' : 'M'} ${((i / (v.length - 1)) * 100).toFixed(2)} ${(44 - pad - ((x - min) / range) * span).toFixed(2)}`).join(' ');
    });
    readonly area = computed(() => this.path() ? `${this.path()} L 100 44 L 0 44 Z` : '');
}

/** "Marché ouvert / fermé": the ambient session status from the server clock. */
@Component({
    standalone: true,
    selector: 'app-session-pill',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold
                     bg-surface-100 dark:bg-surface-800"
              [class]="open() ? 'text-ochre-600 dark:text-ochre-300' : 'text-surface-500 dark:text-surface-400'">
            <i class="pi text-[11px]" [class]="open() ? 'pi-sun' : 'pi-moon'" aria-hidden="true"></i>
            {{ i18n.t(open() ? 'markets.sessionOpen' : 'markets.sessionClosed') }}
        </span>
    `,
})
export class SessionPillComponent {
    readonly i18n = inject(I18nService);
    open = input.required<boolean>();
}
