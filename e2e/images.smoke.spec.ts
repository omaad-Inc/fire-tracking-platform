import { expect, test } from '@playwright/test';

/**
 * P2-7 guard: images on the prerendered blog routes load the way LCP and CLS
 * want them to.
 *
 *  - Every rendered <img> has width and height (no layout shift on arrival).
 *  - On the list, cover cards are lazy.
 *  - On an article, the cover is the LCP candidate: eager, fetchpriority=high
 *    (NgOptimizedImage `priority`), never lazy.
 *  - NgOptimizedImage's own dev-mode diagnostics (NG0291x: wrong aspect ratio,
 *    oversized file, missing sizes) stay silent: a warning there means a size
 *    hint no longer matches the rendered box.
 *
 * Public routes, no login. Prereqs (local): ng serve :4200.
 */

test.describe('blog images', () => {
    test('list covers are sized and lazy, the article cover is sized and prioritized', async ({ page }) => {
        const imgWarnings: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'warning' && /NG0291\d|NgOptimizedImage/.test(msg.text())) imgWarnings.push(msg.text().slice(0, 160));
        });

        await page.goto('/fr/blog');
        await expect(page.locator('img').first()).toBeVisible({ timeout: 30_000 });
        // Sized = width+height hints, or NgOptimizedImage fill (absolutely
        // positioned inside a box that owns the size, so it cannot shift layout).
        const unsizedOf = () => [...document.querySelectorAll('img')]
            .filter(i => !((i.getAttribute('width') && i.getAttribute('height')) || getComputedStyle(i).position === 'absolute'))
            .map(i => i.getAttribute('src') || i.getAttribute('alt') || '?');
        const unsized = await page.evaluate(unsizedOf);
        expect(unsized, 'list: every img declares width and height').toEqual([]);
        const covers = page.locator('img[src*="blog/covers"]');
        expect(await covers.count(), 'list: covers rendered').toBeGreaterThan(2);
        const lazy = await covers.evaluateAll(els => els.map(e => e.getAttribute('loading')));
        expect(lazy.every(l => l === 'lazy'), 'list: all covers lazy').toBe(true);

        const firstSlug = await page.locator('a[href*="/blog/"]').filter({ has: covers.first() }).first().getAttribute('href');
        expect(firstSlug).toBeTruthy();
        await page.goto(firstSlug!);
        const hero = page.locator('img[src*="blog/covers"]').first();
        await expect(hero).toBeVisible({ timeout: 30_000 });
        expect(await hero.getAttribute('loading'), 'article: cover is not lazy').not.toBe('lazy');
        expect(await hero.getAttribute('fetchpriority'), 'article: cover is the LCP candidate').toBe('high');
        const heroBox = await hero.boundingBox();
        expect(heroBox && heroBox.width > 300 && heroBox.height > 150, 'article: cover fills its 16/9 box').toBe(true);
        const unsizedArticle = await page.evaluate(unsizedOf);
        expect(unsizedArticle, 'article: every img declares width and height').toEqual([]);

        await page.waitForTimeout(1500);
        expect(imgWarnings, `NgOptimizedImage diagnostics:\n${imgWarnings.join('\n')}`).toEqual([]);
    });
});
