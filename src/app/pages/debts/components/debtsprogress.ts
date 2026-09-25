import { Component, OnInit, signal, computed, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DebtsService, DebtRecord } from '../../service/debts.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { toLocalDateStr, parseLocalDate } from '../../../core/util/date';
import { CurrencyService } from '../../../core/services/currency.service';
import { I18nService } from '../../../i18n/i18n.service';
import { LoadErrorComponent } from '../../../core/components/load-error.component';
import { ShareContextService } from '../../../core/services/share-context.service';
import { NavService } from '../../../core/services/nav.service';
import { isTouchDevice } from '../../../core/util/touch';
import { FeedbackService } from '../../../core/ui/feedback.service';
import { ChipComponent, ChipTone } from '../../../core/ui/chip.component';
import { DebtPaymentSheetComponent } from './debt-payment-sheet';
import { DebtCategory, DebtPaymentFrequency } from '../../../core/services/api.service';

type Filter = 'all' | 'Debt' | 'Receivable' | 'settled';

const CATEGORIES: DebtCategory[] = ['family_friend', 'personal_loan', 'mortgage', 'car_loan', 'student_loan', 'credit_card', 'business', 'other'];
const FREQUENCIES: DebtPaymentFrequency[] = ['monthly', 'weekly', 'once', 'free'];

