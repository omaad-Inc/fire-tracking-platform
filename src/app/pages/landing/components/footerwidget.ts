import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../i18n/i18n.service';

@Component({
    selector: 'footer-widget',
    standalone: true,
    imports: [RouterModule, CommonModule],
    template: `
        <footer class="relative bg-warm-900 text-white overflow-hidden">
            <div class="relative py-16 px-6 lg:px-20">
                <div class="max-w-7xl mx-auto">
                    <div class="grid grid-cols-12 gap-8 lg:gap-12">
                        <!-- Brand -->
                        <div class="col-span-12 lg:col-span-4">
                            <a (click)="navigateTo('home')" class="flex items-center gap-3 cursor-pointer mb-6 group">
                                <img src="assets/brand/omaad-icon-inverse.svg" alt="Omaad Logo"
                                     class="w-12 h-12">
                                <span class="font-bold text-2xl tracking-tight whitespace-nowrap">Omaad Wealth</span>
                            </a>
                            <p class="text-warm-400 leading-relaxed mb-6">{{ t('landing.footer.tagline') }}</p>
                            <div class="flex gap-3">
                                <a href="https://www.linkedin.com/company/omaad/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"
                                   class="w-10 h-10 rounded-xl bg-warm-800 hover:bg-brand-700 flex items-center justify-center transition-all duration-300">
                                    <i class="pi pi-linkedin text-lg"></i>
                                </a>
                                <a href="https://www.youtube.com/@fire_africa" target="_blank" rel="noopener noreferrer" aria-label="YouTube FIRE Africa"
                                   class="w-10 h-10 rounded-xl bg-warm-800 hover:bg-negative flex items-center justify-center transition-all duration-300">
                                    <i class="pi pi-youtube text-lg"></i>
                                </a>
                            </div>
                        </div>

                        <!-- Product -->
                        <div class="col-span-6 md:col-span-3 lg:col-span-2">
                            <h4 class="font-semibold text-lg mb-6 text-white">{{ t('landing.footer.productTitle') }}</h4>
                            <ul class="space-y-3">
                                <li><a (click)="navigateTo('features')" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ t('landing.footer.productFeatures') }}</a></li>
                                <li><a (click)="navigateTo('highlights')" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ t('landing.footer.productDashboard') }}</a></li>
                                <li><a (click)="navigateTo('projection')" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ _('Projection patrimoniale', 'Wealth projection') }}</a></li>
                                <li><a (click)="navigateTo('pricing')" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ _('Tarifs', 'Pricing') }}</a></li>
                            </ul>
                        </div>

                        <!-- Resources -->
                        <div class="col-span-6 md:col-span-3 lg:col-span-2">
                            <h4 class="font-semibold text-lg mb-6 text-white">{{ t('landing.footer.resourcesTitle') }}</h4>
                            <ul class="space-y-3">
                                <li><a [routerLink]="[currentLang, 'blog']" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ t('landing.footer.resourcesBlog') }}</a></li>
                                <li><a href="https://fireafrica.beehiiv.com/subscribe" target="_blank" rel="noopener noreferrer" class="text-warm-400 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1">{{ _('Newsletter FIRE Africa', 'FIRE Africa newsletter') }}<i class="pi pi-external-link text-[9px]"></i></a></li>
                                <li><a [routerLink]="[currentLang, 'faq']" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ t('landing.footer.resourcesFaq') }}</a></li>
                                <li><a [routerLink]="[currentLang, 'tools', 'fire-simulator']" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ _('Simulateur FIRE', 'FIRE Simulator') }}</a></li>
                                <li><a [routerLink]="[currentLang, 'tools', 'compound-interest']" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ _('Intérêts composés', 'Compound Interest') }}</a></li>
                                <li><a routerLink="/outils/comparateur-sgi-brvm" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ _('Comparateur SGI BRVM', 'BRVM Broker Comparator') }}</a></li>
                            </ul>
                        </div>

                        <!-- Company -->
                        <div class="col-span-6 md:col-span-3 lg:col-span-2">
                            <h4 class="font-semibold text-lg mb-6 text-white">{{ _('Entreprise', 'Company') }}</h4>
                            <ul class="space-y-3">
                                <li><a [routerLink]="[currentLang, aboutSlug]" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ t('landing.nav.about') }}</a></li>
                                <li><a href="https://www.linkedin.com/company/omaad/" target="_blank" rel="noopener noreferrer" class="text-warm-400 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1">LinkedIn<i class="pi pi-external-link text-[9px]"></i></a></li>
                            </ul>
                        </div>

                        <!-- Legal -->
                        <div class="col-span-6 md:col-span-3 lg:col-span-2">
                            <h4 class="font-semibold text-lg mb-6 text-white">{{ t('landing.footer.legalTitle') }}</h4>
                            <ul class="space-y-3">
                                <li><a [routerLink]="[currentLang, 'legal', 'privacy']" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ t('landing.footer.legalPrivacy') }}</a></li>
                                <li><a [routerLink]="[currentLang, 'legal', 'terms']" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ t('landing.footer.legalTerms') }}</a></li>
                                <li><a [routerLink]="[currentLang, 'legal', 'mentions']" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ t('landing.footer.legalMentions') }}</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bottom Bar -->
            <div class="relative border-t border-warm-800">
                <div class="max-w-7xl mx-auto px-6 lg:px-20 py-6">
                    <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div class="text-warm-500 text-sm text-center md:text-left">
                            © {{ currentYear }} Omaad Wealth. {{ t('landing.footer.copyright') }}
                            <span class="text-warm-600">{{ t('landing.footer.madeWith') }}</span>
                            <i class="pi pi-heart-fill text-negative mx-1"></i>
                            <span class="text-warm-600">{{ t('landing.footer.forFreedom') }}</span>
                        </div>
                        <div class="flex items-center gap-4">
                            <div class="flex items-center gap-2 text-warm-500 text-sm">
                                <span class="inline-flex rounded-full h-2 w-2 bg-positive-500"></span>
                                <span>{{ t('landing.footer.available') }}</span>
                            </div>
                            <span class="text-warm-700">•</span>
                            <div class="flex items-center gap-2 text-warm-500 text-sm">
                                <i class="pi pi-shield text-brand-700 dark:text-brand-300"></i>
                                <span>{{ t('landing.footer.secure') }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    `
})
export class FooterWidget {
    private i18n = inject(I18nService);
    currentLang  = '/fr';
    currentYear  = new Date().getFullYear();

    constructor(public router: Router) {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        this.currentLang = '/' + (match ? match[1] : 'fr');
    }

    t(key: string): string { return this.i18n.t(key); }
    _(fr: string, en: string): string { return this.i18n.lang() === 'fr' ? fr : en; }
    get aboutSlug(): string { return this.i18n.lang() === 'fr' ? 'qui-sommes-nous' : 'about'; }

    navigateTo(fragment: string) {
        this.router.navigate([this.currentLang + '/landing'], { fragment });
    }
}
