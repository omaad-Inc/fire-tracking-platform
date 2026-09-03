import { expect, Page, test } from '@playwright/test';

/**
 * PWA topbar diet guard.
 *
 *  - Step 1: no notification bell (covered by notification-center.smoke).
 *  - Step 2: the "desktop only" group (palette trigger + theme toggle) is
 *    really desktop only. `_topbar.scss` used to force `display: flex` on
 *    `.layout-config-menu`, outranking Tailwind's `hidden`, so every phone
 *    showed seven controls. Pre-fix this fails on both 390px combos.
 *  - The inbox stays reachable on a phone: Settings > Notifications opens
 *    with an inbox row that lands on /pages/notifications.
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

test.describe('PWA topbar diet', () => {
    test.setTimeout(6 * 60_000);

    test('phones get the short topbar and keep a path to the inbox', async ({ browser }) => {
        const seed = await browser.newPage();
        const user = await login(seed);
        const cookies = await seed.context().cookies();
        await seed.close();

        const failures: string[] = [];
        const combos = [
            ['390px', { width: 390, height: 844 }, 'light', 'fr'],
            ['390px', { width: 390, height: 844 }, 'dark', 'en'],
            ['desktop', { width: 1440, height: 900 }, 'dark', 'fr'],
            ['desktop', { width: 1440, height: 900 }, 'light', 'en'],
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
                await page.goto(`/${lang}/`);
                await expect(page.locator('.layout-topbar')).toBeVisible({ timeout: 30_000 });
                const isDark = await page.evaluate(() => document.documentElement.classList.contains('app-dark'));
                expect(isDark, `${label} theme`).toBe(theme === 'dark');

                const desktopGroup = page.locator('.layout-topbar .layout-config-menu');
                const trigger = page.getByTestId('palette-trigger');
                if (vp === '390px') {
                    await expect(desktopGroup, `${label} desktop-only group hidden on a phone`).toBeHidden();
                    await expect(trigger, `${label} palette trigger hidden on a phone`).toBeHidden();
                    await expect(page.getByTestId('notif-bell')).toHaveCount(0);
                    // Whatever is left must fit: count the visible action buttons.
                    const visible = await page.locator('.layout-topbar-actions .layout-topbar-action:visible').count();
                    expect(visible, `${label} visible icon buttons`).toBeLessThanOrEqual(3);

                    // Inbox path on a phone: Settings > Notifications > inbox row.
                    await page.goto(`/${lang}/pages/settings/notifications`);
                    const row = page.getByTestId('notif-inbox-link');
                    await expect(row, `${label} inbox row`).toBeVisible({ timeout: 30_000 });
                    await row.click();
                    await expect(page, `${label} inbox row lands on the center`).toHaveURL(/\/pages\/notifications/, { timeout: 20_000 });
                    await expect(page.getByTestId('notif-center')).toBeVisible({ timeout: 20_000 });
                } else {
                    await expect(desktopGroup, `${label} desktop-only group shown on desktop`).toBeVisible();
                    await expect(trigger, `${label} palette trigger shown on desktop`).toBeVisible();
                }
            } catch (e) {
                failures.push(`${label}: ${(e as Error).message.split('\n')[0]} (at ${page.url()})`);
            }
            if (errors.length) failures.push(`${label}: page errors: ${errors.join(' | ')}`);
            await ctx.close();
        }
        expect(failures, failures.join('\n')).toEqual([]);
    });
});
