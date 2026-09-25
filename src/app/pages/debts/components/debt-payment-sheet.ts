import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DebtsService, DebtRecord } from '../../service/debts.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { PrivacyService } from '../../../core/services/privacy.service';
import { I18nService } from '../../../i18n/i18n.service';
import { FeedbackService } from '../../../core/ui/feedback.service';
import { isTouchDevice } from '../../../core/util/touch';
import { toLocalDateStr } from '../../../core/util/date';
import { nbspSafe } from '../../../core/util/nbsp';

/**
 * The ONE payment sheet (list card + detail page). Amounts are typed in the
 * DEBT's own currency and posted unconverted; the instalment prefills when
 * one exists; an overpayment is answered by the server's 409 and turned into
 * a "record the remaining and settle?" confirm.
 */
@Component({
    selector: 'app-debt-payment-sheet',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, InputNumberModule, DatePickerModule, InputTextModule, ButtonModule],
    template: `
        <p-dialog [transitionOptions]="'320ms cubic-bezier(0.34, 1.30, 0.64, 1)'" [visible]="visible" (visibleChange)="setVisible($event)"
                  [style]="{ width: '95vw', maxWidth: '420px' }" [modal]="true" [draggable]="false" [resizable]="false"
                  styleClass="!rounded-2xl overflow-hidden">
            <ng-template #header>
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center"
                         [ngClass]="isReceivable ? 'bg-positive-50 dark:bg-positive-500/15' : 'bg-brand-100 dark:bg-brand-700/20'">
                        <i class="pi text-lg" [ngClass]="isReceivable ? 'pi-arrow-down-left text-positive-600 dark:text-positive-400' : 'pi-arrow-up-right text-brand-700 dark:text-ochre-400'"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-surface-900 dark:text-surface-0 m-0">{{ t(isReceivable ? 'debts.pay.titleReceivable' : 'debts.pay.title') }}</h3>
                        <p class="text-surface-500 dark:text-surface-400 text-sm m-0">{{ record?.name }}</p>
                    </div>
                </div>
            </ng-template>
            <ng-template #content>
                @if (record; as r) {
                    <div class="flex flex-col gap-5 pt-3 omaad-form">
                        <div class="grid grid-cols-3 gap-2 text-center">
                            <div class="bg-surface-50 dark:bg-surface-800 rounded-xl p-3">
                                <div class="text-[10px] text-surface-400 mb-1">{{ t('debts.total') }}</div>
                                <div class="text-sm font-bold text-surface-900 dark:text-surface-0 tabular-nums">{{ money(r.nativeTotal, r.currency) }}</div>
                            </div>
                            <div class="bg-surface-50 dark:bg-surface-800 rounded-xl p-3">
                                <div class="text-[10px] text-surface-400 mb-1">{{ t(isReceivable ? 'debts.receivedShort' : 'debts.paidShort') }}</div>
                                <div class="text-sm font-bold text-positive tabular-nums">{{ money(r.nativePaid, r.currency) }}</div>
                            </div>
                            <div class="bg-surface-50 dark:bg-surface-800 rounded-xl p-3">
                                <div class="text-[10px] text-surface-400 mb-1">{{ t('debts.remaining') }}</div>
                                <div class="text-sm font-bold tabular-nums" [ngClass]="isReceivable ? 'text-positive' : 'text-negative'">{{ money(r.nativeRemaining, r.currency) }}</div>
                            </div>
                        </div>

                        <div class="flex flex-col gap-1">
                            <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('debts.pay.amount') }} <span class="text-surface-400 font-normal">({{ r.currency }})</span></label>
                            <p-inputnumber [locale]="cs.inputLocale()" [(ngModel)]="amount" mode="decimal" [min]="0"
                                           [minFractionDigits]="0" [maxFractionDigits]="cs.minorUnitsFor(r.currency)"
                                           styleClass="w-full" inputStyleClass="w-full !text-lg !font-semibold" />
                            <div class="flex gap-2 mt-1.5">
                                @if (r.monthlyPayment && r.monthlyPayment > 0 && r.monthlyPayment < r.nativeRemaining) {
                                    <button type="button" class="omaad-press px-3 py-1.5 rounded-full text-xs font-semibold bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200"
                                            (click)="amount = r.monthlyPayment!">{{ t('debts.pay.installment') }} · {{ money(r.monthlyPayment, r.currency) }}</button>
                                }
                                <button type="button" class="omaad-press px-3 py-1.5 rounded-full text-xs font-semibold bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200"
                                        (click)="amount = r.nativeRemaining">{{ t('debts.pay.all') }}</button>
                            </div>
                            @if (submitted && !(amount! > 0)) {
                                <small class="text-negative text-xs mt-1">{{ t('debts.amountRequired') }}</small>
                            }
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('debts.pay.date') }}</label>
                            <p-datepicker [touchUI]="isTouch" [readonlyInput]="isTouch" [(ngModel)]="date" [showIcon]="true"
                                          [maxDate]="today" dateFormat="dd/mm/yy" styleClass="w-full" inputStyleClass="w-full" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('debts.pay.note') }}</label>
                            <input pInputText [(ngModel)]="note" class="w-full" maxlength="500" />
                        </div>
                    </div>
                }
            </ng-template>
            <ng-template #footer>
                <div class="flex flex-col gap-2 pt-2 w-full">
                    <p-button [label]="t('debts.payConfirm')" icon="pi pi-check" [loading]="saving()"
                              (click)="confirm()" styleClass="w-full omaad-cta !rounded-full !py-3" />
                    <p-button [label]="t('debts.cancel')" icon="pi pi-times" [disabled]="saving()"
                              (click)="setVisible(false)" styleClass="w-full omaad-secondary !rounded-full !py-3" />
                </div>
            </ng-template>
        </p-dialog>
    `
})
export class DebtPaymentSheetComponent {
    @Input() record: DebtRecord | null = null;
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() saved = new EventEmitter<DebtRecord>();

