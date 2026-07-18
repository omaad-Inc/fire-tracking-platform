import { Injectable, computed, signal } from '@angular/core';

/**
 * Frozen bundle served by GET /public/portfolio/{token}. Each key mirrors the
 * shape of the everyday API endpoint it was frozen from, so the real pages
 * render unchanged when ApiService returns these instead of live HTTP.
 */
export interface PublicPortfolioBundle {
    meta: {
        version: number;
        anonymized: boolean;
        values_hidden: boolean;
        share_budget: boolean;
        categories: string[] | null;
        currency: string;
        currency_symbol: string;
        owner_name: string | null;
        generated_at?: string;
    };
    user: { preferred_currency: string; preferred_language: string; currency_symbol: string };
    fx_rates: any;
    dashboard_summary: any;
    fire_metrics: any;
    asset_distribution: any[];
    expense_distribution: any[];
    worth_progression: any[];
    wealth_score: any;
    assets: any[];
    debts: any[];
    saving_goals: any[];
    transactions: any[];
    counts?: Record<string, number>;
}

/**
 * Holds the "share mode" state for the public /share/:token experience.
 * Root singleton with NO dependencies, so ApiService (and others) can inject it
 * without a circular reference. When `active()`, ApiService resolves reads from
 * `bundle()` instead of the network and the shell renders read-only.
 */
@Injectable({ providedIn: 'root' })
export class ShareContextService {
    readonly token = signal<string | null>(null);
    readonly bundle = signal<PublicPortfolioBundle | null>(null);

    readonly active = computed(() => this.bundle() !== null);
    readonly readOnly = this.active;
    readonly currency = computed(() => this.bundle()?.meta.currency ?? 'EUR');
    readonly currencySymbol = computed(() => this.bundle()?.meta.currency_symbol ?? '€');
    readonly ownerName = computed(() => this.bundle()?.meta.owner_name ?? null);
    readonly valuesHidden = computed(() => this.bundle()?.meta.values_hidden ?? false);

    /** RouterLink prefix for share mode, e.g. ['/share', '<token>']. */
    basePath(): any[] {
        return ['/share', this.token()];
    }

    activate(token: string, bundle: PublicPortfolioBundle): void {
        this.token.set(token);
        this.bundle.set(bundle);
    }

    deactivate(): void {
        this.token.set(null);
        this.bundle.set(null);
    }

    /** Read a top-level bundle key (returns undefined when not in share mode). */
    get<T = any>(key: keyof PublicPortfolioBundle): T | undefined {
        const b = this.bundle();
        return b ? (b[key] as unknown as T) : undefined;
    }

    /** Find a record by numeric id within a bundle array key. */
    getById<T = any>(key: keyof PublicPortfolioBundle, id: number): T | undefined {
        const arr = this.get<any[]>(key);
        return Array.isArray(arr) ? arr.find((r) => r?.id === id) : undefined;
    }
}
