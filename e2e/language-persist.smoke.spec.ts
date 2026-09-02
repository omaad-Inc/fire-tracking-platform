import { expect, Page, test } from '@playwright/test';

/**
 * P3-1 guard: switching the language in-app PERSISTS it on the profile.
 *
 * Before this fix `preferred_language` was written once, at registration, and
 * every in-app switch (palette, Settings > Preferences, the sidebar) flipped
 * the client only. Everything the server renders in the stored language (the
 * weekly recap bundle, inbox items, the Monday email, push text) kept coming
 * back in the registration language.
 *
 * Two switch surfaces, both directions, both themes, both viewports:
 *  - desktop/light: the command palette action ("Switch to English" /
 *    "Passer en français");
 *  - 390px/dark: the language select on Settings > Preferences.
 *
 * Each switch must issue a successful PATCH /users/me carrying the new
 * language, and a fresh load of the weekly recap must come back with
 * `meta.lang` equal to it (the backend reads the STORED language, so this is
 * the round trip the user actually sees). The demo account is left in FR.
 *
 * Prereqs (local): ng serve :4200, backend :8000 on omaad_dev, demo user (Pro).
 */

const EMAIL = process.env.E2E_EMAIL || 'demo@omaad.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'OmaadDemo2026!';
const API = process.env.E2E_API_URL || 'http://localhost:8000/api/v1';

type Lang = 'fr' | 'en';

async function login(page: Page): Promise<{ user: string; token: string }> {
    await page.goto('/fr/auth/login');
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password input').fill(PASSWORD);
    const loginResp = page.waitForResponse(r => r.url().includes('/auth/login') && r.request().method() === 'POST');
    await page.locator('button[type=submit]').first().click();
    const token = ((await (await loginResp).json()) as { access_token?: string }).access_token ?? '';
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 30_000 });
    await expect.poll(() => page.evaluate(() => localStorage.getItem('omaad_user')), { timeout: 15_000 }).toBeTruthy();
    const user = (await page.evaluate(() => localStorage.getItem('omaad_user'))) as string;
    return { user, token };
}

async function pin(page: Page, user: string, theme: 'light' | 'dark'): Promise<void> {
    await page.addInitScript(([u, dark]) => {
        localStorage.setItem('omaad_user', u);
        localStorage.setItem('omaad_privacy_hidden', 'false');
        localStorage.setItem('omaad-layout-config', JSON.stringify({ darkTheme: dark, themeMode: dark ? 'dark' : 'light' }));
    }, [user, theme === 'dark'] as [string, boolean]);
}

/** The chord for the browser's own platform (the app checks the same thing). */
async function chord(page: Page): Promise<void> {
    const apple = await page.evaluate(() => /Mac|iPhone|iPad/.test(navigator.platform));
    await page.keyboard.press(apple ? 'Meta+k' : 'Control+k');
}

/** Resolves with the PATCH /users/me that carries `lang`, once it has succeeded. */
function expectPersist(page: Page, lang: Lang): Promise<void> {
    return page.waitForResponse(r => {
        const req = r.request();
        if (req.method() !== 'PATCH' || !/\/users\/me$/.test(r.url())) return false;
        const body = req.postDataJSON() as { preferred_language?: string } | null;
        return body?.preferred_language === lang;
    }, { timeout: 10_000 }).then(r => {
        expect(r.status(), `PATCH /users/me preferred_language=${lang}`).toBe(200);
    });
}

/** Loads the weekly recap fresh and returns the language the SERVER rendered it in. */
async function weeklyLang(page: Page, lang: Lang): Promise<string> {
    const resp = page.waitForResponse(r => r.url().includes('/api/v1/reports/weekly') && r.request().method() === 'GET');
    await page.goto(`/${lang}/pages/reports/weekly`);
    const json = (await (await resp).json()) as { meta?: { lang?: string } };
    await expect(page.getByTestId('wr-body')).toBeVisible({ timeout: 30_000 });
    return json.meta?.lang ?? '';
}

async function switchViaPalette(page: Page, from: Lang, to: Lang): Promise<void> {
    await page.goto(`/${from}/`);
    await expect(page.locator('.layout-topbar')).toBeVisible({ timeout: 30_000 });
    await chord(page);
    const input = page.getByTestId('palette-input');
    await expect(input).toBeFocused();
    // Accent-insensitive search: "francais" finds "Passer en français".
    await input.fill(to === 'en' ? 'english' : 'francais');
    const persisted = expectPersist(page, to);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`^[^/]*//[^/]+/${to}(/|$)`), { timeout: 15_000 });
    await persisted;
}

async function switchViaPreferences(page: Page, from: Lang, to: Lang): Promise<void> {
    await page.goto(`/${from}/pages/settings/preferences`);
    await expect(page.locator('app-settings-preferences')).toBeVisible({ timeout: 30_000 });
    // The language select is the first field of the region card.
    await page.locator('app-settings-preferences p-select').first().click();
    const persisted = expectPersist(page, to);
    await page.locator('.p-select-option, li[role=option]', { hasText: to === 'en' ? 'English' : 'Français' }).first().click();
    await expect(page).toHaveURL(new RegExp(`/${to}/pages/settings/preferences`), { timeout: 15_000 });
    await persisted;
}

test.describe('language switch persists on the profile', () => {
    test.setTimeout(6 * 60_000);

    test('palette and preferences switches PATCH the profile and the server renders in it', async ({ browser, request }) => {
        const seed = await browser.newPage();
        const { user, token } = await login(seed);
        const cookies = await seed.context().cookies();
        await seed.close();

        const failures: string[] = [];
        const combos = [
            ['desktop', { width: 1440, height: 900 }, 'light', 'palette'],
            ['390px', { width: 390, height: 844 }, 'dark', 'preferences'],
        ] as const;

        try {
            for (const [vp, viewport, theme, surface] of combos) {
                const ctx = await browser.newContext({ viewport });
                await ctx.addCookies(cookies);
                const page = await ctx.newPage();
                const errors: string[] = [];
                page.on('pageerror', e => errors.push(e.message));
                await pin(page, user, theme);
                const label = `${vp}/${theme}/${surface}`;
                const go = surface === 'palette' ? switchViaPalette : switchViaPreferences;
                try {
                    // FR -> EN
                    await go(page, 'fr', 'en');
                    expect(await weeklyLang(page, 'en'), `${label} recap rendered in EN after the switch`).toBe('en');
                    const isDark = await page.evaluate(() => document.documentElement.classList.contains('app-dark'));
                    expect(isDark, `${label} theme`).toBe(theme === 'dark');
                    // EN -> FR (leaves the demo account where it started)
                    await go(page, 'en', 'fr');
                    expect(await weeklyLang(page, 'fr'), `${label} recap rendered in FR after switching back`).toBe('fr');
                } catch (e) {
                    failures.push(`${label}: ${(e as Error).message.split('\n')[0]} (at ${page.url()})`);
                }
                if (errors.length) failures.push(`${label}: page errors: ${errors.join(' | ')}`);
                await ctx.close();
            }
        } finally {
            // Whatever happened above, hand the demo account back in FR so the
            // other specs (and the owner's local session) see the seeded state.
            if (token) {
                await request.patch(`${API}/users/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                    data: { preferred_language: 'fr' },
                }).catch(() => undefined);
            }
        }
        expect(failures, failures.join('\n')).toEqual([]);
    });
});
