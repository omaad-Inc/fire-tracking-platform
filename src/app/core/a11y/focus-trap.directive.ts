import { Directive, ElementRef, OnDestroy, effect, inject, input } from '@angular/core';

const FOCUSABLE = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Dependency-free focus trap for dialogs/overlays (no @angular/cdk).
 *
 * Bind `[appFocusTrap]="isOpen()"`. When it flips true: remember the currently
 * focused element, move focus to the first focusable inside the host (or the
 * host itself), and keep Tab/Shift+Tab cycling within the host. When it flips
 * false: restore focus to the element that had it before opening.
 *
 * Pair with `[inert]="!isOpen()"` on the host so a closed (but still-in-DOM,
 * for animation) overlay is fully out of the tab order and hidden from AT.
 */
@Directive({
    selector: '[appFocusTrap]',
    standalone: true,
    host: { '(keydown.tab)': 'onTab($event)', '(keydown.shift.tab)': 'onTab($event)' },
})
export class FocusTrapDirective implements OnDestroy {
    private host = inject<ElementRef<HTMLElement>>(ElementRef);
    readonly appFocusTrap = input<boolean>(false);
    private previouslyFocused: HTMLElement | null = null;

    constructor() {
        effect(() => {
            const active = this.appFocusTrap();
            if (active) {
                this.previouslyFocused = (document.activeElement as HTMLElement) ?? null;
                // Defer so the host is un-inerted / laid out before we focus.
                setTimeout(() => this.focusFirst(), 0);
            } else {
                this.restore();
            }
        });
    }

    /** Restore focus to the pre-open element. Covers both close styles:
     *  [inert] toggling (effect else-branch) and *@if* removal (ngOnDestroy). */
    private restore(): void {
        const el = this.previouslyFocused;
        this.previouslyFocused = null;
        if (el) setTimeout(() => el.focus?.(), 0);
    }

    ngOnDestroy(): void {
        this.restore();
    }

    private focusable(): HTMLElement[] {
        return Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE))
            .filter(el => el.offsetParent !== null || el === document.activeElement);
    }

    private focusFirst(): void {
        const els = this.focusable();
        (els[0] ?? this.host.nativeElement).focus?.();
    }

    onTab(event: KeyboardEvent): void {
        if (!this.appFocusTrap()) return;
        const els = this.focusable();
        if (els.length === 0) { event.preventDefault(); return; }
        const first = els[0];
        const last = els[els.length - 1];
        const active = document.activeElement as HTMLElement;
        if (event.shiftKey && (active === first || !this.host.nativeElement.contains(active))) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        }
    }
}
