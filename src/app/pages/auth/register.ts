import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputOtpModule } from 'primeng/inputotp';
import { RippleModule } from 'primeng/ripple';
import { DividerModule } from 'primeng/divider';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../i18n/i18n.service';

/** Length-only password rule — MUST stay in lock-step with the backend
 *  UserCreate validator (MIN_PASSWORD_LEN). Shown live so the CTA is never
 *  silently disabled. */
const MIN_PASSWORD_LEN = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [ButtonModule, InputTextModule, InputOtpModule, FormsModule, RouterModule, RippleModule, DividerModule, CommonModule, ToastModule],
    providers: [MessageService],
    template: `
        <p-toast position="top-center"></p-toast>
        <div class="min-h-screen flex">
            <!-- Left Side - Register / Verify -->
            <div class="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12 bg-surface-0 dark:bg-surface-950">
                <!-- Logo -->
                <div class="mb-12">
                    <a [routerLink]="[currentLang, 'landing']" class="flex items-center gap-3 cursor-pointer group">
                        <img src="assets/brand/omaad-icon.svg" alt="Omaad Logo" class="w-10 h-10">
                        <span class="font-bold text-xl text-surface-900 dark:text-surface-0 tracking-tight">Omaad</span>
                    </a>
                </div>

                @if (pendingEmail(); as pending) {
                <!-- In-app 6-digit code verification: verifies the address AND signs in -->
                <div class="max-w-md step-in" data-testid="verify-code">
                    <div class="w-14 h-14 rounded-2xl bg-ochre-500/15 flex items-center justify-center mb-6">
                        <i class="pi pi-envelope text-2xl text-ochre-500" aria-hidden="true"></i>
                    </div>
                    <h1 class="text-3xl md:text-4xl font-bold text-surface-900 dark:text-surface-0 mb-3">
                        {{ t('auth.verifyCode.title') }}
                    </h1>
                    <p class="text-surface-600 dark:text-surface-400 mb-8 leading-relaxed">
                        {{ t('auth.verifyCode.subtitle') }}
                        <strong class="text-surface-900 dark:text-surface-0 whitespace-nowrap">{{ pending }}</strong>
                    </p>

                    <!-- Segmented OTP field (native OTP feel: per-cell focus, paste,
                         one-time-code autofill; auto-submits on the 6th digit). -->
                    <label id="codeLabel" class="block text-surface-600 dark:text-surface-400 text-sm mb-3">{{ t('auth.verifyCode.codeLabel') }}</label>
                    <p-inputOtp [ngModel]="code()" (ngModelChange)="onCodeChange($event)" name="code"
                                [length]="6" [integerOnly]="true" variant="filled" [autofocus]="true"
                                [disabled]="isLoading()"
                                [styleClass]="codeError() ? 'omaad-otp otp-error' : 'omaad-otp'"
                                aria-labelledby="codeLabel"></p-inputOtp>

                    <div class="h-6 mt-3">
                        @if (codeError()) {
                            <div role="alert" class="text-negative text-sm flex items-center gap-2 otp-error-msg">
                                <i class="pi pi-exclamation-circle"></i>
                                {{ t('auth.verifyCode.codeInvalid') }}
                            </div>
                        } @else {
                            <p class="text-surface-400 dark:text-surface-500 text-xs flex items-center gap-1.5">
                                <i class="pi pi-clock text-[11px]"></i>{{ t('auth.verifyCode.expiryHint') }}
                            </p>
                        }
                    </div>

                    <button pButton pRipple type="button" [label]="t('auth.verifyCode.verify')"
                            [loading]="isLoading()"
                            class="w-full !rounded-full !py-3 !text-base !font-semibold !border-0 transition-all duration-300 mt-5"
                            [ngClass]="{
                                'omaad-cta': code().length === 6 && !isLoading(),
                                '!bg-surface-300 dark:!bg-surface-700 !text-surface-500 dark:!text-surface-400': code().length !== 6 || isLoading()
                            }"
                            [disabled]="code().length !== 6 || isLoading()"
                            (click)="submitCode()"></button>

                    <p class="text-surface-500 dark:text-surface-400 text-sm mt-6">
                        {{ t('auth.verifyCode.noCode') }}
                        <a class="text-brand-700 dark:text-ochre-400 hover:underline cursor-pointer ml-1"
                           [class.opacity-50]="resendCooldown() > 0 || isLoading()"
                           [class.pointer-events-none]="resendCooldown() > 0 || isLoading()"
                           (click)="resendCode()">
                            {{ resendCooldown() > 0 ? t('auth.verifyCode.resendIn') + ' (' + resendCooldown() + 's)' : t('auth.verifyCode.resend') }}
                        </a>
                    </p>
                    <a class="inline-block mt-4 text-sm text-surface-500 dark:text-surface-400 hover:underline cursor-pointer"
                       (click)="backToForm()">{{ t('auth.verifyCode.wrongEmail') }}</a>
                </div>
                } @else {
                <!-- Register Form (email + password only) -->
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

                    <!-- Google = primary CTA (skips password AND email verification) -->
                    <a [href]="authService.googleAuthUrl" rel="noopener"
                       class="w-full rounded-full bg-brand-700 hover:bg-brand-800 py-3.5 text-base font-semibold text-white flex items-center justify-center gap-3 cursor-pointer transition-colors no-underline shadow-sm">
                        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
                        </svg>
                        {{ t('auth.register.google') }}
                    </a>

                    <!-- Divider -->
                    <div class="flex items-center gap-4 my-8">
                        <div class="flex-1 h-px bg-surface-200 dark:bg-surface-700"></div>
                        <span class="text-surface-400 dark:text-surface-500 text-sm uppercase tracking-wider">{{ t('auth.register.orEmail') }}</span>
                        <div class="flex-1 h-px bg-surface-200 dark:bg-surface-700"></div>
                    </div>

                    <form (ngSubmit)="onSubmit()" class="space-y-6">
                        <div>
                            <label for="email" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">{{ t('auth.register.emailLabel') }}</label>
                            <input pInputText id="email" type="email" autocomplete="email"
                                   [placeholder]="t('auth.register.emailPlaceholder')"
                                   class="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3 focus:!border-brand-700 focus:!shadow-none"
                                   [ngModel]="email()" (ngModelChange)="email.set($event)" (blur)="emailTouched.set(true)"
                                   name="email" required [disabled]="isLoading()" />
                            @if (emailError()) {
                                <div role="alert" class="text-negative text-sm flex items-center gap-2 mt-2">
                                    <i class="pi pi-exclamation-circle"></i>{{ t('auth.register.emailInvalid') }}
                                </div>
                            }
                        </div>

                        <div>
                            <label for="password" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">{{ t('auth.register.passwordLabel') }}</label>
                            <div class="relative">
                                <input pInputText id="password" [type]="showPassword() ? 'text' : 'password'"
                                       autocomplete="new-password"
                                       [placeholder]="t('auth.register.passwordPlaceholder')"
                                       class="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !px-0 !py-3 !pr-10 focus:!border-brand-700 focus:!shadow-none"
                                       [ngModel]="password()" (ngModelChange)="password.set($event)"
                                       name="password" [disabled]="isLoading()" />
                                <button type="button" (click)="showPassword.set(!showPassword())"
                                        [attr.aria-label]="showPassword() ? t('auth.register.hidePassword') : t('auth.register.showPassword')"
                                        class="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 cursor-pointer">
                                    <i class="pi" [ngClass]="showPassword() ? 'pi-eye-slash' : 'pi-eye'"></i>
                                </button>
                            </div>
                            <!-- Live rule: reserves its row so the CTA never silently disables and there's no layout shift -->
                            <div class="flex items-center gap-1.5 mt-2 text-xs transition-colors"
                                 [ngClass]="passwordLongEnough() ? 'text-positive' : 'text-surface-400 dark:text-surface-500'">
                                <i class="pi text-[11px]" [ngClass]="passwordLongEnough() ? 'pi-check-circle' : 'pi-circle'"></i>
                                {{ t('auth.register.pwRule') }}
                            </div>
                        </div>

                        <button pButton pRipple [label]="t('auth.register.submit')" type="submit"
                                [loading]="isLoading()"
                                class="w-full !rounded-full !py-3 !text-base !font-semibold !border-0 transition-all duration-300"
                                [ngClass]="{
                                    'omaad-cta': isFormValid() && !isLoading(),
                                    '!bg-surface-300 dark:!bg-surface-700 !text-surface-500 dark:!text-surface-400': !isFormValid() || isLoading()
                                }"
                                [disabled]="!isFormValid() || isLoading()">
                        </button>

                        <!-- Passive legal footer (no checkbox) -->
                        <p class="text-surface-400 dark:text-surface-500 text-xs leading-relaxed text-center">
                            {{ t('auth.register.legalPre') }}
                            <a [routerLink]="[currentLang, 'legal', 'terms']" target="_blank" class="text-brand-700 dark:text-brand-300 hover:underline cursor-pointer">{{ t('auth.register.terms') }}</a>
                            {{ t('auth.register.and') }}
                            <a [routerLink]="[currentLang, 'legal', 'privacy']" target="_blank" class="text-brand-700 dark:text-brand-300 hover:underline cursor-pointer">{{ t('auth.register.privacy') }}</a>
                        </p>
                    </form>
                </div>
                }
            </div>

            <!-- Right Side - Showcase -->
            <div class="hidden lg:flex w-1/2 bg-warm-900 relative overflow-hidden">
                <div class="absolute inset-0">
                    <div class="absolute top-1/3 right-1/4 w-96 h-96 bg-ochre-500/10 rounded-full blur-3xl"></div>
                </div>
                <div class="relative z-10 flex flex-col justify-center items-center p-12 w-full">
                    <div class="relative w-full max-w-lg mb-12">
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
                        <div class="absolute -top-4 -right-4 bg-ochre-500 rounded-xl px-4 py-2 shadow-lg">
                            <div class="text-warm-900 font-bold text-lg">100%</div>
                            <div class="text-warm-900/80 text-xs">{{ t('auth.register.badgeForever') }}</div>
                        </div>
                    </div>
                    <div class="text-center">
                        <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">
                            {{ t('auth.register.heroTitle') }}
                            <br><span class="text-ochre-400">{{ t('auth.register.heroTitleAccent') }}</span>
                        </h2>
                        <p class="text-warm-400 max-w-md mx-auto mb-8">{{ t('auth.register.heroSubtitle') }}</p>
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
    `,
    styles: [`
        @keyframes registerStepIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .step-in { animation: registerStepIn 0.35s ease-out both; }

        /* Segmented OTP cells (premium, native-OTP feel). We override the
           global .p-inputtext skin on the cells: filled surface, clear
           border, ochre focus ring. */
        ::ng-deep .omaad-otp { display: flex; gap: 0.5rem; }
        ::ng-deep .omaad-otp .p-inputotp-input {
            width: clamp(2.6rem, 13vw, 3rem) !important;
            height: 3.5rem !important;
            padding: 0 !important;
            text-align: center;
            font-size: 1.375rem !important;
            font-weight: 600;
            color: var(--p-surface-900) !important;
            background: var(--p-surface-50) !important;
            border: 1.5px solid var(--p-surface-300) !important;
            border-radius: 0.75rem !important;
            box-shadow: none !important;
            caret-color: var(--omaad-ochre-500, #C77B3C);
            transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }
        ::ng-deep .omaad-otp .p-inputotp-input:focus,
        ::ng-deep .omaad-otp .p-inputotp-input:focus-visible {
            border-color: var(--omaad-ochre-500, #C77B3C) !important;
            background: var(--p-surface-0) !important;
            box-shadow: 0 0 0 3px rgba(199, 123, 60, 0.18) !important;
        }
        :host-context(.app-dark) ::ng-deep .omaad-otp .p-inputotp-input {
            color: var(--p-surface-0) !important;
            background: var(--p-surface-800) !important;
            border-color: var(--p-surface-600) !important;
        }
        :host-context(.app-dark) ::ng-deep .omaad-otp .p-inputotp-input:focus {
            background: var(--p-surface-900) !important;
        }
        /* Error: red cells + a quick shake, then the message fades in. */
        ::ng-deep .omaad-otp.otp-error { animation: otpShake 0.4s ease; }
        ::ng-deep .omaad-otp.otp-error .p-inputotp-input {
            border-color: var(--p-red-400, #f87171) !important;
            box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.15) !important;
        }
        @keyframes otpShake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-6px); }
            40% { transform: translateX(6px); }
            60% { transform: translateX(-4px); }
            80% { transform: translateX(4px); }
        }
        .otp-error-msg { animation: registerStepIn 0.2s ease-out both; }
    `]
})
export class Register {
    readonly authService = inject(AuthService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private messageService = inject(MessageService);
    private i18n = inject(I18nService);

    t(key: string): string { return this.i18n.t(key); }

    // Signals so autofill / paste always reflect into the CTA state (the old
    // template-driven p-password could leave the button stuck on a filled form).
    email = signal('');
    password = signal('');
    showPassword = signal(false);
    emailTouched = signal(false);
    currentLang = '/fr';

    isLoading = signal(false);

    // Verification-code state (replaces the old click-a-link "check inbox").
    pendingEmail = signal<string | null>(null);
    code = signal('');
    codeError = signal(false);
    resendCooldown = signal(0);
    private cooldownInterval: ReturnType<typeof setInterval> | null = null;

    emailError = computed(() => this.emailTouched() && !EMAIL_RE.test(this.email().trim()));
    passwordLongEnough = computed(() => this.password().length >= MIN_PASSWORD_LEN);
    isFormValid = computed(() => EMAIL_RE.test(this.email().trim()) && this.passwordLongEnough());

    constructor() {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        this.currentLang = '/' + (match ? match[1] : 'fr');

        // Returning-from-login handoff (S10-SEC-1): login sends an unverified
        // user here with their email in navigation state. Land straight on the
        // code screen and issue a fresh code (their old one may have expired).
        const nav = this.router.getCurrentNavigation();
        const state = (nav?.extras?.state ?? (typeof history !== 'undefined' ? history.state : null)) as { verifyEmail?: string } | null;
        if (state?.verifyEmail) {
            const email = state.verifyEmail;
            this.email.set(email);
            this.pendingEmail.set(email);
            this.startResendCooldown();
            this.authService.resendVerificationByEmail(email).subscribe({ next: () => {}, error: () => {} });
        }
    }

    private startResendCooldown(seconds = 60): void {
        if (this.cooldownInterval) clearInterval(this.cooldownInterval);
        this.resendCooldown.set(seconds);
        this.cooldownInterval = setInterval(() => {
            const next = this.resendCooldown() - 1;
            this.resendCooldown.set(Math.max(0, next));
            if (next <= 0 && this.cooldownInterval) {
                clearInterval(this.cooldownInterval);
                this.cooldownInterval = null;
            }
        }, 1000);
    }

    onSubmit(): void {
        this.emailTouched.set(true);
        if (!this.isFormValid() || this.isLoading()) return;

        this.isLoading.set(true);
        this.authService.register({
            email: this.email().trim(),
            password: this.password(),
            preferred_language: this.currentLang.replace('/', '') || 'fr'
        }).subscribe({
            next: (res) => {
                this.isLoading.set(false);
                // Legacy backend (pre S10-SEC-1): a session is minted at register.
                if (res?.access_token) {
                    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || this.currentLang;
                    this.router.navigate([returnUrl], { replaceUrl: true });
                    this.authService.getCurrentUser().subscribe({ next: () => {}, error: () => {} });
                    return;
                }
                // New contract: verify with the emailed 6-digit code (or link).
                this.code.set('');
                this.codeError.set(false);
                this.pendingEmail.set(res?.email || this.email().trim());
                this.startResendCooldown();
            },
            error: (error) => {
                this.isLoading.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: this.t('common.error'),
                    detail: error.message || this.t('auth.register.failedDetail'),
                    life: 5000
                });
            }
        });
    }

    onCodeChange(value: string): void {
        const digits = (value || '').replace(/\D/g, '').slice(0, 6);
        this.code.set(digits);
        if (this.codeError()) this.codeError.set(false);
        // Auto-submit once the code is complete (mirrors the native OTP feel).
        if (digits.length === 6 && !this.isLoading()) this.submitCode();
    }

    submitCode(): void {
        const email = this.pendingEmail();
        const code = this.code();
        if (!email || code.length !== 6 || this.isLoading()) return;
        this.isLoading.set(true);
        this.authService.verifyEmailCode(email, code).subscribe({
            next: () => {
                this.isLoading.set(false);
                const returnUrl = this.route.snapshot.queryParams['returnUrl'] || this.currentLang;
                this.authService.getCurrentUser().subscribe({ next: () => {}, error: () => {} });
                // Into the onboarding sequence (account-created -> name -> push).
                this.router.navigate([this.currentLang, 'welcome'], { queryParams: { returnUrl }, replaceUrl: true });
            },
            error: () => {
                this.isLoading.set(false);
                this.codeError.set(true);
                this.code.set('');
            }
        });
    }

    resendCode(): void {
        const email = this.pendingEmail();
        if (!email || this.resendCooldown() > 0 || this.isLoading()) return;
        this.isLoading.set(true);
        this.authService.resendVerificationByEmail(email).subscribe({
            next: () => {
                this.isLoading.set(false);
                this.startResendCooldown();
                this.messageService.add({ severity: 'success', summary: this.t('common.success'), detail: this.t('auth.verifyCode.resent'), life: 3000 });
            },
            error: () => {
                this.isLoading.set(false);
                // The endpoint is deliberately opaque; still start the cooldown.
                this.startResendCooldown();
            }
        });
    }

    backToForm(): void {
        this.pendingEmail.set(null);
        this.code.set('');
        this.codeError.set(false);
    }
}
