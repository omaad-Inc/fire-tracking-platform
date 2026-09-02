import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TopbarWidget } from './topbarwidget.component';
import { FooterWidget } from './footerwidget';
import { I18nService } from '../../../i18n/i18n.service';
import { SeoService } from '../../../core/services/seo.service';
import { APP_LINK_PLANS, APP_LINK_SUBSCRIPTION_SUCCESS, isMobileDevice, openInApp } from '../../../core/util/app-link';

type Outcome = 'success' | 'error' | 'unknown';

/**
 * Retour de paiement (PUBLIC, FR, sans :lang, noindex). C'est la page sur
 * laquelle PayDunya/Bictorys renvoient le NAVIGATEUR après le checkout
 * (`?payment=success|error`).
 *
 * Pourquoi publique : un utilisateur qui paie depuis l'application mobile
 * ouvre le checkout dans Chrome/Safari SANS session web. Renvoyer vers
 * Réglages > Abonnement le faisait atterrir sur la page de connexion, sans un
 * mot sur son paiement. Ici, pas de compte requis : on confirme le retour et on
 * lui dit quoi faire, avec un bouton qui rouvre l'application (schéma omaad://)
 * sur mobile et, si l'app ne s'ouvre pas, la consigne en clair.
 *
 * La redirection ne décide RIEN : l'accès est accordé par le webhook/confirm
 * côté serveur, et l'application relit son plan au retour (pending-payment
 * reconcile + refresh au resume). Cette page n'est qu'un panneau indicateur.
 */
@Component({
    selector: 'app-paiement-retour',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, RouterModule, TopbarWidget, FooterWidget],
    template: `
        <div class="bg-surface-0 dark:bg-surface-950 min-h-screen">
            <div class="fixed top-0 left-0 right-0 z-50 bg-surface-0/80 dark:bg-surface-950/80 backdrop-blur-lg border-b border-surface-200/50 dark:border-surface-700/50"
                 style="padding-top: env(safe-area-inset-top, 0px)">
                <topbar-widget class="py-4 px-6 mx-0 md:mx-12 lg:mx-20 lg:px-20 flex items-center justify-between relative lg:static" />
            </div>

            <main class="pt-32 pb-24 px-6 md:px-12 lg:px-20 max-w-xl mx-auto">
                <section class="rounded-3xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-7 md:p-9 text-center">
                    <span class="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-5"
                          [ngClass]="outcome() === 'success' ? 'bg-positive/12 text-positive'
                                     : outcome() === 'error' ? 'bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400'
                                     : 'bg-ochre-100 dark:bg-ochre-500/15 text-ochre-700 dark:text-ochre-400'">
                        <i class="pi !text-2xl" [ngClass]="outcome() === 'success' ? 'pi-check' : outcome() === 'error' ? 'pi-info-circle' : 'pi-clock'" aria-hidden="true"></i>
                    </span>

                    <h1 class="text-2xl md:text-3xl font-bold text-surface-900 dark:text-white tracking-tight mb-3">
                        {{ title() }}
                    </h1>
                    <p class="text-surface-600 dark:text-surface-300 leading-relaxed max-w-[40ch] mx-auto">
                        {{ body() }}
                    </p>

                    <div class="mt-8 flex flex-col items-stretch gap-3">
                        @if (mobile()) {
                            <button type="button" (click)="openApp()" [disabled]="opening()"
                                    class="omaad-press inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-ochre-500 hover:bg-ochre-600 text-surface-950 font-bold text-[15px] transition-colors disabled:opacity-70">
                                <i class="pi" [ngClass]="opening() ? 'pi-spin pi-spinner' : 'pi-mobile'" aria-hidden="true"></i>
                                {{ outcome() === 'error' ? "Retour à l'application" : "Ouvrir l'application" }}
                            </button>
                            @if (openFailed()) {
                                <p role="status" class="text-[13px] text-surface-600 dark:text-surface-300 leading-relaxed px-2">
                                    L'application ne s'est pas ouverte ? Reviens simplement sur
                                    <strong>Omaad</strong> depuis ton écran d'accueil :
                                    {{ outcome() === 'error' ? 'tu pourras réessayer depuis la page Plans.' : "la mise à niveau s'applique toute seule." }}
                                </p>
                            }
                        } @else {
                            <p class="text-[13px] text-surface-500 dark:text-surface-400 leading-relaxed px-2">
                                Sur ton téléphone, rouvre simplement l'application Omaad :
                                {{ outcome() === 'error' ? "rien n'a changé." : 'ton compte y est déjà à niveau.' }}
                            </p>
                        }

                        <a [routerLink]="webLink()" [queryParams]="webQuery()"
                           class="omaad-press inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-surface-200 dark:border-surface-700 text-surface-800 dark:text-surface-100 font-semibold text-sm no-underline hover:border-ochre-400 dark:hover:border-ochre-500/50 transition-colors">
                            <i class="pi pi-desktop !text-sm" aria-hidden="true"></i>
                            {{ outcome() === 'error' ? 'Réessayer sur le web' : 'Voir mon abonnement sur le web' }}
                        </a>
                    </div>
                </section>

                <p class="mt-6 text-center text-[12px] text-surface-400 dark:text-surface-500 leading-relaxed">
                    Une question sur ce paiement ?
                    <a routerLink="/support" class="text-brand-700 dark:text-ochre-400 font-semibold hover:underline">Contacte le support</a>.
                </p>
            </main>

            <footer-widget />
        </div>
    `
})
export class PaiementRetourPage implements OnInit, OnDestroy {
    private i18n = inject(I18nService);
    private seo = inject(SeoService);
    private route = inject(ActivatedRoute);
    private platformId = inject(PLATFORM_ID);

