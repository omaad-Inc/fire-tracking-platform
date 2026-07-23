/**
 * Tiny IndexedDB key-value store for DEVICE-LOCAL data snapshots (perf S-boot).
 *
 * Purpose: let a hard refresh paint the dashboard with the last-known numbers
 * instantly (stale-while-revalidate) instead of blanking on the network — the
 * backend round-trip is the slow part of boot. Used by `cachedResource` via
 * its `persistKey` option; feature code should not call this directly.
 *
 * Privacy contract (owner-approved 2026-07-24):
 *   - Snapshots are financial AGGREGATES (net worth, monthly flux, series),
 *     never credentials. The access token never touches storage (P4-SEC-1).
 *   - Keys are namespaced by the logged-in user id, so a user switch on a
 *     shared device can never read another user's snapshot.
 *   - Snapshots are deleted on logout and on dead-session force-login
 *     (CACHE_RESET → cachedResource.reset() → remove()).
 *
 * All operations are best-effort: storage being unavailable (SSR, private
 * browsing, quota) silently degrades to plain network behavior.
 */

const DB_NAME = 'omaad-device-cache';
const STORE = 'snapshots';

/** Namespace every key by the current user so snapshots can't cross accounts. */
function scopedKey(key: string): string {
    try {
        const raw = localStorage.getItem('omaad_user');
        const id = raw ? JSON.parse(raw)?.id : null;
        return `u${id ?? 'anon'}:${key}`;
    } catch {
        return `uanon:${key}`;
    }
}

function available(): boolean {
    return typeof indexedDB !== 'undefined' && typeof localStorage !== 'undefined';
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => req.result.createObjectStore(STORE);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => { dbPromise = null; reject(req.error); };
        });
    }
    return dbPromise;
}

function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return openDb().then(db => new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = run(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }));
}

export const deviceCache = {
    /** Read a snapshot; resolves null when absent or storage is unavailable. */
    async get<T>(key: string): Promise<T | null> {
        if (!available()) return null;
        try {
            const v = await withStore<T | undefined>('readonly', s => s.get(scopedKey(key)) as IDBRequest<T | undefined>);
            return v ?? null;
        } catch {
            return null;
        }
    },

    /** Write a snapshot (fire-and-forget safe; errors are swallowed). */
    async set<T>(key: string, value: T): Promise<void> {
        if (!available()) return;
        try {
            await withStore('readwrite', s => s.put(value, scopedKey(key)));
        } catch { /* quota/private mode: degrade to network-only */ }
    },

    /**
     * Wipe EVERY snapshot for every user (logout / dead-session reset).
     * Whole-store on purpose: at logout time `omaad_user` may already be
     * cleared, so per-user key resolution can no longer be trusted — and
     * logout is exactly when nothing should remain on the device anyway.
     */
    async clearAll(): Promise<void> {
        if (!available()) return;
        try {
            await withStore('readwrite', s => s.clear());
        } catch { /* ignore */ }
    },
};
