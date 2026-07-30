#!/usr/bin/env node
/**
 * Dark-mode guardrail (dark-mode audit Batch 5).
 *
 * Catches the two class-level bug patterns that shipped broken dark surfaces:
 *
 *  1. PHANTOM DARK TOKENS - `dark:*-<palette>-<step>` referencing a step that
 *     does not exist in tailwind.config.js. Tailwind drops unknown classes
 *     SILENTLY, so the light fallback ships (the unreadable "Excellent" band).
 *  2. LIGHT-LEAK SOLIDS - a solid light background (`bg-white`, `bg-<pal>-50/
 *     100`) on a class string with no `dark:bg-*` companion anywhere in the
 *     same string. Legal cases are annotated with `dark-ok` on the same line.
 *
 * Usage:  node scripts/check-dark-classes.mjs   (exit 1 on findings)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src', 'app');

// Palette steps actually defined in tailwind.config.js (keep in sync).
const STEPS = {
    brand: ['50','100','200','300','400','500','600','700','800','900','950'],
    ochre: ['50','100','200','300','400','500','600','700','800','900','950'],
    warm: ['0','50','100','200','300','400','500','600','700','800','900','950'],
    positive: ['50','100','200','300','400','500','600','700','800','900'],
    warning: ['50','100','200','300','400','500','600','700','800','900'],
    negative: ['50','100','200','300','400','500','600','700','800','900'],
    // surface-* comes from tailwindcss-primeui (0..950), always valid.
};

const files = [];
(function walk(dir) {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        const st = statSync(p);
        if (st.isDirectory()) walk(p);
        else if (/\.(ts|html)$/.test(name) && !/\.spec\.ts$/.test(name)) files.push(p);
    }
})(SRC);

const findings = [];

const phantomRe = /dark:(?:bg|text|border|from|to|via|ring|divide|stroke|fill|outline)-(brand|ochre|warm|positive|warning|negative)-(\d+)(?:\/\d+)?/g;
// Solid light fills. `bg-<pal>-50/60` (alpha'd tint) is still a light tint and
// stays flagged; `bg-white/N` is a glass overlay on dark panels and is fine.
const lightSolidRe = /(?:^|[\s'"`])bg-(white(?!\/)|(?:ochre|positive|warning|negative|brand)-(?:50|100)(?:\/\d+)?)(?=$|[\s'"`])/;

for (const file of files) {
    const rel = relative(ROOT, file);
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
        // 1. phantom dark steps
        for (const m of line.matchAll(phantomRe)) {
            const [, pal, step] = m;
            if (STEPS[pal] && !STEPS[pal].includes(step)) {
                findings.push(`${rel}:${i + 1}  phantom token dark:*-${pal}-${step} (step not in tailwind.config.js)`);
            }
        }
        // 2. light solid without a dark companion on the same line
        if (line.includes('dark-ok')) return;
        if (lightSolidRe.test(line) && !/dark:(?:bg|from|to)-/.test(line)) {
            // Multi-line class bindings: tolerate when an adjacent line carries the dark: variant.
            const around = (lines[i - 1] || '') + (lines[i + 1] || '');
            if (!/dark:(?:bg|from|to)-/.test(around)) {
                findings.push(`${rel}:${i + 1}  light background without dark: companion -> ${line.trim().slice(0, 100)}`);
            }
        }
    });
}

if (findings.length) {
    console.error(`\ndark-mode guardrail: ${findings.length} finding(s)\n`);
    for (const f of findings) console.error('  ' + f);
    console.error('\nFix the class, or annotate the line with `dark-ok` if the light fill is intentional in dark mode.');
    process.exit(1);
}
console.log(`dark-mode guardrail: OK (${files.length} files scanned)`);
