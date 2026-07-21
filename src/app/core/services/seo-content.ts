import type { SeoText } from './seo.service';

/**
 * Per-route SEO copy for the public marketing pages, in both locales.
 *
 * Kept here (not in the UI i18n dictionaries) because these strings are
 * crawler-facing metadata, not in-app copy; centralizing them makes the
 * titles/descriptions easy to tune without touching component logic. Each
 * routed public page reads its entry and hands it to
 * `SeoService.applyLocalized({ lang, path, ...SEO_PAGES[key] })`.
 *
 * `path` is the lang-less suffix (starts with `/`); the service builds the
 * canonical (`/<lang><path>`) and the FR/EN/x-default hreflang alternates.
 */
export interface SeoPage {
    path: string;
    fr: SeoText;
    en: SeoText;
}

export const SEO_PAGES = {
    landing: {
        path: '/landing',
        fr: {
            title: 'Omaad — Patrimoine, épargne et objectif FIRE',
            description: "Suivez votre patrimoine, votre épargne et vos dettes dans une seule application pensée pour l'Afrique de l'Ouest et la diaspora, et avancez vers votre indépendance financière (FIRE). EUR, XOF et USD.",
        },
        en: {
            title: 'Omaad — Wealth, savings and your FIRE goal',
            description: 'Track your wealth, savings and debts in one app built for West Africa and the diaspora, and progress toward financial independence (FIRE). EUR, XOF and USD.',
        },
    },
    about: {
        path: '/qui-sommes-nous',
        fr: {
            title: 'Qui sommes-nous — Omaad',
            description: "La mission d'Omaad, aider l'Afrique de l'Ouest et sa diaspora à bâtir, protéger et faire fructifier leur patrimoine.",
        },
        en: {
            title: 'About us — Omaad',
            description: "Omaad's mission, helping West Africa and its diaspora build, protect and grow their wealth.",
        },
    },
    faq: {
        path: '/faq',
        fr: {
            title: 'Questions fréquentes — Omaad',
            description: "Comment fonctionne Omaad, les devises prises en charge, la sécurité de vos données et l'objectif FIRE, les réponses aux questions les plus courantes.",
        },
        en: {
            title: 'Frequently asked questions — Omaad',
            description: 'How Omaad works, supported currencies, how your data is secured and what the FIRE goal is, answers to the most common questions.',
        },
    },
    blog: {
        path: '/blog',
        fr: {
            title: 'Blog FIRE Africa — Omaad',
            description: "Éducation financière pour l'Afrique de l'Ouest et la diaspora, FIRE, BRVM, tontines, épargne et investissement, une édition de la newsletter FIRE Africa à la fois.",
        },
        en: {
            title: 'FIRE Africa blog — Omaad',
            description: 'Financial education for West Africa and the diaspora, FIRE, BRVM, tontines, saving and investing, one FIRE Africa newsletter edition at a time.',
        },
    },
    fireSimulator: {
        path: '/tools/fire-simulator',
        fr: {
            title: 'Simulateur FIRE — Omaad',
            description: "Estimez le capital nécessaire à votre indépendance financière et le nombre d'années pour l'atteindre, gratuitement, en EUR, XOF ou USD.",
        },
        en: {
            title: 'FIRE simulator — Omaad',
            description: 'Estimate the capital you need for financial independence and how many years it will take, free, in EUR, XOF or USD.',
        },
    },
    compoundInterest: {
        path: '/tools/compound-interest',
        fr: {
            title: 'Calculateur d\'intérêts composés — Omaad',
            description: "Visualisez la croissance de votre épargne dans le temps grâce aux intérêts composés, gratuitement, en EUR, XOF ou USD.",
        },
        en: {
            title: 'Compound interest calculator — Omaad',
            description: 'See how your savings grow over time with compound interest, free, in EUR, XOF or USD.',
        },
    },
    fireAfricaWelcome: {
        path: '/fire-africa/welcome',
        fr: {
            title: 'FIRE Africa — Omaad',
            description: "Découvrez FIRE Africa par Omaad, l'indépendance financière adaptée aux réalités de l'Afrique de l'Ouest et de la diaspora.",
        },
        en: {
            title: 'FIRE Africa — Omaad',
            description: 'Discover FIRE Africa by Omaad, financial independence adapted to the realities of West Africa and the diaspora.',
        },
    },
    legalMentions: {
        path: '/legal/mentions',
        fr: {
            title: 'Mentions légales — Omaad',
            description: "Mentions légales du site et de l'application Omaad.",
        },
        en: {
            title: 'Legal notice — Omaad',
            description: 'Legal notice for the Omaad website and application.',
        },
    },
    legalPrivacy: {
        path: '/legal/privacy',
        fr: {
            title: 'Politique de confidentialité — Omaad',
            description: "Comment Omaad collecte, utilise et protège vos données personnelles.",
        },
        en: {
            title: 'Privacy policy — Omaad',
            description: 'How Omaad collects, uses and protects your personal data.',
        },
    },
    legalTerms: {
        path: '/legal/terms',
        fr: {
            title: "Conditions d'utilisation — Omaad",
            description: "Les conditions d'utilisation du service Omaad.",
        },
        en: {
            title: 'Terms of use — Omaad',
            description: 'The terms of use for the Omaad service.',
        },
    },
} satisfies Record<string, SeoPage>;

export type SeoPageKey = keyof typeof SEO_PAGES;
