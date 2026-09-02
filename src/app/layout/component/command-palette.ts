import {
    ChangeDetectionStrategy, Component, ElementRef, HostListener, ViewChild, computed, effect, inject, signal, untracked,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { MenuItem } from 'primeng/api';
import { I18nService } from '../../i18n/i18n.service';
import { NavService } from '../../core/services/nav.service';
import { NavModelService } from '../../core/services/nav-model.service';
import { CommandPaletteService } from '../../core/services/command-palette.service';
import { PrivacyService } from '../../core/services/privacy.service';
import { LayoutService } from '../service/layout.service';
import { PatrimoineService } from '../../pages/service/patrimoine.service';
import { SavingsService } from '../../pages/service/savings.service';

type Group = 'recent' | 'navigation' | 'actions' | 'settings' | 'assets' | 'goals';

interface PaletteItem {
    id: string;
    group: Group;
    label: string;
    hint?: string;
    icon: string;
    /** Extra words the filter should also match (e.g. a ticker, a category). */
    keywords?: string;
    run: () => void;
}

const RECENT_KEY = 'omaad_palette_recent';
const RECENT_MAX = 5;

/**
 * Command palette (P2-5): Cmd/Ctrl+K opens one search box that navigates,
 * runs the everyday actions and finds an asset or a goal by name.
 *
 * Sources, so nothing here is a second hardcoded list: destinations come from
 * NavModelService (the same model as the sidebar and the bottom bar), settings
 * sections from the same keys the Settings shell uses, assets and goals from
 * the feature services' caches (a palette open never costs a request when the
 * user has already visited those hubs).
 *
 * Keyboard: arrows move, Enter runs, Escape closes, focus stays in the dialog
 * (PrimeNG's focus trap) and returns to the opener on close. Mouse users get
 * a topbar trigger; no browser shortcut is overridden (see isChord).
 */
@Component({
    standalone: true,
    selector: 'app-command-palette',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, DialogModule],
    template: `
        <p-dialog [visible]="palette.open()" (visibleChange)="onVisible($event)" [modal]="true" [draggable]="false" [resizable]="false"
                  [dismissableMask]="true" [closeOnEscape]="true" position="top"
                  [style]="{ width: '95vw', maxWidth: '640px', marginTop: '8vh' }"
                  [transitionOptions]="'320ms cubic-bezier(0.34, 1.30, 0.64, 1)'"
                  styleClass="!rounded-2xl overflow-hidden omaad-palette" [showHeader]="false"
                  (onShow)="onShow()" [attr.aria-label]="t('palette.title')">
            <!-- The dialog body has no top padding once the header is hidden, so
                 only the sides and the bottom are pulled back to the edge. -->
            <div class="-mx-5 -mb-5 sm:-mx-6 sm:-mb-6" data-testid="palette">
                <!-- Search -->
                <div class="flex items-center gap-3 px-4 h-14 border-b border-surface-200 dark:border-surface-800">
                    <i class="pi pi-search text-surface-400" aria-hidden="true"></i>
                    <input #box type="text" [ngModel]="query()" (ngModelChange)="setQuery($event)"
                           role="combobox" aria-autocomplete="list" [attr.aria-expanded]="true" aria-controls="palette-list"
                           [attr.aria-activedescendant]="activeId()" [attr.aria-label]="t('palette.placeholder')"
                           [placeholder]="t('palette.placeholder')" autocomplete="off" spellcheck="false" data-testid="palette-input"
                           class="flex-1 min-w-0 bg-transparent !outline-none focus-visible:!outline-none text-base text-surface-900 dark:text-surface-0 placeholder:text-surface-400" />
                    <kbd class="hidden sm:inline-block px-1.5 py-0.5 rounded-md text-[11px] font-semibold text-surface-500 dark:text-surface-400 bg-surface-100 dark:bg-surface-800">Esc</kbd>
                </div>

                <!-- Results -->
                <div id="palette-list" role="listbox" class="max-h-[60vh] overflow-y-auto py-2" data-testid="palette-list">
                    @if (visible().length === 0) {
                        <p class="px-4 py-8 text-center text-sm text-surface-500 dark:text-surface-400">{{ t('palette.empty', { q: query() }) }}</p>
                    }
                    @for (section of sections(); track section.group) {
                        <p class="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 m-0">{{ t('palette.group.' + section.group) }}</p>
                        @for (item of section.items; track item.id) {
                            <button type="button" role="option" [id]="'palette-' + item.id" [attr.aria-selected]="item.id === activeId()"
                                    (click)="run(item)" (mousemove)="setActive(item.id)" [attr.data-item]="item.id"
                                    class="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                                    [class]="item.id === activeId() ? 'bg-surface-100 dark:bg-surface-800' : 'hover:bg-surface-50 dark:hover:bg-surface-800/60'">
                                <span class="w-8 h-8 rounded-lg grid place-items-center shrink-0 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                                    <i class="pi text-sm" [class]="item.icon" aria-hidden="true"></i>
                                </span>
                                <span class="flex-1 min-w-0">
                                    <span class="block text-sm font-medium text-surface-900 dark:text-surface-0 truncate">{{ item.label }}</span>
                                    @if (item.hint) { <span class="block text-xs text-surface-400 dark:text-surface-500 truncate">{{ item.hint }}</span> }
                                </span>
                                @if (item.id === activeId()) {
                                    <kbd class="hidden sm:inline-block px-1.5 py-0.5 rounded-md text-[11px] font-semibold text-surface-500 dark:text-surface-400 bg-surface-0 dark:bg-surface-700" aria-hidden="true">↵</kbd>
                                }
                            </button>
                        }
                    }
                </div>
            </div>
        </p-dialog>
    `,
})
export class CommandPalette {
    readonly palette = inject(CommandPaletteService);
    private i18n = inject(I18nService);
    private nav = inject(NavService);
    private navModel = inject(NavModelService);
    private router = inject(Router);
    private privacy = inject(PrivacyService);
    private layout = inject(LayoutService);
    private patrimoine = inject(PatrimoineService);
    private savings = inject(SavingsService);

