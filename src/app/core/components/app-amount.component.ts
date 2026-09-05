import { Component, input, computed, inject, signal, effect, OnDestroy } from '@angular/core';
import { CurrencyService } from '../services/currency.service';
import { PrivacyService } from '../services/privacy.service';
import { prefersReducedMotion } from '../theme/chart-theme';
import { nbspSafe } from '../util/nbsp';

/**
 * Renders a EUR value as a formatted amount with the currency symbol.
 *
 * Features:
 *  - Auto-converts EUR → display currency via CurrencyService
 *  - Count-up animation from 0 on first render (~600ms ease-out)
 *  - Privacy mode: shows ••••• when PrivacyService.hidden() is true
 *  - Tabular numbers for perfect column alignment
 */
@Component({
    selector: 'app-amount',
    standalone: true,
    template: `
        @if (privacy.hidden()) {
            <span class="tracking-wide">•••••</span><span class="text-[0.6em] font-semibold ml-0.5 opacity-60 dark:opacity-90 align-baseline">{{ symbol() }}</span>
        } @else {
            @if (prefix()) {
                <span>{{ prefix() }}</span>
            }
            <span>{{ parts().whole }}</span>@if (parts().minor; as minor) {<span class="text-[0.55em] font-bold align-baseline">{{ minor }}</span>}<span class="text-[0.6em] font-semibold ml-0.5 opacity-60 dark:opacity-90 align-baseline">{{ symbol() }}</span>
        }
    `,
    host: { class: 'inline-flex items-baseline gap-0' },
})
export class AppAmountComponent implements OnDestroy {
    /** Value in EUR (will be converted to display currency). */
    value = input<number | null | undefined>(0);

    /** Optional prefix string (e.g. '+', '-'). */
    prefix = input<string>('');

    /** Whether to animate the count-up. Defaults to true. */
    animate = input<boolean>(true);

    /**
     * Explicit decimal width. Omitted (the default) DERIVES it from the amount
     * and the currency's minor unit — see CurrencyService.decimalsFor. Set it
     * ONLY for a rollup whose cents are noise rather than fact; a hardcoded 0
     * here is what rendered a 539,69 € rent as "540 €" on every screen.
     */
    decimals = input<number | undefined>(undefined);

    /**
     * Hero variant: render the minor unit smaller than the whole part, the way
     * `HeroMoneyText` does on mobile. No decimal span is drawn at all when the
     * amount is whole or the currency has no minor unit (XOF / XAF).
     */
    hero = input<boolean>(false);

    private cs = inject(CurrencyService);
    privacy    = inject(PrivacyService);

    symbol = computed(() => this.cs.config().symbol);

    // The final target value (in display currency, absolute)
    private targetDisplayValue = computed(() => {
        const eurValue = Math.abs(this.value() ?? 0);
        return eurValue * this.cs.config().rate;
    });

    // The animated current value, starts at 0 and counts up
    private animatedValue = signal(0);
    private animFrameId = 0;
    private hasAnimated = false;
    /** Honor the OS reduced-motion setting: show the final value instantly, no count-up. */
    private reducedMotion = prefersReducedMotion();
    /**
     * Session-scoped reveal: the count-up plays once per app session (the first
     * screen's amounts), then every later amount, on tab-switches and revisits,
     * appears instantly. Set when the first animation completes, so re-counting
     * doesn't nag on every navigation. Reset only on a full reload.
     */
    private static sessionRevealed = false;

    /**
     * The decimal width, derived from the TARGET rather than from the animated
     * value. Deriving it from the latter would make the number change width
     * mid-count-up, every time an intermediate frame happened to land on a
     * whole unit.
     */
    private fractionDigits = computed(() =>
        this.decimals() ?? this.cs.decimalsFor(this.targetDisplayValue()));

    // Formatted display string
    displayStr = computed(() => {
        const val = this.animatedValue();
        const { locale } = this.cs.config();
        const digits = this.fractionDigits();
        return nbspSafe(new Intl.NumberFormat(locale, {
            maximumFractionDigits: digits,
            minimumFractionDigits: digits,
        }).format(val));
    });

    /**
     * The number split into its whole part and its minor unit (separator
     * included), so the hero can size the cents down. Outside hero mode — and
     * whenever there is no minor unit to show — `minor` is null and `whole`
     * carries the whole string, which renders exactly as it always did.
     */
    parts = computed<{ whole: string; minor: string | null }>(() => {
        const text = this.displayStr();
        if (!this.hero() || this.fractionDigits() === 0) return { whole: text, minor: null };
        const at = text.lastIndexOf(this.cs.decimalSeparator());
        if (at < 0) return { whole: text, minor: null };
        return { whole: text.substring(0, at), minor: text.substring(at) };
    });

    constructor() {
        effect(() => {
            const target = this.targetDisplayValue();
            const shouldAnimate = this.animate();
            const isHidden = this.privacy.hidden();

            // Skip the count-up under reduced motion, privacy mode, once the session
            // has already had its reveal, or if this instance already animated.
            if (isHidden || !shouldAnimate || this.reducedMotion || AppAmountComponent.sessionRevealed || this.hasAnimated || target === 0) {
                this.animatedValue.set(target);
                return;
            }

            this.hasAnimated = true;
            this.countUp(0, target, 600);
        });
    }

    ngOnDestroy() {
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    }

    private countUp(from: number, to: number, duration: number) {
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        const start = performance.now();

        const step = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            this.animatedValue.set(from + (to - from) * eased);

            if (progress < 1) {
                this.animFrameId = requestAnimationFrame(step);
            } else {
                this.animatedValue.set(to);
                this.animFrameId = 0;
                // First reveal done: every later amount this session is instant.
                AppAmountComponent.sessionRevealed = true;
            }
        };

        this.animFrameId = requestAnimationFrame(step);
    }
}
