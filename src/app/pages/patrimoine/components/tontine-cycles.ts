import { Component, EventEmitter, Input, OnInit, Output, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { firstValueFrom } from 'rxjs';
import { ApiService, TontineSchedule, TontineCycleView } from '../../../core/services/api.service';
import { I18nService } from '../../../i18n/i18n.service';
import { PrivacyService } from '../../../core/services/privacy.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { ShareContextService } from '../../../core/services/share-context.service';
import { FeedbackService } from '../../../core/ui/feedback.service';
import { ChipComponent, ChipTone } from '../../../core/ui/chip.component';
import { LoadErrorComponent } from '../../../core/components/load-error.component';
import { nbspSafe } from '../../../core/util/nbsp';
import { isTouchDevice } from '../../../core/util/touch';
import { parseLocalDate, toLocalDateStr } from '../../../core/util/date';

/**
 * Tontine position + turn log (P0 premium tontine).
 *
 * The backend derives everything (states, position, status) from the cycle
 * log and the payout fact; this component only shows it and offers the two
 * writes: "Marquer payé" (date, amount, note) and "J'ai reçu la mise".
 * Amounts are the tontine's NATIVE currency (never converted), so money is
 * formatted here and carries the privacy mask itself (P0-3).
 */
@Component({
    selector: 'app-tontine-cycles',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, InputNumberModule, DatePickerModule,
              InputTextModule, ButtonModule, ChipComponent, LoadErrorComponent],
    template: `
        <div class="bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800">
            <div class="px-5 py-4 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between gap-3">
                <h3 class="text-base font-bold text-surface-900 dark:text-surface-0 m-0">{{ i18n.t('tontine.positionTitle') }}</h3>
                @if (schedule(); as s) {
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-semibold text-surface-500 dark:text-surface-400 tabular-nums">
                            {{ s.contributions_made }}/{{ s.contributions_total }} {{ i18n.t('tontine.contributions') }}
                        </span>
                        <app-chip [label]="i18n.t('tontine.status.' + s.status)" [tone]="statusTone(s.status)" />
                    </div>
                }
            </div>

            @if (loading()) {
                <div class="px-5 py-6 space-y-3 animate-pulse">
                    <div class="h-8 w-40 bg-surface-100 dark:bg-surface-800 rounded"></div>
                    <div class="h-4 w-64 bg-surface-100 dark:bg-surface-800 rounded"></div>
                    <div class="h-1.5 w-full bg-surface-100 dark:bg-surface-800 rounded-full"></div>
                </div>
            } @else if (error()) {
                <div class="px-5 py-4"><app-load-error (retry)="load()" /></div>
            } @else if (schedule()) {
              @if (schedule(); as s) {
                @if (s.participants === 0) {
                    <div class="px-5 py-6 text-center text-sm text-surface-500 dark:text-surface-400">
                        {{ i18n.t('tontine.incomplete') }}
                    </div>
                } @else {
                    <!-- ── Position ── -->
                    <div class="px-5 pt-5 pb-4">
                        <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-1">{{ i18n.t('tontine.contributed') }}</p>
                        <div class="flex items-baseline gap-2 flex-wrap">
                            <span class="text-2xl font-bold text-surface-900 dark:text-surface-0 tabular-nums">{{ money(s.total_contributed) }}</span>
                            <span class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('tontine.contributedOf', { pot: money(s.pot_size) }) }}</span>
                        </div>
                        <div class="mt-3 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                            <div class="h-full bg-brand-700 dark:bg-brand-300 rounded-full transition-all duration-500"
                                 [style.width]="progressPct() + '%'"></div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                            <!-- Next contribution -->
                            <div class="rounded-xl px-3.5 py-3"
                                 [ngClass]="s.late_count > 0 ? 'bg-negative-50 dark:bg-negative-500/10' : 'bg-surface-50 dark:bg-surface-800/60'">
                                <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ i18n.t('tontine.nextDue') }}</p>
                                @if (s.is_complete) {
                                    <p class="text-sm font-semibold text-positive">{{ i18n.t('tontine.complete') }}</p>
                                } @else if (s.late_count > 0 && s.next_due_date) {
                                    <p class="text-sm font-semibold text-negative">{{ i18n.t('tontine.lateSince', { date: fmtDate(s.next_due_date) }) }}</p>
                                    <p class="text-xs text-negative/80">{{ s.late_count > 1 ? i18n.t('tontine.lateOther', { n: s.late_count }) : i18n.t('tontine.lateOne') }}</p>
                                } @else if (s.next_due_date) {
                                    <p class="text-sm font-semibold text-surface-900 dark:text-surface-0">{{ fmtDate(s.next_due_date) }}</p>
                                    <p class="text-xs text-surface-500 dark:text-surface-400">{{ money(s.contribution) }}</p>
                                } @else {
                                    <p class="text-sm font-semibold text-surface-400">—</p>
                                }
                            </div>
                            <!-- Your payout -->
                            <div class="rounded-xl px-3.5 py-3 bg-surface-50 dark:bg-surface-800/60">
                                <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ i18n.t('tontine.yourPayout') }}</p>
                                @if (s.payout_received_date) {
                                    <p class="text-sm font-semibold text-positive">{{ i18n.t('tontine.receivedOn', { date: fmtDate(s.payout_received_date) }) }}</p>
                                    <p class="text-xs text-surface-500 dark:text-surface-400">{{ money(s.received_amount) }}</p>
                                } @else if (s.payout_date) {
                                    <p class="text-sm font-semibold text-surface-900 dark:text-surface-0">{{ fmtDate(s.payout_date) }}</p>
                                    <p class="text-xs text-surface-500 dark:text-surface-400">{{ money(s.pot_size) }}</p>
                                } @else {
                                    <p class="text-sm font-semibold text-surface-400">—</p>
                                    <p class="text-xs text-surface-500 dark:text-surface-400">{{ i18n.t('tontine.noPayoutDate') }}</p>
                                }
                            </div>
                            <!-- Remaining due -->
                            <div class="rounded-xl px-3.5 py-3 bg-surface-50 dark:bg-surface-800/60">
                                <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ i18n.t('tontine.remainingDue') }}</p>
                                <p class="text-sm font-semibold text-surface-900 dark:text-surface-0">{{ money(s.remaining_due) }}</p>
                                <p class="text-xs text-surface-500 dark:text-surface-400">{{ unpaidCount() }} {{ i18n.t('tontine.turnsLeft') }}</p>
                            </div>
                        </div>

                        @if (s.orphan_cycles > 0) {
                            <p class="mt-3 text-xs text-ochre-700 dark:text-ochre-400 flex items-center gap-1.5">
                                <i class="pi pi-info-circle text-[11px]"></i>{{ i18n.t('tontine.orphan', { n: s.orphan_cycles }) }}
                            </p>
                        }

                        <!-- ── Actions ── -->
                        @if (!share.active() && !s.is_complete) {
                            <div class="flex flex-col sm:flex-row gap-2 mt-4">
                                @if (nextUnpaid(); as c) {
                                    <button pButton type="button" class="omaad-cta !rounded-full !py-2.5 !text-sm flex-1"
                                            icon="pi pi-check" [label]="i18n.t('tontine.markTurn', { n: c.cycle_number })"
                                            (click)="openPay(c)"></button>
                                }
                                @if (!s.payout_received_date && s.payout_date && payoutDue()) {
                                    <button pButton type="button" class="omaad-secondary !rounded-full !py-2.5 !text-sm flex-1"
                                            icon="pi pi-gift" [label]="i18n.t('tontine.receivePot')"
                                            (click)="openPayout()"></button>
                                }
                            </div>
                        }
                        @if (!share.active() && s.payout_received_date) {
                            <button type="button" class="mt-3 text-xs text-surface-500 dark:text-surface-400 hover:text-negative underline-offset-2 hover:underline"
                                    (click)="clearPayout()">{{ i18n.t('tontine.clearPayout') }}</button>
                        }
                    </div>

                    <!-- ── Timeline ── -->
                    <div class="px-5 pb-4 border-t border-surface-100 dark:border-surface-800">
                        <div class="flex items-center justify-between pt-4 pb-1">
                            <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400">{{ i18n.t('tontine.scheduleTitle') }}</p>
                            @if (paidCycles().length > 0) {
                                <button type="button" class="text-xs font-semibold text-brand-700 dark:text-brand-300 flex items-center gap-1"
                                        (click)="showPaid.set(!showPaid())">
                                    {{ i18n.t('tontine.paidTurns', { n: paidCycles().length }) }}
                                    <i class="pi text-[10px]" [ngClass]="showPaid() ? 'pi-chevron-up' : 'pi-chevron-down'"></i>
                                </button>
                            }
                        </div>

                        @for (c of visibleCycles(); track c.cycle_number) {
                            <div class="flex items-center gap-3 py-2.5 border-b border-surface-100 dark:border-surface-800 last:border-b-0"
                                 [class.opacity-70]="c.paid">
                                <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                                     [ngClass]="c.is_payout ? 'bg-ochre-500 text-warm-900' : 'bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400'">
                                    @if (c.is_payout) { <i class="pi pi-gift text-sm"></i> } @else { {{ c.cycle_number }} }
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-semibold text-surface-900 dark:text-surface-0 truncate flex items-center gap-2">
                                        {{ fmtDate(c.due_date) }}
                                        @if (c.is_payout) { <span class="text-[10px] font-bold text-ochre-600 dark:text-ochre-400 uppercase">{{ i18n.t('tontine.payout') }}</span> }
                                    </p>
                                    <p class="text-xs text-surface-500 dark:text-surface-400 flex items-center gap-1.5 flex-wrap">
                                        @if (c.paid) {
                                            @if (c.paid_amount !== null && c.paid_amount !== c.amount) {
                                                <span>{{ i18n.t('tontine.partialOf', { paid: money(c.paid_amount), expected: money(c.amount) }) }}</span>
                                            } @else {
                                                <span>{{ money(c.amount) }}</span>
                                            }
                                            @if (c.paid_date) { <span class="text-surface-400">· {{ fmtDate(c.paid_date) }}</span> }
                                            @if (c.late_paid) { <span class="text-ochre-600 dark:text-ochre-400">· {{ i18n.t('tontine.paidLate') }}</span> }
                                        } @else {
                                            <span>{{ money(c.amount) }}</span>
                                        }
                                    </p>
                                </div>
                                <app-chip [label]="i18n.t('tontine.state.' + c.state)" [tone]="stateTone(c.state)" />
                                @if (!share.active()) {
                                    <button type="button"
                                            class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
                                            [ngClass]="c.paid ? 'bg-positive text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-400 hover:text-brand-700 dark:hover:text-brand-300'"
                                            [disabled]="saving() === c.cycle_number"
                                            [attr.aria-label]="c.paid ? i18n.t('tontine.markUnpaid') : i18n.t('tontine.markPaid')"
                                            (click)="c.paid ? unmark(c) : openPay(c)">
                                        @if (saving() === c.cycle_number) { <i class="pi pi-spin pi-spinner text-sm"></i> }
                                        @else if (c.paid) { <i class="pi pi-check text-sm"></i> }
                                        @else { <i class="pi pi-circle text-sm"></i> }
                                    </button>
                                }
                            </div>
                        }
                    </div>
                }
              }
            }
        </div>

        <!-- ── Sheet: mark a turn paid ── -->
        <p-dialog [transitionOptions]="'320ms cubic-bezier(0.34, 1.30, 0.64, 1)'" [(visible)]="payOpen"
                  [style]="{ width: '95vw', maxWidth: '420px' }" [modal]="true" [draggable]="false" [resizable]="false"
                  styleClass="!rounded-2xl overflow-hidden" (onHide)="payTarget.set(null)">
            <ng-template #header>
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center">
                        <i class="pi pi-check text-brand-700 dark:text-ochre-400 text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-surface-900 dark:text-surface-0 m-0">{{ i18n.t('tontine.sheetTitle', { n: payTarget()?.cycle_number ?? 0 }) }}</h3>
                        <p class="text-surface-500 dark:text-surface-400 text-sm m-0">{{ schedule()?.name }}</p>
                    </div>
                </div>
            </ng-template>
            <ng-template #content>
                <div class="flex flex-col gap-5 pt-3 omaad-form">
                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('tontine.paidDate') }}</label>
                        <p-datepicker appendTo="body" [touchUI]="isTouch" [readonlyInput]="isTouch" [(ngModel)]="payDate" [showIcon]="true"
                                      [maxDate]="today" dateFormat="dd/mm/yy" styleClass="w-full" inputStyleClass="w-full" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('tontine.paidAmount') }} <span class="text-surface-400 font-normal">({{ currency }})</span></label>
                        <p-inputnumber [locale]="cs.inputLocale()" [(ngModel)]="payAmount" mode="decimal" [min]="0"
                                       [minFractionDigits]="0" [maxFractionDigits]="decimals()" styleClass="w-full"
                                       inputStyleClass="w-full !text-lg !font-semibold" />
                        @if (payTarget(); as c) {
                            @if (payAmount !== null && payAmount > 0 && payAmount < c.amount) {
                                <small class="text-ochre-700 dark:text-ochre-400 text-xs mt-1">{{ i18n.t('tontine.partialHint', { rest: money(c.amount - payAmount) }) }}</small>
                            }
                        }
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('tontine.note') }}</label>
                        <input pInputText [(ngModel)]="payNote" class="w-full" maxlength="500" />
                    </div>
                </div>
            </ng-template>
            <ng-template #footer>
                <div class="flex flex-col gap-2 pt-2 w-full">
                    <p-button [label]="i18n.t('tontine.save')" icon="pi pi-check" [loading]="sheetSaving()"
                              (click)="confirmPay()" styleClass="w-full omaad-cta !rounded-full !py-3" />
                    <p-button [label]="i18n.t('tontine.cancel')" icon="pi pi-times" [disabled]="sheetSaving()"
                              (click)="payOpen = false" styleClass="w-full omaad-secondary !rounded-full !py-3" />
                </div>
            </ng-template>
        </p-dialog>

        <!-- ── Sheet: pot received ── -->
        <p-dialog [transitionOptions]="'320ms cubic-bezier(0.34, 1.30, 0.64, 1)'" [(visible)]="payoutOpen"
                  [style]="{ width: '95vw', maxWidth: '420px' }" [modal]="true" [draggable]="false" [resizable]="false"
                  styleClass="!rounded-2xl overflow-hidden">
            <ng-template #header>
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-ochre-100 dark:bg-ochre-900/20 flex items-center justify-center">
                        <i class="pi pi-gift text-ochre-700 dark:text-ochre-400 text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-surface-900 dark:text-surface-0 m-0">{{ i18n.t('tontine.receiveTitle') }}</h3>
                        <p class="text-surface-500 dark:text-surface-400 text-sm m-0">{{ schedule()?.name }}</p>
                    </div>
                </div>
            </ng-template>
            <ng-template #content>
                <div class="flex flex-col gap-5 pt-3 omaad-form">
                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('tontine.receiveDate') }}</label>
                        <p-datepicker appendTo="body" [touchUI]="isTouch" [readonlyInput]="isTouch" [(ngModel)]="payoutDate" [showIcon]="true"
                                      [maxDate]="today" dateFormat="dd/mm/yy" styleClass="w-full" inputStyleClass="w-full" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('tontine.receiveAmount') }} <span class="text-surface-400 font-normal">({{ currency }})</span></label>
                        <p-inputnumber [locale]="cs.inputLocale()" [(ngModel)]="payoutAmount" mode="decimal" [min]="0"
                                       [minFractionDigits]="0" [maxFractionDigits]="decimals()" styleClass="w-full"
                                       inputStyleClass="w-full !text-lg !font-semibold" />
                        <small class="text-surface-500 dark:text-surface-400 text-xs mt-1">{{ i18n.t('tontine.receiveHint') }}</small>
                    </div>
                </div>
            </ng-template>
            <ng-template #footer>
                <div class="flex flex-col gap-2 pt-2 w-full">
                    <p-button [label]="i18n.t('tontine.save')" icon="pi pi-check" [loading]="sheetSaving()"
                              (click)="confirmPayout()" styleClass="w-full omaad-cta !rounded-full !py-3" />
                    <p-button [label]="i18n.t('tontine.cancel')" icon="pi pi-times" [disabled]="sheetSaving()"
                              (click)="payoutOpen = false" styleClass="w-full omaad-secondary !rounded-full !py-3" />
                </div>
            </ng-template>
        </p-dialog>
    `
})
export class TontineCyclesComponent implements OnInit {
    @Input({ required: true }) assetId!: number;
    @Input() currency = 'EUR';
    /** The parent (asset detail) mirrors the derived status in its KPI tiles. */
    @Output() scheduleChange = new EventEmitter<TontineSchedule>();

