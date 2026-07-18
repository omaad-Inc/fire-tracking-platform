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
import { SocialProofWidget } from './components/socialproofwidget';
import { I18nService, Lang } from '../../i18n/i18n.service';

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [RouterModule, TopbarWidget, HeroWidget, FeaturesWidget, HighlightsWidget, PricingWidget, FooterWidget, FireProjectionWidget, PainCalculatorWidget, HowItWorksWidget, WealthScoreWidget, SocialProofWidget, RippleModule, StyleClassModule, ButtonModule, DividerModule],
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
                <!-- Early-access credibility strip (by the numbers) -->
                <social-proof-widget />
                <how-it-works-widget />
                <!-- Aspirational hook: "where could this take me?" -->
                <fire-projection-widget />
                <features-widget />
                <wealth-score-widget />
                <highlights-widget />
                <!-- Urgency close: "what does waiting cost me?" — right before pricing -->
                <pain-calculator-widget />
                <pricing-widget />

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
