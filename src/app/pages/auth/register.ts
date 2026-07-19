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
import { I18nService } from '../../i18n/i18n.service';

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
                        <img src="assets/brand/omaad-icon.svg" alt="Omaad Logo"
                             class="w-10 h-10">
                        <span class="font-bold text-xl text-surface-900 dark:text-surface-0 tracking-tight">Omaad Wealth</span>
                    </a>
                </div>

                <!-- Register Form -->
                <div class="max-w-md">
                    <h1 class="text-3xl md:text-4xl font-bold text-surface-900 dark:text-surface-0 mb-2">
                        {{ t('auth.register.title') }}
                    </h1>
                    <p class="text-surface-600 dark:text-surface-400 mb-8">
                        {{ t('auth.register.haveAccount') }}
                        <a [routerLink]="[currentLang, 'auth', 'login']" class="text-brand-700 dark:text-ochre-400 hover:text-brand-500 dark:hover:text-ochre-300 font-medium cursor-pointer">
                            {{ t('auth.register.signIn') }} <i class="pi pi-chevron-right text-xs"></i>
                        </a>
                    </p>

                    <!-- Social Login Buttons -->
                    <div class="space-y-3 mb-6">
                        <a [href]="authService.googleAuthUrl"
                           rel="noopener"
                           class="w-full rounded-full bg-brand-700 hover:bg-brand-800 py-3 text-base font-medium text-white flex items-center justify-center gap-3 cursor-pointer transition-colors no-underline">
                            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
                            </svg>
                            {{ t('auth.register.google') }}
                        </a>
                    </div>

                    <!-- Divider -->
                    <div class="flex items-center gap-4 my-8">
                        <div class="flex-1 h-px bg-surface-200 dark:bg-surface-700"></div>
                        <span class="text-surface-400 dark:text-surface-500 text-sm uppercase tracking-wider">{{ t('auth.register.orEmail') }}</span>
                        <div class="flex-1 h-px bg-surface-200 dark:bg-surface-700"></div>
                    </div>

                    <!-- Email / Phone mode switch (phone signup = OTP, creates a phone-only account) -->
                    <div class="flex gap-2 p-1 bg-surface-100 dark:bg-surface-800 rounded-xl mb-6">
                        <button type="button" (click)="setMode('email')"
                                class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                                [ngClass]="authMode() === 'email' ? 'bg-white dark:bg-surface-700 text-brand-700 dark:text-ochre-400 shadow-sm' : 'text-surface-500 dark:text-surface-400'">
                            <i class="pi pi-envelope text-xs mr-1"></i>{{ t('auth.login.tabEmail') }}
                        </button>
                        <button type="button" (click)="setMode('phone')"
                                class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                                [ngClass]="authMode() === 'phone' ? 'bg-white dark:bg-surface-700 text-brand-700 dark:text-ochre-400 shadow-sm' : 'text-surface-500 dark:text-surface-400'">
                            <i class="pi pi-mobile text-xs mr-1"></i>{{ t('auth.login.tabPhone') }}
                        </button>
                    </div>

                    @if (authMode() === 'email') {
                    <!-- Registration Form -->
                    <form (ngSubmit)="onSubmit()" class="space-y-6">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label for="firstName" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">{{ t('auth.register.firstName') }}</label>
                                <input pInputText id="firstName" type="text"
                                       autocomplete="given-name"
                                       [placeholder]="t('auth.register.firstNamePlaceholder')"
                                       class="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3
                                              focus:!border-brand-700 focus:!shadow-none"
                                       [(ngModel)]="firstName" name="firstName" />
                            </div>
                            <div>
                                <label for="lastName" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">{{ t('auth.register.lastName') }}</label>
                                <input pInputText id="lastName" type="text"
                                       autocomplete="family-name"
                                       [placeholder]="t('auth.register.lastNamePlaceholder')"
                                       class="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3
                                              focus:!border-brand-700 focus:!shadow-none"
                                       [(ngModel)]="lastName" name="lastName" />
                            </div>
                        </div>

                        <div>
                            <label for="email" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">{{ t('auth.register.emailLabel') }}</label>
                            <input pInputText id="email" type="email"
                                   autocomplete="email"
                                   [placeholder]="t('auth.register.emailPlaceholder')"
                                   class="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3
                                          focus:!border-brand-700 focus:!shadow-none"
                                   [(ngModel)]="email" name="email" required
                                   [disabled]="isLoading()" />
                        </div>

                        <div>
                            <label for="password" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">{{ t('auth.register.passwordLabel') }}</label>
                            <p-password id="password"
                                        [(ngModel)]="password"
                                        name="password"
                                        [attr.autocomplete]="'new-password'"
                                        [placeholder]="t('auth.register.passwordPlaceholder')"
                                        [toggleMask]="true"
                                        [feedback]="true"
                                        [disabled]="isLoading()"
                                        styleClass="w-full"
                                        inputStyleClass="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3 focus:!border-brand-700 focus:!shadow-none">
                            </p-password>
                        </div>

                        <div>
                            <label for="confirmPassword" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">{{ t('auth.register.confirmLabel') }}</label>
                            <p-password id="confirmPassword"
                                        [(ngModel)]="confirmPassword"
                                        name="confirmPassword"
                                        [attr.autocomplete]="'new-password'"
                                        [placeholder]="t('auth.register.confirmPlaceholder')"
                                        [toggleMask]="true"
                                        [feedback]="false"
                                        [disabled]="isLoading()"
                                        styleClass="w-full"
                                        inputStyleClass="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3 focus:!border-brand-700 focus:!shadow-none">
                            </p-password>
                        </div>

                        <!-- Password mismatch warning -->
                        @if (password && confirmPassword && password !== confirmPassword) {
                            <div role="alert" class="text-negative text-sm flex items-center gap-2">
                                <i class="pi pi-exclamation-circle"></i>
                                {{ t('auth.register.mismatch') }}
                            </div>
                        }

                        <!-- Terms Checkbox -->
                        <div class="flex items-start gap-3">
                            <p-checkbox [(ngModel)]="acceptTerms" [binary]="true" inputId="terms" name="terms" [disabled]="isLoading()"></p-checkbox>
                            <label for="terms" class="text-surface-600 dark:text-surface-400 text-sm leading-relaxed cursor-pointer">
                                {{ t('auth.register.acceptPre') }}
                                <a class="text-brand-700 dark:text-brand-300 dark:text-brand-700 dark:text-brand-300 hover:underline cursor-pointer">{{ t('auth.register.terms') }}</a>
                                {{ t('auth.register.and') }}
                                <a class="text-brand-700 dark:text-brand-300 dark:text-brand-700 dark:text-brand-300 hover:underline cursor-pointer">{{ t('auth.register.privacy') }}</a>
                            </label>
                        </div>

                        <button pButton pRipple [label]="t('auth.register.submit')"
                                type="submit"
                                [loading]="isLoading()"
                                class="w-full !rounded-full !py-3 !text-base !font-semibold !border-0 transition-all duration-300"
                                [ngClass]="{
                                    'omaad-cta': isFormValid && !isLoading(),
                                    '!bg-surface-300 dark:!bg-surface-700 !text-surface-500 dark:!text-surface-400': !isFormValid || isLoading()
                                }"
                                [disabled]="!isFormValid || isLoading()">
                        </button>
                    </form>
                    } @else {
                    <!-- Phone / OTP signup (mirrors login; verifying the code creates the account) -->
                    <div class="space-y-6">
                        @if (!otpSent()) {
                            <div>
                                <label for="rphone" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">{{ t('auth.login.phoneLabel') }}</label>
                                <input pInputText id="rphone" type="tel"
                                       [placeholder]="t('auth.login.phonePlaceholder')"
                                       class="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3 focus:!border-brand-700 focus:!shadow-none"
                                       [(ngModel)]="phone" name="rphone" [disabled]="isLoading()" />
                                <p class="text-surface-400 dark:text-surface-500 text-xs mt-2">{{ t('auth.login.phoneHint') }}</p>
                            </div>
                            <button pButton pRipple [label]="t('auth.login.sendCode')" type="button"
                                    [loading]="isLoading()"
                                    class="w-full !rounded-full !py-3 !text-base !font-semibold omaad-cta disabled:opacity-50"
                                    [disabled]="phone.trim().length < 6 || isLoading()"
                                    (click)="sendOtp()"></button>
                        } @else {
                            <div>
                                <label for="rotp" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">{{ t('auth.login.codeLabel') }}</label>
                                <input pInputText id="rotp" type="text" inputmode="numeric" autocomplete="one-time-code"
                                       [placeholder]="t('auth.login.codePlaceholder')"
                                       class="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3 focus:!border-brand-700 focus:!shadow-none tracking-widest"
                                       [(ngModel)]="otpCode" name="rotp" [disabled]="isLoading()" (keyup.enter)="submitOtp()" />
                            </div>
                            <button pButton pRipple [label]="t('auth.register.submit')" type="button"
                                    [loading]="isLoading()"
                                    class="w-full !rounded-full !py-3 !text-base !font-semibold omaad-cta disabled:opacity-50"
                                    [disabled]="!otpCode.trim() || isLoading()"
                                    (click)="submitOtp()"></button>
                            <div class="flex items-center justify-between text-sm">
                                <a class="text-surface-500 dark:text-surface-400 hover:underline cursor-pointer" (click)="setMode('phone')">{{ t('auth.login.changeNumber') }}</a>
                                <a class="text-brand-700 dark:text-brand-300 hover:underline cursor-pointer" (click)="sendOtp()">{{ t('auth.login.resend') }}</a>
                            </div>
                        }
                    </div>
                    }
                </div>
            </div>

            <!-- Right Side - Showcase Image -->
            <div class="hidden lg:flex w-1/2 bg-warm-900 relative overflow-hidden">
                <!-- Background Effects -->
                <div class="absolute inset-0">
                    <div class="absolute top-1/3 right-1/4 w-96 h-96 bg-ochre-500/10 rounded-full blur-3xl"></div>
                </div>

                <!-- Content -->
                <div class="relative z-10 flex flex-col justify-center items-center p-12 w-full">
                    <!-- Illustration -->
                    <div class="relative w-full max-w-lg mb-12">
                        <!-- Main Card -->
                        <div class="bg-warm-800/80 backdrop-blur-sm rounded-2xl border border-warm-700/50 p-6 shadow-2xl">
                            <div class="flex items-center gap-4 mb-6">
                                <div class="w-12 h-12 rounded-full bg-brand-700 flex items-center justify-center">
                                    <i class="pi pi-user text-white text-xl"></i>
                                </div>
                                <div>
                                    <div class="text-white font-semibold">{{ t('auth.register.welcomeCard') }}</div>
                                    <div class="text-warm-400 text-sm">{{ t('auth.register.journeyStart') }}</div>
                                </div>
                            </div>

                            <!-- Progress Steps -->
                            <div class="space-y-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-full bg-positive-500 flex items-center justify-center">
                                        <i class="pi pi-check text-white text-sm"></i>
                                    </div>
                                    <div class="flex-1">
                                        <div class="text-white text-sm font-medium">{{ t('auth.register.step1') }}</div>
                                        <div class="text-warm-400 text-xs">{{ t('auth.register.step1desc') }}</div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-full bg-warm-700 flex items-center justify-center text-warm-400 text-sm font-medium">2</div>
                                    <div class="flex-1">
                                        <div class="text-warm-300 text-sm font-medium">{{ t('auth.register.step2') }}</div>
                                        <div class="text-warm-500 text-xs">{{ t('auth.register.step2desc') }}</div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-full bg-warm-700 flex items-center justify-center text-warm-400 text-sm font-medium">3</div>
                                    <div class="flex-1">
                                        <div class="text-warm-300 text-sm font-medium">{{ t('auth.register.step3') }}</div>
                                        <div class="text-warm-500 text-xs">{{ t('auth.register.step3desc') }}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Floating Badge -->
                        <div class="absolute -top-4 -right-4 bg-ochre-500 rounded-xl px-4 py-2 shadow-lg">
                            <div class="text-warm-900 font-bold text-lg">100%</div>
                            <div class="text-warm-900/80 text-xs">{{ t('auth.register.badgeForever') }}</div>
                        </div>
                    </div>

                    <!-- Text Content -->
                    <div class="text-center">
                        <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">
                            {{ t('auth.register.heroTitle') }}
                            <br><span class="text-ochre-400">{{ t('auth.register.heroTitleAccent') }}</span>
                        </h2>
                        <p class="text-warm-400 max-w-md mx-auto mb-8">
                            {{ t('auth.register.heroSubtitle') }}
                        </p>

                        <!-- Value Props -->
                        <div class="flex items-center justify-center gap-8 text-warm-400 text-sm">
                            <div class="flex flex-col items-center gap-2">
                                <div class="w-10 h-10 rounded-xl bg-brand-700/20 dark:bg-brand-300/20 flex items-center justify-center">
                                    <i class="pi pi-lock text-brand-700 dark:text-brand-300 text-lg"></i>
                                </div>
                                <span>{{ t('auth.register.trustSecure') }}</span>
                            </div>
                            <div class="flex flex-col items-center gap-2">
                                <div class="w-10 h-10 rounded-xl bg-brand-700/15 dark:bg-brand-300/20 flex items-center justify-center">
                                    <i class="pi pi-shield text-brand-700 dark:text-brand-300 text-lg"></i>
                                </div>
                                <span>{{ t('auth.register.trustConfidential') }}</span>
                            </div>
                            <div class="flex flex-col items-center gap-2">
                                <div class="w-10 h-10 rounded-xl bg-ochre-500/20 flex items-center justify-center">
                                    <i class="pi pi-bookmark text-ochre-400 text-lg"></i>
                                </div>
                                <span>{{ t('auth.register.trustNoCommitment') }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class Register {
    readonly authService = inject(AuthService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private messageService = inject(MessageService);
    private i18n = inject(I18nService);

    t(key: string): string { return this.i18n.t(key); }

    firstName = '';
    lastName = '';
    email = '';
    password = '';
    confirmPassword = '';
    acceptTerms = false;
    currentLang = '/fr';

    // Phone signup (an additional method alongside email — kept coequal).
    authMode = signal<'email' | 'phone'>('email');
    phone = '';
    otpCode = '';
    otpSent = signal(false);

    isLoading = signal(false);

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        this.currentLang = '/' + (match ? match[1] : 'fr');
    }

    setMode(mode: 'email' | 'phone') {
        this.authMode.set(mode);
        this.otpSent.set(false);
        this.otpCode = '';
    }

    sendOtp(): void {
        const phone = this.phone.trim();
        if (phone.length < 6) return;
        this.isLoading.set(true);
        this.authService.requestOtp(phone).subscribe({
            next: () => {
                this.isLoading.set(false);
                this.otpSent.set(true);
                this.messageService.add({ severity: 'success', summary: 'Omaad', detail: this.t('auth.login.codeSent'), life: 3000 });
            },
            error: (err) => {
                this.isLoading.set(false);
                this.messageService.add({ severity: 'error', summary: this.t('auth.register.failedSummary'), detail: err?.message || this.t('auth.login.otpError'), life: 5000 });
            }
        });
    }

    submitOtp(): void {
        const phone = this.phone.trim();
        const code = this.otpCode.trim();
        if (!phone || !code) return;
        this.isLoading.set(true);
        this.authService.verifyOtp(phone, code).subscribe({
            next: () => {
                this.isLoading.set(false);
                const returnUrl = this.route.snapshot.queryParams['returnUrl'] || this.currentLang;
                this.router.navigate([returnUrl], { replaceUrl: true });
                this.authService.getCurrentUser().subscribe({ next: () => {}, error: () => {} });
            },
            error: (err) => {
                this.isLoading.set(false);
                this.messageService.add({ severity: 'error', summary: this.t('auth.register.failedSummary'), detail: err?.message || this.t('auth.login.otpError'), life: 5000 });
            }
        });
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
                    summary: this.t('auth.register.createdSummary'),
                    detail: this.t('auth.register.createdDetail'),
                    life: 4000
                });
                // Keep the token the server just minted and go straight into
                // the app (mirrors the OTP flow) — the old code called
                // logout(), discarding the token and forcing a second manual
                // login. If email verification (P2) later lands, route to a
                // "verify your email" state here instead.
                const returnUrl = this.route.snapshot.queryParams['returnUrl'] || this.currentLang;
                this.router.navigate([returnUrl], { replaceUrl: true });
                this.authService.getCurrentUser().subscribe({ next: () => {}, error: () => {} });
            },
            error: (error) => {
                this.isLoading.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: this.t('auth.register.failedSummary'),
                    detail: error.message || this.t('auth.register.failedDetail'),
                    life: 5000
                });
            }
        });
    }

}
