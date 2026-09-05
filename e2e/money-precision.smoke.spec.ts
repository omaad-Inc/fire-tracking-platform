import { expect, Page, test } from '@playwright/test';

/**
 * Money precision + the recurring account picker.
 *
 * Two defects this pins, both reported from real use:
 *  1. A 539,69 € rent rendered as "540 €" everywhere, because <app-amount>
 *     hardcoded `maximumFractionDigits: 0` plus a Math.round.
 *  2. The recurring form's account dropdown listed every "liquid" asset
 *     (the goal-allocation rule), including tontines and anything flagged
 *     is_liquid — all of which the backend then rejects with a 422.
 *
 * Prereqs: `ng serve` on :4200, backend on :8000 against the LOCAL omaad_dev,
 * seeded demo user. The spec flips the demo user's display currency and
 * restores it in afterAll.
 */

const LANG = 'fr';
const EMAIL = process.env['E2E_EMAIL'] || 'demo@omaad.dev';
const PASSWORD = process.env['E2E_PASSWORD'] || 'OmaadDemo2026!';
const API = process.env['E2E_API_URL'] || 'http://localhost:8000/api/v1';

/** The amount from the bug report. Its cents are the whole point. */
const RENT = 539.69;
/** A cash account on the demo user; a tontine is NOT a valid transaction account. */
const CASH_ACCOUNT = 96;

async function login(page: Page) {
    await page.goto(`/${LANG}/auth/login`);
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password input').fill(PASSWORD);
    await page.locator('button[type=submit]').first().click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 30_000 });
}

/** A bearer token, minted the way the app does: the refresh cookie. */
async function token(page: Page): Promise<string> {
    const res = await page.request.post(`${API}/auth/refresh`, { data: {} });
    expect(res.ok(), 'needs a live session').toBeTruthy();
    return (await res.json()).access_token as string;
}

