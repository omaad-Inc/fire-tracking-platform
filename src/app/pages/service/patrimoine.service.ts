import { Injectable } from '@angular/core';

export interface PatrimoineAssetItemDto {
    name: string;
    value: number;
    deltaAbs?: number;
    deltaPct?: number;
}

@Injectable({ providedIn: 'root' })
export class PatrimoineService {
    // Centralized source of truth for assets. Swap with API later.
    async getAssets(): Promise<PatrimoineAssetItemDto[]> {
        return [
            { name: 'Immobilier', value: 120000, deltaAbs: 0, deltaPct: 0 },
            { name: 'Crypto', value: 81.39, deltaAbs: 6, deltaPct: 7.49 },
            { name: 'Compte bancaire', value: 2955, deltaAbs: 0, deltaPct: 0 },
            { name: 'PEA Bourso', value: 6500, deltaAbs: 0, deltaPct: 0 },
            { name: 'Compte Titre', value: 945, deltaAbs: 45, deltaPct: 5.0 }
        ];
    }
}


