import { Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { I18nService } from '../../../i18n/i18n.service';
import { ApiService } from '../../../core/services/api.service';
import { AnalyticsService } from '../../../core/services/analytics.service';

/**
 * First-party FIRE Africa newsletter capture. On submit it POSTs the email to
 * /newsletter/subscribe (stored first-party, then best-effort forwarded to
 * Beehiiv) and fires a cookieless `newsletter_signup` public event.
 *
 * Drop it anywhere with a `source` (which surface captured the email:
 * site-footer | omaad-app-footer | blog-article | lead-magnet). `compact` gives
 * the single-row footer layout; the default is the boxed CTA. Bilingual copy is
 * inline (like footer-widget) so the widget stays self-contained.
 */
@Component({
    selector: 'app-newsletter-signup',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule],
    template: `
        @if (compact()) {
            <!-- Footer layout: tight, single row -->
            <div class="w-full">
                @if (done()) {
                    <div class="flex items-center gap-2 text-positive text-sm font-semibold" role="status">
                        <i class="pi pi-check-circle"></i> {{ _('Inscription confirmée. Regarde tes emails.', 'You are in. Check your inbox.') }}
                    </div>
                } @else {
                    <form (ngSubmit)="submit()" class="flex gap-2 max-w-sm">
                        <input type="email" name="email" [(ngModel)]="email" required
                               [placeholder]="_('Ton email', 'Your email')"
                               [attr.aria-label]="_('Ton email', 'Your email')"
                               [disabled]="submitting()"
                               [class]="tone() === 'surface'
                                   ? 'flex-1 px-3 py-2 rounded-lg bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-0 focus:border-ochre-500 outline-none'
                                   : 'flex-1 px-3 py-2 rounded-lg bg-warm-800 border border-warm-700 text-sm text-white placeholder-warm-400 focus:border-ochre-500 outline-none'" />
                        <button pButton type="submit" [loading]="submitting()"
                                [label]="_('OK', 'OK')"
                                class="!rounded-lg !px-4 !py-2 !border-0 !bg-ochre-500 hover:!bg-ochre-400 !text-warm-900 !font-semibold whitespace-nowrap"></button>
                    </form>
                    @if (errorMsg()) { <p class="text-negative text-xs mt-2" role="alert">{{ errorMsg() }}</p> }
                }
            </div>
        } @else {
            <!-- Boxed CTA (blog, landing) -->
            <div class="rounded-2xl bg-brand-950 dark:bg-surface-900 border border-transparent dark:border-surface-800 p-7 text-center">
                @if (done()) {
                    <div class="flex flex-col items-center gap-2 py-2" role="status">
                        <i class="pi pi-check-circle text-positive text-2xl"></i>
                        <div class="text-base font-semibold text-white">{{ _('Bienvenue chez FIRE Africa', 'Welcome to FIRE Africa') }}</div>
                        <p class="text-sm text-brand-200 dark:text-surface-400 max-w-[42ch]">
                            {{ _('Regarde tes emails : ton guide et la méthode arrivent.', 'Check your inbox: your guide and the method are on the way.') }}
                        </p>
                    </div>
                } @else {
                    <div class="text-lg font-bold text-white mb-1.5">{{ _('Reçois la méthode FIRE Africa', 'Get the FIRE Africa method') }}</div>
                    <p class="text-sm text-brand-200 dark:text-surface-400 mb-5 max-w-[46ch] mx-auto">
                        {{ _('La newsletter (gratuite) + le guide pour ouvrir ton compte-titres et passer ton premier ordre proprement.', 'The free newsletter + the guide to open your securities account and place your first order cleanly.') }}
                    </p>
                    <form (ngSubmit)="submit()" class="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                        <input type="email" name="email" [(ngModel)]="email" required
                               [placeholder]="_('Ton email', 'Your email')"
                               [attr.aria-label]="_('Ton email', 'Your email')"
                               [disabled]="submitting()"
                               class="flex-1 px-4 py-3 rounded-xl bg-surface-0/10 border border-white/20 text-sm text-white placeholder-brand-200 focus:border-ochre-400 outline-none" />
                        <button pButton type="submit" [loading]="submitting()"
                                [label]="submitting() ? _('Envoi...', 'Sending...') : _('S\\'abonner', 'Subscribe')"
                                class="!rounded-xl !px-6 !py-3 !border-0 !bg-ochre-500 hover:!bg-ochre-400 !text-warm-900 !font-semibold whitespace-nowrap"></button>
                    </form>
                    @if (errorMsg()) { <p class="text-negative text-sm mt-3" role="alert">{{ errorMsg() }}</p> }
                    <p class="text-[11px] text-brand-300 dark:text-surface-500 mt-4 max-w-[46ch] mx-auto">
                        {{ _('Contenu éducatif, zéro spam. Désinscription en un clic.', 'Educational content, zero spam. One-click unsubscribe.') }}
                    </p>
                }
            </div>
        }
    `
})
export class NewsletterSignup {
    private i18n = inject(I18nService);
    private api = inject(ApiService);
    private analytics = inject(AnalyticsService);

    /** Capture surface (backend NEWSLETTER_SOURCES). */
    source = input<string>('site-footer');
    /** Optional Beehiiv utm_campaign (e.g. a blog slug or landing block). */
    campaign = input<string | undefined>(undefined);
    /** Footer (single-row) vs boxed CTA. */
    compact = input<boolean>(false);
    /** Input skin for compact mode: 'dark' (site footer) | 'surface' (in-app footer). */
    tone = input<'dark' | 'surface'>('dark');

    email = '';
    submitting = signal(false);
    done = signal(false);
    errorMsg = signal<string | null>(null);

    private readonly EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    _(fr: string, en: string): string { return this.i18n.lang() === 'fr' ? fr : en; }

    submit(): void {
        this.errorMsg.set(null);
        const email = this.email.trim();
        if (!this.EMAIL_RE.test(email)) {
            this.errorMsg.set(this._('Adresse email invalide.', 'Invalid email address.'));
            return;
        }
        this.submitting.set(true);
        this.api.subscribeNewsletter({
            email,
            source: this.source(),
            locale: this.i18n.lang(),
            // On-site captures share one utm_source; the surface rides in
            // utm_medium so Beehiiv attribution separates web from YouTube.
            utm_source: 'omaad-site',
            utm_medium: this.source(),
            utm_campaign: this.campaign(),
        }).subscribe({
            next: () => {
                this.submitting.set(false);
                this.done.set(true);
                this.analytics.trackPublic('newsletter_signup', { source: this.source() });
            },
            error: () => {
                this.submitting.set(false);
                this.errorMsg.set(this._('Une erreur est survenue. Réessaie.', 'Something went wrong. Please try again.'));
            },
        });
    }
}
