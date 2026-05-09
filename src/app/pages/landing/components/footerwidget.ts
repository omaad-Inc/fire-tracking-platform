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
            <div class="absolute inset-0 opacity-5">
                <div class="absolute inset-0" style="background-image: linear-gradient(rgba(99, 102, 241, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.5) 1px, transparent 1px); background-size: 40px 40px;"></div>
            </div>

            <div class="relative py-16 px-6 lg:px-20">
                <div class="max-w-7xl mx-auto">
                    <div class="grid grid-cols-12 gap-8 lg:gap-12">
                        <!-- Brand -->
                        <div class="col-span-12 lg:col-span-4">
                            <a (click)="navigateTo('home')" class="flex items-center gap-3 cursor-pointer mb-6 group">
                                <img src="assets/brand/omaad-icon-inverse.svg" alt="Omaad Logo"
                                     class="w-12 h-12 transition-transform duration-300 group-hover:scale-110">
                                <span class="font-bold text-2xl tracking-tight whitespace-nowrap">{{ isAdvisory() ? 'Omaad Advisory' : 'Omaad Wealth' }}</span>
                            </a>
                            <p class="text-warm-400 leading-relaxed mb-6">{{ t('landing.footer.tagline') }}</p>
                            <div class="flex gap-3">
                                <a href="https://www.linkedin.com/company/omaad/" target="_blank" rel="noopener noreferrer"
                                   class="w-10 h-10 rounded-xl bg-warm-800 hover:bg-brand-700 flex items-center justify-center transition-all duration-300 hover:scale-110">
                                    <i class="pi pi-linkedin text-lg"></i>
                                </a>
                            </div>
                        </div>

                        <!-- Product -->
                        <div class="col-span-6 md:col-span-3 lg:col-span-2">
                            <h4 class="font-semibold text-lg mb-6 text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-brand-400">{{ t('landing.footer.productTitle') }}</h4>
                            <ul class="space-y-3">
                                <li><a (click)="navigateTo('features')" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ t('landing.footer.productFeatures') }}</a></li>
                                <li><a (click)="navigateTo('highlights')" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ t('landing.footer.productDashboard') }}</a></li>
                                <li><a (click)="navigateTo('features')" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ t('landing.footer.productPatrimony') }}</a></li>
                                <li><a (click)="navigateTo('features')" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ t('landing.footer.productSavings') }}</a></li>
                            </ul>
                        </div>

                        <!-- Resources -->
                        <div class="col-span-6 md:col-span-3 lg:col-span-2">
                            <h4 class="font-semibold text-lg mb-6 text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-positive-400">{{ t('landing.footer.resourcesTitle') }}</h4>
                            <ul class="space-y-3">
                                <li><a href="https://fireafrica.beehiiv.com/subscribe" target="_blank" rel="noopener noreferrer" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ t('landing.footer.resourcesGuide') }}</a></li>
                                <li><a href="https://fireafrica.beehiiv.com/subscribe" target="_blank" rel="noopener noreferrer" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ t('landing.footer.resourcesBlog') }}</a></li>
                                <li><a (click)="navigateTo('pricing')" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ t('landing.footer.resourcesFaq') }}</a></li>
                                <li><a [routerLink]="[currentLang, 'tools', 'fire-simulator']" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ t('landing.footer.resourcesCalc') }}</a></li>
                            </ul>
                        </div>

                        <!-- Advisory -->
                        <div class="col-span-6 md:col-span-3 lg:col-span-2">
                            <h4 class="font-semibold text-lg mb-6 text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-brand-200">{{ t('landing.footer.advisoryTitle') }}</h4>
                            <ul class="space-y-3">
                                <li><a [routerLink]="[currentLang, 'advisory']" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ t('landing.footer.advisoryOffers') }}</a></li>
                                <li><a [routerLink]="[currentLang, 'advisory']" [fragment]="'offres'" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ t('landing.footer.advisoryServices') }}</a></li>
                                <li><a [routerLink]="[currentLang, 'advisory']" [fragment]="'contact'" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ t('landing.footer.advisoryContact') }}</a></li>
                            </ul>
                        </div>

                        <!-- Legal -->
                        <div class="col-span-6 md:col-span-3 lg:col-span-2">
                            <h4 class="font-semibold text-lg mb-6 text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-300">{{ t('landing.footer.legalTitle') }}</h4>
                            <ul class="space-y-3">
                                <li><a href="#" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ t('landing.footer.legalPrivacy') }}</a></li>
                                <li><a href="#" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ t('landing.footer.legalTerms') }}</a></li>
                                <li><a href="#" class="text-warm-400 hover:text-white transition-colors cursor-pointer">{{ t('landing.footer.legalMentions') }}</a></li>
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
                            © {{ currentYear }} {{ isAdvisory() ? 'Omaad Advisory' : 'Omaad Wealth' }}. {{ t('landing.footer.copyright') }}
                            <span class="text-warm-600">{{ t('landing.footer.madeWith') }}</span>
                            <i class="pi pi-heart-fill text-negative mx-1"></i>
                            <span class="text-warm-600">{{ t('landing.footer.forFreedom') }}</span>
                        </div>
                        <div class="flex items-center gap-4">
                            <div class="flex items-center gap-2 text-warm-500 text-sm">
                                <span class="relative flex h-2 w-2">
                                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-positive-400 opacity-75"></span>
                                    <span class="relative inline-flex rounded-full h-2 w-2 bg-positive-500"></span>
                                </span>
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
    isAdvisory(): boolean { return this.router.url.includes('/advisory'); }

    navigateTo(fragment: string) {
        this.router.navigate([this.currentLang + '/landing'], { fragment });
    }
}
