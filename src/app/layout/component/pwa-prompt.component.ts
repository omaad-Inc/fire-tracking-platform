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
        @if (showUpdateBanner && pwaService.hasUpdate()) {
            <div class="fixed top-0 left-0 right-0 z-[60] h-12 flex items-center justify-between px-4
                        bg-brand-700 shadow-md animate-slide-down">
                <div class="flex items-center gap-2.5">
                    <i class="pi pi-refresh text-white text-sm"></i>
                    <span class="text-white font-medium text-sm">Nouvelle version disponible</span>
                </div>
                <div class="flex items-center gap-2">
                    <button pButton label="Mettre à jour" size="small"
                            (click)="pwaService.applyUpdate()"
                            class="!bg-white !text-brand-700 dark:text-brand-300 !border-0 !py-1 !px-3 !text-xs !font-semibold !rounded-lg"></button>
                    <button (click)="dismissUpdate()" class="text-white/70 hover:text-white p-1">
                        <i class="pi pi-times text-xs"></i>
                    </button>
                </div>
            </div>
        }

        <!-- Install PWA — floating bottom card on mobile, top bar on desktop -->
        @if (showInstallBanner && pwaService.canInstall() && !pwaService.isRunningStandalone()) {
            <div class="fixed z-[60] animate-slide-up
                        bottom-24 left-4 right-4
                        sm:bottom-auto sm:top-0 sm:left-0 sm:right-0 sm:animate-slide-down">

                <!-- Mobile: floating card -->
                <div class="sm:hidden rounded-2xl bg-surface-0 dark:bg-surface-900
                            border border-surface-200 dark:border-surface-700
                            shadow-xl shadow-card p-4">
                    <div class="flex items-start gap-3">
                        <div class="w-11 h-11 rounded-xl bg-brand-700 flex items-center justify-center shrink-0 shadow-lg">
                            <img src="assets/brand/omaad-icon-mono-white.svg" alt="Omaad" class="w-7 h-7">
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="font-semibold text-surface-900 dark:text-surface-0 text-sm leading-tight">Installer Omaad</p>
                            <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5">Accès rapide et mode hors-ligne</p>
                        </div>
                        <button (click)="dismissInstall()" class="text-surface-400 hover:text-surface-600 p-0.5 -mt-0.5 shrink-0">
                            <i class="pi pi-times text-xs"></i>
                        </button>
                    </div>
                    <div class="flex gap-2 mt-3">
                        <button pButton label="Installer" icon="pi pi-download"
                                (click)="installApp()"
                                class="flex-1 !bg-brand-700 hover:!bg-brand-800 !border-0 !text-white !py-2.5 !text-sm !font-semibold !rounded-xl"></button>
                        <button pButton label="Plus tard" [outlined]="true"
                                (click)="dismissInstall()"
                                class="!py-2.5 !text-sm !rounded-xl !border-surface-300 dark:!border-surface-600"></button>
                    </div>
                </div>

                <!-- Desktop: slim top bar -->
                <div class="hidden sm:flex items-center justify-between h-12 px-4
                            bg-surface-0 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 shadow-sm">
                    <div class="flex items-center gap-2.5">
                        <div class="w-7 h-7 rounded-lg bg-brand-700 flex items-center justify-center">
                            <i class="pi pi-download text-white text-xs"></i>
                        </div>
                        <span class="text-surface-900 dark:text-surface-0 font-medium text-sm">Installer Omaad pour un accès rapide</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button pButton label="Installer" size="small"
                                (click)="installApp()"
                                class="!bg-brand-700 hover:!bg-brand-800 !text-white !border-0 !py-1 !px-3 !text-xs !font-semibold !rounded-lg"></button>
                        <button (click)="dismissInstall()" class="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 p-1">
                            <i class="pi pi-times text-sm"></i>
                        </button>
                    </div>
                </div>
            </div>
        }
    `,
    styles: [`
        @keyframes slide-up {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes slide-down {
            from { transform: translateY(-100%); opacity: 0; }
            to   { transform: translateY(0);     opacity: 1; }
        }
        .animate-slide-up   { animation: slide-up   0.35s ease-out; }
        .animate-slide-down  { animation: slide-down 0.35s ease-out; }
    `]
})
export class PwaPromptComponent {
    pwaService = inject(PwaService);

    showInstallBanner = true;
    showUpdateBanner = true;

    constructor() {
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (dismissed) {
            const daysSince = (Date.now() - new Date(dismissed).getTime()) / (1000 * 60 * 60 * 24);
            this.showInstallBanner = daysSince > 7;
        }
    }

    async installApp() {
        const installed = await this.pwaService.installPwa();
        if (installed) this.showInstallBanner = false;
    }

    dismissInstall() {
        this.showInstallBanner = false;
        localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
    }

    dismissUpdate() {
        this.showUpdateBanner = false;
    }
}
