import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SwPush } from '@angular/service-worker';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SelectModule } from 'primeng/select';
import { DividerModule } from 'primeng/divider';

import { firstValueFrom } from 'rxjs';
import { I18nService } from '../../../i18n/i18n.service';
import { ApiService, NotificationPreferences, PushDevice } from '../../../core/services/api.service';
import { FeedbackService } from '../../../core/ui/feedback.service';

/**
 * Settings → Notifications (S9-B3): channel + signal opt-ins, quiet hours,
 * and the web-push subscription flow (VAPID via SwPush). Strict opt-in: the
 * backend treats a user without saved preferences as fully opted out, so
 * nothing is sent until something is enabled here.
 */
@Component({
    selector: 'app-settings-notifications',
    standalone: true,
    imports: [CommonModule, FormsModule, ToggleSwitchModule, SelectModule, DividerModule],
    template: `
        <div class="px-1">

            <h2 class="hidden lg:block text-2xl font-semibold text-surface-900 dark:text-surface-0 mb-1">{{ t('settings.notifs.title') }}</h2>
            <p class="text-sm text-surface-500 dark:text-surface-400 mb-6">{{ t('settings.notifs.subtitle') }}</p>

            <!-- Cold start only (empty cache): show a shaped skeleton so we never
                 paint a toggle in the wrong position while the first fetch lands.
                 A warm start / refresh skips this entirely and paints cached values. -->
            @if (loading()) {
                <div class="animate-pulse" aria-hidden="true" [attr.aria-busy]="true">
                    <div class="divide-y divide-surface-200 dark:divide-surface-800">
                        @for (row of [1, 2]; track row) {
                            <div class="flex items-center justify-between gap-4 py-4">
                                <div class="min-w-0 flex-1 space-y-2">
                                    <div class="h-4 w-32 rounded bg-surface-200 dark:bg-surface-700"></div>
                                    <div class="h-3 w-48 max-w-full rounded bg-surface-100 dark:bg-surface-800"></div>
                                </div>
                                <div class="h-6 w-11 rounded-full bg-surface-200 dark:bg-surface-700 shrink-0"></div>
                            </div>
                        }
                    </div>
                    <div class="mt-8 pt-8 border-t border-surface-200 dark:border-surface-800">
                        <div class="h-6 w-40 rounded bg-surface-200 dark:bg-surface-700 mb-4"></div>
                        <div class="divide-y divide-surface-200 dark:divide-surface-800">
                            @for (row of [1, 2]; track row) {
                                <div class="flex items-center justify-between gap-4 py-4">
                                    <div class="min-w-0 flex-1 space-y-2">
                                        <div class="h-4 w-32 rounded bg-surface-200 dark:bg-surface-700"></div>
                                        <div class="h-3 w-48 max-w-full rounded bg-surface-100 dark:bg-surface-800"></div>
                                    </div>
                                    <div class="h-6 w-11 rounded-full bg-surface-200 dark:bg-surface-700 shrink-0"></div>
                                </div>
                            }
                        </div>
                    </div>
                    <div class="mt-4 pt-8 border-t border-surface-200 dark:border-surface-800">
                        <div class="h-6 w-40 rounded bg-surface-200 dark:bg-surface-700 mb-5"></div>
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                            @for (col of [1, 2, 3]; track col) {
                                <div class="h-10 rounded bg-surface-200 dark:bg-surface-700"></div>
                            }
                        </div>
                    </div>
                </div>
            } @else {
            <!-- Channels: flat rows, hairline separators (Finary) -->
            <div class="divide-y divide-surface-200 dark:divide-surface-800">
                <div class="flex items-center justify-between gap-4 py-4">
                    <div class="min-w-0">
                        <p class="font-medium text-surface-900 dark:text-surface-0" id="notif-email-label">{{ t('settings.notifs.email') }}</p>
                        <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.notifs.emailDesc') }}</p>
                    </div>
                    <p-toggleswitch [ngModel]="prefs().email_enabled"
                                    (onChange)="save({ email_enabled: $event.checked })"
                                    ariaLabelledBy="notif-email-label" />
                </div>

                <div class="py-4">
                    <div class="flex items-center justify-between gap-4">
                        <div class="min-w-0">
                            <p class="font-medium text-surface-900 dark:text-surface-0" id="notif-push-label">{{ t('settings.notifs.push') }}</p>
                            <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.notifs.pushDesc') }}</p>
                        </div>
                        <p-toggleswitch [ngModel]="prefs().push_enabled" [disabled]="pushBusy()"
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
                        <p-toggleswitch [ngModel]="prefs().signal_budget"
                                        (onChange)="save({ signal_budget: $event.checked })"
                                        ariaLabelledBy="notif-budget-label" />
                    </div>
                    <div class="flex items-center justify-between gap-4 py-4">
                        <div class="min-w-0">
                            <p class="font-medium text-surface-900 dark:text-surface-0" id="notif-tontine-label">{{ t('settings.notifs.tontine') }}</p>
                            <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.notifs.tontineDesc') }}</p>
                        </div>
                        <p-toggleswitch [ngModel]="prefs().signal_tontine"
                                        (onChange)="save({ signal_tontine: $event.checked })"
                                        ariaLabelledBy="notif-tontine-label" />
                    </div>
                    <div class="flex items-center justify-between gap-4 py-4">
                        <div class="min-w-0">
                            <p class="font-medium text-surface-900 dark:text-surface-0" id="notif-milestone-label">{{ t('settings.notifs.milestone') }}</p>
                            <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.notifs.milestoneDesc') }}</p>
                        </div>
                        <p-toggleswitch [ngModel]="prefs().signal_milestone"
                                        (onChange)="save({ signal_milestone: $event.checked })"
                                        ariaLabelledBy="notif-milestone-label" />
                    </div>
                    <div class="flex items-center justify-between gap-4 py-4">
                        <div class="min-w-0">
                            <p class="font-medium text-surface-900 dark:text-surface-0" id="notif-custom-label">{{ t('settings.notifs.customRules') }}</p>
                            <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.notifs.customRulesDesc') }}</p>
                        </div>
                        <p-toggleswitch [ngModel]="prefs().signal_custom_rules"
                                        (onChange)="save({ signal_custom_rules: $event.checked })"
                                        ariaLabelledBy="notif-custom-label" />
                    </div>
                </div>
            </div>

            <!-- Group: reports (S13 AI-73). Pro feature; the button downloads a PDF. -->
            <div class="mt-4 pt-8 border-t border-surface-200 dark:border-surface-800">
                <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 mb-1">{{ t('settings.notifs.reports') }}</h3>
                <div class="flex items-center justify-between gap-4 py-4">
                    <div class="min-w-0">
                        <p class="font-medium text-surface-900 dark:text-surface-0" id="notif-weekly-label">{{ t('settings.notifs.weeklyReport') }}</p>
                        <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.notifs.weeklyReportDesc') }}</p>
                    </div>
                    <p-toggleswitch [ngModel]="prefs().signal_weekly_report"
                                    (onChange)="save({ signal_weekly_report: $event.checked })"
                                    ariaLabelledBy="notif-weekly-label" />
                </div>
                <div class="flex items-center justify-between gap-4 py-4">
                    <div class="min-w-0">
                        <p class="font-medium text-surface-900 dark:text-surface-0">{{ t('settings.notifs.reportMonthly') }}</p>
                        <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.notifs.reportMonthlyDesc') }}</p>
                    </div>
                    <button type="button" (click)="downloadReport()" [disabled]="reportBusy()"
                            class="omaad-press inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full
                                   border border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-200
                                   hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors disabled:opacity-50 shrink-0">
                        <i class="pi shrink-0" [ngClass]="reportBusy() ? 'pi-spin pi-spinner' : 'pi-download'" style="font-size: 12px" aria-hidden="true"></i>
                        {{ t('settings.notifs.reportDownload') }}
                    </button>
                </div>
            </div>

            <!-- Group: quiet hours -->
            <div class="mt-4 pt-8 border-t border-surface-200 dark:border-surface-800">
                <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 mb-1">{{ t('settings.notifs.quietHours') }}</h3>
                <p class="text-sm text-surface-500 dark:text-surface-400 mb-5">{{ t('settings.notifs.quietHoursDesc') }}</p>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4 omaad-form">
                    <div class="flex flex-col gap-1">
                        <label for="quiet-start" class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.notifs.quietFrom') }}</label>
                        <input id="quiet-start" type="time" [ngModel]="prefs().quiet_hours_start"
                               (ngModelChange)="save({ quiet_hours_start: $event })"
                               class="text-surface-900 dark:text-surface-0" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="quiet-end" class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.notifs.quietTo') }}</label>
                        <input id="quiet-end" type="time" [ngModel]="prefs().quiet_hours_end"
                               (ngModelChange)="save({ quiet_hours_end: $event })"
                               class="text-surface-900 dark:text-surface-0" />
                    </div>
                    <div class="flex flex-col gap-1 col-span-2 md:col-span-1">
                        <label for="quiet-tz" class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.notifs.timezone') }}</label>
                        <p-select inputId="quiet-tz" [ngModel]="prefs().timezone" [options]="timezones"
                                  (onChange)="save({ timezone: $event.value })"
                                  class="w-full" styleClass="w-full" />
                    </div>
                </div>
            </div>
            }
        </div>
    `
})
export class NotificationsSettings implements OnInit {
    private i18n = inject(I18nService);
    private feedback = inject(FeedbackService);
    private api = inject(ApiService);
    private swPush = inject(SwPush);

