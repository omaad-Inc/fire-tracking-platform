import { Injectable, ApplicationRef, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, first, debounceTime } from 'rxjs/operators';
import { interval, fromEvent } from 'rxjs';

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
        this.setupUpdateChecks();
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
            console.log('Afrin Nexus PWA installed successfully!');
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

    private setupUpdateChecks() {
        if (!this.swUpdate.isEnabled) return;

        // Immediate check on startup (after app is stable)
        const appIsStable$ = this.appRef.isStable.pipe(first(isStable => isStable === true));
        appIsStable$.subscribe(() => {
            // Wait a bit for the app to fully initialize, then check
            setTimeout(() => this.checkForUpdateNow(), 2000);
        });

        // Check every hour (reduced from 6 hours)
        const everyHour$ = interval(60 * 60 * 1000);
        everyHour$.subscribe(() => {
            this.checkForUpdateNow();
        });

        // Check when app becomes visible (user switches back to the app)
        if (typeof document !== 'undefined') {
            fromEvent(document, 'visibilitychange')
                .pipe(debounceTime(500))
                .subscribe(() => {
                    if (!document.hidden) {
                        // App became visible, check for updates
                        this.checkForUpdateNow();
                    }
                });

            // Check when window gains focus
            fromEvent(window, 'focus')
                .pipe(debounceTime(500))
                .subscribe(() => {
                    this.checkForUpdateNow();
                });
        }
    }


    private async checkForUpdateNow() {
        if (!this.swUpdate.isEnabled) return;

        try {
            const updateFound = await this.swUpdate.checkForUpdate();
            if (updateFound) {
                console.log('Update available - checking version...');
                // The versionUpdates observable will emit VERSION_READY event
            } else {
                console.log('App is up to date');
            }
        } catch (err) {
            console.error('Failed to check for updates:', err);
        }
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

