import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { ApiService, InboxResponse } from './api.service';
import { CACHE_RESET } from './cache-reset.token';
import {
    NOTIF_KIND_ICONS,
    NOTIF_WEB_ROUTES,
    NotifKind,
    NotificationCenterService,
} from './notification-center.service';

/**
 * P1-1 guards.
 *
 * The one that matters most is the route map. `InboxItem.link` is written by
 * the backend from `_FCM_MOBILE_ROUTES`, so it holds FLUTTER paths. Using it
 * verbatim on the web sends the user to /notfound: the web equivalent of
 * "/transactions" is "/pages/transaction" (SINGULAR) and "/reports/weekly" is
 * "/pages/reports/weekly" (P2-4). That is an easy "simplification" for a later
 * reader to make, so the divergence is pinned here rather than left to a comment.
 */

// Copied from backend/app/services/notification_service.py `_FCM_MOBILE_ROUTES`.
// If the backend adds a kind, the completeness test below fails until the web
// makes a deliberate routing decision for it.
const MOBILE_LINKS: Record<NotifKind, string> = {
    budget: '/transactions',
    tontine: '/patrimoine',
    milestone: '/goals',
    custom_rule: '/',
    weekly_report: '/reports/weekly',
    renewal_reminder: '/settings/subscription',
};

function inbox(items: Partial<InboxResponse['items'][number]>[], unread: number): InboxResponse {
    return {
        unread_count: unread,
        items: items.map((it, i) => ({
            id: it.id ?? i + 1,
            kind: it.kind ?? 'budget',
            text: it.text ?? 'text',
            link: it.link ?? '/transactions',
            read: it.read ?? false,
            created_at: it.created_at ?? '2026-09-02T10:00:00Z',
        })),
    };
}

describe('NOTIF_WEB_ROUTES (the mobile-route trap)', () => {
    it('covers every kind the backend can emit, and nothing else', () => {
        expect(Object.keys(NOTIF_WEB_ROUTES).sort()).toEqual(Object.keys(MOBILE_LINKS).sort());
    });

    it('gives every kind an icon', () => {
        expect(Object.keys(NOTIF_KIND_ICONS).sort()).toEqual(Object.keys(MOBILE_LINKS).sort());
    });

    it('keeps segments relative so NavService can prefix /:lang or /share/:token', () => {
        for (const [kind, route] of Object.entries(NOTIF_WEB_ROUTES)) {
            for (const segment of route.segments) {
                expect(segment.startsWith('/'))
                    .withContext(`${kind} segment "${segment}" must not be absolute`)
                    .toBeFalse();
            }
        }
    });

    it('routes budget to the SINGULAR web path, and to the budgets tab', () => {
        // Mobile says "/transactions"; the web route is "transaction" and the
        // web hub hosts Budgets as a real tab, so the tap lands on the budget
        // the alert is actually about.
        expect(NOTIF_WEB_ROUTES.budget.segments).toEqual(['pages', 'transaction']);
        expect(NOTIF_WEB_ROUTES.budget.queryParams).toEqual({ view: 'budgets' });
    });

    it('sends weekly_report to the in-app recap page (P2-4)', () => {
        // Until P2-4 the web had no recap page and the tap fell back to the
        // dashboard. Now the kind lands on the same bundle the email renders;
        // a regression to the fallback would silently dead-end the Monday push.
        expect(NOTIF_WEB_ROUTES.weekly_report.segments).toEqual(['pages', 'reports', 'weekly']);
    });

    it('never reuses the mobile link as the web path where the two differ', () => {
        for (const kind of Object.keys(MOBILE_LINKS) as NotifKind[]) {
            const webPath = '/' + NOTIF_WEB_ROUTES[kind].segments.join('/');
            const mobilePath = MOBILE_LINKS[kind];
            // custom_rule is the one kind that legitimately coincides: both
            // apps send it to their home surface.
            if (kind === 'custom_rule') continue;
            expect(webPath)
                .withContext(`${kind} must not navigate the mobile path ${mobilePath}`)
                .not.toEqual(mobilePath);
        }
    });
});

