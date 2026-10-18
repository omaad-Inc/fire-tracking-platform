import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TopbarWidget } from './topbarwidget.component';
import { FooterWidget } from './footerwidget';
import { RevealDirective } from './reveal.directive';
import { I18nService } from '../../../i18n/i18n.service';
import { ApiService } from '../../../core/services/api.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { SeoService, SITE_ORIGIN } from '../../../core/services/seo.service';

const CANONICAL = `${SITE_ORIGIN}/fr/fire-africa/newsletter`;
const PAGE_TITLE = 'Newsletter FIRE Africa par Omaad';
const PAGE_DESC =
    'Deux éditions par mois sur le patrimoine, la BRVM et la stratégie FIRE, avec 2 guides gratuits à l\'inscription.';
const INVALID_EMAIL = 'Vérifie ton adresse email.';
/** Same rule as the Netlify Function, so a 400 is only ever a bypass of the client check. */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type FormState = 'idle' | 'submitting' | 'done';

const FIELD =
    'w-full h-[52px] px-4 rounded-2xl bg-white border border-[var(--lp-line-strong)] text-[16px] text-[var(--lp-ink)] '
    + 'placeholder:text-[var(--lp-muted)] outline-none transition-[border-color,box-shadow] duration-150 '
    + 'focus:border-[var(--lp-ochre)] focus:shadow-[0_0_0_4px_rgba(199,123,60,0.18)] disabled:opacity-60';

/**
 * Page d'inscription à la newsletter FIRE Africa (FR uniquement, prérendue,
 * alias court /newsletter en 301 dans public/_redirects). Le formulaire POSTe
 * vers la Netlify Function /api/newsletter-subscribe (voir
 * netlify/functions/newsletter-subscribe.mjs), qui crée le contact Resend et
 * envoie l'email de bienvenue avec les 2 guides. Simple opt-in.
 *
 * Copie figée (voir resend/omaad-handoff/newsletter-page-copy.md) : ne pas
 * reformuler. États : envoi (bouton désactivé), succès (remplace le
 * formulaire, identique pour une adresse déjà inscrite), email invalide (400),
 * erreur serveur (tout le reste, réseau compris).
 *
 * Mise en page (design system landing, light only) : héros deux colonnes sur
 * desktop avec la carte d'inscription collante à droite ; sur téléphone la
 * carte suit directement le titre, la grille « ce que tu reçois » vient
 * ensuite, et une bande sombre ferme la page.
 */
