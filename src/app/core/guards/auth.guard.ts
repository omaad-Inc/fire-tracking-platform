import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { timeout } from 'rxjs';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';
import { CACHE_RESET } from '../services/cache-reset.token';
import { ShareContextService } from '../services/share-context.service';

export const authGuard: CanActivateFn = (route, state) => {
    const tokenService = inject(TokenService);
    const authService = inject(AuthService);
    const router = inject(Router);
    const cacheReset = inject(CACHE_RESET);

    // Entering the real app clears any public-share mode left over from viewing
    // a /share/:token link in this tab (so a logged-in user's own app is live,
    // not stuck read-only on the frozen snapshot).
    inject(ShareContextService).deactivate();

    if (tokenService.isAuthenticated()) {
        return true;
    }

    const currentLang = state.url.match(/^\/(fr|en)/)?.[1] || 'fr';
    const loginTree = router.createUrlTree([`/${currentLang}/auth/login`], {
        queryParams: { returnUrl: state.url },
    });

    // P4-SEC-1: no in-memory access token (cold load / hard reload). The token
    // is never in localStorage anymore; the session is restored from the
    // httpOnly refresh cookie.
    //
    // Optimistic shell: when the device has a session hint (the persisted
    // profile, written at login and cleared at logout/forceLogin), let the
    // route activate NOW so the app chrome + skeletons replace the boot splash
    // immediately, instead of blanking through the whole /auth/refresh
    // round-trip (slow backend makes that seconds). Data requests don't race
    // ahead: the interceptor holds them on the same single-flight restore.
    //
    // Logout discipline (premium rule): ONLY a definitive server verdict
    // (ensureSession emits null on a 401/403) clears the session. A transient
    // failure (timeout, network, 5xx, deploy blip, cold start) lands on the
    // error channel and must NOT log the user out: they keep the shell and
    // their session; data surfaces show retryable errors instead. The 30s
    // timeout only bounds how long we wait for a verdict, it is not one.
    if (tokenService.getUser()) {
        authService.ensureSession().pipe(
            timeout(30000),
        ).subscribe({
            next: token => {
                if (token === null) {
                    tokenService.clear();
                    cacheReset.next(); // incl. on-device snapshots (privacy)
                    router.navigateByUrl(loginTree);
                }
            },
            error: () => { /* transient: no verdict, keep the session */ },
        });
        return true;
    }

    // No hint: this device was never logged in (or logged out) — straight to
    // login with zero network wait.
    return loginTree;
};

export const guestGuard: CanActivateFn = (route, state) => {
    const tokenService = inject(TokenService);
    const router = inject(Router);

    if (!tokenService.isAuthenticated()) {
        return true;
    }

    // Already logged in - redirect to dashboard
    const currentLang = state.url.match(/^\/(fr|en)/)?.[1] || 'fr';
    router.navigate([`/${currentLang}`]);
    return false;
};

