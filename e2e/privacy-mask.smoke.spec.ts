import { expect, Page, test } from '@playwright/test';

/**
 * P0-3 guard: with the privacy eye shut, no amount stays readable.
 *
 * Why this test exists. Privacy used to live only inside `<app-amount>`, which
 * covers template text and nothing else. Everything that needs a STRING (chart
 * tooltips, axis ticks, aria-labels, select option labels, the coaching
 * sentences, the native-currency spec rows on an asset) went straight round it.
 * The dashboard hero was the visible case: net worth blurred while the income
 * and expenses directly beneath it stayed perfectly legible, which is exactly
 * the over-the-shoulder situation the toggle is for.
 *
 * The check is deliberately blunt: walk the app with amounts hidden, read every
 * visible string, and fail on anything that still looks like money. It is the
 * only shape of test that catches the NEXT bypass rather than just the ones
 * already fixed.
 *
 * Prereqs (local): ng serve :4200, backend :8000 on omaad_dev, demo user.
 */

const EMAIL = process.env.E2E_EMAIL || 'demo@omaad.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'OmaadDemo2026!';

/**
 * Money-shaped text: four or more digits in a row, or digits carrying a
 * thousands separator (space, narrow no-break space, comma or dot between digit
 * groups). Deliberately excludes what legitimately survives privacy mode:
 * percentages, small counts, dates and years are all shorter or differently
 * shaped, and are filtered below.
 */
const MONEY = /\d[\d    ]{3,}\d|\d{4,}|\d{1,3}(?:[.,]\d{3})+/;

/**
 * Things that match MONEY but are not amounts, so they legitimately stay
 * readable with the eye shut. Dates are the bulk of it: a four-digit year trips
 * the money pattern, and the app renders them in a dozen shapes across FR and
 * EN. A month name is the reliable tell, because no formatted amount contains
 * one.
 */
function isBenign(text: string): boolean {
    const s = text.trim().replace(/^[·•\-–\s]+/, '');
    // Percentages and scores ("78 %", "+12,5 %", "34 / 100").
    if (/^[+\-−]?\s*\d[\d.,\s]*\s*%$/.test(s)) return true;
    if (/^\d+\s*\/\s*\d+$/.test(s)) return true;
    // Dates: bare year, ISO, numeric, or anything carrying a month name.
    if (/^(19|20)\d{2}$/.test(s)) return true;
    if (/^\d{4}-\d{2}-\d{2}([T\s].*)?$/.test(s)) return true;
    if (/^\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}$/.test(s)) return true;
    const MONTHS = /(janv|févr|fevr|mars|avr|mai|juin|juil|août|aout|sept|oct|nov|déc|dec|jan|feb|apr|may|jun|jul|aug|sep|nov|dec)[a-zé.]*/i;
    if (MONTHS.test(s) && !/\d[\d    ]{3,}\d\s*(FCFA|€|\$)/.test(s)) return true;
    // Units, not money: surfaces, durations, counts of things.
    if (/\b\d[\d\s.,]*\s?(m²|m2|ans?|years?|mois|months?|jours?|days?|membres?|members?)\b/i.test(s)) return true;
    return false;
}

async function login(page: Page): Promise<void> {
    await page.goto('/fr/auth/login');
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password input').fill(PASSWORD);
    await page.locator('button[type=submit]').first().click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 30_000 });
}

/**
 * Pin privacy mode ON, and the session hint present, for every document load in
 * the sweep.
 *
 * An init script rather than a one-off `localStorage.setItem`, because this
 * walks six screens as six cold loads. The access token lives in memory only,
 * so each load re-runs `/auth/refresh`, and firing six of those in half a minute
 * races the cookie rotation: one load reads a token another has already rotated,
 * takes a definitive 401, and authGuard correctly clears the session, after
 * which the sweep is inspecting the login screen instead of the app. That is an
 * artefact of hammering reloads, not something a person does, so the harness
 * carries its own hint rather than the product being bent around it.
 */
