import { Routes } from '@angular/router';
import { Settings } from './settings';
import { AccountSettings } from './components/account';
import { SecuritySettings } from './components/security';
import { PreferencesSettings } from './components/preferences';
import { FireSettings } from './components/fire-settings';
import { HelpSettings } from './components/help';

export default [
    {
        path: '',
        component: Settings,
        children: [
            // No default redirect — mobile shows the nav list, desktop shows a placeholder
            { path: 'account',     component: AccountSettings     },
            { path: 'security',    component: SecuritySettings    },
            { path: 'preferences', component: PreferencesSettings },
            { path: 'fire',        component: FireSettings        },
            { path: 'help',        component: HelpSettings        },
        ]
    }
] as Routes;

