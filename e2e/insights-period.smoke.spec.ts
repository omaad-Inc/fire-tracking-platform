import { expect, Page, test } from '@playwright/test';

/**
 * P1-3 guard: the Analyses window selector, plus the raw-category-key bug.
 *
 * Fails on the pre-fix build, which had no selector at all (the 6-month window
 * was hardcoded at the InsightsService call site even though the API always
 * took the parameter) and rendered "HOUSING" as visible copy.
 *
 * The two assertions that earn their keep:
 *  - the selector sits in the TREND card, and the KPI block carries its own
 *    month label. `months` only sizes `trend` server-side: income, expenses,
 *    net, savings_rate AND the category breakdown are always the current month
 *    and do NOT vary with it (verified against the running backend across
 *    3/6/12/24). A page-level selector would therefore have claimed to filter
 *    numbers it cannot touch;
 *  - the category column resolves. This endpoint returns MIXED casing, the enum
 *    VALUE for some rows and its NAME for others, against a lowercase
 *    dictionary, so the page printed the key itself.
 *
 * Prereqs (local): ng serve :4200, backend :8000 on omaad_dev, demo user.
 *
 * Signs in ONCE and sweeps: /auth/login is rate limited 10/minute.
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

test('insights: window selector, deep link, and resolved category labels', async ({ page }) => {
    const missingKeys: string[] = [];
    page.on('console', m => {
        if (/\[i18n\] missing key/.test(m.text())) missingKeys.push(m.text());
    });

    await login(page);
    const user = await page.evaluate(() => localStorage.getItem('omaad_user'));
    expect(user, 'login did not persist a profile, cannot sweep').toBeTruthy();
    await page.addInitScript(([u]) => {
        if (u) localStorage.setItem('omaad_user', u as string);
    }, [user] as [string | null]);

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/fr/pages/insights');

    const selector = page.getByTestId('insights-period');
    await expect(selector).toBeVisible({ timeout: 30_000 });

    // Default window is 6 months, and the URL stays clean for the default.
    await expect(selector.locator('[aria-selected=true]')).toHaveAttribute('data-months', '6');
    expect(new URL(page.url()).searchParams.get('months')).toBeNull();

    // The KPI block names its own period, so the selector cannot be read as
    // governing numbers the API scopes to the current month.
    await expect(page.getByTestId('insights-kpi-period')).toHaveText(/\w+ \d{4}/);

    // No unresolved category keys anywhere on the page.
    const rawKeys = (await page.locator('app-ui-card .truncate').allTextContents())
        .map(t => t.trim())
        .filter(t => /^[A-Z][A-Z_]{2,}$/.test(t));
    expect(rawKeys, 'category labels are rendering as raw keys').toEqual([]);

    // ── Each window asks the API for that window ─────────────────────────
    for (const months of [3, 12, 24]) {
        const req = page.waitForRequest(
            r => r.url().includes('/insights?') && r.url().includes(`months=${months}`),
            { timeout: 15_000 },
        );
        await selector.locator(`[data-months="${months}"]`).click();
        await req;
        await expect(selector.locator('[aria-selected=true]')).toHaveAttribute('data-months', String(months));
        await expect(page).toHaveURL(new RegExp(`months=${months}`));
    }

    // Back to the default drops the param rather than pinning ?months=6.
    await selector.locator('[data-months="6"]').click();
    await expect(page).not.toHaveURL(/months=/);

    // ── Deep link restores the window ────────────────────────────────────
    await page.goto('/fr/pages/insights?months=12');
    await expect(page.getByTestId('insights-period')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('insights-period').locator('[aria-selected=true]'))
        .toHaveAttribute('data-months', '12');

    // An out-of-range window from a hand-edited URL falls back, never 422s.
    await page.goto('/fr/pages/insights?months=999');
    await expect(page.getByTestId('insights-period')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('insights-period').locator('[aria-selected=true]'))
        .toHaveAttribute('data-months', '6');

    // ── Mobile keeps the selector reachable ──────────────────────────────
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/fr/pages/insights?months=3');
    await expect(page.getByTestId('insights-period')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('insights-period').locator('[aria-selected=true]'))
        .toHaveAttribute('data-months', '3');

    expect(missingKeys, 'i18n keys are missing on the Analyses page').toEqual([]);
});
