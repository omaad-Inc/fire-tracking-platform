import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { PwaService } from '../service/pwa.service';

@Component({
    selector: 'app-pwa-prompt',
    standalone: true,
    imports: [CommonModule, ButtonModule],
    template: `
        <!-- Update Available Banner -->
        <div *ngIf="pwaService.hasUpdate()" 
             class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 animate-slide-up">
            <div class="bg-gradient-to-r from-indigo-600 to-cyan-500 rounded-2xl p-4 shadow-2xl shadow-indigo-500/30">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
                        <i class="pi pi-refresh text-white text-xl"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="text-white font-bold text-lg mb-1">Mise à jour disponible</h4>
                        <p class="text-white/80 text-sm mb-3">Une nouvelle version de Finova est disponible avec des améliorations.</p>
                        <div class="flex gap-2">
                            <button pButton label="Mettre à jour" 
                                    (click)="pwaService.applyUpdate()"
                                    class="!bg-white !text-indigo-600 !border-0 !py-2 !px-4 !text-sm !font-semibold !rounded-xl hover:!bg-white/90"></button>
                            <button pButton label="Plus tard" 
                                    (click)="dismissUpdate()"
                                    class="!bg-transparent !text-white !border-white/30 !py-2 !px-4 !text-sm !rounded-xl hover:!bg-white/10"></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Install PWA Banner (shown only if not installed and prompt available) -->
        <div *ngIf="showInstallBanner && pwaService.canInstall() && !pwaService.isRunningStandalone()" 
             class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 animate-slide-up">
            <div class="bg-surface-0 dark:bg-surface-900 rounded-2xl p-4 shadow-2xl border border-surface-200 dark:border-surface-700">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/30">
                        <i class="pi pi-download text-white text-xl"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="text-surface-900 dark:text-surface-0 font-bold text-lg mb-1">Installer Finova</h4>
                        <p class="text-surface-600 dark:text-surface-400 text-sm mb-3">Installez l'application pour un accès rapide et une utilisation hors-ligne.</p>
                        <div class="flex gap-2">
                            <button pButton label="Installer" 
                                    (click)="installApp()"
                                    class="!bg-gradient-to-r !from-indigo-600 !to-cyan-500 !text-white !border-0 !py-2 !px-4 !text-sm !font-semibold !rounded-xl"></button>
                            <button pButton label="Non merci" 
                                    (click)="dismissInstall()"
                                    class="!bg-transparent !text-surface-600 dark:!text-surface-400 !border-surface-300 dark:!border-surface-600 !py-2 !px-4 !text-sm !rounded-xl hover:!bg-surface-100 dark:hover:!bg-surface-800"></button>
                        </div>
                    </div>
                    <button (click)="dismissInstall()" 
                            class="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition-colors p-1">
                        <i class="pi pi-times"></i>
                    </button>
                </div>
            </div>
        </div>
    `,
    styles: [`
        @keyframes slide-up {
            from {
                transform: translateY(100%);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        .animate-slide-up {
            animation: slide-up 0.3s ease-out;
        }
    `]
})
export class PwaPromptComponent {
    pwaService = inject(PwaService);
    
    showInstallBanner = true;
    showUpdateBanner = true;

    constructor() {
        // Check if user dismissed install banner before
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (dismissed) {
            const dismissedDate = new Date(dismissed);
            const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
            // Show again after 7 days
            this.showInstallBanner = daysSinceDismissed > 7;
        }
    }

    async installApp() {
        const installed = await this.pwaService.installPwa();
        if (installed) {
            this.showInstallBanner = false;
        }
    }

    dismissInstall() {
        this.showInstallBanner = false;
        localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
    }

    dismissUpdate() {
        this.showUpdateBanner = false;
    }
}

