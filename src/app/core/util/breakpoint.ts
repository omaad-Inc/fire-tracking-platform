import { DestroyRef, Signal, inject, signal } from '@angular/core';

/**
 * Reactive viewport queries (P1-2).
 *
 * The app used to have two ways to ask "is this desktop", and neither worked
 * for rendering: `LayoutService.isDesktop()` was a plain method reading
 * `window.innerWidth` (a template calling it never re-rendered on resize, and
 * it threw during prerender), and `pin.service` hardcoded its own 992px
 * cutoff. Both now go through here (P3-3, `DESKTOP` below). A layout that
 * renders a TABLE on desktop and CARDS on mobile has to be a signal:
 * `hidden lg:block` would keep both in the DOM and build every table row on a
 * phone.
 *
 * SSR/prerender safe: with no `window` the signal is a constant, so the server
 * renders the narrow branch and the client corrects on hydration.
 */

/** Tailwind's `lg`. Keep in sync with the `lg:` utilities in the templates. */
export const LG = '(min-width: 1024px)';

/**
 * The SHELL's breakpoint (P3-3): where `_responsive.scss` and `_topbar.scss`
 * swap the sidebar for the bottom bar (`min-width: 992px` / `max-width: 991px`).
 * Deliberately not `LG`: the shell and the page-level `lg:` utilities split at
 * different widths today (992 vs 1024), and this constant names the shell's
 * one so JS and CSS agree. `LayoutService.isDesktop` and the PIN lock read it.
 */
export const DESKTOP = '(min-width: 992px)';

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
