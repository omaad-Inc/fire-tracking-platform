import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService, InsightsResponse } from '../../core/services/api.service';
import { AssetsStateService } from './assets-state.service';
import { CACHE_RESET } from '../../core/services/cache-reset.token';
import { CachedResource, cachedResource } from '../../core/util/cached-resource';

/**
 * Cache for the Analyses (insights) page.
 *
 * The page used to read a FIXED 6-month window (the 6 was hardcoded at this
 * call site even though ApiService.getInsights and the backend both already
 * took the parameter). It now offers 3M/6M/12M/Max, so this keeps ONE
 * cachedResource per window rather than one shared resource that would refetch
 * every time the user toggled: flipping 6M -> 12M -> 6M serves the second 6M
 * read from cache. Each window keeps its own TTL + stale-while-revalidate +
 * in-flight dedup (P2-FE-1); a transaction write stales all of them.
 */
@Injectable({ providedIn: 'root' })
export class InsightsService {
    private api = inject(ApiService);
    private state = inject(AssetsStateService);

    /** One resource per month-window, created on first use. */
    private resources = new Map<number, CachedResource<InsightsResponse>>();

    private resourceFor(months: number): CachedResource<InsightsResponse> {
        const key = InsightsService.clampMonths(months);
        let res = this.resources.get(key);
        if (!res) {
            res = cachedResource<InsightsResponse>(
                () => firstValueFrom(this.api.getInsights(undefined, key)),
            );
            this.resources.set(key, res);
        }
        return res;
    }

    /** The backend bounds `months` to 2..24 (verified in the OpenAPI schema), so
     *  "Max" is 24 and an out-of-range value from a hand-edited URL is pulled
     *  back in rather than producing a 422. */
    static clampMonths(months: number): number {
        if (!Number.isFinite(months)) return 6;
        return Math.min(24, Math.max(2, Math.round(months)));
    }

    constructor() {
        // Spending analytics are derived from transactions; any tx write stales
        // EVERY window, not just the one on screen.
        this.state.transactionsUpdated$.subscribe(() => {
            for (const res of this.resources.values()) res.invalidate();
        });
        // Clear on logout/login (prevents cross-user cache bleed, P1-10).
        inject(CACHE_RESET).subscribe(() => {
            for (const res of this.resources.values()) res.reset();
            this.resources.clear();
        });
    }

    /** Insights for a window (cached: TTL + stale-while-revalidate + dedup). */
    get(months = 6): Promise<InsightsResponse> {
        return this.resourceFor(months).load();
    }

    /** Whether THIS window has loaded at least once (for no-flash re-entry). */
    hasCached(months = 6): boolean {
        return this.resourceFor(months).peek() !== null;
    }

    /** Cached insights for this window, synchronously (null if none). */
    getCached(months = 6): InsightsResponse | null {
        return this.resourceFor(months).peek();
    }
}
