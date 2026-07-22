import { APIRequestContext, expect, Page, test } from '@playwright/test';

/**
 * Data-ingestion smoke (Sprint 3-11): proves the three code-path ingestion
 * flows work end to end against the local backend + seeded demo user:
 *   1. CSV import round trip (upload -> map -> parse -> review -> commit)
 *   2. Recurring add -> run -> materialize
 *   3. Broker-PDF holdings import round trip (upload -> parse -> review -> commit)
 *
 * Anchored on data-testid attributes so markup changes don't break it. Each
 * test cleans up what it created (via the API, authed with the refresh cookie)
 * so the demo data is left untouched. Best-effort cleanup never fails a test.
 *
 * Prereqs (local): `ng serve` on :4200, the S3 backend on :8000 (the /imports
 * and /recurring routes must exist), and the seeded demo user.
 */

const LANG = 'fr';
const EMAIL = process.env.E2E_EMAIL || 'demo@omaad.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'OmaadDemo2026!';
const API = process.env.E2E_API_URL || 'http://localhost:8000/api/v1';

// Markers so cleanup can find exactly what a run created.
const CSV_INCOME = 'Salaire E2E';
const CSV_EXPENSE = 'Courses E2E';
const RULE_AMOUNT = 13579;
const HOLDING_INSTITUTION = 'SGI Demo E2E';
const HOLDING_NAMES = ['SONATEL', 'BOA SENEGAL', 'TOTAL ENERGIES CI'];

async function login(page: Page) {
    await page.goto(`/${LANG}/auth/login`);
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password input').fill(PASSWORD);
    await page.locator('button[type=submit]').first().click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 20_000 });
}

/** Access token from the refresh cookie set at login (for API-side cleanup). */
async function accessToken(page: Page): Promise<string | null> {
    try {
        const r = await page.request.post(`${API}/auth/refresh`);
        if (!r.ok()) return null;
        return (await r.json()).access_token ?? null;
    } catch {
        return null;
    }
}

async function apiGet(req: APIRequestContext, path: string, token: string) {
    const r = await req.get(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    return r.ok() ? r.json() : [];
}
async function apiDelete(req: APIRequestContext, path: string, token: string) {
    try { await req.delete(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } }); } catch { /* best effort */ }
}

/** Open a PrimeNG p-select (by testid) and pick its first option. */
async function pickFirstOption(page: Page, testid: string) {
    await page.getByTestId(testid).click();
    await page.locator('.p-select-option, li[role=option]').first().click();
}

function successToast(page: Page) {
    return page.locator('.p-toast-message-success, .p-toast-message-info').first();
}

// ── 1. CSV import round trip ─────────────────────────────────────────────────
test('CSV import: upload -> map -> parse -> review -> commit', async ({ page }) => {
    await login(page);
    await page.goto(`/${LANG}/pages/transaction`);

    await page.getByTestId('csv-import-open').click();
    await expect(page.getByTestId('csv-import-account')).toBeVisible();

    // Pick the target monetary account (seeded demo has liquid accounts).
    await pickFirstOption(page, 'csv-import-account');

    const csv = [
        'Date,Libelle,Montant,Devise',
        `2023-01-05,${CSV_INCOME},500000,XOF`,
        `2023-01-06,${CSV_EXPENSE},-25000,XOF`,
    ].join('\n');
    await page.getByTestId('csv-import-file').setInputFiles({
        name: 'statement-e2e.csv', mimeType: 'text/csv', buffer: Buffer.from(csv, 'utf-8'),
    });

    // Columns preview loaded -> Next enables (account + file + headers all set).
    const next = page.getByTestId('csv-import-next');
    await expect(next).toBeEnabled({ timeout: 15_000 });
    await next.click();

    // Mapping auto-guessed from the FR headers; Preview -> review.
    const parse = page.getByTestId('csv-import-parse');
    await expect(parse).toBeEnabled();
    await parse.click();

    // Two rows parsed (one income, one expense).
    await expect(page.getByTestId('csv-import-review-row')).toHaveCount(2, { timeout: 15_000 });

    await page.getByTestId('csv-import-commit').click();
    await expect(successToast(page)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('csv-import-commit')).toBeHidden();

    // Cleanup: remove the two imported transactions so demo data stays pristine.
    const token = await accessToken(page);
    if (token) {
        const txns: any[] = await apiGet(page.request, '/transactions?limit=500', token);
        for (const t of txns.filter(t => [CSV_INCOME, CSV_EXPENSE].includes(t.description))) {
            await apiDelete(page.request, `/transactions/${t.id}`, token);
        }
    }
});

