import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../i18n/i18n.service';

type VerifyState = 'verifying' | 'success' | 'error' | 'no-token';

@Component({
    selector: 'app-verify-email',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, RippleModule],
    template: `
        <div class="min-h-screen flex items-center justify-center px-6 py-12 bg-surface-0 dark:bg-surface-950">
            <div class="w-full max-w-md text-center">
                <a [routerLink]="[currentLang, 'landing']" class="inline-flex items-center gap-3 mb-10">
                    <img src="assets/brand/omaad-icon.svg" alt="Omaad" class="w-10 h-10">
                    <span class="font-bold text-xl text-surface-900 dark:text-surface-0 tracking-tight">Omaad Wealth</span>
                </a>

                <div *ngIf="state() === 'verifying'" class="py-6">
                    <i class="pi pi-spin pi-spinner text-3xl text-brand-700 dark:text-ochre-400" aria-hidden="true"></i>
                    <p class="mt-4 text-surface-600 dark:text-surface-400">{{ t('auth.verify.verifying') }}</p>
                </div>

                <div *ngIf="state() === 'success'" class="py-6">
                    <i class="pi pi-check-circle text-4xl text-positive" aria-hidden="true"></i>
                    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0 mt-4 mb-2">{{ t('auth.verify.successTitle') }}</h1>
                    <p class="text-surface-600 dark:text-surface-400 mb-8">{{ t('auth.verify.successDesc') }}</p>
                    <a [routerLink]="[currentLang, 'dashboard']" pButton pRipple class="p-button w-full" [label]="t('auth.verify.goToApp')"></a>
                </div>

                <div *ngIf="state() === 'error' || state() === 'no-token'" class="py-6">
                    <i class="pi pi-times-circle text-4xl text-negative" aria-hidden="true"></i>
                    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0 mt-4 mb-2">{{ t('auth.verify.errorTitle') }}</h1>
                    <p class="text-surface-600 dark:text-surface-400 mb-8">
                        {{ state() === 'no-token' ? t('auth.verify.invalidLink') : t('auth.verify.errorDesc') }}
                    </p>
                    <button *ngIf="canResend()" pButton pRipple type="button"
                            class="p-button w-full mb-3" [loading]="busy()"
                            [label]="t('auth.verify.resend')" (click)="resend()"></button>
                    <p *ngIf="resent()" class="text-sm text-positive mb-3">{{ t('auth.verify.resendSent') }}</p>
                    <a [routerLink]="[currentLang, 'auth', 'login']" class="text-sm text-brand-700 dark:text-ochre-400 hover:underline">{{ t('auth.verify.backToLogin') }}</a>
                </div>
            </div>
        </div>
    `,
})
export class VerifyEmail {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private authService = inject(AuthService);
    private i18n = inject(I18nService);

    readonly state = signal<VerifyState>('verifying');
    readonly busy = signal(false);
    readonly resent = signal(false);

    // Only offer resend if the user is signed in (resend endpoint is auth'd).
    readonly canResend = () => this.authService.isAuthenticated();

    currentLang = '/fr';
    t(key: string): string { return this.i18n.t(key); }

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        this.currentLang = '/' + (match ? match[1] : 'fr');
        const token = this.route.snapshot.queryParamMap.get('token');
        if (!token) {
            this.state.set('no-token');
            return;
        }
        this.authService.verifyEmail(token).subscribe({
            next: () => this.state.set('success'),
            error: () => this.state.set('error'),
        });
    }

    resend(): void {
        if (this.busy()) return;
        this.busy.set(true);
        this.authService.resendVerification().subscribe({
            next: () => { this.busy.set(false); this.resent.set(true); },
            error: () => { this.busy.set(false); this.resent.set(true); },  // never leak state
        });
    }
}
