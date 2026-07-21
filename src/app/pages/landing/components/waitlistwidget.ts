import { Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { I18nService } from '../../../i18n/i18n.service';
import { ApiService } from '../../../core/services/api.service';
import { AnalyticsService } from '../../../core/services/analytics.service';

/**
 * Reusable pre-launch waitlist capture (P4-ANALYTICS-1). First-party, no
 * cookie: on submit it POSTs the email to /leads and fires a cookieless
 * `waitlist_signup` public event. Drop it anywhere on the marketing site with
 * a `source` (which surface captured the email) and optional `variant`.
 */
@Component({
    selector: 'app-waitlist',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule],
    template: `
        <div class="rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-6 sm:p-8">
            <div class="max-w-xl mx-auto text-center">
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ochre-100 dark:bg-ochre-900/20 mb-4">
                    <i class="pi pi-bell text-ochre-600 dark:text-ochre-400 text-xs"></i>
                    <span class="text-ochre-700 dark:text-ochre-300 text-xs font-semibold uppercase tracking-wide">{{ t('waitlist.eyebrow') }}</span>
                </div>
                <h2 class="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-0 mb-2">
                    {{ variant() === 'simulator' ? t('waitlist.simulatorTitle') : t('waitlist.title') }}
                </h2>
                <p class="text-surface-500 dark:text-surface-400 text-sm sm:text-base mb-6">
                    {{ variant() === 'simulator' ? t('waitlist.simulatorSubtitle') : t('waitlist.subtitle') }}
                </p>

                @if (done()) {
                    <div class="flex items-center justify-center gap-2 text-positive font-semibold py-3" role="status">
                        <i class="pi pi-check-circle"></i> {{ t('waitlist.success') }}
                    </div>
                } @else {
                    <form (ngSubmit)="submit()" class="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                        <input type="email" name="email" [(ngModel)]="email" required
                               [placeholder]="t('waitlist.placeholder')"
                               [attr.aria-label]="t('waitlist.placeholder')"
                               [disabled]="submitting()"
                               class="flex-1 px-4 py-3 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-0 focus:border-brand-700 dark:focus:border-brand-300 outline-none" />
                        <button pButton type="submit" [loading]="submitting()"
                                [label]="submitting() ? t('waitlist.submitting') : t('waitlist.cta')"
                                class="omaad-cta !rounded-xl !px-6 !py-3 whitespace-nowrap"></button>
                    </form>
                    @if (errorMsg()) {
                        <p class="text-negative text-sm mt-3" role="alert">{{ errorMsg() }}</p>
                    }
                }
            </div>
        </div>
    `
})
export class WaitlistWidget {
    private i18n = inject(I18nService);
    private api = inject(ApiService);
    private analytics = inject(AnalyticsService);

    /** Which surface captured the email (backend LEAD_SOURCES): landing/footer/simulator/... */
    source = input<string>('landing');
    /** 'default' | 'simulator' — swaps the heading/subtitle copy. */
    variant = input<'default' | 'simulator'>('default');

    email = '';
    submitting = signal(false);
    done = signal(false);
    errorMsg = signal<string | null>(null);

    private readonly EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    t(key: string): string { return this.i18n.t(key); }

    submit(): void {
        this.errorMsg.set(null);
        const email = this.email.trim();
        if (!this.EMAIL_RE.test(email)) {
            this.errorMsg.set(this.t('waitlist.invalidEmail'));
            return;
        }
        this.submitting.set(true);
        this.api.submitLead(email, this.source(), this.i18n.lang()).subscribe({
            next: () => {
                this.submitting.set(false);
                this.done.set(true);
                this.analytics.trackPublic('waitlist_signup', { source: this.source() });
            },
            error: () => {
                this.submitting.set(false);
                this.errorMsg.set(this.t('waitlist.error'));
            },
        });
    }
}
