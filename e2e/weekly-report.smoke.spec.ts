import { expect, Page, test } from '@playwright/test';

/**
 * P2-4 guard: the weekly recap has a web page, in all three of its states.
 *
 *  - Pro user (the demo account): the recap body renders with the backend's
 *    pre-formatted amounts, in FR and EN, light and dark, desktop and 390px,
 *    and the notification center's weekly_report deep-link lands here.
 *  - Free user: 403 PLAN_REQUIRED is an UPSELL with a Pro CTA, never an
 *    error card. Driven by intercepting the endpoint, so the case does not
 *    depend on a seeded free account.
 *  - Empty account: has_content=false shows the getting-started variant.
 *
 * Privacy masking of these strings is covered by privacy-mask.smoke.spec.ts,
 * which sweeps this page too.
 *
 * Prereqs (local): ng serve :4200, backend :8000 on omaad_dev, demo user (Pro).
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
    }, [user, theme === 'dark'] as [string, boolean]);
}

test.describe('weekly recap page', () => {
    test.setTimeout(6 * 60_000);

    test('renders for a Pro user, upsells a free user, teaches an empty one', async ({ browser }) => {
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
            try {
                // Pro: the real bundle.
                await page.goto(`/${lang}/pages/reports/weekly`);
                await expect(page.getByTestId('wr-body'), `${label} body`).toBeVisible({ timeout: 30_000 });
                const net = await page.getByTestId('wr-net').innerText();
                expect(net, `${label} net savings is a formatted amount`).toMatch(/\d/);
                expect(net).not.toContain('•');
                const isDark = await page.evaluate(() => document.documentElement.classList.contains('app-dark'));
                expect(isDark, `${label} theme`).toBe(theme === 'dark');

                // Free: intercept with the backend's exact 403 shape.
                await page.route('**/api/v1/reports/weekly', r => r.fulfill({
                    status: 403, contentType: 'application/json',
                    body: JSON.stringify({ detail: { code: 'PLAN_REQUIRED', required_plan: 'pro' } }),
                }));
                await page.goto(`/${lang}/pages/reports/weekly`);
                await expect(page.getByTestId('wr-upsell'), `${label} upsell`).toBeVisible({ timeout: 30_000 });
                await expect(page.locator('app-load-error')).toHaveCount(0);
                await page.getByTestId('wr-upsell').locator('a').click();
                await expect(page, `${label} upsell CTA opens the plans page`).toHaveURL(/\/pages\/plans\?tier=pro/, { timeout: 20_000 });

                // Empty: has_content=false.
                await page.unroute('**/api/v1/reports/weekly');
                await page.route('**/api/v1/reports/weekly', r => r.fulfill({
                    status: 200, contentType: 'application/json',
                    body: JSON.stringify({
                        meta: { period: '2026-W36', period_label: '', range_start: '', range_end: '', lang, currency: 'XOF', user_name: '', generated_at: '' },
                        summary: { net_worth: '0 FCFA', income: '0 FCFA', expenses: '0 FCFA', net_savings: '0 FCFA', savings_rate: 0, fire_progress: null },
                        top_expenses: [], goals: [], has_content: false,
                    }),
                }));
                await page.goto(`/${lang}/pages/reports/weekly`);
                await expect(page.getByTestId('wr-empty'), `${label} empty state`).toBeVisible({ timeout: 30_000 });
                await page.unroute('**/api/v1/reports/weekly');
            } catch (e) {
                failures.push(`${label}: ${(e as Error).message.split('\n')[0]} (at ${page.url()})`);
            }
            if (errors.length) failures.push(`${label}: page errors: ${errors.join(' | ')}`);
            await ctx.close();
        }
        expect(failures, failures.join('\n')).toEqual([]);
    });
});
