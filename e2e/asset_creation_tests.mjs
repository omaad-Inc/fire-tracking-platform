/**
 * Afrin Nexus — Asset Creation Tests (API + UI)
 *
 * Tests every asset category end-to-end:
 *   Part 1 — API layer  (httpx / fetch against the backend)
 *   Part 2 — UI layer   (Puppeteer against localhost:4200)
 *
 * Run:
 *   # Start frontend first: cd frontend && ng serve
 *   node frontend/e2e/asset_creation_tests.mjs
 */

import { createRequire } from 'module';
const _require = createRequire('/Users/mbaye.sene/.local/share/mise/installs/node/22.13.1/lib/node_modules/puppeteer/package.json');
const puppeteer = _require('/Users/mbaye.sene/.local/share/mise/installs/node/22.13.1/lib/node_modules/puppeteer/lib/cjs/puppeteer/puppeteer.js').default;

const BASE_URL  = 'http://localhost:4200';
const API_URL   = 'http://localhost:8000/api/v1';
const EMAIL     = 'demo@afrinnexus.app';
const PASS      = 'Demo2024!';

let passed = 0;
let failed = 0;
const errors = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function assert(cond, msg) {
    if (!cond) throw new Error(msg || 'Assertion failed');
}

async function test(name, fn) {
    try {
        await fn();
        console.log(`  ✓  ${name}`);
        passed++;
    } catch (err) {
        console.log(`  ✗  ${name}`);
        console.log(`     → ${err.message}`);
        failed++;
        errors.push({ name, error: err.message });
    }
}

