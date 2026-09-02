/**
 * Hand-off from the web to the mobile app after a hosted-checkout return.
 *
 * The PSP redirects the BROWSER, never the app (no App Links / Universal Links
 * yet: assetlinks.json + AASA + the iOS entitlement are a slice of their own).
 * The app does register the `omaad://` custom scheme on both platforms
 * (Android intent-filter host "app", iOS CFBundleURLSchemes), and go_router
 * matches on the path, so `omaad://app/settings/subscription` opens the
 * Abonnement screen. A custom scheme cannot tell us whether the app is
 * installed: `openInApp` fires the link and reports whether the page is still
 * visible shortly after, so the caller can fall back to plain instructions.
 *
 * SSR/prerender safe: every access to `navigator`/`window`/`document` is
 * guarded, and on the server everything reads as "not a phone".
 */

export const APP_SCHEME = 'omaad://app';

/** Abonnement screen, flagged as a payment return so the app force-refreshes
 *  entitlements instead of waiting for its throttled resume window. */
export const APP_LINK_SUBSCRIPTION_SUCCESS = `${APP_SCHEME}/settings/subscription?payment=success`;

/** Back to the plans page after a cancelled/failed payment. */
export const APP_LINK_PLANS = `${APP_SCHEME}/plans`;

export function isMobileDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Fire an `omaad://` link. Resolves true when the page was hidden within
 * `waitMs` (the OS switched to the app), false when it stayed visible (app not
 * installed, or the browser refused the scheme) so the caller can show the
 * "open it yourself" hint.
 */
export function openInApp(link: string, waitMs = 1500): Promise<boolean> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return Promise.resolve(false);
    }
    return new Promise<boolean>((resolve) => {
        let settled = false;
        const done = (switched: boolean) => {
            if (settled) return;
            settled = true;
            document.removeEventListener('visibilitychange', onHide);
            resolve(switched);
        };
        const onHide = () => {
            if (document.visibilityState === 'hidden') done(true);
        };
        document.addEventListener('visibilitychange', onHide);
        window.setTimeout(() => done(document.visibilityState === 'hidden'), waitMs);
        try {
            window.location.href = link;
        } catch {
            done(false);
        }
    });
}
