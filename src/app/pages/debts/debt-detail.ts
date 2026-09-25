import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AssetsStateService } from '../service/assets-state.service';
import { DebtsService, DebtDetailRecord, DebtRecord } from '../service/debts.service';
import { DebtPaymentRow } from '../../core/services/api.service';
import { AppAmountComponent } from '../../core/components/app-amount.component';
import { LoadErrorComponent } from '../../core/components/load-error.component';
import { ChipComponent, ChipTone } from '../../core/ui/chip.component';
import { FeedbackService } from '../../core/ui/feedback.service';
import { I18nService } from '../../i18n/i18n.service';
import { NavService } from '../../core/services/nav.service';
import { CurrencyService } from '../../core/services/currency.service';
import { PrivacyService } from '../../core/services/privacy.service';
import { ShareContextService } from '../../core/services/share-context.service';
import { parseLocalDate, toLocalDateStr } from '../../core/util/date';
import { nbspSafe } from '../../core/util/nbsp';
import { DebtPaymentSheetComponent } from './components/debt-payment-sheet';

/**
 * One debt with its ledger (P0 premium debts, parity with mobile /debts/:id):
 * hero (remaining), quick actions, progress + payoff estimate, dated history
 * with reversal, facts. Editing hands off to the list dialog (?edit=id) so
 * the form lives in one place.
 */
