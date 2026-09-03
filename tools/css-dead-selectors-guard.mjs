#!/usr/bin/env node
/**
 * Dead-selector guard (Web Premium P2-2) — keeps the global stylesheet honest.
 *
 * Every class name the GLOBAL SCSS defines (src/styles.scss and everything
 * under src/assets/layout/) must be referenced by something that can put it on
 * a DOM node: a template or TS file under src/, or src/index.html. A class
 * that nothing references is dead weight in the initial stylesheet, and
 * because these rules ship to every visitor on every route the diet matters
 * more here than in a lazy chunk.
 *
 * Exempt: `p-*` classes (PrimeNG emits them at runtime, e.g. the toast
 * position classes, so a source scan cannot see them) and the explicit
 * runtime list below (state classes toggled by code paths that build the
 * name dynamically). Anything added to RUNTIME_CLASSES needs the comment
 * saying who sets it.
 *
 * On the pre-P2-2 tree this reports 22 dead classes; after it, zero.
 * Run: `npm run css:guard` (also chained into `npm run build`).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const GLOBAL_SCSS = ['src/styles.scss', 'src/assets/layout'];
const REFERENCE_ROOTS = ['src/app', 'src/index.html', 'src/app.component.ts'];

// Classes set by code that does not spell the full name out, or by browsers.
const RUNTIME_CLASSES = new Set([
    // (none yet)
]);

function walk(p, exts, out = []) {
    const st = statSync(p);
    if (st.isDirectory()) {
        for (const n of readdirSync(p)) walk(join(p, n), exts, out);
    } else if (exts.some((e) => p.endsWith(e))) {
        out.push(p);
    }
    return out;
}

const scssFiles = GLOBAL_SCSS.flatMap((p) => walk(p, ['.scss', '.css']));
const references = REFERENCE_ROOTS.flatMap((p) => walk(p, ['.ts', '.html']))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');

const defined = new Map();
for (const file of scssFiles) {
    const src = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
        // url(...) and attribute selectors can contain dots that are not classes
        .replace(/url\([^)]*\)/g, '')
        .replace(/\[[^\]]*\]/g, '');
    for (const m of src.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
        const cls = m[1];
        if (!defined.has(cls)) defined.set(cls, new Set());
        defined.get(cls).add(file);
    }
}

const dead = [];
for (const [cls, files] of defined) {
    if (cls.startsWith('p-') || RUNTIME_CLASSES.has(cls)) continue;
    if (references.includes(cls)) continue;
    dead.push(`.${cls}  (${[...files].join(', ')})`);
}

if (dead.length) {
    console.error('\n✘ css-dead-selectors-guard: global SCSS defines classes nothing references:\n');
    for (const d of dead.sort()) console.error('  • ' + d);
    console.error(`\n${dead.length} dead class(es). Delete the rule, or add the class to RUNTIME_CLASSES with a note on who sets it (P2-2).\n`);
    process.exit(1);
}
console.log(`✓ css-dead-selectors-guard: all ${defined.size} global classes are referenced (or PrimeNG runtime).`);
