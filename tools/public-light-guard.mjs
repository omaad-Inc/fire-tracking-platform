#!/usr/bin/env node
/**
 * Public-light guard (landing redesign 2026-10).
 *
 * Public marketing pages are light only. The path rule lives in
 * `src/app/core/theme/public-light.ts` (used by LayoutService on every
 * navigation) and is ALSO inlined in `src/index.html` (the anti-flash script
 * that runs before Angular, so a dark-mode user never sees a dark first frame
 * on the landing). Two copies of one regex drift silently, and the failure
 * mode is exactly the flash the inline copy exists to prevent. This fails the
 * build when they differ.
 *
 * Run: `npm run public-light:guard` (also chained into `npm run build`).
 */
import { readFileSync } from 'node:fs';

const TS = 'src/app/core/theme/public-light.ts';
const HTML = 'src/index.html';

const ts = readFileSync(TS, 'utf8');
const html = readFileSync(HTML, 'utf8');

const m = ts.match(/PUBLIC_LIGHT_PATH_SOURCE = String\.raw`([^`]+)`/);
if (!m) {
    console.error(`✘ public-light-guard: PUBLIC_LIGHT_PATH_SOURCE not found in ${TS}`);
    process.exit(1);
}
const source = m[1];
const inline = `var PUBLIC_LIGHT = /${source}/;`;
if (!html.includes(inline)) {
    console.error(`✘ public-light-guard: ${HTML} does not inline the same regex as ${TS}.`);
    console.error(`  expected line: ${inline}`);
    process.exit(1);
}
// Sanity: the rule must match the landing and must NOT match the app or auth.
const re = new RegExp(source);
const mustMatch = ['/', '/fr/landing', '/fr/landing/', '/fr/tarifs/', '/en/blog/x', '/outils/comparateur-sgi-brvm', '/confidentialite', '/support/', '/fr/tools/fire-simulator', '/g/abc'];
const mustNot = ['/fr', '/fr/', '/fr/pages/patrimoine', '/fr/auth/login', '/share/abc', '/auth/callback', '/en/onboarding'];
const bad = [...mustMatch.filter((p) => !re.test(p)).map((p) => `should match ${p}`), ...mustNot.filter((p) => re.test(p)).map((p) => `must not match ${p}`)];
if (bad.length) {
    console.error('✘ public-light-guard: path rule regression');
    bad.forEach((b) => console.error('  ' + b));
    process.exit(1);
}
console.log('✔ public-light-guard: index.html mirrors public-light.ts, path rule sane');