@Component({
    standalone: true,
    selector: 'app-debt-detail',
    imports: [CommonModule, RouterModule, ButtonModule, AppAmountComponent, LoadErrorComponent, ChipComponent, DebtPaymentSheetComponent],
    template: `
        <div class="flex items-center gap-3 mb-6">
            <a [routerLink]="nav.link('pages', 'debts')"
               class="w-10 h-10 flex items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-all no-underline shrink-0"
               [attr.aria-label]="t('debts.detail.back')">
                <i class="pi pi-arrow-left text-surface-600 dark:text-surface-300"></i>
            </a>
            <h1 class="text-lg font-semibold text-surface-900 dark:text-surface-0 m-0 truncate">{{ debt()?.name || t('debts.title') }}</h1>
        </div>

        @if (loading()) {
            <div class="space-y-4 animate-pulse">
                <div class="h-40 bg-surface-100 dark:bg-surface-800 rounded-2xl"></div>
                <div class="h-24 bg-surface-100 dark:bg-surface-800 rounded-2xl"></div>
                <div class="h-64 bg-surface-100 dark:bg-surface-800 rounded-2xl"></div>
            </div>
        } @else if (loadError()) {
            <app-load-error (retry)="load()" [body]="t('debts.detail.loadError')" />
        } @else if (gone()) {
            <div class="flex flex-col items-center justify-center py-16 text-center">
                <div class="w-14 h-14 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-3">
                    <i class="pi pi-inbox text-xl text-surface-400"></i>
                </div>
                <p class="text-surface-500 dark:text-surface-400 text-sm mb-4">{{ t('debts.detail.gone') }}</p>
                <a [routerLink]="nav.link('pages', 'debts')" class="text-brand-700 dark:text-brand-300 text-sm font-semibold no-underline">{{ t('debts.detail.back') }}</a>
            </div>
        } @else if (debt()) {
          @if (debt(); as d) {
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div class="lg:col-span-7 space-y-5">
                    <!-- ── Hero ── -->
                    <div class="bg-surface-0 dark:bg-surface-900 rounded-2xl border p-5"
                         [ngClass]="d.isOverdue ? 'border-negative-100 dark:border-negative-500/30' : 'border-surface-200 dark:border-surface-800'">
                        <div class="flex items-start gap-3">
                            <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                                 [ngClass]="isReceivable() ? 'bg-positive-50 dark:bg-positive-500/15' : 'bg-negative-50 dark:bg-negative-500/15'">
                                <i class="pi text-xl" [ngClass]="isReceivable() ? 'pi-arrow-down-left text-positive-600 dark:text-positive-400' : 'pi-arrow-up-right text-negative dark:text-negative-400'"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                                          [ngClass]="isReceivable()
                                              ? 'bg-positive-50 dark:bg-positive-500/15 border-positive-100 dark:border-positive-500/20 text-positive-600 dark:text-positive-400'
                                              : 'bg-negative-50 dark:bg-negative-500/15 border-negative-100 dark:border-negative-500/20 text-negative dark:text-negative-400'">
                                        {{ isReceivable() ? t('debts.owedToMe') : t('debts.iOwe') }}
                                    </span>
                                    <app-chip [label]="timeLabel(d)" [tone]="timeTone(d)" />
                                </div>
                                @if (d.creditor) { <p class="text-sm text-surface-500 dark:text-surface-400 mt-1 mb-0 truncate">{{ d.creditor }}</p> }
                            </div>
                        </div>
                        <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mt-5 mb-1">{{ t(isReceivable() ? 'debts.detail.remainingReceivable' : 'debts.detail.remaining') }}</p>
                        <div class="text-3xl font-bold tabular-nums" [ngClass]="d.isPaidOff ? 'text-surface-400' : (isReceivable() ? 'text-positive' : 'text-negative')">
                            <app-amount [value]="d.total - d.paid" [hero]="true" />
                        </div>
                        <p class="text-sm text-surface-500 dark:text-surface-400 mt-1 mb-0">{{ money(d.nativeRemaining, d.currency) }}</p>

                        @if (!share.active()) {
                            <div class="flex flex-wrap gap-2 mt-5">
                                @if (!d.isPaidOff) {
                                    <button pButton type="button" class="omaad-cta !rounded-full !py-2.5 !text-sm"
                                            icon="pi pi-check" [label]="t(isReceivable() ? 'debts.pay.titleReceivable' : 'debts.pay.title')"
                                            (click)="openPayment()"></button>
                                }
                                <button pButton type="button" class="omaad-secondary !rounded-full !py-2.5 !text-sm"
                                        icon="pi pi-pencil" [label]="t('debts.detail.edit')" (click)="edit()"></button>
                                @if (!d.isPaidOff) {
                                    <button pButton type="button" class="omaad-secondary !rounded-full !py-2.5 !text-sm"
                                            icon="pi pi-flag" [label]="t('debts.detail.markSettled')" (click)="markSettled()"></button>
                                }
                                <button pButton type="button" class="omaad-secondary !rounded-full !py-2.5 !text-sm !text-negative"
                                        icon="pi pi-trash" [label]="t('debts.toast.accept')" (click)="remove()"></button>
                            </div>
                        }
                    </div>

                    <!-- ── Progress ── -->
                    <div class="bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5">
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="text-base font-bold text-surface-900 dark:text-surface-0 m-0">{{ t('debts.detail.progress') }}</h3>
                            <span class="text-sm font-semibold text-positive-600 dark:text-positive-400 tabular-nums">{{ percent() }}%</span>
                        </div>
                        <div class="h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                            <div class="h-full rounded-full bg-positive-500 transition-all duration-500" [style.width]="percent() + '%'"></div>
                        </div>
                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                            <div>
                                <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ t(isReceivable() ? 'debts.receivedShort' : 'debts.paidShort') }}</p>
                                <div class="text-sm font-semibold text-surface-900 dark:text-surface-0"><app-amount [value]="d.paid" /></div>
                            </div>
                            <div>
                                <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ t('debts.detail.initial') }}</p>
                                <div class="text-sm font-semibold text-surface-900 dark:text-surface-0"><app-amount [value]="d.total" /></div>
                            </div>
                            @if (payoff(); as p) {
                                <div>
                                    <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ t('debts.detail.payoff') }}</p>
                                    <div class="text-sm font-semibold text-surface-900 dark:text-surface-0">{{ p }}</div>
                                    <p class="text-[11px] text-surface-400 m-0">{{ t('debts.detail.payoffHint') }}</p>
                                    @if (payoffWithInterest(); as w) {
                                        @if (w.date) {
                                            <p class="text-[11px] text-ochre-700 dark:text-ochre-400 m-0 mt-0.5">{{ t('debts.detail.payoffInterest', { date: w.date, rate: w.rate }) }}</p>
                                        } @else {
                                            <p class="text-[11px] text-negative m-0 mt-0.5">{{ t('debts.detail.payoffNever', { rate: w.rate }) }}</p>
                                        }
                                    }
                                </div>
                            }
                        </div>
                    </div>

                    <!-- ── History ── -->
                    <div class="bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800">
                        <div class="px-5 py-4 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between">
                            <h3 class="text-base font-bold text-surface-900 dark:text-surface-0 m-0">{{ t('debts.detail.history') }}</h3>
                            <span class="text-xs font-semibold text-surface-500 dark:text-surface-400">{{ d.payments.length }}</span>
                        </div>
                        @if (d.payments.length === 0) {
                            <p class="px-5 py-6 text-sm text-surface-500 dark:text-surface-400 text-center m-0">{{ t('debts.detail.noHistory') }}</p>
                        } @else {
                            <div class="px-5 py-2">
                                @for (p of historyRows(); track p.id) {
                                    <div class="flex items-center gap-3 py-3 border-b border-surface-100 dark:border-surface-800 last:border-b-0">
                                        <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                             [ngClass]="rowBg(p)">
                                            <i class="pi text-sm" [ngClass]="rowIcon(p)"></i>
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <p class="text-sm font-semibold text-surface-900 dark:text-surface-0 m-0 truncate">{{ kindLabel(p) }}</p>
                                            <p class="text-xs text-surface-500 dark:text-surface-400 m-0 truncate">
                                                {{ fmtDate(p.date) }}@if (p.account_name) { · {{ t('debts.detail.via', { name: p.account_name }) }} }@if (p.note) { · {{ p.note }} }
                                            </p>
                                        </div>
                                        <span class="text-sm font-semibold tabular-nums shrink-0" [ngClass]="p.direction === 'up' ? 'text-negative' : 'text-surface-900 dark:text-surface-0'">
                                            {{ p.direction === 'up' ? '+' : '−' }}{{ money(p.amount, d.currency) }}
                                        </span>
                                        @if (!share.active()) {
                                            <button type="button" class="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center hover:bg-negative-50 dark:hover:bg-negative-700/30 transition-colors shrink-0"
                                                    [attr.aria-label]="t('debts.detail.deletePaymentConfirm')" (click)="reverse(p)">
                                                <i class="pi pi-undo text-xs text-surface-500"></i>
                                            </button>
                                        }
                                    </div>
                                }
                            </div>
                        }
                    </div>
                </div>

                <!-- ── Facts ── -->
                <div class="lg:col-span-5">
                    <div class="bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800">
                        <div class="px-5 py-4 border-b border-surface-200 dark:border-surface-700">
                            <h3 class="text-base font-bold text-surface-900 dark:text-surface-0 m-0">{{ t('debts.detail.facts') }}</h3>
                        </div>
                        <div class="px-5 py-2">
                            @for (row of facts(); track row.label) {
                                <div class="flex items-center gap-3 py-3 border-b border-surface-100 dark:border-surface-800 last:border-b-0">
                                    <div class="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center shrink-0">
                                        <i class="pi text-brand-700 dark:text-ochre-400 text-sm" [ngClass]="row.icon"></i>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ row.label }}</p>
                                        <p class="text-sm font-semibold text-surface-900 dark:text-surface-0 m-0 truncate">{{ row.value }}</p>
                                    </div>
                                </div>
                            }
                        </div>
                    </div>
                </div>
            </div>
          }
        }

        <app-debt-payment-sheet #paySheet [(visible)]="paymentOpen" (saved)="onPaid($event)" />
    `
})
export class DebtDetailPage implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private debts = inject(DebtsService);
    private state = inject(AssetsStateService);
    private feedback = inject(FeedbackService);
    private i18n = inject(I18nService);
    private cs = inject(CurrencyService);
    private privacy = inject(PrivacyService);
    readonly nav = inject(NavService);
    readonly share = inject(ShareContextService);

    @ViewChild('paySheet') paySheet?: DebtPaymentSheetComponent;

    loading = signal(true);
    loadError = signal(false);
    gone = signal(false);
    debt = signal<DebtDetailRecord | null>(null);
    paymentOpen = false;

    private get id(): number { return Number(this.route.snapshot.paramMap.get('id')); }

    isReceivable = computed(() => this.debt()?.type === 'Receivable');
    percent = computed(() => {
        const d = this.debt();
        return d && d.total ? Math.min(100, Math.round((d.paid / d.total) * 100)) : 0;
    });
    historyRows = computed(() => [...(this.debt()?.payments ?? [])].reverse());  // newest first

    /** Payoff estimate at the instalment pace, before interest (P0 simple). */
    payoff = computed<string | null>(() => {
        const d = this.debt();
        if (!d || d.isPaidOff || !d.monthlyPayment || d.monthlyPayment <= 0 || d.nativeRemaining <= 0) return null;
        if (d.frequency !== 'monthly' && d.frequency !== 'weekly') return null;
        const periods = Math.ceil(d.nativeRemaining / d.monthlyPayment);
        const start = parseLocalDate(d.nextPaymentDate) ?? new Date();
        const end = new Date(start);
        if (d.frequency === 'weekly') end.setDate(end.getDate() + (periods - 1) * 7);
        else end.setMonth(end.getMonth() + (periods - 1));
        return end.toLocaleDateString(this.i18n.lang() === 'en' ? 'en-US' : 'fr-FR', { month: 'long', year: 'numeric' });
    });

    /** P1-3: the same estimate with interest, when a rate is known. Simple
     *  periodic amortisation (rate / 12 or / 52), labelled an estimate; no
     *  table. `date` is null when the instalment does not even cover the
     *  interest, so the balance never falls. */
    payoffWithInterest = computed<{ date: string | null; rate: number } | null>(() => {
        const d = this.debt();
        if (!d || !this.payoff() || !(d.interestRate > 0) || !d.monthlyPayment) return null;
        const r = d.interestRate / 100 / (d.frequency === 'weekly' ? 52 : 12);
        const balance = d.nativeRemaining;
        const instalment = d.monthlyPayment;
        if (instalment <= balance * r) return { date: null, rate: d.interestRate };
        const periods = Math.ceil(-Math.log(1 - (r * balance) / instalment) / Math.log(1 + r));
        const start = parseLocalDate(d.nextPaymentDate) ?? new Date();
        const end = new Date(start);
        if (d.frequency === 'weekly') end.setDate(end.getDate() + (periods - 1) * 7);
        else end.setMonth(end.getMonth() + (periods - 1));
        return {
            date: end.toLocaleDateString(this.i18n.lang() === 'en' ? 'en-US' : 'fr-FR', { month: 'long', year: 'numeric' }),
            rate: d.interestRate,
        };
    });

    facts = computed<{ label: string; value: string; icon: string }[]>(() => {
        const d = this.debt();
        if (!d) return [];
        const rows: { label: string; value: string; icon: string }[] = [];
        rows.push({ label: this.t('debts.fields.category'), value: this.t('debts.categories.' + d.category), icon: 'pi-tag' });
        if (d.creditor) rows.push({ label: this.t(this.isReceivable() ? 'debts.detail.debtor' : 'debts.detail.counterparty'), value: d.creditor, icon: 'pi-user' });
        if (d.interestRate > 0) rows.push({ label: this.t('debts.fields.interestRate'), value: `${d.interestRate} % / an`, icon: 'pi-percentage' });
        if (d.monthlyPayment) rows.push({ label: this.t('debts.fields.installment'), value: `${this.money(d.monthlyPayment, d.currency)} · ${this.freqLabel(d.frequency)}`, icon: 'pi-calendar-clock' });
        if (d.nextPaymentDate && !d.isPaidOff) rows.push({ label: this.t('debts.fields.nextDue'), value: this.fmtDate(d.nextPaymentDate, true), icon: 'pi-calendar' });
        if (d.lastPaymentDate) rows.push({ label: this.t('debts.detail.kind.payment'), value: `${this.money(d.lastPaymentAmount ?? 0, d.currency)} · ${this.fmtDate(d.lastPaymentDate, true)}`, icon: 'pi-history' });
        rows.push({ label: this.t('debts.fields.startDate'), value: this.fmtDate(d.date, true), icon: 'pi-calendar-plus' });
        rows.push({ label: 'Devise', value: d.currency, icon: 'pi-money-bill' });
        if (d.note) rows.push({ label: this.t('debts.fields.note'), value: d.note, icon: 'pi-align-left' });
        return rows;
    });

    ngOnInit() { this.load(); }

    async load() {
        this.loading.set(true);
        this.loadError.set(false);
        try {
            const d = await this.debts.getDetail(this.id);
            if (!d) this.gone.set(true);
            this.debt.set(d);
        } catch {
            this.loadError.set(true);
        } finally {
            this.loading.set(false);
        }
    }

    t(key: string, params?: Record<string, string | number>): string { return this.i18n.t(key, params); }

    // ── actions ────────────────────────────────────────────────────────

    openPayment() {
        const d = this.debt();
        if (!d) return;
        this.paySheet?.prime(d);
        this.paymentOpen = true;
    }

    async onPaid(_updated: DebtRecord) { await this.load(); }

    edit() {
        void this.router.navigate(this.nav.link('pages', 'debts'), { queryParams: { edit: String(this.id) } });
    }

    async markSettled() {
        const d = this.debt();
        if (!d) return;
        const ok = await this.feedback.confirm({
            title: this.t('debts.detail.markSettled'),
            message: this.t('debts.detail.markSettledMsg', { remaining: this.money(d.nativeRemaining, d.currency) }),
            confirmLabel: this.t('debts.detail.markSettledConfirm'),
            cancelLabel: this.t('debts.cancel'),
            icon: 'pi-flag',
            destructive: false,
        });
        if (!ok) return;
        try {
            await this.debts.writeOff(this.id, 'written_off');
            this.feedback.success(this.t('debts.detail.settledDone'));
            await this.load();
        } catch {
            this.feedback.error(this.t('debts.toast.saveError'));
        }
    }

    async reverse(p: DebtPaymentRow) {
        const ok = await this.feedback.confirm({
            title: this.t('debts.detail.deletePayment'),
            message: this.t('debts.detail.deletePaymentMsg'),
            confirmLabel: this.t('debts.detail.deletePaymentConfirm'),
            cancelLabel: this.t('debts.cancel'),
            icon: 'pi-undo',
        });
        if (!ok) return;
        try {
            this.debt.set(await this.debts.deletePayment(this.id, p.id));
            if (p.account_id != null) this.state.notifyTransactionsUpdated();
            this.feedback.success(this.t('debts.detail.deleted'));
        } catch {
            this.feedback.error(this.t('debts.toast.saveError'));
        }
    }

    async remove() {
        const d = this.debt();
        if (!d?.id) return;
        const ok = await this.feedback.confirm({
            title: this.t('debts.toast.confirmHeader'),
            message: this.t('debts.messages.deleteConfirm', { name: d.name }),
            confirmLabel: this.t('debts.toast.accept'),
            cancelLabel: this.t('debts.toast.reject'),
        });
        if (!ok) return;
        try {
            await this.debts.deleteRecords([d.id]);
            this.feedback.success(this.t('debts.toast.deletedDetail'));
            void this.router.navigate(this.nav.link('pages', 'debts'));
        } catch {
            this.feedback.error(this.t('debts.toast.deleteError'));
        }
    }

    // ── presentation ───────────────────────────────────────────────────

    kindLabel(p: DebtPaymentRow): string {
        if (p.kind === 'payment' && this.isReceivable()) return this.t('debts.detail.kind.received');
        return this.t('debts.detail.kind.' + p.kind);
    }

    rowIcon(p: DebtPaymentRow): string {
        switch (p.kind) {
            case 'opening': return 'pi-flag text-surface-500';
            case 'adjustment': return 'pi-pencil text-ochre-600 dark:text-ochre-400';
            case 'write_off': return 'pi-ban text-surface-500';
            default: return 'pi-check text-positive';
        }
    }

    rowBg(p: DebtPaymentRow): string {
        switch (p.kind) {
            case 'payment': return 'bg-positive-50 dark:bg-positive-500/15';
            case 'adjustment': return 'bg-ochre-100 dark:bg-ochre-900/20';
            default: return 'bg-surface-100 dark:bg-surface-800';
        }
    }

    freqLabel(f: string): string {
        return this.t(f === 'monthly' ? 'debts.freqMonthly' : f === 'weekly' ? 'debts.freqWeekly' : f === 'once' ? 'debts.freqOnce' : 'debts.freqFree');
    }

    timeLabel(d: DebtRecord): string {
        if (d.isPaidOff) {
            const on = d.paidOffDate ? this.fmtDate(d.paidOffDate) : '';
            if (d.closedReason === 'cancelled') return on ? this.t('debts.cancelledOn', { date: on }) : this.t('debts.settled');
            if (d.closedReason === 'written_off') return on ? this.t('debts.writtenOffOn', { date: on }) : this.t('debts.settled');
            return on ? this.t('debts.settledOn', { date: on }) : this.t('debts.settled');
        }
        if (d.isOverdue) return this.t('debts.overdueDays', { n: d.daysOverdue });
        if (!d.nextPaymentDate) return this.t('debts.noDueDate');
        const nd = parseLocalDate(d.nextPaymentDate);
        if (nd && toLocalDateStr(nd) === toLocalDateStr(new Date())) return this.t('debts.dueToday');
        return this.t('debts.dueOn', { date: this.fmtDate(d.nextPaymentDate) });
    }

    timeTone(d: DebtRecord): ChipTone {
        if (d.isPaidOff) return d.closedReason === 'paid' || !d.closedReason ? 'positive' : 'neutral';
        if (d.isOverdue) return 'negative';
        const nd = parseLocalDate(d.nextPaymentDate);
        const days = nd ? Math.round((nd.getTime() - Date.now()) / 86_400_000) : 99;
        return days <= 7 ? 'ochre' : 'neutral';
    }

    fmtDate(iso: string | null | undefined, withYear = false): string {
        const d = parseLocalDate(iso);
        if (!d) return '';
        return d.toLocaleDateString(this.i18n.lang() === 'en' ? 'en-US' : 'fr-FR',
            withYear ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' });
    }

    /** Native amount with the privacy mask (app-amount only takes EUR base). */
    money(v: number | null | undefined, code: string): string {
        const value = v ?? 0;
        if (this.privacy.hidden()) return `••••• ${code}`;
        const locale = this.i18n.lang() === 'en' ? 'en-US' : 'fr-FR';
        const dec = this.cs.decimalsFor(value, code);
        return `${nbspSafe(value.toLocaleString(locale, { maximumFractionDigits: dec, minimumFractionDigits: dec }))} ${code}`;
    }
}