    @ViewChild('box') private box?: ElementRef<HTMLInputElement>;
    private opener: HTMLElement | null = null;

    readonly query = signal('');
    readonly activeId = signal<string | null>(null);
    private readonly assets = signal<Array<{ id: number; name: string; category: string }>>([]);
    private readonly goals = signal<Array<{ id?: number; label: string }>>([]);
    private readonly recentIds = signal<string[]>(loadRecent());

    t(key: string, params?: Record<string, string | number>): string { return this.i18n.t(key, params); }

    /** Everything the palette can do, rebuilt per open (labels follow the language). */
    private readonly items = computed<PaletteItem[]>(() => {
        const out: PaletteItem[] = [];
        // Navigation: the sidebar model, flattened. It already respects the
        // share shell and the assistant flag.
        for (const group of this.navModel.buildSidebar()) {
            for (const mi of group.items ?? []) out.push(this.fromMenuItem(mi));
        }
        out.push(this.dest('notifications', this.t('menu.notifications'), 'pi-bell', ['pages', 'notifications']));
        out.push(this.dest('plans', this.t('menu.subscription'), 'pi-crown', ['pages', 'plans']));

        // Actions
        out.push({ id: 'act:quick-add', group: 'actions', label: this.t('palette.actions.quickAdd'), icon: 'pi-plus',
            run: () => this.palette.quickAddRequested.next() });
        out.push({ id: 'act:add-asset', group: 'actions', label: this.t('palette.actions.addAsset'), icon: 'pi-wallet',
            run: () => this.go(['pages', 'patrimoine', 'add-asset']) });
        out.push({ id: 'act:theme', group: 'actions', label: this.t('palette.actions.theme'), icon: this.layout.isDarkTheme() ? 'pi-sun' : 'pi-moon',
            run: () => this.toggleTheme() });
        out.push({ id: 'act:privacy', group: 'actions', label: this.t(this.privacy.hidden() ? 'topbar.showAmounts' : 'topbar.hideAmounts'), icon: this.privacy.hidden() ? 'pi-eye' : 'pi-eye-slash',
            run: () => this.privacy.toggle() });
        out.push({ id: 'act:lang', group: 'actions', label: this.t('palette.actions.lang'), icon: 'pi-language',
            run: () => this.switchLang() });

        // Settings sections, same keys as the Settings shell.
        const sections: Array<[string, string, string]> = [
            ['account', 'menu.myAccount', 'pi-user'], ['security', 'menu.security', 'pi-shield'],
            ['connections', 'settings.myConnections', 'pi-link'], ['preferences', 'menu.preferences', 'pi-cog'],
            ['categories', 'menu.categories', 'pi-tags'], ['alerts', 'menu.alerts', 'pi-flag'],
            ['notifications', 'menu.notifications', 'pi-bell'], ['subscription', 'menu.subscription', 'pi-credit-card'],
            ['help', 'settings.getHelp', 'pi-question-circle'],
        ];
        for (const [key, labelKey, icon] of sections) {
            out.push({ id: 'settings:' + key, group: 'settings', label: this.t(labelKey), hint: this.t('menu.settings'), icon,
                run: () => this.go(['pages', 'settings', key]) });
        }

        // Search: assets and goals by name.
        for (const a of this.assets()) {
            out.push({ id: 'asset:' + a.id, group: 'assets', label: a.name, hint: this.i18n.categoryLabel(a.category), icon: 'pi-box',
                keywords: a.category, run: () => this.go(['pages', 'patrimoine', 'assets', String(a.id)]) });
        }
        for (const g of this.goals()) {
            out.push({ id: 'goal:' + (g.id ?? g.label), group: 'goals', label: g.label, hint: this.t('menu.objectives'), icon: 'pi-bullseye',
                run: () => g.id != null ? this.go(['pages', 'goals', String(g.id)]) : this.go(['pages', 'goals']) });
        }
        return out;
    });

