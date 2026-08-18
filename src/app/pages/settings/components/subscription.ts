import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { I18nService } from '../../../i18n/i18n.service';
import { ApiService } from '../../../core/services/api.service';
import { BillingService } from '../../../core/services/billing.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { PlanCheckoutSheet } from './plan-checkout-sheet';

/**
 * Settings → Abonnement (S11 Phase 3). "Where am I, how much AI have I used,
 * what can I do." The pricing/comparison lives on /pages/plans; this page is
 * the current-state + management surface, cross-linking to it. Built to the
 * Revolut/Wise bar: a navy "card" hero (the signature object), a considered AI
 * usage meter, state encoded in form + colour, light/dark at parity.
 */
@Component({
    selector: 'app-settings-subscription',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, ConfirmDialogModule, ToastModule, PlanCheckoutSheet],
    providers: [ConfirmationService, MessageService],
    template: `
        <p-toast position="top-center" />
        <p-confirmDialog [style]="{ width: '92vw', maxWidth: '420px' }" styleClass="!rounded-2xl" appendTo="body" />
        <app-plan-checkout-sheet [open]="sheetOpen()" (openChange)="sheetOpen.set($event)" [tier]="sheetTier()" />

        <div class="max-w-2xl mx-auto pb-12">

            @if (state() === 'loading') {
                <div class="rounded-3xl h-44 bg-surface-100 dark:bg-surface-800/60 animate-pulse mb-5"></div>
                <div class="rounded-2xl h-28 bg-surface-100 dark:bg-surface-800/60 animate-pulse"></div>
            } @else {

                <!-- ═══════ HERO CARD (tier-tinted §4: Premium = near-black navy + gold
                     line, Pro/beta = navy + ochre glow, Free/expired = neutral) ═══════ -->
                <section class="relative overflow-hidden rounded-3xl p-6 mb-5" [ngClass]="heroClass()">
                    @if (heroTier() === 'premium') {
                        <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ochre-400 via-ochre-500 to-ochre-400" aria-hidden="true"></div>
                    }
                    <div class="absolute -right-12 -top-12 w-44 h-44 rounded-full blur-2xl" [ngClass]="heroGlow()" aria-hidden="true"></div>

                    <p class="relative text-[11px] font-semibold uppercase tracking-[0.16em] mb-3" [ngClass]="hMuted()">
                        {{ t('subscription.yourPlan') }}
                    </p>

                    <div class="relative flex items-center gap-3 flex-wrap">
                        <span class="text-3xl font-bold tracking-tight leading-none">{{ planLabel() }}</span>

                        @switch (state()) {
                            @case ('beta') {
                                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" [ngClass]="hPill()">
                                    <i class="pi pi-gift !text-[11px]" aria-hidden="true"></i>{{ t('subscription.pills.beta') }}
                                </span>
                            }
                            @case ('active_prepaid') {
                                <span class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold" [ngClass]="hPill()">
                                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>{{ t('subscription.pills.active') }}
                                </span>
                            }
                            @case ('active_auto') {
                                <span class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold" [ngClass]="hPill()">
                                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>{{ t('subscription.pills.active') }}
                                </span>
                            }
                            @case ('cancelling') {
                                <span class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold" [ngClass]="hPill()">
                                    <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>{{ t('subscription.pills.ending') }}
                                </span>
                            }
                            @case ('past_due') {
                                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-400/15 text-amber-300">
                                    <i class="pi pi-exclamation-triangle !text-[11px]" aria-hidden="true"></i>{{ t('subscription.pills.pastDue') }}
                                </span>
                            }
                            @case ('expired') {
                                <span class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold" [ngClass]="hPill()">
                                    <span class="w-1.5 h-1.5 rounded-full bg-surface-400"></span>{{ t('subscription.pills.expired') }}
                                </span>
                            }
                        }
                    </div>

                    <!-- Revolut's "View plan benefits >": the owner-state card is also
                         the door to the benefits story (lands on this plan's tab). -->
                    <a [routerLink]="['/', lang, 'pages', 'plans']" [queryParams]="{ tier: heroTier() }"
                       class="relative mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors" [ngClass]="hLink()">
                        {{ t('subscription.viewBenefits') }}
                        <i class="pi pi-chevron-right !text-[10px]" aria-hidden="true"></i>
                    </a>

                    <!-- State body -->
                    @switch (state()) {
                        @case ('beta') {
                            <p class="relative mt-3.5 text-sm leading-relaxed max-w-[38ch]" [ngClass]="hBody()">{{ t('subscription.body.beta') }}</p>
                            <p class="relative mt-3 text-[12.5px]" [ngClass]="hMuted()">{{ t('subscription.body.betaNoPayment') }}</p>
                            <button pButton (click)="openSheet('premium')" [label]="t('subscription.cta.discoverPremium')"
                                    icon="pi pi-crown" class="omaad-press mt-5 !rounded-full !py-2.5 !px-5 !font-bold !border-0 !text-warm-900 !bg-gradient-to-r !from-ochre-400 !to-ochre-500"></button>
                        }
                        @case ('free') {
                            <p class="relative mt-3.5 text-sm leading-relaxed max-w-[38ch]" [ngClass]="hBody()">{{ t('subscription.body.free') }}</p>
                            <button pButton (click)="openSheet('pro')" [label]="t('subscription.cta.goPro')"
                                    icon="pi pi-crown" class="omaad-press mt-5 !rounded-full !py-2.5 !px-5 !font-bold !border-0 !text-warm-900 !bg-gradient-to-r !from-ochre-400 !to-ochre-500"></button>
                        }
                        @case ('active_prepaid') {
                            <div class="relative mt-4 pt-4 border-t" [ngClass]="hBorder()">
                                <div class="text-[15px] font-semibold">{{ t('subscription.expiresInDays', { n: daysLeft() }) }}</div>
                                <div class="text-[12.5px] mt-1 tabular-nums" [ngClass]="hMuted()">{{ periodEndLabel() }}</div>
                            </div>
                            <button pButton (click)="openSheet(currentTier())" [label]="t('subscription.cta.renewOneClick')"
                                    icon="pi pi-refresh" class="omaad-press mt-4 !rounded-full !py-2.5 !px-5 !font-bold !border-0 !text-warm-900 !bg-gradient-to-r !from-ochre-400 !to-ochre-500"></button>
                        }
                        @case ('active_auto') {
                            <div class="relative mt-4 pt-4 border-t" [ngClass]="hBorder()">
                                <div class="text-[15px] font-semibold">{{ t('subscription.autoRenewsOn', { date: periodEndDate() }) }}</div>
                                <div class="text-[12.5px] mt-1" [ngClass]="hMuted()">{{ t('subscription.autoRenewNote') }}</div>
                            </div>
                        }
                        @case ('cancelling') {
                            <p class="relative mt-4 pt-4 border-t text-sm" [ngClass]="hBorder() + ' ' + hBody()">{{ t('subscription.body.cancelling', { date: periodEndDate() }) }}</p>
                            <button pButton (click)="openSheet(currentTier())" [label]="t('subscription.cta.reactivate')"
                                    icon="pi pi-replay" class="omaad-press mt-4 !rounded-full !py-2.5 !px-5 !font-bold !border-0 !text-warm-900 !bg-gradient-to-r !from-ochre-400 !to-ochre-500"></button>
                        }
                        @case ('past_due') {
                            <p class="relative mt-4 pt-4 border-t text-sm" [ngClass]="hBorder() + ' ' + hBody()">{{ t('subscription.body.pastDue') }}</p>
                            <button pButton (click)="openSheet(currentTier())" [label]="t('subscription.cta.updatePayment')"
                                    icon="pi pi-credit-card" class="omaad-press mt-4 !rounded-full !py-2.5 !px-5 !font-bold !border-0 !text-warm-900 !bg-gradient-to-r !from-ochre-400 !to-ochre-500"></button>
                        }
                        @case ('expired') {
                            <p class="relative mt-4 pt-4 border-t text-sm" [ngClass]="hBorder() + ' ' + hBody()">{{ t('subscription.body.expired', { date: periodEndDate() }) }}</p>
                            <button pButton (click)="openSheet(currentTier())" [label]="t('subscription.cta.reactivate')"
                                    icon="pi pi-replay" class="omaad-press mt-4 !rounded-full !py-2.5 !px-5 !font-bold !border-0 !text-warm-900 !bg-gradient-to-r !from-ochre-400 !to-ochre-500"></button>
                        }
                    }
                </section>

                <!-- ═══════ AI USAGE METER ═══════ -->
                @if (usage(); as u) {
                    <section class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900/50 shadow-sm p-5 mb-5">
                        <div class="flex items-center justify-between mb-3">
                            <h2 class="text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">{{ t('subscription.usage.title') }}</h2>
                            @if (u.exempt) {
                                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-positive/12 text-positive">
                                    <i class="pi pi-infinity !text-[10px]" aria-hidden="true"></i>{{ t('subscription.usage.unlimited') }}
                                </span>
                            } @else if (u.exceeded) {
                                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-negative/12 text-negative">
                                    <i class="pi pi-ban !text-[10px]" aria-hidden="true"></i>{{ t('subscription.usage.reached') }}
                                </span>
                            } @else if (u.warning) {
                                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-warning/15 text-warning">
                                    <i class="pi pi-exclamation-triangle !text-[10px]" aria-hidden="true"></i>{{ t('subscription.usage.low') }}
                                </span>
                            } @else {
                                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-positive/12 text-positive">
                                    {{ t('subscription.usage.remaining', { n: u.remaining }) }}
                                </span>
                            }
                        </div>

                        <div class="flex items-end justify-between gap-3">
                            <div>
                                <div class="text-2xl font-bold text-surface-900 dark:text-surface-0 tabular-nums leading-none">
                                    {{ u.used }}<span class="text-base text-surface-400 dark:text-surface-500 font-medium"> / {{ u.limit }}</span>
                                </div>
                                <div class="text-[12.5px] text-surface-500 dark:text-surface-400 mt-1.5">{{ t('subscription.usage.messagesThisPeriod') }}</div>
                            </div>
                        </div>

                        <div class="mt-3.5 h-2 rounded-full bg-surface-200 dark:bg-surface-800 overflow-hidden">
                            <div class="h-full rounded-full transition-all duration-500"
                                 [style.width.%]="usagePct()"
                                 [ngClass]="u.exceeded ? 'bg-negative' : u.warning ? 'bg-warning' : 'bg-ochre-500'"></div>
                        </div>

                        <div class="mt-3 text-[12px] text-surface-400 dark:text-surface-500 tabular-nums">
                            {{ u.period_end ? t('subscription.usage.resetsOn', { date: resetLabel() }) : t('subscription.usage.freeGrant') }}
                        </div>
                    </section>
                }

                <!-- ═══════ AI ADVISOR METER (PREM-4) ═══════ -->
                @if (advisorUsage(); as a) {
                    <section class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900/50 shadow-sm p-5 mb-5">
                        <div class="flex items-center justify-between mb-3">
                            <h2 class="text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">{{ t('subscription.usage.advisorTitle') }}</h2>
                            @if (a.exempt) {
                                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-positive/12 text-positive">
                                    <i class="pi pi-infinity !text-[10px]" aria-hidden="true"></i>{{ t('subscription.usage.unlimited') }}
                                </span>
                            } @else if (a.limit <= 0) {
                                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-ochre-500/15 text-ochre-700 dark:text-ochre-300">
                                    <i class="pi pi-crown !text-[10px]" aria-hidden="true"></i>Premium
                                </span>
                            } @else if (a.exceeded) {
                                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-negative/12 text-negative">
                                    <i class="pi pi-ban !text-[10px]" aria-hidden="true"></i>{{ t('subscription.usage.reached') }}
                                </span>
                            } @else if (a.warning) {
                                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-warning/15 text-warning">
                                    <i class="pi pi-exclamation-triangle !text-[10px]" aria-hidden="true"></i>{{ t('subscription.usage.low') }}
                                </span>
                            } @else {
                                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-positive/12 text-positive">
                                    {{ t('subscription.usage.remaining', { n: a.remaining }) }}
                                </span>
                            }
                        </div>

                        @if (a.limit > 0) {
                            <div class="flex items-end justify-between gap-3">
                                <div>
                                    <div class="text-2xl font-bold text-surface-900 dark:text-surface-0 tabular-nums leading-none">
                                        {{ a.used }}<span class="text-base text-surface-400 dark:text-surface-500 font-medium"> / {{ a.limit }}</span>
                                    </div>
                                    <div class="text-[12.5px] text-surface-500 dark:text-surface-400 mt-1.5">
                                        {{ a.period_end ? t('subscription.usage.messagesThisPeriod') : t('subscription.usage.advisorPreview') }}
                                    </div>
                                </div>
                            </div>

                            <div class="mt-3.5 h-2 rounded-full bg-surface-200 dark:bg-surface-800 overflow-hidden">
                                <div class="h-full rounded-full transition-all duration-500"
                                     [style.width.%]="advisorPct()"
                                     [ngClass]="a.exceeded ? 'bg-negative' : a.warning ? 'bg-warning' : 'bg-ochre-500'"></div>
                            </div>

                            <div class="mt-3 text-[12px] text-surface-400 dark:text-surface-500 tabular-nums">
                                {{ a.period_end ? t('subscription.usage.resetsOn', { date: advisorResetLabel() }) : t('subscription.usage.advisorPreviewNote') }}
                            </div>
                        } @else {
                            <p class="text-[13px] leading-snug text-surface-600 dark:text-surface-300">{{ t('subscription.usage.advisorLockedNote') }}</p>
                        }

                        <!-- Conversion nudge: the advisor is a Premium feature, so anyone
                             not already on Premium (and not an exempt test account) sees
                             the upgrade path here. -->
                        @if (a.kind !== 'premium' && !a.exempt) {
                            <a [routerLink]="['/', lang, 'pages', 'plans']" [queryParams]="{ tier: 'premium' }"
                               class="omaad-press mt-4 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-ochre-500 hover:bg-ochre-400 text-warm-900 transition-colors">
                                <i class="pi pi-crown" style="font-size: 10px" aria-hidden="true"></i>
                                {{ t('subscription.usage.advisorUpgrade') }}
                            </a>
                        }
                    </section>
                }

                <!-- ═══════ ACTIONS ═══════ -->
                <section class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900/50 shadow-sm overflow-hidden">
                    <a [routerLink]="['/', lang, 'pages', 'plans']"
                       class="flex items-center gap-3.5 px-5 py-4 hover:bg-surface-50 dark:hover:bg-surface-900/60 transition-all cursor-pointer">
                        <span class="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0">
                            <i class="pi pi-th-large text-surface-500 dark:text-surface-400 !text-sm" aria-hidden="true"></i>
                        </span>
                        <span class="flex-1 min-w-0">
                            <span class="block text-[14.5px] font-medium text-surface-900 dark:text-surface-0">{{ t('subscription.actions.compare') }}</span>
                        </span>
                        <i class="pi pi-chevron-right text-surface-400 !text-xs shrink-0" aria-hidden="true"></i>
                    </a>

                    @if (canCancel()) {
                        <button type="button" (click)="confirmCancel()"
                                class="w-full text-left flex items-center gap-3.5 px-5 py-4 border-t border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-900/60 transition-all cursor-pointer">
                            <span class="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0">
                                <i class="pi pi-times-circle text-surface-500 dark:text-surface-400 !text-sm" aria-hidden="true"></i>
                            </span>
                            <span class="flex-1 min-w-0">
                                <span class="block text-[14.5px] font-medium text-surface-900 dark:text-surface-0">{{ t('subscription.actions.cancel') }}</span>
                                <span class="block text-[12px] text-surface-400 dark:text-surface-500 mt-0.5">{{ t('subscription.actions.cancelHint') }}</span>
                            </span>
                            <i class="pi pi-chevron-right text-surface-400 !text-xs shrink-0" aria-hidden="true"></i>
                        </button>
                    }
                </section>

                <!-- ═══════ HISTORIQUE (self-hiding: only when payments exist) ═══════ -->
                @if (payments().length > 0) {
                    <section class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900/50 shadow-sm p-5 mt-5">
                        <h2 class="text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-1">{{ t('subscription.history.title') }}</h2>
                        <div class="divide-y divide-surface-100 dark:divide-surface-800">
                            @for (p of payments(); track p.reference) {
                                <div class="flex items-center gap-3 py-3">
                                    <div class="flex-1 min-w-0">
                                        <div class="text-[14px] font-medium text-surface-900 dark:text-surface-0">{{ planName(p.plan) }} · {{ p.duration_label }}</div>
                                        <div class="text-[12px] text-surface-400 dark:text-surface-500 tabular-nums mt-0.5">{{ fmtDate(p.created_at) }}</div>
                                    </div>
                                    <div class="text-right shrink-0">
                                        <div class="text-[14px] font-semibold text-surface-900 dark:text-surface-0 tabular-nums">{{ fmtMoney(p.amount, p.currency) }}</div>
                                        <span class="inline-flex items-center gap-1.5 mt-1 text-[11px] font-medium" [ngClass]="statusClass(p.status)">
                                            <span class="w-1.5 h-1.5 rounded-full" [ngClass]="statusDot(p.status)"></span>
                                            {{ t('subscription.history.status.' + p.status) }}
                                        </span>
                                    </div>
                                </div>
                            }
                        </div>
                    </section>
                }

                @if (state() === 'active_prepaid' || state() === 'cancelling') {
                    <p class="text-[11.5px] text-surface-400 dark:text-surface-500 leading-relaxed mt-4 px-1">{{ t('subscription.momoFootnote') }}</p>
                }
                @if (state() === 'beta') {
                    <p class="text-[11.5px] text-surface-400 dark:text-surface-500 leading-relaxed mt-4 px-1">{{ t('subscription.founderFootnote') }}</p>
                }
            }
        </div>
    `
})
export class SubscriptionSettings implements OnInit {
    private i18n = inject(I18nService);
    private api = inject(ApiService);
    private router = inject(Router);
    private confirm = inject(ConfirmationService);
    private toast = inject(MessageService);
    private cs = inject(CurrencyService);
    protected billing = inject(BillingService);

