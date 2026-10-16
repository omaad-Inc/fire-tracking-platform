import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { I18nService } from '../../../i18n/i18n.service';
import { nbspSafe } from '../../../core/util/nbsp';
import { RevealDirective } from './reveal.directive';

interface ScenarioPoint {
    pessimistic: number;
    median: number;
    optimistic: number;
}

const HORIZONS = [10, 20, 30] as const;
const RATES = { pess: 0.04, median: 0.07, opti: 0.10 };

/**
 * The ONE interactive tool on the landing (landing redesign): value before
 * sign-up, like Wise's live quote. Same deterministic 4 / 7 / 10 % future
 * value as before; the "cost of waiting" twin calculator and the wealth
 * score mock are gone (same inputs, same lesson). Risk line stays inline.
 */
@Component({
    selector: 'fire-projection-widget',
    standalone: true,
    imports: [FormsModule, RouterModule, RevealDirective],
    template: `
        <section id="projection" class="lp-section-tight scroll-mt-16" [attr.aria-labelledby]="'projection-title'">
            <div class="lp-container">
                <div class="max-w-[40rem] mx-auto text-center" lpReveal>
                    <span class="lp-eyebrow">{{ t('landing.fireProjection.eyebrow') }}</span>
                    <h2 id="projection-title" class="lp-h2 mt-3">{{ t('landing.fireProjection.h2a') }} {{ t('landing.fireProjection.h2b') }}</h2>
                    <p class="lp-lead mt-4">{{ t('landing.fireProjection.description') }}</p>
                </div>

                <div class="lp-card mt-8 lg:mt-12 p-5 sm:p-8 lg:p-10" lpReveal>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-8">
                        <div>
                            <div class="flex items-baseline justify-between gap-3 mb-1">
                                <label for="fire-monthly" class="text-[15px] font-medium">{{ t('landing.fireProjection.monthlyLabel') }}</label>
                                <span class="text-[18px] font-bold lp-num text-[color:var(--lp-ochre-ink)]">
                                    {{ formatNumber(monthlySavings()) }}
                                    <span class="text-[12px] font-normal lp-muted ml-1">{{ t('landing.fireProjection.monthlyUnit') }}</span>
                                </span>
                            </div>
                            <input id="fire-monthly" class="lp-range" type="range" min="25000" max="500000" step="25000"
                                   [ngModel]="monthlySavings()" (ngModelChange)="monthlySavings.set($event)" (change)="trackRun()"
                                   [attr.aria-valuetext]="formatNumber(monthlySavings()) + ' FCFA'" />
                        </div>
                        <div>
                            <div class="flex items-baseline justify-between gap-3 mb-1">
                                <label for="fire-initial" class="text-[15px] font-medium">{{ t('landing.fireProjection.initialLabel') }}</label>
                                <span class="text-[18px] font-bold lp-num text-[color:var(--lp-ochre-ink)]">
                                    {{ formatNumber(initialCapital()) }}
                                    <span class="text-[12px] font-normal lp-muted ml-1">{{ t('landing.fireProjection.initialUnit') }}</span>
                                </span>
                            </div>
                            <input id="fire-initial" class="lp-range" type="range" min="0" max="50000000" step="500000"
                                   [ngModel]="initialCapital()" (ngModelChange)="initialCapital.set($event)" (change)="trackRun()"
                                   [attr.aria-valuetext]="formatNumber(initialCapital()) + ' FCFA'" />
                        </div>
                    </div>

                    <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4" aria-live="polite">
                        @for (h of horizons(); track h.years) {
                            <div class="rounded-2xl border border-[color:var(--lp-line)] p-5">
                                <span class="lp-eyebrow !text-[color:var(--lp-muted)]">{{ h.years }} {{ t('landing.fireProjection.yearsSuffix') }}</span>
                                <div class="mt-3 text-[34px] lg:text-[40px] font-extrabold leading-none tracking-[-0.02em] lp-num">{{ formatCompact(h.scenarios.median) }}</div>
                                <div class="mt-1 text-[12px] font-medium uppercase tracking-[0.06em] lp-muted">{{ t('landing.fireProjection.medianLabel') }}</div>
                                <div class="relative mt-4 h-1.5 rounded-full bg-[rgba(15,26,46,0.08)]">
                                    <div class="absolute inset-y-0 left-0 rounded-full bg-[color:var(--lp-ochre)] opacity-60" style="width: 100%"></div>
                                    <div class="absolute top-1/2 -translate-y-1/2 w-1 h-3 rounded-full bg-[color:var(--lp-ink)]" [style.left.%]="medianPosition(h.scenarios)"></div>
                                </div>
                                <dl class="mt-4 flex flex-col gap-1.5 text-[14px] m-0">
                                    <div class="flex items-center justify-between"><dt class="lp-muted">{{ t('landing.fireProjection.pessLabel') }}</dt><dd class="m-0 font-semibold lp-num">{{ formatCompact(h.scenarios.pessimistic) }}</dd></div>
                                    <div class="flex items-center justify-between"><dt class="lp-muted">{{ t('landing.fireProjection.optiLabel') }}</dt><dd class="m-0 font-semibold lp-num">{{ formatCompact(h.scenarios.optimistic) }}</dd></div>
                                </dl>
                            </div>
                        }
                    </div>

                    <div class="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <p class="text-[13px] lp-muted m-0 max-w-[40rem]">{{ t('landing.fireProjection.disclaimer') }}</p>
                        <a class="lp-link shrink-0" [routerLink]="[currentLang, 'tools', 'fire-simulator']" (click)="trackCta('projection_tool')">
                            {{ t('landing.fireProjection.ctaSimulate') }}
                            <i class="pi pi-arrow-right text-[12px]" aria-hidden="true"></i>
                        </a>
                    </div>
                </div>
            </div>
        </section>
    `,
})
export class FireProjectionWidget {
    private i18n = inject(I18nService);
    private router = inject(Router);
    private analytics = inject(AnalyticsService);
    private runTracked = false;

