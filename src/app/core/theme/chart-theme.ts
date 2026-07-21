/**
 * Single source of truth for Chart.js colors across the app.
 *
 * Charts must be the calmest part of the UI: gridlines fade into the
 * background, axis labels are secondary text, and one accent color owns
 * the primary series. A second accent (ochre) is reserved for highlights
 * (selected slice, comparison series). Categorical palettes for things
 * like the asset-distribution donut use a warm-gray scale so the data
 * itself, not the colors, does the storytelling.
 *
 * Usage:
 *
 *   import { chartTheme } from '../core/theme/chart-theme';
 *   const t = chartTheme(this.isDark());
 *   const data = { datasets: [{ borderColor: t.series.primary, ... }] };
 *
 * `isDark` is read from the body/html `.app-dark` class, see
 * `LayoutService.isDarkTheme()` for the canonical signal.
 */

export interface ChartThemeTokens {
    /** Primary text color (titles, big numbers). */
    text: string;
    /** Secondary text (axis tick labels). */
    textMuted: string;
    /** Gridline / very subtle divider color. */
    grid: string;
    /** Card surface, used to fill chart backgrounds when needed. */
    surface: string;

    /** Standardized series palette, use these, not raw hex. */
    series: {
        primary: string;          // brand-700 / brand-300 in dark
        primarySoft: string;      // 12% opacity for area fills
        accent: string;           // ochre, for the "highlighted" line/slice
        accentSoft: string;       // ochre 12% opacity
        positive: string;         // gains
        negative: string;         // losses
        warning: string;
        muted: string;            // gray for "non-active" comparison series
    };

    /**
     * Categorical palette for things like asset-distribution donuts.
     * Warm-gray steps with a single brand accent, the highlighted slice
     * uses `series.primary`, all others walk through this scale.
     */
    categorical: string[];

    /** Tooltip styling, overrides Chart.js defaults globally. */
    tooltip: {
        background: string;
        titleColor: string;
        bodyColor: string;
        borderColor: string;
    };
}

const LIGHT: ChartThemeTokens = {
    text: '#14130F',
    textMuted: '#6E6A60',
    grid: 'rgba(20, 19, 15, 0.06)',
    surface: '#FFFFFF',

    series: {
        primary: '#1A2740',
        primarySoft: 'rgba(26, 39, 64, 0.12)',
        accent: '#C77B3C',
        accentSoft: 'rgba(199, 123, 60, 0.15)',
        positive: '#2F8F6E',
        negative: '#B0463E',
        warning: '#C68A2E',
        muted: '#C2BDB1',
    },

    categorical: [
        '#1A2740', // brand-700 (primary)
        '#C77B3C', // ochre-500 (accent)
        '#4D5F80', // brand-400
        '#D8A369', // ochre-400
        '#3D3B35', // warm-700
        '#6E6A60', // warm-500
        '#9C988C', // warm-400
        '#C2BDB1', // warm-300
    ],

    tooltip: {
        background: 'rgba(20, 19, 15, 0.95)',
        titleColor: '#FAF8F4',
        bodyColor: '#DEDAD0',
        borderColor: 'rgba(199, 123, 60, 0.25)',
    },
};

const DARK: ChartThemeTokens = {
    text: '#FAF8F4',
    textMuted: '#9C988C',
    grid: 'rgba(250, 248, 244, 0.07)',
    surface: '#14130F',

    series: {
        primary: '#8A98AE',         // brand-300, high contrast on dark bg
        primarySoft: 'rgba(138, 152, 174, 0.18)',
        accent: '#D8A369',           // ochre-400 (slightly desaturated for dark)
        accentSoft: 'rgba(216, 163, 105, 0.18)',
        positive: '#3FA886',
        negative: '#C2554D',
        warning: '#D49E45',
        muted: '#52504A',
    },

    categorical: [
        '#8A98AE', // brand-300 (primary on dark)
        '#D8A369', // ochre-400 (accent)
        '#B6BFCD', // brand-200
        '#EBD0B0', // ochre-200
        '#C2BDB1', // warm-300
        '#9C988C', // warm-400
        '#6E6A60', // warm-500
        '#52504A', // warm-600
    ],

    tooltip: {
        background: 'rgba(20, 19, 15, 0.95)',
        titleColor: '#FAF8F4',
        bodyColor: '#DEDAD0',
        borderColor: 'rgba(216, 163, 105, 0.30)',
    },
};

export function chartTheme(isDark: boolean = false): ChartThemeTokens {
    return isDark ? DARK : LIGHT;
}

/** Returns true if the document currently carries the `.app-dark` class. */
export function isDarkMode(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('app-dark')
        || document.body.classList.contains('app-dark');
}

/**
 * Apply the brand-tokenized Chart.js global defaults (font + tooltip styling).
 *
 * P2-FE-4: this used to run at app bootstrap in app.config.ts, so Chart.js was
 * pulled into the critical path on EVERY page, including the landing and login,
 * which have no charts. It now runs on demand, called by the first chart-bearing
 * component to render (idempotent, the guard makes every later call a no-op),
 * so anonymous/landing/login sessions never fetch Chart.js. The dynamic import
 * also keeps it off the eager graph and runs AFTER PrimeNG's <p-chart> has
 * registered Chart.js (avoids the historical white-screen crash).
 */
let chartDefaultsApplied = false;
export function applyChartDefaults(): void {
    if (chartDefaultsApplied) return;
    chartDefaultsApplied = true;
    import('chart.js').then(({ Chart }) => {
        Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
        Object.assign(Chart.defaults.plugins.tooltip, {
            backgroundColor: 'rgba(20, 19, 15, 0.95)',
            titleColor: '#FAF8F4',
            bodyColor: '#DEDAD0',
            titleFont: { weight: 'bold' as const, size: 13 },
            bodyFont: { size: 12 },
            padding: { top: 10, bottom: 10, left: 14, right: 14 },
            cornerRadius: 10,
            borderColor: 'rgba(199, 123, 60, 0.25)',
            borderWidth: 1,
            displayColors: true,
            boxWidth: 8,
            boxHeight: 8,
            boxPadding: 4,
            usePointStyle: true,
            caretSize: 6,
        });
    }).catch(() => { /* Chart.js not available */ });
}
