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
 *    shape of change that can invert a condition.
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
 * RUNNING THIS: /auth/login is rate limited 10/minute. These specs log in per
 * test (and the voices spec also logs in once via the API to seed), so running
 * both P1-5 guard files back-to-back trips the limit and every test then fails
 * on a screen that is actually the login page. That looks exactly like a real
 * regression and is not one. Run one file at a time, or space them ~2 minutes.
 *
 * Prereqs (local): ng serve :4200, backend :8000 on omaad_dev, demo user.
 * This spec seeds and removes its OWN fixtures (a throwaway transaction and a
 * throwaway custom category), so it never consumes demo data.
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

const API = process.env.E2E_API_URL || 'http://127.0.0.1:8000/api/v1';

/**
 * Seed a throwaway transaction through the API rather than the add dialog:
 * deterministic, and independent of that dialog's markup. Income/expense rows
 * require an account_id (the ledger invariant), so pick a real cash account.
 */
let cachedToken: string | null = null;

/**
 * ONE API token for the whole file. Every helper used to log in for itself,
 * which meant three or four logins per test on top of the UI login: past
 * /auth/login's 10/minute limit, so the teardown's login got a 429 and its
 * cleanup silently did nothing, leaving a category behind on every run.
 */
async function apiHeaders(page: Page): Promise<Record<string, string>> {
    if (!cachedToken) {
        const auth = await page.context().request.post(`${API}/auth/login`, {
            form: { username: EMAIL, password: PASSWORD },
        });
        expect(auth.ok(), `API login failed (${auth.status()})`).toBeTruthy();
        cachedToken = (await auth.json()).access_token as string;
    }
    return { Authorization: `Bearer ${cachedToken}` };
}

async function seedTransaction(page: Page, description: string): Promise<void> {
    const ctx = page.context().request;
    const headers = await apiHeaders(page);

    const assets = await ctx.get(`${API}/assets`, { headers });
    const cash = (await assets.json()).find((a: { category: string }) => a.category === 'cash');
    expect(cash, 'no cash account to attach the seeded transaction to').toBeTruthy();

    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const created = await ctx.post(`${API}/transactions`, {
        headers,
        data: {
            date: iso, amount: 100, type: 'expense', category: 'shopping',
            description, currency: 'XOF', account_id: cash.id,
        },
    });
    expect(created.ok(), `seeding failed: ${created.status()}`).toBeTruthy();
}

/** Deterministic teardown for anything the category probe created. */
async function deleteCustomCategoriesByPrefix(page: Page, prefix: string): Promise<void> {
    const ctx = page.context().request;
    const headers = await apiHeaders(page);
    const list = await ctx.get(`${API}/categories/custom`, { headers });
    expect(list.ok(), `could not list custom categories (${list.status()})`).toBeTruthy();
    for (const c of (await list.json()) as { id: number; label: string }[]) {
        if (c.label.startsWith(prefix)) {
            const del = await ctx.delete(`${API}/categories/custom/${c.id}`, { headers });
            // Assert, do not swallow: a teardown that fails quietly is how the
            // demo account accumulated leftovers in the first place.
            expect(del.ok(), `teardown failed for category ${c.id} (${del.status()})`).toBeTruthy();
        }
    }
}

