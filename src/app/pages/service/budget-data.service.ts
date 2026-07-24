import { Injectable, inject } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';

import { ApiService, Budget, BudgetStatus } from '../../core/services/api.service';
import { CACHE_RESET } from '../../core/services/cache-reset.token';
import { cachedResource } from '../../core/util/cached-resource';
import { AssetsStateService } from './assets-state.service';

export interface BudgetData {
    budgets: Budget[];
    items: BudgetStatus[];
}

/**
 * Budgets + status behind the shared cachedResource (P2-FE-1), persisted
 * on-device (category aggregates, within the approved snapshot mandate): the
 * Budgets tab paints instantly on revisit/refresh and revalidates in the
 * background instead of blanking on two slow round-trips.
 */
@Injectable({ providedIn: 'root' })
export class BudgetDataService {
    private api = inject(ApiService);
    private state = inject(AssetsStateService);

    private resource = cachedResource<BudgetData>(
        () => firstValueFrom(forkJoin({ budgets: this.api.listBudgets(), status: this.api.getBudgetStatus() }))
            .then(({ budgets, status }) => ({ budgets, items: status.items })),
        { persistKey: 'budgets-status' },
    );

    constructor() {
        inject(CACHE_RESET).subscribe(() => this.resource.reset());
        // Spend changes move the status bars; refetch on the next read.
        this.state.transactionsUpdated$.subscribe(() => this.resource.invalidate());
    }

    /** Live value (updates when a background revalidation lands). */
    readonly data = this.resource.data;

    load(): Promise<BudgetData> { return this.resource.load(); }

    /** Budget CRUD happened: force the next load to refetch. */
    invalidate(): void { this.resource.invalidate(); }
}
