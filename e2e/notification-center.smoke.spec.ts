import { expect, Page, test } from '@playwright/test';

/**
 * P1-1 guard: the notification center, end to end on the real stack.
 *
 * Fails on the pre-fix build: there was no bell, no /pages/notifications route
 * and no kind-to-web-route map, so every assertion below had nothing to hit.
 *
 * The assertion that earns its keep is the deep link. The backend writes
 * `InboxItem.link` from `_FCM_MOBILE_ROUTES`, i.e. FLUTTER paths, so a `budget`
 * entry carries "/transactions" while the web route is "/pages/transaction"
 * (SINGULAR). Navigating `link` verbatim lands on /notfound, and that is a
 * plausible future "simplification" of this page, so the tap is verified to
 * reach a real surface rather than the 404.
 *
 * Prereqs (local): ng serve :4200, backend :8000 on omaad_dev, demo user with
 * at least one inbox entry.
 *
 * Signs in ONCE and sweeps: /auth/login is rate limited 10/minute, and a
 * test-per-behaviour file throttles itself into a 429 that looks like a product
 * bug on whichever screen happens to draw it.
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

test('notification center: bell, list, deep link and mark-all', async ({ page }) => {
    await login(page);

    // ── The bell is in the topbar on desktop AND mobile ────────────────────
    const bell = page.getByTestId('notif-bell');
    await expect(bell).toBeVisible({ timeout: 20_000 });

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(bell).toBeVisible(); // mobile has no sidebar: the bell is the only way in
    await page.setViewportSize({ width: 1440, height: 900 });

    // ── The bell opens the center ──────────────────────────────────────────
    await bell.click();
    await expect(page).toHaveURL(/\/fr\/pages\/notifications/, { timeout: 20_000 });
    await expect(page.getByTestId('notif-center')).toBeVisible();

    const rows = page.getByTestId('notif-row');
    await expect(rows.first()).toBeVisible({ timeout: 20_000 });

    // Day-grouped: every row sits under a day heading.
    await expect(page.locator('section h2').first()).toBeVisible();

    // ── Mark-all clears the badge ─────────────────────────────────────────
    const markAll = page.getByTestId('notif-mark-all');
    if (await markAll.isVisible()) {
        const wrote = page.waitForResponse(
            r => r.url().includes('/notifications/inbox/read') && r.request().method() === 'POST' && r.ok(),
        );
        await markAll.click();
        await wrote;
        // The badge is driven by the shared unread count, so it goes with it.
        await expect(page.getByTestId('notif-badge')).toHaveCount(0);
        await expect(markAll).toHaveCount(0);
    }

    // ── A tap follows the WEB route, not the mobile `link` ────────────────
    // Re-read the list and tap a budget entry if the demo user has one.
    await page.goto('/fr/pages/notifications');
    await expect(page.getByTestId('notif-center')).toBeVisible({ timeout: 20_000 });
    const budgetRow = page.locator('[data-testid="notif-row"][data-kind="budget"]').first();
    if (await budgetRow.count()) {
        await budgetRow.click();
        // "/transactions" (mobile) would 404; the web hub is SINGULAR and the
        // budgets tab is deep-linked via ?view=budgets.
        await expect(page).toHaveURL(/\/fr\/pages\/transaction\?.*view=budgets/, { timeout: 20_000 });
        await expect(page).not.toHaveURL(/notfound/);
    }

    // Every other kind present must also resolve to a real surface.
    await page.goto('/fr/pages/notifications');
    await expect(page.getByTestId('notif-center')).toBeVisible({ timeout: 20_000 });
    const kinds = await page.locator('[data-testid="notif-row"]').evaluateAll(
        els => [...new Set(els.map(e => e.getAttribute('data-kind')))],
    );
    for (const kind of kinds) {
        await page.goto('/fr/pages/notifications');
        await expect(page.getByTestId('notif-center')).toBeVisible({ timeout: 20_000 });
        await page.locator(`[data-testid="notif-row"][data-kind="${kind}"]`).first().click();
        await expect(page, `kind "${kind}" must not deep-link into a 404`)
            .not.toHaveURL(/notfound/, { timeout: 20_000 });
    }
});
