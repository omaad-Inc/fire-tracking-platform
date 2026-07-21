// Génère, à partir de sgi.json + posts.ts :
//   1. prerender-routes.txt (consommé par angular.json → build.options.prerender)
//   2. public/sitemap.xml (pages publiques FR/EN + comparateur + une fiche par SGI)
// Lancé automatiquement avant `ng build` (voir scripts npm) pour que les
// fiches SGI et les articles de blog restent synchronisés avec les données,
// et que chaque page publique soit prérendue (P4-SEO-1) avec ses balises SEO
// + hreflang dans le HTML initial pour les crawlers.
import { readFileSync, writeFileSync } from 'node:fs';

const ORIGIN = 'https://omaad.africa';

// ── SGI comparateur (FR only, no :lang prefix) ──
const dataset = JSON.parse(
    readFileSync(new URL('../src/app/pages/tools/comparateur-sgi-brvm/data/sgi.json', import.meta.url), 'utf8')
);
const comparateurRoutes = [
    '/outils/comparateur-sgi-brvm',
    ...dataset.sgis.map((s) => `/outils/comparateur-sgi-brvm/sgi/${s.id}`)
];

// ── Blog article slugs (parsed from the static posts metadata) ──
const postsSrc = readFileSync(
    new URL('../src/app/pages/landing/blog/posts.ts', import.meta.url), 'utf8'
);
const blogSlugs = [...postsSrc.matchAll(/slug:\s*'([^']+)'/g)].map((m) => m[1]);

// ── Bilingual (FR/EN) public marketing pages. Path is the lang-less suffix. ──
const LANG_PATHS = [
    '/landing',
    '/blog',
    '/faq',
    '/qui-sommes-nous',
    '/legal/mentions',
    '/legal/privacy',
    '/legal/terms',
    '/tools/fire-simulator',
    '/tools/compound-interest',
    '/fire-africa/welcome',
    ...blogSlugs.map((s) => `/blog/${s}`),
];

const LANGS = ['fr', 'en'];
const langRoutes = LANG_PATHS.flatMap((p) => LANGS.map((l) => `/${l}${p}`));

// ── prerender-routes.txt ──
// '/' (home) renders the landing too; keep it so the bare origin is prerendered.
const prerenderRoutes = ['/', ...langRoutes, ...comparateurRoutes];
writeFileSync(
    new URL('../prerender-routes.txt', import.meta.url),
    prerenderRoutes.join('\n') + '\n'
);
console.log(`prerender-routes.txt généré : ${prerenderRoutes.length} routes (${LANG_PATHS.length} pages × ${LANGS.length} langues + ${comparateurRoutes.length} SGI + home)`);

// ── sitemap.xml ──
// Each bilingual page emits one <url> per locale, and every <url> carries the
// full FR/EN/x-default hreflang alternate set (Google's recommended shape).
const xml = (path) => {
    const alts = [
        `        <xhtml:link rel="alternate" hreflang="fr" href="${ORIGIN}/fr${path}"/>`,
        `        <xhtml:link rel="alternate" hreflang="en" href="${ORIGIN}/en${path}"/>`,
        `        <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}/fr${path}"/>`,
    ].join('\n');
    return LANGS.map((l) =>
        `    <url>\n        <loc>${ORIGIN}/${l}${path}</loc>\n${alts}\n    </url>`
    ).join('\n');
};

const langEntries = LANG_PATHS.map(xml).join('\n');
const sgiEntries = comparateurRoutes
    .map((r) => `    <url><loc>${ORIGIN}${r}</loc></url>`)
    .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${langEntries}
${sgiEntries}
</urlset>
`;
writeFileSync(new URL('../public/sitemap.xml', import.meta.url), sitemap);
console.log(`sitemap.xml généré : ${LANG_PATHS.length * LANGS.length + comparateurRoutes.length} URLs (dont ${blogSlugs.length} articles × ${LANGS.length})`);
