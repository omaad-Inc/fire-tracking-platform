import { expect, Page, test } from '@playwright/test';

/**
 * The bug this feature exists for, driven end to end as a user.
 *
 * "Épargne" assets showed a chart that never moved: it was a pseudo-random walk
 * seeded from current_value, not a real series. This adds a salary to the Livret
 * A account and asserts the drawn chart AND the monthly variation both react —
 * then removes the salary so the demo data is left exactly as it was found.
 *
 * Prereqs: `ng serve` on :4200, backend on :8000 against the LOCAL omaad_dev,
 * seeded demo user. Asset 4 = "Livret A" (savings_account, EUR).
 */

const LANG = 'fr';
const EMAIL = process.env['E2E_EMAIL'] || 'demo@omaad.dev';
const PASSWORD = process.env['E2E_PASSWORD'] || 'OmaadDemo2026!';
const API = process.env['E2E_API_URL'] || 'http://localhost:8000/api/v1';
const ASSET_ID = 4;
const SALARY = 850;

async function login(page: Page) {
    await page.goto(`/${LANG}/auth/login`);
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password input').fill(PASSWORD);
    await page.locator('button[type=submit]').first().click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 30_000 });
}

/** The hero sparkline's polyline: literally what the user sees drawn. */
async function chartPoints(page: Page): Promise<string> {
    return (await page.locator('svg polyline').first().getAttribute('points')) ?? '';
}

/** The current month's row in the variation panel, as displayed. */
async function currentMonthRow(page: Page): Promise<string> {
    return (await page.locator('.detail-surface', { hasText: 'Variation par mois' })
        .locator('div.flex.items-center.justify-between').nth(1).innerText()).replace(/\s+/g, ' ');
}

test('adding a salary moves the Epargne chart', async ({ page, request }) => {
    // A real API session for the write; the browser stays a pure observer.
    const auth = await request.post(`${API}/auth/login`, {
        form: { username: EMAIL, password: PASSWORD },
    });
    expect(auth.ok(), `login failed: ${auth.status()}`).toBeTruthy();
    const token = (await auth.json()).access_token as string;
    const headers = { Authorization: `Bearer ${token}` };

    await login(page);
    await page.goto(`/${LANG}/pages/patrimoine/assets/${ASSET_ID}`);
    await expect(page.getByText('Variation par mois')).toBeVisible({ timeout: 20_000 });

    const before = await chartPoints(page);
    const beforeRow = await currentMonthRow(page);
    expect(before.length, 'the chart must draw a real series to begin with').toBeGreaterThan(0);
    await page.screenshot({ path: 'e2e-out/epargne-1-before.png', fullPage: true });

    const created = await request.post(`${API}/transactions`, {
        headers,
        data: {
            type: 'income', category: 'salary', amount: SALARY, currency: 'EUR',
            date: new Date().toISOString().slice(0, 10),
            description: 'E2E salary probe', account_id: ASSET_ID,
        },
    });
    expect(created.status(), await created.text()).toBe(201);
    const txId = (await created.json()).id as number;

    try {
        await page.reload();
        await expect(page.getByText('Variation par mois')).toBeVisible({ timeout: 20_000 });
        const after = await chartPoints(page);
        const afterRow = await currentMonthRow(page);
        await page.screenshot({ path: 'e2e-out/epargne-2-after.png', fullPage: true });

        console.log('chart before:', before);
        console.log('chart after :', after);
        console.log('month row before:', beforeRow);
        console.log('month row after :', afterRow);

        // The whole point: the drawn series and the month's figure both move,
        // because they now describe the ledger instead of decorating it.
        expect(after, 'the chart must redraw after a salary').not.toBe(before);
        expect(afterRow, "the month's variation must change too").not.toBe(beforeRow);
    } finally {
        await request.delete(`${API}/transactions/${txId}`, { headers });
    }
});
