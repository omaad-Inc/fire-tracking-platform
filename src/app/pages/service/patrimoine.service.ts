import { Injectable, inject } from '@angular/core';
import { Observable, map, catchError, of, firstValueFrom, BehaviorSubject, shareReplay } from 'rxjs';
import { ApiService, Asset, AssetCreate, AssetUpdate } from '../../core/services/api.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AssetsStateService } from './assets-state.service';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface PatrimoineAssetItemDto {
    id: number;
    name: string;
    value: number;
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
    
    // BehaviorSubject to hold the current assets list
    private _assets$ = new BehaviorSubject<PatrimoineAssetItemDto[]>([]);
    public assets$ = this._assets$.asObservable();

    // Cache storage
    private assetsCache: CacheEntry<PatrimoineAssetItemDto[]> | null = null;

    // Request deduplication
    private assetsRequest$: Observable<PatrimoineAssetItemDto[]> | null = null;

    constructor() {
        // Invalidate cache whenever assets are created/updated/deleted externally (e.g. via topbar)
        this.stateService.assetsUpdated$.subscribe(() => {
            this.assetsCache = null;
            this.assetsRequest$ = null;
        });
    }

    /**
     * Get all assets from the API (with caching)
     */
    async getAssets(): Promise<PatrimoineAssetItemDto[]> {
        // Return cached data immediately if available and fresh
        if (this.assetsCache && this.isCacheValid(this.assetsCache)) {
            // Refresh in background if stale
            if (this.isCacheStale(this.assetsCache)) {
                this.refreshAssetsBackground();
            }
            // Update BehaviorSubject with cached data
            this._assets$.next(this.assetsCache.data);
            return this.assetsCache.data;
        }
        
        // Return cached data even if stale (stale-while-revalidate)
        if (this.assetsCache) {
            // Update BehaviorSubject with cached data
            this._assets$.next(this.assetsCache.data);
            // Refresh in background
            this.refreshAssetsBackground();
            return this.assetsCache.data;
        }
        
        // No cache, fetch fresh data
        return firstValueFrom(this.getAssets$());
    }
    
    /**
     * Refresh assets in background
     */
    private refreshAssetsBackground(): void {
        if (this.assetsRequest$) return; // Already refreshing
        
        this.assetsRequest$ = this.api.getAssets().pipe(
            map(assets => {
                const mapped = assets.map(asset => this.mapAssetToDto(asset));
                this._assets$.next(mapped);
                return mapped;
            }),
            catchError(error => {
                console.error('Error fetching assets:', error);
                return of(this.assetsCache?.data || []);
            }),
            shareReplay(1)
        );
        
        firstValueFrom(this.assetsRequest$).then(data => {
            this.assetsCache = { data, timestamp: Date.now() };
            this.assetsRequest$ = null;
        });
    }

    /**
     * Get assets as Observable (with caching and deduplication)
     */
    getAssets$(): Observable<PatrimoineAssetItemDto[]> {
        // Return cached data immediately if available
        if (this.assetsCache && this.isCacheValid(this.assetsCache)) {
            this._assets$.next(this.assetsCache.data);
            return of(this.assetsCache.data);
        }
        
        // Deduplicate simultaneous requests
        if (this.assetsRequest$) {
            return this.assetsRequest$;
        }
        
        // Create new request
        this.assetsRequest$ = this.api.getAssets().pipe(
            map(assets => {
                const mapped = assets.map(asset => this.mapAssetToDto(asset));
                this._assets$.next(mapped);
                return mapped;
            }),
            catchError(error => {
                console.error('Error fetching assets:', error);
                return of(this.assetsCache?.data || []);
            }),
            shareReplay(1)
        );
        
        // Cache the result
        firstValueFrom(this.assetsRequest$).then(data => {
            this.assetsCache = { data, timestamp: Date.now() };
            this.assetsRequest$ = null;
        });
        
        return this.assetsRequest$;
    }
    
    /**
     * Refresh assets and notify subscribers (public method)
     */
    async refreshAssets(): Promise<void> {
        // Invalidate cache and fetch fresh
        this.invalidateAssetsCache();
        await this.getAssets();
        this.stateService.notifyAssetsUpdated();
    }

    /**
     * Get a single asset by ID
     */
    async getAsset(id: number): Promise<PatrimoineAssetItemDto | null> {
        try {
            const asset = await firstValueFrom(this.api.getAsset(id));
            return this.mapAssetToDto(asset);
        } catch (error) {
            console.error('Error fetching asset:', error);
            return null;
        }
    }

    /**
     * Create a new asset
     */
    async createAsset(data: AssetCreate): Promise<PatrimoineAssetItemDto | null> {
        try {
            const previousCount = this._assets$.getValue().length;
            const asset = await firstValueFrom(this.api.createAsset(data));
            const newAsset = this.mapAssetToDto(asset);
            // Add to current list and notify
            const currentAssets = this._assets$.getValue();
            this._assets$.next([...currentAssets, newAsset]);
            // Invalidate cache
            this.invalidateAssetsCache();
            this.stateService.notifyAssetsUpdated();
            if (previousCount === 0) {
                this.analytics.track('first_asset_added', { category: asset.category });
            }
            return newAsset;
        } catch (error) {
            console.error('Error creating asset:', error);
            throw error;
        }
    }

    /**
     * Update an existing asset
     */
    async updateAsset(id: number, data: AssetUpdate): Promise<PatrimoineAssetItemDto | null> {
        try {
            const asset = await firstValueFrom(this.api.updateAsset(id, data));
            const updatedAsset = this.mapAssetToDto(asset);
            // Update in current list and notify
            const currentAssets = this._assets$.getValue();
            const index = currentAssets.findIndex(a => a.id === id);
            if (index !== -1) {
                currentAssets[index] = updatedAsset;
                this._assets$.next([...currentAssets]);
            }
            // Invalidate cache
            this.invalidateAssetsCache();
            this.stateService.notifyAssetsUpdated();
            return updatedAsset;
        } catch (error) {
            console.error('Error updating asset:', error);
            throw error;
        }
    }

    /**
     * Delete an asset
     */
    async deleteAsset(id: number): Promise<void> {
        try {
            await firstValueFrom(this.api.deleteAsset(id));
            // Remove from current list and notify
            const currentAssets = this._assets$.getValue();
            this._assets$.next(currentAssets.filter(a => a.id !== id));
            // Invalidate cache
            this.invalidateAssetsCache();
            this.stateService.notifyAssetsUpdated();
        } catch (error) {
            console.error('Error deleting asset:', error);
            throw error;
        }
    }

    /**
     * Get total patrimoine value
     */
    async getTotalValue(): Promise<number> {
        const assets = await this.getAssets();
        return assets.reduce((sum, asset) => sum + asset.value, 0);
    }

    /**
     * Get assets grouped by category
     */
    async getAssetsByCategory(): Promise<Record<string, PatrimoineAssetItemDto[]>> {
        const assets = await this.getAssets();
        return assets.reduce((acc, asset) => {
            const category = asset.category || 'other';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(asset);
            return acc;
        }, {} as Record<string, PatrimoineAssetItemDto[]>);
    }

    /**
     * Map API Asset to DTO
     */
    private mapAssetToDto(asset: Asset): PatrimoineAssetItemDto {
        // Calculate delta if purchase value is available
        let deltaAbs = 0;
        let deltaPct = 0;
        
        if (asset.purchase_value && asset.purchase_value > 0) {
            deltaAbs = asset.current_value - asset.purchase_value;
            deltaPct = ((asset.current_value - asset.purchase_value) / asset.purchase_value) * 100;
        }

        return {
            id: asset.id,
            name: asset.name,
            value: asset.current_value,
            category: asset.category,
            deltaAbs: Math.round(deltaAbs * 100) / 100,
            deltaPct: Math.round(deltaPct * 100) / 100,
            institution: asset.institution ?? undefined,
            isLiquid: asset.is_liquid,
            notes: asset.notes ?? undefined
        };
    }
    
    // ==================== CACHE HELPERS ====================
    
    private isCacheValid<T>(cache: CacheEntry<T>): boolean {
        return Date.now() - cache.timestamp < CACHE_TTL;
    }
    
    private isCacheStale<T>(cache: CacheEntry<T>): boolean {
        return Date.now() - cache.timestamp >= CACHE_TTL;
    }
    
    private invalidateAssetsCache(): void {
        this.assetsCache = null;
        this.assetsRequest$ = null;
    }
    
    /**
     * Check synchronously whether cached asset data exists (avoids skeleton flash on re-entry)
     */
    hasCachedAssets(): boolean {
        return this.assetsCache !== null && this.assetsCache.data.length > 0;
    }

    /**
     * Return cached assets synchronously (or empty array if no cache).
     * Use this to pre-populate signals before async fetch to avoid skeleton flash.
     */
    getCachedAssets(): PatrimoineAssetItemDto[] {
        return this.assetsCache?.data ?? [];
    }

    /**
     * Clear all caches (useful for logout or manual refresh)
     */
    clearCache(): void {
        this.invalidateAssetsCache();
    }
}
