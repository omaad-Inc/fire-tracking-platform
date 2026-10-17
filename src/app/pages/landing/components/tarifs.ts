import { Component, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TopbarWidget } from './topbarwidget.component';
import { FooterWidget } from './footerwidget';
import { PricingWidget, LANDING_FAQ_KEYS } from './pricingwidget';
import { ClosingBandWidget } from './closingbandwidget';
import { I18nService, Lang } from '../../../i18n/i18n.service';
import { SeoService } from '../../../core/services/seo.service';
import { SEO_PAGES } from '../../../core/services/seo-content';

/**
 * Standalone pricing page (/:lang/tarifs, backlog F3): the same pass
 * pricing section and FAQ as the landing, as a URL of its own for the
 * "omaad tarifs" query and for links from emails and social posts. The
 * FAQPage JSON-LD lives here too, keyed to this canonical.
 */
@Component({
    selector: 'app-tarifs',
    standalone: true,
    imports: [TopbarWidget, FooterWidget, PricingWidget, ClosingBandWidget],
    template: `
        <div class="lp min-h-screen">
            <topbar-widget />
            <main>
                <pricing-widget [standalone]="true" />
                <closing-band-widget />
            </main>
            <footer-widget />
        </div>
    `,
})
export class TarifsPage implements OnDestroy {
    private i18n = inject(I18nService);
    private router = inject(Router);
    private seo = inject(SeoService);

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        const lang = (match ? match[1] : 'fr') as Lang;
        this.i18n.setLang(lang);
        this.seo.applyLocalized({ lang, ...SEO_PAGES.pricing });
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

    ngOnDestroy(): void { this.seo.removeJsonLd('jsonld-faq'); }
}
