import { Injectable, inject } from '@angular/core';
import { Observable, map, catchError, of, firstValueFrom } from 'rxjs';
import { ApiService, Asset, AssetCreate, AssetUpdate } from '../../core/services/api.service';

export interface PatrimoineAssetItemDto {
    id?: number;
    name: string;
    value: number;
    category?: string;
    deltaAbs?: number;
    deltaPct?: number;
    institution?: string;
    isLiquid?: boolean;
    notes?: string;
}

@Injectable({ providedIn: 'root' })
export class PatrimoineService {
    private api = inject(ApiService);

    /**
     * Get all assets from the API
     */
    async getAssets(): Promise<PatrimoineAssetItemDto[]> {
        try {
            const assets = await firstValueFrom(this.api.getAssets());
            return assets.map(asset => this.mapAssetToDto(asset));
        } catch (error) {
            console.error('Error fetching assets:', error);
            // Return empty array on error
            return [];
        }
    }

    /**
     * Get assets as Observable
     */
    getAssets$(): Observable<PatrimoineAssetItemDto[]> {
        return this.api.getAssets().pipe(
            map(assets => assets.map(asset => this.mapAssetToDto(asset))),
            catchError(error => {
                console.error('Error fetching assets:', error);
                return of([]);
            })
        );
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
            const asset = await firstValueFrom(this.api.createAsset(data));
            return this.mapAssetToDto(asset);
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
            return this.mapAssetToDto(asset);
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
}
