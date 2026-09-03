import { expect, Page, test } from '@playwright/test';

/**
 * P3-2 guard: every PrimeNG component the app RENDERS has its theme tokens.
 *
 * The preset is composed from only the Aura component themes the app uses
 * (core/theme/aura-lean.ts) instead of all 75. `npm run theme:guard` checks
 * the imported modules statically; this probe checks the rendered DOM, which
 * also covers components PrimeNG draws INSIDE another one (the chips of a
 * multiselect, the message of a file upload) that app code never imports.
 *
 * PrimeNG injects one `<style data-primeng-style-id="<name>-variables">` per
 * component the first time it renders (BaseComponent._loadThemeStyles). A
 * component whose theme is missing from the preset injects an EMPTY one and
 * renders without tokens, silently. So on each page: every rendered PrimeNG
 * element whose Aura theme exists must have a non-empty variables style
 * declaring its `--p-<name>-*` tokens.
 *
 * Pages picked for coverage of the component set: transactions (table,
 * selects), add-asset (inputnumber, datepicker, select, dialog), security
 * (password, dialog, toast), preferences (select, toggleswitch), the home.
 *
 * Prereqs (local): ng serve :4200, backend :8000 on omaad_dev, demo user (Pro).
 */

const EMAIL = process.env.E2E_EMAIL || 'demo@omaad.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'OmaadDemo2026!';

/** Every component theme Aura ships (node_modules/@primeng/themes/aura/*). */
const AURA_THEMES = new Set(('accordion autocomplete avatar badge blockui breadcrumb button card carousel cascadeselect checkbox chip ' +
    'colorpicker confirmdialog confirmpopup contextmenu datatable dataview datepicker dialog divider dock drawer editor fieldset ' +
    'fileupload floatlabel galleria iconfield iftalabel image imagecompare inlinemessage inplace inputchips inputgroup inputnumber ' +
    'inputotp inputtext knob listbox megamenu menu menubar message metergroup multiselect orderlist organizationchart overlaybadge ' +
    'paginator panel panelmenu password picklist popover progressbar progressspinner radiobutton rating ripple scrollpanel select ' +
    'selectbutton skeleton slider speeddial splitbutton splitter stepper steps tabmenu tabs tabview tag terminal textarea timeline ' +
    'toast togglebutton toggleswitch toolbar tooltip tree treeselect treetable').split(' '));

/** Tags whose theme name differs from the tag, or which are internals of a parent. */
const TAG_TO_THEME: Record<string, string | null> = {
    table: 'datatable', sorticon: null, columnfilter: null, celleditor: null, tablebody: null, tableheadercheckbox: null,
    tablecheckbox: null, tableradiobutton: null, rowtoggler: null, inputicon: null, chart: null, scroller: null,
    overlay: null, toastitem: null, confirmdialog: null,
};

/** Directives render as plain elements carrying the component class. */
const CLASS_TO_THEME: Array<[string, string]> = [
    ['.p-button', 'button'], ['.p-inputtext', 'inputtext'], ['.p-textarea', 'textarea'], ['.p-ripple', 'ripple'],
];

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

/** Rendered PrimeNG theme names on the page, and the variables styles PrimeNG injected. */
async function probe(page: Page): Promise<{ rendered: string[]; missing: string[] }> {
    return page.evaluate(([tagMap, classMap, aura]) => {
        const names = new Set<string>();
        for (const el of Array.from(document.querySelectorAll('*'))) {
            const tag = el.tagName.toLowerCase();
            if (!tag.startsWith('p-')) continue;
            const key = tag.slice(2);
            const mapped = key in tagMap ? tagMap[key] : key;
            if (mapped) names.add(mapped);
        }
        for (const [sel, name] of classMap) {
            if (document.querySelector(sel)) names.add(name);
        }
        const rendered = Array.from(names).filter(n => aura.includes(n)).sort();
        const missing = rendered.filter(n => {
            const style = document.querySelector(`style[data-primeng-style-id="${n}-variables"]`);
            return !style || !(style.textContent ?? '').includes(`--p-${n}-`);
        });
        return { rendered, missing };
    }, [TAG_TO_THEME, CLASS_TO_THEME, Array.from(AURA_THEMES)] as [Record<string, string | null>, Array<[string, string]>, string[]]);
}

