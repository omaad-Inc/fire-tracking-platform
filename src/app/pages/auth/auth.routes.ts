import { Routes } from '@angular/router';
import { Access } from './access';
import { Login } from './login';
import { Register } from './register';
import { Error } from './error';
import { OAuthCallback } from './oauth-callback';

export default [
    { path: 'access', component: Access },
    { path: 'error', component: Error },
    { path: 'login', component: Login },
    { path: 'register', component: Register },
    { path: 'callback', component: OAuthCallback }, // Backend redirects to /auth/callback
    { path: 'oauth/callback', component: OAuthCallback } // Also support oauth/callback for consistency
] as Routes;
