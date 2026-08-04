import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
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
        if (s.status === 'past_due') return 'past_due';  // card dunning window
        return s.renewal_type === 'auto' ? 'active_auto' : 'active_prepaid';
    });

    /** Load (or refresh) subscription + usage. Cached for 5 min unless forced. */
    load(force = false): void {
        const now = Date.now();
        if (!force && this.lastFetch && now - this.lastFetch < this.TTL) return;
        this.lastFetch = now;
        this.loading.set(true);
        forkJoin({
            sub: this.api.getSubscription(),
            usage: this.api.getUsage(),
            payments: this.api.getPayments(),
        }).subscribe({
            next: ({ sub, usage, payments }) => {
                this.subscription.set(sub);
                this.usage.set(usage);
                this.payments.set(payments);
                this.loaded.set(true);
                this.loading.set(false);
            },
            error: () => {
                // Don't wedge the cache on a transient failure: allow a retry.
                this.lastFetch = null;
                this.loading.set(false);
            },
        });
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
