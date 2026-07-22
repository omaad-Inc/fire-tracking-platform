import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';
import { ShareContextService } from '../services/share-context.service';

export const authGuard: CanActivateFn = (route, state) => {
    const tokenService = inject(TokenService);
    const authService = inject(AuthService);
    const router = inject(Router);

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
    // is never in localStorage anymore, so try to restore the session from the
    // httpOnly refresh cookie before bouncing to login.
    return authService.refreshToken().pipe(
        map(res => (res?.access_token ? true : loginTree)),
        catchError(() => of(loginTree)),
    );
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

