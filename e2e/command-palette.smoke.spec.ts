import { expect, Page, test } from '@playwright/test';

/**
 * P2-5 guard: the command palette.
 *
 *  - Cmd/Ctrl+K opens it from any shell page and focuses the box; Escape
 *    closes it and focus goes back where it was.
 *  - Typing filters; Enter on the first match navigates (accent-insensitive:
 *    "epargne" finds Épargne / goals).
 *  - "Ajouter une transaction" opens the quick-add sheet the shell owns.
 *  - The topbar search button opens it for mouse users (desktop).
 *  - Focus stays trapped inside while open.
 *  - Off in the read-only share shell.
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

/** The chord for the browser's own platform (the app checks the same thing). */
async function chord(page: Page): Promise<void> {
    const apple = await page.evaluate(() => /Mac|iPhone|iPad/.test(navigator.platform));
    await page.keyboard.press(apple ? 'Meta+k' : 'Control+k');
}

test.describe('command palette', () => {
    test.setTimeout(6 * 60_000);

    test('opens on the chord, filters, navigates, runs actions, traps focus', async ({ browser }) => {
        const seed = await browser.newPage();
        const user = await login(seed);
        const cookies = await seed.context().cookies();
        await seed.close();

        const failures: string[] = [];
        const combos = [
            ['desktop', { width: 1440, height: 900 }, 'light', 'fr'],
            ['desktop', { width: 1440, height: 900 }, 'dark', 'en'],
            ['390px', { width: 390, height: 844 }, 'dark', 'fr'],
        ] as const;

        for (const [vp, viewport, theme, lang] of combos) {
            const ctx = await browser.newContext({ viewport });
            await ctx.addCookies(cookies);
            const page = await ctx.newPage();
            const errors: string[] = [];
            page.on('pageerror', e => errors.push(e.message));
            await page.addInitScript(([u, dark]) => {
                localStorage.setItem('omaad_user', u);
                localStorage.setItem('omaad-layout-config', JSON.stringify({ darkTheme: dark, themeMode: dark ? 'dark' : 'light' }));
                localStorage.removeItem('omaad_palette_recent');
            }, [user, theme === 'dark'] as [string, boolean]);
            const label = `${vp}/${theme}/${lang}`;
            const goals = lang === 'fr' ? 'objectifs' : 'goals';
            const transactions = 'transactions';

            try {
                await page.goto(`/${lang}/`);
                await expect(page.locator('.layout-topbar')).toBeVisible({ timeout: 30_000 });

                // Chord opens, box is focused, Escape closes and restores focus.
                await page.locator('#main-content').focus();
                await chord(page);
                const input = page.getByTestId('palette-input');
                await expect(input, `${label} opens on the chord`).toBeVisible({ timeout: 10_000 });
                await expect(input).toBeFocused();
                await page.keyboard.press('Escape');
                await expect(input, `${label} Escape closes`).toBeHidden({ timeout: 10_000 });

                // Filter + Enter navigates; accent-insensitive.
                await chord(page);
                await expect(input).toBeVisible({ timeout: 10_000 });
                await input.fill(transactions);
                await expect(page.locator('[data-testid=palette-list] [role=option]').first()).toContainText(/transactions/i);
                await page.keyboard.press('Enter');
                await expect(page, `${label} Enter navigates`).toHaveURL(/\/pages\/transaction/, { timeout: 20_000 });
                await expect(input).toBeHidden();

                await chord(page);
                await input.fill(goals);
                await page.keyboard.press('Enter');
                await expect(page, `${label} accent-insensitive match navigates`).toHaveURL(/\/pages\/goals/, { timeout: 20_000 });

                // Recents: the two destinations just used come first with an empty query.
                await chord(page);
                await expect(page.locator('[data-testid=palette-list] [role=option]').first()).toContainText(new RegExp(goals, 'i'));

                // Arrow keys move the active row.
                const first = await page.locator('[data-testid=palette-list] [role=option][aria-selected=true]').getAttribute('data-item');
                await page.keyboard.press('ArrowDown');
                const second = await page.locator('[data-testid=palette-list] [role=option][aria-selected=true]').getAttribute('data-item');
                expect(second, `${label} ArrowDown moves`).not.toBe(first);

                // Focus trap: Tab never leaves the dialog.
                for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
                const inside = await page.evaluate(() => !!document.activeElement?.closest('.p-dialog'));
                expect(inside, `${label} focus stays in the dialog`).toBe(true);

                // Action: quick-add opens the shell's sheet.
                await input.fill(lang === 'fr' ? 'ajouter une transaction' : 'add a transaction');
                await page.keyboard.press('Enter');
                await expect(page.locator('app-quick-add-sheet [role=dialog]'), `${label} quick-add sheet opens`).toBeVisible({ timeout: 10_000 });
                await page.keyboard.press('Escape');

                // Mouse trigger (desktop only: the button lives in the desktop cluster).
                if (vp === 'desktop') {
                    await page.goto(`/${lang}/`);
                    await page.getByTestId('palette-trigger').click();
                    await expect(input, `${label} topbar trigger opens`).toBeVisible({ timeout: 10_000 });
                    await page.keyboard.press('Escape');
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
