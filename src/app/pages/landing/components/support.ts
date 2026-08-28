import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TopbarWidget } from './topbarwidget.component';
import { FooterWidget } from './footerwidget';
import { I18nService } from '../../../i18n/i18n.service';
import { SeoService, SITE_ORIGIN } from '../../../core/services/seo.service';

const CANONICAL = `${SITE_ORIGIN}/support`;
const PAGE_TITLE = 'Support | Omaad';
const PAGE_DESC =
    'Besoin d\'aide avec Omaad ? Contactez-nous à contact@omaad.africa, consultez la FAQ, '
    + 'ou retrouvez les pages confidentialité et suppression de compte.';

/**
 * Page support publique (FR, sans préfixe :lang, prérendue). C'est la
 * "Support URL" exigée par App Store Connect (et utile sur la fiche Play) :
 * elle doit rester joignable sans compte et donner un vrai canal de contact.
 * Voir omaad-mobile-app/store/APP_STORE_RUNBOOK.md.
 */
@Component({
    selector: 'app-support',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, RouterModule, TopbarWidget, FooterWidget],
    template: `
        <div class="bg-surface-0 dark:bg-surface-950 min-h-screen">
            <div class="fixed top-0 left-0 right-0 z-50 bg-surface-0/80 dark:bg-surface-950/80 backdrop-blur-lg border-b border-surface-200/50 dark:border-surface-700/50"
                 style="padding-top: env(safe-area-inset-top, 0px)">
                <topbar-widget class="py-4 px-6 mx-0 md:mx-12 lg:mx-20 lg:px-20 flex items-center justify-between relative lg:static" />
            </div>

            <main class="pt-32 pb-24 px-6 md:px-12 lg:px-20 max-w-3xl mx-auto">
                <header class="mb-10">
                    <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 text-xs font-semibold uppercase tracking-wider mb-4">
                        <i class="pi pi-headphones text-[10px]"></i>
                        Support
                    </span>
                    <h1 class="text-3xl md:text-4xl font-bold text-surface-900 dark:text-white mb-3 tracking-tight">
                        Besoin d'aide ?
                    </h1>
                    <p class="text-surface-500 dark:text-surface-400 text-sm leading-relaxed">
                        Une question sur l'application, votre compte ou vos données ? Nous sommes une petite
                        équipe et nous lisons chaque message.
                    </p>
                </header>

                <article class="space-y-10">
                    <!-- Contact direct -->
                    <section>
                        <div class="rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-6">
                            <div class="flex items-start gap-4">
                                <span class="w-11 h-11 shrink-0 rounded-2xl bg-ochre-100 dark:bg-ochre-500/15 text-ochre-700 dark:text-ochre-400 flex items-center justify-center">
                                    <i class="pi pi-envelope"></i>
                                </span>
                                <div class="min-w-0">
                                    <h2 class="text-lg font-bold text-surface-900 dark:text-white mb-1">Écrivez-nous</h2>
                                    <p class="text-[13px] text-surface-600 dark:text-surface-400 leading-relaxed mb-4">
                                        Pour toute demande : aide sur l'application, question sur une fonctionnalité,
                                        signalement d'un problème, ou exercice de vos droits sur vos données.
                                        Nous répondons généralement sous 48 heures ouvrées.
                                    </p>
                                    <a href="mailto:contact@omaad.africa?subject=Support%20Omaad"
                                       class="omaad-press inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-ochre-500 hover:bg-ochre-600 text-surface-950 font-semibold text-sm transition-colors no-underline">
                                        <i class="pi pi-send text-sm"></i>
                                        contact&#64;omaad.africa
                                    </a>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- Réponses immédiates -->
                    <section>
                        <h2 class="text-xl font-bold text-surface-900 dark:text-white mb-4">Réponses immédiates</h2>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            @for (link of quickLinks; track link.title) {
                                <a [routerLink]="link.route"
                                   class="rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-4 flex items-start gap-3 no-underline hover:border-ochre-400 dark:hover:border-ochre-500/50 transition-colors omaad-press">
                                    <span class="w-9 h-9 shrink-0 rounded-xl bg-ochre-100 dark:bg-ochre-500/15 text-ochre-700 dark:text-ochre-400 flex items-center justify-center">
                                        <i [class]="'pi ' + link.icon + ' text-sm'"></i>
                                    </span>
                                    <span class="min-w-0">
                                        <span class="block text-sm font-semibold text-surface-900 dark:text-white">{{ link.title }}</span>
                                        <span class="block text-[13px] text-surface-500 dark:text-surface-400 leading-snug mt-0.5">{{ link.body }}</span>
                                    </span>
                                </a>
                            }
                        </div>
                    </section>

                    <!-- Bien nous écrire -->
                    <section>
                        <h2 class="text-xl font-bold text-surface-900 dark:text-white mb-3">Pour un signalement efficace</h2>
                        <p class="text-surface-700 dark:text-surface-300 leading-relaxed mb-3">
                            Si vous signalez un problème dans l'application, ces trois détails nous font gagner
                            un aller-retour :
                        </p>
                        <ul class="space-y-2">
                            <li class="flex items-start gap-3">
                                <i class="pi pi-check text-ochre-600 dark:text-ochre-400 text-xs mt-1.5 shrink-0"></i>
                                <p class="text-surface-700 dark:text-surface-300 leading-relaxed">L'écran concerné et ce que vous tentiez de faire.</p>
                            </li>
                            <li class="flex items-start gap-3">
                                <i class="pi pi-check text-ochre-600 dark:text-ochre-400 text-xs mt-1.5 shrink-0"></i>
                                <p class="text-surface-700 dark:text-surface-300 leading-relaxed">Votre appareil (iPhone, Android, navigateur) et, si possible, une capture d'écran.</p>
                            </li>
                            <li class="flex items-start gap-3">
                                <i class="pi pi-check text-ochre-600 dark:text-ochre-400 text-xs mt-1.5 shrink-0"></i>
                                <p class="text-surface-700 dark:text-surface-300 leading-relaxed">L'email de votre compte Omaad (jamais votre mot de passe : nous ne le demandons jamais).</p>
                            </li>
                        </ul>
                    </section>

                    <div class="rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-5 text-sm leading-relaxed">
                        <p class="text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2">Éditeur</p>
                        <p class="text-surface-600 dark:text-surface-400">
                            OMAAD, SASU · VDN, Cité Sipres 2, Villa 271, Dakar, Sénégal ·
                            <a href="mailto:contact@omaad.africa" class="text-brand-700 dark:text-ochre-400 font-semibold hover:underline">contact&#64;omaad.africa</a>
                        </p>
                    </div>
                </article>
            </main>

            <footer-widget />
        </div>
    `
})
export class SupportPage implements OnDestroy {
    private i18n = inject(I18nService);
    private seo = inject(SeoService);

