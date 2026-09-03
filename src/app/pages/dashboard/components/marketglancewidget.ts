import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../i18n/i18n.service';
import { NavService } from '../../../core/services/nav.service';
import { MarketService } from '../../service/market.service';
import { MarketChangeComponent, SessionPillComponent } from '../../marches/components/market-primitives';

/**
 * Home entry to the Marchés hub (P2-3 follow-up): the three BRVM indices with
 * their level and day move, and the session status. The card IS the entry
 * point: on a phone the sidebar is hidden and the bottom bar keeps its five
 * hubs, so the market lives on the home screen as content, not as a tab.
 * Reference data, not the user's money: shown to a brand-new account too, and
 * hidden quietly (no error card) when the read fails, since nothing personal
 * is missing.
 */
@Component({
    standalone: true,
    selector: 'app-market-glance-widget',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, MarketChangeComponent, SessionPillComponent],
    template: `
        @if (indices(); as ix) {
            @if (ix.indices.length) {
                <a [routerLink]="nav.link('pages', 'marches')" data-testid="mk-home"
                   class="group block rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 p-4 sm:p-5 hover:shadow-card transition-shadow omaad-press">
                    <div class="flex items-center gap-3 mb-3">
                        <span class="w-10 h-10 rounded-xl grid place-items-center shrink-0 bg-brand-100 dark:bg-brand-700/20 text-brand-700 dark:text-ochre-400">
                            <i class="pi pi-globe" aria-hidden="true"></i>
                        </span>
                        <span class="min-w-0 flex-1">
                            <span class="block text-lg font-semibold text-surface-900 dark:text-surface-0 leading-tight">{{ i18n.t('markets.title') }}</span>
                            <span class="block text-xs text-surface-500 dark:text-surface-400">{{ i18n.t('markets.homeSubtitle', { date: market.shortDate(ix.indices[0].as_of) }) }}</span>
                        </span>
                        <span class="hidden sm:inline-flex"><app-session-pill [open]="ix.market_open" /></span>
                        <i class="pi pi-chevron-right text-surface-400 group-hover:text-surface-700 dark:group-hover:text-surface-200 transition-colors" aria-hidden="true"></i>
                    </div>
                    <div class="grid grid-cols-3 gap-2 sm:gap-3">
                        @for (i of ix.indices; track i.code) {
                            <span class="block rounded-xl bg-surface-50 dark:bg-surface-800/60 px-3 py-2.5 min-w-0">
                                <span class="block text-[11px] font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400 truncate">{{ shortName(i.name) }}</span>
                                <span class="block text-base sm:text-lg font-bold tabular-nums text-surface-900 dark:text-surface-0 leading-tight mt-0.5 truncate">{{ market.pts(i.value) }}</span>
                                <span class="block mt-0.5"><app-market-change [percent]="i.change_percent" /></span>
                            </span>
                        }
                    </div>
                </a>
            }
        } @else if (market.indices.status() === 'loading') {
            <div class="h-36 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse" aria-hidden="true"></div>
        }
    `,
})
export class MarketGlanceWidget implements OnInit {
    readonly i18n = inject(I18nService);
    readonly nav = inject(NavService);
    readonly market = inject(MarketService);
    readonly indices = this.market.indices.data;

    ngOnInit(): void { void this.market.indices.load().catch(() => null); }

    /** "BRVM Composite" -> "Composite" (the card already says BRVM), but a bare
     *  number is not a name, so "BRVM 30" stays whole. */
    shortName(name: string): string {
        const rest = name.replace(/^BRVM\s*/i, '');
        return !rest || /^\d+$/.test(rest) ? name : rest;
    }
}
