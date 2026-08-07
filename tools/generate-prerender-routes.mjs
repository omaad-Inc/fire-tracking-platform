// Génère, à partir de sgi.json + posts.ts :
//   1. prerender-routes.txt (consommé par angular.json → build.options.prerender)
//   2. public/sitemap.xml (pages publiques FR/EN + comparateur + une fiche par SGI)
// Lancé automatiquement avant `ng build` (voir scripts npm) pour que les
// fiches SGI et les articles de blog restent synchronisés avec les données,
// et que chaque page publique soit prérendue (P4-SEO-1) avec ses balises SEO
// + hreflang dans le HTML initial pour les crawlers.
import { readFileSync, writeFileSync } from 'node:fs';

const ORIGIN = 'https://omaad.africa';

// Netlify serves each prerendered page at its trailing-slash URL and
// 301-redirects the no-slash form to it. The sitemap must list the 200 URL
// (trailing slash), matching the canonical/hreflang tags the app emits
// (see SeoService.withTrailingSlash), so Google never crawls a redirect.
const slash = (path) => (path.endsWith('/') ? path : `${path}/`);

// ── SGI comparateur (FR only, no :lang prefix) ──
const dataset = JSON.parse(
    readFileSync(new URL('../src/app/pages/tools/comparateur-sgi-brvm/data/sgi.json', import.meta.url), 'utf8')
);
// SGI detail pages: every one is prerendered (instant load), but only those
// with a detailed tariff grid (`tarif_status === 'complet'`) go in the sitemap.
// The pages without one are thin/near-duplicate; the runtime marks them
// `noindex, follow` (see sgi-detail.page.ts), so keeping them out of the
// sitemap avoids the contradictory "index me / don't index me" signal and
// concentrates crawl budget on the strong comparateur + detailed fiches.
const sgiDetailBase = '/outils/comparateur-sgi-brvm/sgi';
const sgiDetailAll = dataset.sgis.map((s) => `${sgiDetailBase}/${s.id}`);
const sgiDetailIndexable = dataset.sgis
    .filter((s) => s.tarif_status === 'complet')
    .map((s) => `${sgiDetailBase}/${s.id}`);
const comparateurRoutes = ['/outils/comparateur-sgi-brvm', ...sgiDetailAll];
// What the sitemap advertises (excludes the noindexed thin fiches).
const comparateurSitemapRoutes = ['/outils/comparateur-sgi-brvm', ...sgiDetailIndexable];

// ── Planificateur de stratégie BRVM (FR only, tabs routés) ──
const strategieRoutes = [
    '/outils/strategie-brvm',
    '/outils/strategie-brvm/detachements',
    '/outils/strategie-brvm/simulateur',
];

// ── Blog article slugs (parsed from the static posts metadata) ──
// Only editions whose newsletter has already been SENT (send `date` today or
// earlier) are prerendered/sitemapped; unsent future editions must not leak to
// crawlers even though the runtime component also hides them. This mirrors the
// `isPostPublished` gate in posts.ts. NOTE: this list is frozen at build time,
// so a new edition enters the sitemap/prerender only on the next deploy on or
// after its send date (the SPA still shows it to live visitors immediately).
const postsSrc = readFileSync(
    new URL('../src/app/pages/landing/blog/posts.ts', import.meta.url), 'utf8'
);
const now = new Date();
const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
// Each post object lists `slug` then `date`; pair them and keep only sent ones.
const blogSlugs = [...postsSrc.matchAll(/slug:\s*'([^']+)'[\s\S]*?date:\s*'(\d{4}-\d{2}-\d{2})'/g)]
    .filter((m) => m[2] <= todayIso)
    .map((m) => m[1]);

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

// ── Pages bilingues prérendues mais noindex (lead magnets) : dans
// prerender-routes.txt pour un chargement instantané, JAMAIS dans le sitemap.
const NOINDEX_LANG_PATHS = [
    '/fire-africa/guides',
];

const LANGS = ['fr', 'en'];
const langRoutes = [...LANG_PATHS, ...NOINDEX_LANG_PATHS].flatMap((p) => LANGS.map((l) => `/${l}${p}`));

// ── prerender-routes.txt ──
// '/' (home) renders the landing too; keep it so the bare origin is prerendered.
const prerenderRoutes = ['/', ...langRoutes, ...comparateurRoutes, ...strategieRoutes];
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
        `        <xhtml:link rel="alternate" hreflang="fr" href="${ORIGIN}${slash(`/fr${path}`)}"/>`,
        `        <xhtml:link rel="alternate" hreflang="en" href="${ORIGIN}${slash(`/en${path}`)}"/>`,
        `        <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}${slash(`/fr${path}`)}"/>`,
    ].join('\n');
    return LANGS.map((l) =>
        `    <url>\n        <loc>${ORIGIN}${slash(`/${l}${path}`)}</loc>\n${alts}\n    </url>`
    ).join('\n');
};

const langEntries = LANG_PATHS.map(xml).join('\n');
const sgiEntries = [...comparateurSitemapRoutes, ...strategieRoutes]
    .map((r) => `    <url><loc>${ORIGIN}${slash(r)}</loc></url>`)
    .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${langEntries}
${sgiEntries}
</urlset>
`;
writeFileSync(new URL('../public/sitemap.xml', import.meta.url), sitemap);
console.log(`sitemap.xml généré : ${LANG_PATHS.length * LANGS.length + comparateurSitemapRoutes.length + strategieRoutes.length} URLs indexables (dont ${blogSlugs.length} articles × ${LANGS.length} ; ${sgiDetailAll.length - sgiDetailIndexable.length} fiches SGI thin exclues → noindex)`);
