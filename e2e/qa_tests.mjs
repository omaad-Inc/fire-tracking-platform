/**
 * Afrin Nexus E2E QA Tests
 * Uses Puppeteer to verify the frontend against the deployed app.
 *
 * Run: node frontend/e2e/qa_tests.mjs
 *
 * Requires Puppeteer: npm install puppeteer (or use the one at /tmp/screenshot_project/node_modules)
 */

import puppeteer from '/tmp/screenshot_project/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';

const BASE_URL = 'http://localhost:4200';
const DEMO_EMAIL = 'demo@afrinnexus.app';
const DEMO_PASS = 'Demo2024!';

let passed = 0;
let failed = 0;
const errors = [];

async function test(name, fn) {
    try {
        await fn();
        console.log(`  ✓ PASS  ${name}`);
        passed++;
    } catch (err) {
        console.log(`  ✗ FAIL  ${name}`);
        console.log(`         ${err.message}`);
        failed++;
        errors.push({ name, error: err.message });
    }
}

function assert(condition, msg) {
    if (!condition) throw new Error(msg || 'Assertion failed');
}

async function loginIfNeeded(page) {
    const url = page.url();
    if (url.includes('/auth/login') || url.includes('/auth/register')) {
        await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
        const emailInput = await page.$('input[type="email"]') || await page.$('input[name="email"]');
        if (emailInput) {
            await emailInput.type(DEMO_EMAIL);
            const passInput = await page.$('input[type="password"]');
            if (passInput) {
                await passInput.type(DEMO_PASS);
                await page.keyboard.press('Enter');
                await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
            }
        }
    }
}

