import { DestroyRef, Signal, inject, signal } from '@angular/core';

/**
 * Reactive viewport queries (P1-2).
 *
 * The app already had two ways to ask "is this desktop", and neither works for
 * rendering: `LayoutService.isDesktop()` is a plain method reading
 * `window.innerWidth` (so a template calling it never re-renders on resize, and
 * it throws during prerender), and `pin.service` hardcodes a different 992px
 * cutoff. A layout that renders a TABLE on desktop and CARDS on mobile has to
 * be a signal: `hidden lg:block` would keep both in the DOM and build every
 * table row on a phone.
 *
 * SSR/prerender safe: with no `window` the signal is a constant, so the server
 * renders the narrow branch and the client corrects on hydration.
 */

/** Tailwind's `lg`. Keep in sync with the `lg:` utilities in the templates. */
export const LG = '(min-width: 1024px)';

/**
 * A signal tracking whether `query` currently matches. Must be called in an
 * injection context (field initializer / constructor); the listener is torn
 * down with the injector.
 */
export function mediaQuery(query: string): Signal<boolean> {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return signal(false).asReadonly();
    }
    const mql = window.matchMedia(query);
    const matches = signal(mql.matches);
    const onChange = (e: MediaQueryListEvent) => matches.set(e.matches);
    mql.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => mql.removeEventListener('change', onChange));
    return matches.asReadonly();
}
