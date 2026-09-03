import { expect, Page, test } from '@playwright/test';

/**
 * Guard for the progression charts (owner report 2026-09-03, deployed app):
 * the "Patrimoine Brut" chart took seconds to appear on EVERY visit, and every
 * chart defaulted to "Max".
 *
 * Why every visit reloaded, in three compounding parts: the gross-assets
 * progression was never persisted (no device snapshot, so every cold load of
 * the PWA started from nothing); the component flipped its own `loading` flag
 * to true before awaiting, so the skeleton covered the chart however warm the
 * cache was; and the same Promise.all awaited a raw, uncached fetch of up to
 * 200 assets, so even a cached progression waited for that whole round trip.
 *
 * Two proofs below, because they catch different regressions:
 *  - an SPA revisit issues ZERO progression requests and never shows the
 *    skeleton (in-memory cache actually used);
 *  - a cold reload paints the chart BEFORE the network answers (device snapshot
 *    actually used), which is forced by delaying the response.
 *
 * Prereqs (local): ng serve :4200, backend :8000 on omaad_dev, demo user.
 * Signs in once per test: /auth/login is rate limited 10/minute.
 */

const EMAIL = process.env.E2E_EMAIL || 'demo@omaad.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'OmaadDemo2026!';

// The chart's own request. NOT /assets/...: a wrong path here made both timing
// proofs below pass vacuously (nothing matched, so nothing was counted or held).
const PROGRESSION = /\/api\/v1\/dashboard\/worth-progression/;

async function login(page: Page): Promise<void> {
    await page.goto('/fr/auth/login');
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password input').fill(PASSWORD);
    await page.locator('button[type=submit]').first().click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 30_000 });
}

/** The "Patrimoine Brut" card, its canvas, its skeleton and its active chip. */
const card = (page: Page) => page.locator('app-patrimoine-progress');
const canvas = (page: Page) => card(page).locator('canvas');
const skeleton = (page: Page) => card(page).locator('.animate-pulse');
const activeChip = (page: Page) => card(page).locator('button.bg-brand-700, button.dark\\:bg-surface-700').first();

test.describe('progression charts', () => {
    test('Patrimoine Brut: 1M by default, no reload on revisit, snapshot on cold load', async ({ page }) => {
        await login(page);

        // ── First visit: warms the cache. ──
        await page.goto('/fr/pages/patrimoine');
        await expect(canvas(page)).toBeVisible({ timeout: 30_000 });
        await expect(activeChip(page), 'default range must be 1M').toHaveText('1M');

        // 1M is a ROLLING month drawn day by day: the x-axis must span two
        // different days (a month ago and today), not a single monthly point.
        // With one point the start and end labels collapse to the same month.
        const xLabels = card(page).locator('.relative.h-6 span');
        await expect(xLabels.first()).not.toHaveText('', { timeout: 15_000 });
        const [xStart, xEnd] = await Promise.all([xLabels.nth(0).innerText(), xLabels.nth(2).innerText()]);
        expect(xStart.trim(), 'a day-granularity start label reads like "3 août"').toMatch(/^\d{1,2} /);
        expect(xStart.trim(), 'the window must span more than one day').not.toBe(xEnd.trim());

        // ── SPA revisit: zero requests for THIS chart, skeleton never shown. ──
        // Leave via the sidebar first; the listener is armed only for the way
        // back, otherwise it counts the dashboard's own first-load fetches (the
        // hero sparkline asks for months=12) and blames them on this chart.
        await page.locator('a[href="/fr"], a[href="/fr/"]').first().click();
        await expect(page).toHaveURL(/\/fr\/?$/, { timeout: 15_000 });
        await page.waitForTimeout(500);

        const requests: string[] = [];
        const onReq = (r: { url(): string }) => {
            const u = r.url();
            if (PROGRESSION.test(u) && /months=1(&|$)/.test(u)) requests.push(u);
        };
        page.on('request', onReq);
        let skeletonSeen = false;
        const watch = setInterval(async () => {
            if (await skeleton(page).count().catch(() => 0)) skeletonSeen = true;
        }, 50);

        await page.locator('a[href="/fr/pages/patrimoine"]').first().click();
        await expect(canvas(page)).toBeVisible({ timeout: 15_000 });
        await page.waitForTimeout(800);
        clearInterval(watch);
        page.off('request', onReq);

        expect(requests, `a warm revisit must not refetch the 1M progression, but fired:\n${requests.join('\n')}`).toEqual([]);
        expect(skeletonSeen, 'the skeleton must not cover an already-cached chart').toBe(false);

        // ── Cold reload: the chart must paint from the device snapshot BEFORE
        //    the network answers. Hold the response back to make that observable. ──
        await page.route(PROGRESSION, async (route) => {
            await new Promise((r) => setTimeout(r, 4000));
            await route.continue();
        });
        await page.reload();
        await expect(canvas(page), 'no snapshot paint: the chart waited for the network')
            .toBeVisible({ timeout: 2500 });
        await page.unroute(PROGRESSION);
    });

    test('every chart offers 1M/3M/6M/1A/Max, defaults to 1M, and reads 1Y in English', async ({ page }) => {
        await login(page);

        // Category detail used to lack 1M and default to Max.
        await page.goto('/fr/pages/patrimoine/category/stocks_bonds');
        // getByRole, not hasText with anchors: the chip label sits on its own
        // line inside the button, and a regex anchored on textContent misses it.
        const catChips = page.getByRole('button', { name: /^(1M|3M|6M|1A|Max)$/ });
        await expect(catChips).toHaveCount(5, { timeout: 30_000 });
        await expect(page.getByRole('button', { name: '1M', exact: true })).toHaveClass(/bg-brand-700/);

        // Objectifs chart: same set, same default.
        await page.goto('/fr/pages/goals');
        const goals = page.locator('app-savings-progress');
        const goalChips = goals.getByRole('button', { name: /^(1M|3M|6M|1A|Max)$/ });
        await expect(goalChips).toHaveCount(5, { timeout: 30_000 });
        await expect(goals.getByRole('button', { name: '1M', exact: true })).toHaveClass(/bg-brand-700/);

        // The year chip was a hard-coded French "1A" on every chart, including in English.
        await page.goto('/en/pages/patrimoine');
        await expect(card(page).getByRole('button', { name: '1Y', exact: true })).toHaveCount(1, { timeout: 30_000 });
        await expect(card(page).getByRole('button', { name: '1A', exact: true })).toHaveCount(0);
    });
});
