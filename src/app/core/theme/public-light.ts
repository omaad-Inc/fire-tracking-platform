/**
 * Public marketing routes are LIGHT ONLY (landing redesign, 2026-10).
 *
 * The landing, blog, FAQ, legal, support and the public BRVM tools render in
 * light mode regardless of the saved app theme and of the OS preference: a
 * marketing page is one object with one look, like every premium fintech site
 * (none of Finary, Wise, PayPal, N26 or Revolut exposes a theme toggle). The
 * authenticated app keeps the user's preference untouched: the saved setting
 * (`omaad-layout-config`) is never written by this rule, only the painted
 * class is gated (see LayoutService.toggleDarkMode).
 *
 * Deliberately NOT in this list: `/:lang/auth/**` (the sign-in island follows
 * the user's theme, as on mobile) and `/share/:token` (it reuses the app shell
 * and is product UI, not marketing).
 *
 * The SAME regex is inlined in `src/index.html` (anti-flash script, runs before
 * Angular) so a dark-mode user never sees a dark first frame on a public page.
 * `tools/public-light-guard.mjs` fails the build if the two copies diverge.
 */
export const PUBLIC_LIGHT_PATH_SOURCE = String.raw`^\/(?:$|(?:fr|en)\/(?:landing|blog|faq|legal|qui-sommes-nous|about|tools|fire-africa)(?:\/|$)|outils(?:\/|$)|confidentialite(?:\/|$)|supprimer-mon-compte(?:\/|$)|support(?:\/|$)|paiement\/|g\/)`;

export const PUBLIC_LIGHT_PATH = new RegExp(PUBLIC_LIGHT_PATH_SOURCE);

/** True when `url` (a pathname or a router URL with query/fragment) is a forced-light public page. */
export function isPublicLightPath(url: string): boolean {
    const pathname = url.split(/[?#]/)[0] || '/';
    return PUBLIC_LIGHT_PATH.test(pathname);
}
