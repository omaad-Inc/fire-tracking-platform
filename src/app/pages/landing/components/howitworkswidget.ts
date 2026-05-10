import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../i18n/i18n.service';

@Component({
    selector: 'how-it-works-widget',
    standalone: true,
    imports: [CommonModule],
    template: `
        <section id="how-it-works" class="py-20 md:py-28 px-6 lg:px-20 bg-surface-0 dark:bg-surface-900">
            <div class="max-w-6xl mx-auto">
                <!-- Header -->
                <div class="text-center max-w-3xl mx-auto mb-16">
                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-200 dark:border-brand-700 bg-brand-700/10 dark:bg-brand-300/15 text-brand-700 dark:text-brand-300 text-sm font-medium mb-6">
                        <i class="pi pi-check-circle text-xs"></i>
                        <span>{{ t('landing.howItWorks.eyebrow') }}</span>
                    </div>
                    <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-surface-900 dark:text-white leading-tight mb-4">
                        {{ t('landing.howItWorks.h2a') }}
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-brand-700 to-ochre-500 dark:from-ochre-300 dark:to-ochre-400">
                            {{ t('landing.howItWorks.h2b') }}
                        </span>
                    </h2>
                    <p class="text-base md:text-lg text-surface-600 dark:text-surface-400 leading-relaxed">
                        {{ t('landing.howItWorks.description') }}
                    </p>
                </div>

                <!-- 3-step grid -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-0 relative">
                    <!-- Connector line (desktop only) -->
                    <div class="hidden md:block absolute top-[52px] left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-brand-300 via-ochre-400 to-brand-300 dark:from-brand-600 dark:via-ochre-500 dark:to-brand-600"></div>

                    @for (step of steps; track step.numberKey) {
                        <div class="relative flex flex-col items-center text-center px-6">
                            <!-- Number circle -->
                            <div class="relative z-10 w-[104px] h-[104px] rounded-full flex items-center justify-center mb-6
                                        bg-surface-0 dark:bg-surface-900 border-2 border-surface-200 dark:border-surface-800
                                        shadow-lg shadow-surface-200/50 dark:shadow-surface-950/50">
                                <div class="w-20 h-20 rounded-full bg-gradient-to-br from-brand-100 to-ochre-100 dark:from-brand-800/40 dark:to-ochre-900/30 flex items-center justify-center">
                                    <i class="pi {{ step.icon }} text-2xl text-brand-700 dark:text-ochre-400"></i>
                                </div>
                            </div>

                            <!-- Step number -->
                            <span class="text-xs font-bold uppercase tracking-[0.2em] text-ochre-600 dark:text-ochre-400 mb-2">
                                {{ t(step.numberKey) }}
                            </span>

                            <!-- Title -->
                            <h3 class="text-lg md:text-xl font-bold text-surface-900 dark:text-white mb-2">
                                {{ t(step.titleKey) }}
                            </h3>

                            <!-- Description -->
                            <p class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed max-w-[280px]">
                                {{ t(step.descKey) }}
                            </p>
                        </div>
                    }
                </div>
            </div>
        </section>
    `
})
export class HowItWorksWidget {
    private i18n = inject(I18nService);

    readonly steps = [
        { numberKey: 'landing.howItWorks.step1Number', titleKey: 'landing.howItWorks.step1Title', descKey: 'landing.howItWorks.step1Desc', icon: 'pi-pencil' },
        { numberKey: 'landing.howItWorks.step2Number', titleKey: 'landing.howItWorks.step2Title', descKey: 'landing.howItWorks.step2Desc', icon: 'pi-chart-bar' },
        { numberKey: 'landing.howItWorks.step3Number', titleKey: 'landing.howItWorks.step3Title', descKey: 'landing.howItWorks.step3Desc', icon: 'pi-flag' },
    ];

    t(key: string): string { return this.i18n.t(key); }
}
