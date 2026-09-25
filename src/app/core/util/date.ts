/**
 * Format a Date as 'YYYY-MM-DD' using LOCAL date parts.
 *
 * Never use `toISOString().split('T')[0]` for user-facing dates: pickers
 * hand local midnight, and the UTC conversion stores the PREVIOUS day for
 * any user east of Greenwich (a Paris user picking the 15th would save the
 * 14th; Senegal at UTC+0 masks the bug). Found in the S7b PA-2.1 review.
 */
export function toLocalDateStr(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Parse a 'YYYY-MM-DD' string as LOCAL midnight.
 *
 * `new Date('2026-09-05')` is parsed as UTC midnight, so a user west of
 * Greenwich (the diaspora in Montréal or New York) sees September 4 in every
 * `toLocaleDateString`. Returns null for anything that is not a date.
 */
export function parseLocalDate(iso: string | null | undefined): Date | null {
    if (!iso) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
}
