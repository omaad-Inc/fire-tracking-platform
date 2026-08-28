/**
 * Static metadata for the FIRE Africa newsletter editions (blog).
 *
 * Generated from resources/newsletters-2 via resources/build_blog.py.
 * Full article content lives in assets/blog/edition-NNN.json (normalized,
 * web-native blocks, zero em dashes) and is fetched on demand by the reader.
 * Editions are a numbered series and display in ascending order (#000 first).
 */
import { SITE_ORIGIN } from '../../../core/services/seo.service';

export interface BlogPost {
    edition: string;
    slug: string;
    title: string;
    subtitle: string;
    date: string;                 // ISO yyyy-mm-dd
    tags: string[];
    excerpt: string;
    readingMinutes: number;
    coverImage: string;           // unique per post, app-relative (assets/…)
    contentPath: string;          // normalized blocks JSON
}

// One distinct cover per edition, self-hosted. These used to be hotlinked from
// images.unsplash.com, which meant a cover could vanish for reasons we do not
// control (CDN reachability from West Africa, blockers, hotlink policy). They
// are now served from our own origin, so they are also service-worker cached
// and satisfy a strict `img-src 'self'`. Index N is edition #NNN.
const COVERS = [
    'assets/blog/covers/edition-000.jpg',
    'assets/blog/covers/edition-001.jpg',
    'assets/blog/covers/edition-002.jpg',
    'assets/blog/covers/edition-003.jpg',
    'assets/blog/covers/edition-004.jpg',
    'assets/blog/covers/edition-005.jpg',
    'assets/blog/covers/edition-006.jpg',
    'assets/blog/covers/edition-007.jpg',
    'assets/blog/covers/edition-008.jpg',
    'assets/blog/covers/edition-009.jpg',
    'assets/blog/covers/edition-010.jpg',
    'assets/blog/covers/edition-011.jpg',
    'assets/blog/covers/edition-012.jpg',
    'assets/blog/covers/edition-013.jpg',
    'assets/blog/covers/edition-014.jpg',
    'assets/blog/covers/edition-015.jpg',
    'assets/blog/covers/edition-016.jpg',
];

