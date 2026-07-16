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
    { path: 'forgot-password', component: ForgotPassword, canActivate: [guestGuard] },
    { path: 'reset-password', component: ResetPassword, canActivate: [guestGuard] },
    { path: 'callback', component: OAuthCallback },
    { path: 'oauth/callback', component: OAuthCallback }
] as Routes;
