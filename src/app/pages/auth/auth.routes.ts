import { Routes } from '@angular/router';
import { Login } from './login';
import { Register } from './register';
import { OAuthCallback } from './oauth-callback';
import { ForgotPassword } from './forgot-password';
import { ResetPassword } from './reset-password';
import { guestGuard } from '../../core/guards/auth.guard';

export default [
    { path: 'login', component: Login, canActivate: [guestGuard] },
    { path: 'register', component: Register, canActivate: [guestGuard] },
    // forgot/reset-password are NOT guest-only: a logged-in user must be able
    // to complete a reset link they opened from their email (guestGuard would
    // bounce them to the dashboard and the reset would never finish).
    { path: 'forgot-password', component: ForgotPassword },
    { path: 'reset-password', component: ResetPassword },
    { path: 'callback', component: OAuthCallback },
    { path: 'oauth/callback', component: OAuthCallback }
] as Routes;