async function setCurrency(page: Page, code: string) {
    const t = await token(page);
    const res = await page.request.patch(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${t}` },
        data: { preferred_currency: code },
    });
    expect(res.ok(), `could not switch currency to ${code}`).toBeTruthy();
    // The SPA reads the display currency from the profile it persists under
    // `omaad_user`, so patch that in place too. Removing the key instead would
    // sign the session out, and the API change alone stays invisible.
    await page.evaluate((c) => {
        const raw = localStorage.getItem('omaad_user');
        if (!raw) return;
        localStorage.setItem('omaad_user', JSON.stringify({ ...JSON.parse(raw), preferred_currency: c }));
    }, code);
}

test.afterAll(async ({ browser }) => {
    // Leave the seeded demo user exactly as we found it.
    const page = await browser.newPage();
    try {
        await login(page);
        await setCurrency(page, 'XOF');
    } finally {
        await page.close();
    }
});

test('a EUR amount keeps its cents in the transaction list', async ({ page }) => {
    await login(page);
    await setCurrency(page, 'EUR');

    const t = await token(page);
    const created = await page.request.post(`${API}/transactions`, {
        headers: { Authorization: `Bearer ${t}` },
        data: {
            type: 'expense', category: 'housing', amount: RENT, currency: 'EUR',
            account_id: CASH_ACCOUNT, date: new Date().toISOString().slice(0, 10),
            description: 'E2E loyer precision',
        },
    });
    expect(created.ok(), 'could not create the test transaction').toBeTruthy();

    await page.goto(`/${LANG}/pages/transaction`);
    await page.waitForLoadState('networkidle');

    // The row must carry the real amount, never the rounded one. Assert on the
    // rendered figure rather than the description: the amount IS the defect.
    await expect(page.locator('app-amount').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('539,69', { exact: false }).first())
        .toBeVisible({ timeout: 20_000 });

    const body = await page.locator('body').innerText();
    expect(body, 'the rounded amount must appear nowhere').not.toMatch(/\b540\s*€/);

    await page.screenshot({ path: 'e2e-out/money-precision-eur.png', fullPage: true });

    // Clean up the row we added.
    const id = (await created.json()).id;
    await page.request.delete(`${API}/transactions/${id}`, {
        headers: { Authorization: `Bearer ${await token(page)}` },
    });
});

test('FCFA never grows a centime', async ({ page }) => {
    await login(page);
    await setCurrency(page, 'XOF');

    await page.goto(`/${LANG}/pages/patrimoine`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('app-amount').first()).toBeVisible({ timeout: 20_000 });

    // Every FCFA amount on the page is a whole franc: no "123,45 FCFA" anywhere.
    const amounts = await page.locator('app-amount').allInnerTexts();
    expect(amounts.length).toBeGreaterThan(0);
    for (const a of amounts) {
        expect(a, `"${a}" grew a centime on a currency with no minor unit`).not.toMatch(/\d,\d/);
    }
});

test('the recurring account picker offers monetary accounts only', async ({ page }) => {
    await login(page);
    await page.goto(`/${LANG}/pages/transaction?view=recurring`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid=recurring-add]')).toBeVisible({ timeout: 20_000 });

    await page.locator('[data-testid=recurring-add]').click();
    await page.waitForTimeout(800);

    // Open the ACCOUNT dropdown by its testid. Indexing p-select by position is
    // how an earlier version of this test silently read the FREQUENCY list and
    // passed for the wrong reason.
    await page.locator('[data-testid=recurring-account]').click();
    await page.waitForTimeout(500);

    const options = await page.locator('li[role=option]').allInnerTexts();
    const joined = options.join(' | ');
    console.log('  account options:', joined);

    // The demo user's monetary accounts, and nothing else.
    expect(options.length, 'the picker rendered no options at all').toBeGreaterThan(0);
    expect(joined).toMatch(/Compte courant CBAO/);
    // A tontine is liquid for GOAL ALLOCATION but is not a transaction account:
    // offering it produced a 422 on save.
    expect(joined, 'a tontine is not a monetary account').not.toMatch(/tontine/i);
    // Nor is anything merely flagged is_liquid.
    expect(joined).not.toMatch(/action|immobil|SICAV|FCP/i);
    await page.screenshot({ path: 'e2e-out/recurring-account-picker.png', fullPage: true });
});

test('the edit form prefills the real amount, so saving cannot round it', async ({ page }) => {
    await login(page);
    await setCurrency(page, 'EUR');

    const t = await token(page);
    const created = await page.request.post(`${API}/transactions`, {
        headers: { Authorization: `Bearer ${t}` },
        data: {
            type: 'expense', category: 'housing', amount: RENT, currency: 'EUR',
            account_id: CASH_ACCOUNT, date: new Date().toISOString().slice(0, 10),
            description: 'E2E edit precision',
        },
    });
    expect(created.ok(), 'could not create the test transaction').toBeTruthy();
    const id = (await created.json()).id;

    try {
        await page.goto(`/${LANG}/pages/transaction`);
        await page.waitForLoadState('networkidle');

        const row = page.locator('[data-testid=tx-card]', { hasText: 'E2E edit precision' }).first();
        await expect(row).toBeVisible({ timeout: 20_000 });
        await row.locator('button').first().click();       // the pencil
        await page.waitForTimeout(800);

        // The field used to cap at 0 decimals: it showed 540 and SAVED 540,
        // silently rewriting the amount the user had entered.
        const amount = page.locator('#tx-amount');
        await expect(amount).toBeVisible({ timeout: 10_000 });
        // Separator-agnostic: p-inputnumber renders "539,69" or "539.69"
        // depending on focus. What matters is that the CENTS survived — the
        // field used to cap at 0 decimals and prefill a bare "540".
        const shown = (await amount.inputValue()).replace(/\s/g, '').replace(',', '.');
        expect(Number(shown)).toBeCloseTo(RENT, 2);
    } finally {
        await page.request.delete(`${API}/transactions/${id}`, {
            headers: { Authorization: `Bearer ${await token(page)}` },
        });
    }
});
