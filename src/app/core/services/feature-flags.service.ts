import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Feature flags (S12 Phase 1).
 *
 * Resolution order per flag:
 *   1. localStorage override `omaad_ff_<flag>` = '1' | '0'  (device-level flip,
 *      lets the owner turn a dark feature on against the deployed build)
 *   2. build-time default from environment.featureFlags
 *
 * Flags are exposed as signals so guards/templates react if an override is
 * applied at runtime (setOverride triggers the update without a reload).
 */
export type FeatureFlag = keyof typeof environment.featureFlags;

const STORAGE_PREFIX = 'omaad_ff_';

@Injectable({ providedIn: 'root' })
export class FeatureFlagsService {
    private state = signal<Record<FeatureFlag, boolean>>(this.resolveAll());

    /** Current value of a flag (override-aware). */
    isOn(flag: FeatureFlag): boolean {
        return this.state()[flag];
    }

    /** Reactive read for templates/computed. */
    aiChat = (): boolean => this.isOn('aiChat');

    /** Persist a device-level override and update the live state. */
    setOverride(flag: FeatureFlag, value: boolean | null): void {
        try {
            if (value === null) localStorage.removeItem(STORAGE_PREFIX + flag);
            else localStorage.setItem(STORAGE_PREFIX + flag, value ? '1' : '0');
        } catch { /* storage unavailable: keep in-memory only */ }
        this.state.set(this.resolveAll(flag, value));
    }

    private resolveAll(pending?: FeatureFlag, pendingValue?: boolean | null): Record<FeatureFlag, boolean> {
        const defaults = environment.featureFlags;
        const out = {} as Record<FeatureFlag, boolean>;
        (Object.keys(defaults) as FeatureFlag[]).forEach((flag) => {
            let v = defaults[flag];
            try {
                const stored = typeof localStorage !== 'undefined'
                    ? localStorage.getItem(STORAGE_PREFIX + flag) : null;
                if (stored === '1') v = true;
                else if (stored === '0') v = false;
            } catch { /* SSR / storage blocked: build-time default */ }
            if (flag === pending && pendingValue !== null && pendingValue !== undefined) v = pendingValue;
            out[flag] = v;
        });
        return out;
    }
}
