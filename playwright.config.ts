import { defineConfig } from '@playwright/test';

/**
 * Playwright smoke config (Sprint 2 safety net).
 *
 * Local-first: drives the already-running dev server (ng serve on :4200) with
 * the local backend (:8000) and the seeded demo user. Uses the system Chrome
 * channel so no browser download is needed. These smokes exercise real flows
 * so refactors (e.g. the asset-detail split) can't silently break behavior.
 *
 * Run: npm run e2e:smoke   (needs `ng serve`, the backend, and demo data up)
 */
export default defineConfig({
    testDir: './e2e',
    testMatch: '**/*.smoke.spec.ts',
    timeout: 60_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    retries: 0,
    reporter: [['list']],
    use: {
        baseURL: process.env.E2E_BASE_URL || 'http://localhost:4200',
        channel: 'chrome',
        headless: true,
        actionTimeout: 15_000,
        trace: 'retain-on-failure',
    },
});
