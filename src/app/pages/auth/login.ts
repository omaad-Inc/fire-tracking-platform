import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
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
    selector: 'app-login',
    standalone: true,
    imports: [ButtonModule, CheckboxModule, InputTextModule, PasswordModule, FormsModule, RouterModule, RippleModule, DividerModule, CommonModule, ToastModule],
    providers: [MessageService],
    template: `
        <p-toast position="top-center"></p-toast>
        <div class="min-h-screen flex">
            <!-- Left Side - Login Form -->
            <div class="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12 bg-surface-0 dark:bg-surface-950">
                <!-- Logo -->
                <div class="mb-12">
                    <a [routerLink]="[currentLang, 'landing']" class="flex items-center gap-3 cursor-pointer group">
                        <img src="assets/omaad-logo.svg" alt="Omaad Logo"
                             class="w-10 h-10 transition-transform duration-300 group-hover:scale-110">
                        <span class="font-bold text-xl text-surface-900 dark:text-surface-0 tracking-tight">Omaad Wealth</span>
                    </a>
                </div>

                <!-- Login Form -->
                <div class="max-w-md">
                    <h1 class="text-3xl md:text-4xl font-bold text-surface-900 dark:text-surface-0 mb-2">
                        Connectez-vous à votre compte
                    </h1>
                    <p class="text-surface-600 dark:text-surface-400 mb-8">
                        Pas encore de compte ?
                        <a [routerLink]="[currentLang, 'auth', 'register']" class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium cursor-pointer">
                            S'inscrire <i class="pi pi-chevron-right text-xs"></i>
                        </a>
                    </p>

                    <!-- Social Login Buttons -->
                    <div class="space-y-3 mb-6">
                        <button pButton pRipple
                                (click)="loginWithGoogle()"
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

                    <!-- Email & Password Form -->
                    <form (ngSubmit)="onSubmit()" class="space-y-6">
                        <div>
                            <label for="email" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">Adresse email</label>
                            <input pInputText id="email" type="email"
                                   placeholder="Votre adresse email"
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
                                        placeholder="Votre mot de passe"
                                        [toggleMask]="true" 
                                        [feedback]="false"
                                        [disabled]="isLoading()"
                                        styleClass="w-full"
                                        inputStyleClass="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3 focus:!border-indigo-500 focus:!shadow-none">
                            </p-password>
                        </div>

                        <button pButton pRipple label="Se connecter"
                                type="submit"
                                [loading]="isLoading()"
                                class="w-full !py-3 !text-base !font-semibold !bg-surface-300 dark:!bg-surface-700 
                                       !text-surface-500 dark:!text-surface-400 !border-0 
                                       hover:!bg-indigo-600 hover:!text-white transition-all duration-300
                                       disabled:opacity-50"
                                [disabled]="!email || !password || isLoading()">
                        </button>

                        <div class="text-center">
                            <a class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium cursor-pointer text-sm">
                                Mot de passe oublié ?
                            </a>
                        </div>
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
                    <div class="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>
                    <div class="absolute bottom-1/4 left-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl"></div>
                </div>

                <!-- Content -->
                <div class="relative z-10 flex flex-col justify-center items-center p-12 w-full">
                    <!-- Dashboard Mockups -->
                    <div class="relative w-full max-w-2xl">
                        <!-- Desktop Mockup -->
                        <div class="bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 shadow-2xl transform rotate-1">
                            <!-- Browser Header -->
                            <div class="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700/50">
                                <div class="flex gap-1.5">
                                    <div class="w-3 h-3 rounded-full bg-red-500/80"></div>
                                    <div class="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                    <div class="w-3 h-3 rounded-full bg-green-500/80"></div>
                                </div>
                                <div class="flex-1 flex justify-center">
                                    <div class="bg-slate-700/50 rounded-lg px-4 py-1 text-slate-400 text-xs flex items-center gap-2">
                                        <i class="pi pi-lock text-emerald-400"></i>
                                        omaad.app
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Dashboard Content -->
                            <div class="grid grid-cols-3 gap-3 mb-4">
                                <div class="col-span-1 space-y-2">
                                    <div class="bg-slate-700/50 rounded-lg p-3">
                                        <div class="text-slate-400 text-xs mb-1">Dashboard</div>
                                        <div class="h-2 bg-indigo-500/30 rounded"></div>
                                    </div>
                                    <div class="bg-slate-700/50 rounded-lg p-3">
                                        <div class="text-slate-400 text-xs mb-1">Portfolio</div>
                                        <div class="h-2 bg-slate-600 rounded"></div>
                                    </div>
                                    <div class="bg-slate-700/50 rounded-lg p-3">
                                        <div class="text-slate-400 text-xs mb-1">Insights</div>
                                        <div class="h-2 bg-slate-600 rounded"></div>
                                    </div>
                                </div>
                                <div class="col-span-2 bg-slate-700/30 rounded-lg p-4">
                                    <div class="text-slate-400 text-xs mb-1">Patrimoine Net</div>
                                    <div class="text-2xl font-bold text-white mb-3">85,6M FCFA</div>
                                    <div class="flex items-center gap-2 text-xs mb-4">
                                        <span class="text-emerald-400">+5,2M</span>
                                        <span class="text-emerald-400">+12.5%</span>
                                    </div>
                                    <!-- Mini Chart -->
                                    <div class="flex items-end justify-between h-16 gap-1">
                                        <div class="flex-1 bg-gradient-to-t from-indigo-600/50 to-indigo-400/50 rounded-t" style="height: 40%"></div>
                                        <div class="flex-1 bg-gradient-to-t from-indigo-600/50 to-indigo-400/50 rounded-t" style="height: 55%"></div>
                                        <div class="flex-1 bg-gradient-to-t from-indigo-600/50 to-indigo-400/50 rounded-t" style="height: 45%"></div>
                                        <div class="flex-1 bg-gradient-to-t from-indigo-600/50 to-cyan-400/50 rounded-t" style="height: 65%"></div>
                                        <div class="flex-1 bg-gradient-to-t from-cyan-600/50 to-cyan-400/50 rounded-t" style="height: 75%"></div>
                                        <div class="flex-1 bg-gradient-to-t from-cyan-600/50 to-emerald-400/50 rounded-t" style="height: 85%"></div>
                                        <div class="flex-1 bg-gradient-to-t from-emerald-600/50 to-emerald-400/50 rounded-t" style="height: 100%"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Mobile Mockup -->
                        <div class="absolute -bottom-8 -left-8 w-40 bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-3 shadow-2xl transform -rotate-6">
                            <div class="flex items-center justify-between mb-3">
                                <div class="w-6 h-6 rounded-full bg-slate-700"></div>
                                <div class="w-4 h-4 rounded-full bg-slate-700"></div>
                            </div>
                            <div class="text-white font-bold text-lg mb-1">85,6M FCFA</div>
                            <div class="flex items-center gap-1 text-xs mb-3">
                                <span class="text-emerald-400">+5,2M</span>
                                <span class="text-emerald-400">+12.5%</span>
                            </div>
                            <div class="space-y-2">
                                <div class="flex justify-between text-xs">
                                    <span class="text-slate-400">Total</span>
                                    <span class="text-slate-400">Net</span>
                                    <span class="text-slate-400">Financial</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Text Content -->
                    <div class="text-center mt-16">
                        <p class="text-xs font-semibold tracking-[0.15em] uppercase text-indigo-400 mb-4">
                            Construis. Protège. Règne.
                        </p>
                        <h2 class="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                            Devenez le roi<br>
                            <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">de votre patrimoine</span>
                        </h2>
                        <p class="text-slate-400 max-w-md mx-auto mb-10 leading-relaxed">
                            Patrimoine, épargne, dettes, objectif FIRE — tout est centralisé pour que vous preniez les bonnes décisions.
                        </p>

                        <!-- Value Props -->
                        <div class="flex items-center justify-center gap-6 text-slate-400 text-xs">
                            <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                                <i class="pi pi-lock text-indigo-400"></i>
                                <span>Sécurisé</span>
                            </div>
                            <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                                <i class="pi pi-heart text-emerald-400"></i>
                                <span>Gratuit</span>
                            </div>
                            <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                                <i class="pi pi-globe text-cyan-400"></i>
                                <span>Multi-devises</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class Login {
    private authService = inject(AuthService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private messageService = inject(MessageService);

    email = '';
    password = '';
    currentLang = '/fr';
    
    isLoading = signal(false);
    isGoogleLoading = signal(false);

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        this.currentLang = '/' + (match ? match[1] : 'fr');
    }

    onSubmit(): void {
        if (!this.email || !this.password) return;

        this.isLoading.set(true);
        this.authService.login({ email: this.email, password: this.password }).subscribe({
            next: (authResponse) => {
                // Verify token was received
                if (!authResponse?.access_token) {
                    this.isLoading.set(false);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Login Failed',
                        detail: 'Invalid response from server. Please try again.',
                        life: 5000
                    });
                    return;
                }
                
                // Token should be set by the login method via tap()
                // Verify it's actually saved
                setTimeout(() => {
                    const isAuth = this.authService.isAuthenticated();
                    console.log('Token saved check:', isAuth, 'Token:', authResponse.access_token.substring(0, 20) + '...');
                    
                    if (!isAuth) {
                        this.isLoading.set(false);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Login Failed',
                            detail: 'Failed to save authentication token. Please check browser console.',
                            life: 5000
                        });
                        return;
                    }
                    
                    // Navigate immediately - don't wait for getCurrentUser
                    // The dashboard will fetch user data if needed
                    this.isLoading.set(false);
                    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || this.currentLang;
                    this.router.navigate([returnUrl]);
                    
                    // Fetch user info in background (optional)
                    this.authService.getCurrentUser().subscribe({
                        next: () => {
                            console.log('User data fetched successfully');
                        },
                        error: (err) => {
                            // Don't fail login if getCurrentUser fails - token is valid
                            // User data will be fetched later by the dashboard
                            console.warn('Could not fetch user info immediately (non-critical):', err);
                        }
                    });
                }, 50); // Small delay to ensure localStorage write completes
            },
            error: (error) => {
                this.isLoading.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Login Failed',
                    detail: error.message || 'Invalid credentials',
                    life: 5000
                });
            }
        });
    }

    loginWithGoogle(): void {
        this.isGoogleLoading.set(true);
        this.authService.loginWithGoogle();
    }
}
