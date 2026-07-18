import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../services/api.service';
import { ShareContextService } from '../services/share-context.service';

/**
 * Bootstraps the PUBLIC shared portfolio at /share/:token. Fetches the frozen
 * bundle once and puts the app into share mode, so the everyday AppLayout +
 * pages render read-only from the snapshot — no login required.
 *
 * Routes to the code gate (passcode-protected) or the unavailable screen
 * (expired / revoked / not-found) instead of activating.
 */
export const shareBootstrapGuard: CanActivateFn = async (route) => {
    const api = inject(ApiService);
    const share = inject(ShareContextService);
    const router = inject(Router);

    const token = route.paramMap.get('token') ?? route.parent?.paramMap.get('token') ?? '';

    // Already loaded (internal navigation between shared pages) — don't refetch.
    if (share.active() && share.token() === token && share.bundle()) return true;

    try {
        const bundle = await firstValueFrom(api.getPublicPortfolio(token));
        share.activate(token, bundle);
        return true;
    } catch (e) {
        const err = e as HttpErrorResponse;
        if (err.status === 401 && (err.error?.detail?.requires_code || err.error?.requires_code)) {
            return router.createUrlTree(['/share', token, 'protected']);
        }
        let reason: 'expired' | 'revoked' | 'notFound' = 'notFound';
        if (err.status === 410) {
            reason = String(err.error?.detail ?? '').toLowerCase().includes('revok') ? 'revoked' : 'expired';
        }
        return router.createUrlTree(['/share', token, 'unavailable'], { queryParams: { reason } });
    }
};
