// Lightweight client for POST /api/v1/events. Fire-and-forget, analytics
// failures must never block a user action.
import { HttpClient } from '@angular/common/http';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

export type AnalyticsEventName =
    | 'first_asset_added'
    | 'fire_calculated'
    | 'currency_switched'
    | 'export'
    | 'share';

// Anonymous public-funnel events (POST /events/public, no auth). Mirrors the
// backend KNOWN_PUBLIC_EVENT_NAMES allowlist.
export type PublicAnalyticsEventName =
    | 'landing_view'
    | 'tool_view'
    | 'blog_view'
    | 'cta_click'
    | 'simulator_run'
    | 'waitlist_signup';

interface EventPayload {
    event_name: string;
    event_properties?: Record<string, unknown> | null;
}

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
