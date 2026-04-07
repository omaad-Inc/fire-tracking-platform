import { Component, inject, computed } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TopbarWidget } from './topbarwidget.component';
import { FooterWidget } from './footerwidget';
import { I18nService, Lang } from '../../../i18n/i18n.service';

@Component({
    selector: 'app-advisory-mission',
    standalone: true,
    imports: [RouterModule, ButtonModule, RippleModule, TopbarWidget, FooterWidget],
    template: `
        <div class="min-h-screen">

            <!-- Fixed topbar -->
            <div class="fixed top-0 left-0 right-0 z-50 bg-surface-0/90 dark:bg-slate-950/90 backdrop-blur-lg border-b border-surface-200/50 dark:border-white/10">
                <topbar-widget class="py-4 px-6 mx-0 md:mx-12 lg:mx-20 lg:px-20 flex items-center justify-between relative lg:static" />
            </div>
            <div class="h-20"></div>

            <!-- ══════════ HERO ══════════ -->
            <section class="relative overflow-hidden bg-slate-950 py-28 px-6 lg:px-20">
                <div class="absolute inset-0 pointer-events-none overflow-hidden">
                    <div class="absolute -top-32 right-1/4 w-[500px] h-[500px] rounded-full opacity-20"
                         style="background: radial-gradient(circle, #06b6d4 0%, transparent 70%)"></div>
                    <div class="absolute bottom-0 left-1/3 w-96 h-96 rounded-full opacity-10"
                         style="background: radial-gradient(circle, #6366f1 0%, transparent 70%)"></div>
                </div>
                <div class="relative max-w-4xl mx-auto">
                    <div class="flex items-center gap-2 text-sm text-slate-500 mb-8">
                        <a [routerLink]="[currentLang + '/advisory']" class="hover:text-indigo-400 transition-colors cursor-pointer">Advisory</a>
                        <i class="pi pi-chevron-right text-xs"></i>
                        <span class="text-slate-400">{{ _('Mission Data Engineering / IA', 'Data Engineering / AI Mission') }}</span>
                    </div>

                    <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-400 mb-5">EXPERTISE</p>
                    <h1 class="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
                        {{ heroTitle() }}<br>
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                            {{ heroTitleHighlight() }}
                        </span>
                    </h1>
                    <p class="text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
                        {{ heroDesc() }}
                    </p>
                    <div class="flex flex-col sm:flex-row gap-4">
                        <button pButton pRipple [label]="ctaDiscussProject()"
                                [routerLink]="[currentLang + '/advisory']" [fragment]="'contact'"
                                class="!bg-gradient-to-r !from-indigo-600 !to-cyan-500 !border-0 !font-bold
                                       !tracking-wide !px-8 !py-3 !rounded-lg
                                       hover:!shadow-xl hover:!shadow-indigo-500/30 transition-all duration-300">
                        </button>
                        <button pButton pRipple [label]="_('VOIR NOTRE APPROCHE', 'SEE OUR APPROACH')"
                                (click)="scrollTo('approche')"
                                class="!bg-white/10 !border !border-white/20 !text-white !font-semibold
                                       !tracking-wide !px-8 !py-3 !rounded-lg hover:!bg-white/20 transition-all">
                        </button>
                    </div>
                </div>
            </section>

            <!-- ══════════ QUAND FAIRE APPEL ? ══════════ -->
            <section class="bg-white dark:bg-slate-900 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="mb-14">
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-500 mb-4">{{ _('VOUS RECONNAISSEZ-VOUS ?', 'SOUND FAMILIAR?') }}</p>
                        <h2 class="text-4xl font-bold text-slate-900 dark:text-white max-w-2xl">{{ whenToCallTitle() }}</h2>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        @for (pain of painPoints; track pain.title) {
                            <div class="rounded-3xl bg-slate-100 dark:bg-slate-800 p-8 flex gap-5">
                                <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-1"
                                     [style.background]="pain.iconBg">
                                    <i [class]="pain.icon + ' text-white text-sm'"></i>
                                </div>
                                <div>
                                    <h4 class="font-bold text-slate-900 dark:text-white mb-2">{{ pain.title }}</h4>
                                    <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{{ pain.desc }}</p>
                                </div>
                            </div>
                        }
                    </div>
                </div>
            </section>

            <!-- ══════════ CAS D'USAGES ══════════ -->
            <section class="bg-slate-100 dark:bg-slate-800/50 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="mb-14">
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-500 mb-4">{{ _('CE QUE NOUS CONSTRUISONS', 'WHAT WE BUILD') }}</p>
                        <h2 class="text-4xl font-bold text-slate-900 dark:text-white max-w-2xl">{{ usecasesTitle() }}</h2>
                    </div>
                    <div class="space-y-5">
                        @for (usecase of usecases; track usecase.title) {
                            <div class="rounded-3xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col lg:flex-row">
                                <div class="lg:w-64 flex-shrink-0 flex items-center justify-center p-10 min-h-[120px]"
                                     [style.background]="usecase.illustrationBg">
                                    <div class="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                                        <i [class]="usecase.icon + ' text-white text-2xl'"></i>
                                    </div>
                                </div>
                                <div class="flex-1 p-8 flex flex-col justify-center">
                                    <h4 class="text-lg font-bold text-slate-900 dark:text-white mb-2">{{ usecase.title }}</h4>
                                    <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-4">{{ usecase.desc }}</p>
                                    <div class="flex flex-wrap gap-2">
                                        @for (tag of usecase.tags; track tag) {
                                            <span class="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800
                                                         text-slate-700 dark:text-slate-300 text-xs font-semibold tracking-wide">
                                                {{ tag }}
                                            </span>
                                        }
                                    </div>
                                </div>
                            </div>
                        }
                    </div>
                </div>
            </section>

            <!-- ══════════ AVANT / APRÈS ══════════ -->
            <section class="bg-slate-950 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="text-center mb-14">
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-400 mb-4">{{ _('AVANT / APRES', 'BEFORE / AFTER') }}</p>
                        <h2 class="text-4xl font-bold text-white">{{ _('Debloquez le potentiel de vos donnees', 'Unlock the full potential of your data') }}</h2>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Avant -->
                        <div class="rounded-3xl bg-white/5 border border-white/10 p-8">
                            <div class="flex items-center gap-3 mb-6">
                                <div class="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
                                    <i class="pi pi-times text-rose-400 text-sm"></i>
                                </div>
                                <h4 class="font-bold text-white text-lg">{{ _('Avant', 'Before') }}</h4>
                            </div>
                            <ul class="space-y-4">
                                @for (item of beforeItems; track item) {
                                    <li class="flex items-start gap-3 text-slate-400">
                                        <i class="pi pi-minus-circle text-rose-500/60 mt-0.5 shrink-0"></i>
                                        <span class="text-sm leading-relaxed">{{ item }}</span>
                                    </li>
                                }
                            </ul>
                        </div>
                        <!-- Après -->
                        <div class="rounded-3xl bg-indigo-500/10 border border-indigo-500/30 p-8">
                            <div class="flex items-center gap-3 mb-6">
                                <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                    <i class="pi pi-check text-emerald-400 text-sm"></i>
                                </div>
                                <h4 class="font-bold text-white text-lg">{{ afterColumnTitle() }}</h4>
                            </div>
                            <ul class="space-y-4">
                                @for (item of afterItems; track item) {
                                    <li class="flex items-start gap-3 text-slate-300">
                                        <i class="pi pi-check-circle text-emerald-400 mt-0.5 shrink-0"></i>
                                        <span class="text-sm leading-relaxed">{{ item }}</span>
                                    </li>
                                }
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ══════════ MÉTHODOLOGIE 5 PHASES ══════════ -->
            <section id="approche" class="bg-white dark:bg-slate-900 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="mb-14">
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-500 mb-4">{{ _('METHODE STRUCTUREE', 'STRUCTURED METHODOLOGY') }}</p>
                        <h2 class="text-4xl font-bold text-slate-900 dark:text-white max-w-2xl">
                            {{ phasesTitle() }}
                        </h2>
                        <p class="text-slate-500 dark:text-slate-400 mt-4 max-w-2xl text-lg">
                            {{ phasesSubtitle() }}
                        </p>
                    </div>
                    <div class="space-y-5">
                        @for (phase of phases; track phase.num) {
                            <div class="rounded-3xl bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div class="flex flex-col lg:flex-row">
                                    <!-- Phase number + title -->
                                    <div class="lg:w-72 flex-shrink-0 p-8 flex gap-5 items-start"
                                         [style.borderLeft]="'4px solid ' + phase.color">
                                        <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-white"
                                             [style.background]="phase.iconBg">
                                            {{ phase.num }}
                                        </div>
                                        <div>
                                            <p class="text-xs font-bold tracking-widest uppercase mb-1" [style.color]="phase.color">Phase {{ phase.num }}</p>
                                            <h4 class="font-bold text-slate-900 dark:text-white">{{ phase.title }}</h4>
                                            <p class="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed">{{ phase.summary }}</p>
                                        </div>
                                    </div>
                                    <!-- Description + deliverables -->
                                    <div class="flex-1 p-8 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700">
                                        <p class="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-5">{{ phase.desc }}</p>
                                        <p class="text-xs font-bold tracking-widest uppercase text-slate-400 mb-3">{{ _('Livrables', 'Deliverables') }}</p>
                                        <ul class="space-y-2">
                                            @for (d of phase.deliverables; track d) {
                                                <li class="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
                                                    <i class="pi pi-check-circle text-indigo-400 mt-0.5 shrink-0 text-xs"></i>
                                                    <span>{{ d }}</span>
                                                </li>
                                            }
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        }
                    </div>
                </div>
            </section>

            <!-- ══════════ MODERN DATA STACK (layers) ══════════ -->
            <section class="bg-slate-950 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="mb-14">
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-400 mb-4">{{ _('ARCHITECTURE OUVERTE', 'OPEN ARCHITECTURE') }}</p>
                        <h2 class="text-4xl font-bold text-white max-w-2xl">{{ _('Passez a la Modern Data Platform', 'Embrace the Modern Data Platform') }}</h2>
                        <p class="text-slate-400 mt-4 max-w-2xl text-lg">
                            {{ stackDesc() }}
                        </p>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        @for (layer of stackLayers; track layer.name) {
                            <div class="rounded-2xl bg-white/5 border border-white/10 p-6">
                                <div class="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                                     [style.background]="layer.iconBg">
                                    <i [class]="layer.icon + ' text-white text-sm'"></i>
                                </div>
                                <h4 class="font-bold text-white mb-2">{{ layer.name }}</h4>
                                <p class="text-slate-400 text-sm leading-relaxed mb-4">{{ layer.desc }}</p>
                                <div class="flex flex-wrap gap-1.5">
                                    @for (tool of layer.tools; track tool) {
                                        <span class="px-2 py-1 rounded bg-white/10 text-slate-300 text-xs font-medium">{{ tool }}</span>
                                    }
                                </div>
                            </div>
                        }
                    </div>
                </div>
            </section>

            <!-- ══════════ BÉNÉFICES ══════════ -->
            <section class="bg-white dark:bg-slate-900 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="mb-14">
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-500 mb-4">{{ _('CE QUE VOUS GAGNEZ', 'WHAT YOU GAIN') }}</p>
                        <h2 class="text-4xl font-bold text-slate-900 dark:text-white max-w-2xl">{{ _('Un impact business mesurable', 'Measurable business impact') }}</h2>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        @for (benefit of benefits; track benefit.title) {
                            <div class="rounded-3xl bg-slate-100 dark:bg-slate-800 p-8">
                                <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                                     [style.background]="benefit.iconBg">
                                    <i [class]="benefit.icon + ' text-white'"></i>
                                </div>
                                <h4 class="font-bold text-slate-900 dark:text-white mb-3 text-lg">{{ benefit.title }}</h4>
                                <p class="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">{{ benefit.desc }}</p>
                            </div>
                        }
                    </div>
                </div>
            </section>

            <!-- ══════════ FAQ ══════════ -->
            <section class="bg-slate-950 py-24 px-6 lg:px-20">
                <div class="max-w-4xl mx-auto">
                    <div class="mb-14 text-center">
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-400 mb-4">FAQ</p>
                        <h2 class="text-4xl font-bold text-white">{{ _('Questions frequentes', 'Frequently asked questions') }}</h2>
                    </div>
                    <div class="space-y-4">
                        @for (faq of faqs; track faq.q; let i = $index) {
                            <div class="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                                <button (click)="toggleFaq(i)"
                                        class="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors">
                                    <span class="font-semibold text-white pr-4">{{ faq.q }}</span>
                                    <i class="shrink-0 text-slate-400 transition-transform duration-200"
                                       [class]="openFaq === i ? 'pi pi-minus' : 'pi pi-plus'"></i>
                                </button>
                                @if (openFaq === i) {
                                    <div class="px-6 pb-6 text-slate-400 leading-relaxed text-sm border-t border-white/10 pt-4">
                                        {{ faq.a }}
                                    </div>
                                }
                            </div>
                        }
                    </div>
                </div>
            </section>

            <!-- ══════════ CTA FINAL ══════════ -->
            <section class="bg-gradient-to-br from-indigo-950 via-slate-900 to-cyan-950 py-24 px-6 lg:px-20">
                <div class="max-w-3xl mx-auto text-center">
                    <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-400 mb-4">{{ ctaReadyLabel() }}</p>
                    <h2 class="text-4xl md:text-5xl font-bold text-white mb-6">
                        {{ ctaTitle() }}
                    </h2>
                    <p class="text-slate-400 text-lg mb-10">
                        {{ ctaDesc() }}
                    </p>
                    <button pButton pRipple [label]="ctaContactExpert()"
                            [routerLink]="[currentLang + '/advisory']" [fragment]="'contact'"
                            class="!bg-gradient-to-r !from-indigo-600 !to-cyan-500 !border-0 !font-bold
                                   !tracking-wide !px-10 !py-4 !rounded-lg !text-base
                                   hover:!shadow-xl hover:!shadow-indigo-500/30 transition-all duration-300">
                    </button>
                </div>
            </section>

            <footer-widget />
        </div>
    `
})
export class AdvisoryMissionPage {
    private router = inject(Router);
    private i18n   = inject(I18nService);
    currentLang = '/fr';

