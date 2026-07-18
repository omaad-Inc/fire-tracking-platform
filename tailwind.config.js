/** @type {import('tailwindcss').Config} */
import PrimeUI from 'tailwindcss-primeui';

export default {
    darkMode: ['selector', '[class="app-dark"]'],
    content: ['./src/**/*.{html,ts,scss,css}', './index.html'],
    plugins: [PrimeUI],
    theme: {
        screens: {
            sm: '576px',
            md: '768px',
            lg: '992px',
            xl: '1200px',
            '2xl': '1920px'
        },
        extend: {
            // ════════════════════════════════════════════════════════════
            // OMAAD WEALTH — Brand palette (Phase 0)
            // Two hues: Midnight Navy (brand) + Savanna Ochre (accent).
            // Plus a warm-neutral scale and three semantic data colors.
            // ════════════════════════════════════════════════════════════
            colors: {
                // Primary — Midnight Navy
                brand: {
                    50:  '#EFF2F7',
                    100: '#D8DFEC',
                    200: '#B6BFCD',
                    300: '#8A98AE',
                    400: '#4D5F80',
                    500: '#2C3E5E',
                    600: '#233356',
                    700: '#1A2740',
                    800: '#14203A',
                    900: '#0F1A2E',
                    950: '#08111E',
                    DEFAULT: '#1A2740',
                },
                // Accent — Savanna Ochre
                // ⚠️ WCAG: ochre-400/500/600 backgrounds MUST use dark text
                // (text-warm-900, ~5.4:1) — never text-white (~3.4:1, fails AA).
                ochre: {
                    50:  '#FBF4E9',
                    100: '#F4E5D2',
                    200: '#EBD0B0',
                    300: '#DFB78A',
                    400: '#D8A369',
                    500: '#C77B3C',
                    600: '#AB6630',
                    700: '#95541F',
                    800: '#71421C',
                    900: '#523019',
                    950: '#2D1B0E',
                    DEFAULT: '#C77B3C',
                },
                // Warm-neutral scale (replaces cool slate/gray for "premium financial" feel)
                warm: {
                    0:   '#FFFFFF',
                    50:  '#FAF8F4',
                    100: '#F1EDE5',
                    200: '#DEDAD0',
                    300: '#C2BDB1',
                    400: '#9C988C',
                    500: '#6E6A60',
                    600: '#52504A',
                    700: '#3D3B35',
                    800: '#26241F',
                    900: '#14130F',
                    950: '#0A0907',
                },
                // Semantic — used ONLY inside data (chart series, status badges, +/- amounts)
                positive: {
                    DEFAULT: '#2F8F6E',
                    50:  '#EAF4EF',
                    100: '#D0E8DC',
                    400: '#3FA886',
                    500: '#2F8F6E',
                    600: '#27795C',
                    700: '#1F6249',
                },
                warning: {
                    DEFAULT: '#C68A2E',
                    50:  '#FAF1DE',
                    100: '#F4E1B7',
                    400: '#D49E45',
                    500: '#C68A2E',
                    600: '#A47220',
                    700: '#7E5818',
                },
                negative: {
                    DEFAULT: '#B0463E',
                    50:  '#F8E6E4',
                    100: '#EFC9C5',
                    400: '#C2554D',
                    500: '#B0463E',
                    600: '#933832',
                    700: '#742B26',
                },
            },
            fontFamily: {
                // Inter is loaded in index.html; we set it as the default sans stack.
                sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
            },
            borderRadius: {
                // Standardized: 12px inputs · 16px cards · 9999px pills
                xl: '0.75rem',     // 12px (inputs, small buttons)
                '2xl': '1rem',     // 16px (cards, dialogs)
                '3xl': '1.25rem',  // 20px (large hero cards only)
            },
            boxShadow: {
                // One subtle card shadow + one lifted shadow for modals; that's it.
                card:    '0 1px 3px rgba(20, 19, 15, 0.05), 0 1px 2px rgba(20, 19, 15, 0.04)',
                lifted:  '0 8px 24px rgba(15, 26, 46, 0.10), 0 4px 12px rgba(20, 19, 15, 0.04)',
            },
            fontFeatureSettings: {
                tnum: '"tnum" 1, "lnum" 1',
            },
            // Premium weight depth: light (labels/secondary) + extrabold (display).
            fontWeight: {
                light: '300',
                extrabold: '800',
            },
            // Semantic type scale — tight leading + negative tracking for display sizes.
            // (Additive; standard text-xs…text-7xl still available.)
            fontSize: {
                eyebrow:      ['0.75rem',  { lineHeight: '1',    letterSpacing: '0.08em'  }],
                'display':    ['3.5rem',   { lineHeight: '1.05', letterSpacing: '-0.025em' }],
                'display-sm': ['2.75rem',  { lineHeight: '1.1',  letterSpacing: '-0.02em' }],
                title:        ['2rem',     { lineHeight: '1.15', letterSpacing: '-0.02em' }],
            },
            // Named motion curves so transitions feel intentional & consistent.
            transitionTimingFunction: {
                standard:   'cubic-bezier(0.4, 0, 0.2, 1)',
                emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
                decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
            },
        }
    }
};
