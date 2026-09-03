import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/auth.guard';

// P2-1: each auth screen is its own `loadComponent` chunk. A user landing on
// /auth/login used to download Register, ForgotPassword, ResetPassword,
// VerifyEmail and OAuthCallback with it (one 63 kB chunk). The guard import
// stays static: it is tiny and shared by the whole tree.
// `npm run routes:guard` fails the build if a static `component:` comes back.
const oauthCallback = () => import('./oauth-callback').then(m => m.OAuthCallback);

export default [
    { path: 'login', loadComponent: () => import('./login').then(m => m.Login), canActivate: [guestGuard] },
    { path: 'register', loadComponent: () => import('./register').then(m => m.Register), canActivate: [guestGuard] },
    // forgot/reset-password/verify-email are NOT guest-only: a logged-in user
    // must be able to complete a link they opened from their email (guestGuard
    // would bounce them to the dashboard and the action would never finish).
    { path: 'forgot-password', loadComponent: () => import('./forgot-password').then(m => m.ForgotPassword) },
    { path: 'reset-password', loadComponent: () => import('./reset-password').then(m => m.ResetPassword) },
    { path: 'verify-email', loadComponent: () => import('./verify-email').then(m => m.VerifyEmail) },
    { path: 'callback', loadComponent: oauthCallback },
    { path: 'oauth/callback', loadComponent: oauthCallback }
] as Routes;
