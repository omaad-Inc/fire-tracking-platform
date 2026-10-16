import { expect, test } from '@playwright/test';

/**
 * Landing redesign (2026-10) mechanical guarantees, at the viewports that
 * matter. Each one is a defect the audit measured on the previous page.
 */
test.describe('landing: first screen, nav sheet, structure', () => {
    test('phone: primary CTA and H1 inside the first screen, no overflow', async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
        const page = await ctx.newPage();
        await page.goto('/fr/landing', { waitUntil: 'networkidle' });
        const cta = page.locator('#hero a.lp-btn-primary');
        const box = await cta.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.y + box!.height).toBeLessThan(700);
        expect(box!.height).toBeGreaterThanOrEqual(44);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(overflow).toBe(false);
        // The sign-up action is visible OUTSIDE the menu on a phone.
        await expect(page.locator('header a.lp-btn-primary')).toBeVisible();
        await expect(page.locator('#hero img[fetchpriority="high"]')).toHaveAttribute('width', '780');
        await ctx.close();
    });

    test('320px: still no horizontal overflow', async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width: 320, height: 568 }, isMobile: true });
        const page = await ctx.newPage();
        await page.goto('/fr/landing', { waitUntil: 'networkidle' });
        expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
        await ctx.close();
    });

    test('phone menu is a dialog: focus moves in, Escape closes, focus returns', async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
        const page = await ctx.newPage();
        await page.goto('/fr/landing', { waitUntil: 'networkidle' });
        const menuBtn = page.getByRole('button', { name: 'Menu' });
        await menuBtn.click();
        const sheet = page.locator('#lp-sheet');
        await expect(sheet).toBeVisible();
        await expect(sheet).toHaveAttribute('role', 'dialog');
        await expect(page.getByRole('button', { name: 'Fermer le menu' })).toBeFocused();
        expect(await page.evaluate(() => document.body.classList.contains('lp-scroll-lock'))).toBe(true);
        await page.keyboard.press('Escape');
        await expect(sheet).toHaveCount(0);
        await expect(menuBtn).toBeFocused();
        expect(await page.evaluate(() => document.body.classList.contains('lp-scroll-lock'))).toBe(false);
        await ctx.close();
    });

    test('landmarks, one H1, no heading level skipped, every CTA is a link', async ({ page }) => {
        await page.goto('/fr/landing', { waitUntil: 'networkidle' });
        await expect(page.locator('header')).toHaveCount(1);
        await expect(page.locator('main')).toHaveCount(1);
        await expect(page.locator('footer')).toHaveCount(1);
        await expect(page.locator('h1')).toHaveCount(1);
        const levels = await page.locator('h1, h2, h3').evaluateAll((els) => els.map((e) => Number(e.tagName[1])));
        for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
        // Register CTAs are real links with the register destination.
        const hrefs = await page.locator('a.lp-btn-primary').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
        expect(hrefs.length).toBeGreaterThanOrEqual(4);
        hrefs.forEach((h) => expect(h).toMatch(/\/fr\/auth\/register/));
    });

    test('english landing is English (prerender parity)', async ({ page }) => {
        await page.goto('/en/landing', { waitUntil: 'networkidle' });
        await expect(page.locator('h1')).toHaveText('All your wealth, here and back home.');
        await expect(page.locator('html')).toHaveAttribute('lang', 'en');
        const faq = await page.locator('script[type="application/ld+json"]').allTextContents();
        expect(faq.join('')).toContain('"FAQPage"');
        expect(faq.join('')).toContain('"operatingSystem":"Web"');
    });

    test('stale copy is gone', async ({ page }) => {
        await page.goto('/fr/landing', { waitUntil: 'networkidle' });
        const text = await page.locator('body').innerText();
        for (const s of ["liste d'attente", 'Bientôt', 'Zéro tracking', 'Crypto']) expect(text).not.toContain(s);
    });
});
