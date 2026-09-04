import { expect, Page, test } from '@playwright/test';

/**
 * Analyse BRVM (whole sleeve: stocks + FCP), the web twin of the mobile
 * /analyse-brvm screen. Backed by real data: /assets/brvm-portfolio on the
 * LOCAL backend for the signed-in user.
 *
 * Prereqs: `ng serve` on :4200, backend on :8000 against the LOCAL omaad_dev.
 * Default account is the demo user; pass E2E_EMAIL / E2E_PASSWORD to run it
 * on the owner replica (smbaye@ept.sn holds 4 stocks + 1 FCP), where the
 * allocation must list a Fund-tagged row.
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

test('patrimoine hero links to the BRVM analysis page', async ({ page }) => {
    await login(page);
    await page.goto(`/${LANG}/pages/patrimoine`);
    const pill = page.getByTestId('patrimoine-analyse-brvm-link');
    await expect(pill).toBeVisible({ timeout: 30_000 });
    await pill.click();
    await expect(page).toHaveURL(/\/pages\/patrimoine\/analyse-brvm/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Analyse BRVM/);
});

test('analysis page renders one of its honest states', async ({ page }) => {
    await login(page);
    await page.goto(`/${LANG}/pages/patrimoine/analyse-brvm`);
    await page.waitForLoadState('networkidle');
    // Exactly one of: the sleeve (value card), the empty sleeve, the Pro upsell.
    const value = page.getByTestId('analyse-brvm-value-card');
    const empty = page.getByTestId('analyse-brvm-empty-cta');
    const upsell = page.getByTestId('analyse-brvm-upsell');
    await expect(value.or(empty).or(upsell).first()).toBeVisible({ timeout: 30_000 });

    if (await value.isVisible()) {
        await expect(page.getByTestId('analyse-brvm-performance')).toBeVisible();
        await expect(page.getByTestId('analyse-brvm-unrealized')).toBeVisible();
        const alloc = page.getByTestId('analyse-brvm-allocation');
        await expect(alloc).toBeVisible();
        // Every allocation row wears its kind badge (Action / FCP).
        const badges = alloc.locator('li span.uppercase');
        expect(await badges.count()).toBeGreaterThan(0);
        for (const text of await badges.allInnerTexts()) {
            expect(['ACTION', 'FCP', 'STOCK', 'FUND']).toContain(text.trim().toUpperCase());
        }
        // The range chips re-slice without breaking the card.
        await page.getByRole('button', { name: 'Max' }).click();
        await expect(value).toBeVisible();
    }
    await page.screenshot({ path: 'e2e-out/analyse-brvm.png', fullPage: true });
});
