import { expect, Page, test } from '@playwright/test';

/**
 * P2-6 guard: the home is a real two-column composition from 1200px, and the
 * single column it always was below that.
 *
 * At 1440px the situation band (score over savings) must sit to the RIGHT of
 * the hero, level with its top, and this month's activity must start under the
 * markets card in the main column while debts sit in the rail beside it. At
 * 1024px everything stacks in the historical order: hero, markets, situation,
 * month, debts. On the pre-P2-6 tree the wide assertions fail (the score sat
 * under the markets card at every width).
 *
 * Prereqs (local): ng serve :4200, backend :8000 on omaad_dev, demo user.
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

async function box(page: Page, testId: string) {
    const b = await page.getByTestId(testId).boundingBox();
    expect(b, `${testId} rendered`).toBeTruthy();
    return b!;
}

test.describe('home composition', () => {
    test.setTimeout(4 * 60_000);

    test('two columns from 1200px, one column below', async ({ browser }) => {
        const seed = await browser.newPage();
        const user = await login(seed);
        const cookies = await seed.context().cookies();
        await seed.close();

        const failures: string[] = [];
        for (const [name, width, theme, lang] of [
            ['1440', 1440, 'light', 'fr'], ['1920', 1920, 'dark', 'en'], ['1024', 1024, 'dark', 'fr'], ['390', 390, 'light', 'en'],
        ] as const) {
            const ctx = await browser.newContext({ viewport: { width, height: 900 } });
            await ctx.addCookies(cookies);
            const page = await ctx.newPage();
            await page.addInitScript(([u, dark]) => {
                localStorage.setItem('omaad_user', u);
                localStorage.setItem('omaad-layout-config', JSON.stringify({ darkTheme: dark, themeMode: dark ? 'dark' : 'light' }));
            }, [user, theme === 'dark'] as [string, boolean]);
            try {
                await page.goto(`/${lang}/`);
                await expect(page.getByTestId('home-situation')).toBeVisible({ timeout: 30_000 });
                await page.waitForTimeout(1500);
                const hero = await box(page, 'home-hero');
                const situation = await box(page, 'home-situation');
                const month = await box(page, 'home-month');
                const debts = await box(page, 'home-debts');

                if (width >= 1200) {
                    expect(situation.x, `${name}: situation is in the rail, right of the hero`).toBeGreaterThan(hero.x + hero.width - 1);
                    expect(Math.abs(situation.y - hero.y), `${name}: rail starts level with the hero`).toBeLessThan(4);
                    expect(month.x + month.width, `${name}: month stays in the main column`).toBeLessThan(situation.x);
                    expect(debts.x, `${name}: debts sit in the rail`).toBeGreaterThan(hero.x + hero.width - 1);
                    expect(debts.y, `${name}: debts stack under the situation band in the rail`).toBeGreaterThan(situation.y + situation.height - 1);
                    expect(month.y, `${name}: month follows the hero and markets in the main column, no dead air`)
                        .toBeLessThan(hero.y + hero.height + 400);
                } else {
                    expect(situation.y, `${name}: situation stacks under the hero`).toBeGreaterThan(hero.y + hero.height - 1);
                    expect(month.y, `${name}: month stacks under situation`).toBeGreaterThan(situation.y + situation.height - 1);
                    expect(debts.y, `${name}: debts stack under month`).toBeGreaterThan(month.y + month.height - 1);
                    expect(Math.abs(situation.x - hero.x), `${name}: one column`).toBeLessThan(2);
                }
            } catch (e) {
                failures.push(`${name}: ${(e as Error).message.split('\n')[0]}`);
            }
            await ctx.close();
        }
        expect(failures, failures.join('\n')).toEqual([]);
    });
});
