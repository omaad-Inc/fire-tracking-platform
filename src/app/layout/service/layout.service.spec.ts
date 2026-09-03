import { TestBed } from '@angular/core/testing';

import { LayoutService } from './layout.service';

/**
 * P3-3 guard: `isDesktop` is a live matchMedia signal on the shell's own
 * breakpoint (992px, the one `_responsive.scss` swaps sidebar and bottom bar
 * on), not a one-shot `window.innerWidth > 991` read.
 *
 * Pre-fix the first case fails: the method ignored matchMedia entirely, so
 * flipping the fake query changed nothing.
 */
describe('LayoutService.isDesktop', () => {
    const SHELL_QUERY = '(min-width: 992px)';
    let listeners: Array<(e: { matches: boolean }) => void>;
    let matches: boolean;

    beforeEach(() => {
        listeners = [];
        matches = true;
        const real = window.matchMedia.bind(window);
        spyOn(window, 'matchMedia').and.callFake((query: string) => {
            if (query !== SHELL_QUERY) return real(query);
            return {
                matches,
                media: query,
                addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => { listeners.push(fn); },
                removeEventListener: () => {},
            } as unknown as MediaQueryList;
        });
        TestBed.configureTestingModule({});
    });

    function cross(to: boolean): void {
        matches = to;
        listeners.forEach(fn => fn({ matches: to }));
        TestBed.flushEffects();
    }

    it('tracks the shell breakpoint live, both directions', () => {
        const svc = TestBed.inject(LayoutService);
        expect(svc.isDesktop()).toBeTrue();
        cross(false);
        expect(svc.isDesktop()).toBeFalse();
        cross(true);
        expect(svc.isDesktop()).toBeTrue();
    });

    it('drops phone-side drawer state when the window grows past the breakpoint', () => {
        matches = false;
        const svc = TestBed.inject(LayoutService);
        TestBed.flushEffects();
        svc.layoutState.update(s => ({ ...s, staticMenuMobileActive: true, overlayMenuActive: true }));
        cross(true);
        expect(svc.layoutState().staticMenuMobileActive).toBeFalse();
        expect(svc.layoutState().overlayMenuActive).toBeFalse();
    });

    it('keeps the desktop rail choice across a trip through phone width', () => {
        const svc = TestBed.inject(LayoutService);
        svc.layoutState.update(s => ({ ...s, staticMenuDesktopInactive: true }));
        cross(false);
        cross(true);
        expect(svc.layoutState().staticMenuDesktopInactive).toBeTrue();
    });
});
