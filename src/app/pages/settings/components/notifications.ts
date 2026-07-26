import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SwPush } from '@angular/service-worker';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SelectModule } from 'primeng/select';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { I18nService } from '../../../i18n/i18n.service';
import { ApiService, NotificationPreferences, PushDevice } from '../../../core/services/api.service';

/**
 * Settings → Notifications (S9-B3): channel + signal opt-ins, quiet hours,
 * and the web-push subscription flow (VAPID via SwPush). Strict opt-in: the
 * backend treats a user without saved preferences as fully opted out, so
 * nothing is sent until something is enabled here.
 */
@Component({
    selector: 'app-settings-notifications',
    standalone: true,
    imports: [CommonModule, FormsModule, ToggleSwitchModule, SelectModule, DividerModule, ToastModule],
    providers: [MessageService],
    template: `
        <p-toast position="top-center" />
        <div class="px-1">

            <h2 class="hidden lg:block text-2xl font-semibold text-surface-900 dark:text-surface-0 mb-1">{{ t('settings.notifs.title') }}</h2>
            <p class="text-sm text-surface-500 dark:text-surface-400 mb-6">{{ t('settings.notifs.subtitle') }}</p>

            <!-- Channels: flat rows, hairline separators (Finary) -->
            <div class="divide-y divide-surface-200 dark:divide-surface-800">
                <div class="flex items-center justify-between gap-4 py-4">
                    <div class="min-w-0">
                        <p class="font-medium text-surface-900 dark:text-surface-0" id="notif-email-label">{{ t('settings.notifs.email') }}</p>
                        <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.notifs.emailDesc') }}</p>
                    </div>
                    <p-toggleswitch [ngModel]="prefs().email_enabled" [disabled]="loading()"
                                    (onChange)="save({ email_enabled: $event.checked })"
                                    ariaLabelledBy="notif-email-label" />
                </div>

                <div class="py-4">
                    <div class="flex items-center justify-between gap-4">
                        <div class="min-w-0">
                            <p class="font-medium text-surface-900 dark:text-surface-0" id="notif-push-label">{{ t('settings.notifs.push') }}</p>
                            <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.notifs.pushDesc') }}</p>
                        </div>
                        <p-toggleswitch [ngModel]="prefs().push_enabled" [disabled]="loading() || pushBusy()"
                                        (onChange)="onPushToggle($event.checked)"
                                        ariaLabelledBy="notif-push-label" />
                    </div>
                    @if (pushUnavailableReason()) {
                        <p class="text-xs text-surface-500 dark:text-surface-400 mt-3 flex items-center gap-1.5">
                            <i class="pi pi-info-circle" aria-hidden="true"></i>
                            {{ pushUnavailableReason() }}
                        </p>
                    }
                    @if (prefs().push_enabled && devices().length > 0) {
                        <ul class="mt-4 divide-y divide-surface-200 dark:divide-surface-800 border-t border-surface-200 dark:border-surface-800"
                            [attr.aria-label]="t('settings.notifs.devices')">
                            @for (device of devices(); track device.id) {
                                <li class="flex items-center justify-between text-sm py-3">
                                    <span class="truncate text-surface-600 dark:text-surface-300">
                                        <i class="pi pi-mobile mr-2" aria-hidden="true"></i>{{ device.user_agent || t('settings.notifs.unknownDevice') }}
                                    </span>
                                    <button type="button" (click)="removeDevice(device)"
                                            class="text-negative-700 dark:text-negative-400 hover:underline text-xs font-medium shrink-0 ml-3"
                                            [attr.aria-label]="t('settings.notifs.removeDevice')">
                                        {{ t('settings.notifs.removeDevice') }}
                                    </button>
                                </li>
                            }
                        </ul>
                    }
                </div>
            </div>

            <!-- Group: signals (Finary group = big heading + one-line description) -->
            <div class="mt-8 pt-8 border-t border-surface-200 dark:border-surface-800">
                <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 mb-1">{{ t('settings.notifs.signals') }}</h3>
                <div class="divide-y divide-surface-200 dark:divide-surface-800">
                    <div class="flex items-center justify-between gap-4 py-4">
                        <div class="min-w-0">
                            <p class="font-medium text-surface-900 dark:text-surface-0" id="notif-budget-label">{{ t('settings.notifs.budget') }}</p>
                            <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.notifs.budgetDesc') }}</p>
                        </div>
                        <p-toggleswitch [ngModel]="prefs().signal_budget" [disabled]="loading()"
                                        (onChange)="save({ signal_budget: $event.checked })"
                                        ariaLabelledBy="notif-budget-label" />
                    </div>
                    <div class="flex items-center justify-between gap-4 py-4">
                        <div class="min-w-0">
                            <p class="font-medium text-surface-900 dark:text-surface-0" id="notif-tontine-label">{{ t('settings.notifs.tontine') }}</p>
                            <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.notifs.tontineDesc') }}</p>
                        </div>
                        <p-toggleswitch [ngModel]="prefs().signal_tontine" [disabled]="loading()"
                                        (onChange)="save({ signal_tontine: $event.checked })"
                                        ariaLabelledBy="notif-tontine-label" />
                    </div>
                </div>
            </div>

            <!-- Group: quiet hours -->
            <div class="mt-4 pt-8 border-t border-surface-200 dark:border-surface-800">
                <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 mb-1">{{ t('settings.notifs.quietHours') }}</h3>
                <p class="text-sm text-surface-500 dark:text-surface-400 mb-5">{{ t('settings.notifs.quietHoursDesc') }}</p>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4 omaad-quiet-form">
                    <div class="flex flex-col gap-1">
                        <label for="quiet-start" class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.notifs.quietFrom') }}</label>
                        <input id="quiet-start" type="time" [ngModel]="prefs().quiet_hours_start" [disabled]="loading()"
                               (ngModelChange)="save({ quiet_hours_start: $event })"
                               class="py-2.5 bg-transparent border-0 border-b border-surface-300 dark:border-surface-600 text-surface-900 dark:text-surface-0 focus:border-brand-700 dark:focus:border-ochre-400 focus:outline-none" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="quiet-end" class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.notifs.quietTo') }}</label>
                        <input id="quiet-end" type="time" [ngModel]="prefs().quiet_hours_end" [disabled]="loading()"
                               (ngModelChange)="save({ quiet_hours_end: $event })"
                               class="py-2.5 bg-transparent border-0 border-b border-surface-300 dark:border-surface-600 text-surface-900 dark:text-surface-0 focus:border-brand-700 dark:focus:border-ochre-400 focus:outline-none" />
                    </div>
                    <div class="flex flex-col gap-1 col-span-2 md:col-span-1">
                        <label for="quiet-tz" class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.notifs.timezone') }}</label>
                        <p-select inputId="quiet-tz" [ngModel]="prefs().timezone" [options]="timezones" [disabled]="loading()"
                                  (onChange)="save({ timezone: $event.value })"
                                  class="w-full" styleClass="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !shadow-none" />
                    </div>
                </div>
            </div>
        </div>
    `
})
export class NotificationsSettings implements OnInit {
    private i18n = inject(I18nService);
    private api = inject(ApiService);
    private swPush = inject(SwPush);
    private messageService = inject(MessageService);

