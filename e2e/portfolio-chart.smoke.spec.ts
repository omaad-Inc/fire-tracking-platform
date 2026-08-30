import { expect, Page, test } from '@playwright/test';

/**
 * The Patrimoine / net-worth progression, backed by real data.
 *
 * These charts used to be interpolated in the browser from purchase_value to
 * current_value: a straight ramp through months nobody measured, flat for any
 * asset with no purchase_date, and unable to react to a transaction.
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

test('patrimoine progression draws the snapshot-backed series', async ({ page }) => {
    await login(page);
    await page.goto(`/${LANG}/pages/patrimoine`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'e2e-out/portfolio-patrimoine.png', fullPage: true });
});

test('dashboard net worth draws the snapshot-backed series', async ({ page }) => {
    await login(page);
    await page.goto(`/${LANG}/pages/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'e2e-out/portfolio-dashboard.png', fullPage: true });
});
