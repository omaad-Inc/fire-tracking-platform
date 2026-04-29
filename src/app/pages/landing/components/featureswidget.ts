import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../i18n/i18n.service';

@Component({
    selector: 'features-widget',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div id="features" class="py-20 px-6 lg:px-20 bg-surface-0 dark:bg-surface-900">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-16">
                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-700/10 dark:bg-brand-300/15 dark:bg-brand-700/20 dark:bg-brand-300/20 border border-brand-200 dark:border-brand-700 mb-6">
                        <i class="pi pi-sparkles text-brand-700 dark:text-brand-300"></i>
                        <span class="text-brand-700 dark:text-brand-300 dark:text-brand-700 dark:text-brand-300 text-sm font-medium">{{ t('landing.features.badge') }}</span>
                    </div>
                    <h2 class="text-4xl md:text-5xl font-bold text-surface-900 dark:text-surface-0 mb-4">
                        {{ t('landing.features.h2a') }}
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-brand-700 to-brand-500">{{ t('landing.features.h2b') }}</span>
                    </h2>
                    <p class="text-xl text-surface-600 dark:text-surface-300 max-w-2xl mx-auto">{{ t('landing.features.description') }}</p>
                </div>

                <div class="grid grid-cols-12 gap-6">
                    <!-- Feature 1 - Large -->
                    <div class="col-span-12 lg:col-span-8">
                        <div class="group h-full p-8 rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100/50 dark:from-brand-950/50 dark:to-brand-950/50 border border-brand-100 dark:border-brand-800/50 hover:shadow-xl hover:shadow-card transition-all duration-500">
                            <div class="flex flex-col md:flex-row gap-8 items-start">
                                <div class="flex-1">
                                    <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-700 to-brand-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <i class="pi pi-chart-line text-white text-2xl"></i>
                                    </div>
                                    <h3 class="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-3">{{ t('landing.features.f1Title') }}</h3>
                                    <p class="text-surface-600 dark:text-surface-300 text-lg leading-relaxed mb-6">{{ t('landing.features.f1Desc') }}</p>
                                    <div class="flex flex-wrap gap-3">
                                        <span class="px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-700/40 text-brand-700 dark:text-brand-300 text-sm">Net Worth</span>
                                        <span class="px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-700/40 text-brand-700 dark:text-brand-300 text-sm">Multi-actifs</span>
                                        <span class="px-3 py-1 rounded-full bg-positive-100 dark:bg-positive-700/40 text-positive dark:text-positive-100 text-sm">Graphiques</span>
                                    </div>
                                </div>
                                <div class="hidden md:block w-48 h-48 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-800 dark:to-brand-700 p-4">
                                    <svg viewBox="0 0 100 100" class="w-full h-full">
                                        <path d="M10 80 Q 30 60 50 50 T 90 20" stroke="currentColor" stroke-width="3" fill="none" class="text-brand-700 dark:text-brand-300 dark:text-brand-700 dark:text-brand-300"/>
                                        <circle cx="90" cy="20" r="4" fill="currentColor" class="text-brand-700 dark:text-brand-300"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Feature 2 -->
                    <div class="col-span-12 md:col-span-6 lg:col-span-4">
                        <div class="group h-full p-6 rounded-2xl bg-gradient-to-br from-positive-50 to-positive-50 dark:from-positive-700/50 dark:to-positive-700/30 border border-positive-100 dark:border-positive-700/40 hover:shadow-xl hover:shadow-lifted transition-all duration-500">
                            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-positive-600 to-positive-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                                <i class="pi pi-wallet text-white text-xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 mb-2">{{ t('landing.features.f2Title') }}</h3>
                            <p class="text-surface-600 dark:text-surface-300">{{ t('landing.features.f2Desc') }}</p>
                        </div>
                    </div>

                    <!-- Feature 3 -->
                    <div class="col-span-12 md:col-span-6 lg:col-span-4">
                        <div class="group h-full p-6 rounded-2xl bg-gradient-to-br from-ochre-50 to-ochre-100 dark:from-ochre-700/30 dark:to-ochre-700/30 border border-ochre-100 dark:border-ochre-700/50 hover:shadow-xl hover:shadow-lifted transition-all duration-500">
                            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-ochre-600 to-ochre-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                                <i class="pi pi-receipt text-white text-xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 mb-2">{{ t('landing.features.f3Title') }}</h3>
                            <p class="text-surface-600 dark:text-surface-300">{{ t('landing.features.f3Desc') }}</p>
                        </div>
                    </div>

                    <!-- Feature 4 -->
                    <div class="col-span-12 md:col-span-6 lg:col-span-4">
                        <div class="group h-full p-6 rounded-2xl bg-gradient-to-br from-negative-50 to-negative-100 dark:from-negative-700/30 dark:to-negative-700/30 border border-negative-100 dark:border-negative-700/50 hover:shadow-xl hover:shadow-lifted transition-all duration-500">
                            <div class="w-12 h-12 rounded-xl bg-gradient-to-br bg-negative flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                                <i class="pi pi-credit-card text-white text-xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 mb-2">{{ t('landing.features.f4Title') }}</h3>
                            <p class="text-surface-600 dark:text-surface-300">{{ t('landing.features.f4Desc') }}</p>
                        </div>
                    </div>

                    <!-- Feature 5 -->
                    <div class="col-span-12 md:col-span-6 lg:col-span-4">
                        <div class="group h-full p-6 rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/40 dark:to-brand-900/40 border border-brand-100 dark:border-brand-800/50 hover:shadow-xl hover:shadow-lifted transition-all duration-500">
                            <div class="w-12 h-12 rounded-xl bg-gradient-to-br bg-brand-700 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                                <i class="pi pi-chart-pie text-white text-xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 mb-2">{{ t('landing.features.f5Title') }}</h3>
                            <p class="text-surface-600 dark:text-surface-300">{{ t('landing.features.f5Desc') }}</p>
                        </div>
                    </div>
                </div>

                <!-- Value proposition banner -->
                <div class="mt-20 relative">
                    <div class="absolute inset-0 bg-gradient-to-r from-brand-700/10 via-cyan-600/10 to-positive-600/10 rounded-3xl blur-xl"></div>
                    <div class="relative p-8 md:p-12 rounded-3xl bg-surface-0 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-xl">
                        <div class="grid grid-cols-12 gap-8 items-center">
                            <div class="col-span-12 md:col-span-8 text-center md:text-left">
                                <blockquote class="text-2xl md:text-3xl text-surface-700 dark:text-surface-200 font-light leading-relaxed mb-4">
                                    {{ t('landing.features.quoteText') }}
                                    <span class="text-brand-700 dark:text-brand-300 dark:text-brand-700 dark:text-brand-300 font-medium">{{ t('landing.features.quotePlan') }}</span>
                                    {{ t('landing.features.quoteText2') }}
                                    <span class="text-brand-700 dark:text-brand-300 dark:text-brand-700 dark:text-brand-300 font-medium">{{ t('landing.features.quoteReality') }}</span>{{ t('landing.features.quoteText3') }}
                                </blockquote>
                                <div class="font-semibold text-surface-900 dark:text-surface-0">{{ t('landing.features.quoteAuthor') }}</div>
                                <div class="text-surface-500 dark:text-surface-400 text-sm">{{ t('landing.features.quoteSubtitle') }}</div>
                            </div>
                            <div class="col-span-12 md:col-span-4 flex flex-col items-center md:items-end gap-3">
                                <div class="flex items-center gap-3 text-surface-600 dark:text-surface-300">
                                    <i class="pi pi-shield text-brand-700 dark:text-brand-300 text-xl"></i>
                                    <span class="font-medium">{{ t('landing.features.propSecure') }}</span>
                                </div>
                                <div class="flex items-center gap-3 text-surface-600 dark:text-surface-300">
                                    <i class="pi pi-lock text-brand-700 dark:text-brand-300 text-xl"></i>
                                    <span class="font-medium">{{ t('landing.features.propPrivate') }}</span>
                                </div>
                                <div class="flex items-center gap-3 text-surface-600 dark:text-surface-300">
                                    <i class="pi pi-desktop text-positive text-xl"></i>
                                    <span class="font-medium">{{ t('landing.features.propMultiPlatform') }}</span>
                                </div>
                                <div class="flex items-center gap-3 text-surface-600 dark:text-surface-300">
                                    <i class="pi pi-globe text-brand-700 dark:text-brand-300 text-xl"></i>
                                    <span class="font-medium">{{ t('landing.features.propMultiLang') }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class FeaturesWidget {
    private i18n = inject(I18nService);
    t(key: string): string { return this.i18n.t(key); }
}
