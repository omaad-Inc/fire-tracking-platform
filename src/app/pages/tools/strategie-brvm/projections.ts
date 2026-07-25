/**
 * Moteur de projections de l'outil Stratégie BRVM.
 * Porté tel quel (fonctions pures) depuis l'app d'origine
 * (BRVM_INVETSMENT_STRATEGY/src/utils/projections.js) ; seules les signatures
 * sont typées et les positions personnelles remplacées par des paramètres.
 */

export interface DcaPoint {
    year: number;
    invested: number;
    value: number;
    gain: number;
}

/** Projection DCA à taux constant (capitalisation mensuelle). */
export function projectDCA({ monthly, years, annualRate }: { monthly: number; years: number; annualRate: number }): DcaPoint[] {
    const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
    const data: DcaPoint[] = [];
    let value = 0;
    let invested = 0;
    for (let m = 0; m <= years * 12; m++) {
        if (m > 0) {
            value = value * (1 + monthlyRate) + monthly;
            invested += monthly;
        }
        if (m % 12 === 0) {
            data.push({ year: m / 12, invested, value: Math.round(value), gain: Math.round(value - invested) });
        }
    }
    return data;
}

/** Mensualité requise pour atteindre `target` en `years` années à `annualRate`%. */
export function requiredMonthly({ target, years, annualRate }: { target: number; years: number; annualRate: number }): number {
    const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
    const n = years * 12;
    if (monthlyRate === 0) return target / n;
    return (target * monthlyRate) / (Math.pow(1 + monthlyRate, n) - 1);
}

export interface DripPoint {
    year: number;
    value: number;
    invested: number;
    dividendsAnnual: number;
    dividendsNet: number;
    dividendsMonthly: number;
}

/**
 * Projection DRIP : dividendes réinvestis pendant `dripYears`, croissance du
 * dividende `growthDiv`%/an, appréciation des cours 5%/an (hypothèse fixe du
 * modèle d'origine).
 */
export function projectDRIP({ initial, monthly, years, yieldPct, growthDiv, dripYears, taxRate }: {
    initial: number; monthly: number; years: number; yieldPct: number;
    growthDiv: number; dripYears: number; taxRate: number;
}): DripPoint[] {
    const data: DripPoint[] = [];
    let value = initial;
    let invested = initial;
    let curYield = yieldPct / 100;
    const divGrowth = growthDiv / 100;
    const monthlyPriceGrowth = Math.pow(1.05, 1 / 12) - 1;
    for (let y = 0; y <= years; y++) {
        const divAnnual = value * curYield;
        const divNet = divAnnual * (1 - taxRate / 100);
        data.push({
            year: y,
            value: Math.round(value),
            invested: Math.round(invested),
            dividendsAnnual: Math.round(divAnnual),
            dividendsNet: Math.round(divNet),
            dividendsMonthly: Math.round(divNet / 12),
        });
        if (y < years) {
            for (let m = 0; m < 12; m++) {
                value = value * (1 + monthlyPriceGrowth) + monthly;
                invested += monthly;
            }
            if (y < dripYears) value += divAnnual;
            curYield = curYield * (1 + divGrowth);
        }
    }
    return data;
}

export interface StockLike {
    ticker: string;
    nom?: string;
    /** Cours de référence (FCFA). */
    prix: number;
    /** Rendement dividende brut (%). */
    yieldPct: number;
}

export interface HoldingLike {
    ticker: string;
    qty: number;
}

export interface DividendTargetBreakdown {
    ticker: string;
    nom: string;
    weight: number;
    capitalTarget: number;
    sharesNeeded: number;
    sharesHeld: number;
    toBuy: number;
    annualDivNet: number;
}

export interface DividendTargetResult {
    /** Objectif annuel net (FCFA/an). */
    target: number;
    monthlyEquiv: number;
    requiredCapital: number;
    currentValue: number;
    additionalCapital: number;
    fullYears: number;
    remainingMonths: number;
    progressPct: number;
    breakdown: DividendTargetBreakdown[];
    weightedYieldGross: number;
    weightedYieldNet: number;
    currentDivGross: number;
    currentDivNet: number;
}

