import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { TokenService } from '../services/token.service';

export const authGuard: CanActivateFn = (route, state) => {
    const tokenService = inject(TokenService);
    const router = inject(Router);

    if (tokenService.isAuthenticated()) {
        return true;
    }

    // Get current language from URL or default to 'fr'
    const currentLang = state.url.match(/^\/(fr|en)/)?.[1] || 'fr';
    router.navigate([`/${currentLang}/auth/login`], {
        queryParams: { returnUrl: state.url }
    });
    return false;
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

