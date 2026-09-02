import { Injectable, signal } from '@angular/core';

const TOKEN_KEY = 'omaad_token';
const USER_KEY = 'omaad_user';
/**
 * Non-secret notification preferences, cached for a flash-free paint of the
 * Settings → Notifications page (same rationale as USER_KEY above). Cleared on
 * logout here so one user's toggles never seed another user's screen.
 * ApiService owns the read/write; the key lives here to keep logout the single
 * storage choke point.
 */
export const NOTIF_PREFS_CACHE_KEY = 'omaad_notif_prefs';
/**
 * Chat surface storage. The thread is persisted per user under
 * `omaad_chat_thread_v1:<userId>` (ChatSessionService owns read/write); the
 * legacy un-scoped `omaad_chat_thread_v1` from before this fix is treated as a
 * purgeable member of the same family. The panel cache is the old assistant
 * teaser state. Both hold conversational/financial detail, so logout wipes every
 * user's copy here at the single storage choke point, and the chat service
 * additionally drops any other user's thread when a device is reused.
 */
export const CHAT_THREAD_KEY_PREFIX = 'omaad_chat_thread_v1';
export const AI_ASSISTANT_CACHE_KEY = 'omaad_ai_assistant';

export interface User {
    id: number;
    email: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    preferred_currency: string;
    preferred_language: string;
    dark_mode?: boolean;
    fire_target_amount?: number | null;
    fire_target_date?: string | null;
    annual_expenses?: number | null;
    withdrawal_rate?: number;
    is_active?: boolean;
    is_verified: boolean;
    created_at?: string;
    updated_at?: string;
    // auth_provider is not returned by backend, inferred from login method
    auth_provider?: 'email' | 'google' | 'apple';
    /**
     * AI consent (store launch). Rides on the user profile, so /auth/me is all
     * the app needs to know whether it still owes someone the consent sheet.
     * Exactly one of the two is ever set server-side; both null (or, on a
     * profile cached by a build that predates the field, both undefined) means
     * "never asked". Read them through AiConsentService, never directly: the
     * absence of a decision is not a consent, and that rule lives in one place.
     */
    ai_consent_at?: string | null;
    ai_consent_declined_at?: string | null;
}

@Injectable({
    providedIn: 'root'
})
export class TokenService {
    private _token = signal<string | null>(null);
    private _user = signal<User | null>(null);
    /** Epoch ms of the last setToken(), replaces the window.__tokenSetTime
     *  global the interceptor used for its just-logged-in grace window. */
    private _tokenSetAt = signal<number | null>(null);

    readonly token = this._token.asReadonly();
    readonly user = this._user.asReadonly();
    readonly tokenSetAt = this._tokenSetAt.asReadonly();
    readonly isAuthenticated = () => !!this._token();

    constructor() {
        this.loadFromStorage();
        this.syncAcrossTabs();
    }

    /**
     * Keep the token/user signals in sync when ANOTHER tab writes
     * localStorage (login, logout, or a token rotation via /auth/refresh).
     * Without this, a tab holding a rotated-out token keeps sending it and
     * gets 401s once the server revokes it.
     */
    private syncAcrossTabs(): void {
        if (typeof window === 'undefined' || !window.localStorage) return;
        window.addEventListener('storage', (e: StorageEvent) => {
            if (e.key === TOKEN_KEY) {
                this._token.set(e.newValue);
            } else if (e.key === USER_KEY) {
                try {
                    this._user.set(e.newValue ? JSON.parse(e.newValue) : null);
                } catch {
                    this._user.set(null);
                }
            } else if (e.key === null) {
                // localStorage.clear() in another tab
                this._token.set(null);
                this._user.set(null);
            }
        });
    }

    private loadFromStorage(): void {
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                // P4-SEC-1: the access token is no longer persisted. Purge any
                // legacy token left by a pre-cutover build so it can't linger in
                // storage. The session is restored from the httpOnly refresh
                // cookie by the auth guard (/auth/refresh) instead.
                localStorage.removeItem(TOKEN_KEY);

                // The user profile is not a secret — keep it for a flash-free
                // paint; it's re-fetched after refresh.
                const userStr = localStorage.getItem(USER_KEY);
                if (userStr) {
                    try {
                        this._user.set(JSON.parse(userStr));
                    } catch {
                        console.warn('Failed to parse user data from localStorage');
                        localStorage.removeItem(USER_KEY);
                    }
                }
            } catch (e) {
                console.error('Failed to load from localStorage:', e);
            }
        }
    }

    setToken(token: string): void {
        // P4-SEC-1: the access token lives in MEMORY only — never localStorage
        // (so an XSS payload can't read it). It's re-obtained on load/expiry via
        // the httpOnly refresh cookie (/auth/refresh).
        this._token.set(token);
        this._tokenSetAt.set(Date.now());
    }

    setUser(user: User): void {
        this._user.set(user);
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(USER_KEY, JSON.stringify(user));
        }
    }

    clear(): void {
        this._token.set(null);
        this._user.set(null);
        this._tokenSetAt.set(null);
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            localStorage.removeItem(NOTIF_PREFS_CACHE_KEY);
            localStorage.removeItem(AI_ASSISTANT_CACHE_KEY);
            // Wipe every persisted chat thread (all users, incl. the legacy
            // un-scoped key) on logout: the conversation carries financial detail
            // and must not survive the session on a shared device.
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (k && (k === CHAT_THREAD_KEY_PREFIX || k.startsWith(CHAT_THREAD_KEY_PREFIX + ':'))) {
                    localStorage.removeItem(k);
                }
            }
        }
    }

    getToken(): string | null {
        return this._token();
    }

    getUser(): User | null {
        return this._user();
    }
}

