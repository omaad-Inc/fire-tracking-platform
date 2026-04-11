import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { TokenService } from '../services/token.service';

// Get token set time from window (set by TokenService)
const getTokenSetTime = (): number | null => {
    if (typeof window !== 'undefined' && (window as any).__tokenSetTime) {
        return (window as any).__tokenSetTime;
    }
    return null;
};

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
    const tokenService = inject(TokenService);
    const router = inject(Router);
    const token = tokenService.getToken();

    // Clone request and add auth header if token exists
    let authReq = req;
    if (token) {
        authReq = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
                const currentUrl = router.url;
                const isAuthPage = currentUrl.includes('/auth/login') || 
                                  currentUrl.includes('/auth/register') ||
                                  currentUrl.includes('/auth/oauth');
                
                // Don't clear token or redirect if we're on an auth page
                // This prevents clearing tokens during login/registration flow
                if (!isAuthPage) {
                    // Don't clear token if it was just set (within last 5 seconds)
                    // This prevents race conditions during login
                    const tokenSetTime = getTokenSetTime();
                    const timeSinceTokenSet = tokenSetTime ? Date.now() - tokenSetTime : Infinity;
                    const isRecentLogin = timeSinceTokenSet < 5000; // 5 seconds
                    
                    if (isRecentLogin) {
                        console.warn('401 received shortly after login - not clearing token (might be race condition)', {
                            timeSinceTokenSet,
                            currentUrl,
                            error: error.message
                        });
                        return throwError(() => error);
                    }
                    
                    // Only clear token if we're on a protected route
                    // This prevents clearing tokens during initial navigation
                    const isProtectedRoute = currentUrl.match(/^\/(fr|en)(\/|$)/) && 
                                           !currentUrl.includes('/landing') &&
                                           !currentUrl.includes('/notfound');
                    
                    if (isProtectedRoute) {
                        console.warn('401 Unauthorized - clearing token and redirecting to login', {
                            currentUrl,
                            hasToken: !!token,
                            error: error.message
                        });
                        tokenService.clear();
                        if (typeof window !== 'undefined') {
                            (window as any).__tokenSetTime = null;
                        }
                        const currentLang = currentUrl.match(/^\/(fr|en)/)?.[1] || 'fr';
                        router.navigate([`/${currentLang}/auth/login`], {
                            queryParams: { returnUrl: currentUrl }
                        });
                    }
                }
            }
            return throwError(() => error);
        })
    );
};
