import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, effect, inject, untracked } from '@angular/core';
import { I18nService, Lang } from '../../i18n/i18n.service';
import { ApiService } from './api.service';
import { TokenService } from './token.service';

/**
 * Coalescing window for a burst of switches (palette toggled twice, a URL
 * rewrite that re-syncs the sidebar). Only the language the user ends on is
 * written, and only if it differs from what the profile already holds.
 */
export const LANGUAGE_SYNC_DEBOUNCE_MS = 400;

/**
 * Persists the in-app language switch on the profile (P3-1).
 *
 * `I18nService.setLang` is called from a dozen sites (palette, Settings >
 * Preferences, the sidebar's URL sync, every landing page) and used to flip
 * the client only: `preferred_language` was written once, at registration.
 * Everything the server renders in the STORED language (the weekly recap
 * bundle, inbox items, the Monday email, push text) therefore stayed in the
 * registration language after the user switched.
 *
 * One place, no call-site changes: this root service watches the `lang`
 * signal and PATCHes `/users/me` when the language actually changes during
 * the session. Mirrors `CurrencyService.setCurrency` (same endpoint, same
 * cached-user update), but debounced and fire-and-forget: a failed write is
 * never surfaced, the next switch simply tries again.
 *
 * Deliberately NOT persisted:
 *  - the boot value (localStorage / URL prefix at load): only a switch made
 *    during the session is the user's choice, a pinned or shared URL is not;
 *  - anything while signed out (landing pages switch freely, no session);
 *  - a same-value re-sync (the sidebar calls setLang with the URL language on
 *    every navigation): the signal does not notify on an unchanged value, so
 *    those never reach the write.
 *
 * Instantiated by an app initializer (see app.config.ts) so the effect exists
 * from the first render; no other code needs to know about it.
 */
@Injectable({ providedIn: 'root' })
export class LanguageSyncService {
    private i18n = inject(I18nService);
    private tokenService = inject(TokenService);
    private api = inject(ApiService);
    private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    private timer: ReturnType<typeof setTimeout> | null = null;
    private booted = false;

    constructor() {
        effect(() => {
            const lang = this.i18n.lang();
            untracked(() => this.onLang(lang));
        });
    }

    private onLang(lang: Lang): void {
        if (!this.isBrowser) return;
        if (!this.booted) {
            // First run = the language the app booted in, not a switch.
            this.booted = true;
            return;
        }
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            this.timer = null;
            this.persist(lang);
        }, LANGUAGE_SYNC_DEBOUNCE_MS);
    }

    private persist(lang: Lang): void {
        // A session is an in-memory access token; the cached profile alone
        // (signed-out device that remembers who was here) is not one.
        if (!this.tokenService.getToken()) return;
        // No "already equal" short-circuit against the cached profile: the
        // cache can lag the server (a switch made on another device, a stale
        // copy) and the write is idempotent. Same-value re-syncs never reach
        // here anyway, the signal does not notify when the value is unchanged.
        this.api.updateProfile({ preferred_language: lang }).subscribe({
            next: () => {
                // Update the cached profile from what we sent, not from the
                // response: the cache carries client-only fields (auth_provider)
                // the API never returns, same reason CurrencyService merges.
                const current = this.tokenService.getUser();
                if (current) this.tokenService.setUser({ ...current, preferred_language: lang });
            },
            error: () => { /* fire-and-forget: the next switch retries */ },
        });
    }
}
