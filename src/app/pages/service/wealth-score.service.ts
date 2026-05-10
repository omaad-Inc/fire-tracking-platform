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

    readonly hasData = computed(() => this._data() !== null);

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
