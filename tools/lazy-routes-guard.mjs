#!/usr/bin/env node
/**
 * Lazy-routes guard (Web Premium P2-1) — locks in the settings/auth code split.
 *
 * Every `*.routes.ts` under src/ must declare its screens with
 * `loadComponent: () => import(...)` (or `loadChildren`). A static
 * `component: Foo` entry drags Foo, and everything Foo imports, into the chunk
 * of the route file itself, so opening /settings/account downloaded all ten
 * settings sections (224 kB) and /auth/login downloaded all six auth screens.
 *
 * Fails the build on ANY eager `component:` key in a route file. On the
 * pre-P2-1 tree this reports 17 violations; after it, zero. Route files are
 * the only place this key is legitimate in Angular's Routes type, so there is
 * no allowlist: if a screen truly must be eager, say why in a comment and add
 * it here explicitly.
 *
 * Run: `npm run routes:guard` (also chained into `npm run build`).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src';
// `component:` preceded by start-of-line, `{`, `,` or whitespace; this leaves
// `loadComponent:` alone (the `d` before `component` is not in the set).
const EAGER = /(^|[{,\s])component\s*:/;

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        const st = statSync(p);
        if (st.isDirectory()) walk(p, out);
        else if (name.endsWith('.routes.ts')) out.push(p);
    }
    return out;
}

const violations = [];
for (const file of walk(ROOT)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, idx) => {
        const code = line.replace(/\/\/.*$/, '');
        if (EAGER.test(code)) {
            violations.push(`${file}:${idx + 1}: ${line.trim().slice(0, 90)}`);
        }
    });
}

if (violations.length) {
    console.error('\n✘ lazy-routes-guard: eager `component:` entries found in route files:\n');
    for (const v of violations) console.error('  • ' + v);
    console.error(`\n${violations.length} violation(s). Use loadComponent: () => import('./x').then(m => m.X) so each screen ships as its own chunk (P2-1).\n`);
    process.exit(1);
}
console.log('✓ lazy-routes-guard: every route file declares its screens with loadComponent/loadChildren.');
