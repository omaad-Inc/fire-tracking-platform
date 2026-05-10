import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TopbarWidget } from './topbarwidget.component';
import { FooterWidget } from './footerwidget';
import { I18nService, Lang } from '../../../i18n/i18n.service';

@Component({
    selector: 'app-qui-sommes-nous',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, RippleModule, TopbarWidget, FooterWidget],
    template: `
        <div class="bg-surface-0 dark:bg-surface-900 min-h-screen">
            <!-- Fixed topbar -->
            <div class="fixed top-0 left-0 right-0 z-50 bg-surface-0/80 dark:bg-surface-900/80 backdrop-blur-lg border-b border-surface-200/50 dark:border-surface-700/50"
                 style="padding-top: env(safe-area-inset-top, 0px)">
                <topbar-widget class="py-4 px-6 mx-0 md:mx-12 lg:mx-20 lg:px-20 flex items-center justify-between relative lg:static" />
            </div>
            <div class="h-20"></div>

            <!-- ════════════════════════════════
                 BLOC 1 — Header / Mission
            ════════════════════════════════ -->
            <section class="relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-950 py-24 md:py-32 px-6 lg:px-20">
                <div class="absolute inset-0 opacity-[0.06]" style="background-image: linear-gradient(rgba(99, 102, 241, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.5) 1px, transparent 1px); background-size: 60px 60px;"></div>
                <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-700/15 rounded-full blur-3xl"></div>
                <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-ochre-500/10 rounded-full blur-3xl"></div>

                <div class="relative max-w-4xl mx-auto text-center">
                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-ochre-500/40 bg-ochre-500/10 text-ochre-300 text-sm font-medium mb-6">
                        <i class="pi pi-compass text-xs"></i>
                        <span>{{ t('landing.about.eyebrow') }}</span>
                    </div>
                    <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                        {{ t('landing.about.h1') }}
                    </h1>
                    <p class="text-lg md:text-xl text-brand-200 max-w-3xl mx-auto leading-relaxed">
                        {{ t('landing.about.subtitle') }}
                    </p>
                </div>
            </section>

            <!-- ════════════════════════════════
                 BLOC 2 — 4 KPI counters
            ════════════════════════════════ -->
            <section class="bg-surface-0 dark:bg-surface-900 py-16 px-6 lg:px-20 border-b border-surface-200 dark:border-surface-800">
                <div class="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 text-center">
                    <div>
                        <div class="text-4xl md:text-5xl font-bold text-brand-700 dark:text-ochre-400 mb-2">{{ t('landing.about.kpi1Value') }}</div>
                        <div class="text-sm text-surface-600 dark:text-surface-400">{{ t('landing.about.kpi1Label') }}</div>
                    </div>
                    <div>
                        <div class="text-4xl md:text-5xl font-bold text-brand-700 dark:text-ochre-400 mb-2">{{ t('landing.about.kpi2Value') }}</div>
                        <div class="text-sm text-surface-600 dark:text-surface-400">{{ t('landing.about.kpi2Label') }}</div>
                    </div>
                    <div>
                        <div class="text-4xl md:text-5xl font-bold text-brand-700 dark:text-ochre-400 mb-2">{{ t('landing.about.kpi3Value') }}</div>
                        <div class="text-sm text-surface-600 dark:text-surface-400">{{ t('landing.about.kpi3Label') }}</div>
                    </div>
                    <div>
                        <div class="text-4xl md:text-5xl font-bold text-brand-700 dark:text-ochre-400 mb-2">{{ t('landing.about.kpi4Value') }}</div>
                        <div class="text-sm text-surface-600 dark:text-surface-400">{{ t('landing.about.kpi4Label') }}</div>
                    </div>
                </div>
            </section>

            <!-- ════════════════════════════════
                 BLOC 3 — Notre histoire
            ════════════════════════════════ -->
            <section class="bg-surface-0 dark:bg-surface-900 py-20 md:py-28 px-6 lg:px-20">
                <div class="max-w-3xl mx-auto">
                    <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-surface-900 dark:text-white mb-10 leading-tight">
                        {{ t('landing.about.historyTitle') }}
                    </h2>
                    <div class="space-y-6 text-lg text-surface-700 dark:text-surface-300 leading-relaxed">
                        <p>{{ t('landing.about.historyP1') }}</p>
                        <p>
                            <strong class="text-surface-900 dark:text-white">{{ t('landing.about.historyP2Lead') }}</strong>{{ t('landing.about.historyP2') }}
                        </p>
                    </div>
                    <div class="mt-12 p-6 md:p-8 rounded-2xl border-l-4 border-ochre-500 bg-ochre-50 dark:bg-ochre-900/10">
                        <p class="text-base md:text-lg text-surface-700 dark:text-surface-200 leading-relaxed">
                            {{ t('landing.about.historyAmbitionPre') }}
                            <strong class="text-surface-900 dark:text-white">
                                {{ t('landing.about.historyAmbition') }}
                            </strong>
                        </p>
                    </div>
                </div>
            </section>

            <!-- ════════════════════════════════
                 BLOC 4 — Nos principes (6 cards)
            ════════════════════════════════ -->
            <section class="bg-surface-50 dark:bg-surface-950 py-20 md:py-28 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="text-center max-w-2xl mx-auto mb-14">
                        <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-surface-900 dark:text-white mb-4">
                            {{ t('landing.about.valuesTitle') }}
                        </h2>
                        <p class="text-lg text-surface-600 dark:text-surface-400">
                            {{ t('landing.about.valuesSubtitle') }}
                        </p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        @for (v of values; track v.titleKey) {
                            <div class="p-6 md:p-7 rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 hover:border-brand-500/50 dark:hover:border-ochre-500/50 transition-all duration-300">
                                <div class="w-11 h-11 rounded-xl bg-brand-100 dark:bg-ochre-500/15 flex items-center justify-center mb-4">
                                    <i class="pi {{ v.icon }} text-brand-700 dark:text-ochre-400 text-lg"></i>
                                </div>
                                <h3 class="text-lg font-bold text-surface-900 dark:text-white mb-2">{{ t(v.titleKey) }}</h3>
                                <p class="text-surface-600 dark:text-surface-400 leading-relaxed">{{ t(v.descKey) }}</p>
                            </div>
                        }
                    </div>
                </div>
            </section>

            <!-- ════════════════════════════════
                 BLOC 5 — Le fondateur (founder + ghost card)
            ════════════════════════════════ -->
            <section class="bg-surface-0 dark:bg-surface-900 py-20 md:py-28 px-6 lg:px-20">
                <div class="max-w-5xl mx-auto">
                    <div class="text-center max-w-2xl mx-auto mb-14">
                        <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-surface-900 dark:text-white mb-4">
                            {{ t('landing.about.teamTitle') }}
                        </h2>
                        <p class="text-lg text-surface-600 dark:text-surface-400">
                            {{ t('landing.about.teamSubtitle') }}
                        </p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                        <!-- Founder card -->
                        <div class="p-6 rounded-2xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 text-center">
                            <img src="assets/team/mbaye.jpeg" [alt]="t('landing.about.founderName')"
                                 class="w-32 h-32 rounded-full mx-auto mb-4 object-cover ring-4 ring-brand-100 dark:ring-ochre-500/20"
                                 loading="lazy" />
                            <h3 class="text-xl font-bold text-surface-900 dark:text-white">{{ t('landing.about.founderName') }}</h3>
                            <p class="text-sm text-brand-700 dark:text-ochre-400 font-medium mb-3">{{ t('landing.about.founderRole') }}</p>
                            <p class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed mb-4">
                                {{ t('landing.about.founderBio') }}
                            </p>
                            <a href="https://www.linkedin.com/in/mbaye-sene" target="_blank" rel="noopener noreferrer"
                               class="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 dark:text-ochre-400 hover:underline">
                                <i class="pi pi-linkedin text-xs"></i>
                                {{ t('landing.about.founderLinkedIn') }}
                            </a>
                        </div>
                        <!-- Ghost card -->
                        <div class="p-6 rounded-2xl border-2 border-dashed border-surface-300 dark:border-surface-700 text-center bg-transparent">
                            <div class="w-32 h-32 rounded-full mx-auto mb-4 flex items-center justify-center bg-surface-100 dark:bg-surface-800 ring-4 ring-surface-200 dark:ring-surface-700">
                                <span class="text-5xl font-bold text-surface-400 dark:text-surface-600">?</span>
                            </div>
                            <h3 class="text-xl font-bold text-surface-900 dark:text-white">{{ t('landing.about.ghostTitle') }}</h3>
                            <p class="text-sm text-surface-500 dark:text-surface-400 font-medium mb-3">{{ t('landing.about.ghostSubtitle') }}</p>
                            <p class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed mb-4">
                                {{ t('landing.about.ghostDesc') }}
                            </p>
                            <a href="mailto:contact@omaad.africa"
                               class="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 dark:text-ochre-400 hover:underline">
                                <i class="pi pi-envelope text-xs"></i>
                                {{ t('landing.about.ghostCta') }}
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ════════════════════════════════
                 BLOC 6 — Contact
            ════════════════════════════════ -->
            <section id="contact" class="bg-surface-50 dark:bg-surface-950 py-16 md:py-20 px-6 lg:px-20 border-y border-surface-200 dark:border-surface-800">
                <div class="max-w-3xl mx-auto text-center">
                    <h2 class="text-2xl md:text-3xl font-bold text-surface-900 dark:text-white mb-4">
                        {{ t('landing.about.contactTitle') }}
                    </h2>
                    <p class="text-base md:text-lg text-surface-600 dark:text-surface-300">
                        {{ t('landing.about.contactDesc') }}
                        <a href="mailto:contact@omaad.africa"
                           class="font-semibold text-brand-700 dark:text-ochre-400 hover:underline">contact&#64;omaad.africa</a>{{ t('landing.about.contactDescOr') }}
                        <a href="https://www.linkedin.com/company/omaad/" target="_blank" rel="noopener noreferrer"
                           class="font-semibold text-brand-700 dark:text-ochre-400 hover:underline">{{ t('landing.about.contactLinkedIn') }}</a>.
                    </p>
                </div>
            </section>

            <!-- ════════════════════════════════
                 BLOC 7 — CTA final
            ════════════════════════════════ -->
            <section class="relative py-20 md:py-24 px-6 lg:px-20 overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-950">
                <div class="absolute inset-0 opacity-10">
                    <div class="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-brand-700 blur-3xl"></div>
                    <div class="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-ochre-500 blur-3xl"></div>
                </div>
                <div class="relative max-w-4xl mx-auto text-center">
                    <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-10 leading-tight">
                        {{ t('landing.about.ctaTitle') }}
                    </h2>
                    <div class="flex flex-col sm:flex-row gap-4 justify-center mb-10">
                        <a href="https://fireafrica.beehiiv.com/subscribe" target="_blank" rel="noopener noreferrer"
                           class="inline-flex items-center justify-center px-8 py-3 rounded-full
                                  !bg-gradient-to-r !from-ochre-500 !to-ochre-400 !border-0 text-warm-900 font-semibold
                                  hover:shadow-lg transition-all duration-300">
                            {{ t('landing.about.ctaSecondary') }}
                            <i class="pi pi-arrow-up-right ml-2 text-xs"></i>
                        </a>
                        <button pButton pRipple [label]="t('landing.about.ctaPrimary')"
                                [routerLink]="[currentLang]"
                                class="!rounded-full !px-8 !py-3 !bg-transparent !border !border-ochre-500/40 !text-ochre-300 !font-semibold
                                       hover:!bg-ochre-500/10 transition-all duration-300">
                        </button>
                    </div>
                    <p class="text-ochre-300 text-sm tracking-[0.3em] uppercase font-semibold">
                        {{ t('landing.about.ctaTagline') }}
                    </p>
                </div>
            </section>

            <footer-widget />
        </div>
    `
})
export class QuiSommesNousPage {
    private i18n = inject(I18nService);
    private router = inject(Router);

    currentLang = '/fr';

    readonly values = [
        { titleKey: 'landing.about.v1Title', descKey: 'landing.about.v1Desc', icon: 'pi-check-circle' },
        { titleKey: 'landing.about.v2Title', descKey: 'landing.about.v2Desc', icon: 'pi-globe' },
        { titleKey: 'landing.about.v3Title', descKey: 'landing.about.v3Desc', icon: 'pi-bolt' },
        { titleKey: 'landing.about.v4Title', descKey: 'landing.about.v4Desc', icon: 'pi-clock' },
        { titleKey: 'landing.about.v5Title', descKey: 'landing.about.v5Desc', icon: 'pi-map-marker' },
        { titleKey: 'landing.about.v6Title', descKey: 'landing.about.v6Desc', icon: 'pi-shield' },
    ];

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        const lang = (match ? match[1] : 'fr') as Lang;
        this.currentLang = '/' + lang;
        this.i18n.setLang(lang);
    }

    t(key: string): string { return this.i18n.t(key); }
}
