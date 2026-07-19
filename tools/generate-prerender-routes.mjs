// Génère, à partir de sgi.json :
//   1. prerender-routes.txt (consommé par angular.json → build.options.prerender)
//   2. public/sitemap.xml (pages publiques + comparateur + une fiche par SGI)
// Lancé automatiquement avant `ng build` (voir scripts npm) pour que les
// 41 fiches restent synchronisées avec les données.
import { readFileSync, writeFileSync } from 'node:fs';

const ORIGIN = 'https://omaad.africa';

const dataset = JSON.parse(
    readFileSync(new URL('../src/app/pages/tools/comparateur-sgi-brvm/data/sgi.json', import.meta.url), 'utf8')
);

const comparateurRoutes = [
    '/outils/comparateur-sgi-brvm',
    ...dataset.sgis.map((s) => `/outils/comparateur-sgi-brvm/sgi/${s.id}`)
];

writeFileSync(new URL('../prerender-routes.txt', import.meta.url), comparateurRoutes.join('\n') + '\n');
console.log(`prerender-routes.txt généré : ${comparateurRoutes.length} routes`);

// ── sitemap.xml ──
const publicRoutes = [
    '/',
    '/fr/landing',
    '/en/landing',
    '/fr/blog',
    '/en/blog',
    '/fr/faq',
    '/fr/qui-sommes-nous',
    '/fr/tools/fire-simulator',
    '/fr/tools/compound-interest',
    '/en/tools/fire-simulator',
    '/en/tools/compound-interest'
];

const urls = [...publicRoutes, ...comparateurRoutes]
    .map((r) => `    <url><loc>${ORIGIN}${r === '/' ? '' : r}</loc></url>`)
    .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

writeFileSync(new URL('../public/sitemap.xml', import.meta.url), sitemap);
console.log(`sitemap.xml généré : ${publicRoutes.length + comparateurRoutes.length} URLs`);
