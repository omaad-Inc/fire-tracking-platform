import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { DividerModule } from 'primeng/divider';
import { CommonModule } from '@angular/common';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [ButtonModule, CheckboxModule, InputTextModule, PasswordModule, FormsModule, RouterModule, RippleModule, DividerModule, CommonModule, MessageModule],
    template: `
        <div class="min-h-screen flex">
            <!-- Left Side - Login Form -->
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

                <!-- Login Form -->
                <div class="max-w-md">
                    <h1 class="text-3xl md:text-4xl font-bold text-surface-900 dark:text-surface-0 mb-2">
                        Log in to your account
                    </h1>
                    <p class="text-surface-600 dark:text-surface-400 mb-8">
                        Don't have an account? 
                        <a [routerLink]="[currentLang, 'auth', 'register']" class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium cursor-pointer">
                            Sign up <i class="pi pi-chevron-right text-xs"></i>
                        </a>
                    </p>

                    <!-- Social Login Buttons -->
                    <div class="space-y-3 mb-6">
                        <button pButton pRipple 
                                class="w-full !bg-blue-600 hover:!bg-blue-700 !border-0 !py-3 !text-base !font-medium flex items-center justify-center gap-3">
                            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
                            </svg>
                            Continue with Google
                        </button>

                        <button pButton pRipple [outlined]="true"
                                class="w-full !py-3 !text-base !font-medium !border-surface-300 dark:!border-surface-600 
                                       !text-surface-900 dark:!text-surface-0 hover:!bg-surface-100 dark:hover:!bg-surface-800 
                                       flex items-center justify-center gap-3">
                            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                            </svg>
                            Continue with Apple
                        </button>
                    </div>

                    <!-- Divider -->
                    <div class="flex items-center gap-4 my-8">
                        <div class="flex-1 h-px bg-surface-200 dark:bg-surface-700"></div>
                        <span class="text-surface-400 dark:text-surface-500 text-sm uppercase tracking-wider">or sign in through email</span>
                        <div class="flex-1 h-px bg-surface-200 dark:bg-surface-700"></div>
                    </div>

                    <!-- Email & Password Form -->
                    <div class="space-y-6">
                        <p-message *ngIf="errorMessage" severity="error" [text]="errorMessage" [closable]="true" (onClose)="errorMessage = ''"></p-message>
                        
                        <div>
                            <label for="email" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">Email address</label>
                            <input pInputText id="email" type="email" 
                                   placeholder="Enter your email" 
                                   class="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3
                                          focus:!border-indigo-500 focus:!shadow-none"
                                   [(ngModel)]="email" 
                                   [disabled]="loading" />
                        </div>

                        <div>
                            <label for="password" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">Password</label>
                            <p-password id="password" 
                                        [(ngModel)]="password" 
                                        placeholder="Enter your password" 
                                        [toggleMask]="true" 
                                        [feedback]="false"
                                        [disabled]="loading"
                                        styleClass="w-full"
                                        inputStyleClass="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3 focus:!border-indigo-500 focus:!shadow-none">
                            </p-password>
                        </div>

                        <button pButton pRipple 
                                [label]="loading ? 'Logging in...' : 'Log In'"
                                (click)="onLogin()"
                                class="w-full !py-3 !text-base !font-semibold !bg-surface-300 dark:!bg-surface-700 
                                       !text-surface-500 dark:!text-surface-400 !border-0 
                                       hover:!bg-indigo-600 hover:!text-white transition-all duration-300
                                       disabled:opacity-50"
                                [disabled]="!email || !password || loading">
                        </button>

                        <div class="text-center">
                            <a class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium cursor-pointer text-sm">
                                Forgot password?
                            </a>
                        </div>
                    </div>
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
                                        afrinnexus.app
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
                                    <div class="text-slate-400 text-xs mb-1">Total Worth</div>
                                    <div class="text-2xl font-bold text-white mb-3">130 481 €</div>
                                    <div class="flex items-center gap-2 text-xs mb-4">
                                        <span class="text-emerald-400">+8,025€</span>
                                        <span class="text-emerald-400">+1.93%</span>
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
                            <div class="text-white font-bold text-lg mb-1">130 481 €</div>
                            <div class="flex items-center gap-1 text-xs mb-3">
                                <span class="text-emerald-400">+8,025€</span>
                                <span class="text-emerald-400">+1.93%</span>
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
                        <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">
                            All your investments <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">in</span>
                            <br><span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">one place</span>
                        </h2>
                        <p class="text-slate-400 max-w-md mx-auto mb-8">
                            Link your Accounts, automatically track your performance and optimize your portfolio with our bank-grade security app.
                        </p>

                        <!-- Trust Badges -->
                        <div class="flex items-center justify-center gap-8 text-slate-500 text-xs">
                            <div class="flex flex-col items-center gap-1">
                                <i class="pi pi-lock text-lg"></i>
                                <span>Bank-grade<br>security</span>
                            </div>
                            <div class="flex flex-col items-center gap-1">
                                <div class="flex text-cyan-400">
                                    <i class="pi pi-star-fill text-xs"></i>
                                    <i class="pi pi-star-fill text-xs"></i>
                                    <i class="pi pi-star-fill text-xs"></i>
                                    <i class="pi pi-star-fill text-xs"></i>
                                    <i class="pi pi-star-fill text-xs"></i>
                                </div>
                                <span>Rated 4.8/5 with<br>5000+ reviews</span>
                            </div>
                            <div class="flex flex-col items-center gap-1">
                                <i class="pi pi-building text-lg"></i>
                                <span>20,000 Banks &<br>Platforms</span>
                            </div>
                            <div class="flex flex-col items-center gap-1">
                                <i class="pi pi-desktop text-lg"></i>
                                <span>Available on App<br>and Web</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class Login {
    email: string = '';
    password: string = '';
    checked: boolean = false;
    currentLang = '/fr';
    loading: boolean = false;
    errorMessage: string = '';

    constructor(
        private router: Router,
        private authService: AuthService
    ) {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        this.currentLang = '/' + (match ? match[1] : 'fr');
    }

    onLogin(): void {
        if (!this.email || !this.password) {
            return;
        }

        this.loading = true;
        this.errorMessage = '';

        this.authService.login({
            email: this.email,
            password: this.password
        }).subscribe({
            next: () => {
                this.loading = false;
                this.router.navigate([this.currentLang]);
            },
            error: (error) => {
                this.loading = false;
                this.errorMessage = error.error?.detail || 'Login failed. Please check your credentials.';
            }
        });
    }
}
