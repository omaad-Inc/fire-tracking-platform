import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TopbarWidget } from './topbarwidget.component';
import { FooterWidget } from './footerwidget';
import { I18nService } from '../../../i18n/i18n.service';

@Component({
    selector: 'app-legal-terms',
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
                        <i class="pi pi-file text-[10px]"></i>
                        {{ isFr() ? 'Conditions contractuelles' : 'Contractual terms' }}
                    </span>
                    <h1 class="text-3xl md:text-4xl font-bold text-surface-900 dark:text-white mb-3 tracking-tight">
                        {{ isFr() ? 'Conditions générales d\\'utilisation' : 'Terms of service' }}
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
                            {{ isFr() ? 'Contact' : 'Contact' }}
                        </h2>
                        <p class="text-surface-700 dark:text-surface-300 leading-relaxed">
                            {{ isFr() ? 'Pour toute question relative à ces conditions, écrivez à' : 'For any question about these terms, write to' }}
                            <a href="mailto:contact@omaad.africa" class="text-brand-700 dark:text-ochre-400 font-semibold hover:underline">contact&#64;omaad.africa</a>.
                        </p>
                    </section>

                    <div class="mt-10 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-sm leading-relaxed">
                        ⚠️ {{ isFr()
                            ? 'Ce document est un brouillon pré-lancement. Il sera complété et validé juridiquement avant la mise en production publique.'
                            : 'This document is a pre-launch draft. It will be finalized and legally reviewed before public production.' }}
                    </div>
                </article>
            </main>

            <footer-widget />
        </div>
    `
})
export class LegalTermsPage {
    private i18n = inject(I18nService);
    private router = inject(Router);

    readonly isFr = computed(() => this.i18n.lang() === 'fr');
    readonly updated = '14/05/2026';

    readonly sections = computed(() => {
        const fr = this.isFr();
        return [
            {
                id: 'object',
                title: fr ? 'Objet' : 'Purpose',
                body: fr
                    ? 'Les présentes conditions générales d\'utilisation régissent l\'accès et l\'usage de la plateforme Omaad Wealth et des services associés (newsletter FIRE Africa, simulateurs, blog).'
                    : 'These terms of service govern access to and use of the Omaad Wealth platform and associated services (FIRE Africa newsletter, simulators, blog).',
            },
            {
                id: 'access',
                title: fr ? 'Accès au service' : 'Access to the service',
                body: fr
                    ? 'L\'inscription à Omaad est gratuite. Tu déclares avoir au moins 18 ans et la capacité juridique pour utiliser le service. Tu es responsable de la confidentialité de tes identifiants.'
                    : 'Signing up to Omaad is free. You declare you are at least 18 years old and have the legal capacity to use the service. You are responsible for the confidentiality of your credentials.',
            },
            {
                id: 'usage',
                title: fr ? 'Utilisation acceptable' : 'Acceptable use',
                body: fr
                    ? 'Tu t\'engages à utiliser Omaad de bonne foi et sans porter atteinte au service, aux autres utilisateurs ou à des tiers. Toute tentative d\'accès non autorisé, scraping massif ou injection est interdite et peut entraîner la suspension immédiate du compte.'
                    : 'You agree to use Omaad in good faith without harming the service, other users, or third parties. Any attempt at unauthorized access, mass scraping, or injection is prohibited and may result in immediate account suspension.',
            },
            {
                id: 'disclaimer',
                title: fr ? 'Avertissement investissement' : 'Investment disclaimer',
                body: fr
                    ? 'Omaad fournit des outils de suivi patrimonial à titre informatif et éducatif. Les contenus, simulateurs, projections et newsletters NE constituent PAS un conseil en investissement, une recommandation personnalisée ni une incitation à acheter ou vendre des instruments financiers. Tu restes seul·e responsable de tes décisions financières. Les performances passées ne préjugent pas des performances futures. Tout investissement comporte des risques, y compris la perte du capital investi.'
                    : 'Omaad provides wealth-tracking tools for informational and educational purposes. The content, simulators, projections, and newsletters DO NOT constitute investment advice, personalized recommendations, or any solicitation to buy or sell financial instruments. You alone remain responsible for your financial decisions. Past performance does not guarantee future returns. All investments carry risk, including loss of capital.',
            },
            {
                id: 'liability',
                title: fr ? 'Responsabilité' : 'Liability',
                body: fr
                    ? 'Omaad est fourni « tel quel ». Nous mettons tous nos moyens raisonnables pour assurer la disponibilité du service mais ne pouvons garantir une absence totale d\'interruption ou d\'erreur. Notre responsabilité est limitée au montant des abonnements payés au cours des 12 derniers mois.'
                    : 'Omaad is provided "as is". We make reasonable efforts to ensure service availability but cannot guarantee zero interruption or error. Our liability is limited to the subscriptions paid over the past 12 months.',
            },
            {
                id: 'data',
                title: fr ? 'Données personnelles' : 'Personal data',
                body: fr
                    ? 'Le traitement de tes données personnelles est régi par notre Politique de confidentialité. En utilisant Omaad, tu reconnais en avoir pris connaissance.'
                    : 'The processing of your personal data is governed by our Privacy Policy. By using Omaad, you acknowledge having read it.',
            },
            {
                id: 'termination',
                title: fr ? 'Résiliation' : 'Termination',
                body: fr
                    ? 'Tu peux supprimer ton compte à tout moment depuis tes paramètres. Nous pouvons suspendre ou résilier un compte en cas de violation des présentes conditions. Toutes tes données sont effacées dans les 30 jours conformément au RGPD.'
                    : 'You may delete your account at any time from your settings. We may suspend or terminate an account in case of breach of these terms. All your data is erased within 30 days as per GDPR.',
            },
            {
                id: 'law',
                title: fr ? 'Droit applicable' : 'Governing law',
                body: fr
                    ? 'Les présentes conditions sont régies par le droit français. Tout litige relatif à leur interprétation ou exécution relève de la compétence exclusive des tribunaux du ressort de Paris, sous réserve des dispositions impératives applicables au consommateur.'
                    : 'These terms are governed by French law. Any dispute relating to their interpretation or execution falls under the exclusive jurisdiction of the courts of Paris, subject to mandatory consumer protection laws.',
            },
        ];
    });

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        const lang = match ? match[1] : 'fr';
        this.i18n.setLang(lang as 'fr' | 'en');
    }
}
