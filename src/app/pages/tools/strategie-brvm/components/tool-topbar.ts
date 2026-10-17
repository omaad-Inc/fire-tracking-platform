import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { isDarkMode } from '../../../../core/theme/chart-theme';

/** Topbar autonome de l'outil Stratégie BRVM (même pattern que le comparateur SGI). */
@Component({
    selector: 'app-strategie-tool-topbar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [],
    template: `
        <div class="relative z-10 border-b border-surface-200 dark:border-surface-700/50">
            <div class="flex w-full items-center justify-between px-4 py-4 sm:px-6">
                <!-- Logo volontairement non cliquable dans cet outil (demande produit). -->
                <div class="flex items-center gap-3">
                    <img [src]="isDark() ? 'assets/brand/omaad-icon-inverse.svg' : 'assets/brand/omaad-icon.svg'"
                         alt="Omaad" class="h-10 w-10 md:h-12 md:w-12" width="48" height="48">
                    <span class="text-xl font-bold tracking-tight text-surface-900 dark:text-surface-0 md:text-2xl">Omaad</span>
                </div>
            </div>
        </div>
    `
})
export class StrategieToolTopbar {
    private platformId = inject(PLATFORM_ID);

    /** Public pages are light only (core/theme/public-light.ts); kept for the logo swap. */
    isDark(): boolean {
        if (!isPlatformBrowser(this.platformId)) return false;
        return isDarkMode();
    }
}
