import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService, InsightsResponse } from '../../core/services/api.service';
import { AssetsStateService } from './assets-state.service';
import { CACHE_RESET } from '../../core/services/cache-reset.token';
import { cachedResource } from '../../core/util/cached-resource';

/**
 * Cache for the Analyses (insights) page. The page reads a fixed 6-month window,
 * so one shared cachedResource (P2-FE-1) keeps the tab instant on revisit
 * instead of reflashing the skeleton every time; a transaction write stales it.
 */
@Injectable({ providedIn: 'root' })
export class InsightsService {
    private api = inject(ApiService);
    private state = inject(AssetsStateService);

    private resource = cachedResource<InsightsResponse>(
        () => firstValueFrom(this.api.getInsights(undefined, 6)),
    );

    constructor() {
        // Spending analytics are derived from transactions; any tx write stales them.
        this.state.transactionsUpdated$.subscribe(() => this.resource.invalidate());
        // Clear on logout/login (prevents cross-user cache bleed, P1-10).
        inject(CACHE_RESET).subscribe(() => this.resource.reset());
    }

    /** Insights (cached: TTL + stale-while-revalidate + dedup). */
    get(): Promise<InsightsResponse> {
        return this.resource.load();
    }

    /** Whether insights have loaded at least once (for no-flash re-entry). */
    hasCached(): boolean {
        return this.resource.peek() !== null;
    }

    /** Cached insights synchronously (null if none). */
    getCached(): InsightsResponse | null {
        return this.resource.peek();
    }
}
