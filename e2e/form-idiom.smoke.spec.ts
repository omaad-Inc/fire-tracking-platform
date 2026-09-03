import { expect, Page, test } from '@playwright/test';

/**
 * P1-5 guard: an `omaad-form` field must be visible against whatever it sits on.
 *
 * Fails on the pre-fix build. `omaad-form` filled its fields with
 * `--p-surface-100` and gave them `border: 1px solid transparent`, which works
 * only inside a dialog (surface-0 behind). `--p-surface-100` is the EXACT colour
 * of the app body ground, so the moment the idiom was used on an in-page card
 * the field became invisible in light mode: same fill as the page, no edge, no
 * shadow. Measured on the settings page before the fix: field
 * rgb(241,245,249) on a body of rgb(241,245,249).
 *
 * That is why this is a geometry/colour assertion rather than a screenshot: the
 * failure mode is "indistinguishable from the background", which a pixel diff
 * would happily accept as the new baseline.
 *
 * Also covers the native controls. `omaad-form` used to skin PrimeNG components
 * only, so a form built from plain <input>/<select> could not converge on it,
 * which is the drift P1-5 exists to remove.
 *
 * RUNNING THIS: /auth/login is rate limited 10/minute. These specs log in per
 * test (and the voices spec also logs in once via the API to seed), so running
 * both P1-5 guard files back-to-back trips the limit and every test then fails
 * on a screen that is actually the login page. That looks exactly like a real
 * regression and is not one. Run one file at a time, or space them ~2 minutes.
 *
 * Prereqs (local): ng serve :4200, backend :8000 on omaad_dev, demo user.
 */

const EMAIL = process.env.E2E_EMAIL || 'demo@omaad.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'OmaadDemo2026!';

async function login(page: Page) {
    await page.goto('/fr/auth/login');
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password input').fill(PASSWORD);
    await page.locator('button[type=submit]').first().click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 20_000 });
}

/** Parse `rgb()` / `rgba()` into components; alpha defaults to 1. */
function rgba(v: string): { r: number; g: number; b: number; a: number } {
    const m = v.match(/[\d.]+/g)?.map(Number) ?? [];
    return { r: m[0] ?? 0, g: m[1] ?? 0, b: m[2] ?? 0, a: m[3] ?? 1 };
}

test('omaad-form fields read as fields on an in-page surface, light and dark', async ({ page }) => {
    await login(page);
    const user = await page.evaluate(() => localStorage.getItem('omaad_user'));
    expect(user, 'login did not persist a profile, cannot sweep').toBeTruthy();

    for (const dark of [false, true]) {
        await page.addInitScript(([u, d]) => {
            if (u) localStorage.setItem('omaad_user', u as string);
            const raw = localStorage.getItem('omaad-layout-config');
            const cfg = raw ? JSON.parse(raw) : {};
            cfg.darkTheme = d === '1';
            cfg.themeMode = d === '1' ? 'dark' : 'light';
            localStorage.setItem('omaad-layout-config', JSON.stringify(cfg));
        }, [user, dark ? '1' : '0'] as [string | null, string]);

        await page.setViewportSize({ width: 1280, height: 950 });
        await page.goto('/fr/pages/settings/notifications');

        // The quiet-hours group is the migrated reference screen: two NATIVE
        // <input type="time"> and one PrimeNG p-select, all on `omaad-form`.
        const timeField = page.locator('#quiet-start');
        await expect(timeField).toBeVisible({ timeout: 30_000 });

        const probe = await timeField.evaluate(el => {
            const cs = getComputedStyle(el);
            // Nearest ancestor that actually paints a background.
            let node: HTMLElement | null = el.parentElement;
            let ground = 'rgb(255, 255, 255)';
            while (node) {
                const bg = getComputedStyle(node).backgroundColor;
                if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') { ground = bg; break; }
                node = node.parentElement;
            }
            return {
                fill: cs.backgroundColor,
                ground,
                borderColor: cs.borderTopColor,
                borderWidth: parseFloat(cs.borderTopWidth) || 0,
                radius: parseFloat(cs.borderTopLeftRadius) || 0,
                padding: parseFloat(cs.paddingLeft) || 0,
                colorScheme: cs.colorScheme,
            };
        });

        const label = dark ? 'dark' : 'light';

        // It must be a FIELD: rounded and padded, i.e. the idiom applied to a
        // native control at all.
        expect(probe.radius, `[${label}] native input did not get the omaad-form radius`)
            .toBeGreaterThan(4);
        expect(probe.padding, `[${label}] native input did not get the omaad-form padding`)
            .toBeGreaterThan(6);

        // And it must be DISTINGUISHABLE from its ground: either the fill
        // differs, or there is a real, non-transparent border.
        const fill = rgba(probe.fill);
        const ground = rgba(probe.ground);
        const fillDiffers =
            Math.abs(fill.r - ground.r) + Math.abs(fill.g - ground.g) + Math.abs(fill.b - ground.b) > 6;
        const border = rgba(probe.borderColor);
        const hasVisibleBorder = probe.borderWidth > 0 && border.a > 0.04;

        expect(
            fillDiffers || hasVisibleBorder,
            `[${label}] field is indistinguishable from its ground: fill ${probe.fill} on ${probe.ground}, border ${probe.borderWidth}px ${probe.borderColor}`,
        ).toBe(true);

        // Dark mode must hand native date/time controls a dark color-scheme, or
        // the browser paints their clock glyph in near-black on the dark fill
        // (the same trap as the P1-2 table checkboxes).
        if (dark) {
            expect(probe.colorScheme, '[dark] native control kept the light color-scheme').toContain('dark');
        }

        // The PrimeNG select in the same group must share the idiom, not just
        // the native inputs: that is the point of "one form idiom".
        const selectRadius = await page.locator('#quiet-tz').evaluate(el => {
            const box = (el.closest('.p-select') as HTMLElement) ?? el;
            return parseFloat(getComputedStyle(box).borderTopLeftRadius) || 0;
        });
        expect(selectRadius, `[${label}] the p-select did not adopt the field radius`).toBeGreaterThan(4);
    }
});

test('omaad-form: a leading icon never sits under the value', async ({ page }) => {
    // `omaad-form` sets `padding` with `!important`, which beats a
    // template-level `!pl-10` of equal weight on later source order. On
    // Settings -> Aide that drew the magnifier glyph on top of the placeholder.
    // `omaad-field-lead` reserves the room; this asserts the clearance, because
    // an icon overlapping text is invisible to tsc, to lint:dark and to a
    // screenshot baseline that simply re-records it.
    await login(page);
    await page.setViewportSize({ width: 1280, height: 950 });
    await page.goto('/fr/pages/settings/help');
    const input = page.locator('input[placeholder*="Rechercher"]').first();
    await expect(input).toBeVisible({ timeout: 30_000 });

    const clearance = await input.evaluate(el => {
        const cs = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        const icon = el.parentElement!.querySelector('i');
        if (!icon) return Number.POSITIVE_INFINITY;   // no leading icon: nothing to clear
        const textStart = box.left + parseFloat(cs.paddingLeft);
        return textStart - icon.getBoundingClientRect().right;
    });
    expect(clearance, 'the value starts under the leading icon').toBeGreaterThan(2);
});

test('the retired stat-card primitive is really gone', async ({ page }) => {
    // It had zero call sites for ~a year while six surfaces hand-rolled their
    // own KPI tiles, so it was deleted rather than left in limbo. If it ever
    // comes back it should be extracted from the real call sites.
    await login(page);
    await page.goto('/fr');
    await expect(page.locator('.layout-topbar')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('app-stat-card')).toHaveCount(0);
});
