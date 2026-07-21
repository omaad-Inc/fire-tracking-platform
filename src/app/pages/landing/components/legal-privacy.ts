import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TopbarWidget } from './topbarwidget.component';
import { FooterWidget } from './footerwidget';
import { I18nService, Lang } from '../../../i18n/i18n.service';
import { SeoService } from '../../../core/services/seo.service';
import { SEO_PAGES } from '../../../core/services/seo-content';

@Component({
    selector: 'app-legal-privacy',
    standalone: true,
    imports: [CommonModule, RouterModule, TopbarWidget, FooterWidget],
    template: `
        <div class="bg-surface-0 dark:bg-surface-900 min-h-screen">
            <div class="fixed top-0 left-0 right-0 z-50 bg-surface-0/80 dark:bg-surface-900/80 backdrop-blur-lg border-b border-surface-200/50 dark:border-surface-700/50"
                 style="padding-top: env(safe-area-inset-top, 0px)">
                <topbar-widget class="py-4 px-6 mx-0 md:mx-12 lg:mx-20 lg:px-20 flex items-center justify-between relative lg:static" />
            </div>

            <main class="pt-32 pb-24 px-6 md:px-12 lg:px-20 max-w-3xl mx-auto">
                <header class="mb-10">
                    <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 text-xs font-semibold uppercase tracking-wider mb-4">
                        <i class="pi pi-shield text-[10px]"></i>
                        {{ isFr() ? 'Vie privée & RGPD' : 'Privacy & GDPR' }}
                    </span>
                    <h1 class="text-3xl md:text-4xl font-bold text-surface-900 dark:text-white mb-3 tracking-tight">
                        {{ isFr() ? 'Politique de confidentialité' : 'Privacy policy' }}
                    </h1>
                    <p class="text-surface-500 dark:text-surface-400 text-sm">
                        {{ isFr() ? 'Dernière mise à jour : ' : 'Last updated: ' }}{{ updated }}
                    </p>
                </header>

                <article class="space-y-8">
                    @for (section of sections(); track section.id) {
                        <section>
                            <h2 class="text-xl font-bold text-surface-900 dark:text-white mb-3">{{ section.title }}</h2>
                            <p class="text-surface-700 dark:text-surface-300 leading-relaxed whitespace-pre-line">{{ section.body }}</p>
                        </section>
                    }

                    <section>
                        <h2 class="text-xl font-bold text-surface-900 dark:text-white mb-3">
                            {{ isFr() ? 'Exercer vos droits' : 'Exercise your rights' }}
                        </h2>
                        <p class="text-surface-700 dark:text-surface-300 leading-relaxed">
                            {{ isFr()
                                ? 'Pour exercer vos droits RGPD (accès, rectification, effacement, portabilité, opposition), écrivez à'
                                : 'To exercise your GDPR rights (access, rectification, erasure, portability, objection), write to' }}
                            <a href="mailto:contact@omaad.africa" class="text-brand-700 dark:text-ochre-400 font-semibold hover:underline">contact&#64;omaad.africa</a>.
                            {{ isFr()
                                ? 'Une réponse vous sera apportée sous 30 jours.'
                                : 'A response will be provided within 30 days.' }}
                        </p>
                    </section>

                    <div class="mt-10 p-4 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-500 dark:text-surface-400 text-sm leading-relaxed">
                        {{ isFr() ? 'Dernière mise à jour : 19 juillet 2026.' : 'Last updated: 19 July 2026.' }}
                    </div>
                </article>
            </main>

            <footer-widget />
        </div>
    `
})
export class LegalPrivacyPage {
    private i18n = inject(I18nService);
    private router = inject(Router);
    private seo = inject(SeoService);

    readonly isFr = computed(() => this.i18n.lang() === 'fr');
    readonly updated = '14/05/2026';

