import { Component, computed, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TopbarWidget } from './topbarwidget.component';
import { FooterWidget } from './footerwidget';
import { I18nService, Lang } from '../../../i18n/i18n.service';

@Component({
    selector: 'app-advisory-formation',
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
                    <div class="absolute -top-32 left-1/3 w-[500px] h-[500px] rounded-full opacity-20"
                         style="background: radial-gradient(circle, #10b981 0%, transparent 70%)"></div>
                    <div class="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-10"
                         style="background: radial-gradient(circle, #6366f1 0%, transparent 70%)"></div>
                </div>
                <div class="relative max-w-4xl mx-auto">
                    <div class="flex items-center gap-2 text-sm text-slate-500 mb-8">
                        <a [routerLink]="[currentLang + '/advisory']" class="hover:text-indigo-400 transition-colors cursor-pointer">Advisory</a>
                        <i class="pi pi-chevron-right text-xs"></i>
                        <span class="text-slate-400">{{ _('Formation & Transfert de Comp\u00e9tences', 'Training & Skills Transfer') }}</span>
                    </div>

                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-4"><i class="pi pi-sparkles text-emerald-400 text-xs"></i><span class="text-emerald-300 text-sm font-medium">EXPERTISE</span></div>
                    <h1 class="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
                        {{ heroTitle1() }}<br>
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                            {{ _('aux r\u00e9alit\u00e9s du terrain', 'with real-world expertise') }}
                        </span>
                    </h1>
                    <p class="text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
                        {{ heroDesc() }}
                    </p>
                    <div class="flex flex-col sm:flex-row gap-4">
                        <button pButton pRipple [label]="btnPlanLabel()"
                                [routerLink]="[currentLang + '/advisory']" [fragment]="'contact'"
                                class="!bg-gradient-to-r !from-emerald-600 !to-cyan-500 !border-0 !font-bold
                                       !tracking-wide !px-8 !py-3 !rounded-lg
                                       hover:!shadow-xl hover:!shadow-emerald-500/30 transition-all duration-300">
                        </button>
                        <button pButton pRipple [label]="_('VOIR LES FORMATIONS', 'VIEW TRAINING PROGRAMS')"
                                (click)="scrollTo('formations')"
                                class="!bg-white/10 !border !border-white/20 !text-white !font-semibold
                                       !tracking-wide !px-8 !py-3 !rounded-lg hover:!bg-white/20 transition-all">
                        </button>
                    </div>
                </div>
            </section>

            <!-- ══════════ POUR QUI ? ══════════ -->
            <section class="bg-white dark:bg-slate-900 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="mb-14">
                        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 mb-4"><i class="pi pi-sparkles text-emerald-500 text-xs"></i><span class="text-emerald-600 dark:text-emerald-400 text-sm font-medium">{{ _('POUR QUI ?', 'WHO IS IT FOR?') }}</span></div>
                        <h2 class="text-4xl font-bold text-slate-900 dark:text-white max-w-2xl">
                            {{ _('Des formations pens\u00e9es pour votre contexte', 'Training programs designed for your context') }}
                        </h2>
                        <p class="text-slate-500 dark:text-slate-400 mt-4 max-w-xl text-lg">
                            {{ audienceSubtitle() }}
                        </p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        @for (audience of audiences; track audience.title) {
                            <div class="rounded-2xl bg-slate-100 dark:bg-slate-800 p-8">
                                <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                                     [style.background]="audience.iconBg">
                                    <i [class]="audience.icon + ' text-white'"></i>
                                </div>
                                <h4 class="font-bold text-slate-900 dark:text-white mb-3 text-lg">{{ audience.title }}</h4>
                                <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-4">{{ audience.desc }}</p>
                                <ul class="space-y-2">
                                    @for (profile of audience.profiles; track profile) {
                                        <li class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            <i class="pi pi-check-circle text-emerald-500 text-xs"></i>
                                            {{ profile }}
                                        </li>
                                    }
                                </ul>
                            </div>
                        }
                    </div>
                </div>
            </section>

            <!-- ══════════ NOS FORMATIONS ══════════ -->
            <section id="formations" class="bg-slate-100 dark:bg-slate-800/50 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="mb-14">
                        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 mb-4"><i class="pi pi-sparkles text-emerald-500 text-xs"></i><span class="text-emerald-600 dark:text-emerald-400 text-sm font-medium">{{ _('NOS PROGRAMMES', 'OUR PROGRAMS') }}</span></div>
                        <h2 class="text-4xl font-bold text-slate-900 dark:text-white max-w-2xl">{{ _('Catalogue de formations', 'Training Catalog') }}</h2>
                        <p class="text-slate-500 dark:text-slate-400 mt-4 max-w-xl text-lg">
                            {{ catalogDesc() }}
                        </p>
                    </div>

                    <div class="space-y-6">
                        @for (formation of formations; track formation.title) {
                            <div class="rounded-2xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col lg:flex-row">
                                <!-- Left -->
                                <div class="lg:w-72 flex-shrink-0 flex flex-col justify-center p-10 min-h-[200px]"
                                     [style.background]="formation.illustrationBg">
                                    <div class="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                                        <i [class]="formation.icon + ' text-white text-2xl'"></i>
                                    </div>
                                    <span class="text-white/80 text-sm font-semibold">{{ formation.duration }}</span>
                                </div>
                                <!-- Right -->
                                <div class="flex-1 p-8 lg:p-10">
                                    <span class="text-xs font-bold tracking-[0.2em] uppercase text-emerald-500 mb-3 block">
                                        {{ _('FORMATION', 'TRAINING') }}
                                    </span>
                                    <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-3">{{ formation.title }}</h3>
                                    <p class="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">{{ formation.desc }}</p>
                                    <!-- Programme -->
                                    <p class="text-xs font-bold tracking-widest uppercase text-slate-400 mb-3">{{ _('AU PROGRAMME', 'CURRICULUM') }}</p>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mb-6">
                                        @for (module of formation.modules; track module) {
                                            <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                                <i class="pi pi-check-circle text-emerald-500 text-xs shrink-0"></i>
                                                {{ module }}
                                            </div>
                                        }
                                    </div>
                                    <!-- Tags -->
                                    <div class="flex flex-wrap gap-2">
                                        @for (tag of formation.tags; track tag) {
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

            <!-- ══════════ APPROCHE PÉDAGOGIQUE ══════════ -->
            <section class="bg-slate-950 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="mb-14">
                        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-4"><i class="pi pi-sparkles text-emerald-400 text-xs"></i><span class="text-emerald-300 text-sm font-medium">{{ _('COMMENT ON FORME', 'HOW WE TRAIN') }}</span></div>
                        <h2 class="text-4xl font-bold text-white max-w-2xl">{{ _('Notre approche p\u00e9dagogique', 'Our training methodology') }}</h2>
                        <p class="text-slate-400 mt-4 max-w-xl text-lg">
                            {{ pedagogySubtitle() }}
                        </p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        @for (step of pedagogy; track step.title) {
                            <div class="rounded-2xl bg-white/5 border border-white/10 p-8 flex gap-5">
                                <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                     [style.background]="step.iconBg">
                                    <i [class]="step.icon + ' text-white text-sm'"></i>
                                </div>
                                <div>
                                    <h4 class="font-bold text-white mb-2">{{ step.title }}</h4>
                                    <p class="text-slate-400 text-sm leading-relaxed">{{ step.desc }}</p>
                                </div>
                            </div>
                        }
                    </div>
                </div>
            </section>

            <!-- ══════════ CE QUI NOUS DIFFÉRENCIE ══════════ -->
            <section class="bg-white dark:bg-slate-900 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="mb-14">
                        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 mb-4"><i class="pi pi-sparkles text-emerald-500 text-xs"></i><span class="text-emerald-600 dark:text-emerald-400 text-sm font-medium">{{ _('CE QUI NOUS DISTINGUE', 'WHAT SETS US APART') }}</span></div>
                        <h2 class="text-4xl font-bold text-slate-900 dark:text-white max-w-2xl">
                            {{ _('Pas une formation g\u00e9n\u00e9rique', 'Not a generic training program') }}
                        </h2>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        @for (diff of differentiators; track diff.title) {
                            <div class="rounded-2xl bg-slate-100 dark:bg-slate-800 p-8">
                                <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                                     [style.background]="diff.iconBg">
                                    <i [class]="diff.icon + ' text-white'"></i>
                                </div>
                                <h4 class="font-bold text-slate-900 dark:text-white mb-3">{{ diff.title }}</h4>
                                <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{{ diff.desc }}</p>
                            </div>
                        }
                    </div>
                </div>
            </section>

            <!-- ══════════ FAQ ══════════ -->
            <section class="bg-slate-950 py-24 px-6 lg:px-20">
                <div class="max-w-4xl mx-auto">
                    <div class="mb-14 text-center">
                        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-4"><i class="pi pi-sparkles text-emerald-400 text-xs"></i><span class="text-emerald-300 text-sm font-medium">FAQ</span></div>
                        <h2 class="text-4xl font-bold text-white">{{ _('Questions fr\u00e9quentes', 'Frequently Asked Questions') }}</h2>
                    </div>
                    <div class="space-y-4">
                        @for (faq of faqs; track faq.q; let i = $index) {
                            <div class="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                                <button (click)="toggleFaq(i)"
                                        class="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors">
                                    <span class="font-semibold text-white pr-4">{{ faq.q }}</span>
                                    <i class="shrink-0 text-slate-400"
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
            <section class="bg-gradient-to-br from-emerald-950 via-slate-900 to-cyan-950 py-24 px-6 lg:px-20">
                <div class="max-w-3xl mx-auto text-center">
                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-4"><i class="pi pi-sparkles text-emerald-400 text-xs"></i><span class="text-emerald-300 text-sm font-medium">{{ ctaReady() }}</span></div>
                    <h2 class="text-4xl md:text-5xl font-bold text-white mb-6">
                        {{ ctaHeadline() }}
                    </h2>
                    <p class="text-slate-400 text-lg mb-10">
                        {{ ctaDesc() }}
                    </p>
                    <button pButton pRipple [label]="btnPlanLabel()"
                            [routerLink]="[currentLang + '/advisory']" [fragment]="'contact'"
                            class="!bg-gradient-to-r !from-emerald-600 !to-cyan-500 !border-0 !font-bold
                                   !tracking-wide !px-10 !py-4 !rounded-lg !text-base
                                   hover:!shadow-xl hover:!shadow-emerald-500/30 transition-all duration-300">
                    </button>
                </div>
            </section>

            <footer-widget />
        </div>
    `
})
export class AdvisoryFormationPage {
    private router = inject(Router);
    private i18n = inject(I18nService);
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

    // ── Computed signals for strings with apostrophes ──

    readonly heroTitle1 = computed(() => this.isFr()
        ? 'Formez vos \u00e9quipes'
        : 'Train your teams');

    readonly heroDesc = computed(() => this.isFr()
        ? 'Des ateliers pratiques, calibr\u00e9s sur vos donn\u00e9es et vos outils \u2014 pour que l\u2019expertise reste en interne apr\u00e8s notre d\u00e9part.'
        : 'Hands-on workshops, calibrated to your data and tools \u2014 so the expertise stays in-house after we leave.');

    readonly audienceSubtitle = computed(() => this.isFr()
        ? 'Que vous soyez en phase de d\u00e9marrage ou de mont\u00e9e en maturit\u00e9, nous adaptons le programme \u00e0 votre niveau et \u00e0 vos enjeux r\u00e9els.'
        : 'Whether you are ramping up or scaling maturity, we tailor the program to your level and real-world challenges.');

    readonly catalogDesc = computed(() => this.isFr()
        ? '3 parcours intensifs sur les technologies qui font la Modern Data Stack. Chaque formation s\u2019appuie sur vos donn\u00e9es r\u00e9elles.'
        : '3 intensive tracks on the technologies powering the Modern Data Stack. Every program is built on your actual data.');

    readonly pedagogySubtitle = computed(() => this.isFr()
        ? 'Pas de diapositives g\u00e9n\u00e9riques. Chaque session est ancr\u00e9e dans votre r\u00e9alit\u00e9 op\u00e9rationnelle.'
        : 'No generic slide decks. Every session is anchored in your operational reality.');

    readonly btnPlanLabel = computed(() => this.isFr()
        ? 'PLANIFIER UNE FORMATION'
        : 'SCHEDULE A TRAINING');

    readonly ctaReady = computed(() => this.isFr()
        ? 'PR\u00caT \u00c0 D\u00c9MARRER ?'
        : 'READY TO GET STARTED?');

    readonly ctaHeadline = computed(() => this.isFr()
        ? 'Montez en comp\u00e9tences\navec les bons praticiens'
        : 'Level up your skills\nwith the right practitioners');

    readonly ctaDesc = computed(() => this.isFr()
        ? 'D\u00e9crivez vos besoins \u2014 nous construisons un programme sur mesure et revenons vers vous sous 24h.'
        : 'Describe your needs \u2014 we build a tailored program and get back to you within 24 hours.');

    openFaq: number | null = null;

    toggleFaq(i: number) {
        this.openFaq = this.openFaq === i ? null : i;
    }

    scrollTo(id: string) {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    get audiences() {
        const f = this.isFr();
        return [
            {
                icon: 'pi pi-code',
                iconBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                title: f ? '\u00c9quipes techniques' : 'Technical Teams',
                desc: f ? 'D\u00e9veloppeurs, data engineers et architectes qui veulent ma\u00eetriser les outils de la Modern Data Stack.'
                       : 'Developers, data engineers and architects looking to master Modern Data Stack tooling.',
                profiles: f
                    ? ['Data Engineers', 'Backend Developers', 'Architectes data', 'DevOps / DataOps']
                    : ['Data Engineers', 'Backend Developers', 'Data Architects', 'DevOps / DataOps']
            },
            {
                icon: 'pi pi-chart-bar',
                iconBg: 'linear-gradient(135deg, #10b981, #059669)',
                title: f ? '\u00c9quipes analytics' : 'Analytics Teams',
                desc: f ? 'Data analysts et business analysts qui veulent gagner en autonomie sur les donn\u00e9es.'
                       : 'Data analysts and business analysts seeking greater autonomy over their data.',
                profiles: f
                    ? ['Data Analysts', 'Business Analysts', 'Finance / Contr\u00f4le', 'Responsables BI']
                    : ['Data Analysts', 'Business Analysts', 'Finance / Controlling', 'BI Managers']
            },
            {
                icon: 'pi pi-briefcase',
                iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
                title: f ? 'Managers & D\u00e9cideurs' : 'Managers & Decision-Makers',
                desc: f ? 'DSI, CDOs et directeurs qui veulent comprendre les enjeux data pour piloter leurs \u00e9quipes.'
                       : 'CIOs, CDOs and directors who need to understand data challenges to lead their teams.',
                profiles: f
                    ? ['DSI / CTO', 'Chief Data Officers', 'Directeurs m\u00e9tier', 'Responsables transformation']
                    : ['CIO / CTO', 'Chief Data Officers', 'Business Unit Directors', 'Transformation Leads']
            }
        ];
    }

    get formations() {
        const f = this.isFr();
        return [
            {
                icon: 'pi pi-server',
                illustrationBg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                title: f ? 'Data Engineering avec la Modern Data Stack' : 'Data Engineering with the Modern Data Stack',
                duration: f ? '2 \u00e0 3 jours' : '2 to 3 days',
                desc: f ? 'Formation pratique sur les outils qui font la Modern Data Stack africaine : ingestion, transformation avec dbt, orchestration avec Airflow, stockage cloud. Chaque exercice s\u2019appuie sur des cas r\u00e9els de votre secteur.'
                       : 'Hands-on training on the tools powering the Modern Data Stack: ingestion, transformation with dbt, orchestration with Airflow, cloud storage. Every exercise is based on real cases from your industry.',
                modules: f
                    ? [
                        'Architecture data moderne (Lakehouse, Warehouse)',
                        'Ingestion avec Airbyte \u2014 sources h\u00e9t\u00e9rog\u00e8nes',
                        'Mod\u00e9lisation dbt : Bronze / Silver / Gold',
                        'Tests automatis\u00e9s et documentation dbt',
                        'Orchestration avec Airflow : DAGs, monitoring',
                        'Stockage cloud : Snowflake ou BigQuery',
                        'CI/CD pour la data (GitHub Actions + dbt)',
                        'Observabilit\u00e9 : Elementary, alertes, SLAs'
                    ]
                    : [
                        'Modern data architecture (Lakehouse, Warehouse)',
                        'Ingestion with Airbyte \u2014 heterogeneous sources',
                        'dbt modelling: Bronze / Silver / Gold',
                        'Automated testing and dbt documentation',
                        'Orchestration with Airflow: DAGs, monitoring',
                        'Cloud storage: Snowflake or BigQuery',
                        'CI/CD for data (GitHub Actions + dbt)',
                        'Observability: Elementary, alerts, SLAs'
                    ],
                tags: ['DATA ENGINEERING', 'dbt', 'AIRFLOW', 'SNOWFLAKE', 'HANDS-ON']
            },
            {
                icon: 'pi pi-chart-line',
                illustrationBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                title: 'Analytics & BI Self-Service',
                duration: f ? '1 \u00e0 2 jours' : '1 to 2 days',
                desc: f ? 'Atelier intensif pour rendre vos \u00e9quipes analytiques totalement autonomes : cr\u00e9ation de dashboards, r\u00e9daction de requ\u00eates SQL robustes, et bonnes pratiques pour produire des KPIs fiables.'
                       : 'Intensive workshop to make your analytics teams fully autonomous: dashboard creation, writing robust SQL queries, and best practices for producing reliable KPIs.',
                modules: f
                    ? [
                        'SQL avanc\u00e9 : CTEs, fen\u00eatrage, agr\u00e9gations',
                        'Mod\u00e9lisation dimensionnelle (faits & dimensions)',
                        'Cr\u00e9ation de dashboards avec Metabase ou Superset',
                        'Conception de KPIs m\u00e9tier fiables',
                        'Couche s\u00e9mantique et catalogue de m\u00e9triques',
                        'Self-service BI : gouvernance et acc\u00e8s contr\u00f4l\u00e9s'
                    ]
                    : [
                        'Advanced SQL: CTEs, window functions, aggregations',
                        'Dimensional modelling (facts & dimensions)',
                        'Dashboard creation with Metabase or Superset',
                        'Designing reliable business KPIs',
                        'Semantic layer and metrics catalog',
                        'Self-service BI: governance and controlled access'
                    ],
                tags: ['ANALYTICS', 'SQL', 'BI', 'DASHBOARDS', 'SELF-SERVICE']
            },
            {
                icon: 'pi pi-sparkles',
                illustrationBg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                title: f ? 'IA & LLMs en production' : 'AI & LLMs in Production',
                duration: f ? '2 \u00e0 3 jours' : '2 to 3 days',
                desc: f ? 'Formation pratique sur l\u2019int\u00e9gration de l\u2019IA dans vos pipelines data : RAG, agents LLMs, fine-tuning et bonnes pratiques pour passer du POC \u00e0 la production de fa\u00e7on fiable.'
                       : 'Hands-on training on integrating AI into your data pipelines: RAG, LLM agents, fine-tuning, and best practices to move reliably from POC to production.',
                modules: f
                    ? [
                        'Fondamentaux LLMs : architecture, tokens, prompting',
                        'RAG (Retrieval-Augmented Generation) avec vos donn\u00e9es',
                        'Agents IA : orchestration, outils, m\u00e9moire',
                        '\u00c9valuation et monitoring des mod\u00e8les en prod',
                        'Pipelines data AI-ready : vectorisation, embeddings',
                        'Gouvernance et s\u00e9curit\u00e9 des donn\u00e9es dans un contexte IA',
                        'Cas pratiques : chatbot sur vos documents, scoring, NLP'
                    ]
                    : [
                        'LLM fundamentals: architecture, tokens, prompting',
                        'RAG (Retrieval-Augmented Generation) with your data',
                        'AI agents: orchestration, tools, memory',
                        'Model evaluation and monitoring in production',
                        'AI-ready data pipelines: vectorisation, embeddings',
                        'Data governance and security in an AI context',
                        'Practical cases: chatbot on your documents, scoring, NLP'
                    ],
                tags: f
                    ? ['IA', 'LLMs', 'RAG', 'AGENTS', 'PYTHON', 'PRODUCTION']
                    : ['AI', 'LLMs', 'RAG', 'AGENTS', 'PYTHON', 'PRODUCTION']
            }
        ];
    }

    get pedagogy() {
        const f = this.isFr();
        return [
            {
                icon: 'pi pi-database',
                iconBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                title: f ? 'Vos donn\u00e9es, pas des exemples fictifs' : 'Your data, not fictional examples',
                desc: f ? 'Chaque exercice pratique s\u2019appuie sur vos donn\u00e9es r\u00e9elles ou des jeux de donn\u00e9es repr\u00e9sentatifs de votre secteur. Ce que vous apprenez le matin, vous pouvez l\u2019appliquer l\u2019apr\u00e8s-midi.'
                       : 'Every hands-on exercise uses your actual data or datasets representative of your industry. What you learn in the morning, you can apply in the afternoon.'
            },
            {
                icon: 'pi pi-users',
                iconBg: 'linear-gradient(135deg, #10b981, #059669)',
                title: f ? 'Sessions en petit groupe (max 8)' : 'Small group sessions (max 8)',
                desc: f ? 'Pas d\u2019amphith\u00e9\u00e2tre. Des sessions limit\u00e9es \u00e0 8 participants pour garantir une attention individuelle, des \u00e9changes riches et un rythme adapt\u00e9 au niveau de chaque apprenant.'
                       : 'No lecture halls. Sessions limited to 8 participants to ensure individual attention, rich interaction, and a pace adapted to each learner\u2019s level.'
            },
            {
                icon: 'pi pi-book',
                iconBg: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                title: f ? 'Ressources compl\u00e8tes remises' : 'Comprehensive resources provided',
                desc: f ? '\u00c0 l\u2019issue de chaque formation : slides annot\u00e9es, notebooks Jupyter, scripts r\u00e9utilisables, biblioth\u00e8que de requ\u00eates SQL type et acc\u00e8s \u00e0 un espace de ressources en ligne.'
                       : 'After each training: annotated slides, Jupyter notebooks, reusable scripts, SQL query library, and access to an online resource hub.'
            },
            {
                icon: 'pi pi-headphones',
                iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
                title: f ? 'Support post-formation (30 jours)' : 'Post-training support (30 days)',
                desc: f ? 'Un canal Slack d\u00e9di\u00e9 pendant 30 jours pour poser vos questions, d\u00e9bloquer des cas concrets rencontr\u00e9s sur votre propre stack et solidifier les apprentissages.'
                       : 'A dedicated Slack channel for 30 days to ask questions, unblock real cases encountered on your own stack, and reinforce what you learned.'
            }
        ];
    }

    get differentiators() {
        const f = this.isFr();
        return [
            {
                icon: 'pi pi-globe',
                iconBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                title: f ? 'Formateurs praticiens' : 'Practitioner trainers',
                desc: f ? 'Nos formateurs d\u00e9ployent ces outils en production tous les jours. Ils connaissent les pi\u00e8ges r\u00e9els, les workarounds qui fonctionnent, et les contextes africains o\u00f9 ces solutions ont \u00e9t\u00e9 mises en \u0153uvre.'
                       : 'Our trainers deploy these tools in production every day. They know the real pitfalls, the workarounds that work, and the local contexts where these solutions have been implemented.'
            },
            {
                icon: 'pi pi-wrench',
                iconBg: 'linear-gradient(135deg, #10b981, #059669)',
                title: f ? 'Programme sur mesure' : 'Tailored program',
                desc: f ? 'Le catalogue est un point de d\u00e9part. Chaque formation est ajust\u00e9e selon le niveau actuel de vos \u00e9quipes, vos outils en production, et les cas d\u2019usage que vous voulez adresser en priorit\u00e9.'
                       : 'The catalog is a starting point. Every program is adjusted based on your teams\u2019 current level, your production tools, and the use cases you want to address first.'
            },
            {
                icon: 'pi pi-chart-line',
                iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
                title: f ? 'Autonomie durable' : 'Lasting autonomy',
                desc: f ? 'Notre objectif n\u2019est pas de cr\u00e9er une d\u00e9pendance. Chaque formation vise l\u2019autonomie compl\u00e8te de vos \u00e9quipes sur les sujets couverts, avec les ressources pour continuer \u00e0 progresser seuls.'
                       : 'Our goal is not to create dependency. Every training program targets full autonomy for your teams on the topics covered, with the resources to keep progressing on their own.'
            }
        ];
    }

    get faqs() {
        const f = this.isFr();
        return [
            {
                q: f ? 'Les formations sont-elles dispens\u00e9es en fran\u00e7ais ?' : 'Are training sessions delivered in French?',
                a: f ? 'Oui, toutes nos formations sont dispens\u00e9es en fran\u00e7ais. Les ressources techniques (documentation, code) sont en anglais car c\u2019est la langue de la communaut\u00e9 open-source, mais les explications, exercices et \u00e9changes se font en fran\u00e7ais.'
                     : 'Yes, all our training sessions are delivered in French. Technical resources (documentation, code) are in English as it is the language of the open-source community, but explanations, exercises and discussions are conducted in French.'
            },
            {
                q: f ? 'Quel niveau pr\u00e9requis pour les formations techniques ?' : 'What prerequisite level is required for technical training?',
                a: f ? 'Pour les formations Data Engineering et IA : niveau interm\u00e9diaire recommand\u00e9 (SQL courant, notions de Python, exp\u00e9rience avec des bases de donn\u00e9es). Pour Analytics & BI : connaissance de base de SQL suffisante. Nous \u00e9valuons le niveau de vos \u00e9quipes en amont pour adapter le programme.'
                     : 'For Data Engineering and AI training: intermediate level recommended (working SQL, Python fundamentals, database experience). For Analytics & BI: basic SQL knowledge is sufficient. We assess your teams\u2019 level beforehand to tailor the program.'
            },
            {
                q: f ? 'Peut-on former toute une \u00e9quipe en m\u00eame temps ?' : 'Can we train an entire team at once?',
                a: f ? 'Oui. Nous recommandons des groupes de 4 \u00e0 8 personnes pour maximiser l\u2019impact. Au-del\u00e0, nous organisons plusieurs sessions. Pour les grandes \u00e9quipes (20+), nous proposons un format \u00ab formation de formateurs \u00bb pour que quelques experts internes puissent ensuite diffuser les connaissances.'
                     : 'Yes. We recommend groups of 4 to 8 people to maximise impact. Beyond that, we organise multiple sessions. For large teams (20+), we offer a "train the trainer" format so a few internal experts can then disseminate the knowledge.'
            },
            {
                q: f ? 'Les formations sont-elles disponibles en distanciel ?' : 'Are training programs available remotely?',
                a: f ? 'Oui, en pr\u00e9sentiel (sur site et d\u00e9placement possible sur d\u2019autres villes) ou en distanciel via Zoom/Google Meet. Nous recommandons le pr\u00e9sentiel pour les formations pratiques longues (2-3 jours) car les \u00e9changes informels sont tr\u00e8s pr\u00e9cieux, mais le distanciel est efficace pour les sessions courtes ou de suivi.'
                     : 'Yes, on-site (on-site, with travel to other cities available) or remotely via Zoom/Google Meet. We recommend on-site delivery for longer hands-on programs (2\u20133 days) as informal exchanges are invaluable, but remote sessions are effective for shorter or follow-up sessions.'
            }
        ];
    }
}
