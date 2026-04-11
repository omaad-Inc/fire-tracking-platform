import { Injectable, signal } from '@angular/core';

const STORAGE_PIN_HASH  = 'omaad_pin_hash';
const STORAGE_PIN_SALT  = 'omaad_pin_salt';
const STORAGE_LOCK_DELAY = 'omaad_lock_delay';  // ms before auto-lock (0 = immediate)
const MAX_ATTEMPTS = 5;

/**
 * PIN Lock Service — manages the 4-digit PIN lock for the app.
 *
 * Security model:
 * - PIN is never stored in plain text — only a SHA-256(salt + pin) hash
 * - Salt is a random 16-char hex string, generated once per device
 * - After 5 failed attempts, the service triggers a forced logout
 * - The lock screen is an overlay that prevents any app interaction
 * - Auto-locks when the app goes to background (configurable delay)
 *
 * The PIN is purely local (no backend) — it protects against someone
 * picking up your unlocked phone, not against a forensic attack.
 */
@Injectable({ providedIn: 'root' })
export class PinService {

    /** True when the lock screen should be shown */
    readonly locked = signal(false);

    /** Number of consecutive failed attempts */
    readonly failedAttempts = signal(0);

    /** Callback for forced logout (set by AppLayout) */
    onForcedLogout: (() => void) | null = null;

    private backgroundTimestamp = 0;

    // ── PIN state queries ────────────────────────────────────────────

    /** Whether a PIN has been configured */
    isPinSet(): boolean {
        return !!this.getStoredHash();
    }

    /** Lock delay in milliseconds (0 = immediate) */
    getLockDelay(): number {
        try {
            return parseInt(localStorage.getItem(STORAGE_LOCK_DELAY) || '0', 10);
        } catch { return 0; }
    }

    setLockDelay(ms: number): void {
        try { localStorage.setItem(STORAGE_LOCK_DELAY, String(ms)); } catch {}
    }

    // ── PIN management ───────────────────────────────────────────────

    /** Set a new PIN (or replace the existing one) */
    async setPin(pin: string): Promise<void> {
        const salt = this.generateSalt();
        const hash = await this.hashPin(salt, pin);
        try {
            localStorage.setItem(STORAGE_PIN_SALT, salt);
            localStorage.setItem(STORAGE_PIN_HASH, hash);
        } catch {}
    }

    /** Remove the PIN entirely */
    removePin(): void {
        try {
            localStorage.removeItem(STORAGE_PIN_HASH);
            localStorage.removeItem(STORAGE_PIN_SALT);
            localStorage.removeItem(STORAGE_LOCK_DELAY);
        } catch {}
        this.locked.set(false);
        this.failedAttempts.set(0);
    }

    /** Verify a PIN attempt. Returns true if correct. */
    async verify(pin: string): Promise<boolean> {
        const storedHash = this.getStoredHash();
        const salt = this.getStoredSalt();
        if (!storedHash || !salt) return false;

        const hash = await this.hashPin(salt, pin);
        if (hash === storedHash) {
            // Success — unlock
            this.locked.set(false);
            this.failedAttempts.set(0);
            return true;
        }

        // Failed attempt
        const attempts = this.failedAttempts() + 1;
        this.failedAttempts.set(attempts);

        if (attempts >= MAX_ATTEMPTS) {
            // Force logout after too many failures
            this.removePin();
            this.onForcedLogout?.();
        }

        return false;
    }

    // ── Lock/unlock ──────────────────────────────────────────────────

    /** Lock the app (show lock screen) — only on mobile-sized screens */
    lock(): void {
        if (this.isPinSet() && this.isMobile()) {
            this.locked.set(true);
        }
    }

    /** Called when the app is ready (e.g. after login) — locks if PIN is set and on mobile */
    initLockOnStartup(): void {
        if (this.isPinSet() && this.isMobile()) {
            this.locked.set(true);
        }
    }

    /** Returns true if the screen width is below the desktop breakpoint (992px) */
    private isMobile(): boolean {
        return typeof window !== 'undefined' && window.innerWidth < 992;
    }

    // ── Background/foreground handling ────────────────────────────────

    /** Call when the app goes to background */
    onBackground(): void {
        this.backgroundTimestamp = Date.now();
    }

    /** Call when the app comes back to foreground */
    onForeground(): void {
        if (!this.isPinSet() || this.locked()) return;

        const elapsed = Date.now() - this.backgroundTimestamp;
        const delay = this.getLockDelay();

        if (elapsed >= delay) {
            this.lock();
        }
    }

    // ── Crypto helpers ───────────────────────────────────────────────

    private async hashPin(salt: string, pin: string): Promise<string> {
        const data = new TextEncoder().encode(salt + pin);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    private generateSalt(): string {
        const array = new Uint8Array(8);
        crypto.getRandomValues(array);
        return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    private getStoredHash(): string | null {
        try { return localStorage.getItem(STORAGE_PIN_HASH); } catch { return null; }
    }

    private getStoredSalt(): string | null {
        try { return localStorage.getItem(STORAGE_PIN_SALT); } catch { return null; }
    }
}
