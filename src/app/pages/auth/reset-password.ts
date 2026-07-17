import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../i18n/i18n.service';

@Component({
    selector: 'app-reset-password',
    standalone: true,
    imports: [ButtonModule, PasswordModule, FormsModule, RouterModule, RippleModule, CommonModule, ToastModule],
    providers: [MessageService],
    template: `
        <p-toast position="top-center"></p-toast>
        <div class="min-h-screen flex items-center justify-center px-6 py-12 bg-surface-0 dark:bg-surface-950">
            <div class="w-full max-w-md">
                <div class="mb-10">
                    <a [routerLink]="[currentLang, 'landing']" class="flex items-center gap-3 cursor-pointer group">
                        <img src="assets/brand/omaad-icon.svg" alt="Omaad Logo"
                             class="w-10 h-10">
                        <span class="font-bold text-xl text-surface-900 dark:text-surface-0 tracking-tight">Omaad Wealth</span>
                    </a>
                </div>

                <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0 mb-2">
                    {{ t('auth.reset.title') }}
                </h1>
                <p class="text-surface-600 dark:text-surface-400 mb-8">
                    {{ t('auth.reset.intro') }}
                </p>

                <div *ngIf="!token" class="rounded-xl border border-negative/30 bg-negative/5 p-4 mb-6 text-sm text-surface-700 dark:text-surface-300">
                    {{ t('auth.reset.invalidLink') }}
                </div>

                <form *ngIf="token && !success()" (ngSubmit)="onSubmit()" class="space-y-6">
                    <div>
                        <label for="newPassword" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">{{ t('auth.reset.newLabel') }}</label>
                        <p-password id="newPassword"
                                    [(ngModel)]="newPassword"
                                    name="newPassword"
                                    [placeholder]="t('auth.reset.newPlaceholder')"
                                    [toggleMask]="true"
                                    [feedback]="true"
                                    [disabled]="isLoading()"
                                    styleClass="w-full"
                                    inputStyleClass="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3 focus:!border-brand-700 focus:!shadow-none">
                        </p-password>
                    </div>

                    <div>
                        <label for="confirmPassword" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">{{ t('auth.reset.confirmLabel') }}</label>
                        <p-password id="confirmPassword"
                                    [(ngModel)]="confirmPassword"
                                    name="confirmPassword"
                                    [placeholder]="t('auth.reset.confirmPlaceholder')"
                                    [toggleMask]="true"
                                    [feedback]="false"
                                    [disabled]="isLoading()"
                                    styleClass="w-full"
                                    inputStyleClass="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3 focus:!border-brand-700 focus:!shadow-none">
                        </p-password>
                        <p *ngIf="confirmPassword && confirmPassword !== newPassword"
                           class="text-negative text-xs mt-2">
                            {{ t('auth.reset.mismatch') }}
                        </p>
                    </div>

                    <button pButton pRipple [label]="t('auth.reset.submit')"
                            type="submit"
                            [loading]="isLoading()"
                            class="w-full !rounded-full !py-3 !text-base !font-semibold omaad-cta disabled:opacity-50"
                            [disabled]="!canSubmit() || isLoading()">
                    </button>
                </form>

                <div *ngIf="success()" class="rounded-xl border border-positive/30 bg-positive/5 p-6">
                    <div class="flex items-start gap-3">
                        <i class="pi pi-check-circle text-positive text-xl mt-1"></i>
                        <div>
                            <p class="text-surface-900 dark:text-surface-0 font-medium mb-1">{{ t('auth.reset.successTitle') }}</p>
                            <p class="text-surface-600 dark:text-surface-400 text-sm">
                                {{ t('auth.reset.successDesc') }}
                            </p>
                        </div>
                    </div>
                </div>

                <div class="text-center mt-8">
                    <a [routerLink]="[currentLang, 'auth', 'login']"
                       class="text-brand-700 dark:text-brand-300 hover:text-brand-500 dark:hover:text-brand-200 font-medium cursor-pointer text-sm">
                        <i class="pi pi-chevron-left text-xs"></i> {{ t('auth.reset.backToLogin') }}
                    </a>
                </div>
            </div>
        </div>
    `
})
export class ResetPassword {
    private authService = inject(AuthService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private messageService = inject(MessageService);
    private i18n = inject(I18nService);

    t(key: string): string { return this.i18n.t(key); }

    token = '';
    newPassword = '';
    confirmPassword = '';
    currentLang = '/fr';

    isLoading = signal(false);
    success = signal(false);

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        this.currentLang = '/' + (match ? match[1] : 'fr');
        this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    }

    canSubmit(): boolean {
        return (
            this.newPassword.length >= 8 &&
            this.newPassword === this.confirmPassword
        );
    }

    onSubmit(): void {
        if (!this.canSubmit() || !this.token) return;

        this.isLoading.set(true);
        this.authService.resetPassword(this.token, this.newPassword).subscribe({
            next: () => {
                this.isLoading.set(false);
                this.success.set(true);
                setTimeout(() => {
                    this.router.navigate([this.currentLang, 'auth', 'login'], { replaceUrl: true });
                }, 2000);
            },
            error: (error) => {
                this.isLoading.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: this.t('auth.reset.errSummary'),
                    detail: error.message || this.t('auth.reset.errDetail'),
                    life: 6000
                });
            }
        });
    }
}
