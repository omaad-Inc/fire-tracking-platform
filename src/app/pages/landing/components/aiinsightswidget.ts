import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { I18nService } from '../../../i18n/i18n.service';

interface InsightCard {
    tagKey: string;
    titleKey: string;
    recoKey: string;
    statusKey: string;
    icon: string;
    statusColor: 'ochre' | 'warning' | 'positive';
}

@Component({
    selector: 'ai-insights-widget',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, RippleModule],
    template: `
        <section id="ai-insights" class="py-20 md:py-28 px-6 lg:px-20 bg-surface-0 dark:bg-surface-900 overflow-hidden">
            <div class="max-w-6xl mx-auto">
                <!-- Header -->
                <div class="text-center max-w-3xl mx-auto mb-14">
                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-200 dark:border-brand-700 bg-brand-700/10 dark:bg-brand-300/15 text-brand-700 dark:text-brand-300 text-sm font-medium mb-6">
                        <i class="pi pi-sparkles text-xs"></i>
                        <span>{{ t('landing.aiInsights.eyebrow') }}</span>
                    </div>
                    <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-surface-900 dark:text-white leading-tight mb-4">
                        {{ t('landing.aiInsights.h2a') }}<br>
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-brand-700 to-ochre-500 dark:from-ochre-300 dark:to-ochre-400">
                            {{ t('landing.aiInsights.h2b') }}
                        </span>
                    </h2>
                    <p class="text-base md:text-lg text-surface-600 dark:text-surface-400 leading-relaxed">
                        {{ t('landing.aiInsights.description') }}
                    </p>
                </div>

                <!-- Insight cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                    @for (card of cards; track card.tagKey) {
                        <div class="group relative p-6 rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800
                                    hover:border-ochre-500/40 dark:hover:border-ochre-500/30 hover:shadow-lg transition-all duration-300">
                            <!-- AI sparkle -->
                            <div class="absolute top-5 right-5 w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-800/30 flex items-center justify-center
                                        opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                                <i class="pi pi-sparkles text-sm text-brand-600 dark:text-brand-300"></i>
                            </div>

                            <!-- Tag -->
                            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4"
                                 [ngClass]="tagClasses(card.statusColor)">
                                <i class="pi {{ card.icon }} text-[10px]"></i>
                                {{ t(card.tagKey) }}
                            </div>

                            <!-- Insight title -->
                            <h3 class="text-lg font-bold text-surface-900 dark:text-white leading-snug mb-3 pr-8">
                                {{ t(card.titleKey) }}
                            </h3>

                            <!-- Recommendation -->
                            <div class="flex gap-3 p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700/50 mb-4">
                                <i class="pi pi-arrow-right text-xs text-ochre-500 dark:text-ochre-400 mt-0.5 shrink-0"></i>
                                <p class="text-sm text-surface-700 dark:text-surface-300 leading-relaxed">
                                    {{ t(card.recoKey) }}
                                </p>
                            </div>

                            <!-- Status pill -->
                            <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                                 [ngClass]="statusClasses(card.statusColor)">
                                <span class="w-1.5 h-1.5 rounded-full" [ngClass]="dotClass(card.statusColor)"></span>
                                {{ t(card.statusKey) }}
                            </div>
                        </div>
                    }
                </div>

                <!-- Sample note -->
                <div class="text-center">
                    <p class="text-xs text-surface-500 dark:text-surface-500 italic mb-6">
                        {{ t('landing.aiInsights.sampleNote') }}
                    </p>
                </div>
            </div>
        </section>
    `
})
export class AiInsightsWidget {
    private i18n = inject(I18nService);
    private router = inject(Router);

    readonly cards: InsightCard[] = [
        {
            tagKey: 'landing.aiInsights.card1Tag',
            titleKey: 'landing.aiInsights.card1Title',
            recoKey: 'landing.aiInsights.card1Reco',
            statusKey: 'landing.aiInsights.card1Status',
            icon: 'pi-shield',
            statusColor: 'ochre',
        },
        {
            tagKey: 'landing.aiInsights.card2Tag',
            titleKey: 'landing.aiInsights.card2Title',
            recoKey: 'landing.aiInsights.card2Reco',
            statusKey: 'landing.aiInsights.card2Status',
            icon: 'pi-exclamation-triangle',
            statusColor: 'warning',
        },
        {
            tagKey: 'landing.aiInsights.card3Tag',
            titleKey: 'landing.aiInsights.card3Title',
            recoKey: 'landing.aiInsights.card3Reco',
            statusKey: 'landing.aiInsights.card3Status',
            icon: 'pi-flag',
            statusColor: 'positive',
        },
    ];

    get currentLang(): string {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        return '/' + (match ? match[1] : 'fr');
    }

    t(key: string): string { return this.i18n.t(key); }

    tagClasses(color: InsightCard['statusColor']): Record<string, boolean> {
        return {
            'bg-ochre-100 dark:bg-ochre-900/20 text-ochre-700 dark:text-ochre-400': color === 'ochre',
            'bg-warning/10 dark:bg-warning/15 text-warning dark:text-yellow-400': color === 'warning',
            'bg-positive-100 dark:bg-positive-700/20 text-positive dark:text-positive-400': color === 'positive',
        };
    }

    statusClasses(color: InsightCard['statusColor']): Record<string, boolean> {
        return {
            'bg-ochre-50 dark:bg-ochre-900/15 text-ochre-700 dark:text-ochre-400': color === 'ochre',
            'bg-yellow-50 dark:bg-yellow-900/15 text-yellow-700 dark:text-yellow-400': color === 'warning',
            'bg-positive-50 dark:bg-positive-900/15 text-positive-700 dark:text-positive-400': color === 'positive',
        };
    }

    dotClass(color: InsightCard['statusColor']): string {
        switch (color) {
            case 'ochre': return 'bg-ochre-500';
            case 'warning': return 'bg-yellow-500';
            case 'positive': return 'bg-positive-500';
        }
    }
}
