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
    access_token?: string | null;
    token_type: string;
    mfa_required?: boolean;
    mfa_token?: string;
}

export interface TwoFactorSetup {
    secret: string;
    otpauth_uri: string;
    qr_data_uri: string;
}

export interface TwoFactorStatus {
    enabled: boolean;
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
                if (response.access_token) this.tokenService.setToken(response.access_token);
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
                // When 2FA is on, the server returns a challenge (mfa_required)
                // instead of a token — the login component then asks for a code.
                if (response?.access_token) {
                    this.clearAllCaches();
                    this.tokenService.setToken(response.access_token);
                } else if (!response?.mfa_required) {
                    console.error('Login response missing access_token');
                }
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Second login step: exchange the mfa_token + a TOTP (or backup) code for
     * a real access token.
     */
    verify2fa(mfaToken: string, code: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/auth/2fa/verify`, { mfa_token: mfaToken, code }).pipe(
            tap(response => {
                if (response?.access_token) {
                    this.clearAllCaches();
                    this.tokenService.setToken(response.access_token);
                }
            }),
            catchError(this.handleError)
        );
    }

    // ── 2FA management (authenticated) ──────────────────────────────────────
    get2faStatus(): Observable<TwoFactorStatus> {
        return this.http.get<TwoFactorStatus>(`${this.apiUrl}/auth/2fa/status`).pipe(catchError(this.handleError));
    }

    setup2fa(): Observable<TwoFactorSetup> {
        return this.http.post<TwoFactorSetup>(`${this.apiUrl}/auth/2fa/setup`, {}).pipe(catchError(this.handleError));
    }

    enable2fa(code: string): Observable<{ backup_codes: string[] }> {
        return this.http.post<{ backup_codes: string[] }>(`${this.apiUrl}/auth/2fa/enable`, { code }).pipe(catchError(this.handleError));
    }

    disable2fa(code: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/auth/2fa/disable`, { code }).pipe(catchError(this.handleError));
    }

    /**
     * Request a phone OTP (an additional login method — email login stays intact).
     */
    requestOtp(phone: string): Observable<{ sent: boolean }> {
        return this.http.post<{ sent: boolean }>(`${this.apiUrl}/auth/otp/request`, { phone }).pipe(
            catchError(this.handleError)
        );
    }

    /**
     * Verify a phone OTP and log in (creates a phone-only account if new).
     */
    verifyOtp(phone: string, code: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/auth/otp/verify`, { phone, code }).pipe(
            tap(response => {
                if (response?.access_token) {
                    this.clearAllCaches();
                    this.tokenService.setToken(response.access_token);
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
                if (response.access_token) this.tokenService.setToken(response.access_token);
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Request a password-reset email. Backend always returns 200 with a
     * generic message to avoid leaking which emails are registered.
     */
    forgotPassword(email: string): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.apiUrl}/auth/forgot-password`, { email }).pipe(
            catchError(this.handleError)
        );
    }

    /**
     * Confirm a password reset using the token from the email.
     */
    resetPassword(token: string, newPassword: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/auth/reset-password`, {
            token,
            new_password: newPassword,
        }).pipe(
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
                if (response.access_token) this.tokenService.setToken(response.access_token);
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
     * URL that starts the Google OAuth flow on the backend. The backend
     * redirects to Google's consent screen, then back to
     * `/auth/callback?token=...&new_user=...`, handled by OAuthCallback.
     *
     * Bind this to a plain `<a [href]>` rather than `(click)` + `window.location` —
     * an anchor lets the browser navigate synchronously, without racing Angular's
     * change detection, and supports right-click → "open in new tab".
     */
    get googleAuthUrl(): string {
        return `${this.apiUrl}/auth/google/login`;
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