@Component({
    standalone: true,
    selector: 'app-debts-progress',
    imports: [
        CommonModule, FormsModule, RouterModule, ButtonModule, InputTextModule, SelectModule, InputNumberModule,
        DialogModule, DatePickerModule, AppAmountComponent, LoadErrorComponent, ChipComponent, DebtPaymentSheetComponent],
    template: `
        <!-- ── Top bar ── -->
        <div class="flex flex-col gap-2 mb-5">
            <div class="flex items-center gap-2">
                <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0 m-0 flex-1">{{ t('debts.title') }}</h2>
                <button *ngIf="!share.active()" pButton icon="pi pi-plus" [label]="t('debts.add')"
                        class="omaad-cta !rounded-xl !px-4 !py-2 !text-sm !font-semibold"
                        (click)="openNew()"></button>
            </div>
            <div class="flex items-center gap-2">
                <div class="relative flex-1 min-w-0">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm pointer-events-none"></i>
                    <input pInputText [ngModel]="search()" (ngModelChange)="search.set($event)" [placeholder]="t('debts.searchPlaceholder')"
                           class="w-full !pl-9 !py-2.5 !rounded-xl !text-sm" />
                </div>
                <div class="flex items-center gap-0.5 bg-surface-100 dark:bg-surface-800 rounded-xl p-1 shrink-0 overflow-x-auto">
                    @for (f of typeFilters; track f.value) {
                        <button (click)="typeFilter.set(f.value)"
                                class="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap"
                                [class]="typeFilter() === f.value
                                    ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-0 shadow-sm'
                                    : 'text-surface-500 dark:text-surface-400'">
                            {{ f.label }}
                        </button>
                    }
                </div>
            </div>
        </div>

        <!-- ── Loading ── -->
        @if (loading()) {
            <div class="space-y-3">
                @for (i of [1,2,3]; track i) {
                    <div class="h-[110px] bg-surface-100 dark:bg-surface-800 rounded-2xl animate-pulse"></div>
                }
            </div>
        }

        <!-- ── Load failure, never render as "no debts" ── -->
        @else if (loadError()) {
            <app-load-error (retry)="loadFromService()" />
        }

        <!-- ── Empty ── -->
        @else if (filteredRecords().length === 0) {
            <div class="flex flex-col items-center justify-center py-16 text-center">
                <div class="w-14 h-14 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-3">
                    <i class="pi pi-credit-card text-xl text-surface-400"></i>
                </div>
                <p class="text-surface-500 dark:text-surface-400 text-sm mb-4 px-4">
                    {{ typeFilter() === 'settled' ? t('debts.emptySettled') : (search() || typeFilter() !== 'all' ? t('debts.emptyNoResult') : t('debts.noDebts')) }}
                </p>
                @if (!share.active() && !search() && typeFilter() === 'all') {
                    <button pButton icon="pi pi-plus" [label]="t('debts.addShort')"
                            [outlined]="true" class="!rounded-xl !text-sm" (click)="openNew()"></button>
                }
            </div>
        }

        <!-- ── Cards list ── -->
        @else {
            <div class="space-y-3">
                @for (rec of filteredRecords(); track rec.id) {
                    <div class="group bg-surface-0 dark:bg-surface-900 rounded-2xl border p-4 transition-all duration-200 hover:shadow-sm cursor-pointer"
                         [ngClass]="rec.isOverdue ? 'border-negative-100 dark:border-negative-500/30' : 'border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700'"
                         [routerLink]="nav.link('pages', 'debts', rec.id)" data-testid="debt-card">
                        <!-- Header row -->
                        <div class="flex items-start gap-3 mb-4">
                            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                 [ngClass]="rec.type === 'Debt' ? 'bg-negative-50 dark:bg-negative-500/15' : 'bg-positive-50 dark:bg-positive-500/15'">
                                <i class="pi text-lg"
                                   [ngClass]="rec.type === 'Debt' ? 'pi-arrow-up-right text-negative dark:text-negative-400' : 'pi-arrow-down-left text-positive-600 dark:text-positive-400'"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="font-semibold text-surface-900 dark:text-surface-0 truncate">{{ rec.name }}</span>
                                    <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                                          [ngClass]="rec.type === 'Debt'
                                              ? 'bg-negative-50 dark:bg-negative-500/15 border-negative-100 dark:border-negative-500/20 text-negative dark:text-negative-400'
                                              : 'bg-positive-50 dark:bg-positive-500/15 border-positive-100 dark:border-positive-500/20 text-positive-600 dark:text-positive-400'">
                                        {{ rec.type === 'Debt' ? t('debts.iOwe') : t('debts.owedToMe') }}
                                    </span>
                                </div>
                                <div class="flex items-center gap-2 mt-1 text-xs text-surface-500 flex-wrap">
                                    @if (rec.creditor) { <span class="truncate max-w-[12rem]">{{ rec.creditor }}</span><span class="text-surface-300 dark:text-surface-600">·</span> }
                                    <span>{{ t('debts.categories.' + rec.category) }}</span>
                                    @if (rec.interestRate > 0) {
                                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ochre-100 dark:bg-ochre-900/20 border border-ochre-200 dark:border-ochre-800 text-ochre-700 dark:text-ochre-400 font-medium">
                                            {{ rec.interestRate }}% {{ t('debts.interest') }}
                                        </span>
                                    }
                                </div>
                            </div>
                            <!-- Actions: always visible on mobile, hover on desktop -->
                            <div *ngIf="!share.active()" class="flex gap-1 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity" (click)="$event.stopPropagation()">
                                <button class="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center hover:bg-brand-50 dark:hover:bg-brand-700/30 transition-colors"
                                        (click)="editRecord(rec)" [title]="t('debts.editTitle')">
                                    <i class="pi pi-pencil text-xs text-surface-500"></i>
                                </button>
                                <button class="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center hover:bg-negative-50 dark:hover:bg-negative-700/30 transition-colors"
                                        (click)="deleteRecord(rec)" [title]="t('debts.toast.accept')">
                                    <i class="pi pi-trash text-xs text-surface-500"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Remaining amount (prominent) + time -->
                        <div class="flex items-end justify-between gap-3 mb-3">
                            <div class="min-w-0">
                                <div class="text-[11px] uppercase tracking-wide text-surface-500 mb-0.5">{{ t('debts.remaining') }}</div>
                                <div class="text-xl font-bold leading-none"
                                     [ngClass]="rec.isPaidOff ? 'text-surface-400' : (rec.type === 'Debt' ? 'text-negative' : 'text-positive')">
                                    <app-amount [value]="rec.total - rec.paid" />
                                </div>
                            </div>
                            <div class="text-right shrink-0 flex flex-col items-end gap-1.5">
                                <app-chip [label]="timeLabel(rec)" [tone]="timeTone(rec)" />
                                <div class="text-xs text-surface-500 dark:text-surface-400">
                                    <app-amount [value]="rec.paid" /> <span class="text-surface-400">/</span> <app-amount [value]="rec.total" />
                                </div>
                            </div>
                        </div>

                        <!-- Repayment progress bar + one-tap action -->
                        <div class="flex items-center gap-3">
                            <div class="flex-1 h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                                <div class="h-full rounded-full bg-positive-500 transition-all duration-500"
                                     [style.width]="getPercent(rec) + '%'"></div>
                            </div>
                            <span class="text-xs font-semibold text-positive-600 dark:text-positive-400 shrink-0 tabular-nums">
                                {{ getPercent(rec) }}%
                            </span>
                            @if (!share.active() && !rec.isPaidOff) {
                                <button type="button" class="omaad-press shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold bg-brand-700 text-white dark:bg-ochre-400 dark:text-warm-900"
                                        (click)="$event.stopPropagation(); openPayment(rec)">
                                    {{ t(rec.type === 'Debt' ? 'debts.pay.title' : 'debts.pay.titleReceivable') }}
                                </button>
                            }
                        </div>
                    </div>
                }
            </div>
        }

        <!-- ── Add / Edit dialog ── -->
        <p-dialog [transitionOptions]="'320ms cubic-bezier(0.34, 1.30, 0.64, 1)'" [(visible)]="productDialog"
                  [style]="{ width: '95vw', maxWidth: '650px' }"
                  [modal]="true" [draggable]="false" [resizable]="false"
                  styleClass="!rounded-2xl overflow-hidden">
            <ng-template #header>
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center">
                        <i class="pi pi-credit-card text-brand-700 dark:text-ochre-400 text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-surface-900 dark:text-surface-0 m-0">
                            {{ isEdit ? t('debts.editTitle') : t('debts.newTitle') }}
                        </h3>
                        <p class="text-surface-500 dark:text-surface-400 text-sm m-0">{{ t('debts.dialogSub') }}</p>
                    </div>
                </div>
            </ng-template>

            <ng-template #content>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3 omaad-form">
                    <!-- Type toggle -->
                    <div class="flex flex-col gap-1 sm:col-span-2">
                        <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('debts.typeLabel') }}</label>
                        <div class="flex gap-1.5 p-1.5 bg-surface-100 dark:bg-surface-800/80 rounded-2xl">
                            <button (click)="record.type = 'Debt'" type="button"
                                    class="omaad-press flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                                    [ngClass]="record.type === 'Debt' ? 'bg-white dark:bg-surface-700 text-negative shadow-md ring-1 ring-negative/20' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'">
                                <i class="pi pi-arrow-down text-xs"></i>{{ t('debts.types.debt') }}
                            </button>
                            <button (click)="record.type = 'Receivable'" type="button"
                                    class="omaad-press flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                                    [ngClass]="record.type === 'Receivable' ? 'bg-white dark:bg-surface-700 text-positive shadow-md ring-1 ring-positive/20' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'">
                                <i class="pi pi-arrow-up text-xs"></i>{{ t('debts.types.receivable') }}
                            </button>
                        </div>
                    </div>

                    <!-- Name -->
                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('debts.fields.name') }} <span class="text-negative">*</span></label>
                        <input pInputText [(ngModel)]="record.name" required class="w-full" [placeholder]="t('debts.namePlaceholder')" />
                        @if (submitted && !record.name) {
                            <small class="text-negative text-xs mt-1">{{ t('debts.nameRequired') }}</small>
                        }
                    </div>

                    <!-- Counterparty -->
                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('debts.fields.counterparty') }}</label>
                        <input pInputText [(ngModel)]="record.creditor" class="w-full" />
                    </div>

                    <!-- Category -->
                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('debts.fields.category') }}</label>
                        <p-select [(ngModel)]="record.category" [options]="categoryOptions" optionLabel="label" optionValue="value" styleClass="w-full" />
                    </div>

                    <!-- Total -->
                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-surface-500 dark:text-surface-400">
                            {{ t('debts.fields.total') }} <span class="text-negative">*</span>
                            <span class="text-surface-400 font-normal ml-1">({{ formCurrencyLabel() }})</span>
                        </label>
                        <p-inputnumber [locale]="cs.inputLocale()" [(ngModel)]="record.nativeTotal" mode="decimal"
                                       [minFractionDigits]="0" [maxFractionDigits]="formDecimals()" styleClass="w-full" inputStyleClass="w-full" />
                        @if (submitted && !(record.nativeTotal > 0)) {
                            <small class="text-negative text-xs mt-1">{{ t('debts.totalRequired') }}</small>
                        }
                    </div>

                    <!-- Already paid (create only: it becomes the opening ledger row) -->
                    @if (!isEdit) {
                        <div class="flex flex-col gap-1">
                            <label class="text-sm text-surface-500 dark:text-surface-400">
                                {{ record.type === 'Debt' ? t('debts.alreadyPaid') : t('debts.alreadyReceived') }}
                                <span class="text-surface-400 font-normal ml-1">({{ formCurrencyLabel() }})</span>
                            </label>
                            <p-inputnumber [locale]="cs.inputLocale()" [(ngModel)]="record.nativePaid" mode="decimal"
                                           [minFractionDigits]="0" [maxFractionDigits]="formDecimals()" styleClass="w-full" inputStyleClass="w-full" />
                        </div>
                    } @else {
                        <div class="flex flex-col gap-1 justify-end">
                            <p class="text-xs text-surface-500 dark:text-surface-400 m-0 flex items-start gap-1.5">
                                <i class="pi pi-info-circle text-[11px] mt-0.5"></i>
                                {{ record.type === 'Debt' ? t('debts.alreadyPaid') : t('debts.alreadyReceived') }}: <app-amount [value]="record.paid" />
                                <span class="text-surface-400">· {{ t('debts.detail.history') }}</span>
                            </p>
                        </div>
                    }

                    <!-- Schedule (disclosure) -->
                    <div class="sm:col-span-2">
                        <button type="button" class="text-sm font-semibold text-brand-700 dark:text-brand-300 flex items-center gap-1.5"
                                (click)="showSchedule.set(!showSchedule())">
                            <i class="pi text-xs" [ngClass]="showSchedule() ? 'pi-chevron-down' : 'pi-chevron-right'"></i>{{ t('debts.schedule') }}
                        </button>
                    </div>
                    @if (showSchedule()) {
                        <div class="flex flex-col gap-1">
                            <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('debts.fields.installment') }} <span class="text-surface-400 font-normal ml-1">({{ formCurrencyLabel() }})</span></label>
                            <p-inputnumber [locale]="cs.inputLocale()" [(ngModel)]="record.monthlyPayment" mode="decimal"
                                           [minFractionDigits]="0" [maxFractionDigits]="formDecimals()" styleClass="w-full" inputStyleClass="w-full" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('debts.fields.frequency') }}</label>
                            <p-select [(ngModel)]="record.frequency" [options]="frequencies" optionLabel="label" optionValue="value" styleClass="w-full" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('debts.fields.nextDue') }}</label>
                            <p-datepicker appendTo="body" [touchUI]="isTouch" [readonlyInput]="isTouch" [(ngModel)]="nextDueDate" [showIcon]="true" [showButtonBar]="true"
                                          dateFormat="dd/mm/yy" styleClass="w-full" inputStyleClass="w-full" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('debts.fields.startDate') }}</label>
                            <p-datepicker appendTo="body" [touchUI]="isTouch" [readonlyInput]="isTouch" [(ngModel)]="editDate" [showIcon]="true" [showButtonBar]="true"
                                          dateFormat="dd/mm/yy" styleClass="w-full" inputStyleClass="w-full" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('debts.fields.interestRate') }}</label>
                            <p-inputnumber [locale]="cs.inputLocale()" [(ngModel)]="record.interestRate" mode="decimal"
                                           [minFractionDigits]="0" [maxFractionDigits]="2" suffix=" %" styleClass="w-full" inputStyleClass="w-full" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('debts.fields.note') }}</label>
                            <input pInputText [(ngModel)]="record.note" class="w-full" maxlength="500" />
                        </div>
                    }

                    <!-- Live remaining insight (create) -->
                    @if (!isEdit && (record.nativeTotal || 0) > 0) {
                        <div class="sm:col-span-2 flex items-center justify-between px-4 py-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-100 dark:border-surface-700/60">
                            <span class="text-surface-500 dark:text-surface-400 text-sm">{{ t('debts.remaining') }}</span>
                            <span class="font-semibold tabular-nums" [ngClass]="record.type === 'Debt' ? 'text-negative' : 'text-positive'">
                                {{ formMoney((record.nativeTotal || 0) - (record.nativePaid || 0)) }}
                            </span>
                        </div>
                    }
                </div>
            </ng-template>

            <ng-template #footer>
                <div class="flex flex-col gap-2 pt-2 w-full">
                    <p-button [label]="isEdit ? t('debts.update') : t('debts.save')" icon="pi pi-check"
                              [loading]="isSaving()" (click)="saveRecord()"
                              styleClass="w-full omaad-cta !rounded-full !py-3" />
                    <p-button [label]="t('debts.cancel')" icon="pi pi-times"
                              (click)="hideDialog()" styleClass="w-full omaad-secondary !rounded-full !py-3" />
                </div>
            </ng-template>
        </p-dialog>

        <!-- ── Payment sheet (shared with the detail page) ── -->
        <app-debt-payment-sheet #paySheet [(visible)]="paymentOpen" (saved)="onPaid($event)" />
    `
})
export class DebtsProgress implements OnInit {
    /** Mobile-safe datepickers: touchUI modal + readonly input (no keyboard). */
    readonly isTouch = isTouchDevice();