    private api = inject(ApiService);
    readonly i18n = inject(I18nService);
    private privacy = inject(PrivacyService);
    readonly cs = inject(CurrencyService);
    readonly share = inject(ShareContextService);
    private feedback = inject(FeedbackService);

    readonly isTouch = isTouchDevice();
    readonly today = new Date();

    loading = signal(true);
    error = signal(false);
    saving = signal<number | null>(null);
    sheetSaving = signal(false);
    schedule = signal<TontineSchedule | null>(null);
    showPaid = signal(false);

    // Pay sheet
    payOpen = false;
    payTarget = signal<TontineCycleView | null>(null);
    payDate: Date | null = null;
    payAmount: number | null = null;
    payNote = '';
    // Payout sheet
    payoutOpen = false;
    payoutDate: Date | null = null;
    payoutAmount: number | null = null;

    progressPct = computed(() => {
        const s = this.schedule();
        if (!s || s.contributions_total === 0) return 0;
        return Math.round((s.contributions_made / s.contributions_total) * 100);
    });
    paidCycles = computed(() => this.schedule()?.cycles.filter(c => c.paid) ?? []);
    unpaidCycles = computed(() => this.schedule()?.cycles.filter(c => !c.paid) ?? []);
    unpaidCount = computed(() => this.unpaidCycles().length);
    /** Paid turns fold away by default; the list opens on the next unpaid turn. */
    visibleCycles = computed(() => this.showPaid() ? (this.schedule()?.cycles ?? []) : this.unpaidCycles());
    nextUnpaid = computed<TontineCycleView | null>(() => {
        const s = this.schedule();
        if (!s) return null;
        return s.cycles.find(c => c.cycle_number === s.next_due_cycle) ?? this.unpaidCycles()[0] ?? null;
    });
    /** Offer "J'ai reçu la mise" once the payout date is here (or past). */
    payoutDue = computed(() => {
        const d = parseLocalDate(this.schedule()?.payout_date);
        return !!d && d.getTime() <= this.today.getTime();
    });

