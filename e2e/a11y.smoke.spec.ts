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
