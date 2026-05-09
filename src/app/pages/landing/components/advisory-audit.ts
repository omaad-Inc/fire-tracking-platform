import { Component, computed, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TopbarWidget } from './topbarwidget.component';
import { FooterWidget } from './footerwidget';
import { I18nService, Lang } from '../../../i18n/i18n.service';

@Component({
    selector: 'app-advisory-audit',
    standalone: true,
    imports: [RouterModule, ButtonModule, RippleModule, TopbarWidget, FooterWidget],
    template: `
        <div class="min-h-screen">

            <!-- Fixed topbar -->
            <div class="fixed top-0 left-0 right-0 z-50 bg-surface-0/90 dark:bg-brand-900/90 backdrop-blur-lg border-b border-surface-200/50 dark:border-white/10">
                <topbar-widget class="py-4 px-6 mx-0 md:mx-12 lg:mx-20 lg:px-20 flex items-center justify-between relative lg:static" />
            </div>
            <div class="h-20"></div>

            <!-- ══════════ HERO ══════════ -->
            <section class="relative overflow-hidden bg-brand-900 py-28 px-6 lg:px-20">
                <div class="absolute inset-0 pointer-events-none overflow-hidden">
                    <div class="absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full opacity-20"
                         style="background: radial-gradient(circle, #1A2740 0%, transparent 70%)"></div>
                </div>
                <div class="relative max-w-4xl mx-auto">
                    <!-- Breadcrumb -->
                    <div class="flex items-center gap-2 text-sm text-warm-500 mb-8">
                        <a [routerLink]="[currentLang + '/advisory']" class="hover:text-ochre-400 text-warm-400 transition-colors cursor-pointer">Advisory</a>
                        <i class="pi pi-chevron-right text-xs"></i>
                        <span class="text-warm-400">{{ _('Audit & Diagnostic Data', 'Data Audit & Diagnostic') }}</span>
                    </div>

                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-4"><i class="pi pi-sparkles text-ochre-300 text-xs"></i><span class="text-ochre-300 text-sm font-medium">EXPERTISE</span></div>
                    <h1 class="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
                        {{ heroTitle() }}<br>
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-ochre-300 to-ochre-400">
                            {{ _('plateforme data solide', 'solid data platform') }}
                        </span>
                    </h1>
                    <p class="text-xl text-warm-400 max-w-2xl mb-10 leading-relaxed">
                        {{ heroSubtitle() }}
                    </p>
                    <button pButton pRipple [label]="ctaProject()"
                            [routerLink]="[currentLang + '/advisory']" [fragment]="'contact'"
                            class="!bg-gradient-to-r !from-ochre-500 !to-ochre-400 !border-0 !font-bold !text-warm-900
                                   !tracking-wide !px-8 !py-3 !rounded-lg
                                   hover:!shadow-xl hover:!shadow-card transition-all duration-300">
                    </button>
                </div>
            </section>

            <!-- ══════════ QUAND FAIRE APPEL ? ══════════ -->
            <section class="bg-white dark:bg-brand-900 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="mb-14">
                        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-700/10 dark:bg-ochre-400/15 border border-brand-200 dark:border-ochre-700/40 mb-4"><i class="pi pi-sparkles text-brand-700 dark:text-ochre-400 text-xs"></i><span class="text-brand-700 dark:text-ochre-400 text-sm font-medium">{{ _('VOUS RECONNAISSEZ-VOUS ?', 'DOES THIS SOUND FAMILIAR?') }}</span></div>
                        <h2 class="text-4xl font-bold text-warm-900 dark:text-white max-w-2xl">{{ _('Quand faire appel a nous ?', 'When should you call on us?') }}</h2>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        @for (pain of painPoints; track pain.title) {
                            <div class="rounded-2xl bg-warm-100 dark:bg-warm-800 p-8 flex gap-5">
                                <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-1"
                                     [style.background]="pain.iconBg">
                                    <i [class]="pain.icon + ' text-white text-sm'"></i>
                                </div>
                                <div>
                                    <h4 class="font-bold text-warm-900 dark:text-white mb-2">{{ pain.title }}</h4>
                                    <p class="text-warm-500 dark:text-warm-400 text-sm leading-relaxed">{{ pain.desc }}</p>
                                </div>
                            </div>
                        }
                    </div>
                </div>
            </section>

            <!-- ══════════ L'APPROCHE ══════════ -->
            <section class="bg-warm-100 dark:bg-warm-800/50 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="mb-14">
                        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-700/10 dark:bg-ochre-400/15 border border-brand-200 dark:border-ochre-700/40 mb-4"><i class="pi pi-sparkles text-brand-700 dark:text-ochre-400 text-xs"></i><span class="text-brand-700 dark:text-ochre-400 text-sm font-medium">{{ _('METHODE EPROUVEE', 'PROVEN METHOD') }}</span></div>
                        <h2 class="text-4xl font-bold text-warm-900 dark:text-white max-w-2xl">{{ _('Notre approche en 4 etapes', 'Our 4-step approach') }}</h2>
                        <p class="text-warm-500 dark:text-warm-400 mt-4 max-w-xl text-lg">
                            {{ approachSubtitle() }}
                        </p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        @for (step of steps; track step.num) {
                            <div class="rounded-2xl bg-white dark:bg-brand-900 p-8 flex gap-6">
                                <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-bold text-lg text-white
                                            bg-gradient-to-br from-brand-700 to-brand-500 dark:from-ochre-500 dark:to-ochre-400 dark:text-warm-900">
                                    {{ step.num }}
                                </div>
                                <div>
                                    <h4 class="font-bold text-warm-900 dark:text-white mb-3 text-lg">{{ step.title }}</h4>
                                    <p class="text-warm-500 dark:text-warm-400 text-sm leading-relaxed">{{ step.desc }}</p>
                                </div>
                            </div>
                        }
                    </div>
                </div>
            </section>

            <!-- ══════════ MODERN DATA PLATFORM ══════════ -->
            <section class="bg-brand-900 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="mb-14">
                        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-4"><i class="pi pi-sparkles text-ochre-300 text-xs"></i><span class="text-ochre-300 text-sm font-medium">{{ _('ARCHITECTURE OUVERTE', 'OPEN ARCHITECTURE') }}</span></div>
                        <h2 class="text-4xl font-bold text-white max-w-2xl">{{ _('Passez a la Modern Data Platform', 'Upgrade to a Modern Data Platform') }}</h2>
                        <p class="text-warm-400 mt-4 max-w-2xl text-lg">
                            {{ platformSubtitle() }}
                        </p>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        @for (layer of stackLayers; track layer.name) {
                            <div class="rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/8 transition-colors">
                                <div class="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                                     [style.background]="layer.iconBg">
                                    <i [class]="layer.icon + ' text-white text-sm'"></i>
                                </div>
                                <h4 class="font-bold text-white mb-2">{{ layer.name }}</h4>
                                <p class="text-warm-400 text-sm leading-relaxed mb-4">{{ layer.desc }}</p>
                                <div class="flex flex-wrap gap-1.5">
                                    @for (tool of layer.tools; track tool) {
                                        <span class="px-2 py-1 rounded bg-white/10 text-warm-300 text-xs font-medium">{{ tool }}</span>
                                    }
                                </div>
                            </div>
                        }
                    </div>
                </div>
            </section>

            <!-- ══════════ BENEFICES ══════════ -->
            <section class="bg-white dark:bg-brand-900 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="mb-14">
                        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-700/10 dark:bg-ochre-400/15 border border-brand-200 dark:border-ochre-700/40 mb-4"><i class="pi pi-sparkles text-brand-700 dark:text-ochre-400 text-xs"></i><span class="text-brand-700 dark:text-ochre-400 text-sm font-medium">{{ _('CE QUE VOUS GAGNEZ', 'WHAT YOU GAIN') }}</span></div>
                        <h2 class="text-4xl font-bold text-warm-900 dark:text-white max-w-2xl">
                            {{ _('Transformez vos donnees en atout strategique', 'Turn your data into a strategic asset') }}
                        </h2>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        @for (benefit of benefits; track benefit.title) {
                            <div class="rounded-2xl bg-warm-100 dark:bg-warm-800 p-8">
                                <h4 class="font-bold text-warm-900 dark:text-white mb-3 text-lg">{{ benefit.title }}</h4>
                                <p class="text-warm-500 dark:text-warm-400 leading-relaxed">{{ benefit.desc }}</p>
                            </div>
                        }
                    </div>
                </div>
            </section>

            <!-- ══════════ LIVRABLES ══════════ -->
            <section class="bg-warm-100 dark:bg-warm-800/50 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="mb-14">
                        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-700/10 dark:bg-ochre-400/15 border border-brand-200 dark:border-ochre-700/40 mb-4"><i class="pi pi-sparkles text-brand-700 dark:text-ochre-400 text-xs"></i><span class="text-brand-700 dark:text-ochre-400 text-sm font-medium">{{ _('TRANSPARENCE TOTALE', 'FULL TRANSPARENCY') }}</span></div>
                        <h2 class="text-4xl font-bold text-warm-900 dark:text-white max-w-2xl">{{ _('Ce que vous recevez', 'What you receive') }}</h2>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        @for (deliverable of deliverables; track deliverable.title) {
                            <div class="rounded-2xl bg-white dark:bg-brand-900 p-8">
                                <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                                     [style.background]="deliverable.iconBg">
                                    <i [class]="deliverable.icon + ' text-white'"></i>
                                </div>
                                <h4 class="font-bold text-warm-900 dark:text-white mb-3">{{ deliverable.title }}</h4>
                                <p class="text-warm-500 dark:text-warm-400 text-sm leading-relaxed">{{ deliverable.desc }}</p>
                            </div>
                        }
                    </div>
                </div>
            </section>

            <!-- ══════════ FAQ ══════════ -->
            <section class="bg-brand-900 py-24 px-6 lg:px-20">
                <div class="max-w-4xl mx-auto">
                    <div class="mb-14 text-center">
                        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-4"><i class="pi pi-sparkles text-ochre-300 text-xs"></i><span class="text-ochre-300 text-sm font-medium">FAQ</span></div>
                        <h2 class="text-4xl font-bold text-white">{{ _('Questions frequentes', 'Frequently asked questions') }}</h2>
                    </div>
                    <div class="space-y-4">
                        @for (faq of faqs; track faq.q; let i = $index) {
                            <div class="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                                <button (click)="toggleFaq(i)"
                                        class="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors">
                                    <span class="font-semibold text-white pr-4">{{ faq.q }}</span>
                                    <i class="shrink-0 text-warm-400 transition-transform duration-200"
                                       [class]="openFaq === i ? 'pi pi-minus' : 'pi pi-plus'"></i>
                                </button>
                                @if (openFaq === i) {
                                    <div class="px-6 pb-6 text-warm-400 leading-relaxed text-sm border-t border-white/10 pt-4">
                                        {{ faq.a }}
                                    </div>
                                }
                            </div>
                        }
                    </div>
                </div>
            </section>

            <!-- ══════════ CTA FINAL ══════════ -->
            <section class="bg-gradient-to-br from-brand-950 via-warm-900 to-brand-950 py-24 px-6 lg:px-20">
                <div class="max-w-3xl mx-auto text-center">
                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-4"><i class="pi pi-sparkles text-ochre-300 text-xs"></i><span class="text-ochre-300 text-sm font-medium">{{ ctaReady() }}</span></div>
                    <h2 class="text-4xl md:text-5xl font-bold text-white mb-6">
                        {{ ctaHeadline() }}
                    </h2>
                    <p class="text-warm-400 text-lg mb-10">
                        {{ ctaDesc() }}
                    </p>
                    <button pButton pRipple [label]="ctaContactExpert()"
                            [routerLink]="[currentLang + '/advisory']" [fragment]="'contact'"
                            class="!bg-gradient-to-r !from-ochre-500 !to-ochre-400 !border-0 !font-bold !text-warm-900
                                   !tracking-wide !px-10 !py-4 !rounded-lg !text-base
                                   hover:!shadow-xl hover:!shadow-card transition-all duration-300">
                    </button>
                </div>
            </section>

            <footer-widget />
        </div>
    `
})
export class AdvisoryAuditPage {
    private router = inject(Router);
    private i18n = inject(I18nService);
    currentLang = '/fr';