    readonly outcome = signal<Outcome>('unknown');
    readonly mobile = signal(false);
    readonly opening = signal(false);
    readonly openFailed = signal(false);

    constructor() {
        this.i18n.setLang('fr');
        this.seo.apply({
            title: 'Retour de paiement | Omaad',
            description: 'Confirmation de ton paiement Omaad et retour vers l\'application.',
            canonical: 'https://omaad.africa/paiement/retour',
        });
        // Page de transit personnelle : jamais dans l'index.
        this.seo.setRobots('noindex, nofollow');
    }

    ngOnInit(): void {
        const raw = this.route.snapshot.queryParamMap.get('payment');
        this.outcome.set(raw === 'success' ? 'success' : raw === 'error' ? 'error' : 'unknown');
        this.mobile.set(isPlatformBrowser(this.platformId) && isMobileDevice());
    }

    ngOnDestroy(): void {
        this.seo.removeRobots();
    }

    title(): string {
        switch (this.outcome()) {
            case 'success': return 'Paiement confirmé';
            case 'error':   return 'Paiement non finalisé';
            default:        return 'Paiement en cours de traitement';
        }
    }

    body(): string {
        switch (this.outcome()) {
            case 'success':
                return 'Ton abonnement Omaad est actif. Ouvre l\'application : ton compte est déjà à niveau, rien d\'autre à faire.';
            case 'error':
                return 'Rien n\'a été débité. Tu peux réessayer quand tu veux, depuis l\'application ou ici.';
            default:
                return 'Nous attendons la confirmation de ton opérateur. Ouvre l\'application : la mise à niveau s\'applique dès qu\'elle arrive.';
        }
    }

    /** Web destination: the plan page after a failure, the Abonnement page
     *  otherwise (the auth guard takes over when there is no web session). */
    webLink(): string {
        return this.outcome() === 'error' ? '/fr/pages/plans' : '/fr/settings/subscription';
    }

    webQuery(): Record<string, string> | null {
        return this.outcome() === 'error' ? null : { payment: this.outcome() === 'success' ? 'success' : 'pending' };
    }

    async openApp(): Promise<void> {
        if (this.opening()) return;
        this.opening.set(true);
        this.openFailed.set(false);
        const link = this.outcome() === 'error' ? APP_LINK_PLANS : APP_LINK_SUBSCRIPTION_SUCCESS;
        const switched = await openInApp(link);
        this.opening.set(false);
        if (!switched) this.openFailed.set(true);
    }
}
