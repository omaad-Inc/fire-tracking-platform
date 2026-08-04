import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { FeatureFlagsService } from '../services/feature-flags.service';
import { ApiService } from '../services/api.service';

/**
 * First-run redirect (S12 Phase 6). On entering the app shell (dashboard), a
 * user with NO assets who has NOT completed onboarding is sent to the
 * full-screen concierge (ratified decision 1: auto-launch when zero-asset AND
 * not onboarding_complete). The backend flag is the source of truth, so a
 * returning zero-asset user who ALREADY completed (then deleted everything) is
 * NOT re-onboarded (ratified decision 8).
 *
 * Skipping the concierge sets a per-session flag so it is not forced again this
 * session (the dashboard nudge remains the re-entry). Fail-open: behind
 * ff_aiChat, and any error just proceeds to the app.
 */
export const onboardingRedirectGuard: CanActivateFn = () => {
    const flags = inject(FeatureFlagsService);
    const router = inject(Router);
    const api = inject(ApiService);

    if (!flags.isOn('aiChat')) return true;
    try {
        if (sessionStorage.getItem('omaad_onb_skipped') === '1') return true;
    } catch { /* storage unavailable: fall through to the check */ }

    const lang = (typeof window !== 'undefined'
        && window.location.pathname.match(/^\/(fr|en)(\/|$)/)?.[1]) || 'fr';

    return api.getOnboardingStatus().pipe(
        map((s) => (s.should_onboard ? router.createUrlTree(['/', lang, 'onboarding']) : true)),
        catchError(() => of(true)),
    );
};
