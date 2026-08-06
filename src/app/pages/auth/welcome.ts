import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { TokenService } from '../../core/services/token.service';
import { I18nService } from '../../i18n/i18n.service';
import { FeatureFlagsService } from '../../core/services/feature-flags.service';

type Step = 'created' | 'name' | 'notifications';

@Component({
    selector: 'app-welcome',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, RippleModule, ToastModule],
    providers: [MessageService],
    template: `
        <p-toast position="top-center"></p-toast>
        <div class="min-h-screen bg-surface-0 dark:bg-surface-950 text-surface-900 dark:text-surface-0 overflow-hidden">

            @switch (step()) {
                @case ('created') {
                <!-- Account created (Finary 6.jpeg): brief celebratory beat, auto-advances -->
                <div class="min-h-screen flex flex-col items-center justify-center px-8 text-center step-in">
                    <div class="w-20 h-20 rounded-full border-2 border-ochre-500 flex items-center justify-center mb-6 pop-in">
                        <i class="pi pi-check text-3xl text-ochre-500" aria-hidden="true"></i>
                    </div>
                    <h1 class="text-3xl md:text-4xl font-bold">{{ t('welcome.created.title') }}</h1>
                </div>
                }

                @case ('name') {
                <!-- Capture first + last name (both mandatory) so the app can
                     address the user and the account page is complete. -->
                <div class="min-h-screen flex flex-col justify-center px-8 md:px-16 max-w-md w-full mx-auto step-in">
                    <!-- Step indicator: name is step 2 of the short onboarding run -->
                    <div class="flex items-center gap-2 mb-10" aria-hidden="true">
                        @for (i of [0, 1, 2]; track i) {
                            <span class="h-1.5 rounded-full transition-all duration-300"
                                  [ngClass]="i <= 1
                                      ? 'w-8 bg-ochre-500'
                                      : 'w-4 bg-surface-200 dark:bg-surface-700'"></span>
                        }
                    </div>
                    <div class="mb-8">
                        <!-- Live initials avatar: fills in as the user types (premium
                             touch that ties into the account page identity). -->
                        <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300"
                             [ngClass]="initials() ? 'bg-ochre-500 text-warm-900' : 'bg-ochre-500/15 text-ochre-500'">
                            @if (initials(); as ini) {
                                <span class="text-2xl font-bold tracking-tight">{{ ini }}</span>
                            } @else {
                                <i class="pi pi-user text-2xl" aria-hidden="true"></i>
                            }
                        </div>
                        <h1 class="text-3xl md:text-4xl font-bold mb-3">{{ t('welcome.name.title') }}</h1>
                        <p class="text-surface-600 dark:text-surface-400">{{ t('welcome.name.subtitle') }}</p>
                    </div>
                    <label for="wfirst" class="block text-surface-600 dark:text-surface-400 text-sm mb-2">{{ t('welcome.name.label') }}</label>
                    <input pInputText id="wfirst" type="text" autocomplete="given-name" autocapitalize="words" autofocus
                           [placeholder]="t('welcome.name.placeholder')"
                           class="omaad-name-input w-full"
                           [ngModel]="firstName()" (ngModelChange)="firstName.set($event)" name="wfirst"
                           [disabled]="isLoading()" />
                    <label for="wlast" class="block text-surface-600 dark:text-surface-400 text-sm mb-2 mt-5">{{ t('welcome.name.lastLabel') }}</label>
                    <input pInputText id="wlast" type="text" autocomplete="family-name" autocapitalize="words"
                           [placeholder]="t('welcome.name.lastPlaceholder')"
                           class="omaad-name-input w-full"
                           [ngModel]="lastName()" (ngModelChange)="lastName.set($event)" name="wlast"
                           [disabled]="isLoading()" (keyup.enter)="saveName()" />
                    <button pButton pRipple type="button" [label]="t('welcome.name.continue')"
                            [loading]="isLoading()"
                            class="w-full !rounded-full !py-3 !text-base !font-semibold !border-0 transition-all duration-300 mt-8"
                            [ngClass]="{
                                'omaad-cta': nameComplete() && !isLoading(),
                                '!bg-surface-300 dark:!bg-surface-700 !text-surface-500 dark:!text-surface-400': !nameComplete() || isLoading()
                            }"
                            [disabled]="!nameComplete() || isLoading()"
                            (click)="saveName()"></button>
                </div>
                }

                @case ('notifications') {
                <!-- Enable push (Finary 10.jpeg): reuses the S9-B3 web-push flow -->
                <div class="min-h-screen flex flex-col step-in">
                    <div class="flex justify-end px-6 pt-6">
                        <button type="button" (click)="finish()" [disabled]="pushBusy()"
                                class="text-base font-medium text-surface-500 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 cursor-pointer disabled:opacity-50">
                            {{ t('welcome.notifications.later') }}
                        </button>
                    </div>

                    <div class="flex-1 flex items-center justify-center px-6">
                        <!-- Notification mockup -->
                        <div class="w-full max-w-sm rounded-3xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-4 shadow-xl">
                            @for (n of mockNotifs; track n.title) {
                                <div class="flex gap-3 rounded-2xl bg-surface-0 dark:bg-surface-800 p-3.5 mb-2.5 last:mb-0">
                                    <div class="w-9 h-9 shrink-0 rounded-lg bg-brand-700 flex items-center justify-center">
                                        <img src="assets/brand/omaad-icon.svg" alt="" class="w-5 h-5">
                                    </div>
                                    <div class="min-w-0">
                                        <div class="flex items-center justify-between gap-2">
                                            <span class="text-[13px] font-semibold truncate">{{ t(n.title) }}</span>
                                            <span class="text-[11px] text-surface-400 shrink-0">{{ t('welcome.notifications.now') }}</span>
                                        </div>
                                        <p class="text-[12px] text-surface-500 dark:text-surface-400 leading-snug mt-0.5">{{ t(n.body) }}</p>
                                    </div>
                                </div>
                            }
                        </div>
                    </div>

                    <div class="px-8 md:px-16 max-w-md w-full mx-auto pb-12">
                        <h1 class="text-2xl md:text-3xl font-bold leading-tight mb-3">{{ t('welcome.notifications.title') }}</h1>
                        <p class="text-surface-600 dark:text-surface-400 mb-8">{{ t('welcome.notifications.subtitle') }}</p>
                        <button pButton pRipple type="button" [label]="t('welcome.notifications.enable')"
                                [loading]="pushBusy()"
                                class="w-full !rounded-full !py-3 !text-base !font-semibold omaad-cta disabled:opacity-50"
                                [disabled]="pushBusy()"
                                (click)="enablePush()"></button>
                    </div>
                </div>
                }
            }
        </div>
    `,
    styles: [`
        @keyframes welcomeStepIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes welcomePopIn { 0% { opacity: 0; transform: scale(0.6); } 60% { transform: scale(1.08); } 100% { opacity: 1; transform: scale(1); } }
        .step-in { animation: welcomeStepIn 0.35s ease-out both; }
        .pop-in { animation: welcomePopIn 0.5s cubic-bezier(0.2, 0.8, 0.3, 1) both; }

        /* Premium filled name fields — one consistent treatment (overrides the
           global .p-inputtext skin via a higher-specificity element selector).
           Filled surface, clear border, ochre focus ring. */
        ::ng-deep input.omaad-name-input {
            background: var(--p-surface-50) !important;
            border: 1.5px solid var(--p-surface-200) !important;
            border-radius: 0.85rem !important;
            padding: 0.85rem 1rem !important;
            font-size: 1.05rem !important;
            box-shadow: none !important;
            transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }
        ::ng-deep input.omaad-name-input:focus,
        ::ng-deep input.omaad-name-input:focus-visible {
            border-color: var(--omaad-ochre-500, #C77B3C) !important;
            background: var(--p-surface-0) !important;
            box-shadow: 0 0 0 3px rgba(199, 123, 60, 0.18) !important;
        }
        :host-context(.app-dark) ::ng-deep input.omaad-name-input {
            background: var(--p-surface-800) !important;
            border-color: var(--p-surface-700) !important;
            color: var(--p-surface-0) !important;
        }
        :host-context(.app-dark) ::ng-deep input.omaad-name-input:focus {
            background: var(--p-surface-900) !important;
        }
    `]
})
export class Welcome implements OnInit {
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private api = inject(ApiService);
    private tokenService = inject(TokenService);
    private swPush = inject(SwPush);
    private messageService = inject(MessageService);
    private i18n = inject(I18nService);
    private flags = inject(FeatureFlagsService);

