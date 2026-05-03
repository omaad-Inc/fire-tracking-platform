import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenService, User } from './token.service';
import { DashboardService } from '../../pages/service/dashboard.service';
import { PatrimoineService } from '../../pages/service/patrimoine.service';
import { SavingsService } from '../../pages/service/savings.service';
import { DebtsService } from '../../pages/service/debts.service';
import { TransactionsService } from '../../pages/service/transactions.service';

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
    private dashboardService = inject(DashboardService);
    private patrimoineService = inject(PatrimoineService);
    private savingsService = inject(SavingsService);
    private debtsService = inject(DebtsService);
    private transactionsService = inject(TransactionsService);

    private apiUrl = environment.apiUrl;

    private clearAllCaches(): void {
        this.dashboardService.invalidateCache();
        this.patrimoineService.clearCache();
        this.savingsService.clearCache();
        this.debtsService.clearCache();
        this.transactionsService.clearCache();
    }

    /**
     * Register a new user with email/password
     */
    register(data: RegisterRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, data).pipe(
            tap(response => {
                this.clearAllCaches();
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
                if (response?.access_token) {
                    this.clearAllCaches();
                    this.tokenService.setToken(response.access_token);
                    console.debug('Login successful - token saved');
                } else {
                    console.error('Login response missing access_token');
                }
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
                this.clearAllCaches();
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
     * Initiate Google OAuth login via Google Identity Services.
     * Uses a client-side popup instead of a full-page redirect so
     * the PWA standalone window is preserved.
     */
    loginWithGoogle(): Observable<AuthResponse> {
        return new Observable<AuthResponse>(subscriber => {
            if (typeof google === 'undefined' || !google?.accounts?.id) {
                subscriber.error(new Error('Google Identity Services not loaded. Please try again.'));
                return;
            }

            google.accounts.id.initialize({
                client_id: environment.googleClientId,
                callback: (response: GoogleCredentialResponse) => {
                    this.exchangeGoogleToken(response.credential).subscribe({
                        next: result => {
                            subscriber.next(result);
                            subscriber.complete();
                        },
                        error: err => subscriber.error(err)
                    });
                },
                context: 'signin',
                cancel_on_tap_outside: true,
            });

            google.accounts.id.prompt((notification) => {
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    subscriber.error(new Error(
                        'Google sign-in popup was blocked. Please allow popups or try again.'
                    ));
                }
            });
        });
    }

    /**
     * Exchange Google ID token for app token (SPA/PWA flow).
     */
    exchangeGoogleToken(idToken: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/auth/google/token`, {
            id_token: idToken
        }).pipe(
            tap(response => {
                this.clearAllCaches();
                this.tokenService.setToken(response.access_token);
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Logout - clear tokens and redirect
     */
    logout(): void {
        this.clearAllCaches();
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
     * Validates token and refreshes user data if needed
     */
    initAuth(): Observable<User | null> {
        if (!this.isAuthenticated()) {
            return of(null);
        }
        
        // If user data already exists, don't make unnecessary API call
        const existingUser = this.tokenService.getUser();
        if (existingUser) {
            return of(existingUser);
        }
        
        // Fetch user data, but don't clear token on failure
        // Let the interceptor handle 401 errors
        return this.getCurrentUser().pipe(
            catchError((error) => {
                // Only clear token if it's a 401 (unauthorized)
                // Other errors (network, 500, etc.) shouldn't clear the token
                if (error.status === 401) {
                    this.tokenService.clear();
                }
                // Return existing user or null, don't throw
                return of(existingUser || null);
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
