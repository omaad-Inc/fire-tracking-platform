import { Injectable, effect, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject } from 'rxjs';
import { updateSurfacePalette } from '@primeng/themes';

// Storage key for preferences
const STORAGE_KEY = 'afrin-nexus-layout-config';

// Surface palettes
const SURFACE_PALETTES: Record<string, Record<string, string>> = {
    slate: {
        0: '#ffffff',
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a',
        950: '#020617'
    },
    gray: {
        0: '#ffffff',
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827',
        950: '#030712'
    }
};

export interface layoutConfig {
    preset?: string;
    primary?: string;
    surface?: string | undefined | null;
    darkTheme?: boolean;
    menuMode?: string;
}

interface LayoutState {
    staticMenuDesktopInactive?: boolean;
    overlayMenuActive?: boolean;
    configSidebarVisible?: boolean;
    staticMenuMobileActive?: boolean;
    menuHoverActive?: boolean;
}

interface MenuChangeEvent {
    key: string;
    routeEvent?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class LayoutService {
    private platformId = inject(PLATFORM_ID);
    
    // Default configuration
    private readonly defaultConfig: layoutConfig = {
        preset: 'Aura',
        primary: 'emerald',
        surface: 'slate',
        darkTheme: true,
        menuMode: 'static'
    };

    // Initialize config from localStorage or defaults
    _config: layoutConfig = this.getInitialConfig();

    _state: LayoutState = {
        staticMenuDesktopInactive: false,
        overlayMenuActive: false,
        configSidebarVisible: false,
        staticMenuMobileActive: false,
        menuHoverActive: false
    };

    // Initialize signal with loaded config
    layoutConfig = signal<layoutConfig>(this._config);

    layoutState = signal<LayoutState>(this._state);

    private configUpdate = new Subject<layoutConfig>();

    private overlayOpen = new Subject<any>();

    private menuSource = new Subject<MenuChangeEvent>();

    private resetSource = new Subject();

    menuSource$ = this.menuSource.asObservable();

    resetSource$ = this.resetSource.asObservable();

    configUpdate$ = this.configUpdate.asObservable();

    overlayOpen$ = this.overlayOpen.asObservable();

    transitionComplete = signal<boolean>(false);

    private themeApplied = false;

    // Computed properties
    theme = computed(() => (this.layoutConfig()?.darkTheme ? 'light' : 'dark'));
    isSidebarActive = computed(() => this.layoutState().overlayMenuActive || this.layoutState().staticMenuMobileActive);
    isDarkTheme = computed(() => this.layoutConfig()?.darkTheme ?? true);
    getPrimary = computed(() => this.layoutConfig()?.primary);
    getSurface = computed(() => this.layoutConfig()?.surface);
    isOverlay = computed(() => this.layoutConfig()?.menuMode === 'overlay');

    constructor() {
        // Apply dark mode immediately (this works without PrimeNG being fully ready)
        if (isPlatformBrowser(this.platformId)) {
            this.toggleDarkMode(this._config);
            
            // Apply surface palette after a brief delay to ensure PrimeNG is initialized
            // This is necessary because updateSurfacePalette needs the theme system to be ready
            setTimeout(() => {
                this.applySurfacePalette(this._config?.surface || 'slate');
            }, 0);
        }

        // Effect for saving config changes to localStorage
        effect(() => {
            const config = this.layoutConfig();
            if (config) {
                this.onConfigUpdate();
                this.saveConfig(config);
            }
        });

        // Effect for handling dark mode changes
        effect(() => {
            const config = this.layoutConfig();
            if (!config) return;
            
            // Skip initial run since we already applied theme in constructor
            if (!this.themeApplied) {
                this.themeApplied = true;
                return;
            }

            this.handleDarkModeTransition(config);
        });
    }

    // Get initial config - called during class property initialization
    private getInitialConfig(): layoutConfig {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    return { ...this.defaultConfig, ...parsed };
                }
            } catch (e) {
                // Silently fail and use defaults
            }
        }
        return { ...this.defaultConfig };
    }

    private saveConfig(config: layoutConfig): void {
        if (isPlatformBrowser(this.platformId)) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
            } catch (e) {
                console.warn('Failed to save layout config to localStorage:', e);
            }
        }
    }

    private applyTheme(config: layoutConfig): void {
        // Apply dark mode
        this.toggleDarkMode(config);
        // Apply surface palette
        this.applySurfacePalette(config?.surface || 'slate');
    }

    private applySurfacePalette(surface: string): void {
        const palette = SURFACE_PALETTES[surface] || SURFACE_PALETTES['slate'];
        updateSurfacePalette(palette);
    }

    private handleDarkModeTransition(config: layoutConfig): void {
        if ((document as any).startViewTransition) {
            this.startViewTransition(config);
        } else {
            this.toggleDarkMode(config);
            this.onTransitionEnd();
        }
    }

    private startViewTransition(config: layoutConfig): void {
        const transition = (document as any).startViewTransition(() => {
            this.toggleDarkMode(config);
        });

        transition.ready
            .then(() => {
                this.onTransitionEnd();
            })
            .catch(() => {});
    }

    toggleDarkMode(config?: layoutConfig): void {
        const _config = config || this.layoutConfig();
        if (_config.darkTheme) {
            document.documentElement.classList.add('app-dark');
        } else {
            document.documentElement.classList.remove('app-dark');
        }
    }

    private onTransitionEnd() {
        this.transitionComplete.set(true);
        setTimeout(() => {
            this.transitionComplete.set(false);
        });
    }

    onMenuToggle() {
        if (this.isOverlay()) {
            this.layoutState.update((prev) => ({ ...prev, overlayMenuActive: !this.layoutState().overlayMenuActive }));

            if (this.layoutState().overlayMenuActive) {
                this.overlayOpen.next(null);
            }
        }

        if (this.isDesktop()) {
            this.layoutState.update((prev) => ({ ...prev, staticMenuDesktopInactive: !this.layoutState().staticMenuDesktopInactive }));
        } else {
            this.layoutState.update((prev) => ({ ...prev, staticMenuMobileActive: !this.layoutState().staticMenuMobileActive }));

            if (this.layoutState().staticMenuMobileActive) {
                this.overlayOpen.next(null);
            }
        }
    }

    isDesktop() {
        return window.innerWidth > 991;
    }

    isMobile() {
        return !this.isDesktop();
    }

    onConfigUpdate() {
        this._config = { ...this.layoutConfig() };
        this.configUpdate.next(this.layoutConfig());
    }

    onMenuStateChange(event: MenuChangeEvent) {
        this.menuSource.next(event);
    }

    reset() {
        this.resetSource.next(true);
    }
}
