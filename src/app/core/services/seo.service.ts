import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';

export interface SeoConfig {
    title: string;
    description: string;
    /** Absolute canonical URL, e.g. https://omaad.africa/outils/comparateur-sgi-brvm */
    canonical: string;
    /** Absolute image URL for Open Graph / Twitter cards. */
    image?: string;
    ogType?: 'website' | 'article';
}

const SITE_ORIGIN = 'https://omaad.africa';
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
