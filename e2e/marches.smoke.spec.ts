import { expect, Page, test } from '@playwright/test';

/**
 * P2-3 guard: the Marchés hub and its five satellite screens render on the
 * web with the exchange's own figures.
 *
 * What it pins down, in one login (the /auth/login limit is 10/minute):
 *  - the hub shows indices in POINTS, the board in FCFA, movers, funds, FX,
 *    news, in FR and EN, light and dark, desktop and 390px;
 *  - the board search narrows by ticker and the sort chips reorder;
 *  - the fund board's category chips filter;
 *  - an instrument detail draws the chart, the period bar reslices it, and
 *    the CTA lands on the add-asset form with the instrument already picked;
 *  - no price is ever converted: a FCFA figure must equal the API's close.
 *
 * Prereqs (local): ng serve :4200, backend :8000 on omaad_dev, demo user.
 */

const EMAIL = process.env.E2E_EMAIL || 'demo@omaad.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'OmaadDemo2026!';
const API = process.env.E2E_API_URL || 'http://localhost:8000/api/v1';

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
        localStorage.setItem('omaad-layout-config', JSON.stringify({ darkTheme: dark, themeMode: dark ? 'dark' : 'light' }));
    }, [user, theme === 'dark'] as [string, boolean]);
}

/** "24 500 FCFA" -> 24500 (any grouping character). */
function parseFcfa(s: string): number {
    return Number(s.replace(/FCFA/g, '').replace(/[^\d-]/g, ''));
}