export const BLOG_POSTS: BlogPost[] = [
    {
        edition: '000',
        slug: 'cest-quoi-fire',
        title: 'C\'est quoi le mouvement FIRE ?',
        subtitle: 'Édition #000 · FIRE Africa par Omaad',
        date: '2026-06-01',
        tags: ['FIRE', 'introduction', 'histoire', 'éducation'],
        excerpt: 'Tout commence en 1992 avec Your Money or Your Life de Vicki Robin et Joe Dominguez. Leur thèse est simple mais provocatrice : chaque heure de travail a un…',
        readingMinutes: 6,
        coverImage: COVERS[0],
        contentPath: 'assets/blog/edition-000.json',
    },
    {
        edition: '001',
        slug: 'tontine-et-brvm',
        title: 'Tontine ou BRVM : et si la vraie force, c\'était de combiner les deux ?',
        subtitle: 'Édition #001 · FIRE Africa par Omaad',
        date: '2026-06-15',
        tags: ['tontine', 'BRVM', 'culture', 'épargne', 'diaspora', 'investissement'],
        excerpt: 'Avant les banques, avant le mobile money, avant la BRVM, il y avait la tontine. En Afrique de l\'Ouest, la tontine est bien plus qu\'un système d\'épargne.…',
        readingMinutes: 5,
        coverImage: COVERS[1],
        contentPath: 'assets/blog/edition-001.json',
    },
    {
        edition: '002',
        slug: 'pea-diaspora',
        title: 'Tu vis en France et tu n\'as pas de PEA ? Tu laisses des milliers d\'euros sur la table.',
        subtitle: 'Édition #002 · FIRE Africa par Omaad',
        date: '2026-07-01',
        tags: ['PEA', 'diaspora', 'France', 'ETF', 'MSCI World', 'fiscalité', 'investissement', 'épargne'],
        excerpt: 'Tu envoies de l\'argent au pays. Tu épargnes sur un Livret A. Peut-être que tu as un compte courant qui dort avec 5 000 ou 10 000 euros dessus. Et pendant ce…',
        readingMinutes: 6,
        coverImage: COVERS[2],
        contentPath: 'assets/blog/edition-002.json',
    },
    {
        edition: '003',
        slug: 'preparer-retraite-brvm',
        title: 'Ta retraite, personne ne la prépare à ta place, surtout pas l\'État',
        subtitle: 'Édition #003 · FIRE Africa par Omaad',
        date: '2026-07-15',
        tags: ['retraite', 'BRVM', 'IPRES', 'CSS', 'dividendes', 'patrimoine', 'long terme'],
        excerpt: 'Parlons d\'un sujet que personne n\'aime aborder : la retraite. En Afrique de l\'Ouest, le mot même fait sourire. « La retraite ? C\'est mes enfants qui vont…',
        readingMinutes: 4,
        coverImage: COVERS[3],
        contentPath: 'assets/blog/edition-003.json',
    },
    {
        edition: '004',
        slug: 'compte-titres-parcours-reel',
        title: 'J\'ai ouvert mon compte-titres à la BRVM : le parcours réel (et ta checklist)',
        subtitle: 'Édition #004 · FIRE Africa par Omaad',
        date: '2026-08-01',
        tags: ['BRVM', 'SGI', 'compte-titres', 'checklist', 'ouverture de compte', 'diaspora', 'FGI'],
        excerpt: 'En janvier, j\'ai ouvert mon compte-titres à la BRVM. Sans me déplacer, pour 0 FCFA, et j\'ai tout gardé : les mails, les documents, les dates. Voici le…',
        readingMinutes: 4,
        coverImage: COVERS[4],
        contentPath: 'assets/blog/edition-004.json',
    },
    {
        edition: '005',
        slug: 'comparer-sgi-brvm',
        title: 'Quelle SGI choisir pour investir à la BRVM ? Le guide comparatif',
        subtitle: 'Édition #005 · FIRE Africa par Omaad',
        date: '2026-08-15',
        tags: ['SGI', 'BRVM', 'courtier', 'frais', 'comparaison', 'compte-titres', 'UEMOA'],
        excerpt: 'Pour acheter une seule action à la BRVM, tu dois obligatoirement passer par une SGI (Société de Gestion et d\'Intermédiation). C\'est ton courtier, ton…',
        readingMinutes: 5,
        coverImage: COVERS[5],
        contentPath: 'assets/blog/edition-005.json',
    },
    {
        edition: '006',
        slug: 'dca-brvm',
        title: 'Comment appliquer le DCA à la BRVM',
        subtitle: 'Édition #006 · FIRE Africa par Omaad',
        date: '2026-09-01',
        tags: ['DCA', 'BRVM', 'investissement programmé', 'stratégie', 'discipline'],
        excerpt: 'Le Dollar Cost Averaging (DCA), ou investissement programmé, est le pilier de toute stratégie FIRE. Le principe est simple : tu investis un montant fixe à…',
        readingMinutes: 4,
        coverImage: COVERS[6],
        contentPath: 'assets/blog/edition-006.json',
    },
    {
        edition: '007',
        slug: 'special-dakar-immo',
        title: 'Spécial Dakar : investir dans l\'immobilier depuis l\'Europe',
        subtitle: 'Édition #007 · FIRE Africa par Omaad',
        date: '2026-09-15',
        tags: ['immobilier', 'Dakar', 'diaspora', 'foncier', 'Sénégal'],
        excerpt: 'Acheter un terrain au pays. C\'est le rêve numéro un de la diaspora sénégalaise. Avant le PEA, avant la crypto, avant tout, il y a le terrain. À Mboro,…',
        readingMinutes: 3,
        coverImage: COVERS[7],
        contentPath: 'assets/blog/edition-007.json',
    },
    {
        edition: '008',
        slug: 'trading-vs-dca',
        title: 'Trading ou DCA : faut-il jouer le timing ou la discipline ?',
        subtitle: 'Édition #008 · FIRE Africa par Omaad',
        date: '2026-10-01',
        tags: ['trading', 'DCA', 'investissement', 'long terme', 'discipline', 'BRVM'],
        excerpt: 'Chaque semaine, on voit passer des captures d\'écran de gains spectaculaires sur les réseaux. +40% en une journée sur une action. Des groupes Telegram qui…',
        readingMinutes: 3,
        coverImage: COVERS[8],
        contentPath: 'assets/blog/edition-008.json',
    },
    {
        edition: '009',
        slug: 'regle-4-pourcent',
        title: 'La règle des 4% fonctionne-t-elle en FCFA ?',
        subtitle: 'Édition #009 · FIRE Africa par Omaad',
        date: '2026-10-15',
        tags: ['FIRE', 'FCFA', 'BRVM', 'investissement'],
        excerpt: 'En 1994, William Bengen publie son étude sur les retraités américains : si tu retires 4% de ton portefeuille chaque année, tu ne seras jamais à sec sur 30…',
        readingMinutes: 3,
        coverImage: COVERS[9],
        contentPath: 'assets/blog/edition-009.json',
    },
    {
        edition: '010',
        slug: 'frais-fcp-brvm',
        title: 'Les frais, le nerf de la guerre à la BRVM : le cas des FCP',
        subtitle: 'Édition #010 · FIRE Africa par Omaad',
        date: '2026-11-01',
        tags: ['FCP', 'frais', 'BRVM', 'OPCVM', 'gestion', 'TER'],
        excerpt: 'Les FCP (Fonds Communs de Placement) sont souvent présentés comme la porte d\'entrée idéale à la BRVM. Tu confies ton argent à un gestionnaire professionnel,…',
        readingMinutes: 3,
        coverImage: COVERS[10],
        contentPath: 'assets/blog/edition-010.json',
    },
    {
        edition: '011',
        slug: 'fcp-vs-actions-directes',
        title: 'FCP ou actions en direct : l\'enjeu des frais sur le long terme',
        subtitle: 'Édition #011 · FIRE Africa par Omaad',
        date: '2026-11-15',
        tags: ['FCP', 'actions', 'frais', 'stratégie', 'BRVM', 'stock-picking'],
        excerpt: 'Dans l\'édition précédente, on a disséqué les frais des FCP à la BRVM. La question logique qui suit : ne vaut-il pas mieux construire son propre portefeuille…',
        readingMinutes: 3,
        coverImage: COVERS[11],
        contentPath: 'assets/blog/edition-011.json',
    },
    {
        edition: '012',
        slug: 'gestion-mandat-vs-libre',
        title: 'Gestion sous mandat ou gestion libre : qui bat l\'indice ?',
        subtitle: 'Édition #012 · FIRE Africa par Omaad',
        date: '2026-12-01',
        tags: ['SPIVA', 'gestion sous mandat', 'gestion libre', 'SGI', 'BRVM', 'frais', 'indice'],
        excerpt: 'Depuis 2002, S&P Dow Jones Indices publie chaque semestre un rapport appelé SPIVA (S&P Indices Versus Active). L\'idée est simple : comparer la performance…',
        readingMinutes: 5,
        coverImage: COVERS[12],
        contentPath: 'assets/blog/edition-012.json',
    },
    {
        edition: '013',
        slug: 'indices-brvm',
        title: 'BRVM 30, Composite, Prestige : à quoi servent vraiment les indices boursiers ?',
        subtitle: 'Édition #013 · FIRE Africa par Omaad',
        date: '2026-12-15',
        tags: ['BRVM', 'indices', 'BRVM30', 'BRVM Composite', 'BRVM Prestige', 'benchmark', 'analyse'],
        excerpt: 'Quand on parle de la BRVM dans les médias, on entend souvent « le BRVM Composite a pris +2% cette semaine » ou « le BRVM 30 est en baisse depuis janvier ».…',
        readingMinutes: 5,
        coverImage: COVERS[13],
        contentPath: 'assets/blog/edition-013.json',
    },
    {
        edition: '014',
        slug: 'brvm-vs-sp500',
        title: 'BRVM vs S&P 500 : le match des rendements',
        subtitle: 'Édition #014 · FIRE Africa par Omaad',
        date: '2027-01-01',
        tags: ['BRVM', 'S&P 500', 'performance', 'comparaison', 'rendements'],
        excerpt: 'Dans le mouvement FIRE, le S&P 500 est la référence absolue. 10% de rendement annualisé sur 30 ans, des frais d\'ETF à 0,03%, une liquidité totale. Quand tu…',
        readingMinutes: 3,
        coverImage: COVERS[14],
        contentPath: 'assets/blog/edition-014.json',
    },
    {
        edition: '015',
        slug: 'brvm-vs-cac-stoxx',
        title: 'BRVM vs CAC 40 / Stoxx 600 : le match européen',
        subtitle: 'Édition #015 · FIRE Africa par Omaad',
        date: '2027-01-15',
        tags: ['BRVM', 'CAC 40', 'Stoxx 600', 'Europe', 'comparaison', 'FCFA'],
        excerpt: 'Tout le monde compare la BRVM au S&P 500. Mais c\'est le mauvais benchmark. Le FCFA est arrimé à l\'euro à un taux fixe (655,957 FCFA = 1 EUR) depuis 1999.…',
        readingMinutes: 3,
        coverImage: COVERS[15],
        contentPath: 'assets/blog/edition-015.json',
    },
    {
        edition: '016',
        slug: 'brvm-securisee-mythe',
        title: '« La BRVM plus sécurisée que l\'immo et Wall Street », vraiment ?',
        subtitle: 'Édition #016 · FIRE Africa par Omaad',
        date: '2027-02-01',
        tags: ['BRVM', 'immobilier', 'Wall Street', 'risque', 'rendement', 'sécurité', 'volatilité'],
        excerpt: 'Une vidéo circule en ce moment avec un titre qui fait réagir : « La BRVM plus sécurisée que l\'immo et Wall Street » (source : YouTube,…',
        readingMinutes: 5,
        coverImage: COVERS[16],
        contentPath: 'assets/blog/edition-016.json',
    },
];

