#!/usr/bin/env node
/**
 * i18n regression guard (P2-CONSISTENCY-1) — locks in the P0-4 bilingual sweep.
 *
 * Fails the build on TWO classes of regression:
 *
 *  1. NEW `isFr()` inline-ternary i18n. The 13 files below still use the legacy
 *     `isFr() ? 'Français' : 'English'` mechanism (their full migration to
 *     i18n.t() is tracked as P3-11); they are grandfathered. Introducing isFr()
 *     in ANY other file fails — so the legacy mechanism can only shrink.
 *
 *  2. NEW hardcoded accented (French) string literals inside a component's
 *     `template:` block, on already-clean files. User-facing FR/EN copy must go
 *     through i18n.t(); a raw "Épargne" in a template is exactly the half-
 *     translated leak P0-4 fixed. The dictionaries and the grandfathered files
 *     are exempt, and `{{ … }}` interpolations (which call t()) + comment lines
 *     are skipped to avoid false positives on keyword-matchers / legit code.
 *
 * Run: `npm run i18n:guard` (also chained into `npm run build`).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src/app';
const ACCENTED = /[àâäéèêëïîôöùûüÿçœÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇŒ]/;

// Files still on the legacy isFr() ternary mechanism (full migration = P3-11).
// This list may SHRINK but never grow.
const ISFR_GRANDFATHERED = new Set([
    'pages/patrimoine/components/asset-detail.ts',
    'pages/patrimoine/components/add-asset-page.ts',
    'pages/settings/components/plans.ts',
    'pages/landing/components/legal-mentions.ts',
    'pages/landing/components/legal-privacy.ts',
    'pages/landing/components/legal-terms.ts',
    'pages/landing/components/faq.ts',
    'pages/landing/blog/blog-list.ts',
    'pages/landing/blog/blog-article.ts',
    'pages/landing/components/fire-simulator.ts',
    'pages/landing/components/fire-africa-welcome.ts',
    'pages/landing/components/compound-calculator.ts',
]);

// Files exempt from the accented-template check: the dictionaries, plus every
// grandfathered isFr file (their FR ternary sides legitimately hold FR copy),
// plus landing/legal/blog marketing pages that carry long-form FR prose not yet
// dictionary-backed (tracked with the isFr work). Anything NOT here must be clean.
const ACCENTED_EXEMPT = new Set([
    ...ISFR_GRANDFATHERED,
]);
const ACCENTED_EXEMPT_DIRS = [
    'i18n/',
    'pages/landing/',        // marketing site prose (P4-SEO / P3-11 territory)
    'pages/tools/',          // public SEO tool (sgi.json-driven, FR by design)
];

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        const st = statSync(p);
        if (st.isDirectory()) walk(p, out);
        else if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) out.push(p);
    }
    return out;
}

/** Extract the content of a `template: \`...\`` block, else ''. */
function templateBlock(src) {
    const i = src.indexOf('template:');
    if (i === -1) return '';
    const start = src.indexOf('`', i);
    if (start === -1) return '';
    const end = src.indexOf('`', start + 1);
    // Template literals here contain no nested backticks, so first-close is safe.
    return end === -1 ? '' : src.slice(start + 1, end);
}

const violations = [];
for (const file of walk(ROOT)) {
    const rel = file.slice(ROOT.length + 1);
    const src = readFileSync(file, 'utf8');

    // (1) isFr() ratchet
    if (!ISFR_GRANDFATHERED.has(rel) && /\bisFr\(\)/.test(src)) {
        violations.push(`${rel}: uses isFr() — migrate to i18n.t() (legacy mechanism must not grow)`);
    }

    // (2) accented literals in the template block of a non-exempt file
    const exemptAccented = ACCENTED_EXEMPT.has(rel) || ACCENTED_EXEMPT_DIRS.some((d) => rel.startsWith(d));
    if (!exemptAccented) {
        const tpl = templateBlock(src);
        tpl.split('\n').forEach((line, idx) => {
            // strip interpolations ({{ t('...') }}) and HTML comments before checking
            const stripped = line.replace(/\{\{[^]*?\}\}/g, '').replace(/<!--[^]*?-->/g, '');
            if (ACCENTED.test(stripped)) {
                violations.push(`${rel}: accented literal in template (line ~${idx + 1}): ${line.trim().slice(0, 80)}`);
            }
        });
    }
}

if (violations.length) {
    console.error('\n✘ i18n-guard: hardcoded-i18n regressions found:\n');
    for (const v of violations) console.error('  • ' + v);
    console.error(`\n${violations.length} violation(s). Route user-facing copy through i18n.t() (see P0-4 / P2-CONSISTENCY-1).\n`);
    process.exit(1);
}
console.log('✓ i18n-guard: no isFr() growth and no hardcoded accented literals in clean templates.');
