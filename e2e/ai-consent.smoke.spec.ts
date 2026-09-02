import { expect, Page, test } from '@playwright/test';

/**
 * P0-1 smoke: the web AI consent gate, against the REAL backend
 * (`PUT /users/me/ai-consent`), not the mock chat driver.
 *
 * What is worth pinning here is the gate's behaviour over a whole session, not
 * its looks: the sheet appears once for a user who was never asked, a decline
 * leaves the page reachable, an acceptance survives a reload, and a withdrawal
 * from Settings re-gates the room.
 *
 * Prereqs (local): ng serve :4200, backend :8000 on omaad_dev, seeded demo user.
 */

const EMAIL = process.env.E2E_EMAIL || 'demo@omaad.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'OmaadDemo2026!';
const API = process.env.E2E_API_URL || 'http://localhost:8000/api/v1';

/**
 * Set the account's consent so each test starts from a known state.
 *
 * These tests drive DECLINED rather than "never asked", because the API only
 * stores yes or no: there is no endpoint that un-asks. The two gate the room
 * identically (both are "not granted"), and the one thing declined cannot
 * cover, the sheet opening by itself on a first visit, is pinned by the
 * service's own spec, which can build that state directly.
 */
async function setConsent(page: Page, granted: boolean): Promise<void> {
    const res = await page.request.put(`${API}/users/me/ai-consent`, {
        headers: { Authorization: `Bearer ${await token(page)}` },
        data: { granted },
    });
    expect(res.ok()).toBeTruthy();
}

/** The access token lives in memory only, so read it the way the app does: ask
 *  the backend for a fresh one with the refresh cookie the session already has. */
async function token(page: Page): Promise<string> {
    const res = await page.request.post(`${API}/auth/refresh`, { data: {} });
    expect(res.ok()).toBeTruthy();
    return (await res.json()).access_token as string;
}

async function login(page: Page): Promise<void> {
    await page.goto('/fr/auth/login');
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password input').fill(PASSWORD);
    await page.locator('button[type=submit]').first().click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 20_000 });
}

async function openAssistant(page: Page): Promise<void> {
    await page.goto('/fr/pages/assistant');
    await expect(page.locator('app-assistant-page')).toBeVisible({ timeout: 20_000 });
}

const sheet = (page: Page) => page.locator('app-ai-consent-sheet .p-dialog');
const composer = (page: Page) => page.locator('app-chat-input-bar');

test.describe('AI consent gate', () => {
    test('a user who has not consented is asked, and a decline keeps the page reachable', async ({ page }) => {
        await login(page);
        await setConsent(page, false);
        await openAssistant(page);

        // Declined: the room is open and readable, the composer is not there,
        // and the way back in is one click.
        await expect(composer(page)).toHaveCount(0);
        const panel = page.locator('app-ai-consent-panel');
        await expect(panel).toBeVisible({ timeout: 15_000 });
        await expect(panel).toContainText('Assistant en veille');

        // The CTA re-shows the disclosure rather than silently granting.
        await panel.getByRole('button', { name: /Activer l'assistant/ }).click();
        await expect(sheet(page)).toBeVisible();
        await expect(sheet(page)).toContainText('Anthropic');
        await expect(sheet(page)).toContainText('Ce qu\'il lit');
    });

    test('accepting opens the composer and survives a reload', async ({ page }) => {
        await login(page);
        await setConsent(page, false);
        await openAssistant(page);

        await page.locator('app-ai-consent-panel').getByRole('button', { name: /Activer l'assistant/ }).click();
        await sheet(page).getByRole('button', { name: /Autoriser l'assistant/ }).click();

        await expect(sheet(page)).toBeHidden({ timeout: 15_000 });
        await expect(composer(page)).toBeVisible();
        await expect(page.locator('app-ai-consent-panel')).toHaveCount(0);

        // Persisted server-side, so a reload does not re-ask.
        await page.reload();
        await expect(composer(page)).toBeVisible({ timeout: 20_000 });
        await expect(sheet(page)).toBeHidden();
    });

    test('withdrawing in Settings > Security re-gates the assistant', async ({ page }) => {
        await login(page);
        await setConsent(page, true);

        await page.goto('/fr/pages/settings/security');
        const section = page.locator('app-settings-security section', { hasText: 'Assistant IA' });
        await expect(section).toBeVisible({ timeout: 20_000 });
        await expect(section).toContainText('Assistant autorisé');

        await section.getByRole('button', { name: 'Retirer' }).click();
        await expect(section).toContainText('Assistant non autorisé', { timeout: 15_000 });

        // The gate on the room agrees immediately, with no reload.
        await openAssistant(page);
        await expect(composer(page)).toHaveCount(0);
        await expect(page.locator('app-ai-consent-panel')).toBeVisible({ timeout: 15_000 });
    });

    test('re-granting from Settings re-shows the disclosure first', async ({ page }) => {
        await login(page);
        await setConsent(page, false);

        await page.goto('/fr/pages/settings/security');
        const section = page.locator('app-settings-security section', { hasText: 'Assistant IA' });
        await expect(section).toBeVisible({ timeout: 20_000 });

        await section.getByRole('button', { name: 'Autoriser' }).click();
        // A bare switch would grant consent to something unstated: the notice
        // has to be on screen before the answer can be given.
        await expect(sheet(page)).toBeVisible();
        await sheet(page).getByRole('button', { name: /Autoriser l'assistant/ }).click();
        await expect(section).toContainText('Assistant autorisé', { timeout: 15_000 });
    });

    test('the sheet reads correctly in English and at 390px', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await login(page);
        await setConsent(page, false);

        await page.goto('/en/pages/assistant');
        await expect(page.locator('app-assistant-page')).toBeVisible({ timeout: 20_000 });
        const panel = page.locator('app-ai-consent-panel');
        await expect(panel).toBeVisible({ timeout: 15_000 });
        await expect(panel).toContainText('Assistant on standby');

        await panel.getByRole('button', { name: /Turn the assistant on/ }).click();
        await expect(sheet(page)).toBeVisible();
        await expect(sheet(page)).toContainText('What it reads');
        // The sheet must fit the viewport, not overflow it.
        const box = await sheet(page).boundingBox();
        expect(box!.width).toBeLessThanOrEqual(390);
    });
});