    private debts = inject(DebtsService);
    readonly cs = inject(CurrencyService);
    private privacy = inject(PrivacyService);
    private i18n = inject(I18nService);
    private feedback = inject(FeedbackService);

    readonly isTouch = isTouchDevice();
    readonly today = new Date();
    saving = signal(false);
    submitted = false;
    amount: number | null = null;
    date: Date | null = new Date();
    note = '';

    get isReceivable(): boolean { return this.record?.type === 'Receivable'; }
    t(key: string, params?: Record<string, string | number>): string { return this.i18n.t(key, params); }

    /** Called by the host right before showing: prefill the instalment (or the rest). */
    prime(record: DebtRecord) {
        this.record = record;
        const inst = record.monthlyPayment && record.monthlyPayment > 0 ? record.monthlyPayment : record.nativeRemaining;
        this.amount = Math.min(inst, record.nativeRemaining);
        this.date = new Date();
        this.note = '';
        this.submitted = false;
    }

    setVisible(v: boolean) {
        this.visible = v;
        this.visibleChange.emit(v);
    }

    async confirm() {
        this.submitted = true;
        const r = this.record;
        if (!r?.id || !(this.amount != null && this.amount > 0) || this.saving()) return;
        await this.post(r, this.amount, true);
    }

    private async post(r: DebtRecord, amount: number, strict: boolean) {
        this.saving.set(true);
        try {
            const updated = await this.debts.addPayment(r.id!, amount, {
                date: toLocalDateStr(this.date ?? new Date()), note: this.note.trim() || null, strict,
            });
            this.feedback.success(this.t(this.isReceivable ? 'debts.pay.savedReceivable' : 'debts.pay.saved'));
            this.saved.emit(updated);
            this.setVisible(false);
        } catch (err: any) {
            const over = this.debts.overpaymentOf(err);
            if (over) {
                this.saving.set(false);
                const rem = this.money(over.remaining, over.currency);
                const ok = await this.feedback.confirm({
                    title: this.t('debts.pay.overpayTitle'),
                    message: this.t('debts.pay.overpayMsg', { remaining: rem }),
                    confirmLabel: this.t('debts.pay.overpayConfirm'),
                    cancelLabel: this.t('debts.cancel'),
                    icon: 'pi-check-circle',
                    destructive: false,
                });
                if (ok) await this.post(r, over.remaining, true);
                return;
            }
            this.feedback.error(this.t('debts.toast.paymentError'));
        } finally {
            this.saving.set(false);
        }
    }

    /** Native amount, privacy-masked here (app-amount only takes EUR base). */
    money(v: number | null | undefined, code: string): string {
        const value = v ?? 0;
        if (this.privacy.hidden()) return `••••• ${code}`;
        const locale = this.i18n.lang() === 'en' ? 'en-US' : 'fr-FR';
        const d = this.cs.decimalsFor(value, code);
        return `${nbspSafe(value.toLocaleString(locale, { maximumFractionDigits: d, minimumFractionDigits: d }))} ${code}`;
    }
}
