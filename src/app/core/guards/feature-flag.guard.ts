import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { FeatureFlag, FeatureFlagsService } from '../services/feature-flags.service';

/**
 * Route gate for dark-shipped features (S12 Phase 1). With the flag off the
 * route does not match at all and the user lands back on the dashboard in
 * their current language (never the notfound page: the URL is valid, the
 * feature just is not open yet).
 */
/**
 * Guard factory for the NEXT dark-shipped features (PREM-4): awaits the
 * early-access resolution, so a Premium user matches the route on their very
 * first navigation. `aiChatGuard` below stays synchronous on purpose: aiChat
 * is a kill-switch, never early-access.
 */
export const featureFlagGuard = (flag: FeatureFlag): CanMatchFn => async () => {
    const flags = inject(FeatureFlagsService);
    const router = inject(Router);
    if (await flags.resolve(flag)) return true;
    const lang = typeof window !== 'undefined' && window.location.pathname.match(/^\/(fr|en)(\/|$)/)?.[1] || 'fr';
    return router.createUrlTree(['/', lang]);
};

export const aiChatGuard: CanMatchFn = () => {
    const flags = inject(FeatureFlagsService);
    if (flags.isOn('aiChat')) return true;
    const lang = typeof window !== 'undefined' && window.location.pathname.match(/^\/(fr|en)(\/|$)/)?.[1] || 'fr';
    return inject(Router).createUrlTree(['/', lang]);
};
