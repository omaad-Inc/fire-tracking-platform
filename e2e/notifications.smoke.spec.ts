import { expect, Page, test } from '@playwright/test';

/**
 * Notifications settings smoke (S9-B3). The Settings → Notifications page must
 * render the channel + signal toggles and quiet hours, and a toggle change
 * must persist through the real API (PUT + reload + GET round trip).
 *
 * Prereqs (local): ng serve :4200, backend :8000 with /notifications routes,
 * seeded demo user. The test restores the opted-out state on exit so the demo
 * user never stays opted in.
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

test('notifications: page renders channels, signals and quiet hours', async ({ page }) => {
    await login(page);
    await page.goto('/fr/pages/settings/notifications');

    await expect(page.getByText('Choisissez ce que Omaad peut vous envoyer', { exact: false }))
        .toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#notif-email-label')).toBeVisible();
    await expect(page.locator('#notif-push-label')).toBeVisible();
    await expect(page.locator('#notif-budget-label')).toBeVisible();
    await expect(page.locator('#notif-tontine-label')).toBeVisible();
    await expect(page.locator('#quiet-start')).toBeVisible();
    await expect(page.locator('#quiet-end')).toBeVisible();
});

test('notifications: email opt-in persists through the API and reverts', async ({ page }) => {
    await login(page);
    await page.goto('/fr/pages/settings/notifications');
    const emailToggle = page.locator('p-toggleswitch[arialabelledby="notif-email-label"] input');
    await expect(emailToggle).toBeVisible({ timeout: 20_000 });
    await expect(emailToggle).not.toBeChecked();

    // Opt in; wait for the PUT to land, then survive a full reload.
    const put = page.waitForResponse(r => r.url().includes('/notifications/preferences') && r.request().method() === 'PUT' && r.ok());
    await emailToggle.click();
    await put;
    await page.reload();
    await expect(emailToggle).toBeChecked({ timeout: 20_000 });

    // Restore opted-out state (the demo user must never stay opted in).
    const revert = page.waitForResponse(r => r.url().includes('/notifications/preferences') && r.request().method() === 'PUT' && r.ok());
    await emailToggle.click();
    await revert;
    await page.reload();
    await expect(emailToggle).not.toBeChecked({ timeout: 20_000 });
});

test('notifications: settings menu links to the page', async ({ page }) => {
    await login(page);
    await page.goto('/fr/pages/settings');
    await page.getByRole('link', { name: 'Notifications' }).click();
    await expect(page).toHaveURL(/settings\/notifications/);
});
