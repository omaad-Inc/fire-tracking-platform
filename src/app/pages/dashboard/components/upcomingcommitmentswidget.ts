import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription, firstValueFrom, merge } from 'rxjs';
import { ApiService, CommitmentItem, CommitmentsFeed } from '../../../core/services/api.service';
import { AssetsStateService } from '../../service/assets-state.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { LoadErrorComponent } from '../../../core/components/load-error.component';
import { UiCardComponent } from '../../../core/ui';
import { I18nService } from '../../../i18n/i18n.service';
import { NavService } from '../../../core/services/nav.service';
import { ShareContextService } from '../../../core/services/share-context.service';
import { parseLocalDate } from '../../../core/util/date';

/**
 * "À venir · 30 jours" (P1 X-P1.2): the one place the Synthèse says what the
 * user has committed to (tontine turns, debt instalments) and what they can
 * expect (receivables, their tontine pot), from GET /commitments/upcoming.
 * Hidden in share mode (the feed is not part of the public bundle).
 */
@Component({
    standalone: true,
    selector: 'app-upcoming-commitments',
    imports: [CommonModule, RouterModule, AppAmountComponent, LoadErrorComponent, UiCardComponent],
    template: `
        @if (!share.active()) {
        <app-ui-card [flush]="true" padding="md" innerClass="relative overflow-hidden h-full flex flex-col">
            <div class="relative flex justify-between items-center mb-5">
                <div class="font-semibold text-xl text-surface-900 dark:text-surface-0">{{ t('dashboard.upcoming.title') }}</div>
                <span class="text-xs font-medium text-surface-500 dark:text-surface-400">{{ t('dashboard.upcoming.window') }}</span>
            </div>
            @if (loading()) {
                <div class="space-y-3 animate-pulse">
                    <div class="grid grid-cols-2 gap-3"><div class="h-14 bg-surface-200 dark:bg-surface-700 rounded-xl"></div><div class="h-14 bg-surface-200 dark:bg-surface-700 rounded-xl"></div></div>
                    @for (i of [1,2,3]; track i) { <div class="h-10 bg-surface-200 dark:bg-surface-700 rounded-lg"></div> }
                </div>
            } @else if (loadError()) {
                <app-load-error (retry)="load()" />
            } @else if (feed()) {
              @if (feed(); as f) {
                <div class="grid grid-cols-2 gap-3 mb-4">
                    <div class="rounded-xl px-3.5 py-3 bg-surface-50 dark:bg-surface-800/60">
                        <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ t('dashboard.upcoming.out') }}</p>
                        <div class="text-lg font-bold text-surface-900 dark:text-surface-0 tabular-nums"><app-amount [value]="f.outflows_eur" /></div>
                    </div>
                    <div class="rounded-xl px-3.5 py-3 bg-surface-50 dark:bg-surface-800/60">
                        <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ t('dashboard.upcoming.in') }}</p>
                        <div class="text-lg font-bold text-positive tabular-nums"><app-amount [value]="f.inflows_eur" /></div>
                    </div>
                </div>
                @if (f.late_count > 0) {
                    <p class="text-xs font-medium text-negative mb-3 flex items-center gap-1.5"><i class="pi pi-exclamation-circle text-[11px]"></i>{{ f.late_count === 1 ? t('dashboard.upcoming.lateOne') : t('dashboard.upcoming.lateOther', { n: f.late_count }) }}</p>
                }
                @if (rows().length === 0) {
                    <div class="flex-1 flex flex-col items-center justify-center py-6 text-center">
                        <div class="w-12 h-12 rounded-full bg-positive/10 flex items-center justify-center mb-3"><i class="pi pi-check-circle text-xl text-positive"></i></div>
                        <p class="text-surface-500 dark:text-surface-400 text-sm m-0">{{ t('dashboard.upcoming.none') }}</p>
                    </div>
                } @else {
                    <ul class="list-none p-0 m-0 divide-y divide-surface-100 dark:divide-surface-800">
                        @for (it of rows(); track it.kind + it.label + it.date) {
                            <li>
                                <a [routerLink]="linkFor(it)" class="flex items-center gap-3 py-2.5 no-underline hover:bg-surface-50 dark:hover:bg-surface-800/50 rounded-lg px-1 -mx-1 transition-colors">
                                    <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                         [ngClass]="it.is_late ? 'bg-negative-50 dark:bg-negative-500/15' : (it.direction === 'in' ? 'bg-positive-50 dark:bg-positive-500/15' : 'bg-surface-100 dark:bg-surface-800')">
                                        <i class="pi text-sm" [ngClass]="iconFor(it)"></i>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="text-sm font-medium text-surface-900 dark:text-surface-0 m-0 truncate">{{ it.label }}</p>
                                        <p class="text-xs m-0" [ngClass]="it.is_late ? 'text-negative' : 'text-surface-500 dark:text-surface-400'">{{ kindLabel(it) }} · {{ when(it) }}</p>
                                    </div>
                                    <span class="text-sm font-semibold tabular-nums shrink-0" [ngClass]="it.direction === 'in' ? 'text-positive' : 'text-surface-900 dark:text-surface-0'">
                                        {{ it.direction === 'in' ? '+' : '−' }}<app-amount [value]="it.amount_eur" />
                                    </span>
                                </a>
                            </li>
                        }
                    </ul>
                    @if (f.items.length > rows().length) {
                        <p class="text-xs text-surface-400 mt-2 mb-0">{{ t('dashboard.upcoming.more', { n: f.items.length - rows().length }) }}</p>
                    }
                }
              }
            }
        </app-ui-card>
        }
    `
})
export class UpcomingCommitmentsWidget implements OnInit, OnDestroy {
    private api = inject(ApiService);
    private state = inject(AssetsStateService);
    private i18n = inject(I18nService);
    private nav = inject(NavService);
    readonly share = inject(ShareContextService);
    private sub?: Subscription;

