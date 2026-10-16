import { Component, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TopbarWidget } from './components/topbarwidget.component';
import { HeroWidget } from './components/herowidget';
import { ProductTourWidget } from './components/producttourwidget';
import { BenefitsWidget } from './components/benefitswidget';
import { ShowcaseWidget } from './components/showcasewidget';
import { FireProjectionWidget } from './components/fireprojectionwidget';
import { TrustWidget } from './components/trustwidget';
import { PricingWidget, LANDING_FAQ_KEYS } from './components/pricingwidget';
import { ClosingBandWidget } from './components/closingbandwidget';
import { FooterWidget } from './components/footerwidget';
import { I18nService, Lang } from '../../i18n/i18n.service';
import { SeoService, SITE_ORIGIN } from '../../core/services/seo.service';
import { SEO_PAGES } from '../../core/services/seo-content';
import { AnalyticsService } from '../../core/services/analytics.service';

/**
 * Public landing (redesign 2026-10). Nine sections, light only, the real
 * product in the first screen:
 *   header, hero, product tour, benefits, showcases, projection tool,
 *   trust, pricing + FAQ, closing band, footer.
 * Copy: i18n `landing.*`. Styles: assets/layout/_landing.scss (`.lp-*`).
 */
@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [TopbarWidget, HeroWidget, ProductTourWidget, BenefitsWidget, ShowcaseWidget, FireProjectionWidget, TrustWidget, PricingWidget, ClosingBandWidget, FooterWidget],
    template: `
        <div class="lp min-h-screen">
            <topbar-widget />
            <main id="home">
                <hero-widget />
                <product-tour-widget />
                <benefits-widget />
                <showcase-widget />
                <fire-projection-widget />
                <trust-widget />
                <pricing-widget />
                <closing-band-widget />
            </main>
            <footer-widget />
        </div>
    `,
})
export class Landing implements OnDestroy {
    private i18n = inject(I18nService);
    private router = inject(Router);
    private seo = inject(SeoService);
    private analytics = inject(AnalyticsService);

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        const lang = (match ? match[1] : 'fr') as Lang;
        this.i18n.setLang(lang);

        this.seo.applyLocalized({ lang, ...SEO_PAGES.landing });
        this.analytics.trackPublic('landing_view', { lang });

        this.seo.setJsonLd('jsonld-organization', {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Omaad',
            legalName: 'OMAAD SASU',
            url: SITE_ORIGIN,
            logo: `${SITE_ORIGIN}/icons/omaad-app-icon-512.png`,
            sameAs: ['https://www.linkedin.com/company/omaad/', 'https://www.youtube.com/@fire_africa'],
        });
        // operatingSystem is "Web" until a store listing exists (no iOS/Android claim).
        this.seo.setJsonLd('jsonld-software', {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Omaad',
            applicationCategory: 'FinanceApplication',
            operatingSystem: 'Web',
            description: SEO_PAGES.landing[lang].description,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'XOF' },
        });
        this.seo.setJsonLd('jsonld-faq', {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: LANDING_FAQ_KEYS.map((n) => ({
                '@type': 'Question',
                name: this.i18n.t(`landing.pricing.faq${n}Q`),
                acceptedAnswer: { '@type': 'Answer', text: this.i18n.t(`landing.pricing.faq${n}A`) },
            })),
        });
    }

    ngOnDestroy(): void {
        this.seo.removeJsonLd('jsonld-organization');
        this.seo.removeJsonLd('jsonld-software');
        this.seo.removeJsonLd('jsonld-faq');
    }
}
