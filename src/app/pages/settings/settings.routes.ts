import { Routes } from '@angular/router';
import { Settings } from './settings';
import { AccountSettings } from './components/account';
import { SecuritySettings } from './components/security';
import { ConnectionsSettings } from './components/connections';
import { PreferencesSettings } from './components/preferences';
import { CategoriesSettings } from './components/categories';
import { AlertsSettings } from './components/alerts';
import { NotificationsSettings } from './components/notifications';
import { SubscriptionSettings } from './components/subscription';
import { HelpSettings } from './components/help';

// Settings shell (S9 redesign, Finary-benchmarked): immersive page; ONE
// section component per route. Bare /settings is the mobile HOME MENU (the
// shell auto-forwards to account on desktop so the rail has an active entry).
// Plans remains a standalone page at /pages/plans (linked from the rail).
export default [
    {
        path: '',
        component: Settings,
        children: [
            { path: 'account',       component: AccountSettings       },
            { path: 'security',      component: SecuritySettings      },
            { path: 'connections',   component: ConnectionsSettings   },
            { path: 'preferences',   component: PreferencesSettings   },
            { path: 'categories',    component: CategoriesSettings    },
            { path: 'alerts',        component: AlertsSettings        },
            { path: 'notifications', component: NotificationsSettings },
            { path: 'subscription',  component: SubscriptionSettings  },
            { path: 'help',          component: HelpSettings          },
        ]
    }
] as Routes;
