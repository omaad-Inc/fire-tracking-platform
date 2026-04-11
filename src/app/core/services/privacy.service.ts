import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'omaad_privacy_hidden';

/**
 * Global privacy mode — hides all financial amounts across the app.
 *
 * When `hidden()` is true, `<app-amount>` renders `•••••` instead of the real number.
 * Toggled via the eye icon in the topbar. Persisted in localStorage so
 * the preference survives page reloads.
 *
 * Usage in any component:
 *   inject(PrivacyService).hidden()  → boolean
 *   inject(PrivacyService).toggle()  → flips the state
 */
@Injectable({ providedIn: 'root' })
export class PrivacyService {
    /** True = amounts are masked with •••••  */
    readonly hidden = signal(this.loadFromStorage());

    toggle(): void {
        const next = !this.hidden();
        this.hidden.set(next);
        try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
    }

    private loadFromStorage(): boolean {
        try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
    }
}