async function runTests() {
    console.log('\nAfrin Nexus E2E QA Tests\n');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(15000);

    // Collect JS errors
    const jsErrors = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    // ─── Test 1: Landing page loads ───────────────────────────────────────────
    await test('Landing page loads with liberté text', async () => {
        await page.goto(`${BASE_URL}/fr`, { waitUntil: 'networkidle2' });
        const content = await page.content();
        assert(content.toLowerCase().includes('liberté') || content.includes('Construisez'), 'Hero text not found');
    });

    // ─── Test 2: Login page has Google button, no Apple button ────────────────
    await test('Login page: Google button present, Apple button absent', async () => {
        await page.goto(`${BASE_URL}/fr/auth/login`, { waitUntil: 'networkidle2' });
        const content = await page.content();
        assert(content.includes('Google') || content.includes('google'), 'Google button not found');
        assert(!content.includes('Apple') && !content.includes('apple-logo'), 'Apple button should be removed');
    });

    // ─── Test 3: Register page has no fake stats ──────────────────────────────
    await test('Register page: no fake stats (10K, 50M, 4.8)', async () => {
        await page.goto(`${BASE_URL}/fr/auth/register`, { waitUntil: 'networkidle2' });
        const content = await page.content();
        assert(!content.includes('10K+'), '10K+ fake stat found — should be removed');
        assert(!content.includes('50M+') && !content.includes('€50M'), '€50M fake stat found');
        assert(!content.includes('4.8/5'), '4.8/5 fake rating found');
    });

    // ─── Login to access dashboard ────────────────────────────────────────────
    await page.goto(`${BASE_URL}/fr/auth/login`, { waitUntil: 'networkidle2' });
    try {
        await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
        const emailInput = await page.$('input[type="email"]') || await page.$('input[name="email"]');
        if (emailInput) {
            await emailInput.type(DEMO_EMAIL);
            const passInput = await page.$('input[type="password"]');
            if (passInput) {
                await passInput.type(DEMO_PASS);
                await page.keyboard.press('Enter');
                await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
            }
        }
    } catch (_) {
        // login flow may vary
    }

    // ─── Test 4: Dark theme applied ───────────────────────────────────────────
    await test('Dashboard: dark theme (html.app-dark class) applied', async () => {
        await page.goto(`${BASE_URL}/fr`, { waitUntil: 'networkidle2' });
        await loginIfNeeded(page);
        const hasDark = await page.evaluate(() => document.documentElement.classList.contains('app-dark'));
        assert(hasDark, 'html.app-dark class not present — dark theme not applied');
    });

    // ─── Test 5: Net worth KPI shows a number ─────────────────────────────────
    await test('Dashboard: net worth KPI shows a numeric value', async () => {
        const content = await page.content();
        // Should contain a € currency value somewhere (net worth card)
        const hasEuro = content.includes('€') || content.includes('EUR');
        assert(hasEuro, 'No EUR/€ currency value found on dashboard');
    });

    // ─── Test 6: Patrimoine page renders assets ───────────────────────────────
    await test('Patrimoine: asset list renders at least 1 row', async () => {
        await page.goto(`${BASE_URL}/fr/pages/patrimoine`, { waitUntil: 'networkidle2' });
        await loginIfNeeded(page);
        await page.waitForTimeout(2000);
        const content = await page.content();
        // Should contain some asset (the page shows a list)
        const hasAsset = content.includes('Appartement') || content.includes('Bitcoin') || content.includes('BRVM') || content.includes('du patrimoine');
        assert(hasAsset, 'No asset data visible on patrimoine page');
    });

    // ─── Test 7: Transactions page loads ─────────────────────────────────────
    await test('Transactions: page loads without crash', async () => {
        await page.goto(`${BASE_URL}/fr/pages/transaction`, { waitUntil: 'networkidle2' });
        await loginIfNeeded(page);
        await page.waitForTimeout(1500);
        const content = await page.content();
        // Either shows transactions or empty state
        const hasContent = content.includes('transaction') || content.includes('Transaction') || content.includes('Aucune');
        assert(hasContent, 'Transactions page content not found');
    });

    // ─── Test 8: FIRE Settings page loads with form ───────────────────────────
    await test('Settings/Fire: page loads with FIRE form', async () => {
        await page.goto(`${BASE_URL}/fr/pages/settings/fire`, { waitUntil: 'networkidle2' });
        await loginIfNeeded(page);
        await page.waitForTimeout(1500);
        const content = await page.content();
        assert(content.includes('FIRE') || content.includes('Objectif'), 'FIRE settings form not found');
        assert(content.includes('Enregistrer') || content.includes('annuel'), 'FIRE form inputs not found');
    });

    // ─── Test 9: No uncaught JS errors on dashboard ────────────────────────────
    await test('Dashboard: no uncaught JavaScript errors', async () => {
        jsErrors.length = 0; // reset
        await page.goto(`${BASE_URL}/fr`, { waitUntil: 'networkidle2' });
        await loginIfNeeded(page);
        await page.waitForTimeout(2000);
        const criticalErrors = jsErrors.filter(e =>
            !e.includes('ResizeObserver') && // browser quirk, benign
            !e.includes('Non-Error') &&
            !e.includes('ChunkLoadError') // network/build issue, not app bug
        );
        assert(criticalErrors.length === 0, `JS errors: ${criticalErrors.join('; ')}`);
    });

    // ─── Test 10: All visited pages have dark theme ────────────────────────────
    await test('All pages: dark theme consistent (app-dark class)', async () => {
        const urls = [
            `${BASE_URL}/fr`,
            `${BASE_URL}/fr/pages/patrimoine`,
            `${BASE_URL}/fr/pages/transaction`,
        ];
        for (const url of urls) {
            await page.goto(url, { waitUntil: 'networkidle2' });
            await loginIfNeeded(page);
            const hasDark = await page.evaluate(() => document.documentElement.classList.contains('app-dark'));
            assert(hasDark, `Dark theme missing on ${url}`);
        }
    });

    await browser.close();

    // ─── Summary ──────────────────────────────────────────────────────────────
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    if (errors.length > 0) {
        console.log('\nFailed tests:');
        errors.forEach(e => console.log(`  • ${e.name}: ${e.error}`));
    }
    console.log('');

    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
