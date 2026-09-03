import { expect, Page, test } from '@playwright/test';

/**
 * Asset-detail edit-flow smoke (Sprint 2 safety net for the god-component split).
 *
 * Proves the core "open an asset → edit → save → it persists" flow works. The
 * split of asset-detail.ts into container + presentational children must keep
 * this green. Anchored on data-testid attributes so it survives markup changes.
 *
 * Prereqs (local): `ng serve` on :4200, the backend on :8000, and the seeded
 * demo user. ASSET_ID defaults to a seeded demo asset.
 */

const LANG = 'fr';
const EMAIL = process.env.E2E_EMAIL || 'demo@omaad.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'OmaadDemo2026!';
// E2E_ASSET_ID pins an asset; otherwise the spec asks the API for the demo
// user's first asset (P3-6). The old default '1' assumed the seed numbered
// assets from 1, which no local database does any more (the demo user's assets
// start at 3 here), so the edit flow was red on every machine without the env
// var. The API, not the UI, so the lookup does not depend on render timing.
const ASSET_ID_ENV = process.env.E2E_ASSET_ID;
const API = process.env.E2E_API_URL || 'http://localhost:8000/api/v1';

async function resolveAssetId(page: Page): Promise<string> {
    if (ASSET_ID_ENV) return ASSET_ID_ENV;
    const login = await page.request.post(`${API}/auth/login`, { form: { username: EMAIL, password: PASSWORD } });
    expect(login.ok(), `API login for the asset lookup (${login.status()})`).toBe(true);
    const token = ((await login.json()) as { access_token: string }).access_token;
    const assets = await page.request.get(`${API}/assets`, { headers: { Authorization: `Bearer ${token}` } });
    expect(assets.ok(), `GET /assets (${assets.status()})`).toBe(true);
    const list = (await assets.json()) as Array<{ id: number }>;
    expect(list.length, 'the demo user needs at least one asset').toBeGreaterThan(0);
    return String(list[0].id);
}

async function login(page: Page) {
    await page.goto(`/${LANG}/auth/login`);
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password input').fill(PASSWORD);
    await page.locator('button[type=submit]').first().click();
    // Land anywhere off the login page (dashboard); the httpOnly refresh cookie
    // now backs session restore on subsequent full navigations.
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 20_000 });
}

test('asset edit flow: open → change name → save → persists', async ({ page }) => {
    await login(page);
    const assetId = await resolveAssetId(page);

    await page.goto(`/${LANG}/pages/patrimoine/assets/${assetId}`);

    // Read-only render: the header name and at least one formatted amount show.
    await expect(page.locator('h1')).not.toBeEmpty();
    await expect(page.locator('app-amount').first()).toBeVisible();

    const editBtn = page.getByTestId('asset-edit-btn');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    const nameInput = page.getByTestId('asset-name-input');
    await expect(nameInput).toBeVisible();
    const original = await nameInput.inputValue();
    expect(original.length).toBeGreaterThan(0);

    const temp = `${original} ✓`;
    await nameInput.fill(temp);
    await page.getByTestId('asset-save-btn').locator('button').click();

    // Dialog closes and the header reflects the new name.
    await expect(nameInput).toBeHidden();
    await expect(page.locator('h1')).toContainText(temp);

    // Restore the original name so the demo data is left untouched.
    await page.getByTestId('asset-edit-btn').click();
    await expect(page.getByTestId('asset-name-input')).toBeVisible();
    await page.getByTestId('asset-name-input').fill(original);
    await page.getByTestId('asset-save-btn').locator('button').click();
    await expect(page.locator('h1')).toContainText(original);
});

test('money pages render (patrimoine + goals) after OnPush', async ({ page }) => {
    await login(page);

    await page.goto(`/${LANG}/pages/patrimoine`);
    // Adopted section headers + at least one formatted amount render.
    await expect(page.locator('app-section-header').first()).toBeVisible();
    await expect(page.locator('app-amount').first()).toBeVisible();

    await page.goto(`/${LANG}/pages/goals`);
    // Adopted page header renders with a non-empty title.
    await expect(page.locator('app-page-header h1')).not.toBeEmpty();
});
