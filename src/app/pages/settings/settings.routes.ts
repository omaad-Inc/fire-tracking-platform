import { Routes } from '@angular/router';
import { Settings } from './settings';
import { AccountSettings } from './components/account';
import { SecuritySettings } from './components/security';
import { ConnectionsSettings } from './components/connections';
import { PreferencesSettings } from './components/preferences';
import { NotificationsSettings } from './components/notifications';
import { HelpSettings } from './components/help';

// Settings shell (S9 redesign, Finary-benchmarked): immersive page with a
// section rail; ONE section component per route. /settings lands on account.
// Plans remains a standalone page at /pages/plans (linked from the rail).
export default [
    {
        path: '',
        component: Settings,
        children: [
            { path: '', redirectTo: 'account', pathMatch: 'full' },
            { path: 'account',       component: AccountSettings       },
            { path: 'security',      component: SecuritySettings      },
            { path: 'connections',   component: ConnectionsSettings   },
            { path: 'preferences',   component: PreferencesSettings   },
            { path: 'notifications', component: NotificationsSettings },
            { path: 'help',          component: HelpSettings          },
        ]
    }
] as Routes;
