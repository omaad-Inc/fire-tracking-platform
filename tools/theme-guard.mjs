#!/usr/bin/env node
/**
 * Theme guard (Web Premium P3-2) — locks in the lean PrimeNG preset.
 *
 * `src/app/core/theme/aura-lean.ts` composes the Aura preset from only the
 * component themes the app renders, instead of shipping all 75 of them in the
 * initial bundle. The failure mode of a lean preset is silent: a PrimeNG
 * component whose theme is missing renders with no tokens, not with an error.
 *
 * So this fails the build when a `primeng/<module>` is imported anywhere under
 * src/ and neither
 *   - `aura-lean.ts` lists a theme for it, nor
 *   - NO_THEME below says the module has no theme to list.
 * It also fails when aura-lean.ts lists a theme that Aura does not ship (a
 * typo would otherwise be an unstyled component at runtime).
 *
 * Indirect components (rendered INSIDE a direct one, e.g. the paginator the
 * table draws) are not importable from app code and are covered by the
 * runtime probe in e2e/theme-tokens.smoke.spec.ts.
 *
 * Run: `npm run theme:guard` (also chained into `npm run build`).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src';
const LEAN = 'src/app/core/theme/aura-lean.ts';
const AURA = 'node_modules/@primeng/themes/aura';

/** Modules that are services, directives or wrappers without a theme of their own. */
const NO_THEME = new Set([
    'api',          // MenuItem, MessageService, ...
    'config',       // providePrimeNG
    'chart',        // Chart.js wrapper, themed by core/theme/chart-theme.ts
    'styleclass',   // directive
    'basecomponent', 'base', 'dom', 'utils', 'icons', 'focustrap', 'autofocus', 'overlay', 'scroller', 'inputicon',
]);

/** primeng module -> Aura theme folder when the names differ. */
const ALIAS = { table: 'datatable' };

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p, out);
        else if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) out.push(p);
    }
    return out;
}

const lean = readFileSync(LEAN, 'utf8');
// Read the `components: { ... }` map, not the import lines: a theme that is
// imported but left out of the map is exactly the silent failure this guards.
// Anchored to a line that STARTS with the key, so the doc comment's own
// `{ ...base, components: {...} }` is not mistaken for the map.
const block = lean.match(/^\s*components:\s*\{\s*\n([\s\S]*?)\n\s*\},?\s*$/m);
if (!block) {
    console.error(`✘ theme-guard: could not find the components map in ${LEAN}`);
    process.exit(1);
}
const listed = new Set([...block[1].replace(/\/\/.*$/gm, '').matchAll(/\b([a-z]+)\b/g)].map(m => m[1]));
const importedThemes = new Set([...lean.matchAll(/from '@primeng\/themes\/aura\/([a-z]+)'/g)].map(m => m[1]));
importedThemes.delete('base');

const imported = new Map(); // module -> first file
for (const file of walk(ROOT)) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/from 'primeng\/([a-z]+)'/g)) {
        if (!imported.has(m[1])) imported.set(m[1], file);
    }
}

const problems = [];
for (const [mod, file] of imported) {
    if (NO_THEME.has(mod)) continue;
    const theme = ALIAS[mod] ?? mod;
    if (!listed.has(theme)) problems.push(`primeng/${mod} is imported (${file}) but ${LEAN} lists no '${theme}' theme`);
}
for (const theme of listed) {
    if (!existsSync(join(AURA, theme, 'index.mjs'))) problems.push(`${LEAN} lists '${theme}' but Aura ships no such theme`);
    if (!importedThemes.has(theme)) problems.push(`${LEAN} maps '${theme}' without importing '@primeng/themes/aura/${theme}'`);
}
for (const theme of importedThemes) {
    if (!listed.has(theme)) problems.push(`${LEAN} imports the '${theme}' theme but leaves it out of the components map`);
}

if (problems.length) {
    console.error('\n✘ theme-guard: the lean PrimeNG preset does not cover the app:\n');
    for (const p of problems) console.error('  • ' + p);
    console.error(`\n${problems.length} problem(s). Add the theme to ${LEAN} (or the module to NO_THEME in tools/theme-guard.mjs if it has none).\n`);
    process.exit(1);
}
console.log(`✓ theme-guard: ${imported.size} primeng modules imported, ${listed.size} themes in the lean preset, every themed module covered.`);
