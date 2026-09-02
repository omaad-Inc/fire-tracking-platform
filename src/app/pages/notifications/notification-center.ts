import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService } from '../../i18n/i18n.service';
import { InboxItem } from '../../core/services/api.service';
import { NavService } from '../../core/services/nav.service';
import { NotificationCenterService } from '../../core/services/notification-center.service';
import { EmptyStateComponent, PageHeaderComponent, UiCardComponent } from '../../core/ui';

interface DayGroup {
    label: string;
    items: InboxItem[];
}

/**
 * The notification center (P1-1), web parity with the Flutter
 * `notification_center_screen.dart`: the stored history behind every push and
 * email, so a notification the user dismissed is never lost.
 *
 * Day-grouped, newest first. A tap marks the entry read and follows its deep
 * link — resolved from `kind` through NotificationCenterService.webRouteFor(),
 * NOT from the item's `link` field, which holds a Flutter route (see the
 * mobile-route trap documented on that service).
 *
 * Rows are real `<button>`s: the list is a set of actions, so it must be
 * keyboard reachable and announced as such.
 */
@Component({
    selector: 'app-notification-center',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, ButtonModule, PageHeaderComponent, UiCardComponent, EmptyStateComponent],
    host: {
        // Coming back to the tab should not show a stale list. TTL-guarded, so
        // rapid alt-tabbing costs no extra requests.
        '(window:focus)': 'center.ensureLoaded()',
    },
    template: `
        <div class="flex flex-col gap-6" data-testid="notif-center">
            <app-page-header
                icon="pi-bell"
                [title]="t('notifCenter.title')"
                [subtitle]="t('notifCenter.subtitle')">
                @if (unread() > 0) {
                    <p-button
                        actions
                        [label]="t('notifCenter.markAll')"
                        icon="pi pi-check"
                        [text]="true"
                        styleClass="!text-ochre-600 dark:!text-ochre-400 !font-semibold"
                        data-testid="notif-mark-all"
                        (onClick)="markAll()" />
                }
            </app-page-header>

            @if (center.loading()) {
                <!-- Cold load only: a background revalidation keeps the list visible. -->
                <app-ui-card padding="none">
                    <div class="divide-y divide-surface-200 dark:divide-surface-700">
                        @for (row of skeletonRows; track row) {
                            <div class="flex items-center gap-3.5 px-4 py-4">
                                <div class="w-9 h-9 rounded-full shrink-0 bg-surface-200 dark:bg-surface-700 animate-pulse"></div>
                                <div class="flex-1 min-w-0 space-y-2">
                                    <div class="h-3 rounded bg-surface-200 dark:bg-surface-700 animate-pulse" [style.width]="row"></div>
                                    <div class="h-2.5 w-12 rounded bg-surface-200 dark:bg-surface-700 animate-pulse"></div>
                                </div>
                            </div>
                        }
                    </div>
                </app-ui-card>
            } @else if (center.failed()) {
                <!-- Cold failure: say so and offer retry, never a fake-empty inbox. -->
                <app-ui-card>
                    <div class="flex flex-col items-center text-center px-6 py-10">
                        <span class="w-14 h-14 rounded-2xl grid place-items-center mb-4
                                     bg-surface-100 dark:bg-surface-800 text-surface-400 dark:text-surface-500">
                            <i class="pi pi-wifi text-2xl"></i>
                        </span>
                        <h3 class="text-subheading font-bold text-surface-900 dark:text-surface-0 m-0">
                            {{ t('common.loadErrorTitle') }}
                        </h3>
                        <p class="text-sm text-surface-500 dark:text-surface-400 mt-2 mb-0 max-w-sm">
                            {{ t('common.loadErrorBody') }}
                        </p>
                        <p-button
                            class="mt-5"
                            [label]="t('common.retry')"
                            icon="pi pi-refresh"
                            styleClass="omaad-cta !rounded-xl"
                            data-testid="notif-retry"
                            (onClick)="center.refresh()" />
                    </div>
                </app-ui-card>
            } @else if (!groups().length) {
                <app-ui-card>
                    <app-empty-state
                        icon="pi-bell"
                        [title]="t('notifCenter.emptyTitle')"
                        [message]="t('notifCenter.emptyMessage')" />
                </app-ui-card>
            } @else {
                @for (group of groups(); track group.label) {
                    <section class="flex flex-col gap-2">
                        <h2 class="text-eyebrow uppercase font-semibold tracking-wider
                                   text-surface-400 dark:text-surface-500 m-0 px-1">
                            {{ group.label }}
                        </h2>
                        <app-ui-card padding="none">
                            <div class="divide-y divide-surface-200 dark:divide-surface-700">
                                @for (item of group.items; track item.id) {
                                    <button type="button"
                                            data-testid="notif-row"
                                            [attr.data-kind]="item.kind"
                                            [attr.data-read]="item.read"
                                            (click)="open(item)"
                                            class="w-full flex items-start gap-3.5 px-4 py-3.5 text-left
                                                   transition-colors first:rounded-t-2xl last:rounded-b-2xl
                                                   hover:bg-surface-50 dark:hover:bg-surface-800
                                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ochre-500/60">
                                        <span class="w-9 h-9 rounded-full grid place-items-center shrink-0"
                                              [class]="item.read
                                                  ? 'bg-surface-100 dark:bg-surface-800 text-surface-400 dark:text-surface-500'
                                                  : 'bg-ochre-500 text-warm-900'">
                                            <i class="pi {{ center.iconFor(item.kind) }} text-sm" aria-hidden="true"></i>
                                        </span>
                                        <span class="flex-1 min-w-0">
                                            <span class="block text-sm leading-snug"
                                                  [class]="item.read
                                                      ? 'text-surface-500 dark:text-surface-400'
                                                      : 'text-surface-900 dark:text-surface-0 font-semibold'">
                                                {{ item.text }}
                                            </span>
                                            <span class="block text-[11px] text-surface-400 dark:text-surface-500 mt-1">
                                                {{ time(item.created_at) }}
                                            </span>
                                        </span>
                                        @if (!item.read) {
                                            <span class="w-2 h-2 rounded-full bg-ochre-500 shrink-0 mt-1.5"
                                                  aria-hidden="true"></span>
                                        }
                                    </button>
                                }
                            </div>
                        </app-ui-card>
                    </section>
                }
            }
        </div>
    `,
})
export class NotificationCenterPage implements OnInit {
    private i18n = inject(I18nService);
    private router = inject(Router);
    private nav = inject(NavService);
    center = inject(NotificationCenterService);

