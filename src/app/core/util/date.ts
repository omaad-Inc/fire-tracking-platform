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
