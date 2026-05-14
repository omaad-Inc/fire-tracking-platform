/**
 * Static metadata for the 15 FIRE Africa newsletter editions.
 *
 * Full content lives in `assets/newsletters/edition-NNN-blocks.json` and is
 * fetched on-demand by the article view. The fields below are everything the
 * blog list page needs to render cards without loading every edition.
 *
 * `slug` is the URL-visible identifier (`/:lang/blog/:slug`). It matches the
 * email render filenames in `newsletters/edition-NNN-<slug>.html` minus the
 * `edition-NNN-` prefix.
 *
 * `date` is a stand-in publication date used while the editions are still in
 * "draft" status (real launch: 2026-06-01 on Beehiiv). Dates are placed
 * monthly leading up to launch so the timeline looks coherent for previewing.
 */
export interface BlogPost {
    edition: string;              // "000".."015"
    slug: string;                 // URL slug, no leading "edition-NNN-"
    title: string;
    subtitle: string;
    date: string;                 // ISO yyyy-mm-dd
    tags: string[];
    excerpt: string;              // 1-2 sentence teaser for the card
    coverImage: string;           // Path or URL
    contentPath: string;          // Path to JSON blocks
}

// Reusable cover image set — swap freely later. Unsplash hotlinks are
// royalty-free for embedding and don't require an API key.
const COVERS = [
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80&auto=format', // dashboard/finance
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1200&q=80&auto=format', // calculator/numbers
    'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1200&q=80&auto=format', // West-African community
    'https://images.unsplash.com/photo-1448630360428-65456885c650?w=1200&q=80&auto=format', // Dakar / urban Africa
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80&auto=format', // stock chart
    'https://images.unsplash.com/photo-1604594849809-dfedbc827105?w=1200&q=80&auto=format', // diaspora / city + traditional
    'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80&auto=format', // calculator + chart
    'https://images.unsplash.com/photo-1579621970590-9d624316904b?w=1200&q=80&auto=format', // coins / saving
];

const cover = (i: number) => COVERS[i % COVERS.length];

