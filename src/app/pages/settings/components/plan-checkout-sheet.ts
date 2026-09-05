import { Component, inject, input, model, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { I18nService } from '../../../i18n/i18n.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { ApiService, DurationKey } from '../../../core/services/api.service';
import { BillingService } from '../../../core/services/billing.service';

type Tier = 'pro' | 'premium';
type Method = 'momo' | 'card';

interface DurationOption {
    key: DurationKey;
    /** Duration in months; 15 days is modelled as 0.5 for the per-month math. */
    months: number;
    xof: number;
    eur: number;
    popular?: boolean;
}

// Prices are NOT defined here anymore: they come from GET /billing/plans
// (billing_service.PRICING on the server) so there is ONE source of truth and
// the FE can never drift from what the server actually charges. `popular` is a
// pure presentation choice (which pass to highlight), so it stays on the FE.
const POPULAR_DURATION: DurationKey = 'm3';

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
                        @if (options().length === 0) {
                            <div class="py-8 text-center text-surface-400 dark:text-surface-500">
                                <i class="pi pi-spin pi-spinner !text-lg" aria-hidden="true"></i>
                            </div>
                        }
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
                                        ? 'border-ochre-500 border-2 bg-ochre-50 dark:bg-ochre-900/20'
                                        : 'border-surface-200 dark:border-surface-700'">
                                <i class="pi pi-mobile text-ochre-500" aria-hidden="true"></i>
                                <span class="font-semibold text-surface-900 dark:text-surface-0 text-sm">{{ t('plans.checkout.mobileMoney') }}</span>
                                <div class="flex gap-1">
                                    <span class="px-1.5 py-0.5 rounded bg-orange-500 text-white text-[9px] font-bold">Orange</span>
                                    <span class="px-1.5 py-0.5 rounded bg-sky-400 text-white text-[9px] font-bold">Wave</span>
                                </div>
                            </button>
                            <!-- Card rail parked until Bictorys. PayDunya's account carries no
                                 card channel, so an invoice scoped to it renders a hosted page
                                 with nothing payable — and we would already have written the
                                 pending row, leaving a phantom "En attente" in the history. -->
                            <button type="button" disabled
                                    class="rounded-xl border px-3 py-3 flex flex-col items-center gap-1.5
                                           border-surface-200 dark:border-surface-700 opacity-60 cursor-not-allowed">
                                <i class="pi pi-credit-card text-surface-400 dark:text-surface-500" aria-hidden="true"></i>
                                <span class="font-semibold text-surface-500 dark:text-surface-400 text-sm">{{ t('plans.checkout.card') }}</span>
                                <span class="px-1.5 py-0.5 rounded bg-surface-200 dark:bg-surface-700
                                             text-surface-600 dark:text-surface-300 text-[9px] font-bold uppercase tracking-wide">
                                    {{ t('plans.comingSoon') }}
                                </span>
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
                    <button pButton (click)="pay()" [disabled]="paying() || !selected()"
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
    private billing = inject(BillingService);

    /** Two-way visibility, and which tier is being purchased. */
    open = model<boolean>(false);
    tier = input<Tier>('premium');

    selected = signal<DurationOption | null>(null);
    method = signal<Method>('momo');
    paymentPending = signal(false);
    paying = signal(false);

    private isEur = computed(() => this.cs.currencyCode() === 'EUR');

    /** Duration ladder for the current tier, sourced from GET /billing/plans
     *  (empty until it loads). `months` is derived from the server's `days` for
     *  the per-month math; `popular` is the FE highlight choice. */
    options = computed<DurationOption[]>(() => {
        const resp = this.billing.plans();
        const plan = resp?.plans.find(p => p.plan === this.tier());
        if (!plan) return [];
        return plan.durations.map(d => ({
            key: d.duration_key,
            months: d.days / 30,
            xof: d.xof,
            eur: d.eur,
            popular: d.duration_key === POPULAR_DURATION,
        }));
    });
    planName = computed(() => (this.tier() === 'pro' ? 'Pro' : 'Premium'));

    constructor() {
        this.billing.loadPlans();
        // Default the highlighted (popular) pass whenever the sheet opens, the
        // tier changes, or the prices finish loading. Mobile money is the only
        // live rail while card is parked, so it is also the only default —
        // EUR-preference users used to land on card, i.e. on an unpayable page.
        // Restore `this.isEur() ? 'card' : 'momo'` when Bictorys carries cards.
        effect(() => {
            const opts = this.options();
            this.method.set('momo');
            this.paymentPending.set(false);
            if (opts.length) {
                this.selected.set(opts.find(o => o.popular) ?? opts[0]);
            }
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
        // Width from the currency the price is QUOTED in (EUR or XOF).
        const digits = this.cs.decimalsFor(value, this.isEur() ? 'EUR' : 'XOF');
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
