import { Component, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { RippleModule } from 'primeng/ripple';
import { StyleClassModule } from 'primeng/styleclass';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { TopbarWidget } from './components/topbarwidget.component';
import { HeroWidget } from './components/herowidget';
import { FeaturesWidget } from './components/featureswidget';
import { HighlightsWidget } from './components/highlightswidget';
import { PricingWidget } from './components/pricingwidget';
import { FooterWidget } from './components/footerwidget';
import { FireProjectionWidget } from './components/fireprojectionwidget';
import { PainCalculatorWidget } from './components/paincalculatorwidget';
import { HowItWorksWidget } from './components/howitworkswidget';
import { WealthScoreWidget } from './components/wealthscorewidget';
import { I18nService, Lang } from '../../i18n/i18n.service';

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [RouterModule, TopbarWidget, HeroWidget, FeaturesWidget, HighlightsWidget, PricingWidget, FooterWidget, FireProjectionWidget, PainCalculatorWidget, HowItWorksWidget, WealthScoreWidget, RippleModule, StyleClassModule, ButtonModule, DividerModule],
    template: `
        <div class="bg-surface-0 dark:bg-surface-900 min-h-screen">
            <div id="home" class="landing-wrapper overflow-hidden">
                <!-- Topbar with glass effect -->
                <div class="fixed top-0 left-0 right-0 z-50 bg-surface-0/80 dark:bg-surface-900/80 backdrop-blur-lg border-b border-surface-200/50 dark:border-surface-700/50"
                     style="padding-top: env(safe-area-inset-top, 0px)">
                    <topbar-widget class="py-4 px-6 mx-0 md:mx-12 lg:mx-20 lg:px-20 flex items-center justify-between relative lg:static" />
                </div>

                <!-- Spacer for fixed topbar -->
                <div class="h-20"></div>

                <!-- Main content -->
                <hero-widget />
                <how-it-works-widget />
                <fire-projection-widget />
                <features-widget />
                <pain-calculator-widget />
                <wealth-score-widget />
                <highlights-widget />
                <pricing-widget />

                <!-- Advisory Teaser -->
                <section class="relative py-20 px-6 lg:px-20 overflow-hidden bg-gradient-to-br from-brand-950 via-warm-900 to-brand-950">
                    <!-- Background decoration -->
                    <div class="absolute inset-0 opacity-10">
                        <div class="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-brand-700 blur-3xl"></div>
                        <div class="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-brand-700 blur-3xl"></div>
                    </div>
                    <div class="relative max-w-4xl mx-auto text-center">
                        <!-- Badge -->
                        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-700/40 bg-brand-700/10 dark:bg-brand-300/15 text-brand-300 text-sm font-medium mb-6">
                            <i class="pi pi-briefcase text-xs"></i>
                            <span>{{ t('landing.advisory.badge') }}</span>
                        </div>

                        <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                            {{ t('landing.advisory.h2') }}
                        </h2>
                        <p class="text-xl md:text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-brand-200 to-brand-300 mb-6">
                            {{ t('landing.advisory.subtitle') }}
                        </p>
                        <p class="text-lg text-warm-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                            {{ t('landing.advisory.description') }}
                        </p>

                        <div class="flex flex-col sm:flex-row gap-4 justify-center">
                            <button pButton pRipple [label]="t('landing.advisory.ctaLearn')"
                                    [routerLink]="[currentLang, 'advisory']"
                                    [outlined]="true"
                                    class="!border-brand-700 !text-brand-300 hover:!bg-brand-700/10 dark:bg-brand-300/15 !rounded-full !px-8 !py-3 !font-semibold">
                            </button>
                            <button pButton pRipple [label]="t('landing.advisory.ctaContact')"
                                    [routerLink]="[currentLang, 'advisory']"
                                    [fragment]="'contact'"
                                    class="!bg-gradient-to-r !from-brand-700 !to-brand-500 !border-0 !text-white !rounded-full !px-8 !py-3 !font-semibold
                                           hover:!shadow-lg hover:!shadow-card transition-all duration-300">
                            </button>
                        </div>
                    </div>
                </section>

                <footer-widget />
            </div>
        </div>
    `,
    styles: [`
        :host {
            display: block;
        }
        
        .landing-wrapper {
            scroll-behavior: smooth;
        }
    `]
})
export class Landing {
    private i18n = inject(I18nService);
    private router = inject(Router);

    currentLang = '/fr';

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        const lang  = (match ? match[1] : 'fr') as Lang;
        this.currentLang = '/' + lang;
        // Sync i18n service with the URL language on every navigation to this page
        this.i18n.setLang(lang);
    }

    t(key: string): string { return this.i18n.t(key); }
}
