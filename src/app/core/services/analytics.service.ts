// Lightweight client for POST /api/v1/events. Fire-and-forget — analytics
// failures must never block a user action.
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export type AnalyticsEventName =
    | 'first_asset_added'
    | 'fire_calculated'
    | 'currency_switched'
    | 'export'
    | 'share';

interface EventPayload {
    event_name: string;
    event_properties?: Record<string, unknown> | null;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl;

    track(name: AnalyticsEventName, properties?: Record<string, unknown>): void {
        const body: EventPayload = {
            event_name: name,
            event_properties: properties ?? null,
        };
        this.http
            .post(`${this.apiUrl}/events`, body)
            .subscribe({ error: () => { /* never block on analytics */ } });
    }
}
