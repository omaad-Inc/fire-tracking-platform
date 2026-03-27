import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TopbarWidget } from './topbarwidget.component';
import { FooterWidget } from './footerwidget';

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
                        <a [routerLink]="['/fr/advisory']" class="hover:text-indigo-400 transition-colors cursor-pointer">Advisory</a>
                        <i class="pi pi-chevron-right text-xs"></i>
                        <span class="text-slate-400">Mission Data Engineering / IA</span>
                    </div>

                    <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-400 mb-5">EXPERTISE</p>
                    <h1 class="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
                        Transformez vos données<br>
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                            en produits concrets
                        </span>
                    </h1>
                    <p class="text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
                        Pipelines data, plateformes cloud, modèles IA en production — nous concevons et déployons des solutions robustes qui génèrent un véritable impact business.
                    </p>
                    <div class="flex flex-col sm:flex-row gap-4">
                        <button pButton pRipple label="DISCUTER D'UN PROJET"
                                [routerLink]="['/fr/advisory']" [fragment]="'contact'"
                                class="!bg-gradient-to-r !from-indigo-600 !to-cyan-500 !border-0 !font-bold
                                       !tracking-wide !px-8 !py-3 !rounded-lg
                                       hover:!shadow-xl hover:!shadow-indigo-500/30 transition-all duration-300">
                        </button>
                        <button pButton pRipple label="VOIR NOTRE APPROCHE"
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

            <!-- ══════════ CAS D'USAGES ══════════ -->
            <section class="bg-slate-100 dark:bg-slate-800/50 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="mb-14">
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-500 mb-4">CE QUE NOUS CONSTRUISONS</p>
                        <h2 class="text-4xl font-bold text-slate-900 dark:text-white max-w-2xl">Nos cas d'usages</h2>
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
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-400 mb-4">AVANT / APRÈS</p>
                        <h2 class="text-4xl font-bold text-white">Débloquez le potentiel de vos données</h2>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Avant -->
                        <div class="rounded-3xl bg-white/5 border border-white/10 p-8">
                            <div class="flex items-center gap-3 mb-6">
                                <div class="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
                                    <i class="pi pi-times text-rose-400 text-sm"></i>
                                </div>
                                <h4 class="font-bold text-white text-lg">Avant</h4>
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
                                <h4 class="font-bold text-white text-lg">Après notre intervention</h4>
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

            <!-- ══════════ MÉTHODOLOGIE 5 PHASES (from construire-ou-moderniser) ══════════ -->
            <section id="approche" class="bg-white dark:bg-slate-900 py-24 px-6 lg:px-20">
                <div class="max-w-6xl mx-auto">
                    <div class="mb-14">
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-500 mb-4">MÉTHODE STRUCTURÉE</p>
                        <h2 class="text-4xl font-bold text-slate-900 dark:text-white max-w-2xl">
                            5 phases pour construire votre plateforme data
                        </h2>
                        <p class="text-slate-500 dark:text-slate-400 mt-4 max-w-2xl text-lg">
                            Du diagnostic express aux premiers cas d'usage, jusqu'à une plateforme prête pour l'IA — une approche qui transforme votre vision en résultats tangibles.
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
                                        <p class="text-xs font-bold tracking-widest uppercase text-slate-400 mb-3">Livrables</p>
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
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-400 mb-4">ARCHITECTURE OUVERTE</p>
                        <h2 class="text-4xl font-bold text-white max-w-2xl">Passez à la Modern Data Platform</h2>
                        <p class="text-slate-400 mt-4 max-w-2xl text-lg">
                            Architectures ouvertes, sans lock-in vendor. Toutes les sources intégrées pour produire des données fiables, des dashboards BI aux modèles IA.
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
                        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-500 mb-4">CE QUE VOUS GAGNEZ</p>
                        <h2 class="text-4xl font-bold text-slate-900 dark:text-white max-w-2xl">Un impact business mesurable</h2>
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
                        Construisons ensemble<br>vos produits data
                    </h2>
                    <p class="text-slate-400 text-lg mb-10">
                        Échangez avec un expert et découvrez comment transformer vos données en produits concrets.
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
export class AdvisoryMissionPage {
    openFaq: number | null = null;

