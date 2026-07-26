/**
 * Référentiel public de l'outil Stratégie BRVM.
 *
 * Deux natures de données, jamais mélangées :
 *  1. LA MÉTHODE (template éditorial) — la stratégie Core / Satellite publiée
 *     dans le Tome 1 FIRE Africa et les vidéos. L'utilisateur la copie puis
 *     l'adapte : ce n'est pas un conseil personnalisé (voir DISCLAIMER).
 *  2. LE MARCHÉ (données de référence datées) — cours de clôture et yields
 *     indicatifs utilisés pour les calculs, avec leur date affichée partout.
 *
 * Aucune donnée personnelle (positions, montants réels) ne vit ici, et aucune
 * étiquette d'opinion par titre ("à éviter", "piège") n'est publiée : règle
 * "pas de conseil" du plan d'intégration (§4).
 */

import { nbspSafe } from '../../../../core/util/nbsp';

export const DISCLAIMER =
    'Contenu éducatif uniquement. Pas un conseil en investissement personnalisé. ' +
    'Les projections sont des hypothèses, pas des promesses ; investir comporte un risque de perte en capital.';

export const FCFA_PER_EUR = 655.957;

/** Date de référence des cours/yields ci-dessous (clôture BRVM). */
export const MARCHE_REF_DATE = '2026-07-20';

export interface TitreRef {
    ticker: string;
    nom: string;
    secteur: string;
    pays: string;
    /** Cours de clôture indicatif au MARCHE_REF_DATE (FCFA). */
    prixRef: number;
    /** Rendement dividende brut indicatif au MARCHE_REF_DATE (%). */
    yieldRef: number;
}

/** Univers de titres de la méthode (données marché datées, factuelles). */
export const TITRES: TitreRef[] = [
    { ticker: 'SNTS', nom: 'Sonatel',      secteur: 'Télécoms',  pays: 'Sénégal',       prixRef: 32000, yieldRef: 5.44 },
    { ticker: 'ORAC', nom: 'Orange CI',    secteur: 'Télécoms',  pays: "Côte d'Ivoire", prixRef: 16160, yieldRef: 4.36 },
    { ticker: 'CIEC', nom: 'CIE',          secteur: 'Utilities', pays: "Côte d'Ivoire", prixRef: 5195,  yieldRef: 3.96 },
    { ticker: 'SDCC', nom: 'Sodeci',       secteur: 'Utilities', pays: "Côte d'Ivoire", prixRef: 11900, yieldRef: 3.88 },
    { ticker: 'BOAB', nom: 'BOA Bénin',    secteur: 'Banque',    pays: 'Bénin',         prixRef: 8700,  yieldRef: 6.72 },
    { ticker: 'BOAS', nom: 'BOA Sénégal',  secteur: 'Banque',    pays: 'Sénégal',       prixRef: 7290,  yieldRef: 6.17 },
    { ticker: 'SGBC', nom: 'SGBCI',        secteur: 'Banque',    pays: "Côte d'Ivoire", prixRef: 39000, yieldRef: 5.88 },
    { ticker: 'PALC', nom: 'Palm CI',      secteur: 'Agro',      pays: "Côte d'Ivoire", prixRef: 8800,  yieldRef: 5.02 },
    { ticker: 'SPHC', nom: 'SAPH',         secteur: 'Agro',      pays: "Côte d'Ivoire", prixRef: 7670,  yieldRef: 5.61 },
    { ticker: 'SVAC', nom: 'Servair Abidjan', secteur: 'Services', pays: "Côte d'Ivoire", prixRef: 3150, yieldRef: 3.94 },
];

export const TITRE_MAP: Record<string, TitreRef> = Object.fromEntries(TITRES.map((t) => [t.ticker, t]));

/** Taux IRVM par défaut (retenue sur les dividendes, zone UEMOA). */
export const IRVM_DEFAUT_PCT = 15;

