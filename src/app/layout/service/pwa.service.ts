import { Injectable, ApplicationRef, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, first } from 'rxjs/operators';
import { concat, interval } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class PwaService {
    private swUpdate = inject(SwUpdate);
    private appRef = inject(ApplicationRef);

    promptEvent: any;
    updateAvailable = false;

    constructor() {
        this.initPwaListeners();
        this.checkForUpdates();
    }

    private initPwaListeners() {
        // Listen for beforeinstallprompt event (install prompt)
        window.addEventListener('beforeinstallprompt', (e: Event) => {
            e.preventDefault();
            this.promptEvent = e;
        });

        // Listen for app installed event
        window.addEventListener('appinstalled', () => {
            this.promptEvent = null;
            console.log('Finova PWA installed successfully!');
        });

        // Listen for service worker updates
        if (this.swUpdate.isEnabled) {
            this.swUpdate.versionUpdates
                .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
                .subscribe(() => {
                    this.updateAvailable = true;
                    console.log('New version available!');
                });
        }
    }

    private checkForUpdates() {
        if (!this.swUpdate.isEnabled) return;

        // Check for updates after app is stable, then every 6 hours
        const appIsStable$ = this.appRef.isStable.pipe(first(isStable => isStable === true));
        const everySixHours$ = interval(6 * 60 * 60 * 1000);
        const everySixHoursOnceAppIsStable$ = concat(appIsStable$, everySixHours$);

        everySixHoursOnceAppIsStable$.subscribe(async () => {
            try {
                const updateFound = await this.swUpdate.checkForUpdate();
                console.log(updateFound ? 'Update available' : 'App is up to date');
            } catch (err) {
                console.error('Failed to check for updates:', err);
            }
        });
    }

    /**
     * Check if the app can be installed
     */
    canInstall(): boolean {
        return !!this.promptEvent;
    }

    /**
     * Trigger install prompt
     */
    async installPwa(): Promise<boolean> {
        if (!this.promptEvent) return false;

        this.promptEvent.prompt();
        const { outcome } = await this.promptEvent.userChoice;
        
        if (outcome === 'accepted') {
            this.promptEvent = null;
            return true;
        }
        return false;
    }

    /**
     * Check if running as installed PWA
     */
    isRunningStandalone(): boolean {
        return window.matchMedia('(display-mode: standalone)').matches ||
               (window.navigator as any).standalone === true ||
               document.referrer.includes('android-app://');
    }

    /**
     * Check if update is available
     */
    hasUpdate(): boolean {
        return this.updateAvailable;
    }

    /**
     * Apply update and reload
     */
    async applyUpdate(): Promise<void> {
        if (!this.swUpdate.isEnabled) return;

        try {
            await this.swUpdate.activateUpdate();
            this.updateAvailable = false;
            document.location.reload();
        } catch (err) {
            console.error('Failed to apply update:', err);
        }
    }

    /**
     * Check if service worker is enabled
     */
    isServiceWorkerEnabled(): boolean {
        return this.swUpdate.isEnabled;
    }
}

