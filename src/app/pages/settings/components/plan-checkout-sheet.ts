import { Component, inject, input, model, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { I18nService } from '../../../i18n/i18n.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { ApiService } from '../../../core/services/api.service';

type Tier = 'pro' | 'premium';
type Method = 'momo' | 'card';

interface DurationOption {
    key: 'd15' | 'm1' | 'm3' | 'm6';
    /** Duration in months; 15 days is modelled as 0.5 for the per-month math. */
    months: number;
    xof: number;
    eur: number;
    popular?: boolean;
}

/**
 * Placeholder price ladder (config-driven, easy to change), anchored on the
 * S11 memo (Pro 4 000 / Premium 10 000 XOF per month; €5 / €12). Longer passes
 * are discounted per month to pull users off the short-pass treadmill.
 * XOF and EUR are set independently — never a raw FX conversion (see
 * CurrencyService double-convert note). Numbers are NOT final; revisit post-beta.
 */
const PLAN_PRICING: Record<Tier, DurationOption[]> = {
    pro: [
        { key: 'd15', months: 0.5, xof: 2500, eur: 3 },
        { key: 'm1', months: 1, xof: 4000, eur: 5 },
        { key: 'm3', months: 3, xof: 10800, eur: 13.5, popular: true },
        { key: 'm6', months: 6, xof: 19200, eur: 24 },
    ],
    premium: [
        { key: 'd15', months: 0.5, xof: 6000, eur: 7 },
        { key: 'm1', months: 1, xof: 10000, eur: 12 },
        { key: 'm3', months: 3, xof: 27000, eur: 32, popular: true },
        { key: 'm6', months: 6, xof: 48000, eur: 58 },
    ],
};

@Component({
    selector: 'app-plan-checkout-sheet',
    standalone: true,
    imports: [CommonModule, DialogModule, ButtonModule],
    template: `
        <p-dialog [(visible)]="open" [modal]="true" [draggable]="false" [resizable]="false"
                  [dismissableMask]="true" [style]="{ width: '95vw', maxWidth: '520px' }"
                  [transitionOptions]="'320ms cubic-bezier(0.34, 1.30, 0.64, 1)'"
                  styleClass="!rounded-2xl overflow-hidden" [showHeader]="false">

            <div class="flex flex-col">

                <!-- Header -->
                <div class="relative px-6 pt-6 pb-4 text-center border-b border-surface-100 dark:border-surface-800">
                    <button (click)="open.set(false)" [attr.aria-label]="t('common.close')"
                            class="absolute right-4 top-4 w-9 h-9 flex items-center justify-center rounded-full
                                   bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-all">
                        <i class="pi pi-times text-surface-600 dark:text-surface-300 !text-sm" aria-hidden="true"></i>
                    </button>
                    <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ochre-100 dark:bg-ochre-900/30 mb-2">
                        <i class="pi pi-crown text-ochre-500 !text-xs" aria-hidden="true"></i>
                        <span class="text-ochre-600 dark:text-ochre-300 text-xs font-bold">{{ planName() }}</span>
                    </div>
                    <h2 class="text-lg font-bold text-surface-900 dark:text-surface-0 m-0">{{ t('plans.checkout.chooseDuration') }}</h2>
                    <p class="text-xs text-surface-500 dark:text-surface-400 mt-1">{{ t('plans.checkout.saveMore') }}</p>
                </div>

                <div class="px-6 py-5 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">

                    <!-- Duration options -->
                    <div class="flex flex-col gap-2.5">
                        @for (opt of options(); track opt.key) {
                            <button type="button" (click)="selected.set(opt)"
                                    class="omaad-press relative w-full text-left rounded-xl border px-4 py-3.5 flex items-center justify-between transition-all"
                                    [ngClass]="selected()?.key === opt.key
                                        ? 'border-ochre-500 border-2 bg-ochre-50 dark:bg-ochre-900/20'
                                        : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'">
                                <div class="flex items-center gap-3">
                                    <span class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                                          [ngClass]="selected()?.key === opt.key ? 'border-ochre-500' : 'border-surface-300 dark:border-surface-600'">
                                        @if (selected()?.key === opt.key) {
                                            <span class="w-2.5 h-2.5 rounded-full bg-ochre-500"></span>
                                        }
                                    </span>
                                    <div>
                                        <div class="flex items-center gap-2">
                                            <span class="font-bold text-surface-900 dark:text-surface-0 text-sm">{{ t('plans.checkout.' + opt.key) }}</span>
                                            @if (opt.popular) {
                                                <span class="px-2 py-0.5 rounded-md bg-ochre-500 text-warm-900 text-[10px] font-bold uppercase tracking-wide">{{ t('plans.popular') }}</span>
                                            }
                                            @if (discountPct(opt) > 0) {
                                                <span class="px-1.5 py-0.5 rounded-md bg-positive/15 text-positive text-[11px] font-bold">−{{ discountPct(opt) }}%</span>
                                            }
                                        </div>
                                        <div class="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{{ perMonthLabel(opt) }}</div>
                                    </div>
                                </div>
                                <div class="text-right shrink-0">
                                    <div class="font-bold text-surface-900 dark:text-surface-0 text-base">{{ price(amount(opt)) }}</div>
                                </div>
                            </button>
                        }
                    </div>

                    <!-- Payment method -->
                    <div>
                        <h3 class="text-sm font-semibold text-surface-900 dark:text-surface-0 mb-2.5 text-center">{{ t('plans.checkout.howToPay') }}</h3>
                        <div class="grid grid-cols-2 gap-3">
                            <button type="button" (click)="method.set('momo')"
                                    class="omaad-press rounded-xl border px-3 py-3 flex flex-col items-center gap-1.5 transition-all"
                                    [ngClass]="method() === 'momo'
                                        ? 'border-brand-700 border-2 bg-brand-50 dark:bg-brand-900/20'
                                        : 'border-surface-200 dark:border-surface-700'">
                                <i class="pi pi-mobile text-ochre-500" aria-hidden="true"></i>
                                <span class="font-semibold text-surface-900 dark:text-surface-0 text-sm">{{ t('plans.checkout.mobileMoney') }}</span>
                                <div class="flex gap-1">
                                    <span class="px-1.5 py-0.5 rounded bg-orange-500 text-white text-[9px] font-bold">Orange</span>
                                    <span class="px-1.5 py-0.5 rounded bg-sky-400 text-white text-[9px] font-bold">Wave</span>
                                </div>
                            </button>
                            <button type="button" (click)="method.set('card')"
                                    class="omaad-press rounded-xl border px-3 py-3 flex flex-col items-center gap-1.5 transition-all"
                                    [ngClass]="method() === 'card'
                                        ? 'border-brand-700 border-2 bg-brand-50 dark:bg-brand-900/20'
                                        : 'border-surface-200 dark:border-surface-700'">
                                <i class="pi pi-credit-card text-brand-700 dark:text-brand-300" aria-hidden="true"></i>
                                <span class="font-semibold text-surface-900 dark:text-surface-0 text-sm">{{ t('plans.checkout.card') }}</span>
                                <div class="flex gap-1">
                                    <span class="px-1.5 py-0.5 rounded bg-brand-800 text-white text-[9px] font-bold">Visa</span>
                                    <span class="px-1.5 py-0.5 rounded bg-negative-500 text-white text-[9px] font-bold">MC</span>
                                </div>
                            </button>
                        </div>
                        <!-- Renewal semantics differ by rail (S11 decision) -->
                        <p class="text-[11px] text-surface-500 dark:text-surface-400 mt-2 text-center flex items-center justify-center gap-1.5">
                            <i class="pi pi-info-circle !text-[11px]" aria-hidden="true"></i>
                            {{ method() === 'momo' ? t('plans.checkout.momoNote') : t('plans.checkout.cardNote') }}
                        </p>
                    </div>

                    <!-- Promo -->
                    <button type="button"
                            class="w-full rounded-xl border border-dashed border-surface-300 dark:border-surface-600 px-4 py-2.5 text-sm text-surface-500 dark:text-surface-400 flex items-center justify-center gap-2 hover:border-surface-400 transition-all">
                        <i class="pi pi-tag !text-xs" aria-hidden="true"></i>{{ t('plans.checkout.promo') }}
                    </button>
                </div>

                <!-- Footer: total + CTA -->
                <div class="px-6 pt-4 pb-6 border-t border-surface-100 dark:border-surface-800">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-surface-500 dark:text-surface-400 text-sm">{{ t('plans.checkout.total') }}</span>
                        <span class="text-2xl font-bold text-surface-900 dark:text-surface-0">{{ price(total()) }}</span>
                    </div>
                    <button pButton (click)="pay()" [disabled]="paying()"
                            [label]="paying() ? t('plans.checkout.redirecting') : t('plans.checkout.cta', { plan: planName() })"
                            [icon]="paying() ? 'pi pi-spin pi-spinner' : 'pi pi-crown'"
                            class="omaad-press w-full !rounded-full !py-3.5 !font-bold !bg-ochre-500 !bg-gradient-to-r !from-ochre-400 !to-ochre-500 !border-0 !text-warm-900 hover:!from-ochre-500 hover:!to-ochre-600 shadow-lifted transition-all disabled:!opacity-70"></button>
                    @if (paymentPending()) {
                        <p class="text-[11px] text-ochre-600 dark:text-ochre-400 mt-3 text-center">
                            {{ t('plans.checkout.comingSoon') }}
                        </p>
                    }
                </div>
            </div>
        </p-dialog>
    `
})
export class PlanCheckoutSheet {
    private i18n = inject(I18nService);
    protected cs = inject(CurrencyService);
    private api = inject(ApiService);

    /** Two-way visibility, and which tier is being purchased. */
    open = model<boolean>(false);
    tier = input<Tier>('premium');

    selected = signal<DurationOption | null>(null);
    method = signal<Method>('momo');
    paymentPending = signal(false);
    paying = signal(false);

    private isEur = computed(() => this.cs.currencyCode() === 'EUR');

    options = computed<DurationOption[]>(() => PLAN_PRICING[this.tier()]);
    planName = computed(() => (this.tier() === 'pro' ? 'Pro' : 'Premium'));

    constructor() {
        // Default the highlighted (popular) pass and the rail that matches the
        // user's currency whenever the sheet opens or the tier changes.
        effect(() => {
            const opts = this.options();
            const popular = opts.find(o => o.popular) ?? opts[0];
            this.selected.set(popular);
            this.method.set(this.isEur() ? 'card' : 'momo');
            this.paymentPending.set(false);
        });
    }

    t(key: string, params?: Record<string, string | number>): string {
        return this.i18n.t(key, params);
    }

    amount(opt: DurationOption): number {
        return this.isEur() ? opt.eur : opt.xof;
    }

    /** Formats a display-currency value (no FX conversion) + the symbol. */
    price(value: number): string {
        const digits = this.isEur() && !Number.isInteger(value) ? 2 : 0;
        return `${this.cs.formatDisplayNumber(value, digits)} ${this.cs.config().symbol}`;
    }

    /** Per-month equivalent shown under each pass ("soit X /mois"). */
    perMonthLabel(opt: DurationOption): string {
        const perMonth = this.amount(opt) / opt.months;
        return this.t('plans.checkout.perMonthEq', { price: this.price(perMonth) });
    }

    /** Discount of a pass vs the 1-month anchor, per month. 0 or less ⇒ hidden. */
    discountPct(opt: DurationOption): number {
        const anchor = this.options().find(o => o.key === 'm1');
        if (!anchor || opt.key === 'm1') return 0;
        const anchorPerMonth = this.amount(anchor);
        const perMonth = this.amount(opt) / opt.months;
        return Math.round((1 - perMonth / anchorPerMonth) * 100);
    }

    total = computed(() => {
        const opt = this.selected();
        return opt ? this.amount(opt) : 0;
    });

    /**
     * Start the hosted checkout (S11). We POST (plan, duration, method); the
     * server mints the reference + returns the PSP checkout URL, and access is
     * granted ONLY on the signed server webhook, never on this client action
     * (S11_PSP_MEMO.md). When no PSP is wired yet the server answers 503 and we
     * fall back to the honest "coming soon" note instead of a raw error.
     */
    pay(): void {
        const opt = this.selected();
        if (!opt || this.paying()) return;
        this.paying.set(true);
        this.paymentPending.set(false);
        this.api.createCheckout({ plan: this.tier(), duration_key: opt.key, method: this.method() })
            .subscribe({
                next: (res) => { window.location.href = res.checkout_url; },
                error: () => { this.paying.set(false); this.paymentPending.set(true); },
            });
    }
}
