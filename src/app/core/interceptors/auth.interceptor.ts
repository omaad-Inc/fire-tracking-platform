import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, catchError, throwError, switchMap, retry, timer, of } from 'rxjs';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';
import { CACHE_RESET } from '../services/cache-reset.token';
import { SKIP_AUTH } from './http-context.tokens';

// SKIP_AUTH re-exported for existing importers.
export { SKIP_AUTH };

/** A 401 within this window of login is treated as a race, not a dead session. */
const JUST_LOGGED_IN_GRACE_MS = 5000;

/** Transient statuses worth retrying on an idempotent GET (flaky mobile links). */
const RETRYABLE_GET_STATUSES = new Set([0, 502, 503, 504]);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const tokenService = inject(TokenService);
    const authService = inject(AuthService);
    const router = inject(Router);
    const cacheReset = inject(CACHE_RESET);

    // withCredentials so the httpOnly refresh cookie rides along to
    // /auth/refresh + /auth/logout (P4-SEC-1). Set even for SKIP_AUTH requests
    // (the refresh call is SKIP_AUTH but must still send the cookie). The cookie
    // is path-scoped to /auth server-side, so it's a no-op on other endpoints.
    if (req.context.get(SKIP_AUTH)) {
        return next(req.clone({ withCredentials: true }));
    }

    // Cold load: no in-memory access token yet, but the device has a session
    // hint (the persisted profile — written at login, cleared at logout). Hold
    // the request on the SHARED cookie-based restore instead of letting every
    // boot call burn a doomed 401 round-trip; they all proceed the moment the
    // one /auth/refresh resolves. No hint → send anonymously as before.
    const token = tokenService.getToken();
    const token$: Observable<string | null> =
        token ? of(token)
        : tokenService.getUser() ? authService.ensureSession()
        : of(null);

    return token$.pipe(switchMap(tok => dispatch(req, next, tok, tokenService, authService, router, cacheReset)));
};

function dispatch(
    req: HttpRequest<unknown>,
    next: HttpHandlerFn,
    token: string | null,
    tokenService: TokenService,
    authService: AuthService,
    router: Router,
    cacheReset: Subject<void>,
): Observable<HttpEvent<unknown>> {
    const authReq = token
        ? req.clone({ withCredentials: true, setHeaders: { Authorization: `Bearer ${token}` } })
        : req.clone({ withCredentials: true });

    let handled = next(authReq);

    // Retry transient failures on idempotent GETs (many users are on flaky
    // mobile networks). Non-transient errors (incl. 401/4xx) rethrow immediately.
    if (req.method === 'GET') {
        handled = handled.pipe(
            retry({
                count: 2,
                delay: (error, attempt) => {
                    if (error instanceof HttpErrorResponse && RETRYABLE_GET_STATUSES.has(error.status)) {
                        return timer(300 * attempt); // 300ms, then 600ms
                    }
                    throw error;
                },
                resetOnSuccess: true,
            }),
        );
    }

    return handled.pipe(
        catchError((error: HttpErrorResponse) => {
            // Only a 401 on an authed request is our concern.
            if (error.status !== 401 || !token) {
                return throwError(() => error);
            }

            // Attempt one shared refresh, then replay the original request.
            return authService.forceRefresh().pipe(
                switchMap((newToken) => {
                    if (newToken) {
                        const replay = authReq.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } });
                        return next(replay);
                    }
                    // Refresh failed. A 401 right after login is usually a race
                    // (token not yet propagated), don't nuke the session for it.
                    const setAt = tokenService.tokenSetAt();
                    const justLoggedIn = setAt != null && (Date.now() - setAt) < JUST_LOGGED_IN_GRACE_MS;
                    if (!justLoggedIn) {
                        forceLogin(tokenService, router, cacheReset);
                    }
                    return throwError(() => error);
                }),
            );
        }),
    );
}

/** Clear the dead session and route to login, preserving where the user was. */
function forceLogin(tokenService: TokenService, router: Router, cacheReset: Subject<void>): void {
    tokenService.clear();
    // Wipe cached user data too — including the on-device dashboard snapshots
    // (cachedResource persistKey), so nothing financial survives a dead session.
    cacheReset.next();
    const currentUrl = router.url;
    const lang = currentUrl.match(/^\/(fr|en)/)?.[1] || 'fr';
    router.navigate([`/${lang}/auth/login`], { queryParams: { returnUrl: currentUrl } });
}
