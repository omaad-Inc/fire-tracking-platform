import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TopbarWidget } from './topbarwidget.component';
import { FooterWidget } from './footerwidget';
import { I18nService } from '../../../i18n/i18n.service';
import { SeoService, SITE_ORIGIN } from '../../../core/services/seo.service';

const CANONICAL = `${SITE_ORIGIN}/confidentialite`;
const PAGE_TITLE = 'Politique de confidentialité | Omaad';
const PAGE_DESC =
    'Ce qu\'Omaad collecte, pourquoi, avec qui, et vos droits : export, suppression immédiate, ' +
    'aucune vente de données, aucune publicité. La politique de confidentialité complète du service Omaad.';

/**
 * Politique de confidentialité publique (FR, sans préfixe :lang, prérendue).
 * URL exigée par le Play Store (voir omaad-mobile-app/store/LISTING_PACK.md) :
 * le contenu doit rester aligné sur le formulaire Data Safety de la fiche.
 * Remplace l'ancienne page /:lang/legal/privacy (301 dans public/_redirects).
 */
@Component({
    selector: 'app-confidentialite',
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
                        <i class="pi pi-shield text-[10px]"></i>
                        Vie privée
                    </span>
                    <h1 class="text-3xl md:text-4xl font-bold text-surface-900 dark:text-white mb-3 tracking-tight">
                        Politique de confidentialité
                    </h1>
                    <p class="text-surface-500 dark:text-surface-400 text-sm leading-relaxed">
                        Dernière mise à jour : {{ updated }}. Cette politique s'applique au site omaad.africa,
                        à l'application web et à l'application mobile Omaad.
                    </p>
                </header>

                <!-- L'essentiel : les quatre engagements, avant le texte long. -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-12">
                    @for (pledge of pledges; track pledge.title) {
                        <div class="rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-4 flex items-start gap-3">
                            <span class="w-9 h-9 shrink-0 rounded-xl bg-ochre-100 dark:bg-ochre-500/15 text-ochre-700 dark:text-ochre-400 flex items-center justify-center">
                                <i [class]="'pi ' + pledge.icon + ' text-sm'"></i>
                            </span>
                            <div>
                                <p class="text-sm font-semibold text-surface-900 dark:text-white">{{ pledge.title }}</p>
                                <p class="text-[13px] text-surface-500 dark:text-surface-400 leading-snug mt-0.5">{{ pledge.body }}</p>
                            </div>
                        </div>
                    }
                </div>

                <article class="space-y-10">
                    <section>
                        <h2 class="text-xl font-bold text-surface-900 dark:text-white mb-3">1. Qui est responsable de vos données</h2>
                        <p class="text-surface-700 dark:text-surface-300 leading-relaxed mb-4">
                            Le service Omaad est édité par <strong>OMAAD</strong>, société par actions simplifiée unipersonnelle
                            (SASU) de droit sénégalais, qui est le responsable du traitement de vos données personnelles.
                        </p>
                        <div class="rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-5 text-sm leading-relaxed">
                            <p class="text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2">Entité légale</p>
                            <p class="font-semibold text-surface-900 dark:text-white">OMAAD, SASU</p>
                            <p class="text-surface-600 dark:text-surface-400">RCCM : SN.DKR.2026.B.32060 · NINEA : 013316006</p>
                            <p class="text-surface-600 dark:text-surface-400">VDN, Cité Sipres 2, Villa 271, Dakar, Sénégal</p>
                            <p class="text-surface-600 dark:text-surface-400">
                                Contact : <a href="mailto:contact@omaad.africa" class="text-brand-700 dark:text-ochre-400 font-semibold hover:underline">contact&#64;omaad.africa</a>
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 class="text-xl font-bold text-surface-900 dark:text-white mb-3">2. Les données que nous collectons</h2>
                        <p class="text-surface-700 dark:text-surface-300 leading-relaxed mb-3">
                            Nous collectons uniquement ce dont le service a besoin pour fonctionner :
                        </p>
                        <ul class="space-y-3">
                            @for (item of collected; track item.label) {
                                <li class="flex items-start gap-3">
                                    <i class="pi pi-circle-fill text-[6px] text-ochre-500 mt-2 shrink-0"></i>
                                    <p class="text-surface-700 dark:text-surface-300 leading-relaxed">
                                        <strong class="text-surface-900 dark:text-white">{{ item.label }}</strong> : {{ item.body }}
                                    </p>
                                </li>
                            }
                        </ul>
                        <p class="text-surface-700 dark:text-surface-300 leading-relaxed mt-4">
                            Omaad ne se connecte pas à vos comptes bancaires ni à vos portefeuilles mobile money :
                            vos données financières existent uniquement parce que vous les saisissez.
                        </p>
                    </section>

                    <section>
                        <h2 class="text-xl font-bold text-surface-900 dark:text-white mb-3">3. Ce que nous ne collectons pas</h2>
                        <p class="text-surface-700 dark:text-surface-300 leading-relaxed">
                            Pas de localisation, pas d'accès à vos contacts, à vos SMS, à vos appels, à vos fichiers
                            (au delà de la photo de profil que vous choisissez) ni à votre historique de navigation.
                            Aucun cookie publicitaire, aucun traceur tiers, aucune régie publicitaire : Omaad ne
                            diffuse pas de publicité. Notre mesure d'audience est réalisée par nos propres serveurs,
                            sans outil d'analytics tiers.
                        </p>
                    </section>

                    <section>
                        <h2 class="text-xl font-bold text-surface-900 dark:text-white mb-3">4. Pourquoi nous les utilisons</h2>
                        <ul class="space-y-2">
                            @for (purpose of purposes; track purpose) {
                                <li class="flex items-start gap-3">
                                    <i class="pi pi-check text-ochre-600 dark:text-ochre-400 text-xs mt-1.5 shrink-0"></i>
                                    <p class="text-surface-700 dark:text-surface-300 leading-relaxed">{{ purpose }}</p>
                                </li>
                            }
                        </ul>
                    </section>

                    <section>
                        <h2 class="text-xl font-bold text-surface-900 dark:text-white mb-3">5. Avec qui vos données sont partagées</h2>
                        <p class="text-surface-700 dark:text-surface-300 leading-relaxed mb-4">
                            <strong class="text-surface-900 dark:text-white">Nous ne vendons ni ne louons jamais vos données</strong>,
                            et nous ne les partageons avec personne à des fins publicitaires ou commerciales.
                            Trois prestataires reçoivent une catégorie précise de données, chacun pour une seule finalité :
                        </p>
                        <div class="space-y-3 mb-4">
                            @for (proc of processors; track proc.name) {
                                <div class="rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-4">
                                    <div class="flex items-center justify-between gap-3 mb-1">
                                        <p class="text-sm font-semibold text-surface-900 dark:text-white">{{ proc.name }}</p>
                                        <span class="text-[11px] font-semibold uppercase tracking-wider text-ochre-700 dark:text-ochre-400">{{ proc.role }}</span>
                                    </div>
                                    <p class="text-[13px] text-surface-600 dark:text-surface-400 leading-relaxed">{{ proc.body }}</p>
                                </div>
                            }
                        </div>
                        <p class="text-surface-700 dark:text-surface-300 leading-relaxed">
                            Pour faire fonctionner le service, nous utilisons aussi des prestataires techniques :
                            hébergement du site, de l'application et de la base de données (Netlify, Render, Supabase),
                            envoi des emails transactionnels (Resend), envoi du code de connexion par SMS si vous
                            utilisez la connexion par téléphone, et traitement des paiements d'abonnement sur la page
                            sécurisée de notre prestataire de paiement (PayDunya). Vos informations de paiement mobile
                            money ne transitent jamais par nos serveurs.
                        </p>
                    </section>

                    <section>
                        <h2 class="text-xl font-bold text-surface-900 dark:text-white mb-3">6. Sécurité</h2>
                        <p class="text-surface-700 dark:text-surface-300 leading-relaxed">
                            Toutes les communications entre votre appareil et nos serveurs sont chiffrées en transit
                            (TLS). Les mots de passe sont stockés hachés, jamais en clair. L'accès aux données de
                            production est strictement restreint. L'application mobile propose en plus un verrouillage
                            par code PIN et biométrie, stocké uniquement sur votre appareil.
                        </p>
                    </section>

                    <section>
                        <h2 class="text-xl font-bold text-surface-900 dark:text-white mb-3">7. Vos droits</h2>
                        <p class="text-surface-700 dark:text-surface-300 leading-relaxed mb-3">
                            Conformément à la loi sénégalaise n° 2008-12 sur la protection des données à caractère
                            personnel et, le cas échéant, au RGPD pour les utilisateurs situés dans l'Union européenne,
                            vous disposez à tout moment des droits d'accès, de rectification, de portabilité,
                            d'effacement et d'opposition. Les deux plus importants sont directement intégrés à l'application :
                        </p>
                        <ul class="space-y-2 mb-4">
                            <li class="flex items-start gap-3">
                                <i class="pi pi-download text-ochre-600 dark:text-ochre-400 text-xs mt-1.5 shrink-0"></i>
                                <p class="text-surface-700 dark:text-surface-300 leading-relaxed">
                                    <strong class="text-surface-900 dark:text-white">Exporter vos données</strong> :
                                    Paramètres, puis Préférences, puis « Exporter mes données » (toutes vos données en JSON,
                                    vos transactions en CSV). Gratuit, sans condition.
                                </p>
                            </li>
                            <li class="flex items-start gap-3">
                                <i class="pi pi-trash text-ochre-600 dark:text-ochre-400 text-xs mt-1.5 shrink-0"></i>
                                <p class="text-surface-700 dark:text-surface-300 leading-relaxed">
                                    <strong class="text-surface-900 dark:text-white">Supprimer votre compte</strong> :
                                    suppression immédiate et définitive de toutes vos données, depuis l'application ou
                                    depuis la page <a routerLink="/supprimer-mon-compte" class="text-brand-700 dark:text-ochre-400 font-semibold hover:underline">Supprimer mon compte</a>.
                                </p>
                            </li>
                        </ul>
                        <p class="text-surface-700 dark:text-surface-300 leading-relaxed">
                            Pour toute autre demande, écrivez à
                            <a href="mailto:contact@omaad.africa" class="text-brand-700 dark:text-ochre-400 font-semibold hover:underline">contact&#64;omaad.africa</a>.
                            Nous répondons sous 30 jours au plus tard.
                        </p>
                    </section>

                    <section>
                        <h2 class="text-xl font-bold text-surface-900 dark:text-white mb-3">8. Durée de conservation</h2>
                        <p class="text-surface-700 dark:text-surface-300 leading-relaxed">
                            Vos données sont conservées tant que votre compte est actif. Quand vous supprimez votre
                            compte, l'ensemble de vos données est effacé immédiatement et définitivement de notre base
                            de données de production ; les copies présentes dans les sauvegardes techniques disparaissent
                            à l'expiration de celles-ci. Seules les pièces que la loi nous impose de conserver
                            (justificatifs de facturation) sont gardées pendant la durée légale.
                        </p>
                    </section>

                    <section>
                        <h2 class="text-xl font-bold text-surface-900 dark:text-white mb-3">9. Évolution de cette politique</h2>
                        <p class="text-surface-700 dark:text-surface-300 leading-relaxed">
                            Si cette politique évolue de façon significative, nous vous en informerons dans
                            l'application ou par email avant l'entrée en vigueur des changements. La date de dernière
                            mise à jour figure en haut de cette page.
                        </p>
                    </section>

                    <div class="rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-5">
                        <p class="text-sm font-semibold text-surface-900 dark:text-white mb-1">Une question sur vos données ?</p>
                        <p class="text-[13px] text-surface-600 dark:text-surface-400 leading-relaxed">
                            Écrivez-nous à
                            <a href="mailto:contact@omaad.africa" class="text-brand-700 dark:text-ochre-400 font-semibold hover:underline">contact&#64;omaad.africa</a>.
                            Voir aussi : <a routerLink="/supprimer-mon-compte" class="text-brand-700 dark:text-ochre-400 font-semibold hover:underline">supprimer mon compte</a>.
                        </p>
                    </div>
                </article>
            </main>

            <footer-widget />
        </div>
    `
})
export class ConfidentialitePage implements OnDestroy {
    private i18n = inject(I18nService);
    private seo = inject(SeoService);

    readonly updated = '28 août 2026';

    readonly pledges = [
        { icon: 'pi-ban', title: 'Jamais vendues', body: 'Vos données ne sont ni vendues, ni louées, ni partagées à des fins commerciales.' },
        { icon: 'pi-megaphone', title: 'Zéro publicité', body: 'Pas de régie publicitaire, pas de cookies publicitaires, pas de traceurs tiers.' },
        { icon: 'pi-lock', title: 'Chiffrées en transit', body: 'Toutes les communications avec nos serveurs sont chiffrées (TLS).' },
        { icon: 'pi-user', title: 'Sous votre contrôle', body: 'Export complet et suppression immédiate de votre compte, à tout moment.' },
    ];

    readonly collected = [
        {
            label: 'Votre compte',
            body: 'adresse email (obligatoire) ; prénom, nom et numéro de téléphone (optionnels, le téléphone sert '
                + 'uniquement à la connexion par code SMS si vous la choisissez) ; mot de passe (stocké haché, jamais en clair) ; '
                + 'photo de profil si vous en ajoutez une.',
        },
        {
            label: 'Vos données financières',
            body: 'les comptes, actifs, transactions, budgets, dettes, objectifs d\'épargne et tontines que vous '
                + 'saisissez vous-même dans Omaad. C\'est le coeur du service.',
        },
        {
            label: 'Vos messages à l\'assistant',
            body: 'les conversations avec l\'assistant Omaad, si vous utilisez cette fonctionnalité.',
        },
        {
            label: 'Événements d\'usage',
            body: 'quelques événements produit (par exemple « premier actif ajouté ») collectés par notre propre '
                + 'système d\'analytics, stockés dans notre base et jamais transmis à un outil tiers.',
        },
        {
            label: 'Données techniques',
            body: 'rapports d\'erreur et journaux applicatifs pour la stabilité du service, et le jeton de '
                + 'notification de votre appareil si vous activez les notifications push.',
        },
    ];

    readonly purposes = [
        'Fournir le service : calculer votre patrimoine, vos budgets, vos objectifs, vos rapports.',
        'Sécuriser votre compte : authentification, détection d\'accès anormaux.',
        'Vous envoyer les notifications et emails que vous avez activés (alertes, bilan hebdomadaire), et la newsletter si vous y êtes inscrit (désinscription en un clic).',
        'Améliorer le produit grâce à notre mesure d\'usage interne.',
        'Respecter nos obligations légales (facturation, comptabilité).',
    ];

    readonly processors = [
        {
            name: 'Sentry',
            role: 'Stabilité',
            body: 'Reçoit les rapports de plantage et diagnostics techniques quand l\'application rencontre une '
                + 'erreur, pour que nous puissions la corriger. Jamais vos données financières.',
        },
        {
            name: 'Firebase Cloud Messaging (Google)',
            role: 'Notifications push',
            body: 'Reçoit le jeton technique de votre appareil, uniquement si vous activez les notifications push, '
                + 'pour pouvoir les acheminer. Révocable à tout moment dans les réglages.',
        },
        {
            name: 'Anthropic',
            role: 'Assistant',
            body: 'Reçoit vos messages à l\'assistant Omaad et le contexte financier nécessaire pour y répondre, '
                + 'uniquement quand vous utilisez l\'assistant. Contrat « zéro rétention » : Anthropic ne conserve '
                + 'pas ces échanges et ne les utilise pas pour entraîner ses modèles.',
        },
    ];

    constructor() {
        this.i18n.setLang('fr');
        this.seo.apply({ title: PAGE_TITLE, description: PAGE_DESC, canonical: CANONICAL });
        this.seo.setJsonLd('jsonld-breadcrumb-confidentialite', {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Omaad', item: 'https://omaad.africa/fr/landing/' },
                { '@type': 'ListItem', position: 2, name: 'Politique de confidentialité', item: `${CANONICAL}/` },
            ],
        });
    }

    ngOnDestroy(): void {
        this.seo.removeJsonLd('jsonld-breadcrumb-confidentialite');
    }
}