    t(key: string): string { return this.i18n.t(key); }

    step = signal<Step>('created');
    firstName = signal('');
    lastName = signal('');
    isLoading = signal(false);
    pushBusy = signal(false);

    // Both names are required so the account page is complete and the app can
    // address the user fully.
    nameComplete = computed(() => !!this.firstName().trim() && !!this.lastName().trim());

    // Live initials for the avatar: first letter of each name, uppercased.
    // Empty until the user types, so the avatar falls back to the user icon.
    initials = computed(() => {
        const f = this.firstName().trim();
        const l = this.lastName().trim();
        return ((f[0] ?? '') + (l[0] ?? '')).toUpperCase();
    });

    private currentLang = '/fr';
    private returnUrl = '/fr';
    // Prefetched on entering the notifications step so the enable click can call
    // requestSubscription synchronously (a network await first would drop the
    // user-activation and Android/Chrome would silently suppress the prompt).
    private vapidKey: string | null = null;

    // Sample notifications shown in the mockup (i18n keys, Omaad-relevant).
    readonly mockNotifs = [
        { title: 'welcome.notifications.n1Title', body: 'welcome.notifications.n1Body' },
        { title: 'welcome.notifications.n2Title', body: 'welcome.notifications.n2Body' },
        { title: 'welcome.notifications.n3Title', body: 'welcome.notifications.n3Body' },
    ];

