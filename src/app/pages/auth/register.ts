import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { DividerModule } from 'primeng/divider';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [ButtonModule, CheckboxModule, InputTextModule, PasswordModule, FormsModule, RouterModule, RippleModule, DividerModule, CommonModule, ToastModule],
    providers: [MessageService],
    template: `
        <p-toast position="top-center"></p-toast>
        <div class="min-h-screen flex">
            <!-- Left Side - Register Form -->
            <div class="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12 bg-surface-0 dark:bg-surface-950">
                <!-- Logo -->
                <div class="mb-12">
                    <a [routerLink]="[currentLang, 'landing']" class="flex items-center gap-3 cursor-pointer group">
                        <svg viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg" 
                             class="w-10 h-10 transition-transform duration-300 group-hover:scale-110">
                            <g transform="translate(0,300) scale(0.1,-0.1)" class="fill-indigo-600 dark:fill-indigo-400" stroke="none">
                                <path d="M1655 2196 c-369 -369 -532 -540 -505 -526 14 7 178 165 365 351 188
                            187 344 339 348 339 4 0 7 -52 7 -115 l0 -114 -219 -221 c-121 -121 -223 -229
                            -226 -240 -6 -19 -16 -20 -161 -20 l-154 0 0 -230 0 -230 178 0 177 0 218 218
                            217 217 0 150 0 150 -301 -300 c-201 -200 -299 -292 -295 -275 3 14 6 53 6 88
                            l0 63 57 -2 56 -3 -2 74 -2 73 241 242 241 241 -3 156 -3 156 -240 -242z m205
                            -468 l0 -92 -203 -203 -202 -203 -152 0 -152 0 -6 43 c-7 53 0 321 9 336 5 7
                            47 11 112 11 103 0 105 0 116 -26 16 -35 0 -57 -46 -65 -20 -3 -43 -15 -51
                            -25 -18 -23 -20 -123 -3 -159 25 -56 46 -41 313 225 137 137 253 250 258 250
                            4 0 7 -41 7 -92z"/>
                                <path d="M520 827 l0 -182 40 0 40 0 0 72 0 73 80 0 80 0 0 36 0 36 -80 -4
                            -80 -3 0 43 0 42 90 0 90 0 0 35 0 35 -130 0 -130 0 0 -183z"/>
                                <path d="M842 829 l3 -181 38 -3 37 -2 0 184 0 183 -40 0 -40 0 2 -181z"/>
                                <path d="M1010 827 l0 -184 38 2 37 3 -4 128 -3 129 77 -120 c42 -66 80 -124
                            85 -129 5 -5 25 -10 44 -11 l36 -2 0 184 0 183 -36 0 -35 0 3 -125 c2 -69 2
                            -125 1 -125 -1 0 -38 56 -83 125 -82 125 -82 125 -121 125 l-39 0 0 -183z"/>
                                <path d="M1485 991 c-155 -96 -108 -334 70 -349 29 -2 69 1 88 7 46 16 104 80
                            113 126 17 91 -22 187 -89 218 -48 23 -143 22 -182 -2z"/>
                                <path d="M1780 1003 c0 -5 29 -86 64 -182 l63 -174 44 0 43 0 58 159 c31 87
                            62 169 67 182 10 21 8 22 -32 22 l-43 0 -46 -137 c-25 -76 -48 -131 -51 -123
                            -3 8 -25 70 -48 138 l-42 122 -38 0 c-22 0 -39 -3 -39 -7z"/>
                                <path d="M2166 838 c-37 -95 -70 -178 -72 -185 -4 -8 7 -11 37 -8 38 3 44 6
                            57 39 l14 36 72 0 73 0 11 -38 c11 -35 14 -37 52 -37 22 0 40 1 40 4 0 2 -29
                            79 -65 172 -36 92 -65 172 -65 178 0 6 -19 11 -44 11 l-43 0 -67 -172z"/>
                            </g>
                        </svg>
                        <span class="font-bold text-xl text-surface-900 dark:text-surface-0 tracking-tight">Afrin Nexus</span>
                    </a>
                </div>

                <!-- Register Form -->
                <div class="max-w-md">
                    <h1 class="text-3xl md:text-4xl font-bold text-surface-900 dark:text-surface-0 mb-2">
                        Bienvenue sur Afrin Nexus
                    </h1>
                    <p class="text-surface-600 dark:text-surface-400 mb-8">
                        Déjà un compte ?
                        <a [routerLink]="[currentLang, 'auth', 'login']" class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium cursor-pointer">
                            Se connecter <i class="pi pi-chevron-right text-xs"></i>
                        </a>
                    </p>

                    <!-- Social Login Buttons -->
                    <div class="space-y-3 mb-6">
                        <button pButton pRipple
                                (click)="registerWithGoogle()"
                                [loading]="isGoogleLoading()"
                                class="w-full !bg-blue-600 hover:!bg-blue-700 !border-0 !py-3 !text-base !font-medium flex items-center justify-center gap-3">
                            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
                            </svg>
                            Continuer avec Google
                        </button>
                    </div>

                    <!-- Divider -->
                    <div class="flex items-center gap-4 my-8">
                        <div class="flex-1 h-px bg-surface-200 dark:bg-surface-700"></div>
                        <span class="text-surface-400 dark:text-surface-500 text-sm uppercase tracking-wider">ou par email</span>
                        <div class="flex-1 h-px bg-surface-200 dark:bg-surface-700"></div>
                    </div>

                    <!-- Registration Form -->
                    <form (ngSubmit)="onSubmit()" class="space-y-6">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label for="firstName" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">Prénom</label>
                                <input pInputText id="firstName" type="text"
                                       placeholder="Mbaye"
                                       class="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3
                                              focus:!border-indigo-500 focus:!shadow-none"
                                       [(ngModel)]="firstName" name="firstName" />
                            </div>
                            <div>
                                <label for="lastName" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">Nom</label>
                                <input pInputText id="lastName" type="text"
                                       placeholder="Sene"
                                       class="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3
                                              focus:!border-indigo-500 focus:!shadow-none"
                                       [(ngModel)]="lastName" name="lastName" />
                            </div>
                        </div>

                        <div>
                            <label for="email" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">Adresse email</label>
                            <input pInputText id="email" type="email"
                                   placeholder="vous@exemple.com"
                                   class="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3
                                          focus:!border-indigo-500 focus:!shadow-none"
                                   [(ngModel)]="email" name="email" required 
                                   [disabled]="isLoading()" />
                        </div>

                        <div>
                            <label for="password" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">Mot de passe</label>
                            <p-password id="password"
                                        [(ngModel)]="password"
                                        name="password"
                                        placeholder="Créez un mot de passe fort"
                                        [toggleMask]="true" 
                                        [feedback]="true"
                                        [disabled]="isLoading()"
                                        styleClass="w-full"
                                        inputStyleClass="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3 focus:!border-indigo-500 focus:!shadow-none">
                            </p-password>
                        </div>

                        <div>
                            <label for="confirmPassword" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">Confirmer le mot de passe</label>
                            <p-password id="confirmPassword"
                                        [(ngModel)]="confirmPassword"
                                        name="confirmPassword"
                                        placeholder="Confirmez votre mot de passe"
                                        [toggleMask]="true" 
                                        [feedback]="false"
                                        [disabled]="isLoading()"
                                        styleClass="w-full"
                                        inputStyleClass="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3 focus:!border-indigo-500 focus:!shadow-none">
                            </p-password>
                        </div>

                        <!-- Password mismatch warning -->
                        @if (password && confirmPassword && password !== confirmPassword) {
                            <div class="text-red-500 text-sm flex items-center gap-2">
                                <i class="pi pi-exclamation-circle"></i>
                                Les mots de passe ne correspondent pas
                            </div>
                        }

                        <!-- Terms Checkbox -->
                        <div class="flex items-start gap-3">
                            <p-checkbox [(ngModel)]="acceptTerms" [binary]="true" inputId="terms" name="terms" [disabled]="isLoading()"></p-checkbox>
                            <label for="terms" class="text-surface-600 dark:text-surface-400 text-sm leading-relaxed cursor-pointer">
                                J'accepte les
                                <a class="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">Conditions d'utilisation</a>
                                et la
                                <a class="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">Politique de confidentialité</a>
                            </label>
                        </div>

                        <button pButton pRipple label="Créer mon compte"
                                type="submit"
                                [loading]="isLoading()"
                                class="w-full !py-3 !text-base !font-semibold !border-0 transition-all duration-300"
                                [ngClass]="{
                                    '!bg-gradient-to-r !from-indigo-600 !to-cyan-500 !text-white hover:!shadow-lg hover:!shadow-indigo-500/25': isFormValid && !isLoading(),
                                    '!bg-surface-300 dark:!bg-surface-700 !text-surface-500 dark:!text-surface-400': !isFormValid || isLoading()
                                }"
                                [disabled]="!isFormValid || isLoading()">
                        </button>
                    </form>
                </div>
            </div>

            <!-- Right Side - Showcase Image -->
            <div class="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden">
                <!-- Background Effects -->
                <div class="absolute inset-0">
                    <div class="absolute inset-0 opacity-10" 
                         style="background-image: linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px); background-size: 40px 40px;">
                    </div>
                    <div class="absolute top-1/3 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
                    <div class="absolute bottom-1/3 left-1/4 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"></div>
                </div>

                <!-- Content -->
                <div class="relative z-10 flex flex-col justify-center items-center p-12 w-full">
                    <!-- Illustration -->
                    <div class="relative w-full max-w-lg mb-12">
                        <!-- Main Card -->
                        <div class="bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 shadow-2xl">
                            <div class="flex items-center gap-4 mb-6">
                                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
                                    <i class="pi pi-user text-white text-xl"></i>
                                </div>
                                <div>
                                    <div class="text-white font-semibold">Bienvenue sur Afrin Nexus</div>
                                    <div class="text-slate-400 text-sm">Votre voyage financier commence ici</div>
                                </div>
                            </div>

                            <!-- Progress Steps -->
                            <div class="space-y-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                                        <i class="pi pi-check text-white text-sm"></i>
                                    </div>
                                    <div class="flex-1">
                                        <div class="text-white text-sm font-medium">Créez votre compte</div>
                                        <div class="text-slate-400 text-xs">Configurez votre profil en quelques minutes</div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-sm font-medium">2</div>
                                    <div class="flex-1">
                                        <div class="text-slate-300 text-sm font-medium">Ajoutez vos actifs</div>
                                        <div class="text-slate-500 text-xs">Saisissez vos biens et placements</div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-sm font-medium">3</div>
                                    <div class="flex-1">
                                        <div class="text-slate-300 text-sm font-medium">Suivez votre progression</div>
                                        <div class="text-slate-500 text-xs">Visualisez votre chemin vers la liberté</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Floating Badge -->
                        <div class="absolute -top-4 -right-4 bg-gradient-to-r from-indigo-600 to-cyan-500 rounded-xl px-4 py-2 shadow-lg">
                            <div class="text-white font-bold text-lg">100%</div>
                            <div class="text-white/80 text-xs">Pour toujours</div>
                        </div>
                    </div>

                    <!-- Text Content -->
                    <div class="text-center">
                        <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">
                            Votre chemin vers
                            <br><span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">l'indépendance financière</span>
                        </h2>
                        <p class="text-slate-400 max-w-md mx-auto mb-8">
                            Prenez le contrôle de vos finances et construisez votre chemin vers la retraite anticipée.
                        </p>

                        <!-- Value Props -->
                        <div class="flex items-center justify-center gap-8 text-slate-400 text-sm">
                            <div class="flex flex-col items-center gap-2">
                                <div class="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                    <i class="pi pi-lock text-indigo-400 text-lg"></i>
                                </div>
                                <span>Sécurisé</span>
                            </div>
                            <div class="flex flex-col items-center gap-2">
                                <div class="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                                    <i class="pi pi-shield text-cyan-400 text-lg"></i>
                                </div>
                                <span>Confidentiel</span>
                            </div>
                            <div class="flex flex-col items-center gap-2">
                                <div class="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                    <i class="pi pi-star text-emerald-400 text-lg"></i>
                                </div>
                                <span>Gratuit</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class Register {
    private authService = inject(AuthService);
    private router = inject(Router);
    private messageService = inject(MessageService);

    firstName = '';
    lastName = '';
    email = '';
    password = '';
    confirmPassword = '';
    acceptTerms = false;
    currentLang = '/fr';

    isLoading = signal(false);
    isGoogleLoading = signal(false);

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        this.currentLang = '/' + (match ? match[1] : 'fr');
    }

    get isFormValid(): boolean {
        return !!(
            this.email && 
            this.password && 
            this.confirmPassword && 
            this.acceptTerms && 
            this.password === this.confirmPassword &&
            this.password.length >= 8
        );
    }

    onSubmit(): void {
        if (!this.isFormValid) return;

        this.isLoading.set(true);
        this.authService.register({
            email: this.email,
            password: this.password,
            first_name: this.firstName || undefined,
            last_name: this.lastName || undefined,
            preferred_language: this.currentLang.replace('/', '') || 'fr'
        }).subscribe({
            next: () => {
                this.isLoading.set(false);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Account Created!',
                    detail: 'Your account has been created successfully. Please log in.',
                    life: 4000
                });
                // Clear the token - user should login manually
                this.authService.logout();
                // Redirect to login page after a short delay
                setTimeout(() => {
                    this.router.navigate([this.currentLang, 'auth', 'login']);
                }, 1500);
            },
            error: (error) => {
                this.isLoading.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Registration Failed',
                    detail: error.message || 'Could not create account',
                    life: 5000
                });
            }
        });
    }

    registerWithGoogle(): void {
        this.isGoogleLoading.set(true);
        this.authService.loginWithGoogle();
    }
}