    /** True when display language is French */
    readonly isFr = computed(() => this.i18n.lang() === 'fr');

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        const lang  = (match ? match[1] : 'fr') as Lang;
        this.currentLang = '/' + lang;
        this.i18n.setLang(lang);
    }

    /** Shortcut for template: {{ _('French text', 'English text') }} */
    _(fr: string, en: string): string { return this.isFr() ? fr : en; }

    // ── Computed signals for strings containing apostrophes ──────────────────

    readonly heroTitle          = computed(() => this.isFr() ? 'Transformez vos donn\u00e9es' : 'Transform your data');
    readonly heroTitleHighlight = computed(() => this.isFr() ? 'en produits concrets' : 'into tangible products');
    readonly heroDesc           = computed(() => this.isFr()
        ? 'Pipelines data, plateformes cloud, mod\u00e8les IA en production \u2014 nous concevons et d\u00e9ployons des solutions robustes qui g\u00e9n\u00e8rent un v\u00e9ritable impact business.'
        : 'Data pipelines, cloud platforms, AI models in production \u2014 we design and deploy robust solutions that drive real business impact.');
    readonly ctaDiscussProject  = computed(() => this.isFr() ? 'DISCUTER D\u2019UN PROJET' : 'DISCUSS A PROJECT');
    readonly whenToCallTitle    = computed(() => this.isFr() ? 'Quand faire appel \u00e0 nous ?' : 'When should you call on us?');
    readonly usecasesTitle      = computed(() => this.isFr() ? 'Nos cas d\u2019usages' : 'Our use cases');
    readonly afterColumnTitle   = computed(() => this.isFr() ? 'Apr\u00e8s notre intervention' : 'After our engagement');
    readonly phasesTitle        = computed(() => this.isFr()
        ? '5 phases pour construire votre plateforme data'
        : '5 phases to build your data platform');
    readonly phasesSubtitle     = computed(() => this.isFr()
        ? 'Du diagnostic express aux premiers cas d\u2019usage, jusqu\u2019\u00e0 une plateforme pr\u00eate pour l\u2019IA \u2014 une approche qui transforme votre vision en r\u00e9sultats tangibles.'
        : 'From rapid diagnostics to initial use cases, through to an AI-ready platform \u2014 an approach that turns your vision into tangible results.');
    readonly stackDesc          = computed(() => this.isFr()
        ? 'Architectures ouvertes, sans lock-in vendor. Toutes les sources int\u00e9gr\u00e9es pour produire des donn\u00e9es fiables, des dashboards BI aux mod\u00e8les IA.'
        : 'Open architectures with no vendor lock-in. All sources integrated to deliver reliable data, from BI dashboards to AI models.');
    readonly ctaReadyLabel      = computed(() => this.isFr() ? 'PR\u00caT \u00c0 D\u00c9MARRER ?' : 'READY TO GET STARTED?');
    readonly ctaTitle           = computed(() => this.isFr()
        ? 'Construisons ensemble\nvos produits data'
        : 'Let\u2019s build your\ndata products together');
    readonly ctaDesc            = computed(() => this.isFr()
        ? '\u00c9changez avec un expert et d\u00e9couvrez comment transformer vos donn\u00e9es en produits concrets.'
        : 'Speak with an expert and discover how to turn your data into tangible products.');
    readonly ctaContactExpert   = computed(() => this.isFr() ? 'PRENDRE CONTACT AVEC UN EXPERT' : 'CONTACT AN EXPERT');

    // ── State ───────────────────────────────────────────────────────────────

    openFaq: number | null = null;

    toggleFaq(i: number) {
        this.openFaq = this.openFaq === i ? null : i;
    }

    scrollTo(id: string) {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ── Data arrays as getters (bilingual) ──────────────────────────────────

    get painPoints() {
        const fr = this.isFr();
        return [
            {
                icon: 'pi pi-chart-line',
                iconBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                title: fr ? 'D\u00e9cisions sans donn\u00e9es fiables' : 'Decisions without reliable data',
                desc: fr
                    ? 'Vos \u00e9quipes m\u00e9tier prennent des d\u00e9cisions bas\u00e9es sur des rapports manuels ou des exports Excel contradictoires. La donn\u00e9e n\u2019est pas encore un atout strat\u00e9gique.'
                    : 'Your business teams make decisions based on manual reports or contradictory Excel exports. Data is not yet a strategic asset.'
            },
            {
                icon: 'pi pi-bolt',
                iconBg: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                title: fr ? 'Vous voulez int\u00e9grer l\u2019IA \u00e0 vos processus' : 'You want to integrate AI into your workflows',
                desc: fr
                    ? 'Agents IA, automatisation, copilotes \u2014 vous voyez le potentiel mais vous n\u2019avez pas encore l\u2019infrastructure data qui le rend possible.'
                    : 'AI agents, automation, copilots \u2014 you see the potential but lack the data infrastructure to make it happen.'
            },
            {
                icon: 'pi pi-box',
                iconBg: 'linear-gradient(135deg, #10b981, #059669)',
                title: fr ? 'Un produit data \u00e0 construire' : 'A data product to build',
                desc: fr
                    ? 'Dashboard op\u00e9rationnel, API data, application analytique \u2014 vous avez le besoin m\u00e9tier mais pas les ressources internes pour le d\u00e9ployer industriellement.'
                    : 'Operational dashboard, data API, analytics application \u2014 you have the business need but not the in-house resources to deploy it at scale.'
            },
            {
                icon: 'pi pi-sitemap',
                iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
                title: fr ? 'Sources de donn\u00e9es \u00e0 centraliser' : 'Data sources to consolidate',
                desc: fr
                    ? 'ERP, CRM, API tierces, bases SQL \u2014 vos donn\u00e9es sont partout et personne ne les a encore unifi\u00e9es dans une source de v\u00e9rit\u00e9 unique.'
                    : 'ERP, CRM, third-party APIs, SQL databases \u2014 your data is scattered everywhere with no single source of truth.'
            }
        ];
    }

    get usecases() {
        const fr = this.isFr();
        return [
            {
                icon: 'pi pi-play',
                illustrationBg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                title: fr ? 'Construction d\u2019un premier POC data' : 'Building your first data POC',
                desc: fr
                    ? 'Nous vous accompagnons pour poser les bases de votre stack data modulaire et construire vos premiers cas d\u2019usages rapidement.'
                    : 'We guide you in laying the foundations of a modular data stack and quickly building your first use cases.',
                tags: ['BI', 'ANALYTICS', 'REPORTING', 'DASHBOARDS']
            },
            {
                icon: 'pi pi-server',
                illustrationBg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                title: fr ? 'Modernisation de votre Data Platform' : 'Modernizing your Data Platform',
                desc: fr
                    ? 'Mise \u00e0 niveau de votre plateforme data pour r\u00e9duire votre time-to-insight, fiabiliser vos donn\u00e9es et scaler avec vos besoins.'
                    : 'Upgrading your data platform to reduce time-to-insight, improve data reliability, and scale with your needs.',
                tags: ['DATA ENGINEERING', 'PIPELINES', 'TIME-TO-INSIGHTS', 'SELF-SERVICE']
            },
            {
                icon: 'pi pi-sparkles',
                illustrationBg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                title: fr ? 'Int\u00e9gration de briques IA & GenAI' : 'AI & GenAI integration',
                desc: fr
                    ? 'Nous construisons l\u2019infrastructure data adapt\u00e9e pour d\u00e9ployer vos mod\u00e8les IA et GenAI en production de mani\u00e8re fiable.'
                    : 'We build the right data infrastructure to deploy your AI and GenAI models reliably in production.',
                tags: ['GENAI', 'LLMs', 'RAG', 'AGENTIC AI']
            },
            {
                icon: 'pi pi-shield',
                illustrationBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                title: 'DataOps & Governance',
                desc: fr
                    ? 'Structurez vos workflows data pour un delivery fiable, document\u00e9 et automatis\u00e9 avec CI/CD, tests et observabilit\u00e9.'
                    : 'Structure your data workflows for reliable, documented, and automated delivery with CI/CD, testing, and observability.',
                tags: fr
                    ? ['GOUVERNANCE', 'DATAOPS', 'CI/CD', 'OBSERVABILIT\u00c9']
                    : ['GOVERNANCE', 'DATAOPS', 'CI/CD', 'OBSERVABILITY']
            },
            {
                icon: 'pi pi-chart-bar',
                illustrationBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                title: fr ? 'D\u00e9veloppement de produits data & analytics' : 'Data & analytics product development',
                desc: fr
                    ? 'Dashboards, copilotes IA, APIs analytiques \u2014 nous concevons des produits data robustes qui g\u00e9n\u00e8rent un impact business mesurable.'
                    : 'Dashboards, AI copilots, analytics APIs \u2014 we build robust data products that deliver measurable business impact.',
                tags: ['BI', 'ANALYTICS', 'SELF-SERVICE', 'API DATA']
            }
        ];
    }

    get beforeItems() {
        const fr = this.isFr();
        return fr ? [
            'D\u00e9lais importants dans la production de KPIs',
            'Dette technique et d\u00e9pendance au legacy',
            'Exports Excel et traitements manuels \u00e0 r\u00e9p\u00e9tition',
            '\u00c9quipes m\u00e9tier d\u00e9pendantes de l\u2019IT pour acc\u00e9der aux donn\u00e9es',
            'Gouvernance faible, qualit\u00e9 de la donn\u00e9e discutable'
        ] : [
            'Significant delays in KPI production',
            'Technical debt and legacy system dependency',
            'Repetitive Excel exports and manual processing',
            'Business teams dependent on IT for data access',
            'Weak governance and questionable data quality'
        ];
    }

    get afterItems() {
        const fr = this.isFr();
        return fr ? [
            'R\u00e9duction du time-to-KPI jusqu\u2019\u00e0 90%',
            'Plateforme cloud-native, maintenable et \u00e9volutive',
            'Automatisation des pipelines et cas d\u2019usage',
            'Autonomisation des m\u00e9tiers avec du self-service BI',
            'Source de v\u00e9rit\u00e9 unique et tra\u00e7abilit\u00e9 garantie'
        ] : [
            'Time-to-KPI reduced by up to 90%',
            'Cloud-native, maintainable, and scalable platform',
            'Automated pipelines and use cases',
            'Business team empowerment through self-service BI',
            'Single source of truth with guaranteed traceability'
        ];
    }

    get phases() {
        const fr = this.isFr();
        return [
            {
                num: '1',
                color: '#6366f1',
                iconBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                title: fr ? 'Audit & Cartographie' : 'Audit & Mapping',
                summary: fr
                    ? 'Analyser votre contexte et contraintes pour concevoir la stack optimale.'
                    : 'Analyze your context and constraints to design the optimal stack.',
                desc: fr
                    ? 'Ateliers avec vos \u00e9quipes, cartographie de l\u2019existant, benchmark des outils disponibles sur le march\u00e9, proposition de 2-3 sc\u00e9narios d\u2019architecture avec analyse co\u00fbts/b\u00e9n\u00e9fices.'
                    : 'Workshops with your teams, mapping of existing systems, market tooling benchmark, proposal of 2\u20133 architecture scenarios with cost/benefit analysis.',
                deliverables: fr ? [
                    'Synth\u00e8se des besoins et contraintes (RGPD, budget, volum\u00e9trie)',
                    'Benchmark comparatif des outils par brique fonctionnelle',
                    'Sc\u00e9narios d\u2019architecture avec recommandation de stack cible'
                ] : [
                    'Requirements and constraints summary (GDPR, budget, data volumes)',
                    'Comparative benchmark of tools by functional layer',
                    'Architecture scenarios with target stack recommendation'
                ]
            },
            {
                num: '2',
                color: '#06b6d4',
                iconBg: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                title: fr ? 'Architecture Cible & Plan de Migration' : 'Target Architecture & Migration Plan',
                summary: fr
                    ? 'D\u00e9finir une architecture moderne adapt\u00e9e \u00e0 vos besoins actuels et futurs.'
                    : 'Define a modern architecture tailored to your current and future needs.',
                desc: fr
                    ? 'Conception de l\u2019architecture cible, s\u00e9lection des outils, d\u00e9finition d\u2019un plan de migration progressif pour limiter les interruptions de service.'
                    : 'Target architecture design, tool selection, and definition of a phased migration plan to minimize service disruptions.',
                deliverables: fr ? [
                    'Architecture technique d\u00e9taill\u00e9e (diagramme HLA/HLD)',
                    'Sch\u00e9ma des flux cibles (sources, transformations, destinations)',
                    'Plan de migration d\u00e9taill\u00e9 avec jalons et minimisation des risques'
                ] : [
                    'Detailed technical architecture (HLA/HLD diagrams)',
                    'Target data flow schema (sources, transformations, destinations)',
                    'Detailed migration plan with milestones and risk mitigation'
                ]
            },
            {
                num: '3',
                color: '#10b981',
                iconBg: 'linear-gradient(135deg, #10b981, #059669)',
                title: fr ? 'Mise en place du socle (MVP)' : 'Foundation setup (MVP)',
                summary: fr
                    ? 'Construction du socle Data Platform sur votre environnement Cloud ou On-Premise.'
                    : 'Building the Data Platform foundation on your Cloud or On-Premise environment.',
                desc: fr
                    ? 'D\u00e9ploiement du data warehouse/lakehouse, premiers pipelines et dashboards op\u00e9rationnels avec pratiques DataOps (CI/CD, tests, monitoring) d\u00e8s le d\u00e9part.'
                    : 'Deploying the data warehouse/lakehouse, first operational pipelines and dashboards with DataOps practices (CI/CD, testing, monitoring) from day one.',
                deliverables: fr ? [
                    'Data warehouse/lakehouse d\u00e9ploy\u00e9 et op\u00e9rationnel',
                    'Pipelines d\u2019ingestion et de transformation fonctionnels',
                    'Premiers dashboards en production avec documentation technique'
                ] : [
                    'Data warehouse/lakehouse deployed and operational',
                    'Functional ingestion and transformation pipelines',
                    'First production dashboards with technical documentation'
                ]
            },
            {
                num: '4',
                color: '#f59e0b',
                iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
                title: fr ? 'Industrialisation & Gouvernance' : 'Industrialization & Governance',
                summary: fr
                    ? 'Finaliser la migration et mettre en place la gouvernance data.'
                    : 'Finalize migration and establish data governance.',
                desc: fr
                    ? 'Migration des flux et donn\u00e9es restants, tests de continuit\u00e9 de service, d\u00e9commissionnement des anciens syst\u00e8mes, mise en place des r\u00e8gles de gouvernance.'
                    : 'Migration of remaining data flows, service continuity testing, decommissioning legacy systems, and establishing governance policies.',
                deliverables: fr ? [
                    'Migration compl\u00e8te des flux et donn\u00e9es',
                    'Tests de continuit\u00e9 et validation des performances',
                    'D\u00e9commissionnement s\u00e9curis\u00e9 des anciens syst\u00e8mes legacy'
                ] : [
                    'Complete migration of all data flows',
                    'Continuity testing and performance validation',
                    'Secure decommissioning of legacy systems'
                ]
            },
            {
                num: '5',
                color: '#8b5cf6',
                iconBg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                title: fr ? 'Adoption & Roadmap d\u2019Extension' : 'Adoption & Expansion Roadmap',
                summary: fr
                    ? 'Assurer l\u2019adoption par vos \u00e9quipes et pr\u00e9parer les prochaines \u00e9tapes.'
                    : 'Ensure adoption by your teams and prepare the next steps.',
                desc: fr
                    ? 'Formation des \u00e9quipes, mesure de l\u2019impact m\u00e9tier, construction de la roadmap d\u2019extension pour les prochains cas d\u2019usage (Analytics avanc\u00e9s, IA/ML).'
                    : 'Team training, business impact measurement, and building the expansion roadmap for upcoming use cases (advanced analytics, AI/ML).',
                deliverables: fr ? [
                    'Kit d\u2019adoption (supports de formation, documentation utilisateurs)',
                    'Rapport d\u2019impact m\u00e9tier et technique mesur\u00e9',
                    'Roadmap d\u2019extension valid\u00e9e (nouveaux cas d\u2019usage, IA/ML)'
                ] : [
                    'Adoption kit (training materials, user documentation)',
                    'Measured business and technical impact report',
                    'Validated expansion roadmap (new use cases, AI/ML)'
                ]
            }
        ];
    }

    get stackLayers() {
        const fr = this.isFr();
        return [
            {
                icon: 'pi pi-arrow-right-arrow-left',
                iconBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                name: 'Ingestion',
                desc: fr
                    ? 'Pipelines robustes collectant et synchronisant vos donn\u00e9es depuis toutes les sources en continu.'
                    : 'Robust pipelines that continuously collect and synchronize data from all your sources.',
                tools: ['Airbyte', 'Fivetran', 'DLT', 'Python']
            },
            {
                icon: 'pi pi-server',
                iconBg: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                name: fr ? 'Stockage' : 'Storage',
                desc: fr
                    ? 'Architecture moderne (Warehouse, Lakehouse) constituant un socle durable pour toute la plateforme.'
                    : 'Modern architecture (Warehouse, Lakehouse) providing a durable foundation for the entire platform.',
                tools: ['Snowflake', 'BigQuery', 'Databricks', 'Redshift']
            },
            {
                icon: 'pi pi-code',
                iconBg: 'linear-gradient(135deg, #10b981, #059669)',
                name: 'Transformation',
                desc: fr
                    ? 'Mod\u00e8les Bronze/Silver/Gold \u2014 donn\u00e9es nettoy\u00e9es, structur\u00e9es et document\u00e9es automatiquement.'
                    : 'Bronze/Silver/Gold models \u2014 data cleaned, structured, and documented automatically.',
                tools: ['dbt Cloud', 'dbt Core', 'SQL', 'Python']
            },
            {
                icon: 'pi pi-cog',
                iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
                name: 'Orchestration',
                desc: fr
                    ? 'Workflows automatis\u00e9s et coordonn\u00e9s pour des traitements performants et une disponibilit\u00e9 maximale.'
                    : 'Automated, coordinated workflows for high-performance processing and maximum availability.',
                tools: ['Airflow', 'Dagster', 'Prefect', 'MWAA']
            },
            {
                icon: 'pi pi-chart-bar',
                iconBg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                name: 'Activation',
                desc: fr
                    ? 'Dashboards BI, analyses avanc\u00e9es, APIs data et mod\u00e8les ML directement int\u00e9gr\u00e9s aux outils m\u00e9tier.'
                    : 'BI dashboards, advanced analytics, data APIs, and ML models directly integrated into business tools.',
                tools: ['Power BI', 'Looker', 'Metabase', 'Superset']
            },
            {
                icon: 'pi pi-shield',
                iconBg: 'linear-gradient(135deg, #ec4899, #db2777)',
                name: fr ? 'Observabilit\u00e9 & Gouvernance' : 'Observability & Governance',
                desc: fr
                    ? 'Surveillance continue, tra\u00e7abilit\u00e9 compl\u00e8te, tests automatis\u00e9s et conformit\u00e9 assur\u00e9s en permanence.'
                    : 'Continuous monitoring, full traceability, automated testing, and ongoing compliance assurance.',
                tools: ['Prometheus', 'Elementary', 'Soda', 'DataHub']
            }
        ];
    }

    get benefits() {
        const fr = this.isFr();
        return [
            {
                icon: 'pi pi-bolt',
                iconBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                title: fr ? 'Time-to-value r\u00e9duit' : 'Reduced time-to-value',
                desc: fr
                    ? 'D\u00e9ploiement de vos projets cl\u00e9s en quelques semaines, pas en plusieurs mois. Les premiers r\u00e9sultats arrivent rapidement et cr\u00e9ent de la confiance en interne.'
                    : 'Deploy key projects in weeks, not months. Early results build internal confidence and stakeholder buy-in.'
            },
            {
                icon: 'pi pi-chart-line',
                iconBg: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                title: fr ? '\u00c9volutivit\u00e9 garantie' : 'Guaranteed scalability',
                desc: fr
                    ? 'Une architecture pens\u00e9e pour scaler avec vos besoins. Vos volumes x10, vos nouveaux cas d\u2019usage, votre croissance \u2014 la plateforme suit sans refonte majeure.'
                    : 'An architecture designed to scale with your needs. 10x data volumes, new use cases, business growth \u2014 the platform keeps up without major rework.'
            },
            {
                icon: 'pi pi-users',
                iconBg: 'linear-gradient(135deg, #10b981, #059669)',
                title: fr ? 'Adoption par vos \u00e9quipes' : 'Team adoption',
                desc: fr
                    ? 'Des produits con\u00e7us avec et pour vos \u00e9quipes m\u00e9tier. Formation incluse pour garantir que la technologie serve les usages \u2014 et non l\u2019inverse.'
                    : 'Products designed with and for your business teams. Training included to ensure technology serves the use cases \u2014 not the other way around.'
            },
            {
                icon: 'pi pi-star',
                iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
                title: fr ? 'Impact business mesurable' : 'Measurable business impact',
                desc: fr
                    ? 'Chaque projet r\u00e9pond \u00e0 un besoin m\u00e9tier pr\u00e9cis. Nous d\u00e9finissons en amont les KPIs de succ\u00e8s et nous mesurons l\u2019impact r\u00e9el de nos interventions.'
                    : 'Every project addresses a specific business need. We define success KPIs upfront and measure the real impact of our engagements.'
            }
        ];
    }

    get faqs() {
        const fr = this.isFr();
        return [
            {
                q: fr
                    ? 'Quelle est la dur\u00e9e typique d\u2019une mission Data Engineering ?'
                    : 'What is the typical duration of a Data Engineering engagement?',
                a: fr
                    ? 'Une mission s\u2019\u00e9tend g\u00e9n\u00e9ralement de 1 \u00e0 6 mois selon la complexit\u00e9. Un POC ou un audit peut d\u00e9marrer en quelques jours. La construction compl\u00e8te d\u2019une data platform prend 3 \u00e0 6 mois. Nous d\u00e9coupons syst\u00e9matiquement en phases pour livrer de la valeur rapidement et it\u00e9rer.'
                    : 'An engagement typically spans 1 to 6 months depending on complexity. A POC or audit can start within days. Building a complete data platform takes 3 to 6 months. We systematically break work into phases to deliver value quickly and iterate.'
            },
            {
                q: fr
                    ? 'Comment fiabilisez-vous les indicateurs m\u00e9tier ?'
                    : 'How do you ensure business metrics reliability?',
                a: fr
                    ? 'Nous centralisons les calculs dans un Data Warehouse unique, mod\u00e9lisons en couches Bronze/Silver/Gold, documentons automatiquement via dbt docs, et mettons en place des tests automatis\u00e9s sur chaque transformation. R\u00e9sultat : une source de v\u00e9rit\u00e9 unique, partag\u00e9e et tra\u00e7able par toutes les \u00e9quipes.'
                    : 'We centralize calculations in a single Data Warehouse, model in Bronze/Silver/Gold layers, auto-document via dbt docs, and implement automated tests on every transformation. The result: a single source of truth, shared and traceable by all teams.'
            },
            {
                q: fr
                    ? 'Quels outils et technologies utilisez-vous ?'
                    : 'What tools and technologies do you use?',
                a: fr
                    ? 'Notre stack inclut : Airflow/Dagster/Prefect (orchestration), Airbyte/Fivetran/DLT (ingestion), Snowflake/BigQuery/Databricks (stockage), dbt Cloud/Core (transformation), Power BI/Metabase/Superset (visualisation), Prometheus/Grafana/Elementary (observabilit\u00e9). Nous n\u2019avons pas de partenariat commercial \u2014 nous recommandons les outils les mieux adapt\u00e9s \u00e0 votre contexte.'
                    : 'Our stack includes: Airflow/Dagster/Prefect (orchestration), Airbyte/Fivetran/DLT (ingestion), Snowflake/BigQuery/Databricks (storage), dbt Cloud/Core (transformation), Power BI/Metabase/Superset (visualization), Prometheus/Grafana/Elementary (observability). We have no commercial partnerships \u2014 we recommend the tools best suited to your context.'
            },
            {
                q: fr
                    ? 'Pouvez-vous migrer une infrastructure on-premise vers le cloud sans interruption ?'
                    : 'Can you migrate on-premise infrastructure to the cloud without downtime?',
                a: fr
                    ? 'Oui. Nous d\u00e9ployons la nouvelle infrastructure cloud en parall\u00e8le de l\u2019existant, migrons les flux par vagues successives en commen\u00e7ant par les non-critiques, effectuons des tests de r\u00e9gression automatis\u00e9s \u00e0 chaque \u00e9tape, puis basculons les flux critiques progressivement avant de d\u00e9commissionner le legacy.'
                    : 'Yes. We deploy the new cloud infrastructure in parallel with existing systems, migrate flows in successive waves starting with non-critical ones, run automated regression tests at each stage, then progressively switch over critical flows before decommissioning legacy systems.'
            }
        ];
    }
}
