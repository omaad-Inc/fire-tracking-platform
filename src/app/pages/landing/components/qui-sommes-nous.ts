import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TopbarWidget } from './topbarwidget.component';
import { FooterWidget } from './footerwidget';
import { I18nService, Lang } from '../../../i18n/i18n.service';
import { SeoService } from '../../../core/services/seo.service';
import { SEO_PAGES } from '../../../core/services/seo-content';

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
                 BLOC 1, Hero (text + founder photos)
            ════════════════════════════════ -->
            <section class="bg-surface-0 dark:bg-surface-900 py-20 md:py-28 px-6 lg:px-20">
                <div class="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    <!-- Left: thesis -->
                    <div>
                        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-ochre-200 dark:border-ochre-500/40 bg-ochre-50 dark:bg-ochre-500/10 text-ochre-700 dark:text-ochre-300 text-sm font-medium mb-6">
                            <i class="pi pi-compass text-xs"></i>
                            <span>{{ t('landing.about.eyebrow') }}</span>
                        </div>
                        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-surface-900 dark:text-white leading-[1.1] mb-6">
                            {{ t('landing.about.h1') }}
                        </h1>
                        <p class="text-lg md:text-xl text-surface-600 dark:text-surface-300 leading-relaxed max-w-xl">
                            {{ t('landing.about.subtitle') }}
                        </p>
                    </div>

                    <!-- Right: founder photos, tastefully -->
                    <div class="grid grid-cols-2 gap-4 sm:gap-6 max-w-lg mx-auto lg:mx-0 lg:ml-auto">
                        <figure class="group">
                            <div class="aspect-[4/5] overflow-hidden rounded-3xl ring-1 ring-surface-200 dark:ring-surface-700 shadow-sm">
                                <img src="assets/team/mbaye-omaad.webp" [alt]="t('landing.about.founderName')"
                                     class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                            </div>
                            <figcaption class="mt-3 text-center">
                                <div class="text-sm font-bold text-surface-900 dark:text-white">{{ t('landing.about.founderName') }}</div>
                                <div class="text-xs text-surface-500 dark:text-surface-400">{{ _('Co-fondateur', 'Co-founder') }}</div>
                            </figcaption>
                        </figure>
                        <figure class="group sm:mt-10">
                            <div class="aspect-[4/5] overflow-hidden rounded-3xl ring-1 ring-surface-200 dark:ring-surface-700 shadow-sm">
                                <img src="assets/team/bamba.jpeg" [alt]="t('landing.about.bambaName')"
                                     class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                            </div>
                            <figcaption class="mt-3 text-center">
                                <div class="text-sm font-bold text-surface-900 dark:text-white">{{ t('landing.about.bambaName') }}</div>
                                <div class="text-xs text-surface-500 dark:text-surface-400">{{ _('Co-fondateur', 'Co-founder') }}</div>
                            </figcaption>
                        </figure>
                    </div>
                </div>
            </section>

            <!-- ════════════════════════════════
                 BLOC 2, Notre histoire (texte + portrait + signature)
            ════════════════════════════════ -->
            <section class="bg-surface-50 dark:bg-surface-950 py-20 md:py-28 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto grid lg:grid-cols-12 gap-10 lg:gap-16">
                    <!-- Left: sticky section heading + signature -->
                    <div class="lg:col-span-4">
                        <div class="lg:sticky lg:top-28">
                            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-ochre-200 dark:border-ochre-500/40 bg-ochre-50 dark:bg-ochre-500/10 text-ochre-700 dark:text-ochre-300 text-[11px] font-semibold uppercase tracking-[0.2em] mb-5">
                                <i class="pi pi-book text-[10px]"></i>{{ _('Notre parcours', 'Our journey') }}
                            </div>
                            <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-surface-900 dark:text-white leading-[1.1]">
                                {{ t('landing.about.historyTitle') }}
                            </h2>
                            <div class="mt-8 hidden lg:block">
                                <div class="text-lg font-bold italic text-surface-900 dark:text-white tracking-tight">
                                    {{ t('landing.about.historySignature') }}
                                </div>
                                <div class="mt-2 h-0.5 w-16 bg-ochre-500 rounded-full"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Right: the story, editorial measure with a drop-cap + pull-quote -->
                    <div class="lg:col-span-8 max-w-2xl">
                        <div class="space-y-6 text-lg text-surface-700 dark:text-surface-300 leading-relaxed">
                            <p class="first-letter:float-left first-letter:mr-3 first-letter:text-6xl first-letter:font-bold first-letter:leading-[0.75] first-letter:text-brand-700 dark:first-letter:text-ochre-400">
                                {{ t('landing.about.historyP1') }}
                            </p>
                            <p>
                                <strong class="text-surface-900 dark:text-white">{{ t('landing.about.historyP2Lead') }}</strong>{{ t('landing.about.historyP2') }}
                            </p>
                        </div>

                        <!-- Ambition, as a pull-quote -->
                        <figure class="mt-10 pl-6 border-l-4 border-ochre-500">
                            <blockquote class="text-xl md:text-2xl font-semibold leading-snug text-surface-900 dark:text-white">
                                <span class="font-normal text-surface-500 dark:text-surface-400">{{ t('landing.about.historyAmbitionPre') }} </span>{{ t('landing.about.historyAmbition') }}
                            </blockquote>
                        </figure>

                        <!-- Signature on mobile (left column is hidden there) -->
                        <div class="mt-10 lg:hidden">
                            <div class="text-lg font-bold italic text-surface-900 dark:text-white tracking-tight">
                                {{ t('landing.about.historySignature') }}
                            </div>
                            <div class="mt-2 h-0.5 w-16 bg-ochre-500 rounded-full"></div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ════════════════════════════════
                 BLOC 3, Omaad en chiffres (cards premium, canvas sombre)
            ════════════════════════════════ -->
            <section class="relative overflow-hidden bg-brand-950 dark:bg-surface-950 py-20 md:py-28 px-6 lg:px-20">
                <!-- Faint brand wash so the dark band doesn't read as flat -->
                <div class="absolute -top-24 right-0 w-[28rem] h-[28rem] rounded-full bg-ochre-500/10 blur-3xl pointer-events-none"></div>
                <div class="relative max-w-6xl mx-auto">
                    <div class="max-w-2xl mb-14 md:mb-16">
                        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 text-ochre-300 text-[11px] font-semibold uppercase tracking-[0.22em] mb-5">
                            <span class="w-1.5 h-1.5 rounded-full bg-ochre-400"></span>{{ _('En toute transparence', 'Full transparency') }}
                        </div>
                        <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">{{ t('landing.about.numbersTitle') }}</h2>
                        <p class="text-base md:text-lg text-brand-200">{{ t('landing.about.numbersSubtitle') }}</p>
                    </div>

                    <!-- Editorial stat strip: thin dividers instead of heavy cards -->
                    <div class="grid grid-cols-1 md:grid-cols-3 border-t border-white/10">
                        @for (n of numbers; track n.value) {
                            <div class="group py-9 md:py-11 md:px-9 first:md:pl-0
                                        border-b border-white/10 md:border-b-0 md:border-r md:last:border-r-0">
                                <div class="flex items-center gap-2 mb-5 text-ochre-300">
                                    <i class="pi {{ n.icon }} text-sm"></i>
                                    <span class="h-px flex-1 bg-gradient-to-r from-ochre-500/40 to-transparent"></span>
                                </div>
                                <div class="text-6xl md:text-7xl font-bold tracking-tight text-white mb-4 tnum
                                            transition-colors duration-300 group-hover:text-ochre-300">{{ t(n.value) }}</div>
                                <p class="text-[15px] text-brand-200 leading-relaxed max-w-[30ch]">
                                    <span class="font-semibold text-white">{{ t(n.lead) }}</span>{{ t(n.rest) }}
                                </p>
                            </div>
                        }
                    </div>
                </div>
            </section>

            <!-- ════════════════════════════════
                 BLOC 4, Nos principes (6 cards)
            ════════════════════════════════ -->
            <section id="principes" class="bg-surface-0 dark:bg-surface-900 py-20 md:py-28 px-6 lg:px-20 scroll-mt-24">
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
                            <div class="p-6 md:p-7 rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 hover:border-brand-500/50 dark:hover:border-ochre-500/50 hover:shadow-sm transition-all duration-300">
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
                 BLOC 5, Confiance & sécurité
            ════════════════════════════════ -->
            <section id="securite" class="bg-surface-50 dark:bg-surface-950 py-20 md:py-28 px-6 lg:px-20 scroll-mt-24">
                <div class="max-w-6xl mx-auto">
                    <div class="text-center max-w-2xl mx-auto mb-14">
                        <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-surface-900 dark:text-white mb-4">
                            {{ t('landing.about.trustTitle') }}
                        </h2>
                        <p class="text-lg text-surface-600 dark:text-surface-400">
                            {{ t('landing.about.trustSubtitle') }}
                        </p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        @for (item of trust; track item.titleKey) {
                            <div class="p-6 md:p-7 rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800">
                                <div class="w-12 h-12 rounded-xl bg-positive-50 dark:bg-positive-500/15 flex items-center justify-center mb-4">
                                    <i class="pi {{ item.icon }} text-positive-600 dark:text-positive-400 text-xl"></i>
                                </div>
                                <h3 class="text-base font-bold text-surface-900 dark:text-white mb-2">{{ t(item.titleKey) }}</h3>
                                <p class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">{{ t(item.descKey) }}</p>
                            </div>
                        }
                    </div>
                </div>
            </section>

            <!-- ════════════════════════════════
                 BLOC 6, L'équipe (founders + ghost)
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
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        <!-- Founder card -->
                        <div class="p-6 rounded-2xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 text-center">
                            <img src="assets/team/mbaye-omaad.webp" [alt]="t('landing.about.founderName')"
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
                        <!-- Bamba card -->
                        <div class="p-6 rounded-2xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 text-center">
                            <img src="assets/team/bamba.jpeg" [alt]="t('landing.about.bambaName')"
                                 class="w-32 h-32 rounded-full mx-auto mb-4 object-cover ring-4 ring-brand-100 dark:ring-ochre-500/20"
                                 loading="lazy" />
                            <h3 class="text-xl font-bold text-surface-900 dark:text-white">{{ t('landing.about.bambaName') }}</h3>
                            <p class="text-sm text-brand-700 dark:text-ochre-400 font-medium mb-3">{{ t('landing.about.bambaRole') }}</p>
                            <p class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed mb-4">
                                {{ t('landing.about.bambaBio') }}
                            </p>
                            <a href="https://www.linkedin.com/in/bamba" target="_blank" rel="noopener noreferrer"
                               class="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 dark:text-ochre-400 hover:underline">
                                <i class="pi pi-linkedin text-xs"></i>
                                {{ t('landing.about.bambaLinkedIn') }}
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
                 BLOC 7, Contact
            ════════════════════════════════ -->
            <section id="contact" class="bg-surface-50 dark:bg-surface-950 py-16 md:py-20 px-6 lg:px-20 border-y border-surface-200 dark:border-surface-800 scroll-mt-24">
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
                 BLOC 8, CTA final + showcase produit
            ════════════════════════════════ -->
            <section class="relative overflow-hidden bg-brand-950 dark:bg-surface-950 py-20 md:py-24 px-6 lg:px-20">
                <div class="relative max-w-5xl mx-auto text-center">
                    <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-10 leading-tight">
                        {{ t('landing.about.ctaTitle') }}
                    </h2>
                    <div class="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                        <a href="https://fireafrica.beehiiv.com/subscribe" target="_blank" rel="noopener noreferrer"
                           class="inline-flex items-center justify-center px-8 py-3 rounded-full
                                  bg-ochre-500 hover:bg-ochre-400 text-warm-900 font-semibold
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
                    <p class="text-ochre-300 text-sm tracking-[0.3em] uppercase font-semibold mb-16">
                        {{ t('landing.about.ctaTagline') }}
                    </p>

                    <!-- Product showcase: large 16:9 dashboard (rendered, not a screenshot) -->
                    <div class="relative max-w-5xl mx-auto text-left">
                        <!-- Soft brand glow behind the window -->
                        <div class="absolute -inset-8 bg-gradient-to-tr from-ochre-500/20 via-transparent to-brand-500/20 rounded-[2.5rem] blur-3xl pointer-events-none"></div>

                        <!-- App window -->
                        <div class="relative rounded-2xl overflow-hidden bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-white/10 shadow-2xl ring-1 ring-surface-900/5 dark:ring-white/10">
                            <!-- Browser chrome -->
                            <div class="flex items-center gap-2 px-4 py-3 border-b border-surface-200 dark:border-white/10 bg-surface-50 dark:bg-surface-800/50">
                                <div class="flex gap-1.5">
                                    <span class="w-2.5 h-2.5 rounded-full bg-negative/60"></span>
                                    <span class="w-2.5 h-2.5 rounded-full bg-ochre-500/70"></span>
                                    <span class="w-2.5 h-2.5 rounded-full bg-positive-500/70"></span>
                                </div>
                                <span class="mx-auto inline-flex items-center gap-1.5 text-surface-400 dark:text-surface-500 text-xs tracking-wide">
                                    <i class="pi pi-lock text-[9px]"></i>omaad.africa
                                </span>
                                <span class="w-6 shrink-0"></span>
                            </div>

                            <!-- Dashboard body: sidebar + main, locked to ~16:9 on desktop -->
                            <div class="flex md:aspect-[16/9]">
                                <!-- Sidebar -->
                                <aside class="hidden md:flex md:flex-col w-52 shrink-0 border-r border-surface-200 dark:border-white/10 bg-surface-50/70 dark:bg-surface-800/40 p-4">
                                    <div class="flex items-center gap-2 mb-6 px-1">
                                        <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-brand-700 text-white text-xs font-bold">O</span>
                                        <span class="font-bold text-surface-900 dark:text-white text-sm tracking-tight">Omaad</span>
                                    </div>
                                    <nav class="space-y-1">
                                        @for (item of dashNav; track item.fr; let first = $first) {
                                            <div class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px]"
                                                 [class]="first ? 'bg-brand-700/10 dark:bg-ochre-500/15 text-brand-700 dark:text-ochre-300 font-semibold' : 'text-surface-500 dark:text-surface-400'">
                                                <i class="pi {{ item.icon }} text-xs"></i>{{ _(item.fr, item.en) }}
                                            </div>
                                        }
                                    </nav>
                                    <div class="mt-auto rounded-xl p-3 bg-gradient-to-br from-brand-700 to-brand-900 text-white">
                                        <div class="text-[11px] font-semibold">{{ t('landing.hero.mockupFire') }}</div>
                                        <div class="text-[10px] text-brand-100/80 mt-0.5">43% · 12 {{ t('landing.hero.mockupFireYears') }}</div>
                                    </div>
                                </aside>

                                <!-- Main -->
                                <div class="flex-1 min-w-0 p-5 sm:p-6 flex flex-col gap-4 md:gap-5 overflow-hidden">
                                    <!-- Header: Patrimoine Net -->
                                    <div class="flex items-start justify-between gap-4">
                                        <div class="min-w-0">
                                            <div class="text-surface-500 dark:text-surface-400 text-[11px] uppercase tracking-wider mb-1">{{ _('Patrimoine Net', 'Net Worth') }}</div>
                                            <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                                <span class="text-surface-900 dark:text-white font-bold text-4xl sm:text-5xl tracking-tight">85,6M</span>
                                                <span class="text-surface-400 dark:text-surface-500 text-base">FCFA</span>
                                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-positive-500/10 text-positive-600 dark:text-positive-400 text-xs font-semibold">
                                                    <i class="pi pi-arrow-up text-[8px]"></i>+12,5%
                                                </span>
                                            </div>
                                        </div>
                                        <div class="hidden sm:flex items-center gap-2 shrink-0">
                                            <span class="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">FCFA</span>
                                            <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-700 text-white text-[10px] font-bold">MS</span>
                                        </div>
                                    </div>

                                    <!-- KPI tiles -->
                                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div class="rounded-xl px-3.5 py-3 bg-surface-50 dark:bg-surface-800/60 border border-surface-100 dark:border-surface-800">
                                            <div class="text-[10px] text-surface-500 dark:text-surface-400 mb-1">{{ t('landing.hero.mockupSavings') }}</div>
                                            <div class="text-brand-700 dark:text-brand-300 font-bold text-lg">38%</div>
                                        </div>
                                        <div class="rounded-xl px-3.5 py-3 bg-surface-50 dark:bg-surface-800/60 border border-surface-100 dark:border-surface-800">
                                            <div class="text-[10px] text-surface-500 dark:text-surface-400 mb-1">{{ t('landing.hero.mockupFire') }}</div>
                                            <div class="text-ochre-600 dark:text-ochre-400 font-bold text-lg">43%</div>
                                        </div>
                                        <div class="rounded-xl px-3.5 py-3 bg-surface-50 dark:bg-surface-800/60 border border-surface-100 dark:border-surface-800">
                                            <div class="text-[10px] text-surface-500 dark:text-surface-400 mb-1">{{ _('Revenu passif', 'Passive income') }}</div>
                                            <div class="text-positive-600 dark:text-positive-400 font-bold text-lg">312k <span class="text-[10px] font-normal text-surface-400">/mois</span></div>
                                        </div>
                                        <div class="rounded-xl px-3.5 py-3 bg-surface-50 dark:bg-surface-800/60 border border-surface-100 dark:border-surface-800">
                                            <div class="text-[10px] text-surface-500 dark:text-surface-400 mb-1">{{ _('Dettes', 'Debts') }}</div>
                                            <div class="text-negative font-bold text-lg">−4,2M</div>
                                        </div>
                                    </div>

                                    <!-- Chart + breakdown fill the remaining height -->
                                    <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:flex-1 lg:min-h-0">
                                        <!-- Net-worth area chart -->
                                        <div class="lg:col-span-3 rounded-xl border border-surface-100 dark:border-surface-800 bg-surface-50/60 dark:bg-surface-800/40 p-4 flex flex-col">
                                            <div class="flex items-center justify-between mb-2">
                                                <span class="text-surface-500 dark:text-surface-400 text-[11px] font-medium uppercase tracking-wider">{{ _('Évolution du patrimoine', 'Net worth trend') }}</span>
                                                <span class="text-positive-600 dark:text-positive-400 text-[11px] font-bold">+12,5%</span>
                                            </div>
                                            <svg viewBox="0 0 320 130" class="w-full h-36 lg:h-full lg:min-h-0" preserveAspectRatio="none" aria-hidden="true">
                                                <defs>
                                                    <linearGradient id="aboutArea" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stop-color="#C77B3C" stop-opacity="0.30" />
                                                        <stop offset="100%" stop-color="#C77B3C" stop-opacity="0" />
                                                    </linearGradient>
                                                </defs>
                                                <path d="M0,104 C34,98 54,96 84,84 C114,72 134,78 164,60 C194,42 214,48 244,32 C274,16 296,18 320,10 L320,130 L0,130 Z" fill="url(#aboutArea)" />
                                                <path d="M0,104 C34,98 54,96 84,84 C114,72 134,78 164,60 C194,42 214,48 244,32 C274,16 296,18 320,10"
                                                      fill="none" stroke="#C77B3C" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
                                            </svg>
                                        </div>
                                        <!-- Répartition + FIRE -->
                                        <div class="lg:col-span-2 rounded-xl border border-surface-100 dark:border-surface-800 bg-surface-50/60 dark:bg-surface-800/40 p-4 flex flex-col">
                                            <span class="text-surface-500 dark:text-surface-400 text-[11px] font-medium uppercase tracking-wider mb-3">{{ _('Répartition', 'Breakdown') }}</span>
                                            <div class="space-y-2.5">
                                                <div class="flex items-center gap-2.5">
                                                    <div class="w-6 h-6 rounded-md bg-brand-100 dark:bg-brand-700/25 flex items-center justify-center shrink-0"><i class="pi pi-home text-brand-700 dark:text-brand-300" style="font-size:10px"></i></div>
                                                    <span class="text-surface-600 dark:text-surface-400 text-xs flex-1 truncate">{{ _('Immobilier', 'Real estate') }}</span>
                                                    <span class="text-surface-900 dark:text-surface-0 text-xs font-semibold tnum">52,4M</span>
                                                </div>
                                                <div class="flex items-center gap-2.5">
                                                    <div class="w-6 h-6 rounded-md bg-ochre-100 dark:bg-ochre-800/30 flex items-center justify-center shrink-0"><i class="pi pi-chart-line text-ochre-600 dark:text-ochre-400" style="font-size:10px"></i></div>
                                                    <span class="text-surface-600 dark:text-surface-400 text-xs flex-1 truncate">BRVM / SONATEL</span>
                                                    <span class="text-surface-900 dark:text-surface-0 text-xs font-semibold tnum">18,2M</span>
                                                </div>
                                                <div class="flex items-center gap-2.5">
                                                    <div class="w-6 h-6 rounded-md bg-brand-100 dark:bg-brand-700/25 flex items-center justify-center shrink-0"><i class="pi pi-users text-brand-700 dark:text-brand-300" style="font-size:10px"></i></div>
                                                    <span class="text-surface-600 dark:text-surface-400 text-xs flex-1 truncate">{{ _('Tontine Famille', 'Family tontine') }}</span>
                                                    <span class="text-surface-900 dark:text-surface-0 text-xs font-semibold tnum">8,5M</span>
                                                </div>
                                                <div class="flex items-center gap-2.5">
                                                    <div class="w-6 h-6 rounded-md bg-brand-100 dark:bg-brand-700/25 flex items-center justify-center shrink-0"><i class="pi pi-mobile text-brand-700 dark:text-brand-300" style="font-size:10px"></i></div>
                                                    <span class="text-surface-600 dark:text-surface-400 text-xs flex-1 truncate">Wave</span>
                                                    <span class="text-surface-900 dark:text-surface-0 text-xs font-semibold tnum">6,5M</span>
                                                </div>
                                            </div>
                                            <!-- FIRE progress -->
                                            <div class="mt-auto pt-4">
                                                <div class="flex items-center justify-between mb-1.5">
                                                    <span class="text-surface-500 dark:text-surface-400 text-[10px] font-medium uppercase tracking-wider">{{ t('landing.hero.mockupFire') }}</span>
                                                    <span class="text-positive-600 dark:text-positive-400 text-xs font-bold">43% · 12 {{ t('landing.hero.mockupFireYears') }}</span>
                                                </div>
                                                <div class="h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                                                    <div class="h-full rounded-full bg-gradient-to-r from-brand-700 via-ochre-500 to-positive-500" style="width: 43%"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <footer-widget />
        </div>
    `
})
export class QuiSommesNousPage {
    private i18n = inject(I18nService);
    private router = inject(Router);
    private seo = inject(SeoService);

    currentLang = '/fr';

    readonly numbers = [
        { value: 'landing.about.kpi1Value', lead: 'landing.about.kpi1Lead', rest: 'landing.about.kpi1Rest', icon: 'pi-book' },
        { value: 'landing.about.kpi2Value', lead: 'landing.about.kpi2Lead', rest: 'landing.about.kpi2Rest', icon: 'pi-globe' },
        { value: 'landing.about.kpi3Value', lead: 'landing.about.kpi3Lead', rest: 'landing.about.kpi3Rest', icon: 'pi-money-bill' },
    ];

    /** Sidebar nav for the CTA dashboard mock (first item renders active). */
    readonly dashNav = [
        { fr: 'Tableau de bord', en: 'Dashboard',    icon: 'pi-th-large' },
        { fr: 'Patrimoine',      en: 'Portfolio',     icon: 'pi-wallet' },
        { fr: 'Transactions',    en: 'Transactions',  icon: 'pi-sync' },
        { fr: 'Objectifs',       en: 'Goals',         icon: 'pi-flag' },
        { fr: 'Conseils',        en: 'Insights',      icon: 'pi-lightbulb' },
    ];

    readonly values = [
        { titleKey: 'landing.about.v1Title', descKey: 'landing.about.v1Desc', icon: 'pi-check-circle' },
        { titleKey: 'landing.about.v2Title', descKey: 'landing.about.v2Desc', icon: 'pi-globe' },
        { titleKey: 'landing.about.v3Title', descKey: 'landing.about.v3Desc', icon: 'pi-bolt' },
        { titleKey: 'landing.about.v4Title', descKey: 'landing.about.v4Desc', icon: 'pi-clock' },
        { titleKey: 'landing.about.v5Title', descKey: 'landing.about.v5Desc', icon: 'pi-map-marker' },
        { titleKey: 'landing.about.v6Title', descKey: 'landing.about.v6Desc', icon: 'pi-shield' },
    ];

    readonly trust = [
        { titleKey: 'landing.about.trust1Title', descKey: 'landing.about.trust1Desc', icon: 'pi-lock' },
        { titleKey: 'landing.about.trust2Title', descKey: 'landing.about.trust2Desc', icon: 'pi-shield' },
        { titleKey: 'landing.about.trust3Title', descKey: 'landing.about.trust3Desc', icon: 'pi-database' },
        { titleKey: 'landing.about.trust4Title', descKey: 'landing.about.trust4Desc', icon: 'pi-check-circle' },
    ];

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        const lang = (match ? match[1] : 'fr') as Lang;
        this.currentLang = '/' + lang;
        this.i18n.setLang(lang);
        // Both /qui-sommes-nous and /about route here; canonical is always
        // /qui-sommes-nous (SEO_PAGES.about.path) so the alias doesn't split rank.
        this.seo.applyLocalized({ lang, ...SEO_PAGES.about });
    }

    t(key: string): string { return this.i18n.t(key); }
    _(fr: string, en: string): string { return this.i18n.lang() === 'fr' ? fr : en; }
}