    /** Varied widths so the skeleton reads as text, not as four identical bars. */
    readonly skeletonRows = ['78%', '62%', '85%', '55%'];

    readonly unread = this.center.unreadCount;

    /** Day-grouped in arrival order. Reads `i18n.lang()` through `t()`, so a
     *  language switch relabels "Today"/"Yesterday" without a refetch. */
    readonly groups = computed<DayGroup[]>(() => {
        const out: DayGroup[] = [];
        for (const item of this.center.items()) {
            const label = this.dayLabel(new Date(item.created_at));
            const last = out[out.length - 1];
            if (last && last.label === label) last.items.push(item);
            else out.push({ label, items: [item] });
        }
        return out;
    });

    ngOnInit(): void {
        this.center.ensureLoaded();
    }

    t(key: string, params?: Record<string, string | number>): string {
        return this.i18n.t(key, params);
    }

    /** Mark read and follow the deep link. The write is optimistic and not
     *  awaited, so navigation is instant (the badge settles from cache). */
    async open(item: InboxItem): Promise<void> {
        const route = this.center.webRouteFor(item.kind);
        void this.center.markRead([item.id]);
        await this.router.navigate(this.nav.link(...route.segments), {
            queryParams: route.queryParams ?? {},
        });
    }

    markAll(): void {
        void this.center.markAllRead();
    }

    time(iso: string): string {
        return new Intl.DateTimeFormat(this.locale(), {
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(iso));
    }

    private locale(): string {
        return this.i18n.lang() === 'fr' ? 'fr-FR' : 'en-US';
    }

    private dayLabel(when: Date): string {
        const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const today = new Date();
        const days = Math.round((midnight(today) - midnight(when)) / 86_400_000);
        if (days === 0) return this.t('notifCenter.today');
        if (days === 1) return this.t('notifCenter.yesterday');
        return new Intl.DateTimeFormat(this.locale(), {
            day: 'numeric',
            month: 'long',
            // Only disambiguate the year once the entry is from another one.
            ...(when.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }),
        }).format(when);
    }
}