@Component({
    selector: 'app-fire-africa-newsletter',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, RouterModule, TopbarWidget, FooterWidget, RevealDirective],
    template: `
        <div class="lp min-h-screen">
            <topbar-widget />

            <main>
                <section class="relative pt-6 pb-16 lg:pt-16 lg:pb-24" aria-labelledby="nl-title">
                    <div class="lp-container grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-x-12 lg:gap-y-14 items-start">

                        <!-- Titre -->
                        <header class="order-1 lg:col-span-7 text-center lg:text-left">
                            <span class="lp-eyebrow inline-flex items-center gap-2">
                                <i class="pi pi-envelope text-[11px]" aria-hidden="true"></i>
                                FIRE Africa par Omaad
                            </span>
                            <h1 id="nl-title" class="lp-h1 !text-[clamp(32px,6.2vw,54px)] mt-4">
                                La newsletter d'indépendance financière pour les Africains d'ici et de là-bas.
                            </h1>
                            <p class="lp-lead mt-5 max-w-[34rem] mx-auto lg:mx-0">
                                Patrimoine, investissement, stratégie FIRE, adaptés à ta réalité multi-devises.
                                Chiffres vérifiés, sources à l'écran, zéro promesse de richesse rapide.
                            </p>
                        </header>

                        <!-- Carte d'inscription : cadeau au-dessus des champs -->
                        <div class="order-2 lg:col-span-5 lg:row-span-2 lg:sticky lg:top-24">
                            <div class="lp-card relative overflow-hidden p-5 sm:p-7">
                                <div class="lp-glow !inset-auto !-top-24 !-right-24 w-72 h-72 opacity-80" aria-hidden="true"></div>

                                @if (state() === 'done') {
                                    <div role="status" aria-live="polite" class="relative text-center py-6 sm:py-10 lp-reveal is-in">
                                        <span class="lp-check !w-16 !h-16 !text-[26px] mx-auto"><i class="pi pi-check" aria-hidden="true"></i></span>
                                        <p class="lp-h3 mt-5">C'est fait 👋</p>
                                        <p class="lp-body mt-2 max-w-[30ch] mx-auto">
                                            Regarde ta boîte mail : tes 2 guides arrivent dans la minute.
                                            Pense à vérifier les spams la première fois.
                                        </p>
                                    </div>
                                } @else {
                                    <div class="relative rounded-2xl border border-ochre-200/70 bg-ochre-50 p-4 sm:p-5">
                                        <p class="text-[15px] sm:text-[16px] font-bold leading-snug text-[var(--lp-ink)]">
                                            🎁 Tu t'inscris, tu reçois tout de suite tes 2 guides gratuits :
                                        </p>
                                        <ul class="mt-3 flex flex-col gap-2.5 list-none p-0 m-0">
                                            <li class="flex items-center gap-3">
                                                <span class="w-10 h-10 shrink-0 rounded-xl bg-white border border-ochre-200/70 flex items-center justify-center text-[18px]" aria-hidden="true">📘</span>
                                                <span class="text-[14px] sm:text-[15px] leading-snug text-[var(--lp-ink-2)]">
                                                    <span class="font-semibold text-[var(--lp-ink)]">La méthode Core / Satellite</span> (le pourquoi)
                                                </span>
                                            </li>
                                            <li class="flex items-center gap-3">
                                                <span class="w-10 h-10 shrink-0 rounded-xl bg-white border border-ochre-200/70 flex items-center justify-center text-[18px]" aria-hidden="true">📗</span>
                                                <span class="text-[14px] sm:text-[15px] leading-snug text-[var(--lp-ink-2)]">
                                                    <span class="font-semibold text-[var(--lp-ink)]">Le mode d'emploi BRVM</span> (choisir ta SGI, ouvrir ton compte, passer ton 1er ordre)
                                                </span>
                                            </li>
                                        </ul>
                                    </div>

                                    <form (ngSubmit)="submit()" novalidate class="relative mt-5 flex flex-col gap-4">
                                        <div>
                                            <label for="nl-email" class="block text-[13px] font-semibold text-[var(--lp-ink)] mb-1.5">Ton email</label>
                                            <input id="nl-email" type="email" name="email" required
                                                   [(ngModel)]="email"
                                                   placeholder="ton@email.com"
                                                   autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false"
                                                   [disabled]="state() === 'submitting'"
                                                   [attr.aria-invalid]="emailError() ? true : null"
                                                   [attr.aria-describedby]="emailError() ? 'nl-email-error' : null"
                                                   [class]="field"
                                                   [class.!border-negative]="emailError()" />
                                            @if (emailError()) {
                                                <p id="nl-email-error" role="alert" class="mt-2 inline-flex items-center gap-1.5 text-negative text-[13px] font-medium">
                                                    <i class="pi pi-exclamation-circle text-[12px]" aria-hidden="true"></i>{{ emailError() }}
                                                </p>
                                            }
                                        </div>

                                        <div>
                                            <label for="nl-first-name" class="block text-[13px] font-semibold text-[var(--lp-ink)] mb-1.5">Prénom (optionnel)</label>
                                            <input id="nl-first-name" type="text" name="firstName"
                                                   [(ngModel)]="firstName"
                                                   placeholder="Ton prénom"
                                                   autocomplete="given-name" maxlength="80"
                                                   [disabled]="state() === 'submitting'"
                                                   [class]="field" />
                                        </div>

                                        <!-- Honeypot : jamais affiché, jamais pré-rempli. Un bot qui le
                                             remplit reçoit un 200 silencieux côté fonction. -->
                                        <div class="absolute -left-[10000px] top-0 w-px h-px overflow-hidden" aria-hidden="true">
                                            <label for="nl-website">Website</label>
                                            <input id="nl-website" type="text" name="website" [(ngModel)]="website"
                                                   tabindex="-1" autocomplete="off" />
                                        </div>

                                        <button type="submit"
                                                class="lp-btn lp-btn-primary lp-btn-block mt-1 disabled:opacity-70 disabled:cursor-progress"
                                                [disabled]="state() === 'submitting'"
                                                [attr.aria-busy]="state() === 'submitting' ? true : null">
                                            @if (state() === 'submitting') {
                                                <i class="pi pi-spinner pi-spin text-[14px]" aria-hidden="true"></i> Un instant…
                                            } @else {
                                                Recevoir mes 2 guides
                                                <i class="pi pi-arrow-right text-[13px]" aria-hidden="true"></i>
                                            }
                                        </button>

                                        @if (serverError()) {
                                            <p role="alert" class="rounded-xl border border-negative/30 bg-negative/5 px-3.5 py-2.5 text-negative text-[13px] leading-relaxed">
                                                Petit souci de notre côté. Réessaie dans un instant ou écris à
                                                <a href="mailto:contact@omaad.africa" class="font-semibold underline">contact&#64;omaad.africa</a>.
                                            </p>
                                        }

                                        <p class="text-[12px] lp-muted text-center leading-relaxed">
                                            En t'inscrivant, tu acceptes de recevoir la newsletter FIRE Africa.
                                            Désinscription en un clic à chaque email.
                                            <a routerLink="/confidentialite" class="underline underline-offset-2 hover:text-[var(--lp-ochre-ink)]">Politique de confidentialité</a>.
                                        </p>
                                    </form>
                                }
                            </div>
                        </div>

                        <!-- Ce que tu reçois ensuite -->
                        <section class="order-3 lg:col-span-7" aria-labelledby="nl-next-title" lpReveal>
                            <h2 id="nl-next-title" class="lp-h3 text-center lg:text-left">Deux éditions par mois, le 1er et le 15 :</h2>
                            <ul class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 list-none p-0 m-0">
                                @for (item of items; track item.icon) {
                                    <li class="lp-card !shadow-none p-4 flex items-start gap-3">
                                        <span class="lp-icon-tile !w-10 !h-10 !rounded-xl text-[15px]"><i class="pi" [class]="item.icon" aria-hidden="true"></i></span>
                                        <span class="lp-body text-[15px] pt-1.5">{{ item.text }}</span>
                                    </li>
                                }
                            </ul>
                            <p class="mt-5 text-[14px] lp-muted text-center lg:text-left inline-flex items-center gap-2 w-full justify-center lg:justify-start">
                                <i class="pi pi-check text-[11px] text-[#1F6249]" aria-hidden="true"></i>
                                Ni promo, ni jargon. Désinscription en un clic.
                            </p>
                        </section>
                    </div>
                </section>

                <!-- Bande de fermeture -->
                <section class="lp-dark py-14 lg:py-20" aria-label="FIRE Africa par Omaad">
                    <div class="lp-container text-center" lpReveal>
                        <p class="lp-h2 !text-white !text-[clamp(24px,4.2vw,36px)]">Devenez le roi de votre patrimoine.</p>
                        <p class="mt-4 text-[12px] font-semibold tracking-[0.2em] uppercase text-[#DFB78A]">FIRE Africa par Omaad</p>
                        <p class="mt-8 text-[13px] text-white/60 max-w-[44ch] mx-auto leading-relaxed">
                            Contenu éducatif uniquement. Ceci n'est pas un conseil en investissement.
                        </p>
                    </div>
                </section>
            </main>

            <footer-widget />
        </div>
    `
})
export class FireAfricaNewsletterPage implements OnDestroy {
    private i18n = inject(I18nService);
    private api = inject(ApiService);
    private analytics = inject(AnalyticsService);
    private seo = inject(SeoService);