    monthlySavings = signal(75_000);
    initialCapital = signal(0);

    horizons = computed(() =>
        HORIZONS.map(years => ({
            years,
            scenarios: {
                pessimistic: this.fv(this.initialCapital(), this.monthlySavings(), RATES.pess, years),
                median:      this.fv(this.initialCapital(), this.monthlySavings(), RATES.median, years),
                optimistic:  this.fv(this.initialCapital(), this.monthlySavings(), RATES.opti, years),
            } as ScenarioPoint
        }))
    );

    get currentLang(): string {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        return '/' + (match ? match[1] : 'fr');
    }

    t(key: string): string { return this.i18n.t(key); }

    trackCta(placement: string): void {
        this.analytics.trackPublic('cta_click', { cta: placement, placement, lang: this.currentLang.replace(/^\//, '') });
    }

    /** One `simulator_run` per visit, on the first slider release (not per tick). */
    trackRun(): void {
        if (this.runTracked) return;
        this.runTracked = true;
        this.analytics.trackPublic('simulator_run', { simulator: 'landing_projection', lang: this.currentLang.replace(/^\//, '') });
    }

    /** Future value of an annuity-due-style monthly investment with starting capital. */
    private fv(initial: number, monthly: number, annualRate: number, years: number): number {
        const r = annualRate / 12;
        const n = years * 12;
        const growth = Math.pow(1 + r, n);
        return initial * growth + monthly * ((growth - 1) / r);
    }

    medianPosition(s: ScenarioPoint): number {
        const range = s.optimistic - s.pessimistic;
        if (range <= 0) return 50;
        return Math.max(5, Math.min(95, ((s.median - s.pessimistic) / range) * 100));
    }

    formatNumber(n: number): string {
        return nbspSafe(new Intl.NumberFormat(this.i18n.lang() === 'fr' ? 'fr-FR' : 'en-US').format(Math.round(n)));
    }

    formatCompact(n: number): string {
        const lang = this.i18n.lang();
        const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
        if (n >= 1_000_000) {
            const v = nbspSafe(new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n / 1_000_000));
            return v.replace(/[,.]0$/, '') + (lang === 'fr' ? ' M' : 'M');
        }
        if (n >= 1_000) return Math.round(n / 1_000) + (lang === 'fr' ? ' k' : 'k');
        return Math.round(n).toString();
    }
}
