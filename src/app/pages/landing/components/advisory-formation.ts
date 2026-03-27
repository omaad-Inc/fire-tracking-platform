import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TopbarWidget } from './topbarwidget.component';
import { FooterWidget } from './footerwidget';

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
                        <a [routerLink]="['/fr/advisory']" class="hover:text-indigo-400 transition-colors cursor-pointer">Advisory</a>
                        <i class="pi pi-chevron-right text-xs"></i>
                        <span class="text-slate-400">Formation & Transfert de Compétences</span>
                    </div>

                    <p class="text-xs font-semibold tracking-[0.2em] uppercase text-emerald-400 mb-5">EXPERTISE</p>
                    <h1 class="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
                        Formez vos équipes<br>
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                            aux réalités du terrain
                        </span>
                    </h1>
                    <p class="text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
                        Des ateliers pratiques, calibrés sur vos données et vos outils — pour que l'expertise reste en interne après notre départ.
                    </p>
                    <div class="flex flex-col sm:flex-row gap-4">
                        <button pButton pRipple label="PLANIFIER UNE FORMATION"
                                [routerLink]="['/fr/advisory']" [fragment]="'contact'"
                                class="!bg-gradient-to-r !from-emerald-600 !to-cyan-500 !border-0 !font-bold
                                       !tracking-wide !px-8 !py-3 !rounded-lg
                                       hover:!shadow-xl hover:!shadow-emerald-500/30 transition-all duration-300">
                        </button>
                        <button pButton pRipple label="VOIR LES FORMATIONS"
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
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-emerald-500 mb-4">POUR QUI ?</p>
                        <h2 class="text-4xl font-bold text-slate-900 dark:text-white max-w-2xl">
                            Des formations pensées pour votre contexte
                        </h2>
                        <p class="text-slate-500 dark:text-slate-400 mt-4 max-w-xl text-lg">
                            Que vous soyez en phase de démarrage ou de montée en maturité, nous adaptons le programme à votre niveau et à vos enjeux réels.
                        </p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        @for (audience of audiences; track audience.title) {
                            <div class="rounded-3xl bg-slate-100 dark:bg-slate-800 p-8">
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
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-emerald-500 mb-4">NOS PROGRAMMES</p>
                        <h2 class="text-4xl font-bold text-slate-900 dark:text-white max-w-2xl">Catalogue de formations</h2>
                        <p class="text-slate-500 dark:text-slate-400 mt-4 max-w-xl text-lg">
                            3 parcours intensifs sur les technologies qui font la Modern Data Stack. Chaque formation s'appuie sur vos données réelles.
                        </p>
                    </div>

                    <div class="space-y-6">
                        @for (formation of formations; track formation.title) {
                            <div class="rounded-3xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col lg:flex-row">
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
                                        FORMATION
                                    </span>
                                    <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-3">{{ formation.title }}</h3>
                                    <p class="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">{{ formation.desc }}</p>
                                    <!-- Programme -->
                                    <p class="text-xs font-bold tracking-widest uppercase text-slate-400 mb-3">AU PROGRAMME</p>
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
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-emerald-400 mb-4">COMMENT ON FORME</p>
                        <h2 class="text-4xl font-bold text-white max-w-2xl">Notre approche pédagogique</h2>
                        <p class="text-slate-400 mt-4 max-w-xl text-lg">
                            Pas de diapositives génériques. Chaque session est ancrée dans votre réalité opérationnelle.
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
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-emerald-500 mb-4">CE QUI NOUS DISTINGUE</p>
                        <h2 class="text-4xl font-bold text-slate-900 dark:text-white max-w-2xl">
                            Pas une formation générique
                        </h2>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        @for (diff of differentiators; track diff.title) {
                            <div class="rounded-3xl bg-slate-100 dark:bg-slate-800 p-8">
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
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-emerald-400 mb-4">FAQ</p>
                        <h2 class="text-4xl font-bold text-white">Questions fréquentes</h2>
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
                    <p class="text-xs font-semibold tracking-[0.2em] uppercase text-emerald-400 mb-4">PRÊT À DÉMARRER ?</p>
                    <h2 class="text-4xl md:text-5xl font-bold text-white mb-6">
                        Montez en compétences<br>avec les bons praticiens
                    </h2>
                    <p class="text-slate-400 text-lg mb-10">
                        Décrivez vos besoins — nous construisons un programme sur mesure et revenons vers vous sous 24h.
                    </p>
                    <button pButton pRipple label="PLANIFIER UNE FORMATION"
                            [routerLink]="['/fr/advisory']" [fragment]="'contact'"
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
    openFaq: number | null = null;

    toggleFaq(i: number) {
        this.openFaq = this.openFaq === i ? null : i;
    }

    scrollTo(id: string) {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    audiences = [
        {
            icon: 'pi pi-code',
            iconBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            title: 'Équipes techniques',
            desc: 'Développeurs, data engineers et architectes qui veulent maîtriser les outils de la Modern Data Stack.',
            profiles: ['Data Engineers', 'Backend Developers', 'Architectes data', 'DevOps / DataOps']
        },
        {
            icon: 'pi pi-chart-bar',
            iconBg: 'linear-gradient(135deg, #10b981, #059669)',
            title: 'Équipes analytics',
            desc: 'Data analysts et business analysts qui veulent gagner en autonomie sur les données.',
            profiles: ['Data Analysts', 'Business Analysts', 'Finance / Contrôle', 'Responsables BI']
        },
        {
            icon: 'pi pi-briefcase',
            iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
            title: 'Managers & Décideurs',
            desc: 'DSI, CDOs et directeurs qui veulent comprendre les enjeux data pour piloter leurs équipes.',
            profiles: ['DSI / CTO', 'Chief Data Officers', 'Directeurs métier', 'Responsables transformation']
        }
    ];

    formations = [
        {
            icon: 'pi pi-server',
            illustrationBg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            title: 'Data Engineering avec la Modern Data Stack',
            duration: '2 à 3 jours',
            desc: 'Formation pratique sur les outils qui font la Modern Data Stack africaine : ingestion, transformation avec dbt, orchestration avec Airflow, stockage cloud. Chaque exercice s\'appuie sur des cas réels de votre secteur.',
            modules: [
                'Architecture data moderne (Lakehouse, Warehouse)',
                'Ingestion avec Airbyte — sources hétérogènes',
                'Modélisation dbt : Bronze / Silver / Gold',
                'Tests automatisés et documentation dbt',
                'Orchestration avec Airflow : DAGs, monitoring',
                'Stockage cloud : Snowflake ou BigQuery',
                'CI/CD pour la data (GitHub Actions + dbt)',
                'Observabilité : Elementary, alertes, SLAs'
            ],
            tags: ['DATA ENGINEERING', 'dbt', 'AIRFLOW', 'SNOWFLAKE', 'PRATIQUE']
        },
        {
            icon: 'pi pi-chart-line',
            illustrationBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            title: 'Analytics & BI Self-Service',
            duration: '1 à 2 jours',
            desc: 'Atelier intensif pour rendre vos équipes analytiques totalement autonomes : création de dashboards, rédaction de requêtes SQL robustes, et bonnes pratiques pour produire des KPIs fiables.',
            modules: [
                'SQL avancé : CTEs, fenêtrage, agrégations',
                'Modélisation dimensionnelle (faits & dimensions)',
                'Création de dashboards avec Metabase ou Superset',
                'Conception de KPIs métier fiables',
                'Couche sémantique et catalogue de métriques',
                'Self-service BI : gouvernance et accès contrôlés'
            ],
            tags: ['ANALYTICS', 'SQL', 'BI', 'DASHBOARDS', 'SELF-SERVICE']
        },
        {
            icon: 'pi pi-sparkles',
            illustrationBg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            title: 'IA & LLMs en production',
            duration: '2 à 3 jours',
            desc: 'Formation pratique sur l\'intégration de l\'IA dans vos pipelines data : RAG, agents LLMs, fine-tuning et bonnes pratiques pour passer du POC à la production de façon fiable.',
            modules: [
                'Fondamentaux LLMs : architecture, tokens, prompting',
                'RAG (Retrieval-Augmented Generation) avec vos données',
                'Agents IA : orchestration, outils, mémoire',
                'Évaluation et monitoring des modèles en prod',
                'Pipelines data AI-ready : vectorisation, embeddings',
                'Gouvernance et sécurité des données dans un contexte IA',
                'Cas pratiques : chatbot sur vos documents, scoring, NLP'
            ],
            tags: ['IA', 'LLMs', 'RAG', 'AGENTS', 'PYTHON', 'PRODUCTION']
        }
    ];

    pedagogy = [
        {
            icon: 'pi pi-database',
            iconBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            title: 'Vos données, pas des exemples fictifs',
            desc: 'Chaque exercice pratique s\'appuie sur vos données réelles ou des jeux de données représentatifs de votre secteur. Ce que vous apprenez le matin, vous pouvez l\'appliquer l\'après-midi.'
        },
        {
            icon: 'pi pi-users',
            iconBg: 'linear-gradient(135deg, #10b981, #059669)',
            title: 'Sessions en petit groupe (max 8)',
            desc: 'Pas d\'amphithéâtre. Des sessions limitées à 8 participants pour garantir une attention individuelle, des échanges riches et un rythme adapté au niveau de chaque apprenant.'
        },
        {
            icon: 'pi pi-book',
            iconBg: 'linear-gradient(135deg, #06b6d4, #0891b2)',
            title: 'Ressources complètes remises',
            desc: 'À l\'issue de chaque formation : slides annotées, notebooks Jupyter, scripts réutilisables, bibliothèque de requêtes SQL type et accès à un espace de ressources en ligne.'
        },
        {
            icon: 'pi pi-headphones',
            iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
            title: 'Support post-formation (30 jours)',
            desc: 'Un canal Slack dédié pendant 30 jours pour poser vos questions, débloquer des cas concrets rencontrés sur votre propre stack et solidifier les apprentissages.'
        }
    ];

    differentiators = [
        {
            icon: 'pi pi-globe',
            iconBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            title: 'Formateurs praticiens',
            desc: 'Nos formateurs deployent ces outils en production tous les jours. Ils connaissent les pièges réels, les workarounds qui fonctionnent, et les contextes africains où ces solutions ont été mises en œuvre.'
        },
        {
            icon: 'pi pi-wrench',
            iconBg: 'linear-gradient(135deg, #10b981, #059669)',
            title: 'Programme sur mesure',
            desc: 'Le catalogue est un point de départ. Chaque formation est ajustée selon le niveau actuel de vos équipes, vos outils en production, et les cas d\'usage que vous voulez adresser en priorité.'
        },
        {
            icon: 'pi pi-chart-line',
            iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
            title: 'Autonomie durable',
            desc: 'Notre objectif n\'est pas de créer une dépendance. Chaque formation vise l\'autonomie complète de vos équipes sur les sujets couverts, avec les ressources pour continuer à progresser seuls.'
        }
    ];

    faqs = [
        {
            q: 'Les formations sont-elles dispensées en français ?',
            a: 'Oui, toutes nos formations sont dispensées en français. Les ressources techniques (documentation, code) sont en anglais car c\'est la langue de la communauté open-source, mais les explications, exercices et échanges se font en français.'
        },
        {
            q: 'Quel niveau prérequis pour les formations techniques ?',
            a: 'Pour les formations Data Engineering et IA : niveau intermédiaire recommandé (SQL courant, notions de Python, expérience avec des bases de données). Pour Analytics & BI : connaissance de base de SQL suffisante. Nous évaluons le niveau de vos équipes en amont pour adapter le programme.'
        },
        {
            q: 'Peut-on former toute une équipe en même temps ?',
            a: 'Oui. Nous recommandons des groupes de 4 à 8 personnes pour maximiser l\'impact. Au-delà, nous organisons plusieurs sessions. Pour les grandes équipes (20+), nous proposons un format "formation de formateurs" pour que quelques experts internes puissent ensuite diffuser les connaissances.'
        },
        {
            q: 'Les formations sont-elles disponibles en distanciel ?',
            a: 'Oui, en présentiel (Dakar et déplacement possible sur d\'autres villes) ou en distanciel via Zoom/Google Meet. Nous recommandons le présentiel pour les formations pratiques longues (2-3 jours) car les échanges informels sont très précieux, mais le distanciel est efficace pour les sessions courtes ou de suivi.'
        }
    ];
}