    lang = 'fr';
    sheetOpen = signal(false);
    sheetTier = signal<'pro' | 'premium'>('premium');

    readonly state = this.billing.state;
    readonly subscription = this.billing.subscription;
    readonly usage = this.billing.usage;
    readonly payments = this.billing.payments;

    ngOnInit(): void {
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        this.lang = match ? match[1] : 'fr';
        // Force-refresh on open: this page reflects server state that changes
        // out-of-band (a webhook grant, a renewal, an expiry cron), so a stale
        // cache would misreport the plan. Cheap, and correct.
        this.billing.load(true);
    }

    planLabel(): string {
        const st = this.state();
        if (st === 'beta') return 'Pro';
        if (st === 'free' || st === 'loading') return this.t('subscription.planFree');
        const p = this.subscription()?.plan;
        return p === 'premium' ? 'Premium' : p === 'pro' ? 'Pro' : this.t('subscription.planFree');
    }

    // ── Tier-tinted hero (§4): the same identity system as /pages/plans, so
    // "your plan card" and the plans page tier screen rhyme. Expired falls back
    // to the neutral tint (access is re-locked) while keeping the old plan name.
    heroTier = computed<'free' | 'pro' | 'premium'>(() => {
        const st = this.state();
        if (st === 'beta') return 'pro';
        if (st === 'free' || st === 'loading' || st === 'expired') return 'free';
        return this.subscription()?.plan === 'premium' ? 'premium' : 'pro';
    });

