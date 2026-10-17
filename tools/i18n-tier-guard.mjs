#!/usr/bin/env node
/**
 * i18n tier guard (landing backlog F13, 2026-10-17).
 *
 * Public routes load only the PUBLIC dictionary tier (src/app/i18n/fr.public.ts,
 * en.public.ts); the app tier (fr.ts, en.ts) arrives with the first in-app
 * route. A public component that reads an app-tier key would render a raw key
 * path on prod (and self-heal a beat later). This guard fails the build when:
 *
 *  1. a file under a PUBLIC page directory references a namespace that is not
 *     in the public tier (`t('ns.`, `'ns.' +`, `` `ns.`` literals);
 *  2. a namespace exists in both tiers, or EN's tiers do not mirror FR's.
 *
 * Run: `npm run i18n:tier-guard` (chained into `npm run build` and `build:pwa`).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PUBLIC_DIRS = ['src/app/pages/landing', 'src/app/pages/tools', 'src/app/pages/public', 'src/app/pages/notfound'];
const topKeys = (file) => new Set([...readFileSync(file, 'utf8').matchAll(/^  ([a-zA-Z0-9_]+): \{/gm)].map((m) => m[1]));

const frPublic = topKeys('src/app/i18n/fr.public.ts'), enPublic = topKeys('src/app/i18n/en.public.ts');
const frApp = topKeys('src/app/i18n/fr.ts'), enApp = topKeys('src/app/i18n/en.ts');
const problems = [];
const same = (a, b) => a.size === b.size && [...a].every((k) => b.has(k));
if (!same(frPublic, enPublic)) problems.push(`fr.public.ts and en.public.ts do not hold the same namespaces: ${[...frPublic].filter((k) => !enPublic.has(k)).concat([...enPublic].filter((k) => !frPublic.has(k))).join(', ')}`);
if (!same(frApp, enApp)) problems.push(`fr.ts and en.ts do not hold the same namespaces: ${[...frApp].filter((k) => !enApp.has(k)).concat([...enApp].filter((k) => !frApp.has(k))).join(', ')}`);
for (const k of frPublic) if (frApp.has(k)) problems.push(`namespace "${k}" is in both tiers`);

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p, out);
        else if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) out.push(p);
    }
    return out;
}
const refs = /(?:\bt\(|i18n\.t\(|\.t\()\s*(?:'|"|`)([a-zA-Z0-9_]+)\.|'([a-zA-Z0-9_]+)\.[a-zA-Z0-9_.]*'\s*\+/g;
for (const dir of PUBLIC_DIRS) {
    for (const file of walk(dir)) {
        const src = readFileSync(file, 'utf8');
        for (const m of src.matchAll(refs)) {
            const ns = m[1] ?? m[2];
            if (ns && !frPublic.has(ns)) {
                const line = src.slice(0, m.index).split('\n').length;
                problems.push(`${file}:${line}: "${ns}.*" is an app-tier namespace used on a public page`);
            }
        }
    }
}
if (problems.length) {
    console.error('\n✘ i18n-tier-guard:\n');
    for (const p of problems) console.error('  • ' + p);
    console.error('\nMove the namespace into fr.public.ts + en.public.ts (and out of fr.ts + en.ts), or keep the key off public pages.\n');
    process.exit(1);
}
console.log(`✓ i18n-tier-guard: public tier = ${[...frPublic].join(', ')}; public pages reference nothing else.`);