    /** Filtered, ranked: prefix matches first, then word starts, then substrings. */
    readonly visible = computed<PaletteItem[]>(() => {
        const q = fold(this.query().trim());
        const items = this.items();
        if (!q) {
            // A recent row is a COPY of its item with its own id: the same id
            // twice would mark two rows active and break `track`.
            const recent = this.recentIds().map(id => items.find(i => i.id === id)).filter((i): i is PaletteItem => !!i)
                .map(i => ({ ...i, id: 'recent:' + i.id, group: 'recent' as Group }));
            // With no query: recents, then navigation and actions; assets and
            // goals only appear once the user types (they can be many).
            return [...recent, ...items.filter(i => i.group === 'navigation' || i.group === 'actions')];
        }
        const scored = items.map(i => ({ i, s: score(fold(i.label + ' ' + (i.keywords ?? '') + ' ' + (i.hint ?? '')), q) }))
            .filter(x => x.s > 0).sort((a, b) => b.s - a.s);
        return scored.slice(0, 40).map(x => x.i);
    });

    readonly sections = computed(() => {
        const order: Group[] = ['recent', 'navigation', 'actions', 'settings', 'assets', 'goals'];
        return order.map(group => ({ group, items: this.visible().filter(i => i.group === group) })).filter(s => s.items.length);
    });

    constructor() {
        // Keep the active row valid whenever the list changes.
        effect(() => {
            const list = this.visible();
            const cur = untracked(this.activeId);
            if (!list.some(i => i.id === cur)) this.activeId.set(list[0]?.id ?? null);
        });
    }

    onVisible(v: boolean): void { if (!v) this.close(); }

    onShow(): void {
        this.opener = (document.activeElement as HTMLElement | null);
        this.query.set('');
        setTimeout(() => this.box?.nativeElement.focus(), 30);
        // Warm the searchable caches; both are SWR-cached, so a revisit is free.
        this.patrimoine.getAssets().then(rows => this.assets.set(rows.map(r => ({ id: r.id, name: r.name, category: String(r.category) })))).catch(() => {});
        this.savings.getGoals().then(rows => this.goals.set(rows.map(g => ({ id: g.id, label: g.label })))).catch(() => {});
    }