    ngOnInit() { this.load(); }

    async load() {
        this.loading.set(true);
        this.error.set(false);
        try {
            const s = await firstValueFrom(this.api.getTontineSchedule(this.assetId));
            this.apply(s);
        } catch {
            this.error.set(true);
        } finally {
            this.loading.set(false);
        }
    }

    private apply(s: TontineSchedule | null) {
        this.schedule.set(s);
        if (s) this.scheduleChange.emit(s);
    }

    // ── writes ──────────────────────────────────────────────────────────

    openPay(c: TontineCycleView) {
        this.payTarget.set(c);
        this.payDate = new Date();
        this.payAmount = c.amount;
        this.payNote = c.notes ?? '';
        this.payOpen = true;
    }

    async confirmPay() {
        const c = this.payTarget();
        if (!c || this.sheetSaving()) return;
        if (!(this.payAmount != null && this.payAmount > 0)) {
            this.feedback.error(this.i18n.t('tontine.amountRequired'));
            return;
        }
        this.sheetSaving.set(true);
        this.saving.set(c.cycle_number);
        try {
            const s = await firstValueFrom(this.api.setTontineCycle(this.assetId, c.cycle_number, {
                paid: true,
                paid_date: toLocalDateStr(this.payDate ?? new Date()),
                paid_amount: this.payAmount === c.amount ? null : this.payAmount,
                notes: this.payNote.trim() || null,
            }));
            this.apply(s);
            this.payOpen = false;
            this.feedback.success(this.i18n.t('tontine.saved'));
        } catch {
            this.feedback.error(this.i18n.t('tontine.saveError'));
        } finally {
            this.sheetSaving.set(false);
            this.saving.set(null);
        }
    }

