import { expect, Page, test } from '@playwright/test';

/**
 * P3-3 guard: the shell follows the viewport across its 991/992px breakpoint
 * WITHOUT a reload, in both directions, and keeps the user's sidebar state.
 *
 * Sidebar vs bottom bar is CSS (`_responsive.scss`), so the swap itself was
 * already live; what this pins is the whole contract around the breakpoint:
 * the swap, no leftover scroll lock from the phone side, and the collapsed
 * rail surviving a trip through phone width. `LayoutService.isDesktop` is
 * the JS side of the same breakpoint (a matchMedia signal, see
 * layout.service.spec.ts for the reactive assertion that fails pre-fix).
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

async function pin(page: Page, user: string, theme: 'light' | 'dark'): Promise<void> {
    await page.addInitScript(([u, dark]) => {
        localStorage.setItem('omaad_user', u);
        localStorage.setItem('omaad_privacy_hidden', 'false');
        localStorage.setItem('omaad-layout-config', JSON.stringify({ darkTheme: dark, themeMode: dark ? 'dark' : 'light' }));
    }, [user, theme === 'dark'] as [string, boolean]);
}

test.describe('shell breakpoint', () => {
    test.setTimeout(6 * 60_000);

    test('sidebar and bottom bar swap live on resize, rail state survives', async ({ browser }) => {
        const seed = await browser.newPage();
        const user = await login(seed);
        const cookies = await seed.context().cookies();
        await seed.close();

        const failures: string[] = [];
        for (const [theme, lang] of [['light', 'fr'], ['dark', 'en']] as const) {
            const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
            await ctx.addCookies(cookies);
            const page = await ctx.newPage();
            const errors: string[] = [];
            page.on('pageerror', e => errors.push(e.message));
            await pin(page, user, theme);
            const label = `${theme}/${lang}`;
            const sidebar = page.locator('.layout-sidebar');
            const bottomNav = page.locator('.mobile-bottom-nav');
            const wrapper = page.locator('.layout-wrapper');
            try {
                await page.goto(`/${lang}/`);
                await expect(sidebar, `${label} desktop shows the sidebar`).toBeVisible({ timeout: 30_000 });
                await expect(bottomNav, `${label} desktop hides the bottom bar`).toBeHidden();
                const isDark = await page.evaluate(() => document.documentElement.classList.contains('app-dark'));
                expect(isDark, `${label} theme`).toBe(theme === 'dark');

                // Collapse to the rail (desktop-only control), remember the choice.
                await page.locator('.sidebar-logo').click();
                await expect(wrapper, `${label} rail mode on`).toHaveClass(/layout-static-inactive/);

                // Shrink past the breakpoint: NO reload.
                await page.setViewportSize({ width: 390, height: 844 });
                await expect(bottomNav, `${label} phone shows the bottom bar`).toBeVisible({ timeout: 10_000 });
                await expect(sidebar, `${label} phone hides the sidebar`).toBeHidden();
                const blocked = await page.evaluate(() => document.body.classList.contains('blocked-scroll'));
                expect(blocked, `${label} no scroll lock left on the phone`).toBe(false);

                // Grow back: the sidebar returns, still collapsed as the user left it.
                await page.setViewportSize({ width: 1440, height: 900 });
                await expect(sidebar, `${label} desktop again shows the sidebar`).toBeVisible({ timeout: 10_000 });
                await expect(bottomNav, `${label} desktop again hides the bottom bar`).toBeHidden();
                await expect(wrapper, `${label} rail state kept across the trip`).toHaveClass(/layout-static-inactive/);
                await page.locator('.sidebar-logo').click();
                await expect(wrapper, `${label} rail mode off again`).not.toHaveClass(/layout-static-inactive/);
            } catch (e) {
                failures.push(`${label}: ${(e as Error).message.split('\n')[0]} (at ${page.url()})`);
            }
            if (errors.length) failures.push(`${label}: page errors: ${errors.join(' | ')}`);
            await ctx.close();
        }
        expect(failures, failures.join('\n')).toEqual([]);
    });
});
