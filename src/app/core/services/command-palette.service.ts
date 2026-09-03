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
    /** Opened with `?`: the palette leads with the keyboard legend (P3-5). */
    readonly legend = signal(false);
    /** Emitted when the user picks "add a transaction"; the shell owns the sheet. */
    readonly quickAddRequested = new Subject<void>();

    show(): void { this.legend.set(false); this.open.set(true); }
    showHelp(): void { this.legend.set(true); this.open.set(true); }
    hide(): void { this.open.set(false); this.legend.set(false); }
    toggle(): void { if (this.open()) this.hide(); else this.show(); }

    /**
     * `?` outside an editable field opens the shortcut legend. Shift is part of
     * typing `?` on most layouts, so only Ctrl/Alt/Meta disqualify; a field
     * that takes text keeps its question marks.
     */
    static isHelpKey(ev: KeyboardEvent): boolean {
        if (ev.key !== '?' || ev.ctrlKey || ev.altKey || ev.metaKey) return false;
        const el = ev.target as HTMLElement | null;
        if (!el) return true;
        const tag = el.tagName;
        return !(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable);
    }

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
