import { I18nService } from './i18n.service';

/**
 * Pure-logic unit tests for the i18n resolver (P4-TEST-1). No TestBed / DI:
 * I18nService has no injected deps, so we drive t() directly with a stub dict.
 */
describe('I18nService.t', () => {
    let svc: I18nService;

    beforeEach(() => {
        svc = new I18nService();
        // Inject stub dictionaries directly (bypass the lazy dynamic import).
        (svc as unknown as { dicts: Record<string, unknown> }).dicts = {
            fr: { greeting: { hi: 'Bonjour {{name}}' }, plain: 'Salut', categories: { salary: 'Salaire' } },
            en: { greeting: { hi: 'Hi {{name}}' }, plain: 'Hello' },
        };
        svc.lang.set('fr');
    });

    it('resolves a nested key', () => {
        expect(svc.t('plain')).toBe('Salut');
    });

    it('interpolates {{param}} placeholders', () => {
        expect(svc.t('greeting.hi', { name: 'Awa' })).toBe('Bonjour Awa');
    });

    it('returns the raw path for a missing key (no crash)', () => {
        expect(svc.t('does.not.exist')).toBe('does.not.exist');
    });

    it('reacts to the active locale', () => {
        svc.lang.set('en');
        expect(svc.t('greeting.hi', { name: 'Awa' })).toBe('Hi Awa');
    });

    it('categoryLabel falls back to the raw key when unknown', () => {
        expect(svc.categoryLabel('salary')).toBe('Salaire');
        expect(svc.categoryLabel('unknown_cat')).toBe('unknown_cat');
    });
});

/**
 * P1-3 guard. The API returns MIXED transaction-category casing, the enum VALUE
 * for some rows ("groceries") and its NAME for others ("HOUSING"), depending on
 * which writer created them. The `categories.*` dictionary is keyed lowercase,
 * so an uppercase value missed the lookup and this helper returned the raw key,
 * which is how "HOUSING" reached the Analyses page as visible copy.
 */
describe('I18nService.categoryLabel', () => {
    let svc: I18nService;

    beforeEach(() => {
        svc = new I18nService();
        (svc as unknown as { dicts: Record<string, unknown> }).dicts = {
            fr: { categories: { salary: 'Salaire', housing: 'Logement', other_expense: 'Autres' } },
        };
        svc.lang.set('fr');
    });

    it('resolves a lowercase key', () => {
        expect(svc.categoryLabel('housing')).toBe('Logement');
    });

    it('resolves an UPPERCASE key from the API', () => {
        expect(svc.categoryLabel('HOUSING')).toBe('Logement');
        expect(svc.categoryLabel('SALARY')).toBe('Salaire');
    });

    it('resolves mixed case', () => {
        expect(svc.categoryLabel('Housing')).toBe('Logement');
    });

    it('falls back to other_expense for null/empty', () => {
        expect(svc.categoryLabel(null)).toBe('Autres');
        expect(svc.categoryLabel('')).toBe('Autres');
    });

    it('returns the normalised key (not a raw uppercase one) when truly unknown', () => {
        // A category this build has no label for should still read as a slug,
        // never as SCREAMING_CASE in the UI.
        expect(svc.categoryLabel('SOME_NEW_CATEGORY')).toBe('some_new_category');
    });
});
