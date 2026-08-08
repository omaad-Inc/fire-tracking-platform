import { Injectable, computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AlertRule, ApiService, Asset, SavingGoal } from '../../../core/services/api.service';
import { CACHE_RESET } from '../../../core/services/cache-reset.token';
import { cachedResource } from '../../../core/util/cached-resource';

/**
 * Data layer for Settings → Alerts (S13 PRO-1).
 *
 * The page used to fetch rules + accounts + goals uncached on every `ngOnInit`,
 * so each visit reflashed a skeleton and refired three requests (the "keeps
 * reloading every time" bug). This moves all three onto the shared P2-FE-1
 * `cachedResource` (TTL + stale-while-revalidate + in-flight dedup + device
 * snapshot), so a revisit paints instantly and refreshes in the background.
 * Registered on CACHE_RESET so a logout/user-switch can't leak a previous
 * user's rules on a shared device (P1-10).
 */
@Injectable({ providedIn: 'root' })
export class AlertsDataService {
    private api = inject(ApiService);

    private rulesRes = cachedResource<AlertRule[]>(
        () => firstValueFrom(this.api.getAlertRules()),
        { persistKey: 'alert-rules' },
    );
    private accountsRes = cachedResource<Asset[]>(
        () => firstValueFrom(this.api.getAssets()),
    );
    private goalsRes = cachedResource<SavingGoal[]>(
        () => firstValueFrom(this.api.getSavingGoals()),
    );

    /** Rules list (never null for the template; empty array before first load). */
    readonly rules = computed<AlertRule[]>(() => this.rulesRes.data() ?? []);
    readonly accounts = computed<Asset[]>(() => this.accountsRes.data() ?? []);
    readonly goals = computed<SavingGoal[]>(() => this.goalsRes.data() ?? []);

    /** Cold-loading: skeleton the list ONLY when nothing is cached yet. A
     *  background revalidation of already-cached rules must not reflash it. */
    readonly rulesLoading = computed(
        () => this.rulesRes.status() === 'loading' && this.rulesRes.data() === null,
    );

    constructor() {
        inject(CACHE_RESET).subscribe(() => {
            this.rulesRes.reset();
            this.accountsRes.reset();
            this.goalsRes.reset();
        });
    }

    /** Kick off (or serve from cache) all three reads. Safe to call on every
     *  `ngOnInit`: within the TTL it is a no-op, so revisits are free. */
    ensureLoaded(): void {
        void this.rulesRes.load();
        void this.accountsRes.load();
        void this.goalsRes.load();
    }

    /** Patch the local rules cache after a write instead of refetching. */
    setRules(rules: AlertRule[]): void {
        this.rulesRes.set(rules);
    }

    upsertRule(rule: AlertRule): void {
        const list = this.rules();
        const i = list.findIndex(r => r.id === rule.id);
        this.rulesRes.set(i === -1 ? [...list, rule] : list.map(r => (r.id === rule.id ? rule : r)));
    }

    removeRule(id: number): void {
        this.rulesRes.set(this.rules().filter(r => r.id !== id));
    }
}
