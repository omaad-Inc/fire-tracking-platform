import { expect, Page, test } from '@playwright/test';

/**
 * P2-1 smoke: every settings section and every auth screen still renders once
 * it ships as its own lazy chunk.
 *
 * Why this test exists. `settings.routes.ts` and `auth.routes.ts` used to import
 * their fifteen screens statically, so the route chunk carried all of them.
 * P2-1 turned each into `loadComponent: () => import(...)`. The size win is
 * measured at build time (`tools/lazy-routes-guard.mjs` fails the build if a
 * static `component:` comes back); what this spec guards is the OTHER failure
 * mode of a code split: a wrong export name or a component that only worked
 * because a sibling's import had side effects, which surfaces as a blank
 * outlet on exactly one screen. So: walk all of them, in both languages, both
 * themes, desktop and 390px, and require the section host to be visible with
 * no page error.
 *
 * Prereqs (local): ng serve :4200, backend :8000 on omaad_dev, demo user.
 */

const EMAIL = process.env.E2E_EMAIL || 'demo@omaad.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'OmaadDemo2026!';

const VIEWPORTS = [
    ['desktop', { width: 1440, height: 900 }],
    ['390px', { width: 390, height: 844 }],
] as const;
const THEMES = ['light', 'dark'] as const;
const LANGS = ['fr', 'en'] as const;

const SETTINGS_SECTIONS: ReadonlyArray<readonly [string, string]> = [
    ['account', 'app-settings-account'],
    ['security', 'app-settings-security'],
    ['connections', 'app-connections-settings'],
    ['preferences', 'app-settings-preferences'],
    ['categories', 'app-settings-categories'],
    ['alerts', 'app-settings-alerts'],
    ['notifications', 'app-settings-notifications'],
    ['subscription', 'app-settings-subscription'],
    ['help', 'app-settings-help'],
];

const AUTH_SCREENS: ReadonlyArray<readonly [string, string]> = [
    ['login', 'app-login'],
    ['register', 'app-register'],
    ['forgot-password', 'app-forgot-password'],
    ['reset-password', 'app-reset-password'],
    ['verify-email', 'app-verify-email'],
];

async function login(page: Page): Promise<void> {
    await page.goto('/fr/auth/login');
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password input').fill(PASSWORD);
    await page.locator('button[type=submit]').first().click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 30_000 });
}

/**
 * Pin the theme and (when signed in) the session profile for every document
 * load. Same reasoning as privacy-mask.smoke.spec.ts: the sweep is dozens of
 * cold loads, each re-running /auth/refresh, and that many in a row race the
 * refresh-cookie rotation. The theme goes through the same layout-config key
 * the app itself persists, so the pass exercises the real dark palette.
 */
async function pin(page: Page, theme: 'light' | 'dark', user: string | null): Promise<void> {
    await page.addInitScript(
        ([dark, u]) => {
            // themeMode is what LayoutService applies on boot (the stored config
            // is merged over defaults that say 'light'); darkTheme alone is ignored.
            localStorage.setItem('omaad-layout-config', JSON.stringify({ darkTheme: dark, themeMode: dark ? 'dark' : 'light' }));
            if (u) localStorage.setItem('omaad_user', u);
        },
        [theme === 'dark', user] as [boolean, string | null],
    );
}

function collectErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    return errors;
}

async function expectTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('app-dark'));
    expect(isDark, `expected ${theme} theme`).toBe(theme === 'dark');
}

test.describe('lazy settings and auth chunks', () => {
    // Each sweep is dozens of cold loads on purpose (one login for the whole
    // file, see below); the default 60s budget is for a single screen.
    test.setTimeout(10 * 60_000);

    test('every settings section renders in FR/EN, light/dark, desktop/390px', async ({ browser }) => {
        // One login for the whole sweep: /auth/login is rate limited 10/minute.
        const seed = await browser.newPage();
        await login(seed);
        // The profile is persisted by the /auth/me follow-up, a beat after the
        // redirect away from /auth/login, so wait for it rather than read once.
        await expect
            .poll(() => seed.evaluate(() => localStorage.getItem('omaad_user')), {
                message: 'login did not persist a profile, cannot sweep',
                timeout: 15_000,
            })
            .toBeTruthy();
        const user = await seed.evaluate(() => localStorage.getItem('omaad_user'));
        const cookies = await seed.context().cookies();
        await seed.close();

        const failures: string[] = [];
        for (const [vpName, viewport] of VIEWPORTS) {
            for (const theme of THEMES) {
                const context = await browser.newContext({ viewport });
                await context.addCookies(cookies);
                const page = await context.newPage();
                const errors = collectErrors(page);
                await pin(page, theme, user);

                for (const lang of LANGS) {
                    for (const [section, host] of SETTINGS_SECTIONS) {
                        const label = `${vpName}/${theme}/${lang}/settings/${section}`;
                        await page.goto(`/${lang}/pages/settings/${section}`);
                        try {
                            await expect(page.locator(host), label).toBeVisible({ timeout: 20_000 });
                            await expect(page, label).toHaveURL(new RegExp(`/${lang}/pages/settings/${section}`));
                            await expectTheme(page, theme);
                        } catch (e) {
                            failures.push(`${label}: ${(e as Error).message.split('\n')[0]} (at ${page.url()})`);
                        }
                    }
                }
                if (errors.length) failures.push(`${vpName}/${theme}: page errors: ${errors.join(' | ')}`);
                await context.close();
            }
        }
        expect(failures, failures.join('\n')).toEqual([]);
    });

    test('every auth screen renders in FR/EN, light/dark, desktop/390px', async ({ browser }) => {
        const failures: string[] = [];
        for (const [vpName, viewport] of VIEWPORTS) {
            for (const theme of THEMES) {
                const context = await browser.newContext({ viewport });
                const page = await context.newPage();
                const errors = collectErrors(page);
                await pin(page, theme, null);

                for (const lang of LANGS) {
                    for (const [screen, host] of AUTH_SCREENS) {
                        const label = `${vpName}/${theme}/${lang}/auth/${screen}`;
                        await page.goto(`/${lang}/auth/${screen}`);
                        try {
                            await expect(page.locator(host), label).toBeVisible({ timeout: 20_000 });
                            // No theme assertion here: signed-out screens deliberately
                            // ignore the stored preference and render light, so the
                            // "dark" pass only proves a stale pref cannot break them.
                        } catch (e) {
                            failures.push(`${label}: ${(e as Error).message.split('\n')[0]} (at ${page.url()})`);
                        }
                    }
                }
                if (errors.length) failures.push(`${vpName}/${theme}: page errors: ${errors.join(' | ')}`);
                await context.close();
            }
        }
        expect(failures, failures.join('\n')).toEqual([]);
    });
});
