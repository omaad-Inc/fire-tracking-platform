import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import type { Lang } from '../../i18n/i18n.service';

export interface SeoConfig {
    title: string;
    description: string;
    /** Absolute canonical URL, e.g. https://omaad.africa/outils/comparateur-sgi-brvm */
    canonical: string;
    /** Absolute image URL for Open Graph / Twitter cards. */
    image?: string;
    ogType?: 'website' | 'article';
}

/** One page's title + description in a single locale. */
export interface SeoText {
    title: string;
    description: string;
}

/** Localized SEO for a bilingual (FR/EN) route. */
export interface LocalizedSeo {
    lang: Lang;
    /** Path AFTER the `/:lang` prefix, starting with `/` (e.g. `/blog`, `/faq`); `/landing` for the home page. */
    path: string;
    fr: SeoText;
    en: SeoText;
    image?: string;
    ogType?: 'website' | 'article';
}

export const SITE_ORIGIN = 'https://omaad.africa';
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og/omaad-og-1200x630.png`;

/**
 * Per-route SEO: title, meta description, canonical, Open Graph/Twitter and
 * JSON-LD structured data. Works during prerendering (uses DOCUMENT, no
 * direct `window`/`document` globals) so crawlers get the tags in the
 * initial HTML.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
    private title = inject(Title);
    private meta = inject(Meta);
    private doc = inject(DOCUMENT);

    apply(cfg: SeoConfig): void {
        this.title.setTitle(cfg.title);
        this.meta.updateTag({ name: 'description', content: cfg.description });

        this.meta.updateTag({ property: 'og:type', content: cfg.ogType ?? 'website' });
        this.meta.updateTag({ property: 'og:title', content: cfg.title });
        this.meta.updateTag({ property: 'og:description', content: cfg.description });
        this.meta.updateTag({ property: 'og:url', content: cfg.canonical });
        this.meta.updateTag({ property: 'og:image', content: cfg.image ?? DEFAULT_OG_IMAGE });
        this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
        this.meta.updateTag({ name: 'twitter:title', content: cfg.title });
        this.meta.updateTag({ name: 'twitter:description', content: cfg.description });
        this.meta.updateTag({ name: 'twitter:image', content: cfg.image ?? DEFAULT_OG_IMAGE });

        this.setCanonical(cfg.canonical);
    }

    /**
     * Apply per-route SEO for a bilingual FR/EN page: sets title/description/
     * canonical for the active locale, an `og:locale`, and the FR/EN/x-default
     * `hreflang` alternate links so Google serves the right language per region.
     */
    applyLocalized(cfg: LocalizedSeo): void {
        const cur = cfg.lang === 'en' ? cfg.en : cfg.fr;
        // Set <html lang> via the injected DOCUMENT so it's correct in the
        // prerendered HTML too (the app's global-`document` sync is a no-op
        // during SSR, leaving every prerendered page at the index.html default).
        this.doc.documentElement.setAttribute('lang', cfg.lang);
        this.apply({
            title: cur.title,
            description: cur.description,
            canonical: `${SITE_ORIGIN}/${cfg.lang}${cfg.path}`,
            image: cfg.image,
            ogType: cfg.ogType,
        });
        this.meta.updateTag({ property: 'og:locale', content: cfg.lang === 'en' ? 'en_US' : 'fr_FR' });
        this.setAlternates(cfg.path);
    }

    /**
     * Emit `<link rel="alternate" hreflang>` for the FR and EN twins of a page
     * plus an `x-default` (FR). Idempotent: clears prior alternates first so
     * navigations don't stack stale links.
     */
    setAlternates(path: string): void {
        this.doc.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((n) => n.remove());
        const add = (hreflang: string, href: string) => {
            const link = this.doc.createElement('link');
            link.setAttribute('rel', 'alternate');
            link.setAttribute('hreflang', hreflang);
            link.setAttribute('href', href);
            this.doc.head.appendChild(link);
        };
        add('fr', `${SITE_ORIGIN}/fr${path}`);
        add('en', `${SITE_ORIGIN}/en${path}`);
        add('x-default', `${SITE_ORIGIN}/fr${path}`);
    }

    private setCanonical(url: string): void {
        let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        if (!link) {
            link = this.doc.createElement('link');
            link.setAttribute('rel', 'canonical');
            this.doc.head.appendChild(link);
        }
        link.setAttribute('href', url);
    }

    /**
     * Inject (or replace) a JSON-LD block identified by `id` so repeated
     * navigations don't stack duplicate scripts.
     */
    setJsonLd(id: string, data: object): void {
        this.removeJsonLd(id);
        const script = this.doc.createElement('script');
        script.type = 'application/ld+json';
        script.id = id;
        script.text = JSON.stringify(data);
        this.doc.head.appendChild(script);
    }

    removeJsonLd(id: string): void {
        this.doc.getElementById(id)?.remove();
    }
}
