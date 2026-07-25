import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { StrategieToolTopbar } from './components/tool-topbar';
import { DISCLAIMER } from './data/referentiel';

/**
 * Shell de l'outil Stratégie BRVM : topbar + tabs routés + disclaimer.
 * UX en tabs (comme l'app d'origine) mais chaque tab est une route Angular,
 * donc prérendue, indexable et partageable (plan d'intégration §3).
 */
@Component({
    selector: 'app-strategie-brvm-shell',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterModule, StrategieToolTopbar],
    template: `
        <div class="min-h-screen bg-surface-0 dark:bg-surface-900">
            <app-strategie-tool-topbar />

            <!-- Tabs routés -->
            <nav class="sticky top-0 z-20 border-b border-surface-200 bg-surface-0/95 backdrop-blur dark:border-surface-700/50 dark:bg-surface-900/95"
                 aria-label="Sections de l'outil">
                <div class="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-5 sm:px-6">
                    @for (tab of tabs; track tab.path) {
                        <a [routerLink]="tab.path" [routerLinkActiveOptions]="{ exact: true }" routerLinkActive="!border-ochre-500 !text-surface-900 dark:!text-surface-0"
                           class="whitespace-nowrap border-b-2 border-transparent px-4 py-3.5 text-[14px] font-medium text-surface-500
                                  transition-colors hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-100">
                            <i [class]="'pi ' + tab.icon + ' mr-1.5 text-[13px]'" aria-hidden="true"></i>{{ tab.label }}
                        </a>
                    }
                </div>
            </nav>

            <main class="mx-auto max-w-7xl px-5 pb-24 sm:px-6">
                <router-outlet />
            </main>

            <footer class="border-t border-surface-200 dark:border-surface-700/50">
                <div class="mx-auto max-w-7xl space-y-3 px-5 py-8 sm:px-6">
                    <p class="text-[12px] leading-relaxed text-surface-500 dark:text-surface-400">{{ disclaimer }}</p>
                    <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
                        <a routerLink="/outils/comparateur-sgi-brvm" class="font-medium text-ochre-600 hover:text-ochre-500 dark:text-ochre-400">
                            Comparateur des SGI de la BRVM</a>
                        <a routerLink="/fr/blog" class="font-medium text-ochre-600 hover:text-ochre-500 dark:text-ochre-400">Le blog Omaad</a>
                        <a routerLink="/fr/auth/register" class="font-medium text-ochre-600 hover:text-ochre-500 dark:text-ochre-400">
                            Créer mon compte Omaad</a>
                    </div>
                    <p class="text-[12px] text-surface-400 dark:text-surface-500">Un outil gratuit par Omaad · Construis. Protège. Règne.</p>
                </div>
            </footer>
        </div>
    `
})
export class StrategieBrvmShell {
    readonly disclaimer = DISCLAIMER;
    readonly tabs = [
        { path: '/outils/strategie-brvm', label: 'Mon plan', icon: 'pi-compass' },
        { path: '/outils/strategie-brvm/detachements', label: 'Détachements', icon: 'pi-calendar' },
        { path: '/outils/strategie-brvm/simulateur', label: 'Simulateur', icon: 'pi-chart-line' },
    ] as const;
}
