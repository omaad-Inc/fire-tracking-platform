#!/usr/bin/env node
/**
 * Mega-panel highlight visuals (landing backlog F4, 2026-10-17).
 *
 * The two "A la une" cards of the Outils panel (topbarwidget.component.ts,
 * `highlights`) show a dedicated 96x72 CSS px visual each, like N26's
 * highlight cards, instead of a cropped phone capture. This script renders
 * them from the inline SVG below at device scale 2 (192x144) and encodes
 * them to WebP into src/assets/marketing/ (budget: under 15 kB each).
 *
 * Numbers are real, never invented:
 * - FIRE: the simulator's default scenario (2 M FCFA, 500 000 spent and
 *   150 000 saved a month, 8 % return, 2 % inflation, 3.5 % withdrawal,
 *   20 years) gives a FIRE number of 171.4 M and a future wealth of 98.2 M,
 *   i.e. 57 % of the target. Re-read the tool after changing its defaults.
 * - SGI: ordinary-transaction brokerage from the comparator's sgi.json
 *   (BSIC Capital 0,8 %, CGF Bourse 1 %, SBIF 0,8 %).
 *
 * Needs `cwebp` on PATH (brew install webp) and Playwright's Chrome channel.
 * Usage: node tools/render-highlight-visuals.mjs
 */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const OUT = 'src/assets/marketing';
const TMP = join(tmpdir(), 'omaad-highlight-visuals');
mkdirSync(OUT, { recursive: true }); mkdirSync(TMP, { recursive: true });

// Inter is self-hosted; inline it so the headless page needs no server.
const inter = readFileSync('src/assets/fonts/inter-latin.woff2').toString('base64');

const INK = '#0F1A2E', MUTED = '#6E6A60', OCHRE = '#C77B3C', OCHRE_INK = '#A1602D', LINE = 'rgba(15,26,46,0.10)';

/** Progress ring: 57 % of the FIRE number reached in the default scenario. */
const R = 20, C = 2 * Math.PI * R, PCT = 0.57;
const fire = `
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="72" viewBox="0 0 96 72">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F6EFE6"/></linearGradient>
  </defs>
  <rect width="96" height="72" fill="url(#bg)"/>
  <circle cx="34" cy="36" r="${R}" fill="none" stroke="${LINE}" stroke-width="5"/>
  <circle cx="34" cy="36" r="${R}" fill="none" stroke="${OCHRE}" stroke-width="5" stroke-linecap="round"
          stroke-dasharray="${(C * PCT).toFixed(2)} ${C.toFixed(2)}" transform="rotate(-90 34 36)"/>
  <text x="34" y="31.5" text-anchor="middle" font-size="6" font-weight="600" letter-spacing="0.6" fill="${OCHRE_INK}">FIRE</text>
  <text x="34" y="42.5" text-anchor="middle" font-size="11" font-weight="700" fill="${INK}">57 %</text>
  <g fill="${OCHRE}" opacity="0.9">
    <rect x="64" y="46" width="5" height="10" rx="1.5" opacity="0.35"/>
    <rect x="71" y="40" width="5" height="16" rx="1.5" opacity="0.55"/>
    <rect x="78" y="32" width="5" height="24" rx="1.5" opacity="0.8"/>
    <rect x="85" y="22" width="5" height="34" rx="1.5"/>
  </g>
  <line x1="63" y1="57.5" x2="91" y2="57.5" stroke="${LINE}" stroke-width="1"/>
</svg>`;

/** Mini fee table: three real brokerage lines from the comparator. */
const rows = [
    { name: 'BSIC Capital', fee: '0,8 %', w: 0.8 },
    { name: 'CGF Bourse', fee: '1 %', w: 1 },
    { name: 'SBIF', fee: '0,8 %', w: 0.8 },
];
const sgi = `
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="72" viewBox="0 0 96 72">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F6EFE6"/></linearGradient>
  </defs>
  <rect width="96" height="72" fill="url(#bg)"/>
  <rect x="8" y="8" width="80" height="56" rx="6" fill="#FFFFFF" stroke="${LINE}"/>
  <text x="14" y="18.5" font-size="6" font-weight="600" letter-spacing="0.5" fill="${MUTED}">SGI</text>
  <text x="82" y="18.5" text-anchor="end" font-size="6" font-weight="600" letter-spacing="0.5" fill="${MUTED}">COURTAGE</text>
  <line x1="8" y1="22.5" x2="88" y2="22.5" stroke="${LINE}"/>
  ${rows.map((r, i) => {
        const y = 32 + i * 13;
        const cheap = r.w < 1;
        return `
  <text x="14" y="${y}" font-size="7" font-weight="600" fill="${INK}">${r.name}</text>
  <rect x="61" y="${y - 7.5}" width="23" height="10.5" rx="5.25" fill="${cheap ? OCHRE : INK}" opacity="${cheap ? 0.14 : 0.06}"/>
  <text x="72.5" y="${y}" text-anchor="middle" font-size="7" font-weight="700" fill="${cheap ? OCHRE_INK : MUTED}">${r.fee}</text>`;
    }).join('')}
</svg>`;

const html = (svg) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: 'Inter'; font-weight: 100 900; src: url(data:font/woff2;base64,${inter}) format('woff2'); }
html, body { margin: 0; background: #fff; }
svg { display: block; font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
</style></head><body>${svg}</body></html>`;

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 96, height: 72 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
for (const [name, svg] of [['highlight-fire', fire], ['highlight-sgi', sgi]]) {
    await page.setContent(html(svg), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const png = join(TMP, `${name}.png`);
    await page.screenshot({ path: png, type: 'png', clip: { x: 0, y: 0, width: 96, height: 72 } });
    const webp = join(OUT, `${name}.webp`);
    execFileSync('cwebp', ['-quiet', '-q', '88', '-m', '6', '-sharp_yuv', png, '-o', webp]);
    const kb = statSync(webp).size / 1024;
    console.log(`${name.padEnd(16)} ${kb.toFixed(1)} kB (192x144 webp)`);
    if (kb > 15) { console.error(`${name}: over the 15 kB budget`); process.exitCode = 1; }
}
await browser.close();
rmSync(TMP, { recursive: true, force: true });
