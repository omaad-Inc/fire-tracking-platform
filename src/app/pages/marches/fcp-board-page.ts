import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { I18nService } from '../../i18n/i18n.service';
import { NavService } from '../../core/services/nav.service';
import { LoadErrorComponent } from '../../core/components/load-error.component';
import { PageHeaderComponent, EmptyStateComponent } from '../../core/ui';
import { FCP_GROUPS, FcpGroup, MarketService } from '../service/market.service';
import { FcpRowComponent } from './components/market-rows';

/** The full fund board: category chips, search, ranked by performance since January. */
@Component({
    standalone: true,
    selector: 'app-fcp-board',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, RouterLink, InputTextModule, PageHeaderComponent, EmptyStateComponent, LoadErrorComponent, FcpRowComponent],
    template: `
        <a [routerLink]="nav.link('pages', 'marches')" class="inline-flex items-center gap-1.5 text-sm text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-0 mb-3">
            <i class="pi pi-arrow-left text-xs" aria-hidden="true"></i>{{ t('markets.title') }}
        </a>
        <app-page-header icon="pi-briefcase" [title]="t('markets.fcp')" [subtitle]="t('markets.fcpRanked')" />

        @if (market.funds.status() === 'error') {
            <app-load-error (retry)="load(true)" />
        } @else if (!funds()) {
            <div class="h-96 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse" aria-hidden="true"></div>
        } @else {
            <div class="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                <div class="relative flex-1">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" aria-hidden="true"></i>
                    <input pInputText type="search" [ngModel]="query()" (ngModelChange)="query.set($event)"
                           [attr.aria-label]="t('markets.searchFunds')" [placeholder]="t('markets.searchFunds')"
                           class="w-full !pl-9 !rounded-xl" data-testid="mk-fcp-search" />
                </div>
                <div class="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0" role="group" [attr.aria-label]="t('markets.category')">
                    @for (g of groups; track g) {
                        <button type="button" (click)="group.set(g)" [attr.aria-pressed]="group() === g" [attr.data-group]="g"
                                class="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors omaad-press"
                                [class]="group() === g
                                    ? 'bg-brand-700 border-brand-700 text-white dark:bg-ochre-400 dark:border-ochre-400 dark:text-warm-900'
                                    : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800'">
                            {{ t('addAssets.fcp.groups.' + g) }}
                        </button>
                    }
                </div>
            </div>

            @if (rows().length === 0) {
                <app-empty-state icon="pi-search" [title]="t('markets.noResults')" />
            } @else {
                <p class="text-xs text-surface-400 dark:text-surface-500 mb-2 px-1">{{ t('markets.fundCount', { n: rows().length }) }}</p>
                <div class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 px-4 py-1" data-testid="mk-fcp-list">
                    @for (f of rows(); track f.slug) { <app-fcp-row [fund]="f" /> }
                </div>
            }
        }
    `,
})
export class FcpBoardPage implements OnInit {
    readonly i18n = inject(I18nService);
    readonly nav = inject(NavService);
    readonly market = inject(MarketService);

    readonly funds = this.market.funds.data;
    readonly query = signal('');
    readonly group = signal<FcpGroup>('all');
    readonly groups = FCP_GROUPS;

    readonly rows = computed(() => {
        const q = this.query().trim().toLowerCase();
        const g = this.group();
        let rows = this.funds() ?? [];
        if (g !== 'all') rows = rows.filter(f => this.market.fcpGroupOf(f.category) === g);
        if (q) rows = rows.filter(f => f.name.toLowerCase().includes(q) || (f.sgo || '').toLowerCase().includes(q));
        return this.market.rankFunds(rows);
    });

    t(key: string, params?: Record<string, string | number>): string { return this.i18n.t(key, params); }
    ngOnInit(): void { void this.load(); }
    load(force = false): Promise<unknown> { return this.market.funds.load(force).catch(() => null); }
}
