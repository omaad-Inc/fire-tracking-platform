// S8 groundwork: crash visibility before Sentry exists.
//
// GlobalErrorHandler catches every uncaught error and hands it to whatever
// ERROR_REPORTER is provided. The interim reporter posts a bounded
// 'client_error' event to our own /api/v1/events; when Sentry lands (S8
// infra), swap the ERROR_REPORTER provider in app.config.ts and nothing
// else changes.
import { ErrorHandler, Injectable, InjectionToken, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface ErrorReporter {
    reportError(error: unknown): void;
}

export const ERROR_REPORTER = new InjectionToken<ErrorReporter>('ERROR_REPORTER');

/**
 * Interim reporter: POST /api/v1/events with event_name 'client_error'.
 *
 * Bounded on purpose: the backend caps event_properties at 4 KB, and an
 * error storm must never DoS our own API, so at most MAX_REPORTS errors
 * are sent per page load and duplicates (same message) are sent once.
 * The endpoint is auth-only: errors on public pages are dropped here and
 * become Sentry's job later. Fire-and-forget, reporting must never throw.
 */
@Injectable()
export class EventsErrorReporter implements ErrorReporter {
    private http = inject(HttpClient);
    private static readonly MAX_REPORTS = 10;
    private sent = 0;
    private seen = new Set<string>();

    reportError(error: unknown): void {
        try {
            if (typeof window === 'undefined') return; // never during prerender
            if (this.sent >= EventsErrorReporter.MAX_REPORTS) return;

            const e = error as { message?: string; stack?: string } | undefined;
            const message = String(e?.message ?? error ?? 'unknown').slice(0, 300);
            if (this.seen.has(message)) return;
            this.seen.add(message);
            this.sent++;

            this.http.post(`${environment.apiUrl}/events`, {
                event_name: 'client_error',
                event_properties: {
                    message,
                    stack: String(e?.stack ?? '').slice(0, 1500),
                    url: window.location.pathname,
                    ua: navigator.userAgent.slice(0, 150),
                },
            }).subscribe({ error: () => { /* reporting must never block or loop */ } });
        } catch { /* never throw from a reporter */ }
    }
}

/** Drop-in ErrorHandler: report, then keep Angular's default console output. */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    private reporter = inject(ERROR_REPORTER);

    handleError(error: unknown): void {
        this.reporter.reportError(error);
        console.error(error);
    }
}
