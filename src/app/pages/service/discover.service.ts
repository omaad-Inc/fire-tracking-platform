import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService, DiscoverCard, DiscoverCardsResponse } from '../../core/services/api.service';
import { CACHE_RESET } from '../../core/services/cache-reset.token';
import { cachedResource } from '../../core/util/cached-resource';

/**
 * Home "Découvrir" carousel state. The server owns who sees which card and in
 * which mode (dashboard_cards_service); this store only caches the answer for
 * the usual 5 minutes and applies a close optimistically, so the card leaves
 * the screen on the tap and not on the round trip.
 */
@Injectable({ providedIn: 'root' })
export class DiscoverService {
    private api = inject(ApiService);

    readonly resource = cachedResource<DiscoverCardsResponse>(() => this.api.getDiscoverCards());
    /** Cards closed in this session, hidden before the server confirms. */
    private readonly closed = signal<ReadonlySet<string>>(new Set());

    readonly mode = computed(() => this.resource.data()?.mode ?? null);
    readonly cards = computed<DiscoverCard[]>(() => {
        const data = this.resource.data();
        if (!data) return [];
        const closed = this.closed();
        return data.cards.filter((c) => !closed.has(c.key));
    });

    constructor() {
        inject(CACHE_RESET).subscribe(() => {
            this.resource.reset();
            this.closed.set(new Set());
        });
    }

    load(): Promise<DiscoverCardsResponse> {
        return this.resource.load();
    }

    async dismiss(key: string): Promise<void> {
        this.closed.update((set) => new Set([...set, key]));
        try {
            await firstValueFrom(this.api.dismissDiscoverCard(key));
        } catch {
            // The card is already gone from this screen; the server will simply
            // offer it again on the next load, which is the honest fallback.
        }
        this.resource.invalidate();
    }
}
