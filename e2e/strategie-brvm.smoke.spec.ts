import { test, expect, Page } from '@playwright/test';

/**
 * Smoke du planificateur de stratégie BRVM (outil public, aucun backend requis).
 *
 * Couvre le calendrier d'exécution de bout en bout : ajout d'un mois choisi,
 * ajout/suppression d'achats, note, coche "exécuté", total par mois, et
 * SURTOUT la persistance localStorage après rechargement de la page.
 *
 * Run : npm run e2e:smoke (dev server) ou E2E_BASE_URL=<url> contre un build servi.
 */

const URL = '/outils/strategie-brvm';

/** fr-FR insère des espaces insécables (U+202F/U+00A0) dans les nombres. */
const norm = (s: string | null) => (s ?? '').replace(/[\u202f\u00a0]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * La page est PRÉRENDUE : le HTML statique contient déjà le formulaire, mais
 * sans listeners tant qu'Angular n'a pas bootstrappé (re-render destructif,
 * pas d'hydratation). Interagir trop tôt = saisies perdues. On attend que le
 * root component soit monté (Ivy pose `__ngContext__` sur l'hôte).
 */
async function waitForAppReady(page: Page) {
    await page.waitForFunction(() => {
        const root = document.querySelector('app-root') as { __ngContext__?: unknown } | null;
        return !!root && root.__ngContext__ !== undefined;
    });
}

async function reloadReady(page: Page) {
    await page.reload();
    await waitForAppReady(page);
}

async function resetPlanStorage(page: Page) {
    await page.goto(URL);
    await waitForAppReady(page);
    await page.evaluate(() => localStorage.removeItem('omaad_plan_v1'));
    await reloadReady(page);
}

test.describe('Stratégie BRVM — calendrier d\'exécution', () => {
    test.beforeEach(async ({ page }) => {
        await resetPlanStorage(page);
    });

    test('CRUD complet + persistance après rechargement', async ({ page }) => {
        // ── Ajout d'un mois choisi ──
        await page.getByLabel('Mois à planifier').fill('2026-08');
        await page.getByTestId('add-month').click();

        const row = page.getByTestId('month-row');
        await expect(row).toHaveCount(1);
        await expect(row.first()).toContainText(/août\s?2026/i);

        // Le formulaire d'achat s'ouvre automatiquement sur le mois créé.
        await expect(page.getByTestId('achat-form')).toBeVisible();

        // ── Premier achat : BOAB 3 × 9 100 ──
        await page.getByTestId('achat-ticker').fill('boab');
        await page.getByTestId('achat-qty').fill('3');
        await page.getByTestId('achat-prix').fill('9100');
        expect(norm(await page.getByTestId('achat-subtotal').textContent())).toContain('27 300 F'); // sous-total live
        await page.getByTestId('achat-form').getByRole('button', { name: "Ajouter l'achat" }).click();

        await expect(row.first()).toContainText('BOAB'); // ticker normalisé en majuscules
        expect(norm(await page.getByTestId('month-total').textContent())).toBe('27 300 F');

        // ── Second achat : ORAC 2 × 16 900 → total 61 100 F ──
        await page.getByTestId('achat-ticker').fill('ORAC');
        await page.getByTestId('achat-qty').fill('2');
        await page.getByTestId('achat-prix').fill('16900');
        await page.getByTestId('achat-form').getByRole('button', { name: "Ajouter l'achat" }).click();
        expect(norm(await page.getByTestId('month-total').textContent())).toBe('61 100 F');

        // ── Note (commit au blur) + coche "exécuté" ──
        await page.getByTestId('month-note').fill('Rattrapage BOAB');
        await page.getByTestId('month-note').blur();
        await page.getByTestId('month-done').check();

        // ── PERSISTANCE : rechargement complet de la page ──
        await reloadReady(page);
        const rowAfter = page.getByTestId('month-row');
        await expect(rowAfter).toHaveCount(1);
        await expect(rowAfter.first()).toContainText(/août\s?2026/i);
        await expect(rowAfter.first()).toContainText('BOAB');
        await expect(rowAfter.first()).toContainText('ORAC');
        expect(norm(await page.getByTestId('month-total').textContent())).toBe('61 100 F');
        await expect(page.getByTestId('month-note')).toHaveValue('Rattrapage BOAB');
        await expect(page.getByTestId('month-done')).toBeChecked();

        // ── Retrait d'un achat : le total se recalcule et persiste ──
        await rowAfter.first().getByLabel('Retirer cet achat').first().click();
        expect(norm(await page.getByTestId('month-total').textContent())).toBe('33 800 F');
        await reloadReady(page);
        expect(norm(await page.getByTestId('month-total').textContent())).toBe('33 800 F');

        // ── Anti-doublon : re-ajouter le même mois ne crée pas de 2e ligne ──
        await page.getByLabel('Mois à planifier').fill('2026-08');
        await page.getByTestId('add-month').click();
        await expect(page.getByTestId('month-row')).toHaveCount(1);

        // ── Suppression du mois → état vide, persistant ──
        await page.getByTestId('month-delete').click();
        await expect(page.getByTestId('month-row')).toHaveCount(0);
        await expect(page.getByText('Aucun mois planifié.')).toBeVisible();
        await reloadReady(page);
        await expect(page.getByTestId('month-row')).toHaveCount(0);
    });

    test('les mois sont tries chronologiquement quel que soit l\'ordre de saisie', async ({ page }) => {
        await page.getByLabel('Mois à planifier').fill('2026-11');
        await page.getByTestId('add-month').click();
        await page.getByLabel('Mois à planifier').fill('2026-09');
        await page.getByTestId('add-month').click();

        const rows = page.getByTestId('month-row');
        await expect(rows).toHaveCount(2);
        await expect(rows.nth(0)).toContainText(/sept\.?\s?2026/i);
        await expect(rows.nth(1)).toContainText(/nov\.?\s?2026/i);

        // Suggestion du prochain mois = décembre (suivant du dernier planifié).
        await expect(page.getByLabel('Mois à planifier')).toHaveValue('2026-12');
    });
});
