import { Injectable, signal } from '@angular/core';

const TOKEN_KEY = 'afrin_nexus_token';
const USER_KEY = 'afrin_nexus_user';

export interface User {
    id: number;
    email: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    preferred_currency: string;
    preferred_language: string;
    is_verified: boolean;
    auth_provider: 'email' | 'google' | 'apple';
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
    }

    private loadFromStorage(): void {
        if (typeof window !== 'undefined' && window.localStorage) {
            const token = localStorage.getItem(TOKEN_KEY);
            const userStr = localStorage.getItem(USER_KEY);
            
            if (token) {
                this._token.set(token);
            }
            if (userStr) {
                try {
                    this._user.set(JSON.parse(userStr));
                } catch {
                    localStorage.removeItem(USER_KEY);
                }
            }
        }
    }

    setToken(token: string): void {
        this._token.set(token);
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(TOKEN_KEY, token);
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

