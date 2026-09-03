import { Routes } from '@angular/router';

// Settings shell (S9 redesign, Finary-benchmarked): immersive page; ONE
// section component per route. Bare /settings is the mobile HOME MENU (the
// shell auto-forwards to account on desktop so the rail has an active entry).
// Plans remains a standalone page at /pages/plans (linked from the rail).
//
// P2-1: every section is its own `loadComponent` chunk. Before, this file
// statically imported all ten components, so opening /settings/account
// downloaded Security, Connections, Categories, Alerts... as one 224 kB chunk.
// `npm run routes:guard` fails the build if a static `component:` comes back.
export default [
    {
        path: '',
        loadComponent: () => import('./settings').then(m => m.Settings),
        children: [
            { path: 'account',       loadComponent: () => import('./components/account').then(m => m.AccountSettings)             },
            { path: 'security',      loadComponent: () => import('./components/security').then(m => m.SecuritySettings)           },
            { path: 'connections',   loadComponent: () => import('./components/connections').then(m => m.ConnectionsSettings)     },
            { path: 'preferences',   loadComponent: () => import('./components/preferences').then(m => m.PreferencesSettings)     },
            { path: 'categories',    loadComponent: () => import('./components/categories').then(m => m.CategoriesSettings)       },
            { path: 'alerts',        loadComponent: () => import('./components/alerts').then(m => m.AlertsSettings)               },
            { path: 'notifications', loadComponent: () => import('./components/notifications').then(m => m.NotificationsSettings) },
            { path: 'subscription',  loadComponent: () => import('./components/subscription').then(m => m.SubscriptionSettings)   },
            { path: 'help',          loadComponent: () => import('./components/help').then(m => m.HelpSettings)                   },
        ]
    }
] as Routes;
