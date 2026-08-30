import { expect, Page, test } from '@playwright/test';

/**
 * Visual check for the real asset value chart (S13).
 *
 * The hero sparkline used to be a pseudo-random walk seeded from current_value,
 * so an épargne account looked frozen while its balance moved. It now draws the
 * asset's real series, and the monthly-variation panel lists the moves.
 *
 * Prereqs: `ng serve` on :4200, backend on :8000 against the LOCAL omaad_dev,
 * seeded demo user. Asset 4 = "Livret A" (savings), 99 = a real-estate row.
 */

const LANG = 'fr';
const EMAIL = process.env['E2E_EMAIL'] || 'demo@omaad.dev';
const PASSWORD = process.env['E2E_PASSWORD'] || 'OmaadDemo2026!';

async function login(page: Page) {
    await page.goto(`/${LANG}/auth/login`);
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password input').fill(PASSWORD);
    await page.locator('button[type=submit]').first().click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 30_000 });
}

test('savings asset shows a real chart and monthly variation', async ({ page }) => {
    await login(page);
    await page.goto(`/${LANG}/pages/patrimoine/assets/4`);
    await page.waitForLoadState('networkidle');

    // The variation panel only renders when the series carries real moves.
    await expect(page.getByText('Variation par mois')).toBeVisible({ timeout: 20_000 });
    await page.screenshot({ path: 'e2e-out/asset-4-savings.png', fullPage: true });
});

test('real estate shows its purchase-to-today progression', async ({ page }) => {
    await login(page);
    await page.goto(`/${LANG}/pages/patrimoine/assets/99`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'e2e-out/asset-99-realestate.png', fullPage: true });
});
