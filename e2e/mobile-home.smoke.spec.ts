import { expect, Page, test } from '@playwright/test';

/**
 * Mobile home parity smoke (S5-4). Most Omaad users are on phones, so the
 * redesigned home must render cleanly at a small-Android width with NO
 * horizontal overflow, and the bottom bar must be the five hubs with no
 * "Plus" overflow. Anchored on structural selectors so it survives restyles.
 *
 * Prereqs (local): `ng serve` on :4200, the backend on :8000, seeded demo user.
 */

const EMAIL = process.env.E2E_EMAIL || 'demo@omaad.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'OmaadDemo2026!';

// Small-Android viewport (the tightest common case).
test.use({ viewport: { width: 360, height: 780 } });

async function login(page: Page) {
    await page.goto('/fr/auth/login');
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password input').fill(PASSWORD);
    await page.locator('button[type=submit]').first().click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 20_000 });
}

test('mobile home: renders, no horizontal overflow, five-hub bottom bar', async ({ page }) => {
    await login(page);
    await page.goto('/fr');

    // The redesigned hero is the above-the-fold answer; it must render.
    await expect(page.locator('app-home-hero')).toBeVisible({ timeout: 20_000 });

    // No horizontal overflow at 360px (the #1 mobile-parity regression).
    const overflow = await page.evaluate(() => {
        const de = document.scrollingElement || document.documentElement;
        return de.scrollWidth - de.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(1);

    // Bottom bar = exactly five hub destinations, and NO "Plus" overflow button.
    await expect(page.locator('nav.mobile-bottom-nav a.nav-item')).toHaveCount(5);
    await expect(page.locator('nav.mobile-bottom-nav button.nav-item')).toHaveCount(0);
});
