import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { RouterModule, Router } from '@angular/router';
import { I18nService } from '../../../i18n/i18n.service';

@Component({
    selector: 'hero-widget',
    standalone: true,
    imports: [ButtonModule, RippleModule, RouterModule],
    template: `
        <div id="hero" class="relative min-h-[90vh] flex items-center overflow-hidden">
            <!-- Animated Background -->
            <div class="absolute inset-0 bg-gradient-to-br from-warm-900 via-brand-950 to-warm-900">
                <div class="absolute inset-0 opacity-20" style="background-image: linear-gradient(rgba(199, 123, 60, 0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(199, 123, 60, 0.25) 1px, transparent 1px); background-size: 60px 60px;"></div>
                <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-700/25 dark:bg-brand-300/25 rounded-full blur-3xl animate-pulse"></div>
                <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-brand-700/15 dark:bg-brand-300/20 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
                <div class="absolute top-1/2 right-1/3 w-64 h-64 bg-positive/20 rounded-full blur-3xl animate-pulse" style="animation-delay: 2s;"></div>
            </div>

            <div class="relative z-10 w-full px-6 lg:px-20 py-12">
                <div class="grid grid-cols-12 gap-8 items-center">
                    <!-- Left Content -->
                    <div class="col-span-12 lg:col-span-6 text-center lg:text-left">
                        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-700/10 dark:bg-brand-300/15 border border-brand-200 dark:border-brand-700 mb-8">
                            <span class="relative flex h-2 w-2">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-positive-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-2 w-2 bg-positive-500"></span>
                            </span>
                            <span class="text-brand-300 text-sm font-medium tracking-wide">{{ t('landing.hero.badge') }}</span>
                        </div>

                        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                            <span class="block text-transparent bg-clip-text bg-gradient-to-r from-brand-200 via-ochre-300 to-ochre-400">{{ t('landing.hero.h1a') }}</span>
                            <span class="block">{{ t('landing.hero.h1b') }}</span>
                            <span class="block">{{ t('landing.hero.h1c') }}</span>
                        </h1>

                        <p class="text-lg md:text-xl text-warm-300 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
                            {{ t('landing.hero.description') }}
                            <!-- Ochre = premium accent. High-contrast against the dark hero bg
                                 + heavier weight + decorative underline = the "Omaad Wealth"
                                 reference reads as a wordmark, not body text. -->
                            <strong class="text-ochre-400 font-bold tracking-tight underline decoration-ochre-500/40 decoration-2 underline-offset-4">{{ t('landing.hero.descriptionHighlight') }}</strong>
                            {{ t('landing.hero.descriptionSuffix') }}
                        </p>

                        <div class="flex flex-wrap justify-center lg:justify-start gap-8 mb-10">
                            <div class="text-center">
                                <div class="text-3xl font-bold text-ochre-400">{{ t('landing.hero.stat1Value') }}</div>
                                <div class="text-warm-400 text-sm">{{ t('landing.hero.stat1Label') }}</div>
                            </div>
                            <div class="text-center">
                                <div class="text-3xl font-bold text-ochre-400">{{ t('landing.hero.stat2Value') }}</div>
                                <div class="text-warm-400 text-sm">{{ t('landing.hero.stat2Label') }}</div>
                            </div>
                            <div class="text-center">
                                <div class="text-3xl font-bold text-ochre-400">{{ t('landing.hero.stat3Value') }}</div>
                                <div class="text-warm-400 text-sm">{{ t('landing.hero.stat3Label') }}</div>
                            </div>
                        </div>

                        <div class="flex flex-wrap justify-center lg:justify-start gap-4">
                            <button pButton pRipple [rounded]="true" [routerLink]="currentLang"
                                class="!text-lg !px-8 !py-3 !bg-gradient-to-r !from-brand-700 !to-brand-500 !border-0 !font-semibold hover:!shadow-lg hover:!shadow-card transition-all duration-300">
                                <i class="pi pi-chart-line mr-2"></i>
                                {{ t('landing.hero.ctaDashboard') }}
                            </button>
                            <button pButton pRipple [rounded]="true" [outlined]="true"
                                (click)="scrollToFeatures()"
                                class="!text-lg !px-8 !py-3 !border-warm-600 !text-warm-300 hover:!bg-warm-700 transition-all duration-300">
                                <i class="pi pi-compass mr-2"></i>
                                {{ t('landing.hero.ctaFeatures') }}
                            </button>
                        </div>
                    </div>

                    <!-- Right — Dashboard mockup (illustrative numbers stay, UI labels translated) -->
                    <div class="col-span-12 lg:col-span-6 mt-12 lg:mt-0">
                        <div class="relative">
                            <div class="absolute -inset-4 bg-gradient-to-r from-brand-700/20 via-ochre-500/20 to-brand-500/20 rounded-2xl blur-xl"></div>
                            <div class="relative bg-warm-900/90 backdrop-blur-sm border border-warm-700/50 rounded-2xl shadow-2xl overflow-hidden">
                                <!-- Fake topbar -->
                                <div class="flex items-center gap-2 px-5 py-3 border-b border-warm-700/50 bg-warm-800/60">
                                    <div class="w-2.5 h-2.5 rounded-full bg-negative/70"></div>
                                    <div class="w-2.5 h-2.5 rounded-full bg-ochre-500/70"></div>
                                    <div class="w-2.5 h-2.5 rounded-full bg-positive/70"></div>
                                    <span class="ml-3 text-warm-500 text-xs">omaad.app</span>
                                    <div class="ml-auto w-6 h-6 rounded-full bg-gradient-to-br from-brand-700 to-brand-500 flex items-center justify-center">
                                        <span class="text-white text-[8px] font-bold">MS</span>
                                    </div>
                                </div>

                                <div class="p-5 space-y-4">
                                    <!-- Patrimoine Net headline -->
                                    <div>
                                        <div class="text-warm-500 text-[10px] uppercase tracking-wider mb-1">Patrimoine Net</div>
                                        <div class="flex items-baseline gap-2">
                                            <span class="text-white font-bold text-2xl">85,6M</span>
                                            <span class="text-warm-400 text-sm">FCFA</span>
                                            <span class="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-positive/10 text-positive-400 text-xs font-semibold">
                                                <i class="pi pi-arrow-up text-[8px]"></i>+12.5%
                                            </span>
                                        </div>
                                    </div>

                                    <!-- 3 mini KPIs -->
                                    <div class="grid grid-cols-3 gap-2">
                                        <div class="bg-warm-800/60 rounded-lg px-3 py-2.5 text-center">
                                            <div class="text-[10px] text-warm-500 mb-0.5">{{ t('landing.hero.mockupSavings') }}</div>
                                            <div class="text-brand-700 dark:text-brand-300 font-bold text-sm">38%</div>
                                        </div>
                                        <div class="bg-warm-800/60 rounded-lg px-3 py-2.5 text-center">
                                            <div class="text-[10px] text-warm-500 mb-0.5">{{ t('landing.hero.mockupFire') }}</div>
                                            <div class="text-brand-700 dark:text-brand-300 font-bold text-sm">43%</div>
                                        </div>
                                        <div class="bg-warm-800/60 rounded-lg px-3 py-2.5 text-center">
                                            <div class="text-[10px] text-warm-500 mb-0.5">Dettes</div>
                                            <div class="text-negative font-bold text-sm">−4,2M</div>
                                        </div>
                                    </div>

                                    <!-- FIRE progress -->
                                    <div class="bg-warm-800/40 rounded-xl p-3">
                                        <div class="flex items-center justify-between mb-1.5">
                                            <span class="text-warm-400 text-[10px] font-medium uppercase tracking-wider">{{ t('landing.hero.mockupFire') }}</span>
                                            <span class="text-positive-400 text-xs font-bold">43% · 12 {{ t('landing.hero.mockupFireYears') }}</span>
                                        </div>
                                        <div class="h-2 bg-warm-700 rounded-full overflow-hidden">
                                            <div class="h-full bg-gradient-to-r from-brand-700 via-cyan-500 to-positive-500 rounded-full" style="width: 43%"></div>
                                        </div>
                                    </div>

                                    <!-- Asset breakdown -->
                                    <div class="space-y-2">
                                        <div class="flex items-center gap-2.5">
                                            <div class="w-6 h-6 rounded-md bg-brand-700/20 dark:bg-brand-300/20 flex items-center justify-center shrink-0"><i class="pi pi-home text-brand-700 dark:text-brand-300" style="font-size:10px"></i></div>
                                            <span class="text-warm-400 text-xs flex-1">Immobilier</span>
                                            <span class="text-white text-xs font-semibold tnum">52,4M</span>
                                        </div>
                                        <div class="flex items-center gap-2.5">
                                            <div class="w-6 h-6 rounded-md bg-brand-700/15 dark:bg-brand-300/20 flex items-center justify-center shrink-0"><i class="pi pi-chart-line text-brand-700 dark:text-brand-300" style="font-size:10px"></i></div>
                                            <span class="text-warm-400 text-xs flex-1">BRVM / SONATEL</span>
                                            <span class="text-white text-xs font-semibold tnum">18,2M</span>
                                        </div>
                                        <div class="flex items-center gap-2.5">
                                            <div class="w-6 h-6 rounded-md bg-negative/20 flex items-center justify-center shrink-0"><i class="pi pi-users text-negative" style="font-size:10px"></i></div>
                                            <span class="text-warm-400 text-xs flex-1">Tontine Famille</span>
                                            <span class="text-white text-xs font-semibold tnum">8,5M</span>
                                        </div>
                                        <div class="flex items-center gap-2.5">
                                            <div class="w-6 h-6 rounded-md bg-brand-700/20 dark:bg-brand-300/20 flex items-center justify-center shrink-0"><i class="pi pi-mobile text-brand-700 dark:text-brand-300" style="font-size:10px"></i></div>
                                            <span class="text-warm-400 text-xs flex-1">Wave</span>
                                            <span class="text-white text-xs font-semibold tnum">6,5M</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
                <i class="pi pi-chevron-down text-warm-400 text-2xl"></i>
            </div>
        </div>
    `
})
export class HeroWidget {
    private i18n = inject(I18nService);
    private router = inject(Router);

    get currentLang(): string {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        return '/' + (match ? match[1] : 'fr');
    }

    t(key: string): string { return this.i18n.t(key); }

    scrollToFeatures() {
        document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
    }
}
