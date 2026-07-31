import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { FeatureFlagsService } from '../services/feature-flags.service';

/**
 * Route gate for dark-shipped features (S12 Phase 1). With the flag off the
 * route does not match at all and the user lands back on the dashboard in
 * their current language (never the notfound page: the URL is valid, the
 * feature just is not open yet).
 */
export const aiChatGuard: CanMatchFn = () => {
    const flags = inject(FeatureFlagsService);
    if (flags.isOn('aiChat')) return true;
    const lang = typeof window !== 'undefined' && window.location.pathname.match(/^\/(fr|en)(\/|$)/)?.[1] || 'fr';
    return inject(Router).createUrlTree(['/', lang]);
};
