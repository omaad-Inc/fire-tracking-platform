import { Injectable, inject } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';
import { ApiService, Asset, AssetCreate, AssetUpdate } from '../../core/services/api.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AssetsStateService } from './assets-state.service';
import { CurrencyService } from '../../core/services/currency.service';
import { CACHE_RESET } from '../../core/services/cache-reset.token';
import { cachedResource } from '../../core/util/cached-resource';

export interface PatrimoineAssetItemDto {
    id: number;
    name: string;
    value: number;          // EUR base
    currency: string;       // native currency of the asset
    category: string;
    deltaAbs?: number;
    deltaPct?: number;
    institution?: string;
    isLiquid?: boolean;
    notes?: string;
}

@Injectable({ providedIn: 'root' })
export class PatrimoineService {
    private api = inject(ApiService);
    private analytics = inject(AnalyticsService);
    private stateService = inject(AssetsStateService);
    private currency = inject(CurrencyService);

    /** Single source of truth for the asset list (shared cachedResource — P2-FE-1). */
    private assetsResource = cachedResource<PatrimoineAssetItemDto[]>(
        () => firstValueFrom(this.api.getAssets().pipe(
            map(assets => assets.map(a => this.mapAssetToDto(a))),
        )),
    );

    constructor() {
        // Invalidate whenever assets change externally (e.g. via the topbar quick-add).
        this.stateService.assetsUpdated$.subscribe(() => this.assetsResource.invalidate());
        // Clear cached user data on logout/login (see CACHE_RESET).
        inject(CACHE_RESET).subscribe(() => this.clearCache());
    }

    /** Get all assets (cached: TTL + stale-while-revalidate + dedup). */
    getAssets(): Promise<PatrimoineAssetItemDto[]> {
        return this.assetsResource.load();
    }

    /** Force a refresh and notify subscribers. */
    async refreshAssets(): Promise<void> {
        this.assetsResource.invalidate();
        await this.assetsResource.load(true);
        this.stateService.notifyAssetsUpdated();
    }

    /** Get a single asset by ID (direct, uncached). */
    async getAsset(id: number): Promise<PatrimoineAssetItemDto | null> {
        try {
            const asset = await firstValueFrom(this.api.getAsset(id));
            return this.mapAssetToDto(asset);
        } catch (error) {
            console.error('Error fetching asset:', error);
            return null;
        }
    }

    /** Create a new asset. */
    async createAsset(data: AssetCreate): Promise<PatrimoineAssetItemDto | null> {
        try {
            const previousCount = this.assetsResource.peek()?.length ?? 0;
            const asset = await firstValueFrom(this.api.createAsset(data));
            const newAsset = this.mapAssetToDto(asset);
            this.markAssetsChanged();
            if (previousCount === 0) {
                this.analytics.track('first_asset_added', { category: asset.category });
            }
            return newAsset;
        } catch (error) {
            console.error('Error creating asset:', error);
            throw error;
        }
    }

    /** Update an existing asset. */
    async updateAsset(id: number, data: AssetUpdate): Promise<PatrimoineAssetItemDto | null> {
        try {
            const asset = await firstValueFrom(this.api.updateAsset(id, data));
            const updatedAsset = this.mapAssetToDto(asset);
            this.markAssetsChanged();
            return updatedAsset;
        } catch (error) {
            console.error('Error updating asset:', error);
            throw error;
        }
    }

    /** Delete an asset. */
    async deleteAsset(id: number): Promise<void> {
        try {
            await firstValueFrom(this.api.deleteAsset(id));
            this.markAssetsChanged();
        } catch (error) {
            console.error('Error deleting asset:', error);
            throw error;
        }
    }

    /** Get total patrimoine value (EUR base). */
    async getTotalValue(): Promise<number> {
        const assets = await this.getAssets();
        return assets.reduce((sum, asset) => sum + asset.value, 0);
    }

    /** Get assets grouped by category. */
    async getAssetsByCategory(): Promise<Record<string, PatrimoineAssetItemDto[]>> {
        const assets = await this.getAssets();
        return assets.reduce((acc, asset) => {
            const category = asset.category || 'other';
            (acc[category] ??= []).push(asset);
            return acc;
        }, {} as Record<string, PatrimoineAssetItemDto[]>);
    }

    /** A write happened: drop cache freshness and notify subscribers. */
    private markAssetsChanged(): void {
        this.assetsResource.invalidate();
        this.stateService.notifyAssetsUpdated();
    }

    /** Map API Asset to DTO. */
    private mapAssetToDto(asset: Asset): PatrimoineAssetItemDto {
        // Assets are stored in their native currency; convert to the EUR base
        // here so every downstream `.value` display (which then renders via
        // <app-amount> in the user's display currency) stays correct.
        const valueEur = this.currency.toEurFromNative(asset.current_value, asset.currency);
        const purchaseEur = this.currency.toEurFromNative(asset.purchase_value ?? 0, asset.currency);

        let deltaAbs = 0;
        let deltaPct = 0;
        if (purchaseEur > 0) {
            deltaAbs = valueEur - purchaseEur;
            deltaPct = ((valueEur - purchaseEur) / purchaseEur) * 100;
        }

        return {
            id: asset.id,
            name: asset.name,
            value: valueEur,
            currency: asset.currency || 'EUR',
            category: asset.category,
            deltaAbs: Math.round(deltaAbs * 100) / 100,
            deltaPct: Math.round(deltaPct * 100) / 100,
            institution: asset.institution ?? undefined,
            isLiquid: asset.is_liquid,
            notes: asset.notes ?? undefined
        };
    }

    /** Whether cached asset data exists (avoids skeleton flash on re-entry). */
    hasCachedAssets(): boolean {
        return (this.assetsResource.peek()?.length ?? 0) > 0;
    }

    /** Return cached assets synchronously (or empty array if none). */
    getCachedAssets(): PatrimoineAssetItemDto[] {
        return this.assetsResource.peek() ?? [];
    }

    /** Clear all caches on logout/login (prevents cross-user cache bleed — P1-10). */
    clearCache(): void {
        this.assetsResource.reset();
    }
}
