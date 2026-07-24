import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility smoke (S7-1). Scans the public (no-auth) surface with axe-core
 * against WCAG 2.1 A/AA. The audit's named gap was "no a11y testing" — this is
 * the harness.
 *
 * Gate: ZERO `critical` violations (unlabeled controls, nameless buttons,
 * missing image text — genuine blockers). `serious` findings (currently the
 * brand color-contrast set) are logged, not gated: fixing them means re-tuning
 * global brand tokens, an owner design decision tracked separately. Flip
 * GATE_SERIOUS to true once that palette pass lands.
 */
const GATE_SERIOUS = false;
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
