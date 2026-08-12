import { projectDCA, projectDRIP } from './projections';

/**
 * Garde-fous du moteur DRIP après correction du modèle d'origine, qui faisait
 * croître le rendement sur la valeur de marché de g%/an alors que cette valeur
 * capitalisait déjà de l'appréciation des cours : à 6% de départ, 5% de
 * croissance et 5% d'appréciation, le simulateur affichait 15,9% de rendement
 * brut à 20 ans.
 */
describe('projectDRIP', () => {
    const base = {
        initial: 0,
        monthly: 10_000,
        years: 20,
        yieldPct: 6,
        growthDiv: 5,
        priceGrowth: 5,
        dripYears: 20,
        taxRate: 15,
    };

    it('garde un rendement stable quand le dividende croît au rythme des cours', () => {
        const rows = projectDRIP(base);
        for (const row of rows) {
            expect(row.yieldOnValue).toBeCloseTo(6, 4);
            // L'année 0 part d'un portefeuille vide : pas de ratio à vérifier.
            if (row.value > 0) expect(row.dividendsAnnual / row.value).toBeCloseTo(0.06, 5);
        }
    });

    it('fait dériver le rendement vers le haut quand le dividende croît plus vite que les cours', () => {
        const rows = projectDRIP({ ...base, growthDiv: 8 });
        for (const row of rows) {
            expect(row.yieldOnValue).toBeCloseTo(6 * Math.pow(1.08 / 1.05, row.year), 4);
        }
        expect(rows[rows.length - 1].yieldOnValue).toBeGreaterThan(6);
    });

    it('fait décroître le rendement quand les cours montent plus vite que le dividende', () => {
        const rows = projectDRIP({ ...base, growthDiv: 2 });
        for (const row of rows) {
            expect(row.yieldOnValue).toBeCloseTo(6 * Math.pow(1.02 / 1.05, row.year), 4);
        }
        expect(rows[rows.length - 1].yieldOnValue).toBeLessThan(6);
    });

    it('réinvestit le dividende net d IRVM, pas le brut', () => {
        const taxed = projectDRIP(base);
        const untaxed = projectDRIP({ ...base, taxRate: 0 });
        expect(taxed[taxed.length - 1].value).toBeLessThan(untaxed[untaxed.length - 1].value);
    });

    it('se réduit à un DCA pur au taux d appréciation quand le DRIP est désactivé', () => {
        const rows = projectDRIP({ ...base, dripYears: 0 });
        const dca = projectDCA({ monthly: base.monthly, years: base.years, annualRate: base.priceGrowth });
        expect(rows[rows.length - 1].value).toBe(dca[dca.length - 1].value);
    });

    it('reste dans l ordre de grandeur du rendement total a + y0 x (1 - IRVM)', () => {
        // Le dividende est calculé sur la valeur de début d'année et crédité en
        // fin d'année : le modèle passe légèrement sous la formule fermée.
        const rows = projectDRIP({ ...base, years: 10, dripYears: 10 });
        const closedForm = projectDCA({ monthly: base.monthly, years: 10, annualRate: 5 + 6 * 0.85 });
        const ratio = rows[rows.length - 1].value / closedForm[closedForm.length - 1].value;
        expect(ratio).toBeGreaterThan(0.95);
        expect(ratio).toBeLessThanOrEqual(1);
    });
});