export interface PhaseMethode {
    phase: number;
    label: string;
    capitalRange: string;
    maxLignes: number;
    coreRatio: number;
    satelliteRatio: number;
    satelliteSlots: number;
    /** Grille de poids cibles du cœur (%), somme = coreRatio. */
    weights: Record<string, number>;
    caps: { ligne: number; secteur: number };
}

/**
 * Les 4 phases de la méthode Core / Satellite (template éditorial, Tome 1).
 * Les phases ne font que doser le ratio cœur/satellite à mesure que le
 * capital grandit ; le cœur n'est jamais vendu, rééquilibrage par dilution.
 */
export const PHASES: PhaseMethode[] = [
    {
        phase: 1, label: 'Phase 1 · Construction du cœur', capitalRange: '< 5M FCFA', maxLignes: 4,
        coreRatio: 100, satelliteRatio: 0, satelliteSlots: 0,
        weights: { SNTS: 32, ORAC: 25, BOAB: 23, CIEC: 20 },
        caps: { ligne: 35, secteur: 60 },
    },
    {
        phase: 2, label: 'Phase 2 · Cœur complet + 1er satellite', capitalRange: '5 – 15M FCFA', maxLignes: 6,
        coreRatio: 85, satelliteRatio: 15, satelliteSlots: 1,
        weights: { SNTS: 23, ORAC: 17, CIEC: 16, BOAB: 16, SDCC: 13 },
        caps: { ligne: 25, secteur: 45 },
    },
    {
        phase: 3, label: 'Phase 3 · Diversification satellite', capitalRange: '15 – 30M FCFA', maxLignes: 7,
        coreRatio: 80, satelliteRatio: 20, satelliteSlots: 2,
        weights: { SNTS: 21, ORAC: 16, CIEC: 15, BOAB: 15, SDCC: 13 },
        caps: { ligne: 20, secteur: 35 },
    },
    {
        phase: 4, label: 'Phase 4 · Régime de croisière', capitalRange: '> 30M FCFA', maxLignes: 8,
        coreRatio: 75, satelliteRatio: 25, satelliteSlots: 3,
        weights: { SNTS: 20, ORAC: 15, CIEC: 14, BOAB: 14, SDCC: 12 },
        caps: { ligne: 20, secteur: 35 },
    },
];

/** Règles écrites de la méthode pour l'enveloppe satellite (template). */
export const REGLES_SATELLITE = {
    maxParLigne: 8,
    maxSimultanes: 3,
    entree: 'Uniquement sur fenêtre : détachement proche sans dérive de cours, ou décote marquée sans dégradation fondamentale.',
    sortie: [
        'Dividende coupé ou réduit deux exercices de suite',
        'Payout > 100% (dividende non couvert par les bénéfices)',
        'Plus-value forte avec yield-on-cost dégradé : recycler vers le cœur',
    ],
};

/** Filtre éthique de la méthode : secteurs jamais achetés, quel que soit le rendement. */
export const EXCLUSIONS_ETHIQUES = ['Tabac', 'Alcool'];

/** Échelle de jalons de revenus passifs (nets d'IRVM), en FCFA/mois. */
export const JALONS: { cible: number; note: string }[] = [
    { cible: 100_000,   note: 'Le premier vrai revenu passif' },
    { cible: 250_000,   note: 'Les dividendes financent un vrai loyer' },
    { cible: 500_000,   note: 'La moitié du chemin vers le million' },
    { cible: 1_000_000, note: 'Liberté financière, 1M F/mois' },
];

// ── Formatage (parité avec l'app d'origine) ──
export const fmtFCFA = (n: number): string => {
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2).replace('.', ',') + ' Md';
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2).replace('.', ',') + ' M';
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + ' k';
    return Math.round(n).toString();
};

export const fmtFCFAfull = (n: number): string =>
    nbspSafe(new Intl.NumberFormat('fr-FR').format(Math.round(n)));

export const fmtEUR = (n: number): string => (n / FCFA_PER_EUR).toFixed(0);
