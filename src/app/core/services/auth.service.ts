import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpContext } from '@angular/common/http';
import { Router } from '@angular/router';
import { SKIP_AUTH } from '../interceptors/http-context.tokens';
import { Observable, tap, catchError, throwError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenService, User } from './token.service';
import { CACHE_RESET } from './cache-reset.token';

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

export interface LoginEventEntry {
    id: number;
    method: string;      // password | otp | 2fa | google
    ip: string | null;
    user_agent: string | null;
    created_at: string;
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
    private cacheReset = inject(CACHE_RESET);

    private apiUrl = environment.apiUrl;

    /**
     * Broadcast a cache-clear to every feature service (they subscribe to
     * CACHE_RESET and clear themselves). No core → pages import needed, so a
     * newly added cached service can't be forgotten here.
     */
    private clearAllCaches(): void {
        this.cacheReset.next();
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

    /** Disable 2FA. Local accounts must also confirm their password (P2-BE-8). */
    disable2fa(code: string, password?: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/auth/2fa/disable`, { code, password }).pipe(catchError(this.handleError));
    }

    /** Confirm email ownership via the token from the verification email (P2-BE-9). */
    verifyEmail(token: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/auth/verify-email`, { token }).pipe(catchError(this.handleError));
    }

    /** Re-send the verification email to the signed-in user (P2-BE-9). */
    resendVerification(): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/auth/resend-verification`, {}).pipe(catchError(this.handleError));
    }

    // ── Login history & session revocation ──────────────────────────────────
    getLoginHistory(): Observable<LoginEventEntry[]> {
        return this.http.get<LoginEventEntry[]>(`${this.apiUrl}/auth/login-history`).pipe(catchError(this.handleError));
    }

    /** Sign out every other device; swaps in the fresh token for this one. */
    logoutOtherDevices(): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/auth/logout-others`, {}).pipe(
            tap(res => { if (res.access_token) this.tokenService.setToken(res.access_token); }),
            catchError(this.handleError)
        );
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
     * Refresh access token. Marked SKIP_AUTH so the interceptor doesn't try to
     * refresh-on-401 the refresh call itself (which would recurse forever).
     */
    refreshToken(): Observable<AuthResponse> {
        const context = new HttpContext().set(SKIP_AUTH, true);
        return this.http.post<AuthResponse>(`${this.apiUrl}/auth/refresh`, {}, { context }).pipe(
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
     * `/auth/callback?code=...` (a single-use 60s exchange code — never the
     * real token), handled by OAuthCallback via exchangeOAuthCode().
     *
     * Bind this to a plain `<a [href]>` rather than `(click)` + `window.location` —
     * an anchor lets the browser navigate synchronously, without racing Angular's
     * change detection, and supports right-click → "open in new tab".
     */
    get googleAuthUrl(): string {
        return `${this.apiUrl}/auth/google/login`;
    }

    /**
     * Swap the one-time OAuth code from the redirect URL for an access token.
     */
    exchangeOAuthCode(code: string): Observable<AuthResponse & { new_user?: boolean }> {
        return this.http.post<AuthResponse & { new_user?: boolean }>(
            `${this.apiUrl}/auth/oauth/exchange`, { code }
        ).pipe(
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
     * Logout — revoke this device's token server-side (fire-and-forget),
     * then clear local state and redirect. Without the server call the JWT
     * would stay valid until it expires even after "logging out".
     */
    logout(): void {
        if (this.tokenService.getToken()) {
            this.http.post(`${this.apiUrl}/auth/logout`, {})
                .pipe(catchError(() => of(null)))
                .subscribe();
        }
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
