import { expect, Page, test } from '@playwright/test';

/**
 * P3-4 guard: the desktop assets table on Patrimoine.
 *
 *  - From lg (1024px) the "Actifs" section is a sortable table of every asset
 *    (name, category, institution, original value, display value, change) with
 *    search, a row count and a CSV export over the rows on screen; below lg the
 *    category cards stay. Pre-fix: no table anywhere, every desktop combo fails
 *    at the first assertion.
 *  - Default sort is display value descending; the name header sorts by name.
 *  - The original-value cell is filled ONLY for assets stored in a currency
 *    other than the display currency (owner call), and it masks under privacy
 *    mode like every other money string (privacy-mask.smoke sweeps this page
 *    too; this spec checks the column directly).
 *  - A row opens the asset detail.
 *
 * Prereqs (local): ng serve :4200, backend :8000 on omaad_dev, demo user (has
 * XOF and EUR assets; display currency XOF).
 */

const EMAIL = process.env.E2E_EMAIL || 'demo@omaad.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'OmaadDemo2026!';

async function login(page: Page): Promise<string> {
    await page.goto('/fr/auth/login');
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password input').fill(PASSWORD);
    await page.locator('button[type=submit]').first().click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 30_000 });
    await expect.poll(() => page.evaluate(() => localStorage.getItem('omaad_user')), { timeout: 15_000 }).toBeTruthy();
    return (await page.evaluate(() => localStorage.getItem('omaad_user'))) as string;
}

async function pin(page: Page, user: string, theme: 'light' | 'dark', privacy = false): Promise<void> {
    await page.addInitScript(([u, dark, hidden]) => {
        localStorage.setItem('omaad_user', u);
        localStorage.setItem('omaad_privacy_hidden', hidden ? 'true' : 'false');
        localStorage.setItem('omaad-layout-config', JSON.stringify({ darkTheme: dark, themeMode: dark ? 'dark' : 'light' }));
    }, [user, theme === 'dark', privacy] as [string, boolean, boolean]);
}

/** Digits of a rendered amount ("9 839 355 FCFA" -> 9839355), tolerant of the narrow NBSP. */
function num(s: string): number {
    return Number((s.match(/[\d\s  .,]+/)?.[0] ?? '0').replace(/[^\d]/g, ''));
}

