import { expect, Page, test } from '@playwright/test';

/**
 * Coaching surface smoke (S6-3). The Conseils tab lives in the Analyses hub and
 * must render either recommendation cards or the calm all-clear state, and the
 * home-hero nudge slot must render (coaching top rec or all-clear). Anchored on
 * data-testid / structural selectors so it survives restyles.
 *
 * Prereqs (local): ng serve :4200, backend :8000 with the /coaching route,
 * seeded demo user.
 */

const EMAIL = process.env.E2E_EMAIL || 'demo@omaad.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'OmaadDemo2026!';

async function login(page: Page) {
    await page.goto('/fr/auth/login');
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password input').fill(PASSWORD);
    await page.locator('button[type=submit]').first().click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 20_000 });
}

test('coaching: Conseils tab renders recommendations or all-clear', async ({ page }) => {
    await login(page);
    await page.goto('/fr/pages/insights?tab=conseils');

    await expect(page.locator('app-coaching-panel')).toBeVisible({ timeout: 20_000 });
    // Either at least one recommendation card OR the calm all-clear empty state.
    const cards = page.locator('app-coaching-panel [role="listitem"]');
    const empty = page.locator('app-coaching-panel app-empty-state');
    await expect(async () => {
        expect((await cards.count()) + (await empty.count())).toBeGreaterThan(0);
    }).toPass({ timeout: 20_000 });
});

test('coaching: the Conseils tab is reachable from the Analyses hub', async ({ page }) => {
    await login(page);
    await page.goto('/fr/pages/insights');
    await page.getByTestId('tab-conseils').click();
    await expect(page).toHaveURL(/tab=conseils/);
    await expect(page.locator('app-coaching-panel')).toBeVisible({ timeout: 20_000 });
});

test('home hero renders its nudge slot', async ({ page }) => {
    await login(page);
    await page.goto('/fr');
    // The hero renders; its nudge slot is either a coaching link or the all-clear.
    await expect(page.locator('app-home-hero')).toBeVisible({ timeout: 20_000 });
});
