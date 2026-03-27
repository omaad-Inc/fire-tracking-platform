import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TopbarWidget } from './topbarwidget.component';
import { FooterWidget } from './footerwidget';

@Component({
    selector: 'app-advisory-audit',
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
                    <div class="absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full opacity-20"
                         style="background: radial-gradient(circle, #6366f1 0%, transparent 70%)"></div>
                </div>
                <div class="relative max-w-4xl mx-auto">
                    <!-- Breadcrumb -->
                    <div class="flex items-center gap-2 text-sm text-slate-500 mb-8">
                        <a [routerLink]="['/fr/advisory']" class="hover:text-indigo-400 transition-colors cursor-pointer">Advisory</a>
                        <i class="pi pi-chevron-right text-xs"></i>
                        <span class="text-slate-400">Audit & Diagnostic Data</span>
                    </div>

                    <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-400 mb-5">EXPERTISE</p>
                    <h1 class="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
                        Posez les bases d'une<br>
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                            plateforme data solide
                        </span>
                    </h1>
                    <p class="text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
                        Nous auditons votre existant et concevons une architecture moderne et sur-mesure, prête à accueillir vos futurs cas d'usage Data & IA.
                    </p>
                    <button pButton pRipple label="DISCUTER D'UN PROJET"
                            [routerLink]="['/fr/advisory']" [fragment]="'contact'"
                            class="!bg-gradient-to-r !from-indigo-600 !to-cyan-500 !border-0 !font-bold
                                   !tracking-wide !px-8 !py-3 !rounded-lg
                                   hover:!shadow-xl hover:!shadow-indigo-500/30 transition-all duration-300">
                    </button>
                </div>
            </section>

            <!-- ══════════ QUAND FAIRE APPEL ? ══════════ -->
            <section class="bg-white dark:bg-slate-900 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="mb-14">
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-500 mb-4">VOUS RECONNAISSEZ-VOUS ?</p>
                        <h2 class="text-4xl font-bold text-slate-900 dark:text-white max-w-2xl">Quand faire appel à nous ?</h2>
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

            <!-- ══════════ L'APPROCHE ══════════ -->
            <section class="bg-slate-100 dark:bg-slate-800/50 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="mb-14">
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-500 mb-4">MÉTHODE ÉPROUVÉE</p>
                        <h2 class="text-4xl font-bold text-slate-900 dark:text-white max-w-2xl">Notre approche en 4 étapes</h2>
                        <p class="text-slate-500 dark:text-slate-400 mt-4 max-w-xl text-lg">
                            Diagnostic précis, choix technologiques éclairés et mise en production rapide pour créer de la valeur dès les premiers mois.
                        </p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        @for (step of steps; track step.num) {
                            <div class="rounded-3xl bg-white dark:bg-slate-900 p-8 flex gap-6">
                                <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-bold text-lg text-white"
                                     style="background: linear-gradient(135deg, #6366f1, #06b6d4)">
                                    {{ step.num }}
                                </div>
                                <div>
                                    <h4 class="font-bold text-slate-900 dark:text-white mb-3 text-lg">{{ step.title }}</h4>
                                    <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{{ step.desc }}</p>
                                </div>
                            </div>
                        }
                    </div>
                </div>
            </section>

            <!-- ══════════ MODERN DATA PLATFORM ══════════ -->
            <section class="bg-slate-950 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="mb-14">
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-400 mb-4">ARCHITECTURE OUVERTE</p>
                        <h2 class="text-4xl font-bold text-white max-w-2xl">Passez à la Modern Data Platform</h2>
                        <p class="text-slate-400 mt-4 max-w-2xl text-lg">
                            Nous privilégions des architectures ouvertes plutôt que des stacks monolithiques. Toutes les sources sont intégrées pour produire des données fiables, sans recréer de dette à moyen terme.
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
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-500 mb-4">CE QUE VOUS GAGNEZ</p>
                        <h2 class="text-4xl font-bold text-slate-900 dark:text-white max-w-2xl">
                            Transformez vos données en atout stratégique
                        </h2>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        @for (benefit of benefits; track benefit.title) {
                            <div class="rounded-3xl bg-slate-100 dark:bg-slate-800 p-8">
                                <h4 class="font-bold text-slate-900 dark:text-white mb-3 text-lg">{{ benefit.title }}</h4>
                                <p class="text-slate-500 dark:text-slate-400 leading-relaxed">{{ benefit.desc }}</p>
                            </div>
                        }
                    </div>
                </div>
            </section>

            <!-- ══════════ LIVRABLES ══════════ -->
            <section class="bg-slate-100 dark:bg-slate-800/50 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="mb-14">
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-500 mb-4">TRANSPARENCE TOTALE</p>
                        <h2 class="text-4xl font-bold text-slate-900 dark:text-white max-w-2xl">Ce que vous recevez</h2>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        @for (deliverable of deliverables; track deliverable.title) {
                            <div class="rounded-3xl bg-white dark:bg-slate-900 p-8">
                                <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                                     [style.background]="deliverable.iconBg">
                                    <i [class]="deliverable.icon + ' text-white'"></i>
                                </div>
                                <h4 class="font-bold text-slate-900 dark:text-white mb-3">{{ deliverable.title }}</h4>
                                <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{{ deliverable.desc }}</p>
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
                        <h2 class="text-4xl font-bold text-white">Questions fréquentes</h2>
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
                    <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-400 mb-4">PRÊT À DÉMARRER ?</p>
                    <h2 class="text-4xl md:text-5xl font-bold text-white mb-6">
                        Vous avez un projet en tête ?<br>Parlons-en.
                    </h2>
                    <p class="text-slate-400 text-lg mb-10">
                        Un appel de 30 minutes suffit pour comprendre vos enjeux et évaluer comment nous pouvons vous aider.
                    </p>
                    <button pButton pRipple label="PRENDRE CONTACT AVEC UN EXPERT"
                            [routerLink]="['/fr/advisory']" [fragment]="'contact'"
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
export class AdvisoryAuditPage {
    openFaq: number | null = null;

    toggleFaq(i: number) {
        this.openFaq = this.openFaq === i ? null : i;
    }

    painPoints = [
        {
            icon: 'pi pi-database',
            iconBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            title: 'Données dispersées, qualité incertaine',
            desc: 'Vos données sont éparpillées dans de multiples systèmes. Personne ne sait vraiment quelle source est fiable ni comment elles circulent.'
        },
        {
            icon: 'pi pi-file-excel',
            iconBg: 'linear-gradient(135deg, #06b6d4, #0891b2)',
            title: 'Pilotage manuel via spreadsheets',
            desc: 'Vous produisez vos KPIs à la main dans Excel. Chaque rapport prend des heures et les chiffres divergent selon les équipes.'
        },
        {
            icon: 'pi pi-sitemap',
            iconBg: 'linear-gradient(135deg, #10b981, #059669)',
            title: 'Stack technologique mal adaptée',
            desc: 'Vos outils actuels ne répondent plus à vos besoins. La dette technique s\'accumule et freine l\'autonomie de vos équipes métier.'
        },
        {
            icon: 'pi pi-lock',
            iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
            title: 'Dépendance forte aux équipes techniques',
            desc: 'Les équipes métier ne peuvent pas accéder aux données sans passer par l\'IT. Les projets s\'accumulent dans les backlogs.'
        }
    ];

    steps = [
        {
            num: '1',
            title: 'Diagnostic de l\'existant',
            desc: 'Nous observons comment vos données circulent, sont documentées et alimentent vos KPIs. Cette étape met en évidence ce qui fonctionne et ce qui freine vos ambitions. Vous repartez avec une vision claire de l\'état réel de votre plateforme.'
        },
        {
            num: '2',
            title: 'Benchmark technologique',
            desc: 'Nous comparons plusieurs options possibles. Chaque stack est évaluée selon vos objectifs : performance, agilité, ouverture à l\'IA. Vous gagnez un regard objectif qui éclaire vos choix sans parti pris commercial.'
        },
        {
            num: '3',
            title: 'Architecture cible & scénarios',
            desc: 'Nous dessinons plusieurs trajectoires pour votre future plateforme. Chaque scénario met en balance robustesse, évolutivité et contraintes internes. Vous décidez en toute confiance du chemin qui correspond à votre organisation.'
        },
        {
            num: '4',
            title: 'Roadmap & premiers projets',
            desc: 'Nous traduisons la vision en un plan concret, pensé pour donner des résultats rapides. Les premiers projets créent de la valeur immédiatement tout en préparant le socle de long terme.'
        }
    ];

    stackLayers = [
        {
            icon: 'pi pi-arrow-right-arrow-left',
            iconBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            name: 'Ingestion',
            desc: 'Pipelines robustes qui collectent, normalisent et synchronisent vos données en continu depuis toutes les sources.',
            tools: ['Airbyte', 'Fivetran', 'Airflow', 'DLT']
        },
        {
            icon: 'pi pi-server',
            iconBg: 'linear-gradient(135deg, #06b6d4, #0891b2)',
            name: 'Stockage',
            desc: 'Architecture moderne (Warehouse, Lakehouse) qui sécurise vos données et constitue un socle durable pour toute la plateforme.',
            tools: ['Snowflake', 'BigQuery', 'Redshift', 'S3']
        },
        {
            icon: 'pi pi-code',
            iconBg: 'linear-gradient(135deg, #10b981, #059669)',
            name: 'Transformation',
            desc: 'Les données sont nettoyées, structurées et unifiées pour créer des modèles fiables, cohérents et exploitables.',
            tools: ['dbt Cloud', 'dbt Core', 'SQL', 'Python']
        },
        {
            icon: 'pi pi-cog',
            iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
            name: 'Orchestration',
            desc: 'Les flux sont automatisés et coordonnés pour garantir des traitements performants et une disponibilité maximale.',
            tools: ['Airflow', 'Dagster', 'Prefect', 'MWAA']
        },
        {
            icon: 'pi pi-chart-bar',
            iconBg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            name: 'Activation',
            desc: 'Les données deviennent actionnables : dashboards BI, analyses avancées ou modèles ML intégrés aux outils métier.',
            tools: ['Power BI', 'Metabase', 'Superset', 'Looker']
        },
        {
            icon: 'pi pi-shield',
            iconBg: 'linear-gradient(135deg, #ec4899, #db2777)',
            name: 'Observabilité & Gouvernance',
            desc: 'Qualité, sécurité et conformité assurées grâce à une surveillance continue et une traçabilité complète.',
            tools: ['Great Expectations', 'Elementary', 'dbt tests', 'DataHub']
        }
    ];

    benefits = [
        {
            title: 'Une vision enfin claire de vos données',
            desc: 'Vous savez exactement où vous en êtes et où aller. Fini les zones d\'ombre — place à une plateforme lisible, fiable et pilotable par vos équipes.'
        },
        {
            title: 'Des décisions éclairées et partagées',
            desc: 'Vos équipes métiers et IT disposent d\'un langage commun et de KPIs fiables. Les arbitrages se font plus vite et avec moins de friction.'
        },
        {
            title: 'Un temps d\'exécution réduit',
            desc: 'Grâce à une architecture pensée pour l\'efficacité, vous gagnez en rapidité à chaque nouveau projet. Les premiers résultats se mesurent en semaines.'
        },
        {
            title: 'Un socle qui prépare l\'avenir',
            desc: 'Votre plateforme est conçue pour accueillir vos évolutions : nouveaux cas d\'usage, IA/GenAI, croissance des volumes. Vous avancez avec un système pérenne.'
        }
    ];

    deliverables = [
        {
            icon: 'pi pi-file',
            iconBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            title: 'Document d\'Architecture Technique',
            desc: 'Cartographie complète de votre plateforme actuelle, identification des gaps critiques et scénarios d\'architecture cible comparés.'
        },
        {
            icon: 'pi pi-map',
            iconBg: 'linear-gradient(135deg, #06b6d4, #0891b2)',
            title: 'Feuille de route priorisée',
            desc: 'Plan d\'action court/moyen/long terme avec estimation des coûts, des délais et de l\'impact business de chaque initiative.'
        },
        {
            icon: 'pi pi-users',
            iconBg: 'linear-gradient(135deg, #10b981, #059669)',
            title: 'Restitution & ateliers',
            desc: 'Présentation exécutive de nos conclusions, ateliers de co-construction avec vos équipes techniques et métier.'
        }
    ];

    faqs = [
        {
            q: 'Quelle est la durée typique d\'un audit data ?',
            a: 'Un audit complet prend généralement 2 à 5 jours ouvrés, selon la complexité de votre infrastructure. Il inclut des entretiens avec vos équipes, l\'analyse technique de vos systèmes existants, et la restitution des recommandations avec une feuille de route priorisée.'
        },
        {
            q: 'Quels sont les signes qu\'il est temps de faire un audit ?',
            a: 'Les principaux signaux sont : des KPIs qui divergent selon les sources, des rapports produits manuellement dans Excel, une forte dépendance des équipes métier à l\'IT pour accéder aux données, l\'absence de CI/CD sur vos pipelines data, ou des temps de traitement qui dépassent plusieurs heures.'
        },
        {
            q: 'L\'audit inclut-il des recommandations d\'outils spécifiques ?',
            a: 'Oui, et nous n\'avons aucun partenariat commercial avec les éditeurs. Nous recommandons les outils les mieux adaptés à votre contexte, vos contraintes budgétaires et vos ambitions — pas les outils sur lesquels nous touchons des commissions.'
        },
        {
            q: 'Que se passe-t-il après l\'audit ?',
            a: 'Vous recevez le Document d\'Architecture Technique et la feuille de route. Vous êtes totalement libre de l\'implémenter en interne ou de nous confier la suite. Si vous choisissez de travailler avec nous, l\'audit est décompté du budget de la mission.'
        }
    ];
}