    async unmark(c: TontineCycleView) {
        if (this.saving() != null) return;
        const ok = await this.feedback.confirm({
            title: this.i18n.t('tontine.unmarkTitle'),
            message: this.i18n.t('tontine.unmarkMsg', { n: c.cycle_number }),
            confirmLabel: this.i18n.t('tontine.unmarkConfirm'),
            cancelLabel: this.i18n.t('tontine.cancel'),
            icon: 'pi-undo',
        });
        if (!ok) return;
        this.saving.set(c.cycle_number);
        try {
            this.apply(await firstValueFrom(this.api.setTontineCycle(this.assetId, c.cycle_number, { paid: false })));
            this.feedback.success(this.i18n.t('tontine.unmarked'));
        } catch {
            // Keep the list on screen; a failed write is a toast, not a blank card.
            this.feedback.error(this.i18n.t('tontine.saveError'));
        } finally {
            this.saving.set(null);
        }
    }

    openPayout() {
        const s = this.schedule();
        this.payoutDate = parseLocalDate(s?.payout_date) ?? new Date();
        if (this.payoutDate.getTime() > this.today.getTime()) this.payoutDate = new Date();
        this.payoutAmount = s?.pot_size ?? null;
        this.payoutOpen = true;
    }

    async confirmPayout() {
        if (this.sheetSaving()) return;
        if (!(this.payoutAmount != null && this.payoutAmount > 0)) {
            this.feedback.error(this.i18n.t('tontine.amountRequired'));
            return;
        }
        this.sheetSaving.set(true);
        try {
            this.apply(await firstValueFrom(this.api.setTontinePayout(this.assetId, {
                received_date: toLocalDateStr(this.payoutDate ?? new Date()),
                amount: this.payoutAmount,
            })));
            this.payoutOpen = false;
            this.feedback.success(this.i18n.t('tontine.payoutSaved'));
        } catch {
            this.feedback.error(this.i18n.t('tontine.saveError'));
        } finally {
            this.sheetSaving.set(false);
        }
    }

