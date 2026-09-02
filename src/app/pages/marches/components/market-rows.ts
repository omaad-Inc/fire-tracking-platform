import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrvmBoardQuote, FcpInstrument } from '../../../core/services/api.service';
import { NavService } from '../../../core/services/nav.service';
import { MarketService } from '../../service/market.service';
import { MarketChangeComponent, TickerCircleComponent } from './market-primitives';

/** One listed equity: monogram, name, ticker · country, close in FCFA, day change. */
@Component({
    standalone: true,
    selector: 'app-board-quote-row',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, MarketChangeComponent, TickerCircleComponent],
    template: `
        <a [routerLink]="nav.link('pages', 'marches', 'action', quote().ticker)"
           class="flex items-center gap-3 py-2.5 px-1 -mx-1 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800/60 transition-colors omaad-press"
           [attr.data-ticker]="quote().ticker">
            <app-ticker-circle [label]="quote().ticker" />
            <span class="flex-1 min-w-0">
                <span class="block text-[15px] font-semibold text-surface-900 dark:text-surface-0 truncate">{{ quote().name }}</span>
                <span class="block text-xs text-surface-400 dark:text-surface-500 truncate">
                    {{ quote().ticker }}@if (quote().country) { · {{ quote().country }} }
                </span>
            </span>
            @if (wide()) {
                <span class="hidden lg:block w-28 text-right text-xs text-surface-500 dark:text-surface-400 tabular-nums">{{ market.int(quote().volume) }}</span>
            }
            <span class="flex flex-col items-end shrink-0">
                <span class="text-sm font-semibold tabular-nums text-surface-900 dark:text-surface-0">{{ market.xof(quote().close_xof) }}</span>
                <app-market-change [percent]="quote().change_percent" />
            </span>
        </a>
    `,
})
export class BoardQuoteRowComponent {
    readonly nav = inject(NavService);
    readonly market = inject(MarketService);
    quote = input.required<BrvmBoardQuote>();
    /** Desktop board: also show the last session's volume column. */
    wide = input(false);
}

/** One fund: SGO initials, name, management company, latest VL, YTD performance. */
@Component({
    standalone: true,
    selector: 'app-fcp-row',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, MarketChangeComponent, TickerCircleComponent],
    template: `
        <a [routerLink]="nav.link('pages', 'marches', 'fonds', fund().slug)"
           class="flex items-center gap-3 py-2.5 px-1 -mx-1 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800/60 transition-colors omaad-press"
           [attr.data-slug]="fund().slug">
            <app-ticker-circle [label]="fund().sgo || fund().name" />
            <span class="flex-1 min-w-0">
                <span class="block text-[15px] font-semibold text-surface-900 dark:text-surface-0 truncate">{{ fund().name }}</span>
                @if (fund().sgo) {
                    <span class="block text-xs text-surface-400 dark:text-surface-500 truncate">{{ fund().sgo }}</span>
                }
            </span>
            <span class="flex flex-col items-end shrink-0">
                @if (fund().latest_vl && fund().latest_vl! > 0) {
                    <span class="text-sm font-semibold tabular-nums text-surface-900 dark:text-surface-0">{{ market.xof(fund().latest_vl) }}</span>
                }
                <app-market-change [percent]="fund().perf_ytd" />
            </span>
        </a>
    `,
})
export class FcpRowComponent {
    readonly nav = inject(NavService);
    readonly market = inject(MarketService);
    fund = input.required<FcpInstrument>();
}