    loading = signal(true);
    pushBusy = signal(false);
    prefs = signal<NotificationPreferences>({
        email_enabled: false, push_enabled: false,
        signal_budget: true, signal_tontine: true,
        quiet_hours_start: '21:00', quiet_hours_end: '08:00',
        timezone: 'Africa/Dakar',
    });
    devices = signal<PushDevice[]>([]);

    // Detected zone first so most users can pick their own with one tap.
    timezones = [...new Set([
        this.detectedTimezone(),
        'Africa/Dakar', 'Africa/Abidjan', 'Africa/Bamako', 'Africa/Lome',
        'Europe/Paris', 'Europe/London', 'America/New_York', 'America/Montreal', 'UTC',
    ].filter(Boolean))] as string[];

    // iOS Safari only supports web push once the PWA is installed.
    private isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    private isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || (navigator as unknown as { standalone?: boolean }).standalone === true;

    pushUnavailableReason = computed(() => {
        if (this.isIos && !this.isStandalone) return this.t('settings.notifs.iosHint');
        if (!this.swPush.isEnabled) return this.t('settings.notifs.swDisabledHint');
        return '';
    });

    ngOnInit() {
        this.api.getNotificationPreferences().subscribe({
            next: prefs => { this.prefs.set(prefs); this.loading.set(false); },
            error: () => this.loading.set(false),
        });
        this.refreshDevices();
    }

    save(changes: Partial<NotificationPreferences>) {
        this.api.updateNotificationPreferences(changes).subscribe({
            next: prefs => this.prefs.set(prefs),
            error: () => this.toastError(this.t('settings.notifs.saveError')),
        });
    }

    async onPushToggle(enabled: boolean) {
        if (!enabled) {
            this.save({ push_enabled: false });
            return;
        }
        if (this.pushUnavailableReason()) {
            this.prefs.update(p => ({ ...p, push_enabled: false }));
            this.toastError(this.pushUnavailableReason());
            return;
        }
        this.pushBusy.set(true);
        try {
            const { public_key } = await firstValueFrom(this.api.getVapidPublicKey());
            const subscription = await this.swPush.requestSubscription({ serverPublicKey: public_key });
            const label = this.deviceLabel();
            await firstValueFrom(this.api.registerPushSubscription(subscription.toJSON() as object, label));
            this.save({ push_enabled: true });
            this.refreshDevices();
            this.messageService.add({ severity: 'success', summary: this.t('settings.notifs.pushEnabled'), life: 3000 });
        } catch {
            // Permission denied, 503 (keys not configured), or subscribe failure.
            this.prefs.update(p => ({ ...p, push_enabled: false }));
            this.toastError(this.t('settings.notifs.pushError'));
        } finally {
            this.pushBusy.set(false);
        }
    }

    removeDevice(device: PushDevice) {
        this.api.removePushSubscription(device.endpoint).subscribe({
            next: () => this.refreshDevices(),
            error: () => this.toastError(this.t('settings.notifs.saveError')),
        });
    }

    private refreshDevices() {
        this.api.listPushDevices().subscribe({
            next: devices => this.devices.set(devices),
            error: () => {},
        });
    }

    private detectedTimezone(): string | null {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
        } catch {
            return null;
        }
    }

    private deviceLabel(): string {
        const ua = navigator.userAgent;
        const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome'
            : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Web';
        const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS'
            : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : '';
        return os ? `${browser} / ${os}` : browser;
    }

    private toastError(detail: string) {
        this.messageService.add({ severity: 'error', summary: detail, life: 4000 });
    }

    t(key: string, params?: Record<string, string | number>): string {
        return this.i18n.t(key, params);
    }
}