    private isNeutral(): boolean {
        return this.heroTier() === 'free';
    }

    heroClass(): string {
        switch (this.heroTier()) {
            case 'premium': return 'bg-brand-950 text-white border border-brand-700/50 shadow-xl';
            case 'pro':     return 'bg-gradient-to-br from-brand-700 to-brand-800 text-white shadow-xl';
            case 'free':    return 'bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 text-surface-900 dark:text-surface-0 shadow-sm';
        }
    }

    heroGlow(): string {
        switch (this.heroTier()) {
            case 'premium': return 'bg-ochre-400/15';
            case 'pro':     return 'bg-ochre-500/25';
            case 'free':    return 'bg-brand-700/10';
        }
    }

    hMuted(): string {
        return this.isNeutral() ? 'text-surface-400 dark:text-surface-500' : 'text-white/55';
    }
    hBody(): string {
        return this.isNeutral() ? 'text-surface-600 dark:text-surface-300' : 'text-white/70';
    }
    hBorder(): string {
        return this.isNeutral() ? 'border-surface-200 dark:border-surface-800' : 'border-white/10';
    }
    hPill(): string {
        return this.isNeutral()
            ? 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300'
            : 'bg-white/12 text-white';
    }
    hLink(): string {
        return this.isNeutral()
            ? 'text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200'
            : 'text-white/70 hover:text-white';
    }

