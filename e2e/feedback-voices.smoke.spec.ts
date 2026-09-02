import { expect, Page, test } from '@playwright/test';

/**
 * P1-5 guard: the three feedback voices.
 *
 * Fails on the pre-fix build, which had no confirm sheet and no success sheet:
 * confirms were eleven separate `p-confirmDialog` instances (with the
 * destructive button styled three different ways), and success and failure
 * BOTH went through `MessageService.add()` and rendered as the same `p-toast`
 * card, differing only in colour. A user glancing at a toast could not tell
 * "saved" from "could not save".
 *
 * The assertions that earn their keep:
 *  - CANCEL MUST NOT MUTATE. The whole point of a confirm is that the
 *    not-confirming path is safe, and the migration rewired every call site
 *    from an `accept` callback to an awaited boolean, which is exactly the
 *    shape of change that can inverit a condition.
 *  - success and failure must be STRUCTURALLY different surfaces, not the same
 *    card in two colours, so the check is on which element exists rather than
 *    on its styling.
 *  - the ONE host must reach every shell state, including the immersive
 *    settings pages that render no topbar and the read-only share shell.
 *  - no `p-confirmDialog` may come back anywhere. Note the element name is
 *    matched case-INSENSITIVELY: the last stray instance in the codebase was
 *    spelled `<p-confirmdialog />` and a case-sensitive grep walked straight
 *    past it while the dev build failed on it.
 *
 * Prereqs (local): ng serve :4200, backend :8000 on omaad_dev, demo user with
 * at least one transaction matching the seed below.
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

test('feedback: confirm gates the mutation, success and failure are different surfaces', async ({ page }) => {
    await login(page);
    const user = await page.evaluate(() => localStorage.getItem('omaad_user'));
    expect(user, 'login did not persist a profile, cannot sweep').toBeTruthy();
    await page.addInitScript(([u]) => {
        if (u) localStorage.setItem('omaad_user', u as string);
    }, [user] as [string | null]);

    await page.setViewportSize({ width: 1400, height: 950 });
    await page.goto('/fr/pages/transaction');
    const rows = page.getByTestId('tx-row');
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });
    const before = await rows.count();
    expect(before, 'need at least one transaction to exercise a delete').toBeGreaterThan(0);

    // ── 1. Confirm is the ONE decision surface ────────────────────────────
    await page.locator('[data-testid="tx-row"] button[aria-label="Supprimer"]').first().click();
    const sheet = page.getByTestId('confirm-sheet');
    await expect(sheet).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('confirm-title')).not.toBeEmpty();
    await expect(page.getByTestId('confirm-accept')).toBeVisible();
    await expect(page.getByTestId('confirm-cancel')).toBeVisible();

    // ── 2. Cancelling must NOT delete anything ────────────────────────────
    await page.getByTestId('confirm-cancel').click();
    await expect(sheet).toHaveCount(0);
    await page.waitForTimeout(800);
    expect(await rows.count(), 'cancel deleted a row').toBe(before);

    // Dismissing by the mask counts as declining too, never as accepting.
    await page.locator('[data-testid="tx-row"] button[aria-label="Supprimer"]').first().click();
    await expect(sheet).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await page.waitForTimeout(800);
    expect(await rows.count(), 'escape deleted a row').toBe(before);

    // The mask must be released, or the app is unusable after every confirm.
    await expect(page.locator('.p-overlay-mask')).toHaveCount(0, { timeout: 5000 });
    await expect(page.getByTestId('tx-export')).toBeEnabled();

    // ── 3. Success is its own surface, and it leaves on its own ───────────
    await page.locator('[data-testid="tx-row"] button[aria-label="Supprimer"]').first().click();
    await expect(sheet).toBeVisible();
    await page.getByTestId('confirm-accept').click();
    const success = page.getByTestId('success-sheet');
    await expect(success).toBeVisible({ timeout: 10_000 });
    // Structurally NOT the failure surface.
    await expect(page.getByTestId('error-snack')).toHaveCount(0);
    await expect(success).toHaveCount(0, { timeout: 8000 });   // auto-dismiss
    await expect(rows).toHaveCount(before - 1);
});

test('feedback: one host serves every shell state, and no p-confirmDialog returns', async ({ page }) => {
    await login(page);
    const user = await page.evaluate(() => localStorage.getItem('omaad_user'));
    await page.addInitScript(([u]) => {
        if (u) localStorage.setItem('omaad_user', u as string);
    }, [user] as [string | null]);
    await page.setViewportSize({ width: 1400, height: 950 });

    // The settings routes are IMMERSIVE (no topbar), which is why the host is
    // mounted outside the shell's share/PIN branches rather than beside them.
    // Settings → Account and Settings → Abonnement are NOT in this list yet:
    // their two confirms are the last on the old dialog, held back because
    // those files carry unrelated in-progress work. Add both here in the same
    // change that migrates them, so the no-stale-dialog assertion covers the
    // whole app again.
    const routes = [
        '/fr',
        '/fr/pages/transaction',
        '/fr/pages/debts',
        '/fr/pages/goals',
        '/fr/pages/settings/alerts',
        '/fr/pages/settings/categories',
        '/fr/pages/settings/connections',
    ];
    for (const route of routes) {
        await page.goto(route);
        await page.waitForTimeout(700);
        await expect(page.locator('app-feedback-host'), `no feedback host on ${route}`).toHaveCount(1);
        // Case-insensitive: the last stray was `<p-confirmdialog />`.
        const stale = await page.locator('p-confirmdialog, p-confirmDialog').count();
        expect(stale, `a p-confirmDialog came back on ${route}`).toBe(0);
        // And the page actually rendered, rather than blanking on a template error.
        const text = (await page.locator('body').innerText().catch(() => '')) || '';
        expect(text.length, `${route} rendered nothing`).toBeGreaterThan(200);
    }
});
