import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
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
    selector: 'app-login',
    standalone: true,
    imports: [ButtonModule, InputTextModule, PasswordModule, FormsModule, RouterModule, RippleModule, DividerModule, CommonModule, ToastModule],
    providers: [MessageService],
    template: `
        <p-toast position="top-center"></p-toast>
        <div class="min-h-screen flex">
            <!-- Left Side - Login Form -->
            <div class="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12 bg-surface-0 dark:bg-surface-950">
                <!-- Logo -->
                <div class="mb-12">
                    <a [routerLink]="[currentLang, 'landing']" class="flex items-center gap-3 cursor-pointer group">
                        <img src="assets/brand/omaad-icon.svg" alt="Omaad Logo"
                             class="w-10 h-10">
                        <span class="font-bold text-xl text-surface-900 dark:text-surface-0 tracking-tight">Omaad Wealth</span>
                    </a>
                </div>

                <!-- Login Form -->
                <div class="max-w-md">
                    <h1 class="text-3xl md:text-4xl font-bold text-surface-900 dark:text-surface-0 mb-2">
                        {{ t('auth.login.title') }}
                    </h1>
                    <p class="text-surface-600 dark:text-surface-400 mb-8">
                        {{ t('auth.login.noAccount') }}
                        <a [routerLink]="[currentLang, 'auth', 'register']" class="text-brand-700 dark:text-ochre-400 hover:text-brand-500 dark:hover:text-ochre-300 font-medium cursor-pointer">
                            {{ t('auth.login.signUp') }} <i class="pi pi-chevron-right text-xs"></i>
                        </a>
                    </p>

                    @if (!mfaChallenge()) {
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
                            {{ t('auth.login.google') }}
                        </a>
                    </div>

                    <!-- Divider -->
                    <div class="flex items-center gap-4 my-8">
                        <div class="flex-1 h-px bg-surface-200 dark:bg-surface-700"></div>
                        <span class="text-surface-500 dark:text-surface-400 text-sm uppercase tracking-wider">{{ t('auth.login.orEmail') }}</span>
                        <div class="flex-1 h-px bg-surface-200 dark:bg-surface-700"></div>
                    </div>

                    <!-- Email / Phone mode switch -->
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
                    <!-- Email & Password Form -->
                    <form (ngSubmit)="onSubmit()" class="space-y-6">
                        <div>
                            <label for="email" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">{{ t('auth.login.emailLabel') }}</label>
                            <input pInputText id="email" type="email"
                                   autocomplete="email"
                                   [placeholder]="t('auth.login.emailPlaceholder')"
                                   class="w-full !bg-transparent !border-0 !border-b !rounded-none !px-0 !py-3 focus:!shadow-none"
                                   [ngClass]="emailError() ? '!border-negative focus:!border-negative' : '!border-surface-300 dark:!border-surface-600 focus:!border-brand-700'"
                                   [ngModel]="email()" (ngModelChange)="email.set($event)" name="email" required
                                   [attr.aria-invalid]="emailError() ? 'true' : null"
                                   [attr.aria-describedby]="emailError() ? 'email-error' : null"
                                   (blur)="emailTouched.set(true)"
                                   [disabled]="isLoading()" />
                            @if (emailError()) {
                                <small id="email-error" role="alert" class="text-negative text-xs mt-1 block">{{ emailError() }}</small>
                            }
                        </div>

                        <div>
                            <label for="password" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">{{ t('auth.login.passwordLabel') }}</label>
                            <p-password id="password"
                                        [(ngModel)]="password"
                                        name="password"
                                        [attr.autocomplete]="'current-password'"
                                        [placeholder]="t('auth.login.passwordPlaceholder')"
                                        [toggleMask]="true"
                                        [feedback]="false"
                                        [disabled]="isLoading()"
                                        (onBlur)="passwordTouched.set(true)"
                                        styleClass="w-full"
                                        inputStyleClass="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3 focus:!border-brand-700 focus:!shadow-none">
                            </p-password>
                            @if (passwordTouched() && !password) {
                                <small id="password-error" role="alert" class="text-negative text-xs mt-1 block">{{ t('auth.login.passwordRequired') }}</small>
                            }
                        </div>

                        <button pButton pRipple [label]="t('auth.login.submit')"
                                type="submit"
                                [loading]="isLoading()"
                                class="w-full !rounded-full !py-3 !text-base !font-semibold omaad-cta
                                       disabled:opacity-50"
                                [disabled]="!email() || !password || isLoading()">
                        </button>

                        <div class="text-center">
                            <a [routerLink]="[currentLang, 'auth', 'forgot-password']"
                               class="text-brand-700 dark:text-brand-300 hover:text-brand-500 dark:hover:text-brand-200 font-medium cursor-pointer text-sm">
                                {{ t('auth.login.forgot') }}
                            </a>
                        </div>
                    </form>
                    } @else {
                    <!-- Phone / OTP Form -->
                    <div class="space-y-6">
                        @if (!otpSent()) {
                            <div>
                                <label for="phone" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">{{ t('auth.login.phoneLabel') }}</label>
                                <input pInputText id="phone" type="tel"
                                       [placeholder]="t('auth.login.phonePlaceholder')"
                                       class="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3 focus:!border-brand-700 focus:!shadow-none"
                                       [(ngModel)]="phone" name="phone" [disabled]="isLoading()" />
                                <p class="text-surface-500 dark:text-surface-400 text-xs mt-2">{{ t('auth.login.phoneHint') }}</p>
                            </div>
                            <button pButton pRipple [label]="t('auth.login.sendCode')" type="button"
                                    [loading]="isLoading()"
                                    class="w-full !rounded-full !py-3 !text-base !font-semibold omaad-cta disabled:opacity-50"
                                    [disabled]="phone.trim().length < 6 || isLoading()"
                                    (click)="sendOtp()"></button>
                        } @else {
                            <div>
                                <label for="otp" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">{{ t('auth.login.codeLabel') }}</label>
                                <input pInputText id="otp" type="text" inputmode="numeric" autocomplete="one-time-code"
                                       [placeholder]="t('auth.login.codePlaceholder')"
                                       class="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3 focus:!border-brand-700 focus:!shadow-none tracking-widest"
                                       [(ngModel)]="otpCode" name="otp" [disabled]="isLoading()" />
                            </div>
                            <button pButton pRipple [label]="t('auth.login.submit')" type="button"
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
                    } @else {
                    <!-- TOTP two-factor challenge -->
                    <div class="space-y-6">
                        <div class="text-center">
                            <div class="w-12 h-12 mx-auto rounded-xl bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center mb-3">
                                <i class="pi pi-shield text-brand-700 dark:text-ochre-400 text-xl"></i>
                            </div>
                            <h3 class="text-base font-semibold text-surface-900 dark:text-surface-0">{{ t('auth.twofa.title') }}</h3>
                            <p class="text-surface-500 dark:text-surface-400 text-sm mt-1">{{ t('auth.twofa.subtitle') }}</p>
                        </div>
                        <div>
                            <input pInputText type="text" inputmode="numeric" autocomplete="one-time-code"
                                   [placeholder]="t('auth.twofa.codePlaceholder')"
                                   class="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3 focus:!border-brand-700 focus:!shadow-none tracking-widest text-center"
                                   [(ngModel)]="mfaCode" name="mfaCode" [disabled]="isLoading()" (keyup.enter)="submit2fa()" />
                        </div>
                        <button pButton pRipple [label]="t('auth.twofa.verify')" type="button"
                                [loading]="isLoading()"
                                class="w-full !rounded-full !py-3 !text-base !font-semibold omaad-cta disabled:opacity-50"
                                [disabled]="!mfaCode.trim() || isLoading()"
                                (click)="submit2fa()"></button>
                        <div class="text-center">
                            <a class="text-surface-500 dark:text-surface-400 hover:underline cursor-pointer text-sm" (click)="cancelMfa()">{{ t('auth.twofa.back') }}</a>
                        </div>
                    </div>
                    }
                </div>
            </div>

            <!-- Right Side - Showcase Image -->
            <div class="hidden lg:flex w-1/2 bg-warm-900 relative overflow-hidden">
                <!-- Background Effects -->
                <div class="absolute inset-0">
                    <div class="absolute top-1/4 right-1/4 w-96 h-96 bg-ochre-500/10 rounded-full blur-3xl"></div>
                </div>

                <!-- Content -->
                <div class="relative z-10 flex flex-col justify-center items-center p-12 w-full">
                    <!-- Dashboard Mockups -->
                    <div class="relative w-full max-w-2xl">
                        <!-- Desktop Mockup -->
                        <div class="bg-warm-800/80 backdrop-blur-sm rounded-xl border border-warm-700/50 p-4 shadow-2xl transform rotate-1">
                            <!-- Browser Header -->
                            <div class="flex items-center gap-2 mb-4 pb-3 border-b border-warm-700/50">
                                <div class="flex gap-1.5">
                                    <div class="w-3 h-3 rounded-full bg-negative/80"></div>
                                    <div class="w-3 h-3 rounded-full bg-ochre-500/80"></div>
                                    <div class="w-3 h-3 rounded-full bg-positive/80"></div>
                                </div>
                                <div class="flex-1 flex justify-center">
                                    <div class="bg-warm-700/50 rounded-lg px-4 py-1 text-warm-400 text-xs flex items-center gap-2">
                                        <i class="pi pi-lock text-positive-400"></i>
                                        omaad.app
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Dashboard Content -->
                            <div class="grid grid-cols-3 gap-3 mb-4">
                                <div class="col-span-1 space-y-2">
                                    <div class="bg-warm-700/50 rounded-lg p-3">
                                        <div class="text-warm-400 text-xs mb-1">Dashboard</div>
                                        <div class="h-2 bg-brand-700/25 dark:bg-brand-300/25 rounded"></div>
                                    </div>
                                    <div class="bg-warm-700/50 rounded-lg p-3">
                                        <div class="text-warm-400 text-xs mb-1">Portfolio</div>
                                        <div class="h-2 bg-warm-600 rounded"></div>
                                    </div>
                                    <div class="bg-warm-700/50 rounded-lg p-3">
                                        <div class="text-warm-400 text-xs mb-1">Insights</div>
                                        <div class="h-2 bg-warm-600 rounded"></div>
                                    </div>
                                </div>
                                <div class="col-span-2 bg-warm-700/30 rounded-lg p-4">
                                    <div class="text-warm-400 text-xs mb-1">Patrimoine Net</div>
                                    <div class="text-2xl font-bold text-white mb-3">85,6M FCFA</div>
                                    <div class="flex items-center gap-2 text-xs mb-4">
                                        <span class="text-positive-400">+5,2M</span>
                                        <span class="text-positive-400">+12.5%</span>
                                    </div>
                                    <!-- Mini Chart -->
                                    <div class="flex items-end justify-between h-16 gap-1">
                                        <div class="flex-1 bg-brand-500/50 rounded-t" style="height: 40%"></div>
                                        <div class="flex-1 bg-brand-500/50 rounded-t" style="height: 55%"></div>
                                        <div class="flex-1 bg-brand-500/50 rounded-t" style="height: 45%"></div>
                                        <div class="flex-1 bg-brand-500/50 rounded-t" style="height: 65%"></div>
                                        <div class="flex-1 bg-brand-500/50 rounded-t" style="height: 75%"></div>
                                        <div class="flex-1 bg-positive-500/50 rounded-t" style="height: 85%"></div>
                                        <div class="flex-1 bg-positive-500/50 rounded-t" style="height: 100%"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Mobile Mockup -->
                        <div class="absolute -bottom-8 -left-8 w-40 bg-warm-800/90 backdrop-blur-sm rounded-2xl border border-warm-700/50 p-3 shadow-2xl transform -rotate-6">
                            <div class="flex items-center justify-between mb-3">
                                <div class="w-6 h-6 rounded-full bg-warm-700"></div>
                                <div class="w-4 h-4 rounded-full bg-warm-700"></div>
                            </div>
                            <div class="text-white font-bold text-lg mb-1">85,6M FCFA</div>
                            <div class="flex items-center gap-1 text-xs mb-3">
                                <span class="text-positive-400">+5,2M</span>
                                <span class="text-positive-400">+12.5%</span>
                            </div>
                            <div class="space-y-2">
                                <div class="flex justify-between text-xs">
                                    <span class="text-warm-400">Total</span>
                                    <span class="text-warm-400">Net</span>
                                    <span class="text-warm-400">Financial</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Text Content -->
                    <div class="text-center mt-16">
                        <p class="text-xs font-semibold tracking-[0.15em] uppercase text-brand-700 dark:text-brand-300 mb-4">
                            Construis. Protège. Règne.
                        </p>
                        <h2 class="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                            Devenez le roi<br>
                            <span class="text-ochre-400">de votre patrimoine</span>
                        </h2>
                        <p class="text-warm-400 max-w-md mx-auto mb-10 leading-relaxed">
                            Patrimoine, épargne, dettes, objectif FIRE — tout est centralisé pour que vous preniez les bonnes décisions.
                        </p>

                        <!-- Value Props -->
                        <div class="flex items-center justify-center gap-6 text-warm-400 text-xs">
                            <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                                <i class="pi pi-lock text-brand-700 dark:text-brand-300"></i>
                                <span>{{ t('auth.login.trustSecure') }}</span>
                            </div>
                            <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                                <i class="pi pi-bookmark text-ochre-400"></i>
                                <span>{{ t('auth.login.trustNoCommitment') }}</span>
                            </div>
                            <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                                <i class="pi pi-globe text-brand-700 dark:text-brand-300"></i>
                                <span>{{ t('auth.login.trustMultiCurrency') }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class Login {
    readonly authService = inject(AuthService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private messageService = inject(MessageService);
    private i18n = inject(I18nService);

    t(key: string): string { return this.i18n.t(key); }

    // `email` is a signal so the inline-validation computed below re-runs as
    // the user types (a plain field would leave the error stale — the P0-3 bug).
    email = signal('');
    password = '';
    currentLang = '/fr';

    // Inline validation (parity with register): show a field error only once
    // the user has left the field or attempted submit — not while typing.
    emailTouched = signal(false);
    passwordTouched = signal(false);
    private readonly EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    readonly emailError = computed<string | null>(() => {
        if (!this.emailTouched()) return null;
        const email = this.email().trim();
        if (!email) return this.t('auth.login.emailRequired');
        if (!this.EMAIL_RE.test(email)) return this.t('auth.login.emailInvalid');
        return null;
    });

    // Phone/OTP login (an additional method alongside email)
    authMode = signal<'email' | 'phone'>('email');
    phone = '';
    otpCode = '';
    otpSent = signal(false);

    // TOTP 2FA challenge (shown after a correct password when 2FA is on)
    mfaChallenge = signal(false);
    mfaToken = '';
    mfaCode = '';

    isLoading = signal(false);

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
                this.messageService.add({ severity: 'error', summary: this.t('auth.login.failedSummary'), detail: err?.message || this.t('auth.login.otpError'), life: 5000 });
            }
        });
    }

    submitOtp(): void {
        const phone = this.phone.trim();
        const code = this.otpCode.trim();
        if (!phone || !code) return;
        this.isLoading.set(true);
        this.authService.verifyOtp(phone, code).subscribe({
            next: () => this.finishLogin(),
            error: (err) => {
                this.isLoading.set(false);
                this.messageService.add({ severity: 'error', summary: this.t('auth.login.failedSummary'), detail: err?.message || this.t('auth.login.otpError'), life: 5000 });
            }
        });
    }

    /** Second step of email login when 2FA is on: verify the TOTP/backup code. */
    submit2fa(): void {
        const code = this.mfaCode.trim();
        if (!code || !this.mfaToken) return;
        this.isLoading.set(true);
        this.authService.verify2fa(this.mfaToken, code).subscribe({
            next: () => {
                this.mfaChallenge.set(false);
                this.mfaToken = '';
                this.finishLogin();
            },
            error: (err) => {
                this.isLoading.set(false);
                this.messageService.add({ severity: 'error', summary: this.t('auth.login.failedSummary'), detail: err?.message || this.t('auth.twofa.invalidCode'), life: 5000 });
            }
        });
    }

    cancelMfa(): void {
        this.mfaChallenge.set(false);
        this.mfaToken = '';
        this.mfaCode = '';
        this.password = '';
    }

    /** Shared post-login navigation (used by both email and OTP flows). */
    private finishLogin(): void {
        this.isLoading.set(false);
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || this.currentLang;
        this.router.navigate([returnUrl], { replaceUrl: true });
        this.authService.getCurrentUser().subscribe({ next: () => {}, error: () => {} });
    }

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        this.currentLang = '/' + (match ? match[1] : 'fr');
    }

    onSubmit(): void {
        // Surface inline errors if the user submits an incomplete/invalid form.
        this.emailTouched.set(true);
        this.passwordTouched.set(true);
        if (this.emailError() || !this.password) return;

        this.isLoading.set(true);
        this.authService.login({ email: this.email().trim(), password: this.password }).subscribe({
            next: (authResponse) => {
                // 2FA on → password was correct, but we need a code next.
                if (authResponse?.mfa_required && authResponse?.mfa_token) {
                    this.isLoading.set(false);
                    this.mfaToken = authResponse.mfa_token ?? '';
                    this.mfaCode = '';
                    this.mfaChallenge.set(true);
                    return;
                }
                // Verify token was received
                if (!authResponse?.access_token) {
                    this.isLoading.set(false);
                    this.messageService.add({
                        severity: 'error',
                        summary: this.t('auth.login.failedSummary'),
                        detail: this.t('auth.login.invalidResponse'),
                        life: 5000
                    });
                    return;
                }
                
                // Token should be set by the login method via tap()
                // Verify it's actually saved
                setTimeout(() => {
                    const isAuth = this.authService.isAuthenticated();

                    if (!isAuth) {
                        this.isLoading.set(false);
                        this.messageService.add({
                            severity: 'error',
                            summary: this.t('auth.login.failedSummary'),
                            detail: this.t('auth.login.couldNotComplete'),
                            life: 5000
                        });
                        return;
                    }
                    
                    // Navigate immediately - don't wait for getCurrentUser
                    // The dashboard will fetch user data if needed
                    this.isLoading.set(false);
                    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || this.currentLang;
                    this.router.navigate([returnUrl], { replaceUrl: true });
                    
                    // Fetch user info in background (optional)
                    this.authService.getCurrentUser().subscribe({
                        next: () => {},
                        error: () => {
                            // Don't fail login if getCurrentUser fails - token is valid.
                            // User data will be fetched later by the dashboard.
                        }
                    });
                }, 50); // Small delay to ensure localStorage write completes
            },
            error: (error) => {
                this.isLoading.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: this.t('auth.login.failedSummary'),
                    detail: error.message || this.t('auth.login.invalidCredentials'),
                    life: 5000
                });
            }
        });
    }

}