    /** The tier to re-buy/renew: the current paid plan, defaulting to Pro. */
    currentTier(): 'pro' | 'premium' {
        return this.subscription()?.plan === 'premium' ? 'premium' : 'pro';
    }

    daysLeft = computed<number>(() => {
        const end = this.subscription()?.current_period_end;
        if (!end) return 0;
        const ms = new Date(end).getTime() - Date.now();
        return Math.max(0, Math.ceil(ms / 86_400_000));
    });

    usagePct = computed<number>(() => {
        const u = this.usage();
        if (!u || u.limit <= 0) return 0;
        return Math.min(100, Math.round((u.used / u.limit) * 100));
    });

    /** PREM-4: the ADVISOR bucket meter (the paid read-only advisor). Premium =
     *  monthly quota; Pro = one-time lifetime preview; free = none (limit 0). */
    readonly advisorUsage = computed(() => this.billing.usage()?.advisor ?? null);

    advisorPct = computed<number>(() => {
        const a = this.advisorUsage();
        if (!a) return 0;
        if (a.limit <= 0) return a.exceeded ? 100 : 0;  // free: locked, show a full track
        return Math.min(100, Math.round((a.used / a.limit) * 100));
    });

    advisorResetLabel(): string {
        return this.fmtDate(this.advisorUsage()?.period_end);
    }