test('feedback: confirm gates the mutation, success and failure are different surfaces', async ({ page }) => {
    await login(page);
    const user = await page.evaluate(() => localStorage.getItem('omaad_user'));
    expect(user, 'login did not persist a profile, cannot sweep').toBeTruthy();
    await page.addInitScript(([u]) => {
        if (u) localStorage.setItem('omaad_user', u as string);
    }, [user] as [string | null]);

    await page.setViewportSize({ width: 1400, height: 950 });

    // Seed a throwaway row and act on THAT. An earlier version of this guard
    // deleted whichever transaction happened to be first, which quietly ate two
    // real demo rows (the recurring rent and salary) and then failed with "no
    // rows" once the month was empty. A guard must not consume the fixture it
    // depends on.
    await page.goto('/fr/pages/transaction');
    await expect(page.getByTestId('tx-month-nav')).toBeVisible({ timeout: 30_000 });
    const seeded = 'ZZ voices seed ' + Date.now();
    await seedTransaction(page, seeded);

    await page.goto('/fr/pages/transaction?q=' + encodeURIComponent('ZZ voices seed'));
    const rows = page.getByTestId('tx-card');
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });
    const before = await rows.count();
    expect(before, 'seeding a throwaway transaction failed').toBeGreaterThan(0);

    // ── 1. Confirm is the ONE decision surface ────────────────────────────
    await page.locator('[data-testid="tx-card"] button:has(i.pi-trash)').first().click();
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
    await page.locator('[data-testid="tx-card"] button:has(i.pi-trash)').first().click();
    await expect(sheet).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await page.waitForTimeout(800);
    expect(await rows.count(), 'escape deleted a row').toBe(before);

    // The mask must be released, or the app is unusable after every confirm.
    await expect(page.locator('.p-overlay-mask')).toHaveCount(0, { timeout: 5000 });
    await expect(page.getByTestId('tx-month-nav')).toBeVisible();

    // ── 3. Success is its own surface, and it leaves on its own ───────────
    await page.locator('[data-testid="tx-card"] button:has(i.pi-trash)').first().click();
    await expect(sheet).toBeVisible();
    await page.getByTestId('confirm-accept').click();
    const success = page.getByTestId('success-sheet');
    await expect(success).toBeVisible({ timeout: 10_000 });
    // Structurally NOT the failure surface.
    await expect(page.getByTestId('error-snack')).toHaveCount(0);
    await expect(success).toHaveCount(0, { timeout: 8000 });   // auto-dismiss
    await expect(rows).toHaveCount(before - 1);
});

test('feedback: a migrated success and a migrated failure use the two different surfaces', async ({ page }) => {
    // Drives a call site that was on `MessageService.add({ severity })` before
    // the sweep, to prove the migration actually reaches the new surfaces
    // rather than just compiling. Custom categories is a good probe: create is
    // a success path and the create call can be failed on demand for the error
    // path, both from the same screen and both cheap to undo.
    await login(page);
    const user = await page.evaluate(() => localStorage.getItem('omaad_user'));
    await page.addInitScript(([u]) => {
        if (u) localStorage.setItem('omaad_user', u as string);
    }, [user] as [string | null]);
    await page.setViewportSize({ width: 1280, height: 950 });

    await page.goto('/fr/pages/settings/categories');
    await expect(page.locator('#cat-name')).toBeVisible({ timeout: 30_000 });

    // The page dropped its own <p-toast>: success and failure are the shell's
    // job now, so a per-page toast host would mean the sweep missed a file.
    await expect(page.locator('p-toast')).toHaveCount(0);

    const save = page.locator('button[type=submit], button:has-text("Ajouter")').last();
    const label = 'ZZ voices ' + Date.now();

    // ── success -> the sheet, and NOT the snackbar ────────────────────────
    await page.locator('#cat-name').fill(label);
    const created = page.waitForResponse(
        r => r.url().includes('/categories/custom') && r.request().method() === 'POST',
    );
    await save.click();
    await created;
    await expect(page.getByTestId('success-sheet')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('error-snack')).toHaveCount(0);
    await expect(page.getByTestId('success-sheet')).toHaveCount(0, { timeout: 8000 });

    // Undo through the API, not the UI. A UI cleanup here was selector-fragile
    // and silently left a category behind on every run, so they accumulated on
    // the demo account. Create through the UI (that is what exercises the
    // success voice), delete deterministically.
    await deleteCustomCategoriesByPrefix(page, 'ZZ voices');

    // ── failure -> the snackbar, and NOT the sheet ───────────────────────
    await page.route('**/categories/custom', r =>
        r.request().method() === 'POST' ? r.abort('failed') : r.continue());
    await page.locator('#cat-name').fill(label + ' b');
    await save.click();
    await expect(page.getByTestId('error-snack')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('success-sheet')).toHaveCount(0);
    await page.unroute('**/categories/custom');
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
    // Every route that had a confirm. Account and Abonnement joined the list
    // when their two confirms migrated, which completes the sweep: there is now
    // no p-confirmDialog anywhere in the app, and this list is what keeps it
    // that way.
    const routes = [
        '/fr',
        '/fr/pages/transaction',
        '/fr/pages/debts',
        '/fr/pages/goals',
        '/fr/pages/settings/account',
        '/fr/pages/settings/alerts',
        '/fr/pages/settings/categories',
        '/fr/pages/settings/connections',
        '/fr/pages/settings/subscription',
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
