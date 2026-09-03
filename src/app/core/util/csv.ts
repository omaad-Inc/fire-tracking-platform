/**
 * CSV helpers shared by the desktop tables (P3-4 lifted them out of the
 * transactions page so the assets table exports with the same rules).
 */

/**
 * RFC 4180 quoting, plus the CSV-injection guard: a cell starting with
 * = + - @ is run as a formula by Excel/Sheets on open, so it gets an
 * apostrophe prefix that forces it to text.
 *
 * A plain negative number is EXEMPT. It trips the `-` rule but is not a
 * formula, and prefixing it makes every negative unsummable, i.e. it breaks
 * the one thing the export is for. Only a leading `-` followed by something
 * non-numeric is a risk.
 */
export function csvCell(value: string | number | null | undefined): string {
    const s = String(value ?? '');
    const plainNumber = /^-?\d+(\.\d+)?$/.test(s);
    const risky = !plainNumber && /^[=+\-@\t\r]/.test(s);
    const out = risky ? `'${s}` : s;
    return `"${out.replace(/"/g, '""')}"`;
}

/** Rows to a CRLF-joined CSV body, every cell quoted through csvCell. */
export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
    return rows.map(cols => cols.map(csvCell).join(',')).join('\r\n');
}

/**
 * Trigger a browser download of a UTF-8 CSV. The BOM makes Excel open the
 * accented FR labels as UTF-8 instead of mojibake.
 */
export function downloadCsv(filename: string, csv: string): void {
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
