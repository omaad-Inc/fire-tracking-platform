import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService, WealthScoreResponse, AxisScore } from '../../core/services/api.service';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WealthScoreService {
    private api = inject(ApiService);

    private _data = signal<WealthScoreResponse | null>(null);
    private _loading = signal(false);
    private _error = signal<string | null>(null);

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

    getAxis(name: string): AxisScore | undefined {
        return this.axes().find(a => a.axis === name);
    }

    async load(): Promise<void> {
        if (this._loading()) return;
        this._loading.set(true);
        this._error.set(null);

        try {
            const result = await firstValueFrom(this.api.getWealthScore());
            this._data.set(result);
        } catch (e: any) {
            this._error.set(e?.message || 'Failed to load wealth score');
        } finally {
            this._loading.set(false);
        }
    }

    async refresh(): Promise<void> {
        this._data.set(null);
        await this.load();
    }
}