    loading = signal(true);
    loadError = signal(false);
    feed = signal<CommitmentsFeed | null>(null);
    /** Late first, then by date; five rows. */
    rows = computed<CommitmentItem[]>(() => {
        const items = [...(this.feed()?.items ?? [])];
        items.sort((a, b) => (a.is_late === b.is_late ? a.date.localeCompare(b.date) : (a.is_late ? -1 : 1)));
        return items.slice(0, 5);
    });

    ngOnInit() {
        if (this.share.active()) { this.loading.set(false); return; }
        this.load();
        this.sub = merge(this.state.debtsUpdated$, this.state.assetsUpdated$).subscribe(() => this.load());
    }

    ngOnDestroy() { this.sub?.unsubscribe(); }

    async load() {
        if (!this.feed()) this.loading.set(true);
        try {
            this.feed.set(await firstValueFrom(this.api.getUpcomingCommitments(30)));
            this.loadError.set(false);
        } catch {
            if (!this.feed()) this.loadError.set(true);
        } finally {
            this.loading.set(false);
        }
    }

    t(key: string, params?: Record<string, string | number>): string { return this.i18n.t(key, params); }

    linkFor(it: CommitmentItem): any[] {
        return this.nav.link(...it.link.split('/').filter(Boolean));
    }

    iconFor(it: CommitmentItem): string {
        const tone = it.is_late ? 'text-negative' : (it.direction === 'in' ? 'text-positive-600 dark:text-positive-400' : 'text-surface-600 dark:text-surface-300');
        const glyph = it.kind.startsWith('tontine') ? 'pi-users' : (it.direction === 'in' ? 'pi-arrow-down-left' : 'pi-arrow-up-right');
        return `${glyph} ${tone}`;
    }

    kindLabel(it: CommitmentItem): string {
        const key = it.kind === 'tontine_late' && it.count > 1 ? 'tontine_late_many' : it.kind;
        return this.t('dashboard.upcoming.kind.' + key, { n: it.count });
    }

    when(it: CommitmentItem): string {
        if (it.is_late) return this.t('dashboard.upcoming.late', { n: Math.abs(it.days) });
        if (it.days === 0) return this.t('dashboard.upcoming.today');
        if (it.days === 1) return this.t('dashboard.upcoming.tomorrow');
        const d = parseLocalDate(it.date);
        return d ? d.toLocaleDateString(this.i18n.lang() === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'short' }) : it.date;
    }
}
