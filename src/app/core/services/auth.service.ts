import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
}

export interface UserResponse {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    is_verified: boolean;
    avatar_url?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly TOKEN_KEY = 'auth_token';
    private readonly USER_KEY = 'current_user';
    private currentUserSubject = new BehaviorSubject<UserResponse | null>(this.getStoredUser());
    public currentUser$ = this.currentUserSubject.asObservable();

    constructor(
        private http: HttpClient,
        private router: Router
    ) {}

    login(credentials: LoginRequest): Observable<TokenResponse> {
        return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/login/json`, credentials).pipe(
            tap(response => {
                this.setToken(response.access_token);
                // Fetch user info after login
                this.getCurrentUser().subscribe();
            })
        );
    }

    register(userData: RegisterRequest): Observable<TokenResponse> {
        return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/register`, userData).pipe(
            tap(response => {
                this.setToken(response.access_token);
                // Fetch user info after registration
                this.getCurrentUser().subscribe();
            })
        );
    }

    getCurrentUser(): Observable<UserResponse> {
        return this.http.get<UserResponse>(`${environment.apiUrl}/auth/me`).pipe(
            tap(user => {
                this.setStoredUser(user);
                this.currentUserSubject.next(user);
            })
        );
    }

    logout(): void {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        this.currentUserSubject.next(null);
        this.router.navigate(['/fr/auth/login']);
    }

    getToken(): string | null {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    isAuthenticated(): boolean {
        return !!this.getToken();
    }

    private setToken(token: string): void {
        localStorage.setItem(this.TOKEN_KEY, token);
    }

    private setStoredUser(user: UserResponse): void {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }

    private getStoredUser(): UserResponse | null {
        const userStr = localStorage.getItem(this.USER_KEY);
        return userStr ? JSON.parse(userStr) : null;
    }
}

