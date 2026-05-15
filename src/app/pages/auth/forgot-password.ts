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
                             class="w-10 h-10 transition-transform duration-300 group-hover:scale-110">
                        <span class="font-bold text-xl text-surface-900 dark:text-surface-0 tracking-tight">Omaad Wealth</span>
                    </a>
                </div>

                <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0 mb-2">
                    Mot de passe oublié ?
                </h1>
                <p class="text-surface-600 dark:text-surface-400 mb-8">
                    Entrez votre adresse email. Si un compte existe, nous vous enverrons un lien
                    pour choisir un nouveau mot de passe.
                </p>

                <form *ngIf="!submitted()" (ngSubmit)="onSubmit()" class="space-y-6">
                    <div>
                        <label for="email" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">Adresse email</label>
                        <input pInputText id="email" type="email"
                               placeholder="Votre adresse email"
                               class="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3
                                      focus:!border-brand-700 focus:!shadow-none"
                               [(ngModel)]="email" name="email" required
                               [disabled]="isLoading()" />
                    </div>

                    <button pButton pRipple label="Envoyer le lien"
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
                            <p class="text-surface-900 dark:text-surface-0 font-medium mb-1">Vérifiez votre boîte mail</p>
                            <p class="text-surface-600 dark:text-surface-400 text-sm">
                                Si un compte est associé à <strong>{{ email }}</strong>, vous recevrez
                                un email contenant un lien pour réinitialiser votre mot de passe.
                                Le lien expire dans 30 minutes.
                            </p>
                        </div>
                    </div>
                </div>

                <div class="text-center mt-8">
                    <a [routerLink]="[currentLang, 'auth', 'login']"
                       class="text-brand-700 dark:text-brand-300 hover:text-brand-500 dark:hover:text-brand-200 font-medium cursor-pointer text-sm">
                        <i class="pi pi-chevron-left text-xs"></i> Retour à la connexion
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
                    summary: 'Erreur',
                    detail: error.message || 'Impossible d\'envoyer le lien. Réessayez plus tard.',
                    life: 5000
                });
            }
        });
    }
}
