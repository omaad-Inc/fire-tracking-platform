import { Injectable, computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService, InboxItem, InboxResponse } from './api.service';
import { CACHE_RESET } from './cache-reset.token';
import { cachedResource } from '../util/cached-resource';

/**
 * Data layer for the notification center (P1-1).
 *
 * The inbox is the stored history behind every push/email, so a notification
 * the user swiped away is never lost. One `cachedResource` (P2-FE-1) serves
 * BOTH consumers, so the topbar badge and the page share a single request:
 * `unread_count` from the API spans the whole inbox, not just the loaded page.
 *
 * ── The mobile-route trap ──────────────────────────────────────────────────
 * `InboxItem.link` is written by the backend from `_FCM_MOBILE_ROUTES`
 * (backend/app/services/notification_service.py), i.e. it holds FLUTTER
 * go_router paths: "/transactions", "/goals", "/reports/weekly". Those are not
 * web routes — the web equivalent of "/transactions" is "/pages/transaction"
 * (SINGULAR) and of "/reports/weekly" is "/pages/reports/weekly". Navigating
 * `link` verbatim therefore lands the user on /notfound.
 *
 * So the web resolves its own destination from `kind`, never by string-matching
 * `link`. NOTIF_WEB_ROUTES below is the ONE place that mapping lives; segments
 * are relative and get their /:lang (or /share/:token) prefix from NavService.
 */

/** The kinds the backend can emit (`notification_inbox.kind`). */
export type NotifKind =
    | 'budget'
    | 'tontine'
    | 'milestone'
    | 'custom_rule'
    | 'weekly_report'
    | 'renewal_reminder';

export interface NotifWebRoute {
    /** Relative segments for NavService.link() — NO language prefix here. */
    segments: string[];
    /** Query params the destination needs (e.g. which hub tab to open). */
    queryParams?: Record<string, string>;
}

/**
 * kind → WEB destination. Deliberately keyed on `kind`, not on the mobile
 * `link` string, so a backend route change on the mobile side cannot silently
 * redirect the web app.
 *
 * `budget` improves on mobile parity: mobile has no budgets deep-link and
 * settles for /transactions, while the web Transactions hub hosts Budgets as a
 * real tab (`?view=budgets`, see transaction.ts), so the tap lands on the
 * actual budget the alert is about.
 *
 * `weekly_report` lands on the in-app recap (P2-4, /pages/reports/weekly), the
 * same bundle the Monday email renders.
 */
export const NOTIF_WEB_ROUTES: Record<NotifKind, NotifWebRoute> = {
    budget:           { segments: ['pages', 'transaction'], queryParams: { view: 'budgets' } },
    tontine:          { segments: ['pages', 'patrimoine'] },
    milestone:        { segments: ['pages', 'goals'] },
    custom_rule:      { segments: [] },                       // dashboard
    weekly_report:    { segments: ['pages', 'reports', 'weekly'] },
    renewal_reminder: { segments: ['pages', 'settings', 'subscription'] },
};

/** PrimeIcons glyph per kind (mirrors the Flutter center's icon set, plus the
 *  `renewal_reminder` icon that screen is missing). */
export const NOTIF_KIND_ICONS: Record<NotifKind, string> = {
    budget:           'pi-gauge',
    tontine:          'pi-users',
    milestone:        'pi-flag',
    custom_rule:      'pi-bell',
    weekly_report:    'pi-chart-bar',
    renewal_reminder: 'pi-credit-card',
};

/** Unknown kind (a newer backend than this build): a generic bell, and a tap
 *  goes to the dashboard rather than nowhere. */
const FALLBACK_ROUTE: NotifWebRoute = { segments: [] };
const FALLBACK_ICON = 'pi-bell';

@Injectable({ providedIn: 'root' })
export class NotificationCenterService {
    private api = inject(ApiService);

    /** No `persistKey`: unread state goes stale fast and a device snapshot
     *  would paint a wrong badge count on boot before revalidating. */
    private inboxRes = cachedResource<InboxResponse>(
        () => firstValueFrom(this.api.getInbox()),
        { ttl: 60_000 },
    );

    readonly items = computed<InboxItem[]>(() => this.inboxRes.data()?.items ?? []);
    readonly unreadCount = computed<number>(() => this.inboxRes.data()?.unread_count ?? 0);

    /** Skeleton the list ONLY on a cold load; a background revalidation of
     *  already-cached entries must not reflash it. */
    readonly loading = computed(
        () => this.inboxRes.status() === 'loading' && this.inboxRes.data() === null,
    );
    /** Cold failure only (nothing cached to show), so the page can offer retry
     *  instead of a fake-empty "no notifications" state. */
    readonly failed = computed(() => this.inboxRes.status() === 'error');

    constructor() {
        inject(CACHE_RESET).subscribe(() => this.inboxRes.reset());
    }

    /** Serve from cache or fetch. Safe on every `ngOnInit` and on topbar init:
     *  within the TTL it is a no-op, and concurrent callers share one request. */
    ensureLoaded(): void {
        void this.inboxRes.load().catch(() => { /* `failed` drives the retry UI */ });
    }

    /** Force a refetch (pull-to-refresh, window focus, retry button). */
    async refresh(): Promise<void> {
        try {
            await this.inboxRes.load(true);
        } catch {
            /* `failed` drives the retry UI */
        }
    }

    /**
     * Mark entries read, updating the cache first so the row and the badge
     * settle instantly. On failure the cache is invalidated so the next read
     * resyncs with the server rather than leaving an optimistic lie.
     */
    async markRead(ids: number[]): Promise<void> {
        const snapshot = this.inboxRes.peek();
        if (!snapshot) return;
        const target = new Set(ids);
        const actuallyUnread = snapshot.items.filter(i => target.has(i.id) && !i.read).length;
        if (!actuallyUnread) return; // already read: no write, no badge churn

        this.inboxRes.set({
            items: snapshot.items.map(i => (target.has(i.id) ? { ...i, read: true } : i)),
            unread_count: Math.max(0, snapshot.unread_count - actuallyUnread),
        });
        try {
            await firstValueFrom(this.api.markInboxRead({ ids }));
        } catch {
            this.inboxRes.invalidate();
        }
    }

    /** Mark the WHOLE inbox read (not just the loaded page, hence `all`). */
    async markAllRead(): Promise<void> {
        const snapshot = this.inboxRes.peek();
        if (snapshot) {
            this.inboxRes.set({
                items: snapshot.items.map(i => (i.read ? i : { ...i, read: true })),
                unread_count: 0,
            });
        }
        try {
            await firstValueFrom(this.api.markInboxRead({ all: true }));
        } catch {
            this.inboxRes.invalidate();
        }
    }

    /** Where a tap on this entry goes ON THE WEB. Driven by `kind`; the item's
     *  own `link` (a mobile route) is intentionally ignored. */
    webRouteFor(kind: string): NotifWebRoute {
        return NOTIF_WEB_ROUTES[kind as NotifKind] ?? FALLBACK_ROUTE;
    }

    iconFor(kind: string): string {
        return NOTIF_KIND_ICONS[kind as NotifKind] ?? FALLBACK_ICON;
    }
}
