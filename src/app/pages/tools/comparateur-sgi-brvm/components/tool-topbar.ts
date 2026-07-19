import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { isDarkMode } from '../../../../core/theme/chart-theme';
import { LayoutService } from '../../../../layout/service/layout.service';

/** Topbar autonome des pages outils publiques (même pattern que compound-calculator). */
@Component({
    selector: 'app-sgi-tool-topbar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterModule],
    template: `
        <div class="relative z-10 border-b border-surface-200 dark:border-surface-700/50">
            <div class="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">
                <a routerLink="/" class="group flex cursor-pointer items-center gap-3">
                    <img [src]="isDark() ? 'assets/brand/omaad-icon-inverse.svg' : 'assets/brand/omaad-icon.svg'"
                         alt="Omaad" class="h-10 w-10 md:h-12 md:w-12" width="48" height="48">
                    <span class="text-xl font-bold tracking-tight text-surface-900 dark:text-surface-0 md:text-2xl">Omaad</span>
                </a>
                <div class="flex items-center gap-3">
                    <button type="button" (click)="toggleDarkMode()" aria-label="Changer de thème"
                            class="flex h-9 w-9 items-center justify-center rounded-full text-surface-600 dark:text-surface-300
                                   transition-all duration-200 hover:bg-surface-100 dark:hover:bg-surface-800">
                        <i [class]="layoutService.isDarkTheme() ? 'pi pi-sun text-base' : 'pi pi-moon text-base'"></i>
                    </button>
                    <a routerLink="/" class="text-sm text-surface-500 transition-colors hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200">
                        ← Retour
                    </a>
                </div>
            </div>
        </div>
    `
})
export class SgiToolTopbar {
    layoutService = inject(LayoutService);
    private platformId = inject(PLATFORM_ID);

    isDark(): boolean {
        if (!isPlatformBrowser(this.platformId)) return false;
        return isDarkMode();
    }

    toggleDarkMode(): void {
        this.layoutService.layoutConfig.update((state) => ({
            ...state,
            themeMode: state.darkTheme ? 'light' : 'dark',
            darkTheme: !state.darkTheme
        }));
    }
}
