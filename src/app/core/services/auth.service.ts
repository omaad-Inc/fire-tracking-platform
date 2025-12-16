import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, of, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenService, User } from './token.service';

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    preferred_currency?: string;
    preferred_language?: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
}

export interface OAuthStatus {
    google_configured: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private http = inject(HttpClient);
    private tokenService = inject(TokenService);
    private router = inject(Router);

    private apiUrl = environment.apiUrl;

    /**
     * Register a new user with email/password
     */
    register(data: RegisterRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, data).pipe(
            tap(response => {
                this.tokenService.setToken(response.access_token);
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Login with email/password (JSON body)
     */
    login(data: LoginRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login/json`, data).pipe(
            tap(response => {
                this.tokenService.setToken(response.access_token);
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Login with OAuth2 form data (alternative)
     */
    loginOAuth(email: string, password: string): Observable<AuthResponse> {
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);

        return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, formData).pipe(
            tap(response => {
                this.tokenService.setToken(response.access_token);
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Get current user info
     */
    getCurrentUser(): Observable<User> {
        return this.http.get<User>(`${this.apiUrl}/auth/me`).pipe(
            tap(user => {
                this.tokenService.setUser(user);
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Refresh access token
     */
    refreshToken(): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/auth/refresh`, {}).pipe(
            tap(response => {
                this.tokenService.setToken(response.access_token);
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Check OAuth provider status
     */
    getOAuthStatus(): Observable<OAuthStatus> {
        return this.http.get<OAuthStatus>(`${this.apiUrl}/auth/oauth/status`).pipe(
            catchError(() => of({ google_configured: false }))
        );
    }

    /**
     * Initiate Google OAuth login
     * Redirects to backend which then redirects to Google
     */
    loginWithGoogle(): void {
        window.location.href = `${this.apiUrl}/auth/google/login`;
    }

    /**
     * Exchange Google ID token for app token (SPA flow)
     */
    exchangeGoogleToken(idToken: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/auth/google/token`, null, {
            params: { id_token: idToken }
        }).pipe(
            tap(response => {
                this.tokenService.setToken(response.access_token);
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Logout - clear tokens and redirect
     */
    logout(): void {
        this.tokenService.clear();
        const currentLang = this.router.url.match(/^\/(fr|en)/)?.[1] || 'fr';
        this.router.navigate([`/${currentLang}/auth/login`]);
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return this.tokenService.isAuthenticated();
    }

    /**
     * Get current user from token service
     */
    get currentUser(): User | null {
        return this.tokenService.getUser();
    }

    /**
     * Initialize auth state (call on app startup)
     */
    initAuth(): Observable<User | null> {
        if (!this.isAuthenticated()) {
            return of(null);
        }
        return this.getCurrentUser().pipe(
            catchError(() => {
                this.tokenService.clear();
                return of(null);
            })
        );
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        let errorMessage = 'An error occurred';
        
        if (error.error instanceof ErrorEvent) {
            // Client-side error
            errorMessage = error.error.message;
        } else {
            // Server-side error
            if (error.error?.detail) {
                errorMessage = typeof error.error.detail === 'string' 
                    ? error.error.detail 
                    : JSON.stringify(error.error.detail);
            } else if (error.status === 401) {
                errorMessage = 'Invalid credentials';
            } else if (error.status === 400) {
                errorMessage = 'Bad request';
            } else if (error.status === 409) {
                errorMessage = 'Email already registered';
            } else if (error.status === 500) {
                errorMessage = 'Server error. Please try again later.';
            }
        }
        
        return throwError(() => new Error(errorMessage));
    }
}

