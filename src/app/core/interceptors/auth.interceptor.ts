import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { TokenService } from '../services/token.service';

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
                // Token expired or invalid - clear and redirect to login
                tokenService.clear();
                const currentLang = router.url.match(/^\/(fr|en)/)?.[1] || 'fr';
                router.navigate([`/${currentLang}/auth/login`]);
            }
            return throwError(() => error);
        })
    );
};
