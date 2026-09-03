import { expect, Page, test } from '@playwright/test';

/**
 * P3-5 guard: the palette follow-ups.
 *
 *  - Transactions are searchable: typing a transaction's label lists it under
 *    a "Transactions" group, Enter lands on the transactions page scoped to
 *    its month and pre-searched on that label (desktop, where the table gives
 *    us a label to read).
 *  - `?` outside a field opens the palette on its keyboard legend; typing
 *    hides the legend. The footer legend is on every keyboard-sized open.
 *  - Settings > Preferences surfaces the palette with the platform hint
 *    (the topbar trigger is desktop-only); its button opens the palette on a
 *    phone too.
 *
 * Pre-fix: no `?` handler, no legend, no transactions group, no card.
 *
 * Prereqs (local): ng serve :4200, backend :8000 on omaad_dev, demo user with
 * at least one transaction.
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

async function pin(page: Page, user: string, theme: 'light' | 'dark'): Promise<void> {
    await page.addInitScript(([u, dark]) => {
        localStorage.setItem('omaad_user', u);
        localStorage.setItem('omaad_privacy_hidden', 'false');
        localStorage.setItem('omaad-layout-config', JSON.stringify({ darkTheme: dark, themeMode: dark ? 'dark' : 'light' }));
        localStorage.removeItem('omaad_palette_recent');
    }, [user, theme === 'dark'] as [string, boolean]);
}

test.describe('palette follow-ups', () => {
    test.setTimeout(6 * 60_000);

    test('transactions search, ? legend, footer, and the Preferences card', async ({ browser }) => {
        const seed = await browser.newPage();
        const user = await login(seed);
        const cookies = await seed.context().cookies();
        await seed.close();

        const failures: string[] = [];
        const combos = [
            ['desktop', { width: 1440, height: 900 }, 'light', 'fr'],
            ['desktop', { width: 1440, height: 900 }, 'dark', 'en'],
            ['390px', { width: 390, height: 844 }, 'dark', 'fr'],
            ['390px', { width: 390, height: 844 }, 'light', 'en'],
        ] as const;

        for (const [vp, viewport, theme, lang] of combos) {
            const ctx = await browser.newContext({ viewport });
            await ctx.addCookies(cookies);
            const page = await ctx.newPage();
            const errors: string[] = [];
            page.on('pageerror', e => errors.push(e.message));
            await pin(page, user, theme);
            const label = `${vp}/${theme}/${lang}`;
            const input = page.getByTestId('palette-input');
            try {
                // Preferences card: hint + button open the palette, at every width.
                await page.goto(`/${lang}/pages/settings/preferences`);
                const card = page.getByTestId('pref-palette');
                await expect(card, `${label} preferences card`).toBeVisible({ timeout: 30_000 });
                await expect(page.getByTestId('pref-palette-hint'), `${label} platform hint`).toHaveText(/⌘K|Ctrl K/);
                await page.getByTestId('pref-palette-open').click();
                await expect(input, `${label} card button opens the palette`).toBeVisible({ timeout: 10_000 });
                await page.keyboard.press('Escape');
                await expect(input).toBeHidden({ timeout: 10_000 });
                const isDark = await page.evaluate(() => document.documentElement.classList.contains('app-dark'));
                expect(isDark, `${label} theme`).toBe(theme === 'dark');

                if (vp !== 'desktop') { await ctx.close(); continue; }

                // `?` on a shell page opens the legend; typing hides it; footer present.
                await page.goto(`/${lang}/`);
                await expect(page.locator('.layout-topbar')).toBeVisible({ timeout: 30_000 });
                await page.locator('#main-content').focus();
                await page.keyboard.press('?');
                await expect(input, `${label} ? opens the palette`).toBeVisible({ timeout: 10_000 });
                await expect(page.getByTestId('palette-legend'), `${label} legend leads`).toBeVisible();
                await expect(page.getByTestId('palette-legend')).toContainText(/⌘K|Ctrl K/);
                await expect(page.getByTestId('palette-footer'), `${label} footer legend`).toBeVisible();
                await expect(input).toBeFocused();
                await input.fill('a');
                await expect(page.getByTestId('palette-legend'), `${label} typing hides the legend`).toHaveCount(0);
                await page.keyboard.press('Escape');
                await expect(input).toBeHidden({ timeout: 10_000 });

                // `?` inside a field types a question mark, it does not open the palette.
                await page.goto(`/${lang}/pages/transaction`);
                const search = page.locator('input[type=search]').first();
                await expect(search).toBeVisible({ timeout: 30_000 });
                await search.click();
                await page.keyboard.press('?');
                await expect(input, `${label} ? in a field stays a character`).toBeHidden();
                await expect(search).toHaveValue('?');
                await search.fill('');

                // Transactions search: read a real label from the table, find it, land scoped.
                const firstLabel = (await page.getByTestId('tx-row').first().locator('td:nth-child(3)').innerText()).trim();
                expect(firstLabel.length, `${label} a transaction label to search for`).toBeGreaterThan(0);
                await page.locator('#main-content').focus();
                const apple = await page.evaluate(() => /Mac|iPhone|iPad/.test(navigator.platform));
                await page.keyboard.press(apple ? 'Meta+k' : 'Control+k');
                await expect(input).toBeVisible({ timeout: 10_000 });
                await expect(input).toBeFocused();
                await input.fill(firstLabel.slice(0, 24));
                const txRow = page.locator('[data-testid=palette-list] [role=option][data-item^="tx:"]').first();
                await expect(txRow, `${label} transaction row listed`).toBeVisible({ timeout: 15_000 });
                await expect(txRow).toContainText(firstLabel.slice(0, 24));
                await expect(page.locator('[data-testid=palette-list] p', { hasText: /^transactions$/i })).toBeVisible();
                await txRow.click();
                await expect(page, `${label} lands on the month, pre-searched`).toHaveURL(/\/pages\/transaction\?.*year=\d{4}.*month=\d{1,2}.*q=/, { timeout: 20_000 });
                await expect(page.getByTestId('tx-count')).toContainText(/\d/);
                await expect(page.getByTestId('tx-row').first()).toContainText(firstLabel.slice(0, 24), { timeout: 20_000 });
            } catch (e) {
                // Keep the assertion detail (locator, expected/received), not only the custom label.
                const lines = (e as Error).message.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 4);
                failures.push(`${label}: ${lines.join(' | ')} (at ${page.url()})`);
            }
            if (errors.length) failures.push(`${label}: page errors: ${errors.join(' | ')}`);
            await ctx.close();
        }
        expect(failures, failures.join('\n')).toEqual([]);
    });
});
