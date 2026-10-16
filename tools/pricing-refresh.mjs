#!/usr/bin/env node
/**
 * Refresh src/assets/pricing/plans.json from GET /billing/plans (see
 * tools/pricing-guard.mjs for why the export exists).
 *
 *     npm run pricing:refresh                                   # prod (the reference)
 *     PRICING_API=http://localhost:8000/api/v1 npm run pricing:refresh
 *
 * The file is the raw endpoint body, pretty-printed, so a diff reads as a
 * price change. After a refresh, align LANDING_PASS_LADDER and commit both.
 */
import { writeFileSync } from 'node:fs';

const api = (process.env.PRICING_API || 'https://api.omaad.africa/api/v1').replace(/\/$/, '');
const OUT = 'src/assets/pricing/plans.json';
const res = await fetch(`${api}/billing/plans`);
if (!res.ok) { console.error(`✘ pricing-refresh: ${api}/billing/plans answered ${res.status}`); process.exit(1); }
const body = await res.json();
if (!Array.isArray(body.plans) || !body.plans.length) { console.error('✘ pricing-refresh: no plans in the response'); process.exit(1); }
writeFileSync(OUT, JSON.stringify(body, null, 2) + '\n');
console.log(`✓ pricing-refresh: ${OUT} written from ${api} (${body.plans.map((p) => `${p.plan}: ${p.durations.length}`).join(', ')}).`);
