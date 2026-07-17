import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../i18n/i18n.service';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [ButtonModule, InputTextModule, FormsModule, RouterModule, RippleModule, CommonModule, ToastModule],
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
                    {{ t('auth.forgot.title') }}
                </h1>
                <p class="text-surface-600 dark:text-surface-400 mb-8">
                    {{ t('auth.forgot.intro') }}
                </p>

                <form *ngIf="!submitted()" (ngSubmit)="onSubmit()" class="space-y-6">
                    <div>
                        <label for="email" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">{{ t('auth.forgot.emailLabel') }}</label>
                        <input pInputText id="email" type="email"
                               [placeholder]="t('auth.forgot.emailPlaceholder')"
                               class="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3
                                      focus:!border-brand-700 focus:!shadow-none"
                               [(ngModel)]="email" name="email" required
                               [disabled]="isLoading()" />
                    </div>

                    <button pButton pRipple [label]="t('auth.forgot.submit')"
                            type="submit"
                            [loading]="isLoading()"
                            class="w-full !rounded-full !py-3 !text-base !font-semibold omaad-cta disabled:opacity-50"
                            [disabled]="!email || isLoading()">
                    </button>
                </form>

                <div *ngIf="submitted()" class="rounded-xl border border-surface-200 dark:border-surface-700 p-6 bg-surface-50 dark:bg-surface-900">
                    <div class="flex items-start gap-3">
                        <i class="pi pi-envelope text-brand-700 dark:text-brand-300 text-xl mt-1"></i>
                        <div>
                            <p class="text-surface-900 dark:text-surface-0 font-medium mb-1">{{ t('auth.forgot.checkMailTitle') }}</p>
                            <p class="text-surface-600 dark:text-surface-400 text-sm">
                                {{ t('auth.forgot.checkMailBefore') }} <strong>{{ email }}</strong>{{ t('auth.forgot.checkMailAfter') }}
                            </p>
                        </div>
                    </div>
                </div>

                <div class="text-center mt-8">
                    <a [routerLink]="[currentLang, 'auth', 'login']"
                       class="text-brand-700 dark:text-brand-300 hover:text-brand-500 dark:hover:text-brand-200 font-medium cursor-pointer text-sm">
                        <i class="pi pi-chevron-left text-xs"></i> {{ t('auth.forgot.backToLogin') }}
                    </a>
                </div>
            </div>
        </div>
    `
})
export class ForgotPassword {
    private authService = inject(AuthService);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private i18n = inject(I18nService);

    t(key: string): string { return this.i18n.t(key); }

    email = '';
    currentLang = '/fr';

    isLoading = signal(false);
    submitted = signal(false);

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        this.currentLang = '/' + (match ? match[1] : 'fr');
    }

    onSubmit(): void {
        if (!this.email) return;

        this.isLoading.set(true);
        this.authService.forgotPassword(this.email).subscribe({
            next: () => {
                this.isLoading.set(false);
                this.submitted.set(true);
            },
            error: (error) => {
                this.isLoading.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: this.t('auth.forgot.errSummary'),
                    detail: error.message || this.t('auth.forgot.errDetail'),
                    life: 5000
                });
            }
        });
    }
}
