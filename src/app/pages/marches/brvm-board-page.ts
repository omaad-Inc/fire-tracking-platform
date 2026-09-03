import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { I18nService } from '../../i18n/i18n.service';
import { NavService } from '../../core/services/nav.service';
import { LoadErrorComponent } from '../../core/components/load-error.component';
import { PageHeaderComponent, EmptyStateComponent } from '../../core/ui';
import { MarketService } from '../service/market.service';
import { BoardQuoteRowComponent } from './components/market-rows';

type SortKey = 'name' | 'change' | 'price';

/** The full BRVM equity board: search by name or ticker, sort, one row per title. */
@Component({
    standalone: true,
    selector: 'app-brvm-board',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, RouterLink, InputTextModule, PageHeaderComponent, EmptyStateComponent, LoadErrorComponent, BoardQuoteRowComponent],
    template: `
        <a [routerLink]="nav.link('pages', 'marches')" class="inline-flex items-center gap-1.5 text-sm text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-0 mb-3">
            <i class="pi pi-arrow-left text-xs" aria-hidden="true"></i>{{ t('markets.title') }}
        </a>
        <app-page-header icon="pi-chart-line" [title]="t('markets.board')" [subtitle]="t('markets.boardSubtitle')" />

        @if (market.quotes.status() === 'error') {
            <app-load-error (retry)="load(true)" />
        } @else if (!quotes()) {
            <div class="h-96 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse" aria-hidden="true"></div>
        } @else {
            <div class="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                <div class="relative flex-1">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" aria-hidden="true"></i>
                    <input pInputText type="search" [ngModel]="query()" (ngModelChange)="query.set($event)"
                           [attr.aria-label]="t('markets.searchStocks')" [placeholder]="t('markets.searchStocks')"
                           class="w-full !pl-9 !rounded-xl" data-testid="mk-search" />
                </div>
                <div class="inline-flex p-1 rounded-xl bg-surface-100 dark:bg-surface-800" role="group" [attr.aria-label]="t('markets.sort')">
                    @for (s of sorts; track s.key) {
                        <button type="button" (click)="setSort(s.key)" [attr.aria-pressed]="sort() === s.key" [attr.data-sort]="s.key"
                                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors omaad-press"
                                [class]="sort() === s.key ? 'bg-surface-0 dark:bg-surface-700 text-surface-900 dark:text-surface-0 shadow-card' : 'text-surface-500 dark:text-surface-400'">
                            {{ t(s.labelKey) }}@if (sort() === s.key) { <i class="pi text-[10px] ml-1" [class]="desc() ? 'pi-arrow-down' : 'pi-arrow-up'" aria-hidden="true"></i> }
                        </button>
                    }
                </div>
            </div>

            @if (rows().length === 0) {
                <app-empty-state icon="pi-search" [title]="t('markets.noResults')" />
            } @else {
                <p class="text-xs text-surface-400 dark:text-surface-500 mb-2 px-1">{{ t('markets.count', { n: rows().length }) }}</p>
                <div class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 px-4 py-1" data-testid="mk-board-list">
                    <div class="hidden lg:flex items-center gap-3 px-1 py-2 text-[11px] uppercase tracking-wider text-surface-400 dark:text-surface-500 border-b border-surface-200 dark:border-surface-800">
                        <span class="w-10"></span>
                        <span class="flex-1">{{ t('markets.sortName') }}</span>
                        <span class="w-28 text-right">{{ t('markets.volumeCol') }}</span>
                        <span class="w-32 text-right whitespace-nowrap">{{ t('markets.sortPrice') }}</span>
                    </div>
                    @for (row of rows(); track row.ticker) { <app-board-quote-row [quote]="row" [wide]="true" /> }
                </div>
            }
            <p class="mt-4 px-1 text-xs leading-relaxed text-surface-400 dark:text-surface-500">{{ t('markets.footnote') }}</p>
        }
    `,
})
export class BrvmBoardPage implements OnInit {
    readonly i18n = inject(I18nService);
    readonly nav = inject(NavService);
    readonly market = inject(MarketService);

    readonly quotes = this.market.quotes.data;
    readonly query = signal('');
    readonly sort = signal<SortKey>('name');
    readonly desc = signal(false);
    readonly sorts: ReadonlyArray<{ key: SortKey; labelKey: string }> = [
        { key: 'name', labelKey: 'markets.sortName' },
        { key: 'change', labelKey: 'markets.sortChange' },
        { key: 'price', labelKey: 'markets.sortPrice' },
    ];

    readonly rows = computed(() => {
        const q = this.query().trim().toLowerCase();
        let rows = this.quotes() ?? [];
        if (q) rows = rows.filter(r => r.name.toLowerCase().includes(q) || r.ticker.toLowerCase().includes(q));
        const key = this.sort();
        if (key !== 'name' || this.desc()) {
            const dir = this.desc() ? -1 : 1;
            rows = [...rows].sort((a, b) => {
                if (key === 'name') return dir * a.name.localeCompare(b.name);
                if (key === 'price') return dir * (a.close_xof - b.close_xof);
                // Unknown changes sink to the bottom whatever the direction.
                const ca = a.change_percent, cb = b.change_percent;
                if (ca == null && cb == null) return 0;
                if (ca == null) return 1;
                if (cb == null) return -1;
                return dir * (ca - cb);
            });
        }
        return rows;
    });

    t(key: string, params?: Record<string, string | number>): string { return this.i18n.t(key, params); }
    ngOnInit(): void { void this.load(); }
    load(force = false): Promise<unknown> { return this.market.quotes.load(force).catch(() => null); }

    /** Same key again flips the direction; a new key starts descending for
     *  change and price (biggest first is what a reader asks of a board). */
    setSort(key: SortKey): void {
        if (this.sort() === key) { this.desc.update(d => !d); return; }
        this.sort.set(key);
        this.desc.set(key !== 'name');
    }
}
