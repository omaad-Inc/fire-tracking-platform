import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { PwaService } from '../service/pwa.service';

@Component({
    selector: 'app-pwa-prompt',
    standalone: true,
    imports: [CommonModule, ButtonModule],
    template: `
        <!-- Update Available Banner (top) -->
        <div *ngIf="pwaService.hasUpdate()"
             class="fixed top-0 left-0 right-0 z-[60] h-14 flex items-center justify-between px-4 bg-gradient-to-r from-indigo-600 to-cyan-500 shadow-md">
            <div class="flex items-center gap-3">
                <i class="pi pi-refresh text-white text-lg"></i>
                <span class="text-white font-medium text-sm">Nouvelle version disponible</span>
            </div>
            <div class="flex items-center gap-2">
                <button pButton label="Mettre à jour"
                        (click)="pwaService.applyUpdate()"
                        class="!bg-white !text-indigo-600 !border-0 !py-1 !px-3 !text-sm !font-semibold !rounded-lg hover:!bg-white/90"></button>
                <button (click)="dismissUpdate()"
                        class="text-white/70 hover:text-white transition-colors p-1 ml-1">
                    <i class="pi pi-times text-sm"></i>
                </button>
            </div>
        </div>

        <!-- Install PWA Banner (top, shown only if not installed and prompt available) -->
        <div *ngIf="showInstallBanner && pwaService.canInstall() && !pwaService.isRunningStandalone()"
             class="fixed top-0 left-0 right-0 z-[60] h-14 flex items-center justify-between px-4 bg-surface-0 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 shadow-sm">
            <div class="flex items-center gap-3">
                <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
                    <i class="pi pi-download text-white text-xs"></i>
                </div>
                <span class="text-surface-900 dark:text-surface-0 font-medium text-sm">Installer Omaad Wealth pour un accès hors-ligne</span>
            </div>
            <div class="flex items-center gap-2">
                <button pButton label="Installer"
                        (click)="installApp()"
                        class="!bg-gradient-to-r !from-indigo-600 !to-cyan-500 !text-white !border-0 !py-1 !px-3 !text-sm !font-semibold !rounded-lg"></button>
                <button (click)="dismissInstall()"
                        class="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition-colors p-1">
                    <i class="pi pi-times text-sm"></i>
                </button>
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

