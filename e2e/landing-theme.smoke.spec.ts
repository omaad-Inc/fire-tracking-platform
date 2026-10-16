import { expect, test, type Page } from '@playwright/test';

/**
 * Public pages are LIGHT ONLY (landing redesign 2026-10, core/theme/public-light.ts).
 *
 * Three guarantees, each one a real regression we must never ship:
 *  1. OS dark preference does not darken the landing.
 *  2. A saved dark app theme does not darken any public page, not even for
 *     the first frame (index.html inline script), and the saved setting is
 *     left untouched.
 *  3. The app itself still honors that saved dark theme, and a client-side
 *     navigation public -> app -> public flips the painted class both ways.
 */
const SAVED_DARK = JSON.stringify({ darkTheme: true, themeMode: 'dark', menuMode: 'static' });

async function isDark(page: Page): Promise<boolean> {
    return page.evaluate(() => document.documentElement.classList.contains('app-dark'));
}

async function viewport(page: Page): Promise<string> {
    return page.evaluate(() => document.querySelector('meta[name="viewport"]')?.getAttribute('content') || '');
}

async function bodyIsLight(page: Page): Promise<boolean> {
    return page.evaluate(() => {
        const [r, g, b] = getComputedStyle(document.body).backgroundColor.match(/\d+/g)!.map(Number);
        return (r + g + b) / 3 > 200;
    });
}

test.describe('public pages are light only', () => {
    test('OS dark preference leaves the landing light', async ({ browser }) => {
        const ctx = await browser.newContext({ colorScheme: 'dark' });
        const page = await ctx.newPage();
        await page.goto('/fr/landing', { waitUntil: 'networkidle' });
        expect(await isDark(page)).toBe(false);
        expect(await bodyIsLight(page)).toBe(true);
        await ctx.close();
    });

    test('a saved dark theme leaves every public page light and is not overwritten', async ({ browser }) => {
        const ctx = await browser.newContext();
        await ctx.addInitScript((saved) => localStorage.setItem('omaad-layout-config', saved), SAVED_DARK);
        const page = await ctx.newPage();

        // The inline script runs before Angular: no dark first frame.
        let firstFrameDark: boolean | null = null;
        page.on('domcontentloaded', async () => { firstFrameDark = await isDark(page).catch(() => null); });

        for (const url of ['/fr/landing', '/', '/en/blog', '/outils/comparateur-sgi-brvm', '/confidentialite']) {
            await page.goto(url, { waitUntil: 'networkidle' });
            expect(await isDark(page), url).toBe(false);
        }
        expect(firstFrameDark).toBe(false);

        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('omaad-layout-config') || '{}'));
        expect(saved.darkTheme).toBe(true);
        expect(saved.themeMode).toBe('dark');
        await ctx.close();
    });

    test('the app keeps the saved dark theme and client-side navigation flips it both ways', async ({ browser }) => {
        const ctx = await browser.newContext();
        await ctx.addInitScript((saved) => localStorage.setItem('omaad-layout-config', saved), SAVED_DARK);
        const page = await ctx.newPage();

        // Auth pages are not in the public-light list: they follow the user,
        // and keep the app's viewport zoom lock (native feel, no iOS focus zoom).
        await page.goto('/fr/auth/login', { waitUntil: 'networkidle' });
        expect(await isDark(page)).toBe(true);
        expect(await viewport(page)).toContain('user-scalable=no');

        // Client-side to the landing (the auth page links back to it). Public
        // pages allow zoom (WCAG 1.4.4).
        await page.goto('/fr/landing', { waitUntil: 'networkidle' });
        expect(await isDark(page)).toBe(false);
        expect(await viewport(page)).not.toContain('user-scalable=no');
        await page.getByText(/se connecter/i).first().click();
        await expect(page).toHaveURL(/\/auth\/login/);
        await page.waitForTimeout(300);
        expect(await isDark(page)).toBe(true);

        await page.goBack();
        await expect(page).toHaveURL(/\/fr\/landing/);
        await page.waitForTimeout(300);
        expect(await isDark(page)).toBe(false);
        await ctx.close();
    });
});