test.describe('lean PrimeNG preset covers every rendered component', () => {
    test.setTimeout(6 * 60_000);

    test('every rendered PrimeNG component has non-empty theme variables', async ({ browser }) => {
        const failures: string[] = [];
        const seen = new Set<string>();

        /** Wait until the page has rendered `mustSee`, then check every rendered component. */
        async function check(page: Page, label: string, url: string, mustSee: readonly string[], theme: 'light' | 'dark'): Promise<void> {
            try {
                await page.goto(url);
                // Data-gated components (skeleton first, toggles once prefs load) appear late.
                await expect.poll(async () => {
                    const r = (await probe(page)).rendered;
                    return r.length > 0 && mustSee.every(n => r.includes(n));
                }, { timeout: 30_000, message: `${label} never rendered ${mustSee.join('+') || 'any PrimeNG component'}` }).toBe(true);
                await page.waitForTimeout(300);
                const { rendered, missing } = await probe(page);
                rendered.forEach(n => seen.add(n));
                if (missing.length) failures.push(`${label}: rendered without theme tokens: ${missing.join(', ')}`);
                const isDark = await page.evaluate(() => document.documentElement.classList.contains('app-dark'));
                if (isDark !== (theme === 'dark')) failures.push(`${label}: theme mismatch`);
            } catch (e) {
                failures.push(`${label}: ${(e as Error).message.split('\n')[0]} (at ${page.url()})`);
            }
        }

        // Signed-out first: the login screen is where p-password renders unconditionally.
        const seed = await browser.newPage();
        await check(seed, 'desktop/light/fr /auth/login', '/fr/auth/login', ['password', 'inputtext', 'button'], 'light');
        const user = await login(seed);
        const cookies = await seed.context().cookies();
        await seed.close();

        const combos = [
            ['desktop', { width: 1440, height: 900 }, 'light', 'fr', [
                ['/pages/transaction', ['datatable', 'button']],
                ['/pages/goals?tab=fire', ['inputnumber', 'datepicker']],
                ['/pages/settings/notifications', ['toggleswitch']],
                ['/pages/patrimoine/add-asset', []],
                ['/', []],
            ]],
            ['390px', { width: 390, height: 844 }, 'dark', 'en', [
                ['/pages/settings/preferences', ['select']],
                ['/pages/settings/notifications', ['toggleswitch']],
                ['/pages/goals?tab=fire', ['inputnumber']],
                ['/pages/transaction', []],
            ]],
        ] as const;

        for (const [vp, viewport, theme, lang, pages] of combos) {
            const ctx = await browser.newContext({ viewport });
            await ctx.addCookies(cookies);
            const page = await ctx.newPage();
            const errors: string[] = [];
            page.on('pageerror', e => errors.push(e.message));
            await pin(page, user, theme);
            for (const [path, mustSee] of pages) {
                await check(page, `${vp}/${theme}/${lang} ${path}`, `/${lang}${path}`, mustSee, theme);
            }
            if (errors.length) failures.push(`${vp}/${theme}: page errors: ${errors.join(' | ')}`);
            await ctx.close();
        }
        // The probe must have exercised the components the app leans on most.
        for (const must of ['button', 'inputtext', 'select', 'inputnumber', 'datepicker', 'dialog', 'toast', 'datatable', 'toggleswitch', 'password']) {
            if (!seen.has(must)) failures.push(`probe never saw a rendered ${must}; the page list no longer covers it`);
        }
        expect(failures, failures.join('\n')).toEqual([]);
    });
});
