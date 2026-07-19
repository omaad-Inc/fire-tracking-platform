import { InjectionToken } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * App-wide "clear all cached user data" signal.
 *
 * Inverts the old AuthService → page-services dependency: AuthService used to
 * import 5 feature services just to call clearCache() on logout (wrong
 * direction, and a forgotten service left another user's financial data
 * cached for up to 5 min on a shared device). Now:
 *   - AuthService fires `inject(CACHE_RESET).next()` on logout/login.
 *   - Each feature service subscribes and clears its own cache.
 * A newly added cached service auto-participates just by subscribing — no
 * edit to AuthService required.
 */
export const CACHE_RESET = new InjectionToken<Subject<void>>('CACHE_RESET', {
    providedIn: 'root',
    factory: () => new Subject<void>(),
});