    // Seed synchronously from the last-known cache so the real toggle states
    // paint on the first frame (flash-free). `loading` is the skeleton gate and
    // is true ONLY on a true cold start (empty cache); a warm start / refresh
    // shows the cached values instantly and revalidates silently in ngOnInit.
    private cachedPrefs = this.api.getCachedNotificationPreferences();
    loading = signal(this.cachedPrefs === null);
    pushBusy = signal(false);
    // Neutral defaults match the backend's "no saved prefs = fully opted out"
    // rule, so even the cold-start fallback never shows a toggle in the wrong
    // position. These are only ever visible if the network fails on a cold start.
    prefs = signal<NotificationPreferences>(this.cachedPrefs ?? {
        email_enabled: false, push_enabled: false,
        signal_budget: false, signal_tontine: false, signal_milestone: false,
        signal_weekly_report: true, signal_custom_rules: true,
        quiet_hours_start: '21:00', quiet_hours_end: '08:00',
        timezone: 'Africa/Dakar',
    });
    reportBusy = signal(false);
    // Once the user changes anything, a late-returning background revalidate
    // must not clobber their edit.
    private userTouched = false;
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
        // Revalidate in the background. Warm start: cached values are already on
        // screen, so this silently reconciles. Cold start: this fills the
        // skeleton. Either way, don't overwrite an edit the user just made.
        this.api.getNotificationPreferences().subscribe({
            next: prefs => { if (!this.userTouched) this.prefs.set(prefs); this.loading.set(false); },
            error: () => this.loading.set(false),
        });
        this.refreshDevices();
    }

    save(changes: Partial<NotificationPreferences>) {
        this.userTouched = true;
        this.api.updateNotificationPreferences(changes).subscribe({
            next: prefs => this.prefs.set(prefs),
            error: () => this.toastError(this.t('settings.notifs.saveError')),
        });
    }

    async onPushToggle(enabled: boolean) {
        this.userTouched = true;
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
            this.feedback.success(this.t('settings.notifs.pushEnabled'));
        } catch {
            // Permission denied, 503 (keys not configured), or subscribe failure.
            this.prefs.update(p => ({ ...p, push_enabled: false }));
            this.toastError(this.t('settings.notifs.pushError'));
        } finally {
            this.pushBusy.set(false);
        }
    }

    /** S13 AI-73: fetch the monthly report PDF (via the auth interceptor) and
     *  trigger a browser download. A 403 is the Pro gate, surfaced as a toast. */
    downloadReport() {
        this.reportBusy.set(true);
        this.api.downloadMonthlyReport().subscribe({
            next: (blob) => {
                this.reportBusy.set(false);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'omaad-rapport-mensuel.pdf';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            },
            error: () => {
                this.reportBusy.set(false);
                this.toastError(this.t('settings.notifs.reportError'));
            },
        });
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
        this.feedback.error(detail);
    }

    t(key: string, params?: Record<string, string | number>): string {
        return this.i18n.t(key, params);
    }
}
