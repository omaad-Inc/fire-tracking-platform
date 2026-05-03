import { Routes } from '@angular/router';
import { Access } from './access';
import { Login } from './login';
import { Register } from './register';
import { Error } from './error';
import { OAuthCallback } from './oauth-callback';
import { guestGuard } from '../../core/guards/auth.guard';

export default [
    { path: 'access', component: Access },
    { path: 'error', component: Error },
    { path: 'login', component: Login, canActivate: [guestGuard] },
    { path: 'register', component: Register, canActivate: [guestGuard] },
    { path: 'callback', component: OAuthCallback },
    { path: 'oauth/callback', component: OAuthCallback }
] as Routes;