export const BLOG_POSTS: BlogPost[] = [
    {
        edition: '000',
        slug: 'cest-quoi-fire',
        title: "C'est quoi le mouvement FIRE ?",
        subtitle: 'Édition #000 — FIRE Africa par Omaad',
        date: '2025-04-01',
        tags: ['FIRE', 'introduction', 'éducation'],
        excerpt: "FIRE n'est pas une mode américaine. C'est une équation. Quand tes revenus passifs couvrent tes dépenses, tu es libre — peu importe ton âge ou ton pays.",
        coverImage: cover(0),
        contentPath: 'assets/newsletters/edition-000-blocks.json',
    },
    {
        edition: '001',
        slug: 'regle-4-pourcent',
        title: 'La règle des 4% : ce qui marche, ce qui ne marche pas',
        subtitle: 'Édition #001 — FIRE Africa par Omaad',
        date: '2025-05-01',
        tags: ['règle 4%', 'retraite', 'FIRE'],
        excerpt: "La règle des 4% est le pilier mathématique du FIRE. Mais elle a été pensée dans un contexte américain — voici ce qu'il faut adapter pour la BRVM.",
        coverImage: cover(1),
        contentPath: 'assets/newsletters/edition-001-blocks.json',
    },
    {
        edition: '002',
        slug: 'tontine-et-brvm',
        title: 'Tontine et BRVM : deux mondes, un même objectif',
        subtitle: 'Édition #002 — FIRE Africa par Omaad',
        date: '2025-06-01',
        tags: ['tontine', 'BRVM', 'épargne'],
        excerpt: "La tontine, c'est de l'épargne forcée. La BRVM, c'est de la capitalisation. Combiner les deux, c'est construire un patrimoine qui te ressemble.",
        coverImage: cover(2),
        contentPath: 'assets/newsletters/edition-002-blocks.json',
    },
    {
        edition: '003',
        slug: 'special-dakar-immo',
        title: 'Spécial Dakar : faut-il encore acheter de l\'immobilier ?',
        subtitle: 'Édition #003 — FIRE Africa par Omaad',
        date: '2025-07-01',
        tags: ['immobilier', 'Dakar', 'patrimoine'],
        excerpt: "Le marché immobilier de Dakar a doublé en dix ans. Mais le rendement locatif net est-il vraiment meilleur que la BRVM ?",
        coverImage: cover(3),
        contentPath: 'assets/newsletters/edition-003-blocks.json',
    },
    {
        edition: '004',
        slug: 'brvm-vs-sp500',
        title: 'BRVM vs S&P 500 : qui gagne sur 10 ans ?',
        subtitle: 'Édition #004 — FIRE Africa par Omaad',
        date: '2025-08-01',
        tags: ['BRVM', 'S&P 500', 'comparaison'],
        excerpt: "Tout le monde compare au S&P 500. Mais sur 10 ans, dividendes inclus et net de fiscalité — la BRVM tient bien mieux que tu ne le penses.",
        coverImage: cover(4),
        contentPath: 'assets/newsletters/edition-004-blocks.json',
    },
    {
        edition: '005',
        slug: 'brvm-vs-cac-stoxx',
        title: 'BRVM vs CAC 40 vs Stoxx 600 : le match européen',
        subtitle: 'Édition #005 — FIRE Africa par Omaad',
        date: '2025-09-01',
        tags: ['BRVM', 'CAC 40', 'Stoxx', 'Europe'],
        excerpt: "Quand on vit entre Paris et Dakar, on a souvent un PEA en Europe. Question légitime : quel marché a vraiment surperformé ?",
        coverImage: cover(5),
        contentPath: 'assets/newsletters/edition-005-blocks.json',
    },
    {
        edition: '006',
        slug: 'frais-fcp-brvm',
        title: 'FCP BRVM : combien tu paies vraiment en frais',
        subtitle: 'Édition #006 — FIRE Africa par Omaad',
        date: '2025-10-01',
        tags: ['FCP', 'frais', 'BRVM'],
        excerpt: "Les frais des FCP de la BRVM sont parmi les plus opaques au monde. On a décortiqué les notices : voici ce que tu paies réellement.",
        coverImage: cover(6),
        contentPath: 'assets/newsletters/edition-006-blocks.json',
    },
    {
        edition: '007',
        slug: 'fcp-vs-actions-directes',
        title: 'FCP ou actions directes : que choisir sur la BRVM ?',
        subtitle: 'Édition #007 — FIRE Africa par Omaad',
        date: '2025-11-01',
        tags: ['FCP', 'actions directes', 'BRVM'],
        excerpt: "Diversification facile ou contrôle total des frais ? La question divise depuis 30 ans. Voici notre cadre de décision pour la BRVM.",
        coverImage: cover(7),
        contentPath: 'assets/newsletters/edition-007-blocks.json',
    },
    {
        edition: '008',
        slug: 'dca-brvm',
        title: 'DCA sur la BRVM : le seul truc qui marche vraiment',
        subtitle: 'Édition #008 — FIRE Africa par Omaad',
        date: '2025-12-01',
        tags: ['DCA', 'BRVM', 'discipline'],
        excerpt: "Pas besoin de timing parfait. Investis 50 000 FCFA tous les mois, fais-le pendant 10 ans, et regarde la magie opérer.",
        coverImage: cover(0),
        contentPath: 'assets/newsletters/edition-008-blocks.json',
    },
    {
        edition: '009',
        slug: 'comparer-sgi-brvm',
        title: 'Comparer les SGI de la BRVM : qui choisir ?',
        subtitle: 'Édition #009 — FIRE Africa par Omaad',
        date: '2026-01-01',
        tags: ['SGI', 'BRVM', 'courtier'],
        excerpt: "Toutes les SGI de la BRVM ne se valent pas. Frais, plateforme, support — voici notre classement à jour des 13 SGI agréées.",
        coverImage: cover(1),
        contentPath: 'assets/newsletters/edition-009-blocks.json',
    },
    {
        edition: '010',
        slug: 'trading-vs-dca',
        title: 'Trading ou DCA : la guerre des nerfs',
        subtitle: 'Édition #010 — FIRE Africa par Omaad',
        date: '2026-02-01',
        tags: ['trading', 'DCA', 'discipline'],
        excerpt: "Trader, c'est sexy. DCA, c'est ennuyeux. Mais sur 20 ans, les données montrent une chose claire — et elle te fera dormir la nuit.",
        coverImage: cover(2),
        contentPath: 'assets/newsletters/edition-010-blocks.json',
    },
    {
        edition: '011',
        slug: '100k-fcfa-brvm',
        title: 'Démarrer avec 100 000 FCFA sur la BRVM',
        subtitle: 'Édition #011 — FIRE Africa par Omaad',
        date: '2026-03-01',
        tags: ['débutant', 'BRVM', 'petit budget'],
        excerpt: "Pas besoin d'être riche pour commencer. Avec 100 000 FCFA et un peu de méthode, voici comment poser la première brique du patrimoine.",
        coverImage: cover(3),
        contentPath: 'assets/newsletters/edition-011-blocks.json',
    },
    {
        edition: '012',
        slug: 'indices-brvm',
        title: 'Les indices BRVM expliqués (BRVM 30, Composite, Prestige)',
        subtitle: 'Édition #012 — FIRE Africa par Omaad',
        date: '2026-04-01',
        tags: ['indices', 'BRVM', 'éducation'],
        excerpt: "BRVM 30, BRVM Composite, BRVM Prestige — chacun raconte une histoire différente. Voici comment les lire et lequel suivre vraiment.",
        coverImage: cover(4),
        contentPath: 'assets/newsletters/edition-012-blocks.json',
    },
    {
        edition: '013',
        slug: 'preparer-retraite-brvm',
        title: 'Préparer sa retraite à 35 ans avec la BRVM',
        subtitle: 'Édition #013 — FIRE Africa par Omaad',
        date: '2026-05-01',
        tags: ['retraite', 'BRVM', 'long terme'],
        excerpt: "L'IPRES ne suffira pas. Voici comment construire, dès aujourd'hui, le complément de retraite qui te rendra vraiment libre.",
        coverImage: cover(5),
        contentPath: 'assets/newsletters/edition-013-blocks.json',
    },
    {
        edition: '014',
        slug: 'brvm-securisee-mythe',
        title: '« La BRVM est sécurisée » : mythe ou réalité ?',
        subtitle: 'Édition #014 — FIRE Africa par Omaad',
        date: '2026-05-14',
        tags: ['risque', 'BRVM', 'régulation'],
        excerpt: "On répète partout que la BRVM est « stable » et « sécurisée ». La régulation CREPMF est solide, mais ça ne veut pas dire ce que tu crois.",
        coverImage: cover(6),
        contentPath: 'assets/newsletters/edition-014-blocks.json',
    },
    {
        edition: '015',
        slug: 'gestion-mandat-vs-libre',
        title: 'Gestion sous mandat ou gestion libre : qui bat l\'indice ?',
        subtitle: 'Édition #015 — FIRE Africa par Omaad',
        date: '2026-06-14',
        tags: ['SPIVA', 'gestion sous mandat', 'SGI', 'BRVM', 'frais'],
        excerpt: "L'étude SPIVA est sans appel : 9 fonds actifs sur 10 ne battent pas leur indice après 15 ans. Et à la BRVM, la gestion sous mandat te coûte 2 à 3 % par an. Mauvaise idée ?",
        coverImage: cover(7),
        contentPath: 'assets/newsletters/edition-015-blocks.json',
    },
];

export function findPostBySlug(slug: string): BlogPost | undefined {
    return BLOG_POSTS.find(p => p.slug === slug);
}
