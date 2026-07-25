import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility smoke (S7-1). Scans the public (no-auth) surface with axe-core
 * against WCAG 2.1 A/AA. The audit's named gap was "no a11y testing" — this is
 * the harness.
 *
 * Gate: ZERO `critical` AND ZERO `serious` violations. The S7-1 palette pass
 * cleared the brand color-contrast set to full WCAG AA (minimal-delta token
 * tuning: ochre-600, slate surface-500, positive; footer + login fixes), so
 * the gate now enforces both tiers — any regression fails CI.
 */
const GATE_SERIOUS = true;
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const PAGES: Array<[string, string]> = [
    ['landing FR', '/fr/landing'],
    ['landing EN', '/en/landing'],
    ['login', '/fr/auth/login'],
    ['fire-simulator', '/fr/tools/fire-simulator'],
    ['faq', '/fr/faq'],
    ['legal-privacy', '/fr/legal/privacy'],
];

for (const [name, url] of PAGES) {
    test(`a11y: ${name} has no critical violations`, async ({ page }) => {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
        await page.waitForTimeout(500);
        const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();

        const critical = results.violations.filter(v => v.impact === 'critical');
        const serious = results.violations.filter(v => v.impact === 'serious');
        if (serious.length) {
            console.log(`  [${name}] serious (not gated): ${serious.map(v => `${v.id}×${v.nodes.length}`).join(', ')}`);
        }
        expect(critical.map(v => `${v.id}: ${v.nodes.length}`)).toEqual([]);
        if (GATE_SERIOUS) expect(serious.map(v => v.id)).toEqual([]);
    });
}

// ── Authed surface: the add-asset wizard (S7b PA-5) ─────────────────
// Same ZERO critical + ZERO serious gate as the public pages. The wizard
// was cleaned in PA-2.1 (label association, contrast, empty-heading) and
// PA-3 (chooser badges); this pins it.

const EMAIL = process.env.E2E_EMAIL || 'demo@omaad.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'OmaadDemo2026!';

const WIZARD_SCREENS: Array<[string, string]> = [
    ['wizard catalog', '/fr/pages/patrimoine/add-asset'],
    ['wizard tontine form', '/fr/pages/patrimoine/add-asset?category=tontine'],
    ['wizard cash form', '/fr/pages/patrimoine/add-asset?category=cash'],
    ['wizard brvm form', '/fr/pages/patrimoine/add-asset?category=stocks_brvm'],
    ['stocks connect-broker chooser', '/fr/pages/patrimoine/connect-broker?market=brvm'],
];

for (const [name, url] of WIZARD_SCREENS) {
    test(`a11y: ${name} has no critical violations`, async ({ page }) => {
        await page.goto('/fr/auth/login');
        await page.locator('#email').fill(EMAIL);
        await page.locator('#password input').fill(PASSWORD);
        await page.locator('button[type=submit]').first().click();
        await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 20_000 });
        await page.waitForFunction(() => !!localStorage.getItem('omaad_user'), null, { timeout: 15_000 });

        await page.goto(url);
        await page.waitForSelector('h1', { timeout: 15_000 });
        await page.waitForTimeout(600);
        const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();

        const critical = results.violations.filter(v => v.impact === 'critical');
        const serious = results.violations.filter(v => v.impact === 'serious');
        if (serious.length) {
            console.log(`  [${name}] serious: ${serious.map(v => `${v.id}×${v.nodes.length}`).join(', ')}`);
        }
        expect(critical.map(v => `${v.id}: ${v.nodes.length}`)).toEqual([]);
        if (GATE_SERIOUS) expect(serious.map(v => v.id)).toEqual([]);
    });
}

test('a11y: wizard dual-path chooser has no critical violations', async ({ page }) => {
    await page.goto('/fr/auth/login');
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password input').fill(PASSWORD);
    await page.locator('button[type=submit]').first().click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 20_000 });
    await page.waitForFunction(() => !!localStorage.getItem('omaad_user'), null, { timeout: 15_000 });

    await page.goto('/fr/pages/patrimoine/add-asset');
    await page.getByRole('button', { name: /Compte bancaire/ }).click();
    await page.waitForSelector('text=Connecter ma banque', { timeout: 10_000 });
    await page.waitForTimeout(400);
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();

    const critical = results.violations.filter(v => v.impact === 'critical');
    const serious = results.violations.filter(v => v.impact === 'serious');
    expect(critical.map(v => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    if (GATE_SERIOUS) expect(serious.map(v => v.id)).toEqual([]);
});

// S9-B1: the BRVM stock picker full-screen search sheet (opened dialog).
test('a11y: BRVM picker sheet has no critical violations', async ({ page }) => {
    await page.goto('/fr/auth/login');
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password input').fill(PASSWORD);
    await page.locator('button[type=submit]').first().click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 20_000 });
    await page.waitForFunction(() => !!localStorage.getItem('omaad_user'), null, { timeout: 15_000 });

    await page.goto('/fr/pages/patrimoine/add-asset?category=stocks_brvm');
    await page.locator('button[aria-labelledby="aa-brvm-label"]').click();
    await expect(page.locator('.brvm-sheet')).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(400);
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();

    const critical = results.violations.filter(v => v.impact === 'critical');
    const serious = results.violations.filter(v => v.impact === 'serious');
    expect(critical.map(v => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    if (GATE_SERIOUS) expect(serious.map(v => v.id)).toEqual([]);
});
