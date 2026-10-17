import { Injectable, inject } from '@angular/core';
import { PreloadingStrategy, Route, Router } from '@angular/router';
import { Observable, defer, from, of, switchMap } from 'rxjs';
import { isPublicLightPath } from '../theme/public-light';

/** Resolves when the browser is idle (or after `max` ms), after the load event. */
function whenIdle(max = 4000): Promise<void> {
    return new Promise((resolve) => {
        const start = () => {
            const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void };
            if (w.requestIdleCallback) w.requestIdleCallback(() => resolve(), { timeout: max });
            else setTimeout(resolve, 1500);
        };
        if (document.readyState === 'complete') start();
        else window.addEventListener('load', start, { once: true });
    });
}

/**
 * Preload every lazy chunk ONLY once the visitor is inside the app.
 *
 * `PreloadAllModules` fetched all ~170 chunks (about 4 MB uncompressed, 1 MB
 * transferred) right after the LANDING painted, so a first-time visitor on a
 * phone paid for the whole dashboard they had not signed up for: Lighthouse
 * mobile measured "interactive" at 10 s on simulated 4G with 989 kB of unused
 * JavaScript. On a public marketing page only the routes flagged
 * `data.preload === 'public'` (the sign-up and sign-in screens, the next step)
 * are preloaded; in the app the previous behaviour is kept, because hub
 * switching must never wait on a chunk download. Data Saver and 2G/3G
 * connections preload nothing anywhere.
 */
@Injectable({ providedIn: 'root' })
export class PublicAwarePreload implements PreloadingStrategy {
    private router = inject(Router);

    preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
        if (this.constrained()) return of(null);
        if (isPublicLightPath(this.router.url)) {
            // Even the sign-up chunks wait for idle: on 4G they otherwise compete
            // with the landing's own paint and push "interactive" out by seconds.
            return route.data?.['preload'] === 'public' ? defer(() => from(whenIdle()).pipe(switchMap(() => load()))) : of(null);
        }
        return load();
    }

    private constrained(): boolean {
        // Prerender: nothing to preload. Keyed on window/document, not on
        // navigator: Node 21+ defines a global `navigator`, so the old check
        // let the server reach whenIdle() and throw "document is not defined"
        // on every prerendered route (96 times per build, harmless but noisy).
        if (typeof window === 'undefined' || typeof document === 'undefined') return true;
        const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
        return !!c && (c.saveData === true || /(^|-)(2g|3g)$/.test(c.effectiveType || ''));
    }
}
