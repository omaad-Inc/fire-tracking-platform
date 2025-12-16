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
export class Landing {}
