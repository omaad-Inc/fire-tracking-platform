import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TopbarWidget } from './topbarwidget.component';
import { FooterWidget } from './footerwidget';
import { I18nService, Lang } from '../../../i18n/i18n.service';
import { SeoService } from '../../../core/services/seo.service';
import { SEO_PAGES } from '../../../core/services/seo-content';

@Component({
    selector: 'app-legal-mentions',
    standalone: true,
    imports: [CommonModule, RouterModule, TopbarWidget, FooterWidget],
    template: `
        <div class="lp min-h-screen">
            <topbar-widget />

            <main class="pt-8 md:pt-12 pb-24 px-6 md:px-12 lg:px-20 max-w-3xl mx-auto">
                <header class="mb-10 text-center md:text-left">
                    <span class="lp-eyebrow inline-flex items-center gap-2">
                        <i class="pi pi-info-circle text-[10px]"></i>
                        {{ isFr() ? 'Informations légales' : 'Legal information' }}
                    </span>
                    <h1 class="lp-h1 mt-3 mb-4">
                        {{ isFr() ? 'Mentions légales' : 'Legal notice' }}
                    </h1>
                    <p class="lp-lead">
                        {{ isFr() ? 'Dernière mise à jour : ' : 'Last updated: ' }}{{ updated }}
                    </p>
                </header>

                <article class="prose-omaad space-y-8">
                    <section>
                        <h2 class="lp-h3 mb-3">
                            {{ isFr() ? 'Éditeur du site' : 'Site publisher' }}
                        </h2>
                        <p class="lp-body whitespace-pre-line">{{ blocks().publisher }}</p>
                    </section>

                    <section>
                        <h2 class="lp-h3 mb-3">
                            {{ isFr() ? 'Directeur de la publication' : 'Publication director' }}
                        </h2>
                        <p class="lp-body">{{ blocks().director }}</p>
                    </section>

                    <section>
                        <h2 class="lp-h3 mb-3">
                            {{ isFr() ? 'Hébergement' : 'Hosting' }}
                        </h2>
                        <p class="lp-body whitespace-pre-line">{{ blocks().hosting }}</p>
                    </section>

                    <section>
                        <h2 class="lp-h3 mb-3">
                            {{ isFr() ? 'Propriété intellectuelle' : 'Intellectual property' }}
                        </h2>
                        <p class="lp-body">{{ blocks().ip }}</p>
                    </section>

                    <section>
                        <h2 class="lp-h3 mb-3">
                            {{ isFr() ? 'Contact' : 'Contact' }}
                        </h2>
                        <p class="lp-body">
                            {{ blocks().contactPre }}
                            <a href="mailto:contact@omaad.africa" class="text-brand-700 dark:text-ochre-400 font-semibold hover:underline">contact&#64;omaad.africa</a>.
                        </p>
                    </section>

                    <!-- Draft banner -->
                    <div class="mt-10 p-4 lp-card text-surface-500 dark:text-surface-400 text-sm leading-relaxed">
                        {{ isFr() ? 'Dernière mise à jour : 19 juillet 2026.' : 'Last updated: 19 July 2026.' }}
                    </div>
                </article>
            </main>

            <footer-widget />
        </div>
    `,
    styles: [`
        .prose-omaad h2 { letter-spacing: -0.01em; }
    `]
})
export class LegalMentionsPage {
    private i18n = inject(I18nService);
    private router = inject(Router);
    private seo = inject(SeoService);

    readonly isFr = computed(() => this.i18n.lang() === 'fr');
    readonly updated = '14/05/2026';

    readonly blocks = computed(() => {
        const fr = this.isFr();
        return {
            publisher: fr
                ? 'Omaad, projet personnel en pré-lancement.\nFondateur : Mbaye SENE.\nSite : omaad.africa\nE-mail : contact@omaad.africa'
                : 'Omaad, personal project in pre-launch.\nFounder: Mbaye SENE.\nSite: omaad.africa\nEmail: contact@omaad.africa',
            director: fr
                ? 'Mbaye SENE, fondateur d\'Omaad.'
                : 'Mbaye SENE, founder of Omaad.',
            hosting: fr
                ? 'Front-end : Netlify, Inc., 512 2nd Street, Suite 200, San Francisco, CA 94107, USA.\nBack-end : Render Services, Inc., San Francisco, CA, USA.\nBase de données : PostgreSQL (Supabase) hébergée en région UE (Irlande).'
                : 'Front-end: Netlify, Inc., 512 2nd Street, Suite 200, San Francisco, CA 94107, USA.\nBack-end: Render Services, Inc., San Francisco, CA, USA.\nDatabase: PostgreSQL (Supabase) hosted in EU region (Ireland).',
            ip: fr
                ? 'L\'ensemble du contenu de ce site (textes, visuels, code, marque Omaad et FIRE Africa) est protégé par le droit d\'auteur. Toute reproduction, même partielle, est interdite sans autorisation écrite préalable.'
                : 'All content on this site (text, visuals, code, Omaad and FIRE Africa brand) is protected by copyright. Any reproduction, even partial, is prohibited without prior written authorization.',
            contactPre: fr
                ? 'Pour toute question relative à ces mentions légales, écrivez à'
                : 'For any question about this legal notice, write to',
        };
    });

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        const lang = match ? match[1] : 'fr';
        this.i18n.setLang(lang as Lang);
        this.seo.applyLocalized({ lang: lang as Lang, ...SEO_PAGES.legalMentions });
    }
}
