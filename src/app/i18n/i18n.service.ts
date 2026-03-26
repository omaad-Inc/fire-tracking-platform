import { Injectable, signal } from '@angular/core';
import { EN } from './en';
import { FR } from './fr';

export type Lang = 'fr' | 'en';
type Dictionaries = typeof FR;

const LANG_KEY = 'afrin_nexus_lang';

@Injectable({ providedIn: 'root' })
export class I18nService {
    private dicts: Record<Lang, Dictionaries> = { en: EN as any, fr: FR };

    lang = signal<Lang>(this.detectLang());

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

    setLang(l: Lang): void {
        this.lang.set(l);
        if (typeof window !== 'undefined') {
            localStorage.setItem(LANG_KEY, l);
        }
    }

    t(path: string, params?: Record<string, string | number>): string {
        const lang = this.lang();
        const value = path.split('.').reduce<any>((acc, key) =>
            acc ? acc[key] : undefined, this.dicts[lang]);
        if (typeof value !== 'string') return path;
        if (!params) return value;
        return Object.keys(params).reduce(
            (s, k) => s.replace(`{{${k}}}`, String(params[k])), value
        );
    }
}