    async clearPayout() {
        const ok = await this.feedback.confirm({
            title: this.i18n.t('tontine.clearPayout'),
            message: this.i18n.t('tontine.clearPayoutMsg'),
            confirmLabel: this.i18n.t('tontine.clearPayout'),
            cancelLabel: this.i18n.t('tontine.cancel'),
            icon: 'pi-undo',
        });
        if (!ok) return;
        try {
            this.apply(await firstValueFrom(this.api.clearTontinePayout(this.assetId)));
            this.feedback.success(this.i18n.t('tontine.payoutCleared'));
        } catch {
            this.feedback.error(this.i18n.t('tontine.saveError'));
        }
    }

    // ── presentation ────────────────────────────────────────────────────

    statusTone(status: string): ChipTone {
        switch (status) {
            case 'en_retard': return 'negative';
            case 'mise_recue': return 'positive';
            case 'termine': return 'neutral';
            default: return 'brand';
        }
    }

    stateTone(state: string): ChipTone {
        switch (state) {
            case 'paid': return 'positive';
            case 'late': return 'negative';
            case 'due': return 'ochre';
            default: return 'neutral';
        }
    }

    decimals(): number { return this.cs.minorUnitsFor(this.currency); }

    /** Native-currency amount with the privacy mask carried here (P0-3). */
    money(v: number | null | undefined): string {
        const value = v ?? 0;
        if (this.privacy.hidden()) return `••••• ${this.currency}`;
        const locale = this.i18n.lang() === 'en' ? 'en-US' : 'fr-FR';
        const d = this.cs.decimalsFor(value, this.currency);
        return `${nbspSafe(value.toLocaleString(locale, { maximumFractionDigits: d, minimumFractionDigits: d }))} ${this.currency}`;
    }

    fmtDate(iso: string | null | undefined): string {
        const d = parseLocalDate(iso);
        if (!d) return '—';
        const locale = this.i18n.lang() === 'en' ? 'en-US' : 'fr-FR';
        return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    }
}
