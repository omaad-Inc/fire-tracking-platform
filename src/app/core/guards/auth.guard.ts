import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { catchError, of, timeout } from 'rxjs';
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
    // profile — written at login, cleared at logout/forceLogin), let the route
    // activate NOW so the app chrome + skeletons replace the boot splash
    // immediately, instead of blanking through the whole /auth/refresh
    // round-trip (slow backend makes that seconds). Data requests don't race
    // ahead: the interceptor holds them on the same single-flight restore.
    // If the restore fails, clear the dead hint and bounce to login.
    // Cap it so a slow/dead network can't leave the user on skeletons — 8s.
    if (tokenService.getUser()) {
        authService.ensureSession().pipe(
            timeout(8000),
            catchError(() => of(null)),
        ).subscribe(token => {
            if (!token) {
                tokenService.clear();
                cacheReset.next(); // incl. on-device snapshots (privacy)
                router.navigateByUrl(loginTree);
            }
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