async function pinSession(page: Page): Promise<void> {
    const user = await page.evaluate(() => localStorage.getItem('omaad_user'));
    expect(user, 'login did not persist a profile, cannot sweep').toBeTruthy();
    await page.addInitScript(
        ([u]) => {
            localStorage.setItem('omaad_privacy_hidden', 'true');
            if (u) localStorage.setItem('omaad_user', u);
        },
        [user] as [string | null],
    );
}

/** Open an app route and be sure we are actually LOOKING at it: a sweep that
 *  silently examines the login screen would report "nothing readable" and mean
 *  nothing at all. */
async function openHidden(page: Page, url: string): Promise<void> {
    await page.goto(url);
    await expect(page.locator('.layout-topbar'), `never reached ${url} (at ${page.url()})`)
        .toBeVisible({ timeout: 30_000 });
    // Let the deferred widgets and their charts settle before reading.
    await page.waitForTimeout(5000);
}

/**
 * Every money-shaped string still visible on the page, with its element, so a
 * failure names the leak instead of just asserting that one exists.
 */
async function visibleMoney(page: Page): Promise<string[]> {
    return page.evaluate(
        ({ moneySrc, benignSrc }) => {
            const money = new RegExp(moneySrc);
            const isBenign = new Function('text', `return (${benignSrc})(text)`) as (t: string) => boolean;
            const hits: string[] = [];
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            for (let n = walker.nextNode(); n; n = walker.nextNode()) {
                const text = (n.textContent || '').trim();
                if (!text || !money.test(text) || isBenign(text)) continue;
                const el = n.parentElement;
                if (!el) continue;
                // Only what a shoulder-surfer can actually read.
                const style = getComputedStyle(el);
                if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) continue;
                if (!el.getClientRects().length) continue;
                hits.push(`<${el.tagName.toLowerCase()}${el.className ? ' class="' + String(el.className).slice(0, 60) + '"' : ''}> ${text.slice(0, 90)}`);
            }
            return hits;
        },
        { moneySrc: MONEY.source, benignSrc: isBenign.toString() },
    );
}

const PAGES = [
    ['dashboard', '/fr/'],
    ['patrimoine', '/fr/pages/patrimoine'],
    ['transactions', '/fr/pages/transaction'],
    ['goals', '/fr/pages/goals'],
    ['insights', '/fr/pages/insights'],
    ['debts', '/fr/pages/debts'],
] as const;

test.describe('privacy mode', () => {
    /**
     * All six screens in ONE test, on one login, on purpose. A test per screen
     * reads better but signs in seven times a run, and `/auth/login` is rate
     * limited to 10/minute: the suite then throttles itself and starts failing
     * with "no shell" on whichever screen happens to draw the 429, which looks
     * exactly like a product bug and is not one. The assertion still names the
     * screen, so a real leak is no harder to place.
     */
    test('no amount survives the eye toggle, on any money screen', async ({ page }) => {
        await login(page);
        await pinSession(page);

        const leaks: string[] = [];
        for (const [name, url] of PAGES) {
            await openHidden(page, url);
            for (const hit of await visibleMoney(page)) leaks.push(`[${name}] ${hit}`);
        }
        expect(leaks, `readable amounts with privacy on:\n${leaks.join('\n')}`).toEqual([]);
    });

    test('the toggle actually reverses: amounts come back', async ({ page }) => {
        await login(page);
        await pinSession(page);
        await openHidden(page, '/fr/');
        expect(await visibleMoney(page)).toEqual([]);

        // A mask nobody can lift is not a privacy feature, it is a broken screen.
        await page.locator('.layout-topbar-action').filter({ has: page.locator('.pi-eye-slash') }).first().click();
        await page.waitForTimeout(2500);
        expect((await visibleMoney(page)).length, 'amounts must be readable again').toBeGreaterThan(0);
    });
});
