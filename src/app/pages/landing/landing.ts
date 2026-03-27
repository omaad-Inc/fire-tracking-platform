import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
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
import { Router } from '@angular/router';
import { inject } from '@angular/core';

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [RouterModule, TopbarWidget, HeroWidget, FeaturesWidget, HighlightsWidget, PricingWidget, FooterWidget, RippleModule, StyleClassModule, ButtonModule, DividerModule],
    template: `
        <div class="bg-surface-0 dark:bg-surface-900 min-h-screen">
            <div id="home" class="landing-wrapper overflow-hidden">
                <!-- Topbar with glass effect -->
                <div class="fixed top-0 left-0 right-0 z-50 bg-surface-0/80 dark:bg-surface-900/80 backdrop-blur-lg border-b border-surface-200/50 dark:border-surface-700/50">
                    <topbar-widget class="py-4 px-6 mx-0 md:mx-12 lg:mx-20 lg:px-20 flex items-center justify-between relative lg:static" />
                </div>

                <!-- Spacer for fixed topbar -->
                <div class="h-20"></div>

                <!-- Main content -->
                <hero-widget />
                <features-widget />
                <highlights-widget />
                <pricing-widget />

                <!-- Advisory Teaser -->
                <section class="relative py-20 px-6 lg:px-20 overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-cyan-950">
                    <!-- Background decoration -->
                    <div class="absolute inset-0 opacity-10">
                        <div class="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-indigo-500 blur-3xl"></div>
                        <div class="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-cyan-500 blur-3xl"></div>
                    </div>
                    <div class="relative max-w-4xl mx-auto text-center">
                        <!-- Badge -->
                        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/40 bg-indigo-500/10 text-indigo-300 text-sm font-medium mb-6">
                            <i class="pi pi-briefcase text-xs"></i>
                            <span>Afrin Nexus Advisory — Solutions B2B</span>
                        </div>

                        <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                            Vous êtes une entreprise ?
                        </h2>
                        <p class="text-xl md:text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300 mb-6">
                            Afrin Nexus Advisory accompagne votre transformation data
                        </p>
                        <p class="text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Missions Data Engineering, IA et Architecture —
                            des consultants qui connaissent les réalités africaines.
                        </p>

                        <div class="flex flex-col sm:flex-row gap-4 justify-center">
                            <button pButton pRipple label="En savoir plus"
                                    [routerLink]="[currentLang, 'advisory']"
                                    [outlined]="true"
                                    class="!border-indigo-500 !text-indigo-300 hover:!bg-indigo-500/10 !rounded-full !px-8 !py-3 !font-semibold">
                            </button>
                            <button pButton pRipple label="Prendre contact"
                                    [routerLink]="[currentLang, 'advisory']"
                                    [fragment]="'contact'"
                                    class="!bg-gradient-to-r !from-indigo-600 !to-cyan-500 !border-0 !text-white !rounded-full !px-8 !py-3 !font-semibold
                                           hover:!shadow-lg hover:!shadow-indigo-500/30 transition-all duration-300">
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
    currentLang = '/fr';

    constructor() {
        const router = inject(Router);
        const match = router.url.match(/^\/(fr|en)(?:\/|$)/);
        this.currentLang = '/' + (match ? match[1] : 'fr');
    }
}