describe('NotificationCenterService', () => {
    let api: jasmine.SpyObj<Pick<ApiService, 'getInbox' | 'markInboxRead'>>;
    let reset: Subject<void>;

    function setup(response: InboxResponse): NotificationCenterService {
        api = jasmine.createSpyObj('ApiService', ['getInbox', 'markInboxRead']);
        api.getInbox.and.returnValue(of(response));
        api.markInboxRead.and.returnValue(of({ updated: 1 }));
        reset = new Subject<void>();
        TestBed.configureTestingModule({
            providers: [
                NotificationCenterService,
                { provide: ApiService, useValue: api },
                { provide: CACHE_RESET, useValue: reset },
            ],
        });
        return TestBed.inject(NotificationCenterService);
    }

    afterEach(() => TestBed.resetTestingModule());

    it('resolves the web route from kind, ignoring the item link', () => {
        const svc = setup(inbox([], 0));
        // A malicious/stale link must not steer web navigation.
        expect(svc.webRouteFor('budget').segments).toEqual(['pages', 'transaction']);
        expect(svc.webRouteFor('milestone').segments).toEqual(['pages', 'goals']);
    });

    it('falls back to the dashboard and a bell for an unknown kind', () => {
        const svc = setup(inbox([], 0));
        expect(svc.webRouteFor('kind_from_a_newer_backend').segments).toEqual([]);
        expect(svc.iconFor('kind_from_a_newer_backend')).toBe('pi-bell');
    });

    it('exposes the server unread count for the badge', async () => {
        const svc = setup(inbox([{ id: 1 }, { id: 2, read: true }], 7));
        await svc.refresh();
        expect(svc.unreadCount()).toBe(7); // whole inbox, not the loaded page
        expect(svc.items().length).toBe(2);
    });

    it('marks read optimistically and decrements the badge', async () => {
        const svc = setup(inbox([{ id: 1 }, { id: 2 }], 2));
        await svc.refresh();
        await svc.markRead([1]);
        expect(api.markInboxRead).toHaveBeenCalledWith({ ids: [1] });
        expect(svc.items().find(i => i.id === 1)!.read).toBeTrue();
        expect(svc.unreadCount()).toBe(1);
    });

    it('does not write or decrement for an already-read entry', async () => {
        const svc = setup(inbox([{ id: 1, read: true }], 0));
        await svc.refresh();
        await svc.markRead([1]);
        expect(api.markInboxRead).not.toHaveBeenCalled();
        expect(svc.unreadCount()).toBe(0);
    });

    it('zeroes the badge on mark-all and asks the server for the WHOLE inbox', async () => {
        const svc = setup(inbox([{ id: 1 }, { id: 2 }], 12));
        await svc.refresh();
        await svc.markAllRead();
        // `all` matters: the badge counts entries beyond the loaded page.
        expect(api.markInboxRead).toHaveBeenCalledWith({ all: true });
        expect(svc.unreadCount()).toBe(0);
        expect(svc.items().every(i => i.read)).toBeTrue();
    });

    it('resyncs instead of keeping an optimistic lie when the write fails', async () => {
        const svc = setup(inbox([{ id: 1 }], 1));
        await svc.refresh();
        api.markInboxRead.and.returnValue(throwError(() => new Error('offline')));
        await svc.markRead([1]);

        // Server truth on the next read wins over the optimistic patch.
        api.getInbox.and.returnValue(of(inbox([{ id: 1, read: false }], 1)));
        svc.ensureLoaded();
        await Promise.resolve();
        await Promise.resolve();
        expect(api.getInbox).toHaveBeenCalledTimes(2);
    });

    it('clears on CACHE_RESET so a logout cannot leak the previous inbox', async () => {
        const svc = setup(inbox([{ id: 1 }], 3));
        await svc.refresh();
        expect(svc.unreadCount()).toBe(3);
        reset.next();
        expect(svc.items()).toEqual([]);
        expect(svc.unreadCount()).toBe(0);
    });
});