    // iOS Safari only supports web push once the PWA is installed (mirrors the
    // settings notifications guard). When push can't work, skip that step.
    private isIos = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    private isStandalone = typeof window !== 'undefined'
        && (window.matchMedia('(display-mode: standalone)').matches
            || (navigator as unknown as { standalone?: boolean }).standalone === true);
    private pushUnavailable = computed(() => (this.isIos && !this.isStandalone) || !this.swPush.isEnabled);

    ngOnInit(): void {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        this.currentLang = '/' + (match ? match[1] : 'fr');
        this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || this.currentLang;

        const u = this.tokenService.user();
        if (u?.first_name) this.firstName.set(u.first_name);
        if (u?.last_name) this.lastName.set(u.last_name);

        // Hold the "Account created" beat briefly, then move on.
        setTimeout(() => this.afterCreated(), 1600);
    }

    /** From the success beat: collect the name unless BOTH first and last are
     *  already known (a Google user with a full name skips it; one with only a
     *  first name still gets asked for the last). */
    private afterCreated(): void {
        if (this.firstName().trim() && this.lastName().trim()) {
            this.goToNotifications();
        } else {
            this.step.set('name');
        }
    }

    saveName(): void {
        const first = this.firstName().trim();
        const last = this.lastName().trim();
        if (!first || !last || this.isLoading()) return;
        this.isLoading.set(true);
        this.api.updateProfile({ first_name: first, last_name: last }).subscribe({
            next: (user) => {
                this.isLoading.set(false);
                this.tokenService.setUser(user); // so the sidebar greets by name immediately
                this.goToNotifications();
            },
            error: () => {
                this.isLoading.set(false);
                this.messageService.add({ severity: 'error', summary: this.t('common.error'), detail: this.t('welcome.name.saveError'), life: 4000 });
            }
        });
    }

    /** Show the notifications step, or skip it when push can't work on this device. */
    private goToNotifications(): void {
        if (this.pushUnavailable()) { this.finish(); return; }
        // Warm the VAPID key NOW so the enable click stays inside the user gesture.
        firstValueFrom(this.api.getVapidPublicKey())
            .then(k => { this.vapidKey = k.public_key; })
            .catch(() => {});
        this.step.set('notifications');
    }

    async enablePush(): Promise<void> {
        if (this.pushBusy()) return;
        this.pushBusy.set(true);
        try {
            // Use the prefetched key so requestSubscription() is the FIRST async
            // op in this click handler — otherwise the awaited network call drops
            // the user-activation and the OS permission prompt never appears
            // (the "slow, no permission card on Android" bug). Fall back to a
            // fetch only if the prefetch hasn't landed yet.
            const key = this.vapidKey ?? (await firstValueFrom(this.api.getVapidPublicKey())).public_key;
            const subscription = await this.swPush.requestSubscription({ serverPublicKey: key });
            await firstValueFrom(this.api.registerPushSubscription(subscription.toJSON() as object, this.deviceLabel()));
            await firstValueFrom(this.api.updateNotificationPreferences({ push_enabled: true }));
            this.finish();
        } catch {
            // Permission denied / keys not configured / subscribe failed: don't
            // trap the user in onboarding, just move on (they can enable later
            // in Settings).
            this.pushBusy.set(false);
            this.finish();
        }
    }

    finish(): void {
        // A brand-new user always reaches Welcome (returning users never do), so
        // this is the auto-launch point for the first-run concierge (S12 Phase 6).
        // Behind ff_aiChat: with the flag off, fall back to the app as before.
        if (this.flags.aiChat()) {
            const lang = this.currentLang.replace('/', '') || 'fr';
            this.router.navigate(['/', lang, 'onboarding'], { replaceUrl: true });
            return;
        }
        this.router.navigate([this.returnUrl], { replaceUrl: true });
    }

    private deviceLabel(): string {
        const ua = navigator.userAgent;
        const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome'
            : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Web';
        const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS'
            : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : '';
        return os ? `${browser} / ${os}` : browser;
    }
}
