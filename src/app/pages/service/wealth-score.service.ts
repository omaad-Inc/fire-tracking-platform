import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService, WealthScoreResponse, AxisScore } from '../../core/services/api.service';
import { firstValueFrom, merge } from 'rxjs';
import { CACHE_RESET } from '../../core/services/cache-reset.token';
import { AssetsStateService } from './assets-state.service';

/** Axis weights, mirroring AXIS_WEIGHTS in backend/app/api/v1/endpoints/wealth_score.py.
 *  A sub-score point on an axis is worth `weight` points of the total. */
export const AXIS_WEIGHTS: Readonly<Record<string, number>> = {
    epargne: 0.25,
    investissement: 0.20,
    protection: 0.15,
    planification: 0.25,
    diversification: 0.15,
};

/** The single sub-score whose missing points cost the most on the total. */
export interface ScoreLever {
    axis: string;
    subLabel: string;
    /** Total points recoverable by maxing this sub-score, rounded. */
    points: number;
}

@Injectable({ providedIn: 'root' })
export class WealthScoreService {
    private api = inject(ApiService);
    private state = inject(AssetsStateService);

    private _data = signal<WealthScoreResponse | null>(null);
    private _loading = signal(false);
    private _error = signal<string | null>(null);
    /** A money mutation happened: the next load() refetches even though _data is
     *  populated. The stale value stays on screen meanwhile. */
    private _stale = false;

    constructor() {
        inject(CACHE_RESET).subscribe(() => {
            this._data.set(null);
            this._stale = false;
        });
        // The score is derived from assets/debts/goals/transactions, so any
        // mutation invalidates it. Revalidate in the background and swap the
        // value only on success: blanking _data here would flip a mounted
        // score page into its "no data yet" state mid-session.
        merge(
            this.state.assetsUpdated$, this.state.debtsUpdated$,
            this.state.savingsUpdated$, this.state.transactionsUpdated$,
        ).subscribe(() => this.load().catch(() => { /* stale value stays visible */ }));
    }

    readonly loading = this._loading.asReadonly();
    readonly error = this._error.asReadonly();
    readonly data = this._data.asReadonly();

    readonly totalScore = computed(() => this._data()?.total_score ?? 0);
    readonly axes = computed(() => this._data()?.axes ?? []);
    readonly computedAt = computed(() => this._data()?.computed_at ?? '');

    // A freshly-registered user (no assets, no transactions) still gets a
    // computed score response, but it is all zeros. That is "not enough data
    // yet", not a real score, so treat an all-zero result as no data. This keeps
    // the widget on its neutral onboarding state instead of greeting a brand-new
    // user with a discouraging red 0/100.
    readonly hasData = computed(() => {
        const d = this._data();
        if (!d) return false;
        const total = d.total_score ?? 0;
        const anyAxis = (d.axes ?? []).some(a => (a.score ?? 0) > 0);
        return total > 0 || anyAxis;
    });

    /** The one sub-score worth the most total points if maxed out. Derived from
     *  the existing response (sub_scores carry score + max_score), so no API
     *  change is needed. Null when every sub-score is already full. */
    readonly biggestLever = computed<ScoreLever | null>(() => {
        let best: ScoreLever | null = null;
        let bestGain = 0;

        for (const axis of this.axes()) {
            const weight = AXIS_WEIGHTS[axis.axis] ?? 0;
            if (!weight) continue;

            for (const sub of axis.sub_scores ?? []) {
                const gain = Math.max(0, sub.max_score - sub.score) * weight;
                if (gain <= bestGain) continue;
                const points = Math.round(gain);
                if (points < 1) continue; // "+0 pts" is not worth a call to action
                bestGain = gain;
                best = { axis: axis.axis, subLabel: sub.label, points };
            }
        }
        return best;
    });

    getAxis(name: string): AxisScore | undefined {
        return this.axes().find(a => a.axis === name);
    }

    async load(): Promise<void> {
        // A mutation that lands mid-flight would otherwise be dropped by this
        // guard, leaving the pre-mutation score on screen: remember it and
        // refetch once the in-flight call settles.
        if (this._loading()) { this._stale = true; return; }

        do {
            this._stale = false;
            this._loading.set(true);
            this._error.set(null);

            try {
                const result = await firstValueFrom(this.api.getWealthScore());
                this._data.set(result);
            } catch (e: any) {
                this._error.set(e?.message || 'Failed to load wealth score');
                this._stale = false; // never hot-loop against a failing endpoint
            } finally {
                this._loading.set(false);
            }
        } while (this._stale);
    }

    async refresh(): Promise<void> {
        this._data.set(null);
        await this.load();
    }
}
