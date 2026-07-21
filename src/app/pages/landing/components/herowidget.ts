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
        <div id="hero" class="relative min-h-[88vh] flex items-center overflow-hidden bg-surface-0 dark:bg-surface-950">
            <!-- Airy background: one soft static glow, no grid, no pulse -->
            <div class="absolute inset-0 pointer-events-none">
                <div class="absolute -top-32 right-[-10%] w-[42rem] h-[42rem] bg-ochre-500/10 rounded-full blur-3xl"></div>
                <div class="absolute bottom-[-20%] left-[-10%] w-[38rem] h-[38rem] bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-3xl"></div>
            </div>

            <div class="relative z-10 max-w-[1600px] mx-auto w-full px-6 lg:px-10 py-12">
                <div class="grid grid-cols-12 gap-y-10 lg:gap-8 items-center">
                    <!-- Left Content (indented on desktop so the headline starts under the "d" of Omaad) -->
                    <div class="col-span-12 lg:col-span-6 min-w-0 text-center lg:text-left lg:pl-32">
                        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 mb-8">
                            <span class="w-2 h-2 rounded-full bg-positive-500"></span>
                            <span class="text-surface-600 dark:text-surface-300 text-sm font-medium tracking-wide">{{ t('landing.hero.badge') }}</span>
                        </div>

                        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-surface-900 dark:text-white leading-[1.1] tracking-tight mb-6">
                            <span class="block text-ochre-600 dark:text-ochre-400">{{ t('landing.hero.h1a') }}</span>
                            <span class="block">{{ t('landing.hero.h1b') }} {{ t('landing.hero.h1c') }}</span>
                        </h1>

                        <p class="text-lg md:text-xl text-surface-600 dark:text-surface-300 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
                            {{ t('landing.hero.description') }}
                            <strong class="font-semibold text-surface-900 dark:text-white">{{ t('landing.hero.descriptionHighlight') }}</strong>
                            {{ t('landing.hero.descriptionSuffix') }}
                        </p>

                        <div class="flex flex-wrap justify-center lg:justify-start gap-10 mb-10">
                            <div class="text-center lg:text-left">
                                <div class="text-3xl font-bold text-surface-900 dark:text-white tracking-tight">{{ t('landing.hero.stat1Value') }}</div>
                                <div class="text-surface-500 dark:text-surface-400 text-sm">{{ t('landing.hero.stat1Label') }}</div>
                            </div>
                            <div class="text-center lg:text-left">
                                <div class="text-3xl font-bold text-surface-900 dark:text-white tracking-tight">{{ t('landing.hero.stat2Value') }}</div>
                                <div class="text-surface-500 dark:text-surface-400 text-sm">{{ t('landing.hero.stat2Label') }}</div>
                            </div>
                            <div class="text-center lg:text-left">
                                <div class="text-3xl font-bold text-surface-900 dark:text-white tracking-tight">{{ t('landing.hero.stat3Value') }}</div>
                                <div class="text-surface-500 dark:text-surface-400 text-sm">{{ t('landing.hero.stat3Label') }}</div>
                            </div>
                        </div>

                        <div class="flex flex-wrap justify-center lg:justify-start gap-3">
                            <button pButton pRipple [rounded]="true" [routerLink]="[currentLang, 'auth', 'register']"
                                class="!text-lg !px-8 !py-3 !bg-ochre-500 hover:!bg-ochre-400 !border-0 !font-semibold !text-warm-900 hover:!shadow-lg transition-all duration-300">
                                <i class="pi pi-chart-line mr-2"></i>
                                {{ t('landing.hero.ctaDashboard') }}
                            </button>
                            <button pButton pRipple [rounded]="true" [outlined]="true"
                                (click)="scrollToFeatures()"
                                class="!text-lg !px-8 !py-3 !bg-transparent !border !border-surface-300 dark:!border-surface-600 !text-surface-700 dark:!text-surface-200 hover:!bg-surface-100 dark:hover:!bg-surface-800 transition-all duration-300">
                                <i class="pi pi-compass mr-2"></i>
                                {{ t('landing.hero.ctaFeatures') }}
                            </button>
                        </div>
                    </div>

                    <!-- Right, Dashboard preview (theme-adaptive product card, P-landing) -->
                    <div class="col-span-12 lg:col-span-6 min-w-0 mt-6 lg:mt-0">
                        <div class="relative mx-auto w-full max-w-[30rem] lg:max-w-none">
                            <!-- Soft brand glow behind the window -->
                            <div class="absolute -inset-6 bg-gradient-to-tr from-ochre-500/15 via-transparent to-brand-500/10 dark:from-ochre-500/20 dark:to-brand-500/20 rounded-[2rem] blur-2xl pointer-events-none"></div>

                            <!-- App window -->
                            <div class="relative rounded-2xl overflow-hidden bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-2xl ring-1 ring-surface-900/5 dark:ring-white/10">
                                <!-- Browser chrome -->
                                <div class="flex items-center gap-2 px-4 py-3 border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50">
                                    <div class="flex gap-1.5">
                                        <span class="w-2.5 h-2.5 rounded-full bg-negative/60"></span>
                                        <span class="w-2.5 h-2.5 rounded-full bg-ochre-500/70"></span>
                                        <span class="w-2.5 h-2.5 rounded-full bg-positive-500/70"></span>
                                    </div>
                                    <span class="ml-2 text-surface-400 dark:text-surface-500 text-xs tracking-wide">omaad.africa</span>
                                    <span class="ml-auto inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-700 text-white text-[9px] font-bold">MS</span>
                                </div>

                                <div class="p-5 space-y-4">
                                    <!-- Patrimoine Net headline + rising sparkline -->
                                    <div class="flex items-start justify-between gap-4">
                                        <div class="min-w-0">
                                            <div class="text-surface-500 dark:text-surface-400 text-[10px] uppercase tracking-wider mb-1">Patrimoine Net</div>
                                            <div class="flex items-baseline gap-1.5">
                                                <span class="text-surface-900 dark:text-white font-bold text-3xl tracking-tight">85,6M</span>
                                                <span class="text-surface-400 dark:text-surface-500 text-sm">FCFA</span>
                                            </div>
                                            <span class="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-positive-500/10 text-positive-600 dark:text-positive-400 text-xs font-semibold">
                                                <i class="pi pi-arrow-up text-[8px]"></i>+12,5%
                                            </span>
                                        </div>
                                        <svg viewBox="0 0 120 44" class="w-24 h-11 shrink-0 mt-1" preserveAspectRatio="none" aria-hidden="true">
                                            <defs>
                                                <linearGradient id="heroSpark" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stop-color="#C77B3C" stop-opacity="0.28" />
                                                    <stop offset="100%" stop-color="#C77B3C" stop-opacity="0" />
                                                </linearGradient>
                                            </defs>
                                            <path d="M0,36 L12,33 L24,34 L36,27 L48,29 L60,20 L72,22 L84,14 L96,16 L108,7 L120,5 L120,44 L0,44 Z" fill="url(#heroSpark)" />
                                            <polyline points="0,36 12,33 24,34 36,27 48,29 60,20 72,22 84,14 96,16 108,7 120,5"
                                                      fill="none" stroke="#C77B3C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                        </svg>
                                    </div>

                                    <!-- 3 mini KPIs -->
                                    <div class="grid grid-cols-3 gap-2">
                                        <div class="rounded-xl px-3 py-2.5 text-center bg-surface-50 dark:bg-surface-800/60 border border-surface-100 dark:border-surface-800">
                                            <div class="text-[10px] text-surface-500 dark:text-surface-400 mb-0.5">{{ t('landing.hero.mockupSavings') }}</div>
                                            <div class="text-brand-700 dark:text-brand-300 font-bold text-sm">38%</div>
                                        </div>
                                        <div class="rounded-xl px-3 py-2.5 text-center bg-surface-50 dark:bg-surface-800/60 border border-surface-100 dark:border-surface-800">
                                            <div class="text-[10px] text-surface-500 dark:text-surface-400 mb-0.5">{{ t('landing.hero.mockupFire') }}</div>
                                            <div class="text-ochre-600 dark:text-ochre-400 font-bold text-sm">43%</div>
                                        </div>
                                        <div class="rounded-xl px-3 py-2.5 text-center bg-surface-50 dark:bg-surface-800/60 border border-surface-100 dark:border-surface-800">
                                            <div class="text-[10px] text-surface-500 dark:text-surface-400 mb-0.5">Dettes</div>
                                            <div class="text-negative font-bold text-sm">−4,2M</div>
                                        </div>
                                    </div>

                                    <!-- FIRE progress (brand → ochre → positive gradient) -->
                                    <div class="rounded-xl p-3 bg-surface-50 dark:bg-surface-800/40 border border-surface-100 dark:border-surface-800">
                                        <div class="flex items-center justify-between mb-1.5">
                                            <span class="text-surface-500 dark:text-surface-400 text-[10px] font-medium uppercase tracking-wider">{{ t('landing.hero.mockupFire') }}</span>
                                            <span class="text-positive-600 dark:text-positive-400 text-xs font-bold">43% · 12 {{ t('landing.hero.mockupFireYears') }}</span>
                                        </div>
                                        <div class="h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                                            <div class="h-full rounded-full bg-gradient-to-r from-brand-700 via-ochre-500 to-positive-500" style="width: 43%"></div>
                                        </div>
                                    </div>

                                    <!-- Asset breakdown -->
                                    <div class="space-y-2.5">
                                        <div class="flex items-center gap-2.5">
                                            <div class="w-6 h-6 rounded-md bg-brand-100 dark:bg-brand-700/25 flex items-center justify-center shrink-0"><i class="pi pi-home text-brand-700 dark:text-brand-300" style="font-size:10px"></i></div>
                                            <span class="text-surface-600 dark:text-surface-400 text-xs flex-1 truncate">Immobilier</span>
                                            <span class="text-surface-900 dark:text-surface-0 text-xs font-semibold tnum">52,4M</span>
                                        </div>
                                        <div class="flex items-center gap-2.5">
                                            <div class="w-6 h-6 rounded-md bg-ochre-100 dark:bg-ochre-800/30 flex items-center justify-center shrink-0"><i class="pi pi-chart-line text-ochre-600 dark:text-ochre-400" style="font-size:10px"></i></div>
                                            <span class="text-surface-600 dark:text-surface-400 text-xs flex-1 truncate">BRVM / SONATEL</span>
                                            <span class="text-surface-900 dark:text-surface-0 text-xs font-semibold tnum">18,2M</span>
                                        </div>
                                        <div class="flex items-center gap-2.5">
                                            <div class="w-6 h-6 rounded-md bg-brand-100 dark:bg-brand-700/25 flex items-center justify-center shrink-0"><i class="pi pi-users text-brand-700 dark:text-brand-300" style="font-size:10px"></i></div>
                                            <span class="text-surface-600 dark:text-surface-400 text-xs flex-1 truncate">Tontine Famille</span>
                                            <span class="text-surface-900 dark:text-surface-0 text-xs font-semibold tnum">8,5M</span>
                                        </div>
                                        <div class="flex items-center gap-2.5">
                                            <div class="w-6 h-6 rounded-md bg-brand-100 dark:bg-brand-700/25 flex items-center justify-center shrink-0"><i class="pi pi-mobile text-brand-700 dark:text-brand-300" style="font-size:10px"></i></div>
                                            <span class="text-surface-600 dark:text-surface-400 text-xs flex-1 truncate">Wave</span>
                                            <span class="text-surface-900 dark:text-surface-0 text-xs font-semibold tnum">6,5M</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
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
