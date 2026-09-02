import { expect, Page, test } from '@playwright/test';

/**
 * P1-2 guard: the desktop transactions table, on the real stack.
 *
 * Fails on the pre-fix build, which had no table at any width (the page was
 * month-at-a-time cards with one search box and four type chips).
 *
 * The assertions that earn their keep:
 *  - the ≥lg/<lg switch is a real swap, not `hidden lg:block`: exactly one of
 *    table / card list exists at a time, so a phone never builds 90 table rows;
 *  - the KPI row follows the ACTIVE period, because a custom range showing a
 *    month's totals is a wrong number, not a layout nit;
 *  - a range URL is ignored on a phone, where there is no pill to clear it and
 *    the month navigator is dimmed (that combination left a shared desktop
 *    filter URL with no period control at all);
 *  - the CSV carries machine-readable negatives. The injection guard used to
 *    prefix them (`'-20000.00`), which imports as text and makes every expense
 *    unsummable, i.e. it broke the point of the export.
 *
 * Prereqs (local): ng serve :4200, backend :8000 on omaad_dev, demo user with
 * August 2026 transactions.
 *
 * Signs in ONCE and sweeps: /auth/login is rate limited 10/minute, and a
 * test-per-behaviour file throttles itself into a 429 that reads as a product
 * bug on whichever screen draws it.
 */

const EMAIL = process.env.E2E_EMAIL || 'demo@omaad.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'OmaadDemo2026!';
const RANGE = '?from=2026-08-01&to=2026-08-31';

async function login(page: Page) {
    await page.goto('/fr/auth/login');
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password input').fill(PASSWORD);
    await page.locator('button[type=submit]').first().click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 20_000 });
}

test('transactions table: layout switch, filters, sort, bulk selection, export', async ({ page }) => {
    await login(page);
    // The access token is in-memory, so each cold load re-runs /auth/refresh;
    // pinning the profile keeps a multi-load sweep off the rotation race.
    const user = await page.evaluate(() => localStorage.getItem('omaad_user'));
    expect(user, 'login did not persist a profile, cannot sweep').toBeTruthy();
    await page.addInitScript(([u]) => {
        if (u) localStorage.setItem('omaad_user', u as string);
    }, [user] as [string | null]);

    // ── Desktop: the table, not the cards ─────────────────────────────────
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/fr/pages/transaction' + RANGE);
    await expect(page.getByTestId('tx-filter-bar')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('tx-table')).toHaveCount(1);
    await expect(page.getByTestId('tx-range-pill')).toBeVisible();
    const rows = page.getByTestId('tx-row');
    await expect(rows.first()).toBeVisible();
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(1);

    // The month navigator must not read as live while a range overrides it.
    await expect(page.getByTestId('tx-month-nav')).toHaveClass(/opacity-40/);

    // Category labels must resolve. The API returns mixed casing (enum VALUE
    // for some rows, its NAME for others) and every dictionary is lowercase,
    // so uppercase rows used to render as their own raw key.
    const cats = await page.locator('[data-testid="tx-row"] td:nth-child(4)').allTextContents();
    const rawKeys = cats.map(c => c.trim()).filter(c => /^[A-Z][A-Z_]+$/.test(c));
    expect(rawKeys, 'category column is showing unresolved raw keys').toEqual([]);

    // ── KPIs follow the active period, not the month ─────────────────────
    const kpiRow = page.locator('.grid.grid-cols-2').first();
    const rangeKpis = (await kpiRow.textContent()) || '';
    await page.getByTestId('tx-range-clear').click();
    await expect(page.getByTestId('tx-range-pill')).toHaveCount(0);
    await expect(page.getByTestId('tx-month-nav')).not.toHaveClass(/opacity-40/);
    const monthKpis = (await kpiRow.textContent()) || '';
    expect(monthKpis, 'KPI row did not change when the period changed').not.toEqual(rangeKpis);

    // ── Sorting is real ──────────────────────────────────────────────────
    await page.goto('/fr/pages/transaction' + RANGE);
    await expect(page.getByTestId('tx-table')).toBeVisible({ timeout: 30_000 });
    const firstLabel = async () =>
        (await page.locator('[data-testid="tx-row"] td:nth-child(3)').first().textContent() || '').trim();
    const beforeSort = await firstLabel();
    await page.locator('th[psortablecolumn="signed"], th:has-text("MONTANT")').first().click();
    await page.waitForTimeout(400);
    expect(await firstLabel(), 'sorting by amount did not reorder the rows').not.toEqual(beforeSort);

    // ── Selection + bulk bar ─────────────────────────────────────────────
    const checks = page.getByTestId('tx-row-check');
    await checks.nth(0).click();
    await checks.nth(2).click({ modifiers: ['Shift'] });
    await expect(page.getByTestId('tx-bulk-bar')).toBeVisible();
    await expect(page.getByTestId('tx-bulk-count')).toContainText('3');
    // Select-all covers the whole filtered set, not just what is on screen.
    await page.getByTestId('tx-select-all').click();
    await expect(page.getByTestId('tx-bulk-count')).toContainText(String(rowCount));

    // ── CSV of the current filter, client-side ───────────────────────────
    // GET /export/transactions.csv takes no parameters, so a filtered export
    // can only be built here.
    const dl = page.waitForEvent('download', { timeout: 15_000 });
    await page.getByTestId('tx-export').click();
    const download = await dl;
    expect(download.suggestedFilename()).toMatch(/^omaad-transactions-2026-08-01_2026-08-31\.csv$/);
    const stream = await download.createReadStream();
    const csv = await new Promise<string>(resolve => {
        let out = '';
        stream.on('data', (c: Buffer) => (out += c.toString('utf8')));
        stream.on('end', () => resolve(out));
    });
    const lines = csv.trim().split(/\r?\n/);
    expect(lines.length).toBe(rowCount + 1); // header + every filtered row
    expect(csv.startsWith('﻿'), 'missing UTF-8 BOM: Excel mangles accented labels').toBe(true);
    // Negative amounts stay numeric.
    expect(csv, 'negative amounts were escaped to text').not.toContain(`"'-`);
    expect(csv).toMatch(/"-?\d+\.\d{2}"/);

    // ── Mobile: cards, no table, and the range URL is ignored ────────────
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/fr/pages/transaction' + RANGE);
    await expect(page.locator('.layout-topbar')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('tx-table')).toHaveCount(0);
    await expect(page.getByTestId('tx-filter-bar')).toHaveCount(0);
    // No dead end: the month navigator stays usable on a phone.
    await expect(page.getByTestId('tx-month-nav')).not.toHaveClass(/opacity-40/);
});
