import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { I18nService } from '../../../i18n/i18n.service';
import { NewsletterSignup } from './newsletter-signup';

/**
 * Public footer (landing redesign): four columns, newsletter, 44 px targets
 * everywhere, and the publisher line with no city and no registration code
 * (the legal pages keep the full entity). No "Disponible" chip: there is no
 * store listing yet.
 */
@Component({
    selector: 'footer-widget',
    standalone: true,
    imports: [RouterModule, NewsletterSignup],
    template: `
        <footer class="lp-dark">
            <div class="lp-container py-14 lg:py-20">
                <div class="grid grid-cols-2 md:grid-cols-12 gap-x-6 gap-y-10">
                    <div class="col-span-2 md:col-span-12 lg:col-span-4">
                        <a [routerLink]="[currentLang, 'landing']" class="inline-flex items-center gap-2 no-underline text-white rounded-full focus-visible:outline-2 focus-visible:outline-ochre-500">
                            <img src="assets/brand/omaad-icon-inverse.svg" alt="" class="w-10 h-10" width="40" height="40" loading="lazy">
                            <span class="font-bold text-[22px] tracking-tight">Omaad</span>
                        </a>
                        <p class="mt-4 text-[15px] leading-relaxed text-white/70 max-w-[22rem]">{{ t('landing.footer.tagline') }}</p>
                        <div class="mt-5 flex gap-2">
                            <a href="https://www.linkedin.com/company/omaad/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"
                               class="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                                <i class="pi pi-linkedin text-[18px]" aria-hidden="true"></i>
                            </a>
                            <a href="https://www.youtube.com/@fire_africa" target="_blank" rel="noopener noreferrer" aria-label="YouTube FIRE Africa"
                               class="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                                <i class="pi pi-youtube text-[18px]" aria-hidden="true"></i>
                            </a>
                        </div>
                        <div class="mt-8">
                            <h2 class="text-[14px] font-semibold text-white m-0">{{ t('landing.footer.newsletterTitle') }}</h2>
                            <p class="mt-1 mb-3 text-[14px] text-white/70 max-w-[20rem]">{{ t('landing.footer.newsletterDesc') }}</p>
                            <app-newsletter-signup source="site-footer" [compact]="true" />
                        </div>
                    </div>

                    @for (col of columns; track col.title) {
                        <nav class="col-span-1 md:col-span-3 lg:col-span-2" [attr.aria-label]="t(col.title)">
                            <h2 class="text-[13px] font-semibold uppercase tracking-[0.08em] text-white/60 m-0 mb-3">{{ t(col.title) }}</h2>
                            <ul class="list-none p-0 m-0">
                                @for (l of col.links; track l.label) {
                                    <li>
                                        @if (l.external) {
                                            <a [href]="l.href" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 min-h-11 text-[15px] text-white/80 hover:text-white no-underline">{{ t(l.label) }}<i class="pi pi-external-link text-[9px]" aria-hidden="true"></i></a>
                                        } @else {
                                            <a [routerLink]="l.link" [fragment]="l.fragment" class="inline-flex items-center min-h-11 text-[15px] text-white/80 hover:text-white no-underline">{{ t(l.label) }}</a>
                                        }
                                    </li>
                                }
                            </ul>
                        </nav>
                    }
                </div>
            </div>
            <div class="border-t border-white/10">
                <div class="lp-container py-6 flex flex-col md:flex-row md:items-center justify-between gap-3 text-[13px] text-white/60">
                    <span>© {{ currentYear }} {{ t('landing.footer.legalLine') }}</span>
                    <span>{{ t('landing.footer.disclaimer') }}</span>
                </div>
            </div>
        </footer>
    `
})
export class FooterWidget {
    private i18n = inject(I18nService);
    currentLang = '/fr';
    currentYear = new Date().getFullYear();

    columns: Array<{ title: string; links: Array<{ label: string; link?: string[]; fragment?: string; href?: string; external?: boolean }> }> = [];

    constructor(public router: Router) {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        this.currentLang = '/' + (match ? match[1] : 'fr');
        const L = this.currentLang;
        const about = this.i18n.lang() === 'fr' ? 'qui-sommes-nous' : 'about';
        this.columns = [
            { title: 'landing.footer.productTitle', links: [
                { label: 'landing.nav.features', link: [L, 'landing'], fragment: 'features' },
                { label: 'landing.footer.productTour', link: [L, 'landing'], fragment: 'tour' },
                { label: 'landing.footer.productProjection', link: [L, 'landing'], fragment: 'projection' },
                { label: 'landing.nav.pricing', link: [L, 'landing'], fragment: 'pricing' },
                { label: 'landing.footer.resourcesFaq', link: [L, 'landing'], fragment: 'faq' },
            ] },
            { title: 'landing.nav.tools', links: [
                { label: 'landing.nav.toolFire', link: [L, 'tools', 'fire-simulator'] },
                { label: 'landing.nav.toolCompound', link: [L, 'tools', 'compound-interest'] },
                { label: 'landing.nav.toolSgi', link: ['/outils/comparateur-sgi-brvm'] },
                { label: 'landing.nav.toolStrategy', link: ['/outils/strategie-brvm'] },
                { label: 'landing.nav.toolBlog', link: [L, 'blog'] },
            ] },
            { title: 'landing.footer.companyTitle', links: [
                { label: 'landing.nav.about', link: [L, about] },
                { label: 'landing.nav.aboutSecurity', link: [L, about], fragment: 'securite' },
                { label: 'landing.nav.aboutContact', link: [L, about], fragment: 'contact' },
                { label: 'landing.footer.support', link: ['/support'] },
                { label: 'LinkedIn', href: 'https://www.linkedin.com/company/omaad/', external: true },
            ] },
            { title: 'landing.footer.legalTitle', links: [
                { label: 'landing.footer.legalPrivacy', link: ['/confidentialite'] },
                { label: 'landing.footer.legalTerms', link: [L, 'legal', 'terms'] },
                { label: 'landing.footer.legalMentions', link: [L, 'legal', 'mentions'] },
                { label: 'landing.footer.deleteAccount', link: ['/supprimer-mon-compte'] },
            ] },
        ];
    }

    t(key: string): string { return key.includes('.') ? this.i18n.t(key) : key; }
}
