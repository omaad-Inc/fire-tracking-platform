import { expect, Page, test } from '@playwright/test';

/**
 * Cost-audit guard (2026-08-22): the prompt-cache warm must fire on INTENT,
 * never on page entry.
 *
 * Why this test exists: page-entry warming cost real money for nothing. In
 * production 103 of 147 warms were never followed by a message inside the
 * cache TTL, 71% of the warm spend. A warm buys latency only, never tokens,
 * so a warm nobody uses is pure loss. If someone moves `warmChat()` back into
 * `ngOnInit`, this test fails.
 *
 * Prereqs (local): ng serve :4200 (dev build -> aiChat flag on), backend :8000,
 * seeded demo user.
 */

const EMAIL = process.env.E2E_EMAIL || 'demo@omaad.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'OmaadDemo2026!';
const WARM = /\/api\/v1\/agents\/warm$/;

async function login(page: Page) {
    await page.goto('/fr/auth/login');
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password input').fill(PASSWORD);
    await page.locator('button[type=submit]').first().click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 20_000 });
}

test('assistant: the cache warm waits for intent and fires once per visit', async ({ page }) => {
    const warmCalls: string[] = [];
    page.on('request', (r) => {
        if (r.method() === 'POST' && WARM.test(r.url())) warmCalls.push(r.url());
    });

    await login(page);

    await page.evaluate(() => localStorage.removeItem('omaad_chat_thread_v1'));
    await page.goto('/fr/pages/assistant?scenario=plain');
    await expect(page.locator('app-assistant-page')).toBeVisible({ timeout: 20_000 });

    // Entering the page must NOT warm. Give the app room to settle first, so a
    // late fire-and-forget call from init would still be caught here.
    await page.waitForTimeout(2_500);
    expect(warmCalls, 'page entry must not warm the cache').toHaveLength(0);

    // Focusing the composer is the intent signal: the user opened the keyboard.
    const composer = page.locator('app-chat-input-bar textarea');
    await composer.click();
    await expect.poll(() => warmCalls.length, { timeout: 10_000 })
        .toBeGreaterThan(0);
    expect(warmCalls, 'focus warms exactly once').toHaveLength(1);

    // Blur + refocus, then type: still one warm for the whole visit. The server
    // also refuses a hot-prefix warm, but the client should not ask twice.
    await page.locator('app-assistant-page').click({ position: { x: 5, y: 5 } });
    await composer.click();
    await composer.type('combien');
    await page.waitForTimeout(1_500);
    expect(warmCalls, 'one warm per visit, not per focus or keystroke').toHaveLength(1);
});
