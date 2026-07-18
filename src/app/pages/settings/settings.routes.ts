import { Routes } from '@angular/router';
import { Settings } from './settings';
import { AccountSettings } from './components/account';
import { SecuritySettings } from './components/security';
import { PreferencesSettings } from './components/preferences';
import { HelpSettings } from './components/help';
import { PlansSettings } from './components/plans';
import { ConnectionsSettings } from './components/connections';
import { ShareSettings } from './components/share';

// FireSettings is still imported by /pages/fire (the deep-dive page); we just
// no longer expose it as a /settings/fire route — FIRE configuration happens
// inline on /pages/fire to avoid two surfaces for the same thing.

export default [
    {
        path: '',
        component: Settings,
        children: [
            // No default redirect — mobile shows the nav list, desktop shows a placeholder
            { path: 'account',     component: AccountSettings     },
            { path: 'security',    component: SecuritySettings    },
            { path: 'preferences', component: PreferencesSettings },
            { path: 'connections', component: ConnectionsSettings },
            { path: 'share',       component: ShareSettings       },
            { path: 'help',        component: HelpSettings        },
            { path: 'plans',       component: PlansSettings       },
        ]
    }
] as Routes;

