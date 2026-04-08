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
            <div class="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
                <div class="absolute inset-0 opacity-20" style="background-image: linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px); background-size: 60px 60px;"></div>
                <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl animate-pulse"></div>
                <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
                <div class="absolute top-1/2 right-1/3 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" style="animation-delay: 2s;"></div>
            </div>

            <div class="relative z-10 w-full px-6 lg:px-20 py-12">
                <div class="grid grid-cols-12 gap-8 items-center">
                    <!-- Left Content -->
                    <div class="col-span-12 lg:col-span-6 text-center lg:text-left">
                        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 mb-8">
                            <span class="relative flex h-2 w-2">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span class="text-indigo-300 text-sm font-medium tracking-wide">{{ t('landing.hero.badge') }}</span>
                        </div>

                        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                            <span class="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">{{ t('landing.hero.h1a') }}</span>
                            <span class="block">{{ t('landing.hero.h1b') }}</span>
                            <span class="block">{{ t('landing.hero.h1c') }}</span>
                        </h1>

                        <p class="text-lg md:text-xl text-slate-300 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
                            {{ t('landing.hero.description') }}
                            <span class="text-cyan-400 font-medium">{{ t('landing.hero.descriptionHighlight') }}</span>
                            {{ t('landing.hero.descriptionSuffix') }}
                        </p>

                        <div class="flex flex-wrap justify-center lg:justify-start gap-8 mb-10">
                            <div class="text-center">
                                <div class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">{{ t('landing.hero.stat1Value') }}</div>
                                <div class="text-slate-400 text-sm">{{ t('landing.hero.stat1Label') }}</div>
                            </div>
                            <div class="text-center">
                                <div class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">{{ t('landing.hero.stat2Value') }}</div>
                                <div class="text-slate-400 text-sm">{{ t('landing.hero.stat2Label') }}</div>
                            </div>
                            <div class="text-center">
                                <div class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">{{ t('landing.hero.stat3Value') }}</div>
                                <div class="text-slate-400 text-sm">{{ t('landing.hero.stat3Label') }}</div>
                            </div>
                        </div>

                        <div class="flex flex-wrap justify-center lg:justify-start gap-4">
                            <button pButton pRipple [rounded]="true" [routerLink]="currentLang"
                                class="!text-lg !px-8 !py-3 !bg-gradient-to-r !from-indigo-600 !to-cyan-500 !border-0 !font-semibold hover:!shadow-lg hover:!shadow-indigo-500/30 transition-all duration-300">
                                <i class="pi pi-chart-line mr-2"></i>
                                {{ t('landing.hero.ctaDashboard') }}
                            </button>
                            <button pButton pRipple [rounded]="true" [outlined]="true"
                                (click)="scrollToFeatures()"
                                class="!text-lg !px-8 !py-3 !border-slate-600 !text-slate-300 hover:!bg-slate-800 transition-all duration-300">
                                <i class="pi pi-compass mr-2"></i>
                                {{ t('landing.hero.ctaFeatures') }}
                            </button>
                        </div>
                    </div>

                    <!-- Right — Dashboard mockup (illustrative numbers stay, UI labels translated) -->
                    <div class="col-span-12 lg:col-span-6 mt-12 lg:mt-0">
                        <div class="relative">
                            <div class="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-cyan-500/20 to-emerald-500/20 rounded-2xl blur-xl"></div>
                            <div class="relative bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
                                <!-- Fake topbar -->
                                <div class="flex items-center gap-2 px-5 py-3 border-b border-slate-700/50 bg-slate-800/60">
                                    <div class="w-2.5 h-2.5 rounded-full bg-red-500/70"></div>
                                    <div class="w-2.5 h-2.5 rounded-full bg-yellow-500/70"></div>
                                    <div class="w-2.5 h-2.5 rounded-full bg-green-500/70"></div>
                                    <span class="ml-3 text-slate-500 text-xs">omaad.app</span>
                                    <div class="ml-auto w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
                                        <span class="text-white text-[8px] font-bold">MS</span>
                                    </div>
                                </div>

                                <div class="p-5 space-y-4">
                                    <!-- Patrimoine Net headline -->
                                    <div>
                                        <div class="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Patrimoine Net</div>
                                        <div class="flex items-baseline gap-2">
                                            <span class="text-white font-bold text-2xl">85,6M</span>
                                            <span class="text-slate-400 text-sm">FCFA</span>
                                            <span class="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                                                <i class="pi pi-arrow-up text-[8px]"></i>+12.5%
                                            </span>
                                        </div>
                                    </div>

                                    <!-- 3 mini KPIs -->
                                    <div class="grid grid-cols-3 gap-2">
                                        <div class="bg-slate-800/60 rounded-lg px-3 py-2.5 text-center">
                                            <div class="text-[10px] text-slate-500 mb-0.5">{{ t('landing.hero.mockupSavings') }}</div>
                                            <div class="text-cyan-400 font-bold text-sm">38%</div>
                                        </div>
                                        <div class="bg-slate-800/60 rounded-lg px-3 py-2.5 text-center">
                                            <div class="text-[10px] text-slate-500 mb-0.5">{{ t('landing.hero.mockupFire') }}</div>
                                            <div class="text-indigo-400 font-bold text-sm">43%</div>
                                        </div>
                                        <div class="bg-slate-800/60 rounded-lg px-3 py-2.5 text-center">
                                            <div class="text-[10px] text-slate-500 mb-0.5">Dettes</div>
                                            <div class="text-rose-400 font-bold text-sm">−4,2M</div>
                                        </div>
                                    </div>

                                    <!-- FIRE progress -->
                                    <div class="bg-slate-800/40 rounded-xl p-3">
                                        <div class="flex items-center justify-between mb-1.5">
                                            <span class="text-slate-400 text-[10px] font-medium uppercase tracking-wider">{{ t('landing.hero.mockupFire') }}</span>
                                            <span class="text-emerald-400 text-xs font-bold">43% · 12 {{ t('landing.hero.mockupFireYears') }}</span>
                                        </div>
                                        <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
                                            <div class="h-full bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500 rounded-full" style="width: 43%"></div>
                                        </div>
                                    </div>

                                    <!-- Asset breakdown -->
                                    <div class="space-y-2">
                                        <div class="flex items-center gap-2.5">
                                            <div class="w-6 h-6 rounded-md bg-indigo-500/20 flex items-center justify-center shrink-0"><i class="pi pi-home text-indigo-400" style="font-size:10px"></i></div>
                                            <span class="text-slate-400 text-xs flex-1">Immobilier</span>
                                            <span class="text-white text-xs font-semibold tnum">52,4M</span>
                                        </div>
                                        <div class="flex items-center gap-2.5">
                                            <div class="w-6 h-6 rounded-md bg-cyan-500/20 flex items-center justify-center shrink-0"><i class="pi pi-chart-line text-cyan-400" style="font-size:10px"></i></div>
                                            <span class="text-slate-400 text-xs flex-1">BRVM / SONATEL</span>
                                            <span class="text-white text-xs font-semibold tnum">18,2M</span>
                                        </div>
                                        <div class="flex items-center gap-2.5">
                                            <div class="w-6 h-6 rounded-md bg-pink-500/20 flex items-center justify-center shrink-0"><i class="pi pi-users text-pink-400" style="font-size:10px"></i></div>
                                            <span class="text-slate-400 text-xs flex-1">Tontine Famille</span>
                                            <span class="text-white text-xs font-semibold tnum">8,5M</span>
                                        </div>
                                        <div class="flex items-center gap-2.5">
                                            <div class="w-6 h-6 rounded-md bg-sky-500/20 flex items-center justify-center shrink-0"><i class="pi pi-mobile text-sky-400" style="font-size:10px"></i></div>
                                            <span class="text-slate-400 text-xs flex-1">Wave</span>
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
                <i class="pi pi-chevron-down text-slate-400 text-2xl"></i>
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