    setQuery(q: string): void { this.query.set(q); }
    setActive(id: string): void { this.activeId.set(id); }

    /** Arrows, Home/End and Enter work wherever focus sits inside the dialog
     *  (right after opening it is on the frame, not yet in the box). Escape is
     *  the dialog's own. */
    @HostListener('document:keydown', ['$event'])
    onKey(ev: KeyboardEvent): void {
        if (!this.palette.open()) return;
        const list = this.visible();
        if (!list.length) return;
        const idx = Math.max(0, list.findIndex(i => i.id === this.activeId()));
        if (ev.key === 'ArrowDown') { ev.preventDefault(); this.activate(list[(idx + 1) % list.length].id); }
        else if (ev.key === 'ArrowUp') { ev.preventDefault(); this.activate(list[(idx - 1 + list.length) % list.length].id); }
        else if (ev.key === 'Home') { ev.preventDefault(); this.activate(list[0].id); }
        else if (ev.key === 'End') { ev.preventDefault(); this.activate(list[list.length - 1].id); }
        else if (ev.key === 'Enter') { ev.preventDefault(); const it = list.find(i => i.id === this.activeId()); if (it) this.run(it); }
    }

    private activate(id: string): void {
        this.activeId.set(id);
        document.getElementById('palette-' + id)?.scrollIntoView({ block: 'nearest' });
    }

    run(item: PaletteItem): void {
        this.remember(item.id);
        this.close();
        // Let the dialog start closing before the action swaps the page or
        // flips a theme, so the exit animation is not cut.
        setTimeout(() => item.run(), 0);
    }

    private close(): void {
        this.palette.hide();
        const opener = this.opener;
        this.opener = null;
        if (opener && document.contains(opener)) setTimeout(() => opener.focus(), 0);
    }

    private remember(rowId: string): void {
        const id = rowId.replace(/^recent:/, '');
        if (id.startsWith('act:')) return; // toggles are not destinations
        const next = [id, ...this.recentIds().filter(x => x !== id)].slice(0, RECENT_MAX);
        this.recentIds.set(next);
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* private mode */ }
    }

    private go(segments: string[]): void { void this.router.navigate(this.nav.link(...segments)); }

    private dest(id: string, label: string, icon: string, segments: string[]): PaletteItem {
        return { id: 'nav:' + id, group: 'navigation', label, icon, run: () => this.go(segments) };
    }

    private fromMenuItem(mi: MenuItem): PaletteItem {
        const icon = (mi.icon ?? '').replace('pi pi-fw ', '').replace('pi ', '') || 'pi-circle';
        const id = 'nav:' + (mi.label ?? '').toLowerCase().replace(/\s+/g, '-');
        const link = mi.routerLink as unknown[] | undefined;
        return {
            id, group: 'navigation', label: mi.label ?? '', icon,
            run: () => { if (link) void this.router.navigate(link); else mi.command?.({}); },
        };
    }

    /** Same update as the topbar's toggle: an explicit mode, so "system" is left behind on purpose. */
    private toggleTheme(): void {
        this.layout.layoutConfig.update(state => {
            const dark = state.darkTheme ?? false;
            return { ...state, themeMode: dark ? 'light' : 'dark', darkTheme: !dark };
        });
    }

    private switchLang(): void {
        const next = this.i18n.lang() === 'fr' ? 'en' : 'fr';
        this.i18n.setLang(next);
        // Routes carry the language: rewrite the current URL's prefix.
        const url = this.router.url.replace(/^\/(fr|en)(?=\/|$)/, '/' + next);
        void this.router.navigateByUrl(url);
    }
}

/** Lowercase, accent-stripped. "Épargne" and "epargne" match each other. */
function fold(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** 3 = a word starts with the query at position 0, 2 = a later word starts with it, 1 = substring. */
function score(hay: string, q: string): number {
    if (hay.startsWith(q)) return 3;
    if (hay.includes(' ' + q)) return 2;
    return hay.includes(q) ? 1 : 0;
}

function loadRecent(): string[] {
    try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; }
    catch { return []; }
}
