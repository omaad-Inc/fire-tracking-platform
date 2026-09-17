/**
 * Carry `returnUrl` across the Google OAuth round trip.
 *
 * The auth guard sends an unauthenticated visitor to /auth/login?returnUrl=…
 * (e.g. /fr/pages/settings/subscription?payment=success from the PSP return
 * page). Email login reads that param back, but the Google button is a plain
 * <a href> to the backend, which redirects to /auth/callback without it. The
 * login page stashes the value here; the callback takes it once.
 *
 * Only same-origin paths are accepted (leading "/" and not "//"), so a stashed
 * value can never become an open redirect. SSR safe: without sessionStorage
 * everything is a no-op.
 */

const KEY = 'omaad_oauth_return_url';

function isSafeInternalPath(url: string): boolean {
    return url.startsWith('/') && !url.startsWith('//');
}

/** Remember where to land after OAuth; clears any stale value when absent. */
export function stashOAuthReturnUrl(url: string | null | undefined): void {
    try {
        if (url && isSafeInternalPath(url)) sessionStorage.setItem(KEY, url);
        else sessionStorage.removeItem(KEY);
    } catch { /* storage unavailable */ }
}

/** Read and clear the stashed target; null when none or unsafe. */
export function takeOAuthReturnUrl(): string | null {
    try {
        const url = sessionStorage.getItem(KEY);
        sessionStorage.removeItem(KEY);
        return url && isSafeInternalPath(url) ? url : null;
    } catch {
        return null;
    }
}
