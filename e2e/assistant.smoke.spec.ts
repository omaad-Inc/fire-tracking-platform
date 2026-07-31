import { expect, Page, test } from '@playwright/test';

/**
 * S12 Phase 1 smoke: the mock-driven chat surface. Exercises the flows the
 * owner will demo on device: empty state + starter prompts, streamed answer,
 * write-with-undo card, bulk confirm diff (approve path), quota error upsell.
 *
 * Prereqs (local): ng serve :4200 (dev build -> aiChat flag on), backend :8000,
 * seeded demo user. The mock driver needs NO backend; login does.
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

async function openAssistant(page: Page, scenario?: string) {
    // Fresh thread each test so assertions do not see prior runs.
    await page.evaluate(() => localStorage.removeItem('omaad_chat_thread_v1'));
    await page.goto(`/fr/pages/assistant${scenario ? `?scenario=${scenario}` : ''}`);
    await expect(page.locator('app-assistant-page')).toBeVisible({ timeout: 20_000 });
}

test('assistant: empty state teaches by example and a starter prompt streams an answer', async ({ page }) => {
    await login(page);
    await openAssistant(page, 'plain');

    const empty = page.locator('app-chat-empty-state');
    await expect(empty).toBeVisible();
    const starters = empty.locator('button');
    await expect(starters).toHaveCount(3);

    await starters.nth(1).click();
    // User bubble appears, then the mock streams text into the thread.
    await expect(page.locator('app-chat-thread')).toBeVisible();
    await expect(page.locator('app-chat-thread .chat-md').last()).toContainText('FCFA', { timeout: 15_000 });
});

test('assistant: a write turn renders the tool card and undo flips it to undone', async ({ page }) => {
    await login(page);
    await openAssistant(page, 'write_undo');

    await page.locator('app-chat-input-bar textarea').fill('Ajoute ma maison de Dakar');
    await page.locator('app-chat-input-bar button[aria-label]').last().click();

    const card = page.locator('app-tool-call-card');
    await expect(card).toBeVisible({ timeout: 15_000 });
    // Card resolves to done with the Annuler affordance.
    const undoBtn = card.getByRole('button', { name: 'Annuler' });
    await expect(undoBtn).toBeVisible({ timeout: 15_000 });
    await undoBtn.click();
    await expect(card).toContainText('Annulé', { timeout: 10_000 });
});

test('assistant: bulk write pauses on a dry-run diff and resumes on confirm', async ({ page }) => {
    await login(page);
    await openAssistant(page, 'bulk_confirm');

    await page.locator('app-chat-input-bar textarea').fill('Importe mon relevé Wave');
    await page.locator('app-chat-input-bar button[aria-label]').last().click();

    const card = page.locator('app-tool-call-card');
    await expect(card.getByText('Vérifie avant d\'enregistrer')).toBeVisible({ timeout: 15_000 });
    await expect(card.locator('li')).toHaveCount(3);
    // Composer is locked while the confirm is pending.
    await expect(page.locator('app-chat-input-bar textarea')).toBeDisabled();

    await card.getByRole('button', { name: 'Confirmer' }).click();
    await expect(card).toContainText('3 transactions créées', { timeout: 15_000 });
    await expect(page.locator('app-chat-input-bar textarea')).toBeEnabled({ timeout: 15_000 });
});

test('assistant: quota reached renders the upsell into the plans page', async ({ page }) => {
    await login(page);
    await openAssistant(page, 'quota_reached');

    await page.locator('app-chat-input-bar textarea').fill('Encore une question');
    await page.locator('app-chat-input-bar button[aria-label]').last().click();

    const error = page.locator('app-chat-error-block');
    await expect(error).toBeVisible({ timeout: 15_000 });
    await expect(error.locator('a[href*="plans"]')).toBeVisible();
});

test('assistant: with the flag OFF the route redirects and the teaser panel still works', async ({ page }) => {
    await login(page);
    // Device-level override: this is exactly how prod behaves (flag off by default).
    await page.evaluate(() => localStorage.setItem('omaad_ff_aiChat', '0'));
    await page.goto('/fr/pages/assistant');
    await expect(page).not.toHaveURL(/assistant/, { timeout: 20_000 });
    // The topbar sparkle falls back to the coming-soon panel.
    await page.locator('.ai-topbar-btn').click();
    await expect(page.locator('app-ai-assistant-panel aside')).toBeVisible({ timeout: 10_000 });
    await page.evaluate(() => localStorage.removeItem('omaad_ff_aiChat'));
});

test('assistant: ?ff_aiChat=1 persists the device override (the phone path on prod builds)', async ({ page }) => {
    await login(page);
    // Start from the prod state (off), then flip via URL: the override must
    // persist so plain navigation works afterwards.
    await page.evaluate(() => localStorage.setItem('omaad_ff_aiChat', '0'));
    await page.goto('/fr/pages/assistant?ff_aiChat=1');
    await expect(page.locator('app-assistant-page')).toBeVisible({ timeout: 20_000 });
    await page.goto('/fr/pages/assistant');
    await expect(page.locator('app-assistant-page')).toBeVisible({ timeout: 20_000 });
    const stored = await page.evaluate(() => localStorage.getItem('omaad_ff_aiChat'));
    expect(stored).toBe('1');
});

test.describe('mobile viewport', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('assistant: mobile layout fits the viewport with no dead scroll', async ({ page }) => {
        await login(page);
        await openAssistant(page, 'plain');

        // Composer visible above the bottom nav, no horizontal overflow, and the
        // shell height math leaves the document itself unscrollable.
        await expect(page.locator('app-chat-input-bar textarea')).toBeInViewport();
        await expect(page.locator('.mobile-bottom-nav')).toBeVisible();
        const metrics = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            scrollHeight: document.documentElement.scrollHeight,
            innerHeight: window.innerHeight,
        }));
        expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
        expect(metrics.scrollHeight - metrics.innerHeight).toBeLessThanOrEqual(2);

        // A streamed turn keeps the composer pinned (no layout shift).
        await page.locator('app-chat-input-bar textarea').fill('Comment va mon patrimoine ?');
        const sendBtn = page.locator('app-chat-input-bar button[aria-label]').last();
        const before = await page.locator('app-chat-input-bar').boundingBox();
        await sendBtn.click();
        await expect(page.locator('app-chat-thread .chat-md').last()).toContainText('FCFA', { timeout: 15_000 });
        const after = await page.locator('app-chat-input-bar').boundingBox();
        expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThanOrEqual(2);
    });
});
