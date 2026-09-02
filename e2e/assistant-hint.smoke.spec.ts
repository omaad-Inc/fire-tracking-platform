import { expect, Page, test } from '@playwright/test';

/**
 * P0-4 guard: the assistant coach-mark must not follow the user around.
 *
 * The bubble hangs over the page on purpose. Growing the topbar to fit it would
 * shift the whole layout, so an overlay is the only correct shape, and at 390px
 * it lands squarely on the first card's heading. That is a fair price for the
 * couple of seconds it takes to read on the screen it appeared on. It is not a
 * price worth paying on the next three screens, and nothing used to take it
 * down but its own 8s timer.
 *
 * Prereqs (local): ng serve :4200, backend :8000 on omaad_dev, demo user. Each
 * browser context starts with empty storage, so the hint fires every run.
 */

const EMAIL = process.env.E2E_EMAIL || 'demo@omaad.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'OmaadDemo2026!';

const TIP = '.ai-hint-tip';

async function login(page: Page): Promise<void> {
    await page.goto('/fr/auth/login');
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password input').fill(PASSWORD);
    await page.locator('button[type=submit]').first().click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 30_000 });
}

async function landWithHint(page: Page): Promise<void> {
    await page.goto('/fr/');
    await expect(page.locator('.layout-topbar')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(TIP), 'the discovery hint never appeared').toBeVisible({ timeout: 15_000 });
}

test.describe('assistant discovery hint', () => {
    /**
     * One login, several behaviours: `/auth/login` is rate limited to 10/minute
     * and a test-per-behaviour suite throttles itself into failures that look
     * like product bugs (learned in the privacy sweep).
     */
    test('it points at the sparkle, then gets out of the way', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await login(page);
        await landWithHint(page);

        // 1. Anchored to the sparkle, not to a hard-coded offset: the caret sits
        //    under the icon and the bubble stays inside the viewport. The topbar
        //    reflows by tier (the crown pill changes width), so anything
        //    measured from the window edge would drift.
        const geo = await page.evaluate(() => {
            const tip = document.querySelector('.ai-hint-tip')!.getBoundingClientRect();
            const caret = document.querySelector('.ai-hint-tip span')!.getBoundingClientRect();
            const sparkle = document.querySelector('.ai-topbar-btn')!.getBoundingClientRect();
            return {
                w: window.innerWidth,
                tipLeft: tip.left, tipRight: tip.right, tipTop: tip.top,
                caretCx: caret.left + caret.width / 2,
                sparkleLeft: sparkle.left, sparkleRight: sparkle.right, sparkleBottom: sparkle.bottom,
            };
        });
        expect(geo.tipLeft, 'bubble clipped off the left edge').toBeGreaterThanOrEqual(0);
        expect(geo.tipRight, 'bubble clipped off the right edge').toBeLessThanOrEqual(geo.w);
        expect(geo.tipTop, 'bubble must hang below the sparkle').toBeGreaterThanOrEqual(geo.sparkleBottom - 1);
        expect(geo.caretCx, 'caret must point at the sparkle').toBeGreaterThanOrEqual(geo.sparkleLeft);
        expect(geo.caretCx, 'caret must point at the sparkle').toBeLessThanOrEqual(geo.sparkleRight);

        // 2. Navigating takes it down. This is the bug: it used to ride along.
        //    Driven through the bottom nav, which is how a phone user moves.
        const nav = page.locator('.mobile-bottom-nav a.nav-item').nth(1);
        await expect(nav).toBeVisible({ timeout: 10_000 });
        // Re-assert first: the hint also self-retires after 8s, so a slow run
        // could reach the click with the bubble already gone and then "pass"
        // without ever testing the navigation. Fail as inconclusive instead.
        await expect(page.locator(TIP), 'hint self-retired before the nav; test inconclusive')
            .toBeVisible();
        await nav.click();
        await expect(page).not.toHaveURL(/\/fr\/?$/, { timeout: 15_000 });
        await expect(page.locator(TIP), 'the hint followed the user to the next screen').toHaveCount(0);
    });

    test('a click elsewhere dismisses it, and still reaches what was clicked', async ({ page }) => {
        await login(page);
        await landWithHint(page);

        // The bubble covers content, so the user must never have to work around
        // it: the tap they were already making clears it AND lands on target.
        const eye = page.locator('.layout-topbar-action').filter({ has: page.locator('.pi-eye') }).first();
        await eye.click();
        await expect(page.locator(TIP)).toHaveCount(0);
        // The eye actually toggled, i.e. the dismissal did not swallow the click.
        await expect(page.locator('.layout-topbar-action .pi-eye-slash')).toBeVisible({ timeout: 5000 });

        // Retired for good: a reload does not bring it back.
        await page.reload();
        await expect(page.locator('.layout-topbar')).toBeVisible({ timeout: 30_000 });
        await page.waitForTimeout(2500);
        await expect(page.locator(TIP), 'a dismissed hint came back').toHaveCount(0);
    });

    test('clicking the bubble opens the assistant, which is what it invites', async ({ page }) => {
        await login(page);
        await landWithHint(page);

        // Mobile parity: the copy says "configure your wealth by chatting with
        // the assistant", so the bubble is a button to exactly that, not just
        // something to swat away.
        await page.locator(TIP).click();
        await expect(page).toHaveURL(/\/pages\/assistant/, { timeout: 20_000 });
        await expect(page.locator(TIP)).toHaveCount(0);
    });
});
