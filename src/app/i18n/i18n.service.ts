import { Injectable, isDevMode, signal } from '@angular/core';
import type { Dict } from './fr';

export type Lang = 'fr' | 'en';

const LANG_KEY = 'omaad_lang';

@Injectable({ providedIn: 'root' })
export class I18nService {
    // Dictionaries load on demand (P2-FE-3): only the active locale ships in the
    // initial graph; the other is a separate lazy chunk fetched on switch. The
    // active locale is awaited by an APP_INITIALIZER (see app.config.ts) so t()
    // is populated before first render, including during prerender.
    private dicts: Partial<Record<Lang, Dict>> = {};
    private loading: Partial<Record<Lang, Promise<void>>> = {};
    private warned = new Set<string>();

    lang = signal<Lang>(this.detectLang());

    constructor() {
        // Keep <html lang> in sync from the very first render so screen readers
        // use the right pronunciation (EN pages were read with FR phonetics).
        this.syncHtmlLang(this.lang());
    }

    /** Load a locale's dictionary (idempotent; concurrent calls share one import). */
    loadLang(l: Lang): Promise<void> {
        if (this.dicts[l]) return Promise.resolve();
        return (this.loading[l] ??= (l === 'fr'
            ? import('./fr').then(m => { this.dicts.fr = m.FR as unknown as Dict; })
            : import('./en').then(m => { this.dicts.en = m.EN; })
        ).finally(() => { delete this.loading[l]; }));
    }

    private detectLang(): Lang {
        // 1. localStorage
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(LANG_KEY);
            if (stored === 'en' || stored === 'fr') return stored;
            // 2. URL prefix
            const match = window.location.pathname.match(/^\/(fr|en)(\/|$)/);
            if (match) return match[1] as Lang;
        }
        return 'fr';
    }

    private syncHtmlLang(l: Lang): void {
        if (typeof document !== 'undefined') {
            document.documentElement.lang = l;
        }
    }

    /**
     * Switch language. Loads the target dictionary FIRST, then flips the signal, * so the UI never renders raw key paths for a not-yet-loaded locale.
     */
    setLang(l: Lang): void {
        this.syncHtmlLang(l);
        if (typeof window !== 'undefined') {
            localStorage.setItem(LANG_KEY, l);
        }
        this.loadLang(l).then(() => this.lang.set(l));
    }

    /**
     * Single source of truth for transaction-category display names.
     * Resolves via the `categories.*` dictionary (complete in FR + EN);
     * returns the raw key only if a category is somehow unknown.
     */
    categoryLabel(cat?: string | null): string {
        const key = cat || 'other_expense';
        const path = `categories.${key}`;
        const label = this.t(path);
        return label !== path ? label : key;
    }

    t(path: string, params?: Record<string, string | number>): string {
        const lang = this.lang();
        const dict = this.dicts[lang];
        if (!dict) {
            // The active locale should have been awaited at bootstrap; if a
            // not-yet-loaded locale is hit, kick a background load and fall back
            // to the key this once (avoids a hard crash mid-render).
            this.loadLang(lang);
            return path;
        }
        const value = path.split('.').reduce<any>((acc, key) =>
            acc ? acc[key] : undefined, dict);
        if (typeof value !== 'string') {
            // Fail LOUD in dev so missing keys are caught before shipping (P2-FE-3),
            // instead of silently rendering the raw key path. Warn once per key.
            if (isDevMode() && !this.warned.has(lang + ':' + path)) {
                this.warned.add(lang + ':' + path);
                console.warn(`[i18n] missing key "${path}" for lang "${lang}"`);
            }
            return path;
        }
        if (!params) return value;
        return Object.keys(params).reduce(
            (s, k) => s.replace(`{{${k}}}`, String(params[k])), value
        );
    }
}