test.describe('Patrimoine desktop table', () => {
    test.setTimeout(6 * 60_000);

    test('table from lg with sort, search, export, native column and row open; cards below lg', async ({ browser }) => {
        const seed = await browser.newPage();
        const user = await login(seed);
        const cookies = await seed.context().cookies();
        await seed.close();

        const failures: string[] = [];
        const combos = [
            ['desktop', { width: 1440, height: 1000 }, 'light', 'fr'],
            ['desktop', { width: 1440, height: 1000 }, 'dark', 'en'],
            ['390px', { width: 390, height: 844 }, 'dark', 'fr'],
            ['390px', { width: 390, height: 844 }, 'light', 'en'],
        ] as const;

        for (const [vp, viewport, theme, lang] of combos) {
            const ctx = await browser.newContext({ viewport, acceptDownloads: true });
            await ctx.addCookies(cookies);
            const page = await ctx.newPage();
            const errors: string[] = [];
            page.on('pageerror', e => errors.push(e.message));
            await pin(page, user, theme);
            const label = `${vp}/${theme}/${lang}`;
            try {
                await page.goto(`/${lang}/pages/patrimoine`);
                await expect(page.locator('app-patrimoine')).toBeVisible({ timeout: 30_000 });
                const isDark = await page.evaluate(() => document.documentElement.classList.contains('app-dark'));
                expect(isDark, `${label} theme`).toBe(theme === 'dark');

                const table = page.getByTestId('assets-table');
                const rows = page.getByTestId('asset-row');

                if (vp === '390px') {
                    await expect(page.locator('app-patrimoine button', { hasText: /actif|asset/i }).first(), `${label} category cards`).toBeVisible({ timeout: 30_000 });
                    await expect(table, `${label} no table on a phone`).toHaveCount(0);
                    await expect(page.getByTestId('assets-toolbar')).toHaveCount(0);
                    await ctx.close();
                    continue;
                }

                await expect(table, `${label} table`).toBeVisible({ timeout: 30_000 });
                await expect(rows.first()).toBeVisible({ timeout: 30_000 });
                const n = await rows.count();
                expect(n, `${label} has rows`).toBeGreaterThan(1);
                await expect(page.getByTestId('assets-count'), `${label} count label matches rows`).toContainText(String(n));

                // Default sort: display value descending.
                const values = await rows.locator('td:nth-child(5)').allInnerTexts();
                const nums = values.map(num);
                for (let i = 1; i < nums.length; i++) {
                    if (nums[i] > nums[i - 1]) { failures.push(`${label}: not sorted by value desc at row ${i}: ${values[i - 1]} then ${values[i]}`); break; }
                }

                // Original value: filled only for non-display-currency assets (demo has EUR titles on an XOF display).
                const natives = await page.getByTestId('asset-native').allInnerTexts();
                const filled = natives.filter(s => s.trim().length > 0);
                expect(filled.length, `${label} some original values shown (EUR assets)`).toBeGreaterThan(0);
                expect(filled.length, `${label} not every row shows an original value (XOF on XOF is blank)`).toBeLessThan(natives.length);
                for (const s of filled) expect(s, `${label} original value is a foreign amount`).not.toMatch(/FCFA/);

                // Name header sorts alphabetically.
                await table.locator('th[psortablecolumn="name"]').click();
                const names = (await rows.locator('td:nth-child(1)').allInnerTexts()).map(s => s.trim().toLocaleLowerCase());
                const sorted = [...names].sort((a, b) => a.localeCompare(b, lang));
                expect(names, `${label} sorted by name after header click`).toEqual(sorted);

                // Search filters, accent-insensitive.
                const search = page.getByTestId('assets-search');
                await search.fill('bitcoin');
                await expect(rows, `${label} search narrows to Bitcoin`).toHaveCount(1);
                await expect(rows.first()).toContainText(/bitcoin/i);
                await search.fill('zzzz-no-such-asset');
                await expect(rows).toHaveCount(0);
                await expect(table, `${label} empty message`).toContainText(/aucun actif|no asset/i);
                await search.fill('');
                await expect(rows).toHaveCount(n);

                // Export downloads a CSV with a header and one line per row.
                const dl = page.waitForEvent('download', { timeout: 15_000 });
                await page.getByTestId('assets-export').click();
                const file = await dl;
                expect(file.suggestedFilename(), `${label} export filename`).toMatch(/^omaad-actifs-\d{4}-\d{2}-\d{2}\.csv$/);
                const body = await (await file.createReadStream()).toArray().then(chunks => Buffer.concat(chunks as Buffer[]).toString('utf8'));
                const lines = body.replace(/^﻿/, '').split('\r\n').filter(Boolean);
                expect(lines.length, `${label} export = header + rows`).toBe(n + 1);
                expect(lines[0], `${label} export header carries the display currency`).toMatch(/XOF/);

                // Privacy: the original-value column masks itself.
                const ctx2 = await browser.newContext({ viewport });
                await ctx2.addCookies(cookies);
                const p2 = await ctx2.newPage();
                await pin(p2, user, theme, true);
                await p2.goto(`/${lang}/pages/patrimoine`);
                await expect(p2.getByTestId('asset-row').first()).toBeVisible({ timeout: 30_000 });
                const masked = (await p2.getByTestId('asset-native').allInnerTexts()).filter(s => s.trim());
                expect(masked.length, `${label} privacy: foreign rows still show a cell`).toBeGreaterThan(0);
                for (const s of masked) expect(s, `${label} privacy: original value masked`).toMatch(/•••••/);
                await ctx2.close();

                // A row opens the asset detail.
                const firstId = await rows.first().getAttribute('data-id');
                await rows.first().locator('td:nth-child(3)').click();
                await expect(page, `${label} row opens the asset`).toHaveURL(new RegExp(`/pages/patrimoine/assets/${firstId}`), { timeout: 20_000 });
            } catch (e) {
                failures.push(`${label}: ${(e as Error).message.split('\n')[0]} (at ${page.url()})`);
            }
            if (errors.length) failures.push(`${label}: page errors: ${errors.join(' | ')}`);
            await ctx.close();
        }
        expect(failures, failures.join('\n')).toEqual([]);
    });
});