    private debtsService = inject(DebtsService);
    cs = inject(CurrencyService);
    private feedback = inject(FeedbackService);
    private i18n = inject(I18nService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    share = inject(ShareContextService);
    nav = inject(NavService);

    @ViewChild('paySheet') paySheet?: DebtPaymentSheetComponent;

    t(key: string, params?: Record<string, string | number>): string { return this.i18n.t(key, params); }

    productDialog = false;
    paymentOpen = false;
    isEdit = false;
    loading = signal(true);
    isSaving = signal(false);
    submitted = false;
    showSchedule = signal(false);

    private allRecords = signal<DebtRecord[]>([]);
    loadError = signal(false);
    record!: DebtRecord;
    /** Dates bound to the pickers; the record strings are synced on save. */
    editDate: Date | null = null;
    nextDueDate: Date | null = null;

    search     = signal('');
    typeFilter = signal<Filter>('all');

    get typeFilters() {
        return [
            { label: this.t('debts.filterAll'),        value: 'all'        as Filter },
            { label: this.t('debts.filterDebt'),       value: 'Debt'       as Filter },
            { label: this.t('debts.filterReceivable'), value: 'Receivable' as Filter },
            { label: this.t('debts.filterSettled'),    value: 'settled'    as Filter },
        ];
    }

    get frequencies() {
        return FREQUENCIES.map(v => ({ value: v, label: this.t(
            v === 'monthly' ? 'debts.freqMonthly' : v === 'weekly' ? 'debts.freqWeekly' : v === 'once' ? 'debts.freqOnce' : 'debts.freqFree') }));
    }

    get categoryOptions() {
        return CATEGORIES.map(v => ({ value: v, label: this.t('debts.categories.' + v) }));
    }

    /** Open debts sorted by urgency: overdue first, then next due date, then remaining. */
    readonly filteredRecords = computed(() => {
        const filter = this.typeFilter();
        const q      = this.search().toLowerCase().trim();
        const rows = this.allRecords()
            .filter(r => filter === 'settled' ? r.isPaidOff : (!r.isPaidOff && (filter === 'all' || r.type === filter)))
            .filter(r => !q || (r.name || '').toLowerCase().includes(q) || (r.creditor || '').toLowerCase().includes(q));
        if (filter === 'settled') {
            return rows.sort((a, b) => (b.paidOffDate || '').localeCompare(a.paidOffDate || ''));
        }
        return rows.sort((a, b) => {
            if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
            if (a.isOverdue && b.isOverdue) return b.daysOverdue - a.daysOverdue;
            const ad = a.nextPaymentDate || '9999', bd = b.nextPaymentDate || '9999';
            if (ad !== bd) return ad.localeCompare(bd);
            return (b.total - b.paid) - (a.total - a.paid);
        });
    });

    ngOnInit() {
        this.loadFromService();
        // The detail page hands off edits here: /pages/debts?edit=<id>
        const editId = this.route.snapshot.queryParamMap.get('edit');
        if (editId) {
            this.debtsService.getRecords().then(rs => {
                const rec = rs.find(r => r.id === editId);
                if (rec) this.editRecord(rec);
                void this.router.navigate([], { queryParams: {}, replaceUrl: true });
            });
        }
    }

    loadFromService() {
        this.loading.set(true);
        this.debtsService.getRecords()
            .then(data => {
                this.allRecords.set(data);
                this.loadError.set(false);
            })
            .catch(error => {
                console.error('Error loading debts:', error);
                // Explicit error+retry instead of a fake-empty debts list.
                if (this.allRecords().length === 0) this.loadError.set(true);
            })
            .finally(() => this.loading.set(false));
    }

    openNew() {
        const code = this.cs.config().code;
        this.record = {
            date: toLocalDateStr(new Date()), type: 'Debt', category: 'family_friend', name: '',
            total: 0, paid: 0, currency: code, nativeTotal: 0, nativePaid: 0, nativeRemaining: 0,
            interestRate: 0, frequency: 'free', nextPaymentDate: null, isOverdue: false, daysOverdue: 0,
            note: '', creditor: '', isPaidOff: false,
        };
        this.editDate = new Date();
        this.nextDueDate = null;
        this.submitted = false;
        this.isEdit = false;
        this.showSchedule.set(false);
        this.productDialog = true;
    }

    /** Currency shown next to the amount inputs: the debt's own. */
    formCurrencyLabel(): string {
        const displayCode = this.cs.config().code;
        const code = this.record?.currency || displayCode;
        return code === displayCode ? this.cs.config().symbol : code;
    }

    formDecimals(): number {
        return this.cs.minorUnitsFor(this.record?.currency || this.cs.config().code);
    }

    formMoney(v: number): string {
        const code = this.record?.currency || this.cs.config().code;
        const locale = this.i18n.lang() === 'en' ? 'en-US' : 'fr-FR';
        const d = this.cs.decimalsFor(v, code);
        return `${v.toLocaleString(locale, { maximumFractionDigits: d, minimumFractionDigits: d })} ${code === this.cs.config().code ? this.cs.config().symbol : code}`;
    }

    editRecord(record: DebtRecord) {
        this.record = { ...record };
        this.editDate = parseLocalDate(record.date) ?? new Date();
        this.nextDueDate = parseLocalDate(record.nextPaymentDate);
        this.submitted = false;
        this.isEdit = true;
        this.showSchedule.set(!!(record.monthlyPayment || record.nextPaymentDate || record.interestRate || record.note));
        this.productDialog = true;
    }

    hideDialog() {
        this.productDialog = false;
        this.submitted = false;
        this.isEdit = false;
    }

    async deleteRecord(record: DebtRecord) {
        const ok = await this.feedback.confirm({
            title: this.t('debts.toast.confirmHeader'),
            message: this.t('debts.messages.deleteConfirm', { name: record.name }),
            confirmLabel: this.t('debts.toast.accept'),
            cancelLabel: this.t('debts.toast.reject'),
        });
        if (!ok || !record.id) return;
        try {
            await this.debtsService.deleteRecords([record.id]);
            this.allRecords.update(rs => rs.filter(r => r.id !== record.id));
            this.feedback.success(this.t('debts.toast.deletedDetail'));
        } catch {
            this.feedback.error(this.t('debts.toast.deleteError'));
        }
    }

    async saveRecord() {
        this.submitted = true;
        if (!this.record.name?.trim() || !(this.record.nativeTotal > 0)) return;
        this.record.date = toLocalDateStr(this.editDate ?? new Date());
        this.record.nextPaymentDate = this.nextDueDate ? toLocalDateStr(this.nextDueDate) : null;
        if (!this.record.monthlyPayment) this.record.monthlyPayment = undefined;

        this.isSaving.set(true);
        try {
            if (this.record.id) {
                const updated = await this.debtsService.updateRecord(this.record);
                this.allRecords.update(rs => rs.map(r => r.id === updated.id ? updated : r));
                this.feedback.success(this.t('debts.toast.updatedDetail'));
            } else {
                const created = await this.debtsService.addRecord(this.record);
                this.allRecords.update(rs => [...rs, created]);
                this.feedback.success(this.t('debts.toast.createdDetail'));
            }
            this.productDialog = false;
        } catch (err: any) {
            this.feedback.error(err?.message || this.t('debts.toast.saveError'));
        } finally {
            this.isSaving.set(false);
        }
    }

    getPercent(record: DebtRecord): number {
        if (!record.total) return 0;
        return Math.min(100, Math.round((record.paid / record.total) * 100));
    }

    // ── time chip ──────────────────────────────────────────────────────

    timeLabel(rec: DebtRecord): string {
        if (rec.isPaidOff) {
            const d = rec.paidOffDate ? this.fmtDate(rec.paidOffDate) : '';
            if (rec.closedReason === 'cancelled') return d ? this.t('debts.cancelledOn', { date: d }) : this.t('debts.settled');
            if (rec.closedReason === 'written_off') return d ? this.t('debts.writtenOffOn', { date: d }) : this.t('debts.settled');
            return d ? this.t('debts.settledOn', { date: d }) : this.t('debts.settled');
        }
        if (rec.isOverdue) return this.t('debts.overdueDays', { n: rec.daysOverdue });
        if (!rec.nextPaymentDate) return this.t('debts.noDueDate');
        const d = parseLocalDate(rec.nextPaymentDate);
        if (d && toLocalDateStr(d) === toLocalDateStr(new Date())) return this.t('debts.dueToday');
        return this.t('debts.dueOn', { date: this.fmtDate(rec.nextPaymentDate) });
    }

    timeTone(rec: DebtRecord): ChipTone {
        if (rec.isPaidOff) return rec.closedReason === 'paid' || !rec.closedReason ? 'positive' : 'neutral';
        if (rec.isOverdue) return 'negative';
        if (!rec.nextPaymentDate) return 'neutral';
        const d = parseLocalDate(rec.nextPaymentDate);
        const days = d ? Math.round((d.getTime() - Date.now()) / 86_400_000) : 99;
        return days <= 7 ? 'ochre' : 'neutral';
    }

    fmtDate(iso: string): string {
        const d = parseLocalDate(iso);
        return d ? d.toLocaleDateString(this.i18n.lang() === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'short' }) : '';
    }

    // ── payment ────────────────────────────────────────────────────────

    openPayment(record: DebtRecord) {
        this.paySheet?.prime(record);
        this.paymentOpen = true;
    }

    onPaid(updated: DebtRecord) {
        this.allRecords.update(rs => rs.map(r => r.id === updated.id ? updated : r));
    }
}
