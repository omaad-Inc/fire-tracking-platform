/**
 * True on coarse-pointer (touch) devices — phones and tablets.
 *
 * Used to switch every `<p-datepicker>` to its mobile-safe mode:
 * `readonlyInput` (typing a date makes no sense on mobile, and the software
 * keyboard opening under the anchored overlay pushed the bottom bar up and
 * froze the app on iOS) + `touchUI` (a centered modal instead of an
 * input-anchored popup, immune to keyboard viewport resizes).
 * SSR-safe: false during prerender.
 */
export function isTouchDevice(): boolean {
    return typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(pointer: coarse)').matches;
}
