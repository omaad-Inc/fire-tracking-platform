import { Routes } from '@angular/router';
import { Settings } from './settings';
import { AccountSettings } from './components/account';
import { SecuritySettings } from './components/security';
import { PreferencesSettings } from './components/preferences';

export default [
    {
        path: '',
        component: Settings,
        children: [
            { path: '', redirectTo: 'account', pathMatch: 'full' },
            { path: 'account', component: AccountSettings },
            { path: 'security', component: SecuritySettings },
            { path: 'preferences', component: PreferencesSettings }
        ]
    }
] as Routes;

