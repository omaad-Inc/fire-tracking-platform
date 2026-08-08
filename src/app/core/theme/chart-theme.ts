/**
 * Single source of truth for Chart.js colors across the app.
 *
 * Charts must be the calmest part of the UI: gridlines fade into the
 * background, axis labels are secondary text, and one accent color owns
 * the primary series. A second accent (ochre) is reserved for highlights
 * (selected slice, comparison series). Categorical palettes for things
 * like the asset-distribution donut use one muted jewel-tone set shared by
 * both light and dark (slot i is the same hue in each mode), tuned so the
 * data, not loud colors, does the storytelling while staying legible.
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

    // Muted jewel tones, mirroring the DARK set's hue order (so a donut slice
    // keeps its hue across modes) with teal + olive darkened for white
    // contrast. Validated with the dataviz six-checks against #FFFFFF: all 8 in
    // the lightness band, chroma >= 0.10, adjacent-pair CVD >= 7.8 (floor band,
    // relies on the donut's 2px slice gaps as secondary encoding), normal-vision
    // >= 15.7, contrast >= 3:1. Do NOT hand-edit a slot without re-running the
    // validator (scripts/validate_palette.js).
    categorical: [
        '#C77B3C', // ochre (brand anchor)
        '#5B84C4', // steel blue
        '#A98F2C', // gold
        '#B0574A', // terracotta
        '#0B8DA0', // teal (darkened for white contrast)
        '#9678D6', // violet
        '#6E8A3C', // olive (darkened for white contrast)
        '#B6699F', // mauve
    ],

    tooltip: {
        background: 'rgba(20, 19, 15, 0.95)',
        titleColor: '#FAF8F4',
        bodyColor: '#DEDAD0',
        borderColor: 'rgba(199, 123, 60, 0.25)',
    },
};

// Dark tokens sit on the navy ramp (surface-900 #111B2E cards). The hero
// money series is OCHRE, not grey: in a wealth app the net-worth line is
// the brand. Categorical palette validated (dark-mode audit Batch 3) with
// the dataviz six-checks script against #111B2E: all 8 slots in the OKLCH
// L 0.48-0.67 band, chroma >= 0.10, adjacent-pair CVD >= 6.9 with donut
// slice gaps + legends as the required secondary encoding.
const DARK: ChartThemeTokens = {
    text: '#F5F7FB',
    textMuted: '#8593AB',
    grid: 'rgba(245, 247, 251, 0.08)',
    surface: '#111B2E',

    series: {
        primary: '#D8A369',          // ochre-400: the money line
        primarySoft: 'rgba(216, 163, 105, 0.16)',
        accent: '#5B84C4',           // steel blue: comparison series vs the ochre hero
        accentSoft: 'rgba(91, 132, 196, 0.16)',
        positive: '#3FA886',
        negative: '#C2554D',
        warning: '#D49E45',
        muted: '#5C6B89',
    },

    categorical: [
        '#C77B3C', // ochre (brand anchor)
        '#5B84C4', // steel blue
        '#A98F2C', // gold
        '#B0574A', // terracotta
        '#2FA3B5', // teal
        '#9678D6', // violet
        '#86A04B', // olive
        '#B6699F', // mauve
    ],

    tooltip: {
        background: '#1F2D47',
        titleColor: '#F5F7FB',
        bodyColor: '#CBD3E1',
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

/** True when the user asked the OS for reduced motion. Chart draw-in, count-ups,
 *  and other decorative motion should be skipped when this is set (S5-4). */
export function prefersReducedMotion(): boolean {
    return typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
        // Reduced-motion: kill chart draw-in globally. Covers every chart that
        // doesn't set its own `animation` (insights line, patrimoine donut, …);
        // charts that override animation guard it themselves with prefersReducedMotion().
        if (prefersReducedMotion()) {
            (Chart.defaults as any).animation = false;
        }
    }).catch(() => { /* Chart.js not available */ });
}
