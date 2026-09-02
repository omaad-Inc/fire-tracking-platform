import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Command palette state (P2-5). One open flag the shell and the topbar share,
 * plus the one action the palette cannot perform by itself: the quick-add
 * transaction sheet is owned by the layout shell, so the palette asks for it
 * and the shell opens it.
 */
@Injectable({ providedIn: 'root' })
export class CommandPaletteService {
    readonly open = signal(false);
    /** Emitted when the user picks "add a transaction"; the shell owns the sheet. */
    readonly quickAddRequested = new Subject<void>();

    show(): void { this.open.set(true); }
    hide(): void { this.open.set(false); }
    toggle(): void { this.open.update(v => !v); }

    /**
     * Cmd+K on Apple keyboards, Ctrl+K elsewhere: exactly that chord, nothing
     * that also carries Shift or Alt (those are browser or OS shortcuts), and
     * never while the user types in an editable field where Ctrl+K can mean
     * something to the field itself.
     */
    static isChord(ev: KeyboardEvent): boolean {
        if (ev.key.toLowerCase() !== 'k' || ev.shiftKey || ev.altKey) return false;
        const apple = /Mac|iPhone|iPad/.test(navigator.platform) || /Mac OS/.test(navigator.userAgent);
        return apple ? ev.metaKey && !ev.ctrlKey : ev.ctrlKey && !ev.metaKey;
    }

    /** The hint to print next to the trigger: ⌘K or Ctrl K. */
    static shortcutLabel(): string {
        const apple = typeof navigator !== 'undefined'
            && (/Mac|iPhone|iPad/.test(navigator.platform) || /Mac OS/.test(navigator.userAgent));
        return apple ? '⌘K' : 'Ctrl K';
    }
}
