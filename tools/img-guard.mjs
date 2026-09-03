#!/usr/bin/env node
/**
 * Image guard (Web Premium P2-7) — every <img> declares its size.
 *
 * An <img> without width and height has no box until its bytes arrive, so the
 * page around it jumps when they do (layout shift, the CLS half of Core Web
 * Vitals). Every image in src/app must therefore carry `width` and `height`
 * attributes (static or bound), or NgOptimizedImage's `fill`. The attributes
 * are size HINTS: CSS still decides the rendered box; they only fix its
 * aspect ratio before load.
 *
 * Lazy-loading is deliberately NOT enforced here: an above-the-fold logo or a
 * hero cover must stay eager (lazy-loading the LCP image makes it slower), so
 * that stays a judgement per call site.
 *
 * On the pre-P2-7 tree this reports 32 images; after it, zero.
 * Run: `npm run img:guard` (also chained into `npm run build`).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src/app';

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        const st = statSync(p);
        if (st.isDirectory()) walk(p, out);
        else if ((name.endsWith('.ts') && !name.endsWith('.spec.ts')) || name.endsWith('.html')) out.push(p);
    }
    return out;
}

const has = (tag, attr) => new RegExp(`(^|\\s)\\[?${attr}\\]?=`).test(tag) || new RegExp(`(^|\\s)${attr}(\\s|>|/)`).test(tag);

const violations = [];
for (const file of walk(ROOT)) {
    const src = readFileSync(file, 'utf8');
    const re = /<img\b[^>]*>/gs;
    let m;
    while ((m = re.exec(src))) {
        const tag = m[0].replace(/\s+/g, ' ');
        // A bare `<img>` inside prose or a string template (e.g. a comment
        // that mentions the element) is not markup with a source.
        if (!/\b(src|ngSrc)\b/.test(tag)) continue;
        const sized = (has(tag, 'width') && has(tag, 'height')) || /(^|\s)fill(\s|>|=)/.test(tag);
        if (!sized) {
            const line = src.slice(0, m.index).split('\n').length;
            violations.push(`${file}:${line}: ${tag.slice(0, 100)}`);
        }
    }
}

if (violations.length) {
    console.error('\n✘ img-guard: <img> without width and height (layout shift until the bytes arrive):\n');
    for (const v of violations) console.error('  • ' + v);
    console.error(`\n${violations.length} image(s). Add width and height (size hints; CSS still owns the box) or NgOptimizedImage fill (P2-7).\n`);
    process.exit(1);
}
console.log('✓ img-guard: every <img> declares its intrinsic size.');