// ── 1b. CSV import via drag-and-drop onto the dropzone ───────────────────────
test('CSV import: drag-and-drop a file onto the dropzone', async ({ page }) => {
    await login(page);
    await page.goto(`/${LANG}/pages/transaction`);

    await page.getByTestId('csv-import-open').click();
    await expect(page.getByTestId('csv-import-account')).toBeVisible();

    // Simulate a real browser file drop (OS drag can't be automated; a
    // DataTransfer carrying a File is the documented Playwright equivalent).
    const csv = 'Date,Libelle,Montant,Devise\n2023-02-01,Drop test,1000,XOF';
    const dropzone = page.locator('label').filter({ has: page.getByTestId('csv-import-file') });
    const dt = await page.evaluateHandle((content) => {
        const d = new DataTransfer();
        d.items.add(new File([content], 'dropped.csv', { type: 'text/csv' }));
        return d;
    }, csv);
    await dropzone.dispatchEvent('dragover', { dataTransfer: dt });
    await dropzone.dispatchEvent('drop', { dataTransfer: dt });

    // The drop was handled (not swallowed by a browser navigation): the filename
    // shows and preview-columns loaded, so Next enables.
    await expect(page.getByText('dropped.csv')).toBeVisible();
    await expect(page.getByTestId('csv-import-next')).toBeEnabled({ timeout: 15_000 });
});

// ── 2. Recurring add -> run -> materialize ───────────────────────────────────
test('Recurring: add a rule -> run -> materializes', async ({ page }) => {
    await login(page);
    await page.goto(`/${LANG}/pages/transaction?view=recurring`);

    // Add a rule (defaults: expense/housing, first account auto-selected).
    await page.getByTestId('recurring-add').click();
    await page.getByTestId('recurring-amount').locator('input').fill(String(RULE_AMOUNT));
    await page.getByTestId('recurring-save').click();
    await expect(successToast(page)).toBeVisible({ timeout: 15_000 });

    // Run now materializes any due transactions (idempotent) with a toast.
    await page.getByTestId('recurring-run').click();
    await expect(successToast(page)).toBeVisible({ timeout: 15_000 });

    // Cleanup: delete the rule we created (matched by its distinctive amount).
    const token = await accessToken(page);
    if (token) {
        const rules: any[] = await apiGet(page.request, '/recurring', token);
        for (const r of rules.filter(r => Math.round(r.amount) === RULE_AMOUNT)) {
            await apiDelete(page.request, `/recurring/${r.id}`, token);
        }
    }
});

// ── 3. Broker-PDF holdings import round trip ─────────────────────────────────
test('Holdings import: upload PDF -> parse -> review -> commit', async ({ page }) => {
    await login(page);
    await page.goto(`/${LANG}/pages/patrimoine/connect-broker?market=brvm`);

    await page.getByTestId('holdings-import-open').click();
    await expect(page.getByTestId('holdings-import-institution')).toBeVisible();

    // Tag the institution so cleanup can find exactly these assets.
    await page.getByTestId('holdings-import-institution').fill(HOLDING_INSTITUTION);
    await page.getByTestId('holdings-import-file').setInputFiles('e2e/fixtures/brvm-statement.pdf');

    await page.getByTestId('holdings-import-parse').click();

    // The fixture yields three parseable holdings.
    await expect(page.getByTestId('holdings-import-review-row')).toHaveCount(3, { timeout: 15_000 });

    await page.getByTestId('holdings-import-commit').click();
    // Success outcome = we navigate back to Patrimoine, where the new holdings
    // show. The dialog's own success toast is intentionally NOT asserted: the
    // navigation unmounts the dialog (and its <p-toast>) immediately, so the
    // destination page — plus the assets themselves — is the confirmation.
    await expect(page).toHaveURL(/\/pages\/patrimoine(\?|$)/, { timeout: 15_000 });

    // Verify the assets were really created, then clean them up.
    const token = await accessToken(page);
    if (token) {
        const assets: any[] = await apiGet(page.request, '/assets?limit=500', token);
        const created = assets.filter(a => a.institution === HOLDING_INSTITUTION && HOLDING_NAMES.includes(a.name));
        expect(created.length).toBeGreaterThan(0);
        for (const a of created) await apiDelete(page.request, `/assets/${a.id}`, token);
    }
});
