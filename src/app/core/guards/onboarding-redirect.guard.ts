import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FeatureFlagsService } from '../services/feature-flags.service';
import { ApiService } from '../services/api.service';

/**
 * Session flags so the background check runs at most once and never repeats
 * once we've seen the user is past onboarding. Reset on a full page reload.
 */
let resolvedPastOnboarding = false;
let checkInFlight = false;

/**
 * First-run redirect (S12 Phase 6). A zero-asset user who has NOT completed
 * onboarding is sent to the full-screen concierge (ratified decision 1).
 *
 * NON-BLOCKING: the guard ALWAYS returns true so the dashboard navigates
 * instantly (it is a routerLink; blocking it on an API round-trip made the
 * Synthese feel slow on prod). The onboarding-status check runs in the
 * BACKGROUND and only a genuine zero-asset, not-yet-completed user is then
 * redirected to the concierge. New signups are already routed straight to
 * onboarding by the welcome flow, so they never see a dashboard flash; this
 * background path only covers a returning zero-asset user. Fail-open on error.
 */
export const onboardingRedirectGuard: CanActivateFn = () => {
    const flags = inject(FeatureFlagsService);
    const router = inject(Router);
    const api = inject(ApiService);

    if (!flags.isOn('aiChat') || resolvedPastOnboarding || checkInFlight) return true;
    try {
        if (sessionStorage.getItem('omaad_onb_skipped') === '1') return true;
    } catch { /* storage unavailable: fall through to the check */ }

    const lang = (typeof window !== 'undefined'
        && window.location.pathname.match(/^\/(fr|en)(\/|$)/)?.[1]) || 'fr';

    checkInFlight = true;
    api.getOnboardingStatus().subscribe({
        next: (s) => {
            checkInFlight = false;
            if (s.should_onboard) router.navigate(['/', lang, 'onboarding'], { replaceUrl: true });
            else resolvedPastOnboarding = true; // never check again this session
        },
        error: () => { checkInFlight = false; },
    });
    return true; // instant: the dashboard renders now, redirect (if any) follows
};
