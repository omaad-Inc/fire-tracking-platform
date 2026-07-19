import { Injectable, signal } from '@angular/core';

const TOKEN_KEY = 'omaad_token';
const USER_KEY = 'omaad_user';

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
}

@Injectable({
    providedIn: 'root'
})
export class TokenService {
    private _token = signal<string | null>(null);
    private _user = signal<User | null>(null);

    readonly token = this._token.asReadonly();
    readonly user = this._user.asReadonly();
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
                const token = localStorage.getItem(TOKEN_KEY);
                const userStr = localStorage.getItem(USER_KEY);
                
                if (token) {
                    this._token.set(token);
                    console.debug('Token loaded from localStorage');
                } else {
                    console.debug('No token found in localStorage');
                }
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
        this._token.set(token);
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                localStorage.setItem(TOKEN_KEY, token);
                // Update token set time for interceptor
                (window as any).__tokenSetTime = Date.now();
                console.debug('Token saved to localStorage at', new Date().toISOString());
            } catch (e) {
                console.error('Failed to save token to localStorage:', e);
            }
        }
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
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        }
    }

    getToken(): string | null {
        return this._token();
    }

    getUser(): User | null {
        return this._user();
    }
}