    toggleFaq(i: number) {
        this.openFaq = this.openFaq === i ? null : i;
    }

    scrollTo(id: string) {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    painPoints = [
        {
            icon: 'pi pi-chart-line',
            iconBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            title: 'Décisions sans données fiables',
            desc: 'Vos équipes métier prennent des décisions basées sur des rapports manuels ou des exports Excel contradictoires. La donnée n\'est pas encore un atout stratégique.'
        },
        {
            icon: 'pi pi-bolt',
            iconBg: 'linear-gradient(135deg, #06b6d4, #0891b2)',
            title: 'Vous voulez intégrer l\'IA à vos processus',
            desc: 'Agents IA, automatisation, copilotes — vous voyez le potentiel mais vous n\'avez pas encore l\'infrastructure data qui le rend possible.'
        },
        {
            icon: 'pi pi-box',
            iconBg: 'linear-gradient(135deg, #10b981, #059669)',
            title: 'Un produit data à construire',
            desc: 'Dashboard opérationnel, API data, application analytique — vous avez le besoin métier mais pas les ressources internes pour le déployer industriellement.'
        },
        {
            icon: 'pi pi-sitemap',
            iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
            title: 'Sources de données à centraliser',
            desc: 'ERP, CRM, API tierces, bases SQL — vos données sont partout et personne ne les a encore unifiées dans une source de vérité unique.'
        }
    ];

    usecases = [
        {
            icon: 'pi pi-play',
            illustrationBg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            title: 'Construction d\'un premier POC data',
            desc: 'Nous vous accompagnons pour poser les bases de votre stack data modulaire et construire vos premiers cas d\'usages rapidement.',
            tags: ['BI', 'ANALYTICS', 'REPORTING', 'DASHBOARDS']
        },
        {
            icon: 'pi pi-server',
            illustrationBg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            title: 'Modernisation de votre Data Platform',
            desc: 'Mise à niveau de votre plateforme data pour réduire votre time-to-insight, fiabiliser vos données et scaler avec vos besoins.',
            tags: ['DATA ENGINEERING', 'PIPELINES', 'TIME-TO-INSIGHTS', 'SELF-SERVICE']
        },
        {
            icon: 'pi pi-sparkles',
            illustrationBg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            title: 'Intégration de briques IA & GenAI',
            desc: 'Nous construisons l\'infrastructure data adaptée pour déployer vos modèles IA et GenAI en production de manière fiable.',
            tags: ['GENAI', 'LLMs', 'RAG', 'AGENTIC AI']
        },
        {
            icon: 'pi pi-shield',
            illustrationBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            title: 'DataOps & Gouvernance',
            desc: 'Structurez vos workflows data pour un delivery fiable, documenté et automatisé avec CI/CD, tests et observabilité.',
            tags: ['GOUVERNANCE', 'DATAOPS', 'CI/CD', 'OBSERVABILITÉ']
        },
        {
            icon: 'pi pi-chart-bar',
            illustrationBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            title: 'Développement de produits data & analytics',
            desc: 'Dashboards, copilotes IA, APIs analytiques — nous concevons des produits data robustes qui génèrent un impact business mesurable.',
            tags: ['BI', 'ANALYTICS', 'SELF-SERVICE', 'API DATA']
        }
    ];

    beforeItems = [
        'Délais importants dans la production de KPIs',
        'Dette technique et dépendance au legacy',
        'Exports Excel et traitements manuels à répétition',
        'Équipes métier dépendantes de l\'IT pour accéder aux données',
        'Gouvernance faible, qualité de la donnée discutable'
    ];

    afterItems = [
        'Réduction du time-to-KPI jusqu\'à 90%',
        'Plateforme cloud-native, maintenable et évolutive',
        'Automatisation des pipelines et cas d\'usage',
        'Autonomisation des métiers avec du self-service BI',
        'Source de vérité unique et traçabilité garantie'
    ];

    phases = [
        {
            num: '1',
            color: '#6366f1',
            iconBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            title: 'Audit & Cartographie',
            summary: 'Analyser votre contexte et contraintes pour concevoir la stack optimale.',
            desc: 'Ateliers avec vos équipes, cartographie de l\'existant, benchmark des outils disponibles sur le marché, proposition de 2-3 scénarios d\'architecture avec analyse coûts/bénéfices.',
            deliverables: [
                'Synthèse des besoins et contraintes (RGPD, budget, volumétrie)',
                'Benchmark comparatif des outils par brique fonctionnelle',
                'Scénarios d\'architecture avec recommandation de stack cible'
            ]
        },
        {
            num: '2',
            color: '#06b6d4',
            iconBg: 'linear-gradient(135deg, #06b6d4, #0891b2)',
            title: 'Architecture Cible & Plan de Migration',
            summary: 'Définir une architecture moderne adaptée à vos besoins actuels et futurs.',
            desc: 'Conception de l\'architecture cible, sélection des outils, définition d\'un plan de migration progressif pour limiter les interruptions de service.',
            deliverables: [
                'Architecture technique détaillée (diagramme HLA/HLD)',
                'Schéma des flux cibles (sources, transformations, destinations)',
                'Plan de migration détaillé avec jalons et minimisation des risques'
            ]
        },
        {
            num: '3',
            color: '#10b981',
            iconBg: 'linear-gradient(135deg, #10b981, #059669)',
            title: 'Mise en place du socle (MVP)',
            summary: 'Construction du socle Data Platform sur votre environnement Cloud ou On-Premise.',
            desc: 'Déploiement du data warehouse/lakehouse, premiers pipelines et dashboards opérationnels avec pratiques DataOps (CI/CD, tests, monitoring) dès le départ.',
            deliverables: [
                'Data warehouse/lakehouse déployé et opérationnel',
                'Pipelines d\'ingestion et de transformation fonctionnels',
                'Premiers dashboards en production avec documentation technique'
            ]
        },
        {
            num: '4',
            color: '#f59e0b',
            iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
            title: 'Industrialisation & Gouvernance',
            summary: 'Finaliser la migration et mettre en place la gouvernance data.',
            desc: 'Migration des flux et données restants, tests de continuité de service, décommissionnement des anciens systèmes, mise en place des règles de gouvernance.',
            deliverables: [
                'Migration complète des flux et données',
                'Tests de continuité et validation des performances',
                'Décommissionnement sécurisé des anciens systèmes legacy'
            ]
        },
        {
            num: '5',
            color: '#8b5cf6',
            iconBg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            title: 'Adoption & Roadmap d\'Extension',
            summary: 'Assurer l\'adoption par vos équipes et préparer les prochaines étapes.',
            desc: 'Formation des équipes, mesure de l\'impact métier, construction de la roadmap d\'extension pour les prochains cas d\'usage (Analytics avancés, IA/ML).',
            deliverables: [
                'Kit d\'adoption (supports de formation, documentation utilisateurs)',
                'Rapport d\'impact métier et technique mesuré',
                'Roadmap d\'extension validée (nouveaux cas d\'usage, IA/ML)'
            ]
        }
    ];

    stackLayers = [
        {
            icon: 'pi pi-arrow-right-arrow-left',
            iconBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            name: 'Ingestion',
            desc: 'Pipelines robustes collectant et synchronisant vos données depuis toutes les sources en continu.',
            tools: ['Airbyte', 'Fivetran', 'DLT', 'Python']
        },
        {
            icon: 'pi pi-server',
            iconBg: 'linear-gradient(135deg, #06b6d4, #0891b2)',
            name: 'Stockage',
            desc: 'Architecture moderne (Warehouse, Lakehouse) constituant un socle durable pour toute la plateforme.',
            tools: ['Snowflake', 'BigQuery', 'Databricks', 'Redshift']
        },
        {
            icon: 'pi pi-code',
            iconBg: 'linear-gradient(135deg, #10b981, #059669)',
            name: 'Transformation',
            desc: 'Modèles Bronze/Silver/Gold — données nettoyées, structurées et documentées automatiquement.',
            tools: ['dbt Cloud', 'dbt Core', 'SQL', 'Python']
        },
        {
            icon: 'pi pi-cog',
            iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
            name: 'Orchestration',
            desc: 'Workflows automatisés et coordonnés pour des traitements performants et une disponibilité maximale.',
            tools: ['Airflow', 'Dagster', 'Prefect', 'MWAA']
        },
        {
            icon: 'pi pi-chart-bar',
            iconBg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            name: 'Activation',
            desc: 'Dashboards BI, analyses avancées, APIs data et modèles ML directement intégrés aux outils métier.',
            tools: ['Power BI', 'Looker', 'Metabase', 'Superset']
        },
        {
            icon: 'pi pi-shield',
            iconBg: 'linear-gradient(135deg, #ec4899, #db2777)',
            name: 'Observabilité & Gouvernance',
            desc: 'Surveillance continue, traçabilité complète, tests automatisés et conformité assurés en permanence.',
            tools: ['Prometheus', 'Elementary', 'Soda', 'DataHub']
        }
    ];

    benefits = [
        {
            icon: 'pi pi-bolt',
            iconBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            title: 'Time-to-value réduit',
            desc: 'Déploiement de vos projets clés en quelques semaines, pas en plusieurs mois. Les premiers résultats arrivent rapidement et créent de la confiance en interne.'
        },
        {
            icon: 'pi pi-chart-line',
            iconBg: 'linear-gradient(135deg, #06b6d4, #0891b2)',
            title: 'Évolutivité garantie',
            desc: 'Une architecture pensée pour scaler avec vos besoins. Vos volumes x10, vos nouveaux cas d\'usage, votre croissance — la plateforme suit sans refonte majeure.'
        },
        {
            icon: 'pi pi-users',
            iconBg: 'linear-gradient(135deg, #10b981, #059669)',
            title: 'Adoption par vos équipes',
            desc: 'Des produits conçus avec et pour vos équipes métier. Formation incluse pour garantir que la technologie serve les usages — et non l\'inverse.'
        },
        {
            icon: 'pi pi-star',
            iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
            title: 'Impact business mesurable',
            desc: 'Chaque projet répond à un besoin métier précis. Nous définissons en amont les KPIs de succès et nous mesurons l\'impact réel de nos interventions.'
        }
    ];

    faqs = [
        {
            q: 'Quelle est la durée typique d\'une mission Data Engineering ?',
            a: 'Une mission s\'étend généralement de 1 à 6 mois selon la complexité. Un POC ou un audit peut démarrer en quelques jours. La construction complète d\'une data platform prend 3 à 6 mois. Nous découpons systématiquement en phases pour livrer de la valeur rapidement et itérer.'
        },
        {
            q: 'Comment fiabilisez-vous les indicateurs métier ?',
            a: 'Nous centralisons les calculs dans un Data Warehouse unique, modélisons en couches Bronze/Silver/Gold, documentons automatiquement via dbt docs, et mettons en place des tests automatisés sur chaque transformation. Résultat : une source de vérité unique, partagée et traçable par toutes les équipes.'
        },
        {
            q: 'Quels outils et technologies utilisez-vous ?',
            a: 'Notre stack inclut : Airflow/Dagster/Prefect (orchestration), Airbyte/Fivetran/DLT (ingestion), Snowflake/BigQuery/Databricks (stockage), dbt Cloud/Core (transformation), Power BI/Metabase/Superset (visualisation), Prometheus/Grafana/Elementary (observabilité). Nous n\'avons pas de partenariat commercial — nous recommandons les outils les mieux adaptés à votre contexte.'
        },
        {
            q: 'Pouvez-vous migrer une infrastructure on-premise vers le cloud sans interruption ?',
            a: 'Oui. Nous déployons la nouvelle infrastructure cloud en parallèle de l\'existant, migrons les flux par vagues successives en commençant par les non-critiques, effectuons des tests de régression automatisés à chaque étape, puis basculons les flux critiques progressivement avant de décommissionner le legacy.'
        }
    ];
}
