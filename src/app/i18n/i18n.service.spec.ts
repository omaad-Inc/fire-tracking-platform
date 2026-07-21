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