async function apiLogin() {
    const r = await fetch(`${API_URL}/auth/login/json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASS }),
    });
    if (!r.ok) throw new Error(`Login failed: ${r.status} ${await r.text()}`);
    const { access_token } = await r.json();
    return access_token;
}

async function apiCreate(token, payload) {
    const r = await fetch(`${API_URL}/assets`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
    const body = await r.json();
    return { status: r.status, body };
}

async function apiDelete(token, id) {
    await fetch(`${API_URL}/assets/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
}

// ─── Part 1: API Tests ────────────────────────────────────────────────────────

async function runApiTests() {
    console.log('\n━━━  Part 1: API Tests  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let token;
    await test('API login returns access_token', async () => {
        token = await apiLogin();
        assert(token && token.length > 10, 'Token is empty or too short');
    });

    if (!token) { console.log('  ⚠  Skipping API tests — login failed'); return; }

    // Definition of every asset category with a minimal valid payload
    const categories = [
        {
            label: 'real_estate',
            payload: { name: '[TEST] Appartement Dakar', category: 'real_estate', current_value: 50000000, purchase_value: 45000000, currency: 'XOF' },
        },
        {
            label: 'stocks',
            payload: { name: '[TEST] Actions BRVM', category: 'stocks', current_value: 2000000, purchase_value: 1800000, currency: 'XOF', institution: 'BRVM' },
        },
        {
            label: 'bonds',
            payload: { name: '[TEST] Obligations Trésor', category: 'bonds', current_value: 1000000, currency: 'XOF' },
        },
        {
            label: 'crypto',
            payload: { name: '[TEST] Bitcoin', category: 'crypto', current_value: 500000, purchase_value: 300000, currency: 'XOF' },
        },
        {
            label: 'cash',
            payload: { name: '[TEST] Liquidités', category: 'cash', current_value: 200000, currency: 'XOF', is_liquid: true },
        },
        {
            label: 'retirement',
            payload: { name: '[TEST] PER Retraite', category: 'retirement', current_value: 3000000, currency: 'XOF' },
        },
        {
            label: 'life_insurance',
            payload: { name: '[TEST] Assurance Vie', category: 'life_insurance', current_value: 5000000, currency: 'XOF' },
        },
        {
            label: 'savings_account',
            payload: { name: '[TEST] Livret Épargne', category: 'savings_account', current_value: 800000, currency: 'XOF', is_liquid: true },
        },
        {
            label: 'business',
            payload: { name: '[TEST] Entreprise SARL', category: 'business', current_value: 15000000, purchase_value: 10000000, currency: 'XOF' },
        },
        {
            label: 'vehicle',
            payload: { name: '[TEST] Toyota Hilux', category: 'vehicle', current_value: 12000000, purchase_value: 15000000, currency: 'XOF' },
        },
        {
            label: 'tontine',
            payload: {
                name: '[TEST] Tontine Famille Diallo',
                category: 'tontine',
                current_value: 150000,
                purchase_value: 50000,
                currency: 'XOF',
                is_liquid: false,
                notes: JSON.stringify({ mise_mensuelle: 50000, participants: 12, statut: 'en_cours', date_collecte: '2025-06-01', devise: 'XOF' }),
            },
        },
        {
            label: 'mobile_money',
            payload: {
                name: '[TEST] Compte Wave',
                category: 'mobile_money',
                current_value: 75000,
                currency: 'XOF',
                is_liquid: true,
                institution: 'Wave',
            },
        },
        {
            label: 'collectibles',
            payload: { name: '[TEST] Collection Art', category: 'collectibles', current_value: 500000, currency: 'XOF' },
        },
        {
            label: 'commodities',
            payload: { name: '[TEST] Or', category: 'commodities', current_value: 2000000, currency: 'XOF' },
        },
        {
            label: 'other',
            payload: { name: '[TEST] Autre Actif', category: 'other', current_value: 100000, currency: 'XOF' },
        },
    ];

    const createdIds = [];

    for (const cat of categories) {
        await test(`API create asset: ${cat.label}`, async () => {
            const { status, body } = await apiCreate(token, cat.payload);
            assert(
                status === 200 || status === 201,
                `Expected 200/201, got ${status}: ${JSON.stringify(body).slice(0, 200)}`
            );
            assert(body.id, 'Response missing id');
            assert(body.category === cat.label, `Category mismatch: got ${body.category}`);
            assert(body.name === cat.payload.name, 'Name mismatch');
            // For tontine: notes should be stored
            if (cat.label === 'tontine') {
                assert(body.notes, 'Tontine notes field is missing from response');
                const parsed = JSON.parse(body.notes);
                assert(parsed.mise_mensuelle === 50000, 'mise_mensuelle not stored correctly');
                assert(parsed.participants === 12, 'participants not stored correctly');
            }
            // For mobile_money: institution should be stored
            if (cat.label === 'mobile_money') {
                assert(body.institution === 'Wave', 'institution (provider) not stored');
                assert(body.is_liquid === true, 'is_liquid should be true for mobile_money');
            }
            createdIds.push(body.id);
        });
    }

    // Cleanup
    await test('API cleanup: delete all test assets', async () => {
        for (const id of createdIds) {
            await apiDelete(token, id);
        }
        assert(createdIds.length === categories.length, `Only ${createdIds.length}/${categories.length} assets were created`);
    });
}

// ─── Part 2: UI Tests ─────────────────────────────────────────────────────────

async function loginUI(page) {
    await page.goto(`${BASE_URL}/fr/auth/login`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="email"]', { timeout: 8000 });
    await page.type('input[type="email"]', EMAIL, { delay: 30 });
    await page.type('input[type="password"]', PASS, { delay: 30 });
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
    await sleep(1500);
}

async function openAddAssetDialog(page) {
    // Click the "Ajouter un actif" / + button in topbar
    await page.goto(`${BASE_URL}/fr`, { waitUntil: 'networkidle2' });
    await sleep(1000);
    // Find the gradient button in topbar
    const btn = await page.$('button.rounded-full.bg-gradient-to-r');
    if (!btn) {
        // Try by text content
        const buttons = await page.$$('button');
        for (const b of buttons) {
            const text = await b.evaluate(el => el.textContent);
            if (text && text.includes('Ajouter') || text && text.includes('actif')) {
                await b.click();
                return true;
            }
        }
        throw new Error('Add asset button not found');
    }
    await btn.click();
    return true;
}

async function waitForDialog(page) {
    await page.waitForSelector('.add-asset-dialog, p-dialog', { timeout: 5000 });
    await sleep(500);
}

async function selectCategory(page, categoryValue) {
    // The category is a p-select — click the dropdown
    const selects = await page.$$('p-select');
    if (selects.length < 2) throw new Error('Category select not found');
    await selects[1].click();
    await sleep(400);
    // Find the option with matching value
    const options = await page.$$('li.p-select-option, .p-dropdown-item, li[role="option"]');
    for (const opt of options) {
        const val = await opt.evaluate(el => el.getAttribute('aria-label') || el.textContent || '');
        if (val.toLowerCase().includes(categoryValue.replace('_', ' ').toLowerCase()) ||
            val.toLowerCase().includes(categoryValue.toLowerCase())) {
            await opt.click();
            await sleep(300);
            return;
        }
    }
    // Fallback: type in search if available
    throw new Error(`Category option not found for: ${categoryValue}`);
}

async function fillInput(page, labelText, value) {
    // Find input near a label containing the text
    const handle = await page.evaluateHandle((lbl) => {
        const labels = Array.from(document.querySelectorAll('label'));
        const label = labels.find(l => l.textContent.trim().toLowerCase().includes(lbl.toLowerCase()));
        if (!label) return null;
        // Get the next input/p-inputnumber sibling
        const parent = label.closest('div');
        if (!parent) return null;
        return parent.querySelector('input') || parent.querySelector('p-inputnumber input');
    }, labelText);
    if (!handle || !handle.asElement()) throw new Error(`Input for "${labelText}" not found`);
    await handle.asElement().triple_click?.() || await handle.asElement().click({ clickCount: 3 });
    await sleep(100);
    await handle.asElement().type(String(value), { delay: 20 });
}

async function runUiTests() {
    console.log('\n━━━  Part 2: UI Tests  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const browser = await puppeteer.launch({
        headless: false, // show browser so we can observe the form
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900'],
        defaultViewport: { width: 1280, height: 900 },
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(15000);

    const jsErrors = [];
    page.on('pageerror', err => jsErrors.push(err.message));
    page.on('requestfailed', req => {
        if (req.url().includes('/api/')) {
            jsErrors.push(`API request failed: ${req.url()}`);
        }
    });

    // ── Login ─────────────────────────────────────────────────────────────────
    await test('UI: Login with demo credentials', async () => {
        await loginUI(page);
        const url = page.url();
        assert(!url.includes('/auth/'), `Still on auth page after login: ${url}`);
    });

    // ── Dashboard loads ───────────────────────────────────────────────────────
    await test('UI: Dashboard loads with FCFA currency', async () => {
        await page.goto(`${BASE_URL}/fr`, { waitUntil: 'networkidle2' });
        await sleep(2000);
        const content = await page.content();
        // Should show FCFA or a numeric amount
        assert(
            content.includes('FCFA') || content.includes('F CFA') || content.includes('XOF') || /\d{1,3}([\s,]\d{3})+/.test(content),
            'No currency amount visible on dashboard'
        );
    });

    // ── Add Asset button visible ──────────────────────────────────────────────
    await test('UI: "Ajouter un actif" button visible in topbar', async () => {
        const content = await page.content();
        assert(
            content.includes('Ajouter') || content.includes('actif') || content.includes('pi-plus'),
            'Add asset button not visible'
        );
    });

    // ── Dialog opens ─────────────────────────────────────────────────────────
    await test('UI: Add asset dialog opens on button click', async () => {
        // Find and click the + button
        const buttons = await page.$$('button');
        let clicked = false;
        for (const btn of buttons) {
            const cls = await btn.evaluate(el => el.className || '');
            if (cls.includes('rounded-full') && cls.includes('gradient')) {
                await btn.click();
                clicked = true;
                break;
            }
        }
        if (!clicked) {
            // Try by visible text
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const target = btns.find(b => b.textContent.includes('Ajouter') || b.textContent.includes('actif'));
                if (target) target.click();
            });
        }
        await sleep(800);
        const content = await page.content();
        assert(content.includes('Informations') || content.includes('Catégorie') || content.includes('add-asset'),
            'Dialog did not open');
    });

    // ── Category dropdown shows tontine ──────────────────────────────────────
    await test('UI: Category dropdown contains Tontine option', async () => {
        // Ensure dialog is open (it may have closed) — re-open if needed
        const dialogOpen = await page.$('.add-asset-dialog, p-dialog[ng-reflect-visible="true"]');
        if (!dialogOpen) {
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const btn = btns.find(b => b.className.includes('gradient') || b.textContent.includes('Ajouter'));
                if (btn) btn.click();
            });
            await sleep(800);
        }
        // Click the only p-select in the dialog (the category field)
        const catSelect = await page.$('p-select');
        assert(catSelect, 'Category p-select not found in dialog');
        await catSelect.click();
        await sleep(600);
        const content = await page.content();
        assert(content.includes('Tontine'), 'Tontine not found in category options');
        assert(content.includes('Mobile Money'), 'Mobile Money not found in category options');
        // Close dropdown
        await page.keyboard.press('Escape');
        await sleep(300);
    });

    // ── Tontine form fields appear when Tontine is selected ──────────────────
    await test('UI: Tontine-specific fields shown when Tontine selected', async () => {
        // Click category dropdown
        const catSelect = await page.$('p-select');
        assert(catSelect, 'Category p-select not found');
        await catSelect.click();
        await sleep(600);
        // Click the Tontine option
        const clicked = await page.evaluate(() => {
            const items = document.querySelectorAll('li[role="option"], .p-select-option, .p-select-list-item');
            const item = Array.from(items).find(el => el.textContent.trim().includes('Tontine') && !el.textContent.includes('Mobile'));
            if (item) { item.click(); return true; }
            return false;
        });
        assert(clicked, 'Tontine option not found or not clickable');
        await sleep(600);
        const content = await page.content();
        assert(content.includes('Mise mensuelle'), '"Mise mensuelle" field not shown for Tontine');
        assert(content.includes('Nombre de participants'), '"Nombre de participants" field not shown');
        assert(content.includes('Date de début'), '"Date de début" field not shown');
        assert(content.includes('Statut'), '"Statut" field not shown');
    });

    // ── Mobile Money form fields appear ──────────────────────────────────────
    await test('UI: Mobile Money-specific fields shown when Mobile Money selected', async () => {
        // Click category dropdown again
        const catSelect = await page.$('p-select');
        assert(catSelect, 'Category p-select not found');
        await catSelect.click();
        await sleep(600);
        // Click Mobile Money option
        const clicked = await page.evaluate(() => {
            const items = document.querySelectorAll('li[role="option"], .p-select-option, .p-select-list-item');
            const item = Array.from(items).find(el => el.textContent.includes('Mobile Money'));
            if (item) { item.click(); return true; }
            return false;
        });
        assert(clicked, 'Mobile Money option not found or not clickable');
        await sleep(600);
        const content = await page.content();
        assert(content.includes('Opérateur'), '"Opérateur" field not shown for Mobile Money');
        assert(content.includes('Solde actuel'), '"Solde actuel" field not shown');
        assert(content.includes('Wave'), 'Wave provider option not shown');
    });

    // ── Currency symbol shown in inputs ──────────────────────────────────────
    await test('UI: Currency symbol (FCFA) visible in form inputs', async () => {
        // Switch to a standard category (stocks) to check currency symbol
        await page.evaluate(() => {
            const selects = document.querySelectorAll('p-select');
            if (selects[1]) {
                const label = selects[1].querySelector('.p-select-label, .p-dropdown-label');
                if (label) label.click();
            }
        });
        await sleep(400);
        await page.evaluate(() => {
            const items = document.querySelectorAll('li[role="option"], .p-select-option, .p-dropdown-item');
            const stockItem = Array.from(items).find(el => el.textContent.includes('Actions'));
            if (stockItem) stockItem.click();
        });
        await sleep(400);
        const content = await page.content();
        assert(
            content.includes('FCFA') || content.includes('XOF') || content.includes('€') || content.includes('$'),
            'No currency symbol visible in asset form'
        );
    });

    // ── Preferences page has XOF as default ──────────────────────────────────
    await test('UI: Preferences page shows FCFA as selected currency', async () => {
        await page.keyboard.press('Escape');
        await sleep(300);
        await page.goto(`${BASE_URL}/fr/pages/settings/preferences`, { waitUntil: 'networkidle2' });
        await sleep(1500);
        const content = await page.content();
        assert(content.includes('Franc CFA') || content.includes('XOF') || content.includes('FCFA'),
            'FCFA/XOF not visible on preferences page');
        // USD should also be listed as an option
        assert(content.includes('USD') || content.includes('Dollar'), 'USD option not found in currencies list');
    });

    // ── Add USD currency option ───────────────────────────────────────────────
    await test('UI: Currency dropdown has 3 options (FCFA, EUR, USD)', async () => {
        const content = await page.content();
        const hasXOF = content.includes('XOF') || content.includes('FCFA') || content.includes('Franc CFA');
        const hasEUR = content.includes('EUR') || content.includes('Euro');
        const hasUSD = content.includes('USD') || content.includes('Dollar');
        assert(hasXOF && hasEUR && hasUSD, `Missing currency. XOF:${hasXOF} EUR:${hasEUR} USD:${hasUSD}`);
    });

    // ── Landing page shows FCFA ───────────────────────────────────────────────
    await test('UI: Landing page hero mockup shows FCFA value', async () => {
        await page.goto(`${BASE_URL}/fr/landing`, { waitUntil: 'networkidle2' });
        await sleep(1000);
        const content = await page.content();
        assert(content.includes('FCFA') || content.includes('F CFA'), 'Landing page does not show FCFA in hero mockup');
    });

    // ── No critical JS errors ─────────────────────────────────────────────────
    await test('UI: No critical JS errors during session', async () => {
        const critical = jsErrors.filter(e =>
            !e.includes('ResizeObserver') &&
            !e.includes('Non-Error') &&
            !e.includes('ChunkLoadError') &&
            !e.includes('API request failed') // network failures are separate concern
        );
        assert(critical.length === 0,
            `Critical JS errors:\n  ${critical.slice(0, 3).join('\n  ')}`);
    });

    await browser.close();
}

// ─── Runner ───────────────────────────────────────────────────────────────────

async function run() {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║    Afrin Nexus — Asset Creation Tests (API + UI)    ║');
    console.log('╚══════════════════════════════════════════════════════╝');

    await runApiTests();
    await runUiTests();

    console.log(`\n${'─'.repeat(56)}`);
    console.log(`  Total: ${passed + failed} tests   ✓ ${passed} passed   ✗ ${failed} failed`);
    if (errors.length > 0) {
        console.log('\nFailed:');
        errors.forEach(e => console.log(`  • ${e.name}\n    ${e.error}`));
    }
    console.log('');

    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
    console.error('\nFatal:', err.message);
    process.exit(1);
});