    /** True when display language is French */
    readonly isFr = computed(() => this.i18n.lang() === 'fr');

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        const lang = (match ? match[1] : 'fr') as Lang;
        this.currentLang = '/' + lang;
        this.i18n.setLang(lang);
    }

    /** Shortcut for template: {{ _('French text', 'English text') }} */
    _(fr: string, en: string): string { return this.isFr() ? fr : en; }

    // ── Computed signals for strings containing apostrophes ──

    readonly heroTitle = computed(() => this.isFr()
        ? 'Posez les bases d\u2019une'
        : 'Lay the foundations for a');

    readonly heroSubtitle = computed(() => this.isFr()
        ? 'Nous auditons votre existant et concevons une architecture moderne et sur-mesure, pr\u00eate \u00e0 accueillir vos futurs cas d\u2019usage Data & IA.'
        : 'We audit your existing infrastructure and design a modern, tailor-made architecture ready to support your future Data & AI use cases.');

    readonly ctaProject = computed(() => this.isFr()
        ? 'DISCUTER D\u2019UN PROJET'
        : 'DISCUSS A PROJECT');

    readonly ctaContactExpert = computed(() => this.isFr()
        ? 'PRENDRE CONTACT AVEC UN EXPERT'
        : 'CONTACT A DATA EXPERT');

    readonly approachSubtitle = computed(() => this.isFr()
        ? 'Diagnostic pr\u00e9cis, choix technologiques \u00e9clair\u00e9s et mise en production rapide pour cr\u00e9er de la valeur d\u00e8s les premiers mois.'
        : 'Precise diagnostics, informed technology choices, and rapid deployment to deliver value within the first months.');

    readonly platformSubtitle = computed(() => this.isFr()
        ? 'Nous privil\u00e9gions des architectures ouvertes plut\u00f4t que des stacks monolithiques. Toutes les sources sont int\u00e9gr\u00e9es pour produire des donn\u00e9es fiables, sans recr\u00e9er de dette \u00e0 moyen terme.'
        : 'We favour open architectures over monolithic stacks. All sources are integrated to produce reliable data without creating new technical debt.');

    readonly ctaReady = computed(() => this.isFr()
        ? 'PR\u00caT \u00c0 D\u00c9MARRER ?'
        : 'READY TO GET STARTED?');

    readonly ctaHeadline = computed(() => this.isFr()
        ? 'Vous avez un projet en t\u00eate ?\nParlons-en.'
        : 'Have a project in mind?\nLet\u2019s talk.');

    readonly ctaDesc = computed(() => this.isFr()
        ? 'Un appel de 30 minutes suffit pour comprendre vos enjeux et \u00e9valuer comment nous pouvons vous aider.'
        : 'A 30-minute call is all it takes to understand your challenges and assess how we can help.');

    // ── Component state ──

    openFaq: number | null = null;

    toggleFaq(i: number) {
        this.openFaq = this.openFaq === i ? null : i;
    }

    // ── Data arrays as getters (bilingual) ──

    get painPoints() {
        return this.isFr() ? [
            {
                icon: 'pi pi-database',
                iconBg: 'linear-gradient(135deg, #4D5F80, #8A98AE)',
                title: 'Donn\u00e9es dispers\u00e9es, qualit\u00e9 incertaine',
                desc: 'Vos donn\u00e9es sont \u00e9parpill\u00e9es dans de multiples syst\u00e8mes. Personne ne sait vraiment quelle source est fiable ni comment elles circulent.'
            },
            {
                icon: 'pi pi-file-excel',
                iconBg: 'linear-gradient(135deg, #233356, #4D5F80)',
                title: 'Pilotage manuel via spreadsheets',
                desc: 'Vous produisez vos KPIs \u00e0 la main dans Excel. Chaque rapport prend des heures et les chiffres divergent selon les \u00e9quipes.'
            },
            {
                icon: 'pi pi-sitemap',
                iconBg: 'linear-gradient(135deg, #4D5F80, #8A98AE)',
                title: 'Stack technologique mal adapt\u00e9e',
                desc: 'Vos outils actuels ne r\u00e9pondent plus \u00e0 vos besoins. La dette technique s\u2019accumule et freine l\u2019autonomie de vos \u00e9quipes m\u00e9tier.'
            },
            {
                icon: 'pi pi-lock',
                iconBg: 'linear-gradient(135deg, #4D5F80, #8A98AE)',
                title: 'D\u00e9pendance forte aux \u00e9quipes techniques',
                desc: 'Les \u00e9quipes m\u00e9tier ne peuvent pas acc\u00e9der aux donn\u00e9es sans passer par l\u2019IT. Les projets s\u2019accumulent dans les backlogs.'
            }
        ] : [
            {
                icon: 'pi pi-database',
                iconBg: 'linear-gradient(135deg, #4D5F80, #8A98AE)',
                title: 'Scattered data, uncertain quality',
                desc: 'Your data is spread across multiple systems. No one really knows which source is reliable or how data flows between them.'
            },
            {
                icon: 'pi pi-file-excel',
                iconBg: 'linear-gradient(135deg, #233356, #4D5F80)',
                title: 'Manual reporting via spreadsheets',
                desc: 'You build your KPIs by hand in Excel. Every report takes hours, and the numbers differ depending on the team.'
            },
            {
                icon: 'pi pi-sitemap',
                iconBg: 'linear-gradient(135deg, #4D5F80, #8A98AE)',
                title: 'Ill-fitting technology stack',
                desc: 'Your current tools no longer meet your needs. Technical debt is piling up and preventing your business teams from being autonomous.'
            },
            {
                icon: 'pi pi-lock',
                iconBg: 'linear-gradient(135deg, #4D5F80, #8A98AE)',
                title: 'Heavy reliance on technical teams',
                desc: 'Business teams cannot access data without going through IT. Projects keep stacking up in the backlog.'
            }
        ];
    }

    get steps() {
        return this.isFr() ? [
            {
                num: '1',
                title: 'Diagnostic de l\u2019existant',
                desc: 'Nous observons comment vos donn\u00e9es circulent, sont document\u00e9es et alimentent vos KPIs. Cette \u00e9tape met en \u00e9vidence ce qui fonctionne et ce qui freine vos ambitions. Vous repartez avec une vision claire de l\u2019\u00e9tat r\u00e9el de votre plateforme.'
            },
            {
                num: '2',
                title: 'Benchmark technologique',
                desc: 'Nous comparons plusieurs options possibles. Chaque stack est \u00e9valu\u00e9e selon vos objectifs : performance, agilit\u00e9, ouverture \u00e0 l\u2019IA. Vous gagnez un regard objectif qui \u00e9claire vos choix sans parti pris commercial.'
            },
            {
                num: '3',
                title: 'Architecture cible & sc\u00e9narios',
                desc: 'Nous dessinons plusieurs trajectoires pour votre future plateforme. Chaque sc\u00e9nario met en balance robustesse, \u00e9volutivit\u00e9 et contraintes internes. Vous d\u00e9cidez en toute confiance du chemin qui correspond \u00e0 votre organisation.'
            },
            {
                num: '4',
                title: 'Roadmap & premiers projets',
                desc: 'Nous traduisons la vision en un plan concret, pens\u00e9 pour donner des r\u00e9sultats rapides. Les premiers projets cr\u00e9ent de la valeur imm\u00e9diatement tout en pr\u00e9parant le socle de long terme.'
            }
        ] : [
            {
                num: '1',
                title: 'Current-state diagnostic',
                desc: 'We observe how your data flows, how it is documented, and how it feeds your KPIs. This step highlights what works and what holds you back. You walk away with a clear picture of your platform\u2019s actual state.'
            },
            {
                num: '2',
                title: 'Technology benchmark',
                desc: 'We compare several viable options. Each stack is evaluated against your goals: performance, agility, and AI readiness. You gain an objective perspective that informs your decisions with no vendor bias.'
            },
            {
                num: '3',
                title: 'Target architecture & scenarios',
                desc: 'We map out multiple trajectories for your future platform. Each scenario balances robustness, scalability, and internal constraints. You decide with confidence which path fits your organisation.'
            },
            {
                num: '4',
                title: 'Roadmap & first projects',
                desc: 'We translate the vision into a concrete plan designed to deliver quick wins. The first projects create immediate value while laying the foundation for long-term growth.'
            }
        ];
    }

    get stackLayers() {
        return this.isFr() ? [
            {
                icon: 'pi pi-arrow-right-arrow-left',
                iconBg: 'linear-gradient(135deg, #4D5F80, #8A98AE)',
                name: 'Ingestion',
                desc: 'Pipelines robustes qui collectent, normalisent et synchronisent vos donn\u00e9es en continu depuis toutes les sources.',
                tools: ['Airbyte', 'Fivetran', 'Airflow', 'DLT']
            },
            {
                icon: 'pi pi-server',
                iconBg: 'linear-gradient(135deg, #233356, #4D5F80)',
                name: 'Stockage',
                desc: 'Architecture moderne (Warehouse, Lakehouse) qui s\u00e9curise vos donn\u00e9es et constitue un socle durable pour toute la plateforme.',
                tools: ['Snowflake', 'BigQuery', 'Redshift', 'S3']
            },
            {
                icon: 'pi pi-code',
                iconBg: 'linear-gradient(135deg, #4D5F80, #8A98AE)',
                name: 'Transformation',
                desc: 'Les donn\u00e9es sont nettoy\u00e9es, structur\u00e9es et unifi\u00e9es pour cr\u00e9er des mod\u00e8les fiables, coh\u00e9rents et exploitables.',
                tools: ['dbt Cloud', 'dbt Core', 'SQL', 'Python']
            },
            {
                icon: 'pi pi-cog',
                iconBg: 'linear-gradient(135deg, #4D5F80, #8A98AE)',
                name: 'Orchestration',
                desc: 'Les flux sont automatis\u00e9s et coordonn\u00e9s pour garantir des traitements performants et une disponibilit\u00e9 maximale.',
                tools: ['Airflow', 'Dagster', 'Prefect', 'MWAA']
            },
            {
                icon: 'pi pi-chart-bar',
                iconBg: 'linear-gradient(135deg, #4D5F80, #8A98AE)',
                name: 'Activation',
                desc: 'Les donn\u00e9es deviennent actionnables : dashboards BI, analyses avanc\u00e9es ou mod\u00e8les ML int\u00e9gr\u00e9s aux outils m\u00e9tier.',
                tools: ['Power BI', 'Metabase', 'Superset', 'Looker']
            },
            {
                icon: 'pi pi-shield',
                iconBg: 'linear-gradient(135deg, #4D5F80, #8A98AE)',
                name: 'Observabilit\u00e9 & Gouvernance',
                desc: 'Qualit\u00e9, s\u00e9curit\u00e9 et conformit\u00e9 assur\u00e9es gr\u00e2ce \u00e0 une surveillance continue et une tra\u00e7abilit\u00e9 compl\u00e8te.',
                tools: ['Great Expectations', 'Elementary', 'dbt tests', 'DataHub']
            }
        ] : [
            {
                icon: 'pi pi-arrow-right-arrow-left',
                iconBg: 'linear-gradient(135deg, #4D5F80, #8A98AE)',
                name: 'Ingestion',
                desc: 'Robust pipelines that collect, normalise, and continuously synchronise your data from every source.',
                tools: ['Airbyte', 'Fivetran', 'Airflow', 'DLT']
            },
            {
                icon: 'pi pi-server',
                iconBg: 'linear-gradient(135deg, #233356, #4D5F80)',
                name: 'Storage',
                desc: 'Modern architecture (Warehouse, Lakehouse) that secures your data and provides a durable foundation for the entire platform.',
                tools: ['Snowflake', 'BigQuery', 'Redshift', 'S3']
            },
            {
                icon: 'pi pi-code',
                iconBg: 'linear-gradient(135deg, #4D5F80, #8A98AE)',
                name: 'Transformation',
                desc: 'Data is cleansed, structured, and unified to produce reliable, consistent, and actionable models.',
                tools: ['dbt Cloud', 'dbt Core', 'SQL', 'Python']
            },
            {
                icon: 'pi pi-cog',
                iconBg: 'linear-gradient(135deg, #4D5F80, #8A98AE)',
                name: 'Orchestration',
                desc: 'Workflows are automated and coordinated to ensure high-performance processing and maximum availability.',
                tools: ['Airflow', 'Dagster', 'Prefect', 'MWAA']
            },
            {
                icon: 'pi pi-chart-bar',
                iconBg: 'linear-gradient(135deg, #4D5F80, #8A98AE)',
                name: 'Activation',
                desc: 'Data becomes actionable: BI dashboards, advanced analytics, or ML models embedded in business tools.',
                tools: ['Power BI', 'Metabase', 'Superset', 'Looker']
            },
            {
                icon: 'pi pi-shield',
                iconBg: 'linear-gradient(135deg, #4D5F80, #8A98AE)',
                name: 'Observability & Governance',
                desc: 'Quality, security, and compliance guaranteed through continuous monitoring and full traceability.',
                tools: ['Great Expectations', 'Elementary', 'dbt tests', 'DataHub']
            }
        ];
    }

    get benefits() {
        return this.isFr() ? [
            {
                title: 'Une vision enfin claire de vos donn\u00e9es',
                desc: 'Vous savez exactement o\u00f9 vous en \u00eates et o\u00f9 aller. Fini les zones d\u2019ombre \u2014 place \u00e0 une plateforme lisible, fiable et pilotable par vos \u00e9quipes.'
            },
            {
                title: 'Des d\u00e9cisions \u00e9clair\u00e9es et partag\u00e9es',
                desc: 'Vos \u00e9quipes m\u00e9tiers et IT disposent d\u2019un langage commun et de KPIs fiables. Les arbitrages se font plus vite et avec moins de friction.'
            },
            {
                title: 'Un temps d\u2019ex\u00e9cution r\u00e9duit',
                desc: 'Gr\u00e2ce \u00e0 une architecture pens\u00e9e pour l\u2019efficacit\u00e9, vous gagnez en rapidit\u00e9 \u00e0 chaque nouveau projet. Les premiers r\u00e9sultats se mesurent en semaines.'
            },
            {
                title: 'Un socle qui pr\u00e9pare l\u2019avenir',
                desc: 'Votre plateforme est con\u00e7ue pour accueillir vos \u00e9volutions : nouveaux cas d\u2019usage, IA/GenAI, croissance des volumes. Vous avancez avec un syst\u00e8me p\u00e9renne.'
            }
        ] : [
            {
                title: 'A clear vision of your data at last',
                desc: 'You know exactly where you stand and where to go. No more blind spots \u2014 just a readable, reliable platform your teams can steer with confidence.'
            },
            {
                title: 'Informed, shared decision-making',
                desc: 'Your business and IT teams share a common language and trustworthy KPIs. Trade-offs happen faster and with far less friction.'
            },
            {
                title: 'Faster time to execution',
                desc: 'With an architecture designed for efficiency, every new project moves faster. You see measurable results within weeks.'
            },
            {
                title: 'A foundation built for the future',
                desc: 'Your platform is designed to accommodate new use cases, AI/GenAI, and growing data volumes. You move forward with a system that lasts.'
            }
        ];
    }

    get deliverables() {
        return this.isFr() ? [
            {
                icon: 'pi pi-file',
                iconBg: 'linear-gradient(135deg, #4D5F80, #8A98AE)',
                title: 'Document d\u2019Architecture Technique',
                desc: 'Cartographie compl\u00e8te de votre plateforme actuelle, identification des gaps critiques et sc\u00e9narios d\u2019architecture cible compar\u00e9s.'
            },
            {
                icon: 'pi pi-map',
                iconBg: 'linear-gradient(135deg, #233356, #4D5F80)',
                title: 'Feuille de route prioris\u00e9e',
                desc: 'Plan d\u2019action court/moyen/long terme avec estimation des co\u00fbts, des d\u00e9lais et de l\u2019impact business de chaque initiative.'
            },
            {
                icon: 'pi pi-users',
                iconBg: 'linear-gradient(135deg, #4D5F80, #8A98AE)',
                title: 'Restitution & ateliers',
                desc: 'Pr\u00e9sentation ex\u00e9cutive de nos conclusions, ateliers de co-construction avec vos \u00e9quipes techniques et m\u00e9tier.'
            }
        ] : [
            {
                icon: 'pi pi-file',
                iconBg: 'linear-gradient(135deg, #4D5F80, #8A98AE)',
                title: 'Technical Architecture Document',
                desc: 'Complete mapping of your current platform, identification of critical gaps, and compared target architecture scenarios.'
            },
            {
                icon: 'pi pi-map',
                iconBg: 'linear-gradient(135deg, #233356, #4D5F80)',
                title: 'Prioritised roadmap',
                desc: 'Short, medium, and long-term action plan with cost estimates, timelines, and business impact for each initiative.'
            },
            {
                icon: 'pi pi-users',
                iconBg: 'linear-gradient(135deg, #4D5F80, #8A98AE)',
                title: 'Executive presentation & workshops',
                desc: 'Executive-level presentation of our findings, plus co-design workshops with your technical and business teams.'
            }
        ];
    }

    get faqs() {
        return this.isFr() ? [
            {
                q: 'Quelle est la dur\u00e9e typique d\u2019un audit data ?',
                a: 'Un audit complet prend g\u00e9n\u00e9ralement 2 \u00e0 5 jours ouvr\u00e9s, selon la complexit\u00e9 de votre infrastructure. Il inclut des entretiens avec vos \u00e9quipes, l\u2019analyse technique de vos syst\u00e8mes existants, et la restitution des recommandations avec une feuille de route prioris\u00e9e.'
            },
            {
                q: 'Quels sont les signes qu\u2019il est temps de faire un audit ?',
                a: 'Les principaux signaux sont : des KPIs qui divergent selon les sources, des rapports produits manuellement dans Excel, une forte d\u00e9pendance des \u00e9quipes m\u00e9tier \u00e0 l\u2019IT pour acc\u00e9der aux donn\u00e9es, l\u2019absence de CI/CD sur vos pipelines data, ou des temps de traitement qui d\u00e9passent plusieurs heures.'
            },
            {
                q: 'L\u2019audit inclut-il des recommandations d\u2019outils sp\u00e9cifiques ?',
                a: 'Oui, et nous n\u2019avons aucun partenariat commercial avec les \u00e9diteurs. Nous recommandons les outils les mieux adapt\u00e9s \u00e0 votre contexte, vos contraintes budg\u00e9taires et vos ambitions \u2014 pas les outils sur lesquels nous touchons des commissions.'
            },
            {
                q: 'Que se passe-t-il apr\u00e8s l\u2019audit ?',
                a: 'Vous recevez le Document d\u2019Architecture Technique et la feuille de route. Vous \u00eates totalement libre de l\u2019impl\u00e9menter en interne ou de nous confier la suite. Si vous choisissez de travailler avec nous, l\u2019audit est d\u00e9compt\u00e9 du budget de la mission.'
            }
        ] : [
            {
                q: 'How long does a typical data audit take?',
                a: 'A full audit generally takes 2 to 5 business days, depending on the complexity of your infrastructure. It includes interviews with your teams, a technical analysis of your existing systems, and a deliverable with prioritised recommendations and a roadmap.'
            },
            {
                q: 'What are the signs it is time for an audit?',
                a: 'Key indicators include: KPIs that differ depending on the source, reports built manually in Excel, business teams heavily dependent on IT to access data, no CI/CD on your data pipelines, or processing times that stretch to several hours.'
            },
            {
                q: 'Does the audit include specific tool recommendations?',
                a: 'Yes, and we have no commercial partnerships with any vendors. We recommend the tools best suited to your context, budget constraints, and ambitions \u2014 not the tools on which we earn commissions.'
            },
            {
                q: 'What happens after the audit?',
                a: 'You receive the Technical Architecture Document and the roadmap. You are completely free to implement it in-house or to engage us for the next phase. If you choose to work with us, the audit fee is deducted from the project budget.'
            }
        ];
    }
}
