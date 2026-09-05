// Lightweight client for POST /api/v1/events. Fire-and-forget, analytics
// failures must never block a user action.
import { HttpClient } from '@angular/common/http';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import { isMobileDevice } from '../util/app-link';

// Authenticated product events. Mirrors the backend KNOWN_EVENT_NAMES allowlist
// (app/schemas/event.py): add a name in BOTH places to introduce an event.
export type AnalyticsEventName =
    | 'app_open'
    | 'first_asset_added'
    | 'fire_calculated'
    | 'currency_switched'
    | 'export'
    | 'share'
    | 'sync_interest'
    | 'subscribe_started'
    | 'subscribe_completed'
    | 'subscription_cancelled';

// Anonymous public-funnel events (POST /events/public, no auth). Mirrors the
// backend KNOWN_PUBLIC_EVENT_NAMES allowlist.
export type PublicAnalyticsEventName =
    | 'landing_view'
    | 'tool_view'
    | 'blog_view'
    | 'cta_click'
    | 'simulator_run'
    | 'waitlist_signup'
    | 'newsletter_signup';

interface EventPayload {
    event_name: string;
    event_properties?: Record<string, unknown> | null;
}

/** sessionStorage key: one `app_open` per browser session, the web analogue of
 *  the Flutter app's "once per app process" (EventsClient.trackAppOpenOnce). */
const APP_OPEN_SENT_KEY = 'omaad.analytics.app_open';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl;
    private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    track(name: AnalyticsEventName, properties?: Record<string, unknown>): void {
        this.post('/events', name, properties);
    }

    /**
     * Cookieless public-funnel tracking (landing/blog/tool). No auth, no
     * persistent identifier, fire-and-forget. Safe to call during SSR/prerender
     * (guards on HttpClient availability implicitly, the post just no-ops if the
     * platform can't issue it).
     */
    trackPublic(name: PublicAnalyticsEventName, properties?: Record<string, unknown>): void {
        this.post('/events/public', name, properties);
    }

    /**
     * Authenticated session start on the web, once per browser session. Carries
     * `surface: 'web'` so web and mobile funnels line up on the same event
     * (the app sends surface: 'mobile'), plus the device class and whether the
     * PWA runs installed. Nothing here identifies the person beyond the auth
     * the request already carries.
     */
    trackAppOpenOnce(lang: string): void {
        if (!this.isBrowser) return;
        try {
            if (window.sessionStorage.getItem(APP_OPEN_SENT_KEY)) return;
            window.sessionStorage.setItem(APP_OPEN_SENT_KEY, '1');
        } catch {
            // Storage blocked (private mode, embedded view): at worst this
            // fires once per page load instead of once per session.
        }
        const standalone =
            (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches)
            || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
        this.track('app_open', {
            surface: 'web',
            device: isMobileDevice() ? 'mobile' : 'desktop',
            standalone,
            lang,
        });
    }

    private post(path: string, name: string, properties?: Record<string, unknown>): void {
        // No-op during SSR/prerender: page views are real browser events, and
        // we must never issue network calls at build time.
        if (!this.isBrowser) return;
        const body: EventPayload = { event_name: name, event_properties: properties ?? null };
        this.http
            .post(`${this.apiUrl}${path}`, body)
            .subscribe({ error: () => { /* never block on analytics */ } });
    }
}
