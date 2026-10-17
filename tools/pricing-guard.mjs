#!/usr/bin/env node
/**
 * Pricing ladder guard (landing backlog F11, 2026-10-17).
 *
 * The public landing and /tarifs are prerendered, so they cannot fetch the
 * price grid at runtime: LANDING_PASS_LADDER in
 * src/app/pages/landing/components/pricingwidget.ts is a hand-kept MIRROR of
 * the backend grid (PRICING in backend/app/services/billing_service.py,
 * served by GET /api/v1/billing/plans). The landing e2e compares the ladder
 * to the LOCAL backend, which never runs on Netlify. This guard compares it
 * to a committed export of that endpoint instead, so a build anywhere fails
 * when the two drift apart.
 *
 * Source of truth for the export: src/assets/pricing/plans.json, the raw
 * body of GET /billing/plans. Refresh it whenever the backend grid changes
 * (prod is the reference once the backend change is deployed):
 *
 *     npm run pricing:refresh                       # from https://api.omaad.africa
 *     PRICING_API=http://localhost:8000/api/v1 npm run pricing:refresh   # local backend
 *
 * then update LANDING_PASS_LADDER to match and commit both files together.
 *
 * Run: `npm run pricing:guard` (chained into `npm run build` and `build:pwa`).
 */
import { readFileSync } from 'node:fs';

const LADDER_FILE = 'src/app/pages/landing/components/pricingwidget.ts';
const PLANS_FILE = 'src/assets/pricing/plans.json';

const src = readFileSync(LADDER_FILE, 'utf8');
const m = /export const LANDING_PASS_LADDER[^=]*=\s*(\{[\s\S]*?\n\});/.exec(src);
if (!m) { console.error(`✘ pricing-guard: LANDING_PASS_LADDER not found in ${LADDER_FILE}`); process.exit(1); }
// The ladder is a plain object literal (numbers and keys only); evaluate it as such.
const ladder = new Function(`return (${m[1]});`)();
const keysSrc = /export const PASS_KEYS[^=]*=\s*(\[[^\]]*\])/.exec(src);
const passKeys = keysSrc ? new Function(`return (${keysSrc[1]});`)() : Object.keys(ladder.pro ?? {});

const plans = JSON.parse(readFileSync(PLANS_FILE, 'utf8'));
const problems = [];

const exported = {};
for (const p of plans.plans ?? []) {
    exported[p.plan] = {};
    for (const d of p.durations ?? []) exported[p.plan][d.duration_key] = { days: d.days, xof: d.xof, eur: d.eur };
}

for (const tier of Object.keys(ladder)) {
    if (!exported[tier]) { problems.push(`tier "${tier}" is in the ladder but not in ${PLANS_FILE}`); continue; }
    for (const key of Object.keys(ladder[tier])) {
        const a = ladder[tier][key], b = exported[tier][key];
        if (!b) { problems.push(`${tier}.${key} is in the ladder but not in ${PLANS_FILE}`); continue; }
        for (const f of ['days', 'xof', 'eur']) {
            if (Number(a[f]) !== Number(b[f])) problems.push(`${tier}.${key}.${f}: ladder ${a[f]} vs export ${b[f]}`);
        }
    }
    for (const key of Object.keys(exported[tier])) if (!ladder[tier][key]) problems.push(`${tier}.${key} is exported but missing from the ladder`);
}
for (const tier of Object.keys(exported)) if (!ladder[tier]) problems.push(`tier "${tier}" is exported but missing from the ladder`);
for (const tier of Object.keys(ladder)) {
    const order = Object.keys(ladder[tier]).join(',');
    if (order !== passKeys.join(',')) problems.push(`${tier}: duration order ${order} differs from PASS_KEYS ${passKeys.join(',')}`);
}

if (problems.length) {
    console.error(`\n✘ pricing-guard: LANDING_PASS_LADDER drifts from ${PLANS_FILE}:\n`);
    for (const p of problems) console.error('  • ' + p);
    console.error('\nIf the backend grid changed: `npm run pricing:refresh`, then align LANDING_PASS_LADDER in pricingwidget.ts and commit both.\n');
    process.exit(1);
}
const rungs = Object.values(ladder).reduce((n, t) => n + Object.keys(t).length, 0);
console.log(`✓ pricing-guard: LANDING_PASS_LADDER matches ${PLANS_FILE} (${rungs} rungs).`);
