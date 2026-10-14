import { CommandPaletteService } from './command-palette.service';

describe('CommandPaletteService.isChord', () => {
    const apple = /Mac|iPhone|iPad/.test(navigator.platform) || /Mac OS/.test(navigator.userAgent);
    const chord = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init);

    it('recognises the platform chord', () => {
        const ev = chord(apple ? { key: 'k', metaKey: true } : { key: 'k', ctrlKey: true });
        expect(CommandPaletteService.isChord(ev)).toBeTrue();
        expect(CommandPaletteService.isChord(chord({ key: 'K', metaKey: apple, ctrlKey: !apple }))).toBeTrue();
    });

    it('rejects Shift/Alt variants and plain k', () => {
        expect(CommandPaletteService.isChord(chord({ key: 'k', metaKey: apple, ctrlKey: !apple, shiftKey: true }))).toBeFalse();
        expect(CommandPaletteService.isChord(chord({ key: 'k' }))).toBeFalse();
    });

    it('never throws on a keydown that carries no key (prod client_error since 2026-09)', () => {
        // A plain Event named keydown is what the document listener receives
        // from some keyboards and extensions: ev.key is undefined there.
        const bare = new Event('keydown') as unknown as KeyboardEvent;
        expect(() => CommandPaletteService.isChord(bare)).not.toThrow();
        expect(CommandPaletteService.isChord(bare)).toBeFalse();
        expect(CommandPaletteService.isHelpKey(bare)).toBeFalse();
    });
});
