import { expect, Page, test } from '@playwright/test';

/**
 * The patrimoine CATEGORY progression chart, backed by real data.
 *
 * It used to be interpolated in the browser from purchase_value to
 * current_value, so any asset without a purchase_date (every livret) pinned its
 * value to "today" at every past month and the Épargne line was flat forever.
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

for (const group of ['savings', 'mobile_money']) {
    test(`${group} category chart draws a real series`, async ({ page }) => {
        await login(page);
        await page.goto(`/${LANG}/pages/patrimoine/category/${group}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2500);
        await page.screenshot({ path: `e2e-out/category-${group}.png`, fullPage: true });
    });
}
