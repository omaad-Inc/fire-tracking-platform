import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TopbarWidget } from './topbarwidget.component';
import { FooterWidget } from './footerwidget';
import { I18nService } from '../../../i18n/i18n.service';
import { SeoService, SITE_ORIGIN } from '../../../core/services/seo.service';

const CANONICAL = `${SITE_ORIGIN}/supprimer-mon-compte`;
const PAGE_TITLE = 'Supprimer mon compte | Omaad';
const PAGE_DESC =
    'Comment supprimer votre compte Omaad et toutes vos données, depuis l\'application mobile ou le web. '
    + 'La suppression est immédiate, définitive et gratuite.';
const MAILTO =
    'mailto:contact@omaad.africa?subject=' + encodeURIComponent('Suppression de mon compte Omaad');

/**
 * Page publique de suppression de compte (FR, sans préfixe :lang, prérendue).
 * Google Play exige un chemin de suppression joignable depuis le web même si
 * la suppression existe dans l'app (voir omaad-mobile-app/store/LISTING_PACK.md).
 * Les étapes décrites doivent rester le miroir exact des écrans réels
 * (web : settings/components/account.ts ; mobile : account_screen.dart).
 */
@Component({
    selector: 'app-supprimer-mon-compte',
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
                        <i class="pi pi-user-minus text-[10px]"></i>
                        Votre compte vous appartient
                    </span>
                    <h1 class="text-3xl md:text-4xl font-bold text-surface-900 dark:text-white mb-3 tracking-tight">
                        Supprimer mon compte
                    </h1>
                    <p class="text-surface-500 dark:text-surface-400 text-sm leading-relaxed">
                        Vous pouvez supprimer votre compte Omaad et toutes vos données à tout moment,
                        gratuitement, sans avoir à nous contacter. La suppression est immédiate et définitive.
                    </p>
                </header>

                <article class="space-y-10">
                    <!-- Les deux chemins en libre-service -->
                    <section>
                        <h2 class="text-xl font-bold text-surface-900 dark:text-white mb-4">Depuis l'application, en moins d'une minute</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            @for (path of paths; track path.title) {
                                <div class="rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-5">
                                    <div class="flex items-center gap-3 mb-4">
                                        <span class="w-9 h-9 shrink-0 rounded-xl bg-ochre-100 dark:bg-ochre-500/15 text-ochre-700 dark:text-ochre-400 flex items-center justify-center">
                                            <i [class]="'pi ' + path.icon + ' text-sm'"></i>
                                        </span>
                                        <p class="text-sm font-semibold text-surface-900 dark:text-white">{{ path.title }}</p>
                                    </div>
                                    <ol class="space-y-2.5">
                                        @for (step of path.steps; track $index) {
                                            <li class="flex items-start gap-3">
                                                <span class="w-5 h-5 shrink-0 rounded-full bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-200 text-[11px] font-bold flex items-center justify-center mt-0.5">{{ $index + 1 }}</span>
                                                <p class="text-[13px] text-surface-600 dark:text-surface-400 leading-relaxed">{{ step }}</p>
                                            </li>
                                        }
                                    </ol>
                                </div>
                            }
                        </div>
                        <p class="text-[13px] text-surface-500 dark:text-surface-400 leading-relaxed mt-3">
                            Par sécurité, la confirmation vous demande de taper le mot
                            <span class="font-mono font-bold text-negative">SUPPRIMER</span> avant d'effacer quoi que ce soit.
                        </p>
                    </section>

                    <!-- Ce qui est supprimé -->
                    <section>
                        <h2 class="text-xl font-bold text-surface-900 dark:text-white mb-3">Ce qui est supprimé</h2>
                        <p class="text-surface-700 dark:text-surface-300 leading-relaxed mb-3">
                            La suppression efface votre compte et l'intégralité des données qui y sont rattachées :
                        </p>
                        <ul class="space-y-2 mb-4">
                            @for (item of deleted; track item) {
                                <li class="flex items-start gap-3">
                                    <i class="pi pi-check text-ochre-600 dark:text-ochre-400 text-xs mt-1.5 shrink-0"></i>
                                    <p class="text-surface-700 dark:text-surface-300 leading-relaxed">{{ item }}</p>
                                </li>
                            }
                        </ul>
                        <div class="rounded-2xl border border-negative/30 bg-negative/5 p-4 flex items-start gap-3">
                            <i class="pi pi-exclamation-triangle text-negative text-sm mt-0.5 shrink-0"></i>
                            <p class="text-[13px] text-surface-700 dark:text-surface-300 leading-relaxed">
                                <strong class="text-surface-900 dark:text-white">Immédiat et irréversible.</strong>
                                Il n'y a pas de délai de rétractation ni de corbeille : une fois la suppression
                                confirmée, vos données sont effacées de notre base de production et ne peuvent pas
                                être restaurées, même par notre équipe. Les copies présentes dans les sauvegardes
                                techniques disparaissent à l'expiration de celles-ci.
                            </p>
                        </div>
                    </section>

                    <!-- Export avant suppression -->
                    <section>
                        <h2 class="text-xl font-bold text-surface-900 dark:text-white mb-3">Avant de partir : emportez vos données</h2>
                        <p class="text-surface-700 dark:text-surface-300 leading-relaxed">
                            Vous pouvez exporter gratuitement toutes vos données avant de supprimer votre compte :
                            sur le web, Paramètres, puis Préférences, puis « Exporter mes données » (export complet
                            en JSON, transactions en CSV). L'export n'est plus possible une fois le compte supprimé.
                        </p>
                    </section>

                    <!-- Fallback email -->
                    <section>
                        <h2 class="text-xl font-bold text-surface-900 dark:text-white mb-3">Vous n'avez plus accès à votre compte ?</h2>
                        <p class="text-surface-700 dark:text-surface-300 leading-relaxed mb-4">
                            Si vous ne pouvez plus vous connecter (email perdu, appareil changé), envoyez-nous une
                            demande de suppression depuis l'adresse email associée à votre compte, ou en nous donnant
                            les éléments permettant de vous identifier. Nous vérifions que la demande vient bien du
                            titulaire du compte, puis nous procédons à la suppression et vous la confirmons par email,
                            sous 30 jours au plus tard.
                        </p>
                        <a [href]="mailto"
                           class="omaad-press inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-ochre-500 hover:bg-ochre-600 text-surface-950 font-semibold text-sm transition-colors no-underline">
                            <i class="pi pi-envelope text-sm"></i>
                            Demander la suppression par email
                        </a>
                        <p class="text-[13px] text-surface-500 dark:text-surface-400 leading-relaxed mt-3">
                            Ou écrivez directement à
                            <a href="mailto:contact@omaad.africa" class="text-brand-700 dark:text-ochre-400 font-semibold hover:underline">contact&#64;omaad.africa</a>
                            avec pour objet « Suppression de mon compte Omaad ».
                        </p>
                    </section>

                    <div class="rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-5">
                        <p class="text-sm font-semibold text-surface-900 dark:text-white mb-1">Pour aller plus loin</p>
                        <p class="text-[13px] text-surface-600 dark:text-surface-400 leading-relaxed">
                            Le détail des données collectées, de leur usage et de vos droits se trouve dans notre
                            <a routerLink="/confidentialite" class="text-brand-700 dark:text-ochre-400 font-semibold hover:underline">politique de confidentialité</a>.
                        </p>
                    </div>
                </article>
            </main>

            <footer-widget />
        </div>
    `
})
export class SupprimerMonComptePage implements OnDestroy {
    private i18n = inject(I18nService);
    private seo = inject(SeoService);

    readonly mailto = MAILTO;

    readonly paths = [
        {
            icon: 'pi-mobile',
            title: 'Application mobile',
            steps: [
                'Ouvrez les Réglages (votre photo de profil, en haut).',
                'Touchez « Mon compte ».',
                'Touchez « Supprimer mon compte », puis tapez SUPPRIMER pour confirmer.',
            ],
        },
        {
            icon: 'pi-desktop',
            title: 'Application web (omaad.africa)',
            steps: [
                'Connectez-vous, puis ouvrez Paramètres.',
                'Ouvrez « Mon compte » et descendez jusqu\'à la « Zone de danger ».',
                'Cliquez « Supprimer mon compte », puis tapez SUPPRIMER pour confirmer.',
            ],
        },
    ];

    readonly deleted = [
        'Votre profil : email, prénom, nom, téléphone, photo de profil, mot de passe.',
        'Tout votre patrimoine : comptes, actifs, transactions, budgets, dettes, objectifs d\'épargne, tontines, historique.',
        'Vos conversations avec l\'assistant Omaad.',
        'Vos préférences, alertes, notifications et rapports.',
        'Les appareils enregistrés pour les notifications push.',
    ];

    constructor() {
        this.i18n.setLang('fr');
        this.seo.apply({ title: PAGE_TITLE, description: PAGE_DESC, canonical: CANONICAL });
        this.seo.setJsonLd('jsonld-breadcrumb-suppression', {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Omaad', item: 'https://omaad.africa/fr/landing/' },
                { '@type': 'ListItem', position: 2, name: 'Supprimer mon compte', item: `${CANONICAL}/` },
            ],
        });
    }

    ngOnDestroy(): void {
        this.seo.removeJsonLd('jsonld-breadcrumb-suppression');
    }
}
