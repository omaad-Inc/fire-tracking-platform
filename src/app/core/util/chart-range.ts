/**
 * The range chips shared by every progression chart (Patrimoine Brut, category
 * detail, Objectifs), and the ONE default they all open on.
 *
 * `months: 0` is the UI's "Max"; the API counts real months, so the services
 * translate it to a long window (see DashboardService). Labels are i18n keys so
 * English reads "1Y" where French reads "1A".
 */
export interface ChartRange {
    /** i18n key under common.chartRange */
    key: 'm1' | 'm3' | 'm6' | 'y1' | 'max';
    /** Window in months; 0 = all history. */
    months: number;
}

export const CHART_RANGES: readonly ChartRange[] = [
    { key: 'm1', months: 1 },
    { key: 'm3', months: 3 },
    { key: 'm6', months: 6 },
    { key: 'y1', months: 12 },
    { key: 'max', months: 0 },
];

/**
 * Owner decision 2026-09-03: open on the last month, not the whole history.
 *
 * Caveat, measured on the local stack the same day: the progression endpoint
 * yields ONE point per month, so a 1-month window is a single point and draws
 * no line (3 months is the shortest window with a visible one). Making 1M
 * meaningful needs the backend to return daily snapshots for short windows;
 * the snapshot table is already keyed by (owner, date). Until then this
 * constant is the single place to move the default.
 */
export const DEFAULT_CHART_RANGE_MONTHS = 1;