    readonly sections = computed(() => {
        const fr = this.isFr();
        return [
            {
                id: 'controller',
                title: fr ? 'Responsable du traitement' : 'Data controller',
                body: fr
                    ? 'Omaad collecte et traite tes données personnelles dans le cadre de la fourniture de l\'application de gestion patrimoniale Omaad Wealth et de la newsletter FIRE Africa.\nResponsable : Mbaye SENE, contact@omaad.africa.'
                    : 'Omaad collects and processes your personal data as part of providing the Omaad Wealth wealth management app and the FIRE Africa newsletter.\nController: Mbaye SENE, contact@omaad.africa.',
            },
            {
                id: 'collected',
                title: fr ? 'Données collectées' : 'Data collected',
                body: fr
                    ? 'Nous collectons uniquement les données nécessaires au service :\n• Compte : email, prénom, nom, mot de passe (haché bcrypt), photo de profil optionnelle.\n• Patrimoine : actifs, transactions, dettes, objectifs d\'épargne, saisis manuellement.\n• Préférences : devise, langue, fuseau horaire, choix de thème.\n• Techniques : adresse IP, type de navigateur, journaux applicatifs (anonymisés).'
                    : 'We collect only what the service needs:\n• Account: email, first name, last name, password (bcrypt-hashed), optional profile picture.\n• Wealth: assets, transactions, debts, savings goals, entered manually.\n• Preferences: currency, language, timezone, theme.\n• Technical: IP address, browser type, application logs (anonymized).',
            },
            {
                id: 'purposes',
                title: fr ? 'Finalités du traitement' : 'Processing purposes',
                body: fr
                    ? 'Tes données sont utilisées pour :\n• Fournir et améliorer l\'application Omaad.\n• Sécuriser ton compte (authentification, détection d\'intrusion).\n• T\'envoyer la newsletter FIRE Africa si tu y as souscrit (désinscription en un clic).\n• Respecter nos obligations légales (comptabilité, fiscalité).\nNous ne vendons, ne louons ni ne partageons tes données avec des tiers à des fins commerciales.'
                    : 'Your data is used to:\n• Provide and improve the Omaad application.\n• Secure your account (authentication, intrusion detection).\n• Send you the FIRE Africa newsletter if you subscribed (one-click unsubscribe).\n• Comply with our legal obligations (accounting, tax).\nWe do not sell, rent, or share your data with third parties for commercial purposes.',
            },
            {
                id: 'storage',
                title: fr ? 'Stockage & sécurité' : 'Storage & security',
                body: fr
                    ? 'Les données sont stockées sur PostgreSQL en région UE (Irlande). Les mots de passe sont hachés (bcrypt) et jamais stockés en clair. Les connexions sont chiffrées en TLS 1.3. Sauvegardes chiffrées quotidiennes.'
                    : 'Data is stored on PostgreSQL in the EU region (Ireland). Passwords are hashed (bcrypt) and never stored in plaintext. Connections are encrypted with TLS 1.3. Encrypted daily backups.',
            },
            {
                id: 'retention',
                title: fr ? 'Durée de conservation' : 'Retention period',
                body: fr
                    ? 'Tes données sont conservées tant que ton compte est actif. À la suppression du compte, toutes les données personnelles sont effacées dans les 30 jours, sauf obligations légales de conservation (factures : 10 ans).'
                    : 'Your data is kept as long as your account is active. Upon account deletion, all personal data is erased within 30 days, except for legal retention obligations (invoices: 10 years).',
            },
            {
                id: 'cookies',
                title: fr ? 'Cookies' : 'Cookies',
                body: fr
                    ? 'Omaad utilise uniquement des cookies fonctionnels (session, préférences). Aucun cookie publicitaire ni de tracking tiers. Le détail est disponible sur demande.'
                    : 'Omaad only uses functional cookies (session, preferences). No advertising or third-party tracking cookies. Details available on request.',
            },
        ];
    });

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        const lang = match ? match[1] : 'fr';
        this.i18n.setLang(lang as Lang);
        this.seo.applyLocalized({ lang: lang as Lang, ...SEO_PAGES.legalPrivacy });
    }
}
