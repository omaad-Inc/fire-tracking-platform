import { Component, input, computed, inject, signal, effect, OnDestroy } from '@angular/core';
import { CurrencyService } from '../services/currency.service';
import { PrivacyService } from '../services/privacy.service';

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
            <span class="tracking-wide">•••••</span><span class="text-[0.6em] font-semibold ml-0.5 opacity-60 align-baseline">{{ symbol() }}</span>
        } @else {
            @if (prefix()) {
                <span>{{ prefix() }}</span>
            }
            <span>{{ displayStr() }}</span><span class="text-[0.6em] font-semibold ml-0.5 opacity-60 align-baseline">{{ symbol() }}</span>
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

    private cs = inject(CurrencyService);
    privacy    = inject(PrivacyService);

    symbol = computed(() => this.cs.config().symbol);

    // The final target value (in display currency, absolute)
    private targetDisplayValue = computed(() => {
        const eurValue = Math.abs(this.value() ?? 0);
        return eurValue * this.cs.config().rate;
    });

    // The animated current value — starts at 0 and counts up
    private animatedValue = signal(0);
    private animFrameId = 0;
    private hasAnimated = false;

    // Formatted display string
    displayStr = computed(() => {
        const val = this.animatedValue();
        const { locale } = this.cs.config();
        return new Intl.NumberFormat(locale, {
            maximumFractionDigits: 0,
            minimumFractionDigits: 0,
        }).format(Math.round(val));
    });

    constructor() {
        effect(() => {
            const target = this.targetDisplayValue();
            const shouldAnimate = this.animate();
            const isHidden = this.privacy.hidden();

            // Skip animation if privacy mode or already animated
            if (isHidden || !shouldAnimate || this.hasAnimated || target === 0) {
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
            }
        };

        this.animFrameId = requestAnimationFrame(step);
    }
}
