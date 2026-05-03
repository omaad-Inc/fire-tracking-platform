import { Component, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TokenService } from '../../core/services/token.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-oauth-callback',
    standalone: true,
    imports: [CommonModule, ProgressSpinnerModule],
    template: `
        <div class="min-h-screen flex flex-col items-center justify-center bg-surface-0 dark:bg-surface-950">
            @if (!error) {
                <p-progressSpinner strokeWidth="4" fill="transparent" animationDuration=".5s"></p-progressSpinner>
                <p class="mt-4 text-surface-600 dark:text-surface-400">{{ message }}</p>
            } @else {
                <div class="text-center">
                    <i class="pi pi-times-circle text-6xl text-negative mb-4"></i>
                    <h2 class="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-2">Authentication Failed</h2>
                    <p class="text-surface-600 dark:text-surface-400 mb-6">{{ error }}</p>
                    <button 
                        (click)="goToLogin()"
                        class="px-6 py-3 bg-brand-700 text-white rounded-lg hover:bg-brand-800 transition-colors">
                        Back to Login
                    </button>
                </div>
            }
        </div>
    `
})
export class OAuthCallback implements OnInit {
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private tokenService = inject(TokenService);
    private authService = inject(AuthService);

    message = 'Completing authentication...';
    error = '';

    ngOnInit(): void {
        // Check for token in URL (from backend redirect)
        const params = this.route.snapshot.queryParams;
        
        // Backend sends 'token' parameter, not 'access_token'
        const token = params['token'] || params['access_token'];
        
        if (token) {
            // Token received from backend OAuth callback
            this.handleTokenResponse(token);
        } else if (params['error']) {
            // OAuth error
            this.error = params['error_description'] || params['error'] || 'Authentication failed';
        } else {
            // No token and no error - might be direct access
            this.error = 'Invalid callback. Please try logging in again.';
        }
    }

    private handleTokenResponse(token: string): void {
        this.message = 'Setting up your account...';
        this.tokenService.setToken(token);
        
        // Fetch user info
        this.authService.getCurrentUser().subscribe({
            next: () => {
                this.message = 'Success! Redirecting...';
                const lang = this.getLang();
                setTimeout(() => {
                    this.router.navigate([`/${lang}`], { replaceUrl: true });
                }, 500);
            },
            error: (err) => {
                this.error = err.message || 'Could not fetch user information';
                this.tokenService.clear();
            }
        });
    }

    private getLang(): string {
        // Try to get lang from URL first
        const urlMatch = window.location.pathname.match(/^\/(fr|en)/);
        if (urlMatch) {
            return urlMatch[1];
        }
        // Check if we're on root with query params (/?token=...)
        // In this case, default to 'fr' and redirect properly
        return 'fr';
    }

    goToLogin(): void {
        const lang = this.getLang();
        this.router.navigate([`/${lang}/auth/login`]);
    }
}

