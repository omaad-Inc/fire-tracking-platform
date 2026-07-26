/**
 * Replace the narrow no-break space (U+202F) that Intl emits as the fr-FR
 * thousands separator with a regular no-break space (U+00A0).
 *
 * Why: our self-hosted Inter subset (and the system fonts of many budget
 * Android devices common in our market) has no glyph for U+202F, so grouped
 * numbers like "100 000 FCFA" render with a tofu box between the groups,
 * in the DOM and inside Chart.js canvas text. U+00A0 is universally covered
 * and keeps the no-break behavior.
 *
 * Wrap EVERY user-facing Intl.NumberFormat / toLocaleString money output
 * with this helper.
 */
export const nbspSafe = (s: string): string => s.replace(/\u202F/g, '\u00A0');
