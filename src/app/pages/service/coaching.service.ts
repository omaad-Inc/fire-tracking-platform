import { Injectable, inject, computed } from '@angular/core';
import { firstValueFrom, merge } from 'rxjs';

import { ApiService, CoachingRecommendation } from '../../core/services/api.service';
import { I18nService } from '../../i18n/i18n.service';
import { CurrencyService } from '../../core/services/currency.service';
import { CACHE_RESET } from '../../core/services/cache-reset.token';
import { cachedResource } from '../../core/util/cached-resource';
import { AssetsStateService } from './assets-state.service';

/**
 * Shared coaching data source (Sprint 6-3). One cached fetch feeds the Conseils
 * tab, the wealth-score axis actions, and the home-hero nudge.
 *
 * Recommendations are STATE-DRIVEN, not dismissible: each reflects the user's
 * current finances (an over-budget category, an off-pace goal…) and disappears
 * only when the underlying situation actually improves. Letting a user click a
 * live over-budget alert away into a false "all clear" would break trust, so
 * there is deliberately no dismiss. A proper time-based "snooze" can come later
 * if wanted, but it must never claim all-clear while a real issue stands.
 */
@Injectable({ providedIn: 'root' })
export class CoachingService {
    private api = inject(ApiService);
    private i18n = inject(I18nService);
    private cs = inject(CurrencyService);
    private state = inject(AssetsStateService);

    private resource = cachedResource<CoachingRecommendation[]>(
        () => firstValueFrom(this.api.getCoachingRecommendations()).then(r => r.recommendations),
    );

    constructor() {
        inject(CACHE_RESET).subscribe(() => this.resource.reset());
        // A money mutation can change the advice — drop the cache so the next read refetches.
        merge(
            this.state.assetsUpdated$, this.state.debtsUpdated$,
            this.state.savingsUpdated$, this.state.transactionsUpdated$,
        ).subscribe(() => this.resource.invalidate());
    }

    /** Live list (updates when a background revalidation lands). */
    readonly recommendations = computed(() => this.resource.data() ?? []);

    /** The single highest-ranked recommendation (for the hero nudge), or null. */
    readonly top = computed(() => this.recommendations()[0] ?? null);

    /** The top recommendation for a given wealth-score axis (S6-2). */
    forAxis(axis: string): CoachingRecommendation | null {
        return this.recommendations().find(r => r.axis === axis) ?? null;
    }

    load(): Promise<CoachingRecommendation[]> { return this.resource.load(); }

    // ── Rendering helpers (resolve i18n keys + params) ───────────────────────

    title(r: CoachingRecommendation): string { return this.i18n.t(r.title_key); }
    action(r: CoachingRecommendation): string { return this.i18n.t(r.action_key); }

    /** The "because" clause: metrics render as-is; amounts are EUR-base → format
     *  via CurrencyService (EUR→display, respecting the double-convert rule);
     *  category/asset context is localized where it's a known category slug. */
    detail(r: CoachingRecommendation): string {
        const params: Record<string, string | number> = { ...r.metrics };
        for (const [k, v] of Object.entries(r.amounts)) params[k] = this.cs.format(v);
        for (const [k, v] of Object.entries(r.context)) {
            params[k] = k === 'category' ? this.i18n.t('categories.' + v) : v;
        }
        return this.i18n.t(r.detail_key, params);
    }
}
