import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService, PaymentHistoryItem, PlansResponse, SubscriptionStatus, UsageStatus } from './api.service';

/**
 * Subscription + AI-usage state for the Abonnement settings page (S11 Phase 2).
 *
 * A thin signal store over GET /billing/subscription + GET /billing/usage, with
 * the 5-minute TTL cache the other services use. The page reads these signals;
 * `state` is the single source for the hero state machine so the template never
 * re-derives it. During the beta courtesy window a user has no paid row and
 * `effective_plan` stays 'free' (courtesy grants Pro via the server gate, not
 * this field), so 'beta' is detected from `beta_courtesy` + no plan.
 */
export type SubscriptionUiState =
    | 'loading'
    | 'free'
    | 'beta'
    | 'active_prepaid'
    | 'active_auto'
    | 'cancelling'
    | 'past_due'
    | 'grace'
    | 'expired';

@Injectable({ providedIn: 'root' })
export class BillingService {
    private api = inject(ApiService);

    readonly subscription = signal<SubscriptionStatus | null>(null);
    readonly usage = signal<UsageStatus | null>(null);
    readonly payments = signal<PaymentHistoryItem[]>([]);
    /** Server-authoritative pricing ladder (the single source of prices). */
    readonly plans = signal<PlansResponse | null>(null);
    readonly loading = signal(false);
    readonly loaded = signal(false);

    private plansFetched = false;

    private lastFetch: number | null = null;
    private readonly TTL = 5 * 60 * 1000;

    readonly effectivePlan = computed(() => this.subscription()?.effective_plan ?? 'free');
    readonly betaCourtesy = computed(() => this.subscription()?.beta_courtesy ?? false);

    /** Hero state machine key, derived once from the subscription row. */
    readonly state = computed<SubscriptionUiState>(() => {
        const s = this.subscription();
        if (!s) return 'loading';
        if (!s.plan) return s.beta_courtesy ? 'beta' : 'free';
        if (s.status === 'expired' || s.status === 'cancelled') return 'expired';
        if (s.cancel_at) return 'cancelling';           // active, but won't renew
        // Lapsed but still inside the grace window. Checked BEFORE the active
        // states: the row is still ACTIVE, so without this the card rendered
        // "Actif — Expire dans 0 jour(s)" and read like a healthy plan.
        if (s.in_grace) return 'grace';
        if (s.status === 'past_due') return 'past_due';  // card dunning window
        return s.renewal_type === 'auto' ? 'active_auto' : 'active_prepaid';
    });

    /** Load (or refresh) subscription + usage + payments. Cached for 5 min
     *  unless forced.
     *
     *  The three reads fire INDEPENDENTLY rather than through a forkJoin barrier:
     *  the hero card only needs the subscription, so it must not wait on the
     *  slowest of the three (payment history is the least important section and
     *  self-hides). A previous forkJoin also meant a single failing payments
     *  call blanked the whole page. Each stream now updates its own signal, and
     *  only the subscription read is treated as load-critical. On a forced
     *  refresh with data already cached we do NOT flip `loading`, so the page
     *  keeps showing the current state while it revalidates (no skeleton flash). */
    load(force = false): void {
        const now = Date.now();
        if (!force && this.lastFetch && now - this.lastFetch < this.TTL) return;
        this.lastFetch = now;
        const cold = !this.loaded();
        if (cold) this.loading.set(true);

        this.api.getSubscription().subscribe({
            next: (sub) => {
                this.subscription.set(sub);
                this.loaded.set(true);
                this.loading.set(false);
            },
            error: () => {
                // The hero depends on this read: don't wedge the cache, allow retry.
                this.lastFetch = null;
                this.loading.set(false);
            },
        });
        // Secondary sections: stream in independently, never block the hero and
        // never blank the page if they fail (each section renders conditionally).
        this.api.getUsage().subscribe({ next: (u) => this.usage.set(u), error: () => {} });
        this.api.getPayments().subscribe({ next: (p) => this.payments.set(p), error: () => {} });
    }

    refresh(): void {
        this.load(true);
    }

    /** Fetch the pricing ladder once per session (prices are static within a
     *  session). The checkout sheet reads `plans()` instead of a hardcoded grid,
     *  so prices live in exactly one place: the server. */
    loadPlans(): void {
        if (this.plansFetched) return;
        this.plansFetched = true;
        this.api.getPlans().subscribe({
            next: (p) => this.plans.set(p),
            error: () => { this.plansFetched = false; },  // allow a later retry
        });
    }
}
