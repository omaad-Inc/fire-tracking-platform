import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { ApiService, CustomCategory, CustomCategoryCreate } from './api.service';
import { I18nService } from '../../i18n/i18n.service';
import { CATEGORY_CONFIG } from '../../pages/service/transactions.service';

export interface ResolvedCategory {
    label: string;
    icon: string;
    color: string;
    isCustom: boolean;
}

const CUSTOM_PREFIX = 'custom:';
const FALLBACK_ICON = 'pi pi-tag';
const FALLBACK_COLOR = '#8A98AE';

/**
 * Single resolver for a transaction category value -> { label, icon, color }
 * (S13 PRO-4). Built-ins come from CATEGORY_CONFIG + i18n; user-defined
 * "custom:<id>" values come from the cached custom-category list. The cache is
 * loaded once and refreshed on any CRUD mutation so pickers stay in sync.
 */
@Injectable({ providedIn: 'root' })
export class CustomCategoryService {
    private api = inject(ApiService);
    private i18n = inject(I18nService);

    readonly categories = signal<CustomCategory[]>([]);
    /** True once the first fetch has settled (drives cold-start skeletons). */
    readonly ready = signal(false);
    private loaded = false;

    readonly income = computed(() => this.categories().filter(c => c.kind === 'income'));
    readonly expense = computed(() => this.categories().filter(c => c.kind === 'expense'));

    /** Fetch the user's custom categories once (or force a refresh). */
    load(force = false): void {
        if (this.loaded && !force) return;
        this.loaded = true;
        this.api.getCustomCategories().subscribe({
            next: cats => { this.categories.set(cats); this.ready.set(true); },
            error: () => { this.loaded = false; this.ready.set(true); },
        });
    }

    forType(type: 'Income' | 'Expense' | string): CustomCategory[] {
        const kind = type === 'Income' ? 'income' : 'expense';
        return this.categories().filter(c => c.kind === kind);
    }

    static isCustom(value: string | null | undefined): boolean {
        return !!value && value.startsWith(CUSTOM_PREFIX);
    }

    byValue(value: string | null | undefined): CustomCategory | undefined {
        if (!CustomCategoryService.isCustom(value)) return undefined;
        return this.categories().find(c => c.value === value);
    }

    /** Full presentation for any category value (built-in or custom). */
    resolve(value: string | null | undefined): ResolvedCategory {
        const v = value || 'other_expense';
        if (CustomCategoryService.isCustom(v)) {
            const cc = this.byValue(v);
            return {
                label: cc?.label ?? v,
                icon: cc?.icon || FALLBACK_ICON,
                color: cc?.color || FALLBACK_COLOR,
                isCustom: true,
            };
        }
        const cfg = CATEGORY_CONFIG[v];
        return {
            label: this.i18n.categoryLabel(v),
            icon: cfg?.icon || FALLBACK_ICON,
            color: cfg?.color || FALLBACK_COLOR,
            isCustom: false,
        };
    }

    label(value: string | null | undefined): string {
        return this.resolve(value).label;
    }

    // ── CRUD (refresh the cache so every picker updates) ──
    create(data: CustomCategoryCreate): Observable<CustomCategory> {
        return this.api.createCustomCategory(data).pipe(tap(() => this.load(true)));
    }

    update(id: number, changes: Partial<CustomCategoryCreate>): Observable<CustomCategory> {
        return this.api.updateCustomCategory(id, changes).pipe(tap(() => this.load(true)));
    }

    remove(id: number): Observable<void> {
        return this.api.deleteCustomCategory(id).pipe(tap(() => this.load(true)));
    }
}
