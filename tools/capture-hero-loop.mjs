#!/usr/bin/env node
/**
 * Hero loop video (landing backlog F9, 2026-10-17).
 *
 * A 6 s silent loop of the REAL Synthese screen, captured from the local
 * stack on the demo account at 390x844 CSS px, device scale 2, frame by
 * frame (deterministic scroll positions, no screen recorder jitter), then
 * encoded by ffmpeg into src/assets/marketing/synthese-loop.webm (VP9) and
 * synthese-loop.mp4 (H.264, for browsers without WebM). The first and last
 * frames are the top of the screen, i.e. the same frame as synthese.webp,
 * so the poster image stays the LCP element and the loop restarts without
 * a jump (herowidget.ts / phoneframe.ts overlay the video on that image).
 *
 * Motion: hold the top (0.8 s), ease down to show the markets and the
 * financial health card (2.2 s), hold (0.8 s), ease back up (1.6 s), hold
 * (0.6 s). Budget: WebM under 600 kB (plan T10 / F9).
 *
 * Needs: the local stack up (skill run-local), ffmpeg with libvpx-vp9 and
 * libx264 on PATH (brew install ffmpeg), Playwright's Chrome channel.
 * Never run against prod.
 *
 * Usage: node tools/capture-hero-loop.mjs [--keep-frames]
 */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:4200';
const EMAIL = process.env.E2E_EMAIL || 'demo@omaad.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'OmaadDemo2026!';
if (/omaad\.africa/.test(BASE)) { console.error('Refusing to capture against production.'); process.exit(1); }

const OUT = 'src/assets/marketing';
const TMP = join(tmpdir(), 'omaad-hero-loop');
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true }); mkdirSync(OUT, { recursive: true });

const FPS = 24, SECONDS = 6, FRAMES = FPS * SECONDS;
const TRAVEL = 620; // CSS px scrolled down: markets + the health score enter the frame
const WIDTH = 600, HEIGHT = 1298; // 390:844 at ~1.54x, even dimensions for the encoders

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Scroll offset for frame i (seconds -> hold, down, hold, up, hold). */
function offsetAt(i) {
    const s = i / FPS;
    if (s < 0.8) return 0;
    if (s < 3.0) return TRAVEL * ease((s - 0.8) / 2.2);
    if (s < 3.8) return TRAVEL;
    if (s < 5.4) return TRAVEL * (1 - ease((s - 3.8) / 1.6));
    return 0;
}

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR',
    colorScheme: 'light', reducedMotion: 'reduce',
});
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
// The session is persisted after the redirect; a reload before that lands on login.
await page.waitForFunction(() => !!localStorage.getItem('omaad_user'), null, { timeout: 15_000 });
await page.goto(BASE + '/fr', { waitUntil: 'networkidle', timeout: 45_000 });
await page.waitForTimeout(2500);
// Freeze the page: no smooth scrolling, no hover states, caret off.
await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; } * { caret-color: transparent !important; }' });
const scroller = await page.evaluate(() => {
    // The app shell may scroll the document or an inner main: pick whichever can move.
    const cands = [document.scrollingElement, ...Array.from(document.querySelectorAll('main, .layout-main, [data-scroll]'))].filter(Boolean);
    for (const el of cands) if (el.scrollHeight - el.clientHeight > 700) { el.scrollTop = 1; const ok = el.scrollTop === 1; el.scrollTop = 0; if (ok) return el === document.scrollingElement ? 'document' : (el.className || el.tagName); }
    return null;
});
if (!scroller) { console.error('No scrollable Synthese found (needs > 700 px of overflow).'); await browser.close(); process.exit(1); }
console.log(`scroll container: ${scroller}`);

for (let i = 0; i < FRAMES; i++) {
    const y = Math.round(offsetAt(i));
    await page.evaluate((yy) => {
        const el = [document.scrollingElement, ...Array.from(document.querySelectorAll('main, .layout-main, [data-scroll]'))].find((e) => e && e.scrollHeight - e.clientHeight > 700);
        el.scrollTop = yy;
    }, y);
    await page.screenshot({ path: join(TMP, `f${String(i).padStart(4, '0')}.png`), type: 'png', animations: 'disabled' });
    if (i % FPS === 0) process.stdout.write(`frame ${i}/${FRAMES} (y=${y})\n`);
}
await browser.close();

const vf = `scale=${WIDTH}:${HEIGHT}:flags=lanczos,format=yuv420p`;
const webm = join(OUT, 'synthese-loop.webm');
const mp4 = join(OUT, 'synthese-loop.mp4');
const common = ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(FPS), '-i', join(TMP, 'f%04d.png'), '-an', '-vf', vf];
// VP9, two-pass constrained quality: text stays crisp, the budget holds.
execFileSync('ffmpeg', [...common, '-c:v', 'libvpx-vp9', '-b:v', '600k', '-crf', '33', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '1', '-pass', '1', '-passlogfile', join(TMP, 'vp9'), '-f', 'null', '/dev/null']);
execFileSync('ffmpeg', [...common, '-c:v', 'libvpx-vp9', '-b:v', '600k', '-crf', '33', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '1', '-pass', '2', '-passlogfile', join(TMP, 'vp9'), webm]);
execFileSync('ffmpeg', [...common, '-c:v', 'libx264', '-profile:v', 'main', '-level', '4.0', '-preset', 'slow', '-crf', '26', '-movflags', '+faststart', mp4]);
for (const f of [webm, mp4]) console.log(`${f.split('/').pop().padEnd(20)} ${Math.round(statSync(f).size / 1024)} kB`);
if (statSync(webm).size > 600 * 1024) { console.error('synthese-loop.webm is over the 600 kB budget'); process.exitCode = 1; }
if (!process.argv.includes('--keep-frames') && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
