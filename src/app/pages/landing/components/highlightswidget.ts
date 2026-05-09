import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../i18n/i18n.service';

@Component({
    selector: 'highlights-widget',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div id="highlights" class="py-20 px-6 lg:px-20 bg-gradient-to-b from-surface-0 via-indigo-50/30 to-surface-0 dark:from-surface-900 dark:via-brand-950/30 dark:to-surface-900">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-16">
                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-700/10 dark:bg-brand-300/15 dark:bg-brand-700/15 dark:bg-brand-300/20 border border-brand-700/30 mb-6">
                        <i class="pi pi-bolt text-brand-700 dark:text-brand-300"></i>
                        <span class="text-brand-700 dark:text-brand-300 dark:text-brand-700 dark:text-brand-300 text-sm font-medium">{{ t('landing.highlights.badge') }}</span>
                    </div>
                    <h2 class="text-4xl md:text-5xl font-bold text-surface-900 dark:text-surface-0 mb-4">
                        {{ t('landing.highlights.h2a') }}
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-brand-700 to-positive-500 dark:from-ochre-400 dark:to-positive-400">{{ t('landing.highlights.h2b') }}</span>
                    </h2>
                    <p class="text-xl text-surface-600 dark:text-surface-300 max-w-2xl mx-auto">{{ t('landing.highlights.description') }}</p>
                </div>

                <!-- Highlight 1 -->
                <div class="grid grid-cols-12 gap-8 items-center mb-20">
                    <div class="col-span-12 lg:col-span-6 order-2 lg:order-1">
                        <div class="relative">
                            <div class="absolute -inset-4 bg-gradient-to-br from-brand-700/20 to-brand-500/20 rounded-3xl blur-2xl"></div>
                            <div class="relative bg-warm-900 rounded-2xl p-6 shadow-2xl border border-warm-700/50">
                                <div class="mb-6">
                                    <div class="flex items-center justify-between mb-3">
                                        <span class="text-warm-300 font-medium">{{ t('landing.highlights.h1MockupTitle') }}</span>
                                        <span class="text-positive-400 font-bold">43%</span>
                                    </div>
                                    <div class="h-4 bg-warm-800 rounded-full overflow-hidden">
                                        <div class="h-full bg-gradient-to-r from-brand-700 via-cyan-500 to-positive-500 rounded-full" style="width: 43%"></div>
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="bg-warm-800/50 rounded-xl p-4">
                                        <div class="flex items-center gap-2 mb-2">
                                            <i class="pi pi-flag text-brand-700 dark:text-brand-300"></i>
                                            <span class="text-warm-400 text-sm">{{ t('landing.highlights.h1MockupFire') }}</span>
                                        </div>
                                        <div class="text-white font-bold text-xl">200M FCFA</div>
                                    </div>
                                    <div class="bg-warm-800/50 rounded-xl p-4">
                                        <div class="flex items-center gap-2 mb-2">
                                            <i class="pi pi-wallet text-brand-700 dark:text-brand-300"></i>
                                            <span class="text-warm-400 text-sm">{{ t('landing.highlights.h1MockupWorth') }}</span>
                                        </div>
                                        <div class="text-white font-bold text-xl">85,6M FCFA</div>
                                    </div>
                                    <div class="bg-warm-800/50 rounded-xl p-4">
                                        <div class="flex items-center gap-2 mb-2">
                                            <i class="pi pi-clock text-positive-400"></i>
                                            <span class="text-warm-400 text-sm">{{ t('landing.highlights.h1MockupTime') }}</span>
                                        </div>
                                        <div class="text-white font-bold text-xl">12 {{ t('landing.highlights.h1MockupYears') }}</div>
                                    </div>
                                    <div class="bg-warm-800/50 rounded-xl p-4">
                                        <div class="flex items-center gap-2 mb-2">
                                            <i class="pi pi-percentage text-ochre-400"></i>
                                            <span class="text-warm-400 text-sm">{{ t('landing.highlights.h1MockupRate') }}</span>
                                        </div>
                                        <div class="text-white font-bold text-xl">4%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-span-12 lg:col-span-6 order-1 lg:order-2 text-center lg:text-left">
                        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-500 flex items-center justify-center mb-6 mx-auto lg:mx-0">
                            <i class="pi pi-compass text-white text-3xl"></i>
                        </div>
                        <h3 class="text-3xl font-bold text-surface-900 dark:text-surface-0 mb-4">{{ t('landing.highlights.h1Title') }}</h3>
                        <p class="text-lg text-surface-600 dark:text-surface-300 leading-relaxed mb-6">{{ t('landing.highlights.h1Desc') }}</p>
                        <ul class="space-y-3">
                            <li class="flex items-center gap-3 text-surface-700 dark:text-surface-200">
                                <div class="w-6 h-6 rounded-full bg-positive-100 dark:bg-positive-700/40 flex items-center justify-center">
                                    <i class="pi pi-check text-positive dark:text-positive-400 text-sm"></i>
                                </div>
                                <span>{{ t('landing.highlights.h1Item1') }}</span>
                            </li>
                            <li class="flex items-center gap-3 text-surface-700 dark:text-surface-200">
                                <div class="w-6 h-6 rounded-full bg-positive-100 dark:bg-positive-700/40 flex items-center justify-center">
                                    <i class="pi pi-check text-positive dark:text-positive-400 text-sm"></i>
                                </div>
                                <span>{{ t('landing.highlights.h1Item2') }}</span>
                            </li>
                            <li class="flex items-center gap-3 text-surface-700 dark:text-surface-200">
                                <div class="w-6 h-6 rounded-full bg-positive-100 dark:bg-positive-700/40 flex items-center justify-center">
                                    <i class="pi pi-check text-positive dark:text-positive-400 text-sm"></i>
                                </div>
                                <span>{{ t('landing.highlights.h1Item3') }}</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <!-- Highlight 2 -->
                <div class="grid grid-cols-12 gap-8 items-center mb-20">
                    <div class="col-span-12 lg:col-span-6 text-center lg:text-left">
                        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-500 flex items-center justify-center mb-6 mx-auto lg:mx-0">
                            <i class="pi pi-chart-bar text-white text-3xl"></i>
                        </div>
                        <h3 class="text-3xl font-bold text-surface-900 dark:text-surface-0 mb-4">{{ t('landing.highlights.h2Title') }}</h3>
                        <p class="text-lg text-surface-600 dark:text-surface-300 leading-relaxed mb-6">{{ t('landing.highlights.h2Desc') }}</p>
                        <ul class="space-y-3">
                            <li class="flex items-center gap-3 text-surface-700 dark:text-surface-200">
                                <div class="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-700/40 flex items-center justify-center">
                                    <i class="pi pi-check text-brand-700 dark:text-brand-300 dark:text-brand-700 dark:text-brand-300 text-sm"></i>
                                </div>
                                <span>{{ t('landing.highlights.h2Item1') }}</span>
                            </li>
                            <li class="flex items-center gap-3 text-surface-700 dark:text-surface-200">
                                <div class="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-700/40 flex items-center justify-center">
                                    <i class="pi pi-check text-brand-700 dark:text-brand-300 dark:text-brand-700 dark:text-brand-300 text-sm"></i>
                                </div>
                                <span>{{ t('landing.highlights.h2Item2') }}</span>
                            </li>
                            <li class="flex items-center gap-3 text-surface-700 dark:text-surface-200">
                                <div class="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-700/40 flex items-center justify-center">
                                    <i class="pi pi-check text-brand-700 dark:text-brand-300 dark:text-brand-700 dark:text-brand-300 text-sm"></i>
                                </div>
                                <span>{{ t('landing.highlights.h2Item3') }}</span>
                            </li>
                        </ul>
                    </div>
                    <div class="col-span-12 lg:col-span-6">
                        <div class="relative">
                            <div class="absolute -inset-4 bg-gradient-to-br from-brand-700/20 to-positive-500/20 rounded-3xl blur-2xl"></div>
                            <div class="relative bg-warm-900 rounded-2xl p-6 shadow-2xl border border-warm-700/50">
                                <div class="flex items-center justify-between mb-6">
                                    <span class="text-warm-300 font-medium">{{ t('landing.highlights.h2MockupTitle') }}</span>
                                    <span class="text-warm-500 text-sm">85,6M FCFA total</span>
                                </div>
                                <div class="space-y-4">
                                    <div>
                                        <div class="flex items-center justify-between mb-2">
                                            <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-brand-700"></div><span class="text-warm-300 text-sm">Immobilier</span></div>
                                            <span class="text-warm-400 text-sm">92%</span>
                                        </div>
                                        <div class="h-2 bg-warm-800 rounded-full"><div class="h-full bg-brand-700 rounded-full" style="width: 92%"></div></div>
                                    </div>
                                    <div>
                                        <div class="flex items-center justify-between mb-2">
                                            <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-brand-700"></div><span class="text-warm-300 text-sm">Actions (PEA)</span></div>
                                            <span class="text-warm-400 text-sm">5%</span>
                                        </div>
                                        <div class="h-2 bg-warm-800 rounded-full"><div class="h-full bg-brand-700 rounded-full" style="width: 5%"></div></div>
                                    </div>
                                    <div>
                                        <div class="flex items-center justify-between mb-2">
                                            <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-positive-500"></div><span class="text-warm-300 text-sm">Liquidités</span></div>
                                            <span class="text-warm-400 text-sm">2.3%</span>
                                        </div>
                                        <div class="h-2 bg-warm-800 rounded-full"><div class="h-full bg-positive-500 rounded-full" style="width: 2.3%"></div></div>
                                    </div>
                                    <div>
                                        <div class="flex items-center justify-between mb-2">
                                            <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-ochre-500"></div><span class="text-warm-300 text-sm">Crypto</span></div>
                                            <span class="text-warm-400 text-sm">0.7%</span>
                                        </div>
                                        <div class="h-2 bg-warm-800 rounded-full"><div class="h-full bg-ochre-500 rounded-full" style="width: 0.7%"></div></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Highlight 3 — Security -->
                <div class="grid grid-cols-12 gap-8 items-center">
                    <div class="col-span-12 lg:col-span-6 order-2 lg:order-1">
                        <div class="relative">
                            <div class="absolute -inset-4 bg-gradient-to-br from-positive/20 to-brand-500/20 rounded-3xl blur-2xl"></div>
                            <div class="relative bg-warm-900 rounded-2xl p-6 shadow-2xl border border-warm-700/50">
                                <div class="space-y-4 py-4">
                                    @for (item of securityItems(); track item.title) {
                                        <div class="flex items-center gap-4 p-3 rounded-xl bg-warm-800/60">
                                            <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" [ngClass]="item.bg">
                                                <i [class]="item.icon"></i>
                                            </div>
                                            <div>
                                                <div class="text-white font-medium text-sm">{{ item.title }}</div>
                                                <div class="text-warm-400 text-xs">{{ item.desc }}</div>
                                            </div>
                                            <i class="pi pi-check-circle text-positive-400 ml-auto"></i>
                                        </div>
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-span-12 lg:col-span-6 order-1 lg:order-2 text-center lg:text-left">
                        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-positive-600 to-positive-500 flex items-center justify-center mb-6 mx-auto lg:mx-0">
                            <i class="pi pi-lock text-white text-3xl"></i>
                        </div>
                        <h3 class="text-3xl font-bold text-surface-900 dark:text-surface-0 mb-4">{{ t('landing.highlights.h3Title') }}</h3>
                        <p class="text-lg text-surface-600 dark:text-surface-300 leading-relaxed mb-6">{{ t('landing.highlights.h3Desc') }}</p>
                        <ul class="space-y-3">
                            <li class="flex items-center gap-3 text-surface-700 dark:text-surface-200">
                                <div class="w-6 h-6 rounded-full bg-positive-100 dark:bg-positive-700/40 flex items-center justify-center">
                                    <i class="pi pi-check text-positive dark:text-positive-400 text-sm"></i>
                                </div>
                                <span>{{ t('landing.highlights.h3Item1') }}</span>
                            </li>
                            <li class="flex items-center gap-3 text-surface-700 dark:text-surface-200">
                                <div class="w-6 h-6 rounded-full bg-positive-100 dark:bg-positive-700/40 flex items-center justify-center">
                                    <i class="pi pi-check text-positive dark:text-positive-400 text-sm"></i>
                                </div>
                                <span>{{ t('landing.highlights.h3Item2') }}</span>
                            </li>
                            <li class="flex items-center gap-3 text-surface-700 dark:text-surface-200">
                                <div class="w-6 h-6 rounded-full bg-positive-100 dark:bg-positive-700/40 flex items-center justify-center">
                                    <i class="pi pi-check text-positive dark:text-positive-400 text-sm"></i>
                                </div>
                                <span>{{ t('landing.highlights.h3Item3') }}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class HighlightsWidget {
    private i18n = inject(I18nService);
    t(key: string): string { return this.i18n.t(key); }

    securityItems() {
        return [
            { title: this.t('landing.highlights.h3S1Title'), desc: this.t('landing.highlights.h3S1Desc'), icon: 'pi pi-lock text-positive-400',  bg: 'bg-positive/20' },
            { title: this.t('landing.highlights.h3S2Title'), desc: this.t('landing.highlights.h3S2Desc'), icon: 'pi pi-user-minus text-brand-700 dark:text-brand-300',  bg: 'bg-brand-700/15 dark:bg-brand-300/20'    },
            { title: this.t('landing.highlights.h3S3Title'), desc: this.t('landing.highlights.h3S3Desc'), icon: 'pi pi-shield text-brand-700 dark:text-brand-300',   bg: 'bg-brand-700/20 dark:bg-brand-300/20'  },
            { title: this.t('landing.highlights.h3S4Title'), desc: this.t('landing.highlights.h3S4Desc'), icon: 'pi pi-ban text-ochre-400',       bg: 'bg-ochre-200/50'   },
        ];
    }
}
