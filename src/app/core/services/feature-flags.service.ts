import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { BillingService } from './billing.service';
import { TokenService } from './token.service';

/**
 * Feature flags (S12 Phase 1).
 *
 * Resolution order per flag:
 *   1. localStorage override `omaad_ff_<flag>` = '1' | '0'  (device-level flip,
 *      lets the owner turn a dark feature on against the deployed build)
 *   2. build-time default from environment.featureFlags
 *
 * Opening a link with `?ff_<flag>=1|0` PERSISTS the override on the device:
 * the only workable flip on a phone, where devtools/localStorage are out of
 * reach (owner/beta-tester path against the deployed preview). `?ff_devtools=1`
 * likewise persists the dev-chrome switch (mock scenario chip).
 *
 * Flags are exposed as signals so guards/templates react if an override is
 * applied at runtime (setOverride triggers the update without a reload).
 *
 * Early access (PREM-4, Premium promise M6 "Accès anticipé aux nouveautés"):
 * a flag listed in EARLY_ACCESS_FLAGS is ON for a real Premium user
 * (`BillingService.effectivePlan() === 'premium'`, never the beta courtesy,
 * which grants Pro) before its general flip, with no override needed. The
 * registry is EXPLICIT: `aiChat` is an infra kill-switch (ENT-1), not an
 * entitlement, so it is never early-access; `aiMock` is a test driver. Every
 * genuinely new feature opts in by adding its flag to the registry. See
 * docs/FEATURE_FLAGS.md.
 */
export type FeatureFlag = keyof typeof environment.featureFlags;

const STORAGE_PREFIX = 'omaad_ff_';

/**
 * Flags Premium users get before everyone else. Empty today: the two existing
 * flags are a kill-switch and a test driver. Specs override the token.
 */
export const EARLY_ACCESS_FLAGS = new InjectionToken<readonly FeatureFlag[]>('EARLY_ACCESS_FLAGS', {
    providedIn: 'root',
    factory: () => [],
});

@Injectable({ providedIn: 'root' })
export class FeatureFlagsService {
    private state = signal<Record<FeatureFlag, boolean>>(this.resolveAll());
    private billing = inject(BillingService);
    private tokens = inject(TokenService);
    private earlyAccess = new Set<FeatureFlag>(inject(EARLY_ACCESS_FLAGS));

    constructor() {
        this.applyUrlOverrides();
    }

    /** Current value of a flag (override-aware; ON for Premium when early-access eligible). */
    isOn(flag: FeatureFlag): boolean {
        if (this.isEarlyAccess(flag)) return true;
        return this.state()[flag];
    }

    /**
     * True when the flag is on ONLY because the user is Premium and the flag
     * is in the early-access registry (for an "Accès anticipé" badge, if the
     * owner wants one). Reactive: reads the billing signal.
     */
    isEarlyAccess(flag: FeatureFlag): boolean {
        return this.earlyAccess.has(flag) && this.billing.effectivePlan() === 'premium' && !this.state()[flag];
    }

    /**
     * Start the subscription read as early as the session allows (PREM-4
     * caveat 1): called by authGuard on every in-app entry, so by the time a
     * component reads an early-access flag the plan is usually known, and
     * resolve() never waits long. A no-op while the registry is empty.
     */
    prime(): void {
        if (this.earlyAccess.size === 0 || !this.tokens.getUser()) return;
        this.billing.load();
    }

    /**
     * Route-guard read: like isOn(), but for an early-access flag with a
     * signed-in user it first waits for the subscription read, so the first
     * navigation of a Premium session does not see 'free' (PREM-4 caveat 1).
     * Flags outside the registry resolve synchronously.
     */
    async resolve(flag: FeatureFlag): Promise<boolean> {
        if (this.earlyAccess.has(flag) && !this.state()[flag] && this.tokens.user()) {
            await this.billing.ensureLoaded();
        }
        return this.isOn(flag);
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

    /** `?ff_<flag>=1|0` on any entry URL persists a device override. */
    private applyUrlOverrides(): void {
        if (typeof window === 'undefined') return;
        let params: URLSearchParams;
        try { params = new URLSearchParams(window.location.search); } catch { return; }
        // Case-INSENSITIVE lookup: the flags are camelCase (ff_aiChat) but users
        // routinely type ?ff_aichat=1, which used to silently no-op. Fold every
        // param key to lower-case and match on that.
        const lower = new Map<string, string>();
        params.forEach((val, key) => lower.set(key.toLowerCase(), val));
        (Object.keys(environment.featureFlags) as FeatureFlag[]).forEach((flag) => {
            const v = lower.get(('ff_' + flag).toLowerCase());
            if (v === '1' || v === '0') this.setOverride(flag, v === '1');
        });
        // Dev chrome (mock scenario chip) rides the same URL mechanism but is
        // not an environment flag: it only unhides debug UI on prod builds.
        const dev = lower.get('ff_devtools');
        if (dev === '1' || dev === '0') {
            try { localStorage.setItem(STORAGE_PREFIX + 'devtools', dev); } catch { /* in-memory only */ }
        }
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
