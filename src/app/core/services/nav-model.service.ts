import { Injectable, inject } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { I18nService } from '../../i18n/i18n.service';
import { NavService } from './nav.service';
import { ShareContextService } from './share-context.service';
import { AiAssistantService } from './ai-assistant.service';

/**
 * Single source of truth for the app's primary navigation (S5-3).
 *
 * Before this, the desktop sidebar (app.menu.ts) and the mobile bottom bar
 * (app.mobile-nav.ts) each hardcoded their own list of destinations, so any
 * relabel / reorder / add had to be duplicated by hand and silently drifted.
 * Both now render from the SECTIONS config below via this service.
 *
 * A NavEntry is a destination (route) or a command (e.g. the AI panel). The
 * sidebar renders every section (grouped, share-filtered); the bottom bar
 * renders a chosen subset by key (BOTTOM_PRIMARY) plus an overflow (BOTTOM_MORE).
 */
export type NavCommand = 'aiAssistant';

export interface NavEntry {
    key: string;
    labelKey: string;
    /** PrimeNG glyph without the leading `pi ` / `pi-fw `, e.g. 'pi-home'. */
    glyph: string;
    /** Route segments for NavService.link(); omit for command entries. */
    segments?: string[];
    command?: NavCommand;
    styleClass?: string;
    /** Hidden in the public read-only share shell. */
    hideInShare?: boolean;
    /** Extra route segment-arrays that should also mark this entry active
     *  (used when a hub owns sibling routes, e.g. Objectifs owns FIRE). */
    alsoActiveFor?: string[][];
}

export interface NavSectionDef {
    key: string;
    labelKey: string;
    entries: NavEntry[];
}

export interface BottomNavItem {
    key: string;
    label: string;
    icon: string;          // full class, e.g. 'pi pi-home'
    route: string[];
    /** All route segment-arrays that light up this item (main + alsoActiveFor). */
    activeRoutes: string[][];
}

// ── The canonical navigation config ─────────────────────────────────────────
// Editing THIS is how the sidebar and bottom bar change together. Keep it in
// sync with the `menu.*` i18n keys (fr.ts / en.ts).
// S5-3e: five hub destinations. FIRE, Wealth-Score and Debts are no longer
// top-level entries, they live inside their hubs (Objectifs / Analyses /
// Patrimoine) and are reached via that hub's tabs or cards. FIRE and
// Wealth-Score routes redirect to the hub tabs (see pages.routes.ts); Debts
// stays a route reached from the Patrimoine debts card, so Patrimoine claims it
// via alsoActiveFor for active-state.
const SECTIONS: NavSectionDef[] = [
    {
        key: 'navigation',
        labelKey: 'menu.navigation',
        entries: [
            { key: 'dashboard', labelKey: 'menu.dashboard', glyph: 'pi-home', segments: [] },
            { key: 'patrimony', labelKey: 'menu.patrimony', glyph: 'pi-wallet', segments: ['pages', 'patrimoine'], alsoActiveFor: [['pages', 'debts']] },
            { key: 'transactions', labelKey: 'menu.transactions', glyph: 'pi-arrow-right-arrow-left', segments: ['pages', 'transaction'] },
            { key: 'myGoals', labelKey: 'menu.objectives', glyph: 'pi-bullseye', segments: ['pages', 'goals'] },
            { key: 'insights', labelKey: 'menu.insights', glyph: 'pi-chart-bar', segments: ['pages', 'insights'] },
        ],
    },
    {
        key: 'assistant',
        labelKey: 'menu.assistant',
        entries: [
            { key: 'aiAssistant', labelKey: 'menu.aiAssistant', glyph: 'pi-sparkles', command: 'aiAssistant', styleClass: 'menu-item-ai', hideInShare: true },
        ],
    },
];

// Bottom bar: the five hubs, no overflow (BOTTOM_MORE empty → no "Plus" button).
const BOTTOM_PRIMARY = ['dashboard', 'patrimony', 'transactions', 'myGoals', 'insights'];
const BOTTOM_MORE: string[] = [];

@Injectable({ providedIn: 'root' })
export class NavModelService {
    private i18n = inject(I18nService);
    private nav = inject(NavService);
    private share = inject(ShareContextService);
    private ai = inject(AiAssistantService);

    private entry(key: string): NavEntry | undefined {
        for (const s of SECTIONS) {
            const e = s.entries.find(x => x.key === key);
            if (e) return e;
        }
        return undefined;
    }

    /** Grouped PrimeNG model for the desktop sidebar (share-filtered, separators between sections). */
    buildSidebar(): MenuItem[] {
        const shareActive = this.share.active();
        const model: MenuItem[] = [];
        for (const section of SECTIONS) {
            const entries = section.entries.filter(e => !(shareActive && e.hideInShare));
            if (!entries.length) continue;
            if (model.length) model.push({ separator: true });
            model.push({
                label: this.i18n.t(section.labelKey),
                items: entries.map(e => this.toMenuItem(e)),
            });
        }
        return model;
    }

    private toMenuItem(e: NavEntry): MenuItem {
        return {
            label: this.i18n.t(e.labelKey),
            icon: `pi pi-fw ${e.glyph}`,
            ...(e.segments ? { routerLink: this.nav.link(...e.segments) } : {}),
            ...(e.styleClass ? { styleClass: e.styleClass } : {}),
            ...(e.command === 'aiAssistant' ? { command: () => this.ai.show() } : {}),
        };
    }

    /** Primary destinations shown directly in the mobile bottom bar. */
    bottomPrimary(): BottomNavItem[] {
        return this.buildBottom(BOTTOM_PRIMARY);
    }

    /** Secondary destinations shown in the bottom bar's "Plus" sheet. */
    bottomMore(): BottomNavItem[] {
        return this.buildBottom(BOTTOM_MORE);
    }

    private buildBottom(keys: string[]): BottomNavItem[] {
        const shareActive = this.share.active();
        return keys
            .map(k => this.entry(k))
            .filter((e): e is NavEntry => !!e && !!e.segments && !(shareActive && e.hideInShare))
            .map(e => {
                const route = this.nav.link(...e.segments!);
                const also = (e.alsoActiveFor ?? []).map(seg => this.nav.link(...seg));
                return { key: e.key, label: this.i18n.t(e.labelKey), icon: `pi ${e.glyph}`, route, activeRoutes: [route, ...also] };
            });
    }
}