    /** Cancel is only meaningful on a live paid subscription that still renews. */
    canCancel(): boolean {
        return this.state() === 'active_prepaid' || this.state() === 'active_auto';
    }

    periodEndDate(): string {
        return this.fmtDate(this.subscription()?.current_period_end);
    }
    periodEndLabel(): string {
        return this.t('subscription.onDate', { date: this.periodEndDate() });
    }
    resetLabel(): string {
        return this.fmtDate(this.usage()?.period_end);
    }

    fmtDate(iso: string | null | undefined): string {
        if (!iso) return '';
        const locale = this.i18n.lang() === 'en' ? 'en-US' : 'fr-FR';
        return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    }

    // ── Payment history row helpers ────────────────────────────────────────
    planName(plan: 'pro' | 'premium'): string {
        return plan === 'premium' ? 'Premium' : 'Pro';
    }

    /** Format a payment in ITS OWN currency (never converted to the display
     *  currency): reuse the app number formatter, append the payment's symbol. */
    fmtMoney(amount: number, currency: string): string {
        const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : 'FCFA';
        const digits = currency === 'EUR' && !Number.isInteger(amount) ? 2 : 0;
        return `${this.cs.formatDisplayNumber(amount, digits)} ${symbol}`;
    }

    statusClass(status: string): string {
        return status === 'succeeded' ? 'text-positive'
            : status === 'failed' ? 'text-negative'
                : 'text-surface-400 dark:text-surface-500';
    }
    statusDot(status: string): string {
        return status === 'succeeded' ? 'bg-positive'
            : status === 'failed' ? 'bg-negative'
                : 'bg-surface-300 dark:bg-surface-600';
    }

    openSheet(tier: 'pro' | 'premium'): void {
        this.sheetTier.set(tier);
        this.sheetOpen.set(true);
    }

    confirmCancel(): void {
        this.confirm.confirm({
            header: this.t('subscription.cancelConfirm.title'),
            message: this.t('subscription.cancelConfirm.message'),
            acceptLabel: this.t('subscription.cancelConfirm.accept'),
            rejectLabel: this.t('common.cancel'),
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => this.doCancel(),
        });
    }

    private doCancel(): void {
        this.api.cancelSubscription().subscribe({
            next: () => {
                this.billing.refresh();
                this.toast.add({ severity: 'success', summary: this.t('subscription.cancelConfirm.doneTitle'), detail: this.t('subscription.cancelConfirm.doneBody'), life: 4000 });
            },
            error: () => {
                this.toast.add({ severity: 'error', summary: this.t('common.error'), detail: this.t('subscription.cancelConfirm.error'), life: 4000 });
            },
        });
    }

    t(key: string, params?: Record<string, string | number>): string {
        return this.i18n.t(key, params);
    }
}
