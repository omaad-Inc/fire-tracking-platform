import { Injectable, inject, signal, computed } from '@angular/core';
import { firstValueFrom, merge } from 'rxjs';

import { ApiService, CoachingRecommendation } from '../../core/services/api.service';
import { I18nService } from '../../i18n/i18n.service';
import { CurrencyService } from '../../core/services/currency.service';
import { CACHE_RESET } from '../../core/services/cache-reset.token';
import { cachedResource } from '../../core/util/cached-resource';
import { AssetsStateService } from './assets-state.service';

const DISMISSED_KEY = 'omaad_coaching_dismissed';

/**
 * Shared coaching data source (Sprint 6-3). One cached fetch feeds the Conseils
 * tab, the wealth-score axis actions, and the home-hero nudge. Recommendations
 * are dismissible-with-memory (per id, device-local) so a nudge the user has
 * acted on or waved away doesn't nag on every visit; it reappears only if the
 * underlying situation changes the recommendation id.
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

    private _dismissed = signal<Set<string>>(this.loadDismissed());

    constructor() {
        inject(CACHE_RESET).subscribe(() => { this.resource.reset(); this._dismissed.set(new Set()); });
        // A money mutation can change the advice — drop the cache so the next read refetches.
        merge(
            this.state.assetsUpdated$, this.state.debtsUpdated$,
            this.state.savingsUpdated$, this.state.transactionsUpdated$,
        ).subscribe(() => this.resource.invalidate());
    }

    /** Live list (updates when a background revalidation lands), dismissed removed. */
    readonly recommendations = computed(() => {
        const dismissed = this._dismissed();
        return (this.resource.data() ?? []).filter(r => !dismissed.has(r.id));
    });

    /** The single highest-ranked recommendation (for the hero nudge), or null. */
    readonly top = computed(() => this.recommendations()[0] ?? null);

    /** The top non-dismissed recommendation for a given wealth-score axis (S6-2). */
    forAxis(axis: string): CoachingRecommendation | null {
        return this.recommendations().find(r => r.axis === axis) ?? null;
    }

    load(): Promise<CoachingRecommendation[]> { return this.resource.load(); }

    dismiss(id: string): void {
        const next = new Set(this._dismissed()); next.add(id);
        this._dismissed.set(next);
        try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next])); } catch { /* storage off */ }
    }

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

    private loadDismissed(): Set<string> {
        try {
            const raw = localStorage.getItem(DISMISSED_KEY);
            return new Set(raw ? JSON.parse(raw) as string[] : []);
        } catch { return new Set(); }
    }
}
