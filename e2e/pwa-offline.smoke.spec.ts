import { expect, Page, test } from '@playwright/test';

/**
 * P0-2 guard: an installed PWA must still paint an app route with the network
 * gone.
 *
 * Why this test exists. The Angular SSR build emits TWO index files: the
 * 174 kB PRERENDERED landing page as `/index.html`, and the bare
 * client-side-render shell as `/index.csr.html`. The generated `ngsw.json`
 * correctly names `/index.csr.html` as its navigation fallback, but only
 * `/index.html` was listed in the app-shell asset group, so the fallback was
 * never in the cache: every offline navigation to an app route missed the
 * cache, fell through to a dead network, and showed the browser's error page.
 * If someone drops `/index.csr.html` from `ngsw-config.json` again, this fails.
 *
 * Runs against the PRODUCTION build (the service worker is disabled in dev):
 *   npm run build && npm run serve:pwa
 *   E2E_BASE_URL=http://localhost:8080 npx playwright test e2e/pwa-offline.smoke.spec.ts
 *
 * Skipped automatically when pointed at the dev server, where there is no SW.
 */

const PWA_URL = process.env.E2E_PWA_URL || 'http://localhost:8080';

/** Every path the service worker currently holds, across all its caches. */
async function cachedPaths(page: Page): Promise<string[]> {
    return page.evaluate(async () => {
        const out: string[] = [];
        for (const name of await caches.keys()) {
            const cache = await caches.open(name);
            for (const req of await cache.keys()) out.push(new URL(req.url).pathname);
        }
        return out;
    });
}

/** The navigation fallback this build actually declares. */
async function manifestIndex(page: Page): Promise<string> {
    return page.evaluate(async () => (await (await fetch('/ngsw.json')).json()).index as string);
}

/**
 * Barrier: the worker controls the page AND the navigation fallback is in the
 * cache. Both halves matter. Waiting only on the controller would let the
 * offline assertions race the prefetch and fail for the wrong reason, and
 * `expect.poll` is used rather than `waitForFunction` because the predicate is
 * async (a promise-returning predicate is truthy on its first tick, so the wait
 * would pass instantly without ever checking anything).
 */
async function swReady(page: Page): Promise<void> {
    await page.waitForFunction(() => !!navigator.serviceWorker?.controller, undefined, {
        timeout: 60_000,
    });
    const index = await manifestIndex(page);
    await expect
        .poll(async () => (await cachedPaths(page)).includes(index), {
            message: `service worker never cached its navigation fallback ${index}`,
            timeout: 60_000,
        })
        .toBe(true);
}

test.describe('PWA offline shell', () => {
    test.use({ baseURL: PWA_URL });

    test('an app route still renders its shell with the network gone', async ({ page, context }) => {
        // Land on the app once so the worker installs and prefetches.
        await page.goto('/fr/pages/dashboard');
        await swReady(page);

        await context.setOffline(true);
        try {
            const res = await page.goto('/fr/pages/transaction');
            // Served from the SW cache, not from a dead network.
            expect(res, 'offline navigation returned no response').not.toBeNull();
            expect(res!.status()).toBe(200);

            // The Angular app actually boots: the shell is the CSR document, so
            // the root component mounts rather than showing a browser error page
            // or the prerendered marketing landing.
            await expect(page.locator('app-root')).toBeAttached({ timeout: 30_000 });
            const html = await page.content();
            expect(html, 'offline shell must not be the prerendered landing page')
                .not.toContain('landing-hero');
        } finally {
            await context.setOffline(false);
        }
    });

    test('the navigation fallback named by ngsw.json is actually cached', async ({ page }) => {
        await page.goto('/fr/pages/dashboard');
        await page.waitForFunction(() => !!navigator.serviceWorker?.controller, undefined, {
            timeout: 60_000,
        });

        // The whole contract in one assertion: whatever ngsw.json calls `index`
        // has to be a file the worker holds, or every offline navigation misses
        // the cache and dies on the network. This is the assertion that was
        // failing before P0-2, and the cheapest guard against a regression.
        const index = await manifestIndex(page);
        await expect
            .poll(async () => await cachedPaths(page), { timeout: 60_000 })
            .toContain(index);
    });

    test('the same holds at 390px and in English', async ({ page, context }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/en/pages/dashboard');
        await swReady(page);

        await context.setOffline(true);
        try {
            const res = await page.goto('/en/pages/goals');
            expect(res).not.toBeNull();
            expect(res!.status()).toBe(200);
            expect(res!.fromServiceWorker(), 'shell must come from the worker, not the network').toBe(true);
            await expect(page.locator('app-root')).toBeAttached({ timeout: 30_000 });
        } finally {
            await context.setOffline(false);
        }
    });

    test('the icon font is cacheable, so offline icons are not blank boxes', async ({ page }) => {
        await page.goto('/fr/pages/dashboard');
        await swReady(page);

        // Angular emits font files referenced from CSS under /media/, which no
        // asset group covered: every `pi pi-*` glyph in the app (i.e. all of
        // them) fell back to a blank box with the network gone. Only the format
        // the browser picks is actually fetched, so the lazy group costs ~35 kB.
        const fonts = await page.evaluate(async () =>
            ((await (await fetch('/ngsw.json')).json()).assetGroups as { urls: string[] }[])
                .flatMap((g) => g.urls)
                .filter((u: string) => u.startsWith('/media/')),
        );
        expect(fonts.length, 'no /media/ font files in any asset group').toBeGreaterThan(0);
    });
});
