import { DOCUMENT } from '@angular/common';
import { Injectable, inject, isDevMode, signal } from '@angular/core';
import type { Dict } from './fr';
import type { PublicDict } from './fr.public';
import { isPublicLightPath } from '../core/theme/public-light';

export type Lang = 'fr' | 'en';
/**
 * Dictionary tiers (F13). `public` holds the namespaces the public pages use
 * (landing, tarifs, blog, FAQ, legal, tools, shared goal, 404): a quarter of
 * the copy. `app` is everything else. A public route loads only the public
 * tier; an in-app route loads both (core/guards/i18n-tier.guard.ts), merged
 * into one lookup object, so t() never knows which tier a key came from.
 */
export type Tier = 'public' | 'app';
export type FullDict = PublicDict & Dict;

const LANG_KEY = 'omaad_lang';

@Injectable({ providedIn: 'root' })
export class I18nService {
    // Dictionaries load on demand (P2-FE-3): only the active locale ships in the
    // initial graph; the other is a separate lazy chunk fetched on switch. The
    // active locale is awaited by an APP_INITIALIZER (see app.config.ts) so t()
    // is populated before first render, including during prerender.
    private dicts: Partial<Record<Lang, Partial<FullDict>>> = {};
    private loaded: Partial<Record<Lang, Set<Tier>>> = {};
    private loading: Partial<Record<`${Lang}:${Tier}`, Promise<void>>> = {};
    private warned = new Set<string>();
    private document = inject(DOCUMENT);

    lang = signal<Lang>(this.detectLang());
    /** Bumped when a tier lands, so OnPush templates re-read t() after a late app-tier load. */
    readonly version = signal(0);

    constructor() {
        // Keep <html lang> in sync from the very first render so screen readers
        // use the right pronunciation (EN pages were read with FR phonetics).
        this.syncHtmlLang(this.lang());
    }

    /** The tier a URL needs: public pages the public one, everything else both. */
    static tierFor(pathname: string): Tier {
        return isPublicLightPath(pathname) ? 'public' : 'app';
    }

    /** True once the app tier of the active locale is in memory. */
    hasTier(tier: Tier, l: Lang = this.lang()): boolean {
        return this.loaded[l]?.has(tier) ?? false;
    }

    /**
     * Load a locale's dictionary (idempotent; concurrent calls share one import).
     * Without `tier`, the current URL decides: a public page gets the public
     * tier only, anything else gets both.
     */
    loadLang(l: Lang, tier?: Tier): Promise<void> {
        const want = tier ?? I18nService.tierFor(this.document?.location?.pathname ?? '');
        const steps = [this.loadTier(l, 'public')];
        if (want === 'app') steps.push(this.loadTier(l, 'app'));
        return Promise.all(steps).then(() => undefined);
    }

    private loadTier(l: Lang, tier: Tier): Promise<void> {
        if (this.loaded[l]?.has(tier)) return Promise.resolve();
        const key = `${l}:${tier}` as const;
        const load: Promise<object> = tier === 'public'
            ? (l === 'fr' ? import('./fr.public').then(m => m.FR_PUBLIC) : import('./en.public').then(m => m.EN_PUBLIC))
            : (l === 'fr' ? import('./fr').then(m => m.FR) : import('./en').then(m => m.EN));
        return (this.loading[key] ??= load.then(d => {
            this.dicts[l] = { ...(this.dicts[l] ?? {}), ...d } as Partial<FullDict>;
            (this.loaded[l] ??= new Set()).add(tier);
            this.version.update(v => v + 1);
        }).finally(() => { delete this.loading[key]; }));
    }

    private detectLang(): Lang {
        // 1. localStorage (browser only)
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(LANG_KEY);
            if (stored === 'en' || stored === 'fr') return stored;
        }
        // 2. URL prefix. On the server (prerender) there is no window, but the
        //    DOCUMENT's location carries the route being rendered: without this
        //    the APP_INITIALIZER awaited FR for every route and /en/landing was
        //    prerendered in French (the page's own setLang('en') resolves only
        //    after the snapshot is taken).
        const path = this.document?.location?.pathname ?? '';
        const match = path.match(/^\/(fr|en)(\/|$)/);
        if (match) return match[1] as Lang;
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
        // The new locale needs the same tiers the current one has (an in-app
        // switch must not drop to the public tier and render raw app keys).
        const tier: Tier | undefined = this.hasTier('app') ? 'app' : undefined;
        this.loadLang(l, tier).then(() => this.lang.set(l));
    }

    /**
     * Single source of truth for transaction-category display names.
     * Resolves via the `categories.*` dictionary (complete in FR + EN);
     * returns the raw key only if a category is somehow unknown.
     */
    categoryLabel(cat?: string | null): string {
        // Lowercased on the way in: the API returns MIXED category casing, the
        // enum VALUE for some rows ("groceries") and its NAME for others
        // ("HOUSING"), depending on which writer created them. The
        // `categories.*` dictionary is keyed lowercase, so an uppercase value
        // missed the lookup and this returned the raw key, which is how
        // "HOUSING" reached the Analyses page as visible copy.
        const key = (cat || 'other_expense').toLowerCase();
        const path = `categories.${key}`;
        const label = this.t(path);
        return label !== path ? label : key;
    }

    t(path: string, params?: Record<string, string | number>): string {
        const lang = this.lang();
        this.version(); // re-evaluate when a tier lands
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
            if (!this.hasTier('app', lang)) {
                // A public page reached an app-tier key (a shared component, or a
                // namespace missing from the public tier): self-heal by loading
                // the app tier, and say so in dev so the tier guard gets fixed.
                this.loadTier(lang, 'app');
                if (isDevMode() && !this.warned.has(lang + ':' + path)) {
                    this.warned.add(lang + ':' + path);
                    console.warn(`[i18n] key "${path}" is outside the public tier (lang "${lang}"); add its namespace to fr.public.ts or keep it off public pages`);
                }
                return path;
            }
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
