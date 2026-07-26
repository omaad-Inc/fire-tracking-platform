import { fmtFCFA, fmtFCFAfull } from './referentiel';
import { nbspSafe } from '../../../../core/util/nbsp';

/**
 * Guards the CFA formatting of the public Stratégie BRVM tool (user report
 * 2026-07-26): U+202F group separators rendered as tofu boxes on devices whose
 * fonts lack the glyph, and the compact formatter used an English decimal point.
 */
describe('Stratégie BRVM formatters', () => {
    it('fmtFCFAfull groups with a regular NBSP, never U+202F', () => {
        expect(fmtFCFAfull(1_000_000)).toBe('1\u00a0000\u00a0000');
        expect(fmtFCFAfull(29_260)).toBe('29\u00a0260');
        expect(fmtFCFAfull(29_260)).not.toContain('\u202f');
        expect(fmtFCFAfull(950)).toBe('950');
    });

    it('fmtFCFA compact uses a French decimal comma', () => {
        expect(fmtFCFA(12_500_000)).toBe('12,50 M');
        expect(fmtFCFA(1_250_000_000)).toBe('1,25 Md');
        expect(fmtFCFA(29_260)).toBe('29 k');
        expect(fmtFCFA(950)).toBe('950');
    });

    it('nbspSafe replaces every narrow no-break space', () => {
        expect(nbspSafe('1\u202f000\u202f000')).toBe('1\u00a0000\u00a0000');
        expect(nbspSafe('no separators')).toBe('no separators');
    });
});
