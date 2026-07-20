import { Signal, signal } from '@angular/core';
import { Observable, firstValueFrom, isObservable } from 'rxjs';

/**
 * ONE cache layer for every feature service (P2-FE-1).
 *
 * Before this, transactions/patrimoine/savings/debts/dashboard each copy-pasted
 * an ~80-line TTL + stale-while-revalidate + in-flight-dedup cache, with subtle
 * divergences (some swallowed errors into `[]`/zeros; some pinned a failed
 * in-flight observable forever so retry never re-fired). Those divergences were
 * the root cause of the P0-2 dashboard-staleness bug class. This is the single,
 * signals-first implementation they all share.
 *
 * Contract:
 *   - `data`   — last value that loaded successfully (null before the first).
 *   - `status` — 'idle' | 'loading' | 'success' | 'error'. 'error' is set ONLY
 *                on a COLD failure (nothing cached to serve), which is what lets
 *                widgets render the P1-5 error+retry card instead of a
 *                fake-empty "you have no data / 0 FCFA" state.
 *   - `load()` — honours TTL + stale-while-revalidate; concurrent callers share
 *                one in-flight request (dedup).
 *   - `invalidate()` — for write events: forces the NEXT load to refetch while
 *                keeping the last value visible (no skeleton flash).
 *   - `reset()` — for logout (CACHE_RESET): clears the value so the next user
 *                never sees the previous user's cached financials (P1-10).
 */

export type ResourceStatus = 'idle' | 'loading' | 'success' | 'error';

export interface CachedResource<T> {
    /** Last value that loaded successfully, or null before the first success. */
    readonly data: Signal<T | null>;
    /** Lifecycle status; 'error' only on a COLD failure (no cached value to serve). */
    readonly status: Signal<ResourceStatus>;
    /** The error from the last cold failure, else null. */
    readonly error: Signal<unknown>;
    /**
     * Resolve the resource value, honouring TTL + stale-while-revalidate:
     *   - fresh cache            → resolves with it immediately, no fetch
     *   - stale cache            → resolves with the stale value NOW, refreshes in bg
     *   - invalidated / cold     → awaits a fresh fetch
     * A burst of concurrent calls collapses to ONE network request. On a cold
     * failure the promise rejects (caller shows error+retry); when a cached
     * value exists it never rejects (stale data beats a fake-empty state).
     */
    load(force?: boolean): Promise<T>;
    /** Drop freshness so the next load() refetches; KEEP the last value (no flash). For write events. */
    invalidate(): void;
    /** Clear everything back to idle. For logout — prevents cross-user cache bleed. */
    reset(): void;
    /** Seed the cache with a value directly (e.g. after an optimistic mutation). */
    set(value: T): void;
    /** Synchronous peek at the cached value (null if none) — for no-flash pre-population. */
    peek(): T | null;
    /** Whether a cached value currently exists. */
    hasData(): boolean;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export function cachedResource<T>(
    fetcher: () => Promise<T> | Observable<T>,
    opts: { ttl?: number } = {},
): CachedResource<T> {
    const ttl = opts.ttl ?? DEFAULT_TTL;

    const _data = signal<T | null>(null);
    const _status = signal<ResourceStatus>('idle');
    const _error = signal<unknown>(null);

    let stamp = 0;              // time of the last successful load
    let dirty = false;          // invalidate() sets this — the next load must refetch
    let inFlight: Promise<T> | null = null;

    const hasData = (): boolean => _data() !== null;
    const isFresh = (): boolean => hasData() && !dirty && (Date.now() - stamp) < ttl;

    function runFetch(): Promise<T> {
        if (inFlight) return inFlight;               // dedup: collapse a burst to one request
        if (!hasData()) _status.set('loading');      // don't flash a skeleton while revalidating existing data
        const out = fetcher();
        inFlight = (isObservable(out) ? firstValueFrom(out) : Promise.resolve(out))
            .then(value => {
                _data.set(value);
                stamp = Date.now();
                dirty = false;
                _status.set('success');
                _error.set(null);
                return value;
            })
            .catch(err => {
                // Serve the last good value if we have one — a network blip must
                // not wipe the UI to a fake-empty/zero state (P1-5). Only a COLD
                // failure (nothing cached) surfaces as an error the caller retries.
                if (hasData()) {
                    _status.set('success');
                    return _data() as T;
                }
                _status.set('error');
                _error.set(err);
                throw err;
            })
            .finally(() => { inFlight = null; });
        return inFlight;
    }

    return {
        data: _data.asReadonly(),
        status: _status.asReadonly(),
        error: _error.asReadonly(),
        load(force = false): Promise<T> {
            if (isFresh() && !force) return Promise.resolve(_data() as T);
            if (hasData() && !dirty && !force) {
                // stale-while-revalidate: hand back the stale value now, refresh in bg
                runFetch().catch(() => { /* status/stale already handled in runFetch */ });
                return Promise.resolve(_data() as T);
            }
            // invalidated, forced, or cold → the caller waits for fresh data
            return runFetch();
        },
        invalidate(): void {
            dirty = true;
            stamp = 0;
        },
        reset(): void {
            _data.set(null);
            _status.set('idle');
            _error.set(null);
            stamp = 0;
            dirty = false;
            inFlight = null;
        },
        set(value: T): void {
            _data.set(value);
            stamp = Date.now();
            dirty = false;
            _status.set('success');
            _error.set(null);
        },
        peek: () => _data(),
        hasData,
    };
}