    readonly field = FIELD;
    readonly items = [
        { icon: 'pi-chart-line', text: 'Une analyse approfondie sur un sujet patrimonial concret' },
        { icon: 'pi-globe', text: 'Un chiffre africain qui éclaire les marchés UEMOA' },
        { icon: 'pi-bookmark', text: 'Une ressource sélectionnée pour aller plus loin' },
        { icon: 'pi-language', text: 'Un résumé en anglais pour partager facilement' },
    ];

    email = '';
    firstName = '';
    /** Honeypot value: stays '' for a human, the function ignores filled ones. */
    website = '';

    state = signal<FormState>('idle');
    emailError = signal<string | null>(null);
    serverError = signal(false);

    constructor() {
        this.i18n.setLang('fr');
        this.seo.apply({ title: PAGE_TITLE, description: PAGE_DESC, canonical: CANONICAL });
        this.seo.setJsonLd('jsonld-breadcrumb-fire-africa-newsletter', {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Omaad', item: 'https://omaad.africa/fr/landing/' },
                { '@type': 'ListItem', position: 2, name: PAGE_TITLE, item: `${CANONICAL}/` },
            ],
        });
    }

    ngOnDestroy(): void {
        this.seo.removeJsonLd('jsonld-breadcrumb-fire-africa-newsletter');
    }

    submit(): void {
        if (this.state() === 'submitting') return;
        this.emailError.set(null);
        this.serverError.set(false);

        const email = this.email.trim();
        if (!EMAIL_RE.test(email)) {
            this.emailError.set(INVALID_EMAIL);
            return;
        }

        this.state.set('submitting');
        this.api.subscribeFireAfricaNewsletter({
            email,
            firstName: this.firstName.trim(),
            website: this.website,
            source: 'omaad.africa',
        }).subscribe({
            next: (res) => {
                // 200 with `already: true` is the same success: never reveal
                // that an address is known.
                if (res?.ok) {
                    this.state.set('done');
                    this.analytics.trackPublic('newsletter_signup', { source: 'fire-africa-newsletter-page' });
                    return;
                }
                this.state.set('idle');
                this.serverError.set(true);
            },
            error: (err: unknown) => {
                this.state.set('idle');
                if (err instanceof HttpErrorResponse && err.status === 400) {
                    this.emailError.set(INVALID_EMAIL);
                } else {
                    this.serverError.set(true);
                }
            },
        });
    }
}