/**
 * Today as a local `yyyy-mm-dd` string. Built from local Y/M/D parts (not
 * toISOString, which is UTC and would drift a day for diaspora viewers just
 * after midnight) so it compares lexicographically with `post.date`.
 */
function localTodayIso(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * An edition is public only once its newsletter has actually been sent, i.e.
 * its send `date` is today or earlier. Future editions (e.g. #004 on 2026-08-01)
 * stay hidden until their date arrives, so the blog never leaks unsent content.
 */
export function isPostPublished(post: BlogPost): boolean {
    return post.date <= localTodayIso();
}

/** All editions already sent, in the file's natural order. */
export function publishedPosts(): BlogPost[] {
    return BLOG_POSTS.filter(isPostPublished);
}

/** Finds a post by slug ONLY if it is already published (unsent → undefined). */
export function findPostBySlug(slug: string): BlogPost | undefined {
    const post = BLOG_POSTS.find(p => p.slug === slug);
    return post && isPostPublished(post) ? post : undefined;
}

/**
 * Absolute URL for a cover, for Open Graph / Twitter / JSON-LD, which reject a
 * relative path. `coverImage` is app-relative so the <img> works under any
 * locale prefix; social crawlers need the fully qualified form.
 */
export function absoluteCoverUrl(coverImage: string): string {
    if (coverImage.startsWith('http')) return coverImage;
    return `${SITE_ORIGIN}${coverImage.startsWith('/') ? '' : '/'}${coverImage}`;
}

/** Shown when a cover fails to load, so a card never renders an empty box. */
export const COVER_FALLBACK = 'assets/blog/covers/fallback.svg';