/**
 * Capital requis pour des objectifs de revenu passif annuels, ventilé selon la
 * grille de poids, avec état d'avancement à partir des positions saisies.
 */
export function computeDividendTargets({ targets, stocks, phaseWeights, currentHoldings, taxRate, dcaMonthly }: {
    targets: number[];
    stocks: StockLike[];
    phaseWeights: Record<string, number>;
    currentHoldings: HoldingLike[];
    taxRate: number;
    dcaMonthly: number;
}): DividendTargetResult[] {
    const taxMul = 1 - taxRate / 100;

    const tickers = Object.keys(phaseWeights);
    const stockMap: Record<string, StockLike> = Object.fromEntries(stocks.map((s) => [s.ticker, s]));
    const holdMap: Record<string, HoldingLike> = Object.fromEntries(currentHoldings.map((h) => [h.ticker, h]));

    const weightedYieldGross = tickers.reduce((sum, t) => {
        const w = (phaseWeights[t] ?? 0) / 100;
        const y = (stockMap[t]?.yieldPct || 0) / 100;
        return sum + w * y;
    }, 0);
    const weightedYieldNet = weightedYieldGross * taxMul;

    const currentValue = tickers.reduce((sum, t) => {
        const h = holdMap[t];
        const s = stockMap[t];
        if (!h || !s) return sum;
        return sum + h.qty * s.prix;
    }, 0);
    const currentDivGross = tickers.reduce((sum, t) => {
        const h = holdMap[t];
        const s = stockMap[t];
        if (!h || !s) return sum;
        return sum + h.qty * s.prix * (s.yieldPct / 100);
    }, 0);

    return targets.map((target) => {
        const requiredCapital = weightedYieldNet > 0 ? Math.round(target / weightedYieldNet) : 0;
        const additionalCapital = Math.max(0, requiredCapital - currentValue);
        const yearsNeeded = dcaMonthly > 0 ? additionalCapital / (dcaMonthly * 12) : Infinity;
        const fullYears = Number.isFinite(yearsNeeded) ? Math.floor(yearsNeeded) : 0;
        const remainingMonths = Number.isFinite(yearsNeeded) ? Math.round((yearsNeeded - fullYears) * 12) : 0;

        const breakdown: DividendTargetBreakdown[] = tickers.map((t) => {
            const s = stockMap[t];
            const h = holdMap[t] || { ticker: t, qty: 0 };
            const w = (phaseWeights[t] ?? 0) / 100;
            const capitalForTicker = requiredCapital * w;
            const sharesNeeded = s ? Math.ceil(capitalForTicker / s.prix) : 0;
            const toBuy = Math.max(0, sharesNeeded - h.qty);
            const divPerShare = s ? s.prix * (s.yieldPct / 100) : 0;
            const annualDivNet = Math.round(sharesNeeded * divPerShare * taxMul);
            return {
                ticker: t,
                nom: s?.nom || t,
                weight: phaseWeights[t] ?? 0,
                capitalTarget: Math.round(capitalForTicker),
                sharesNeeded,
                sharesHeld: h.qty,
                toBuy,
                annualDivNet,
            };
        });

        return {
            target,
            monthlyEquiv: Math.round(target / 12),
            requiredCapital,
            currentValue,
            additionalCapital,
            fullYears,
            remainingMonths,
            progressPct: requiredCapital > 0 ? Math.min(100, Math.round((currentValue / requiredCapital) * 100)) : 0,
            breakdown,
            weightedYieldGross: +(weightedYieldGross * 100).toFixed(2),
            weightedYieldNet: +(weightedYieldNet * 100).toFixed(2),
            currentDivGross: Math.round(currentDivGross),
            currentDivNet: Math.round(currentDivGross * taxMul),
        };
    });
}