    readonly quickLinks = [
        {
            icon: 'pi-question-circle',
            title: 'Questions fréquentes',
            body: 'Sécurité, devises, fonctionnement : les réponses aux questions les plus posées.',
            route: '/fr/faq',
        },
        {
            icon: 'pi-shield',
            title: 'Politique de confidentialité',
            body: 'Ce que nous collectons, pourquoi, avec qui, et vos droits.',
            route: '/confidentialite',
        },
        {
            icon: 'pi-user-minus',
            title: 'Supprimer mon compte',
            body: 'La suppression immédiate et définitive, depuis l\'app ou par email.',
            route: '/supprimer-mon-compte',
        },
        {
            icon: 'pi-book',
            title: 'Le blog Omaad',
            body: 'Guides et méthode pour construire votre patrimoine en Afrique de l\'Ouest.',
            route: '/fr/blog',
        },
    ];

    constructor() {
        this.i18n.setLang('fr');
        this.seo.apply({ title: PAGE_TITLE, description: PAGE_DESC, canonical: CANONICAL });
        this.seo.setJsonLd('jsonld-breadcrumb-support', {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Omaad', item: 'https://omaad.africa/fr/landing/' },
                { '@type': 'ListItem', position: 2, name: 'Support', item: `${CANONICAL}/` },
            ],
        });
    }

    ngOnDestroy(): void {
        this.seo.removeJsonLd('jsonld-breadcrumb-support');
    }
}