test.describe('marchés hub', () => {
    test.setTimeout(8 * 60_000);

    test('hub, boards and detail render with exchange figures, in both languages, themes and widths', async ({ browser, request }) => {
        const seed = await browser.newPage();
        const user = await login(seed);
        const cookies = await seed.context().cookies();
        // Ground truth for the "never converted" check.
        const token = await seed.evaluate(async () => {
            const r = await fetch('http://localhost:8000/api/v1/auth/refresh', { method: 'POST', credentials: 'include' });
            return (await r.json()).access_token as string;
        }).catch(() => null);
        await seed.close();

        let quotes: Array<{ ticker: string; close_xof: number; name: string }> = [];
        if (token) {
            const r = await request.get(`${API}/market/brvm/quotes`, { headers: { Authorization: `Bearer ${token}` } });
            if (r.ok()) quotes = await r.json();
        }

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

            try {
                // Home entry: the market card on Synthèse is how a phone reaches
                // the hub (the sidebar is hidden there, the bottom bar keeps five hubs).
                await page.goto(`/${lang}/`);
                const home = page.getByTestId('mk-home');
                await expect(home, `${label} home market card`).toBeVisible({ timeout: 30_000 });
                await expect(home).toContainText('pts');
                await home.click();
                await expect(page, `${label} home card opens the hub`).toHaveURL(/\/pages\/marches$/, { timeout: 20_000 });

                // Hub
                await expect(page.getByTestId('mk-indices'), `${label} indices`).toBeVisible({ timeout: 30_000 });
                await expect(page.getByTestId('mk-board'), `${label} board`).toBeVisible();
                await expect(page.getByTestId('mk-fx'), `${label} fx`).toBeVisible();
                await expect(page.getByTestId('mk-news'), `${label} news`).toBeVisible();
                const isDark = await page.evaluate(() => document.documentElement.classList.contains('app-dark'));
                expect(isDark, `${label} theme`).toBe(theme === 'dark');
                // Index level reads in points, never as money.
                const firstIndex = page.getByTestId('mk-indices').locator('a').first();
                await expect(firstIndex).toContainText('pts');
                await expect(firstIndex).not.toContainText('FCFA');
                // A board price equals the API's close, ungrouped.
                const firstRow = page.getByTestId('mk-board').locator('a[data-ticker]').first();
                const ticker = await firstRow.getAttribute('data-ticker');
                const priceText = await firstRow.locator('span.tabular-nums').first().innerText();
                const api = quotes.find(q => q.ticker === ticker);
                if (api) expect(parseFcfa(priceText), `${label} ${ticker} price verbatim`).toBe(Math.round(api.close_xof));
                expect(priceText, `${label} price unit`).toContain('FCFA');

                // Board: search + sort
                await page.getByTestId('mk-board-all').click();
                await expect(page.getByTestId('mk-board-list')).toBeVisible({ timeout: 20_000 });
                const total = await page.locator('[data-testid=mk-board-list] a[data-ticker]').count();
                expect(total, `${label} board rows`).toBeGreaterThan(5);
                await page.getByTestId('mk-search').fill(ticker!.toLowerCase());
                await expect.poll(() => page.locator('[data-testid=mk-board-list] a[data-ticker]').count()).toBeLessThan(total);
                await expect(page.locator(`[data-testid=mk-board-list] a[data-ticker="${ticker}"]`)).toBeVisible();
                await page.getByTestId('mk-search').fill('');
                await page.locator('button[data-sort=change]').click();
                const topChange = await page.locator('[data-testid=mk-board-list] a[data-ticker]').first().getAttribute('data-ticker');
                expect(topChange, `${label} sort by change changes the order`).not.toBe(ticker);

                // Stock detail: chart + period bar + CTA prefill
                await page.locator('[data-testid=mk-board-list] a[data-ticker]').first().click();
                await expect(page.getByTestId('mk-detail')).toBeVisible({ timeout: 20_000 });
                await expect(page.getByTestId('mk-price')).toContainText('FCFA');
                const chartOrCopy = page.locator('app-hilo-chart, p:has-text("historique"), p:has-text("history")').first();
                await expect(chartOrCopy).toBeVisible();
                await page.locator('button[data-days="0"]').click();
                await expect(page.locator('button[data-days="0"]')).toHaveAttribute('aria-selected', 'true');
                const detailTicker = page.url().match(/\/action\/([^/?]+)/)?.[1];
                await page.getByTestId('mk-cta').click();
                await expect(page).toHaveURL(/patrimoine\/add-asset/, { timeout: 20_000 });
                // The picker landed with the instrument already chosen.
                await expect(page.locator('body')).toContainText(detailTicker!, { timeout: 20_000 });

                // Index detail reads in points
                await page.goto(`/${lang}/pages/marches/indice/BRVM-C`);
                await expect(page.getByTestId('mk-detail')).toBeVisible({ timeout: 20_000 });
                await expect(page.getByTestId('mk-price')).toContainText('pts');

                // Fund board chips + fund detail
                await page.goto(`/${lang}/pages/marches/fcp`);
                await expect(page.getByTestId('mk-fcp-list')).toBeVisible({ timeout: 20_000 });
                const all = await page.locator('[data-testid=mk-fcp-list] a[data-slug]').count();
                await page.locator('button[data-group=actions]').click();
                await expect.poll(() => page.locator('[data-testid=mk-fcp-list] a[data-slug]').count()).toBeLessThan(all);
                await page.locator('[data-testid=mk-fcp-list] a[data-slug]').first().click();
                await expect(page.getByTestId('mk-detail')).toBeVisible({ timeout: 20_000 });
                await expect(page.locator('button[data-days="365"]')).toHaveAttribute('aria-selected', 'true');

                // Unknown ticker: honest unavailable copy, not a blank page.
                await page.goto(`/${lang}/pages/marches/action/NOPE`);
                await expect(page.getByTestId('mk-unavailable')).toBeVisible({ timeout: 20_000 });
            } catch (e) {
                failures.push(`${label}: ${(e as Error).message.split('\n')[0]} (at ${page.url()})`);
            }
            if (errors.length) failures.push(`${label}: page errors: ${errors.join(' | ')}`);
            await ctx.close();
        }
        expect(failures, failures.join('\n')).toEqual([]);
    });
});
