#!/usr/bin/env node
/**
 * Marketing screenshots for the landing (landing redesign 2026-10).
 *
 * Captures REAL app screens from the LOCAL stack (ng serve :4200 + local
 * backend + the seeded demo account) at 390x844 CSS px, device scale 2
 * (780x1688), then encodes them to WebP into src/assets/marketing/ and
 * copies three raw PNGs to public/screenshots/ for the PWA manifest.
 *
 * Why headless capture and not a screenshot tool: reproducible in one
 * command when the UI changes, standalone-PWA framing (no browser chrome),
 * and a CSS phone frame around a crisp 2x capture beats an exported mockup
 * on weight and sharpness (see pages/landing/components/phoneframe.ts).
 *
 * Needs: the local stack up (skill run-local), `cwebp` on PATH (brew install
 * webp), and Playwright's Chrome channel. Never run against prod.
 *
 * Usage: node tools/capture-marketing-shots.mjs [--keep-png]
 */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync, existsSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:4200';
const EMAIL = process.env.E2E_EMAIL || 'demo@omaad.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'OmaadDemo2026!';
if (/omaad\.africa/.test(BASE)) { console.error('Refusing to capture against production.'); process.exit(1); }

const OUT = 'src/assets/marketing';
const PWA_OUT = 'public/screenshots';
const TMP = join(tmpdir(), 'omaad-marketing-shots');
mkdirSync(OUT, { recursive: true }); mkdirSync(PWA_OUT, { recursive: true }); mkdirSync(TMP, { recursive: true });

/** name -> route (+ optional interaction). Order matters for the PWA manifest (first three). */
const SHOTS = [
    { name: 'synthese', url: '/fr', pwa: true },
    { name: 'patrimoine', url: '/fr/pages/patrimoine', pwa: true },
    { name: 'objectifs', url: '/fr/pages/goals', pwa: true },
    { name: 'assistant', url: '/fr/pages/assistant' },
    { name: 'marches', url: '/fr/pages/marches' },
    { name: 'transactions', url: '/fr/pages/transaction?month=10&year=2026' },
    { name: 'dettes', url: '/fr/pages/debts' },
    { name: 'securite', url: '/fr/pages/settings/security' },
    // An answered conversation needs a live AI key locally; opt in with ASK=1.
    ...(process.env.ASK ? [{ name: 'assistant-chat', url: '/fr/pages/assistant', ask: 'Est-ce que je suis bien diversifié ?' }] : []),
];

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR',
    colorScheme: 'light',
});
// First-run hints would sit on top of the product in every frame: mark them seen.
await ctx.addInitScript(() => {
    try {
        for (const id of [1, 2, 3, 4, 5, 10, 20, 30]) localStorage.setItem(`omaad_assistant_seen:${id}`, '1');
        localStorage.setItem('omaad-layout-config', JSON.stringify({ darkTheme: false, themeMode: 'light', menuMode: 'static' }));
    } catch {}
});
const page = await ctx.newPage();

await page.goto(BASE + '/fr/auth/login', { waitUntil: 'networkidle' });
await page.locator('#email').fill(EMAIL);
await page.locator('#password input').fill(PASSWORD);
await page.locator('button[type=submit]').first().click();
await page.waitForURL((u) => !/auth\/login/.test(u.toString()), { timeout: 20_000 });
await page.waitForFunction(() => !!localStorage.getItem('omaad_user'), null, { timeout: 15_000 });

for (const s of SHOTS) {
    await page.goto(BASE + s.url, { waitUntil: 'networkidle', timeout: 45_000 });
    await page.waitForTimeout(1800);
    if (s.ask) {
        const input = page.locator('textarea, input[type="text"]').last();
        await input.fill(s.ask);
        // The send control is the arrow button beside the composer (Enter inserts a newline).
        await page.locator('button').filter({ has: page.locator('.pi-arrow-up') }).last().click();
        // Wait for the assistant to finish streaming its answer.
        await page.waitForTimeout(20_000);
        await page.evaluate(() => { const el = document.scrollingElement; if (el) el.scrollTop = 0; });
    }
    // Freeze animations and scroll to top for a clean frame.
    await page.evaluate(() => { window.scrollTo(0, 0); document.documentElement.style.scrollBehavior = 'auto'; });
    await page.waitForTimeout(400);
    const png = join(TMP, `${s.name}.png`);
    await page.screenshot({ path: png, type: 'png' });
    const webp = join(OUT, `${s.name}.webp`);
    execFileSync('cwebp', ['-quiet', '-q', '82', '-m', '6', '-sharp_yuv', png, '-o', webp]);
    // 460 px twin for phones (srcset in phoneframe.ts): a 76 vw frame on a
    // 390 px screen needs ~300 CSS px, 460 covers DPR 1.5 without the 780 payload.
    const small = join(OUT, `${s.name}-460.webp`);
    execFileSync('cwebp', ['-quiet', '-q', '80', '-m', '6', '-sharp_yuv', '-resize', '460', '0', png, '-o', small]);
    if (s.pwa) copyFileSync(png, join(PWA_OUT, `${s.name}.png`));
    console.log(`${s.name.padEnd(16)} ${Math.round(statSync(webp).size / 1024)} kB webp, ${Math.round(statSync(small).size / 1024)} kB at 460`);
}
await browser.close();
if (!process.argv.includes('--keep-png') && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
console.log(`done -> ${OUT}/ (${SHOTS.length} files), ${PWA_OUT}/ (${SHOTS.filter((s) => s.pwa).length} files)`);
