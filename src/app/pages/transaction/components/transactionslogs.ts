import { Component, OnInit, OnDestroy, signal, computed, inject, Output, EventEmitter } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
    TransactionsService, TransactionRecord,
    CATEGORY_CONFIG, INCOME_CATEGORIES, EXPENSE_CATEGORIES
} from '../../service/transactions.service';
import { PatrimoineService } from '../../service/patrimoine.service';
import { LoadErrorComponent } from '../../../core/components/load-error.component';
import { AssetsStateService } from '../../service/assets-state.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { CurrencyService } from '../../../core/services/currency.service';
import { I18nService } from '../../../i18n/i18n.service';
import { ShareContextService } from '../../../core/services/share-context.service';
import { LayoutService } from '../../../layout/service/layout.service';

interface DayGroup {
    dateKey: string;
    label: string;
    records: TransactionRecord[];
}

@Component({
    selector: 'app-transaction-logs',
    standalone: true,
    imports: [
        CommonModule, FormsModule, ButtonModule, DialogModule,
        InputTextModule, InputNumberModule, SelectModule,
        ToastModule, ConfirmDialogModule, DatePickerModule, AppAmountComponent,
        LoadErrorComponent
    ],
    providers: [MessageService, ConfirmationService],
    template: `
        <p-toast position="top-center" />
        <p-confirmDialog />

        <!-- ── Top bar ───────────────────────────────────────────── -->
        <div class="flex flex-col gap-2 mb-5">
            <!-- Row 1: month nav + add button -->
            <div class="flex items-center gap-2">
                <div class="flex items-center gap-1 bg-surface-100 dark:bg-surface-800 rounded-xl px-1 py-1">
                    <button pButton icon="pi pi-chevron-left" [text]="true" size="small"
                            class="!rounded-lg !w-8 !h-8" (click)="prevMonth()"></button>
                    <span class="px-2 text-sm font-semibold text-surface-900 dark:text-surface-0 min-w-[110px] text-center">
                        {{ monthLabel() }}
                    </span>
                    <button pButton icon="pi pi-chevron-right" [text]="true" size="small"
                            class="!rounded-lg !w-8 !h-8" (click)="nextMonth()"
                            [disabled]="isCurrentMonth()"></button>
                </div>
                <div class="flex-1"></div>
                <button *ngIf="!share.active()" pButton icon="pi pi-plus" [label]="t('transactions.add')"
                        class="omaad-cta !rounded-xl !px-4 !py-2 !text-sm !font-semibold"
                        (click)="openNew()"></button>
            </div>
            <!-- Row 2: search + type filter -->
            <div class="flex items-center gap-2">
                <div class="relative flex-1 min-w-0">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm pointer-events-none"></i>
                    <input pInputText [ngModel]="search()" (ngModelChange)="search.set($event)" [placeholder]="t('transactions.searchPlaceholder')"
                           class="w-full !pl-9 !py-2.5 !rounded-xl !text-sm" />
                </div>
                <div class="flex items-center gap-0.5 bg-surface-100 dark:bg-surface-800 rounded-xl p-1 shrink-0">
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

        <!-- ── Monthly KPI summary ───────────────────────────────── -->
        @if (!loading()) {
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <!-- Revenus -->
                <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-4 h-[86px] flex flex-col justify-between">
                    <div class="relative flex items-center justify-between">
                        <span class="text-xs font-semibold text-surface-400 uppercase tracking-wide">{{ t('transactions.kpi.income') }}</span>
                        <div class="w-7 h-7 rounded-lg bg-positive-50 dark:bg-positive-500/15 flex items-center justify-center">
                            <i class="pi pi-arrow-down-left text-positive-600 dark:text-positive-400 text-xs"></i>
                        </div>
                    </div>
                    <div class="relative text-base font-bold text-positive truncate">+<app-amount [value]="monthSummary().income" /></div>
                </div>
                <!-- Dépenses -->
                <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-4 h-[86px] flex flex-col justify-between">
                    <div class="relative flex items-center justify-between">
                        <span class="text-xs font-semibold text-surface-400 uppercase tracking-wide">{{ t('transactions.kpi.expenses') }}</span>
                        <div class="w-7 h-7 rounded-lg bg-negative-50 dark:bg-negative-500/15 flex items-center justify-center">
                            <i class="pi pi-arrow-up-right text-negative-600 dark:text-negative-400 text-xs"></i>
                        </div>
                    </div>
                    <div class="relative text-base font-bold text-negative truncate">−<app-amount [value]="monthSummary().expenses" /></div>
                </div>
                <!-- Solde net -->
                <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-4 h-[86px] flex flex-col justify-between">
                    <div class="relative flex items-center justify-between">
                        <span class="text-xs font-semibold text-surface-400 uppercase tracking-wide">{{ t('transactions.kpi.net') }}</span>
                        <div class="w-7 h-7 rounded-lg flex items-center justify-center"
                             [ngClass]="monthSummary().net >= 0 ? 'bg-brand-100 dark:bg-brand-700/20' : 'bg-negative-50 dark:bg-negative-500/15'">
                            <i class="pi text-xs"
                               [ngClass]="monthSummary().net >= 0 ? 'pi-arrow-up-right text-brand-700 dark:text-ochre-400' : 'pi-arrow-down-left text-negative-600 dark:text-negative-400'"></i>
                        </div>
                    </div>
                    <div class="relative text-base font-bold truncate"
                         [ngClass]="monthSummary().net >= 0 ? 'text-brand-700 dark:text-brand-300' : 'text-negative'">
                        {{ monthSummary().net >= 0 ? '+' : '−' }}<app-amount [value]="monthSummary().net" />
                    </div>
                </div>
                <!-- Taux d'épargne -->
                <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-4 h-[86px] flex flex-col justify-between">
                    <div class="relative flex items-center justify-between">
                        <span class="text-xs font-semibold text-surface-400 uppercase tracking-wide">{{ t('transactions.kpi.savingsRate') }}</span>
                        <div class="w-7 h-7 rounded-lg bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center">
                            <i class="pi pi-percentage text-brand-700 dark:text-ochre-400 text-xs"></i>
                        </div>
                    </div>
                    <div class="relative">
                        <div class="text-base font-bold mb-1"
                             [ngClass]="monthSummary().savingsRate < 0 ? 'text-negative' : 'text-brand-700 dark:text-brand-300'">{{ monthSummary().savingsRate }}%</div>
                        <div class="h-1 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                            <div class="h-full rounded-full transition-all duration-500"
                                 [ngClass]="monthSummary().savingsRate < 0 ? 'bg-negative' : 'bg-brand-700 dark:bg-brand-300'"
                                 [style.width]="monthSummary().barWidth + '%'"></div>
                        </div>
                    </div>
                </div>
            </div>
        }

        <!-- ── Transaction list ───────────────────────────────────── -->
        @if (loading()) {
            <div class="space-y-2">
                @for (i of [1,2,3,4,5]; track i) {
                    <div class="h-[62px] bg-surface-100 dark:bg-surface-800 rounded-xl animate-pulse"></div>
                }
            </div>
        } @else if (loadError()) {
            <app-load-error (retry)="retryLoad()" />
        } @else if (dayGroups().length === 0) {
            <div class="flex flex-col items-center justify-center py-16 text-center">
                <div class="w-14 h-14 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-3">
                    <i class="pi pi-arrow-right-arrow-left text-xl text-surface-400"></i>
                </div>
                <p class="text-surface-500 dark:text-surface-400 text-sm mb-4 px-4">
                    {{ search() || typeFilter() !== 'all'
                        ? t('transactions.emptyFiltered')
                        : t('transactions.emptyMonth') }}
                </p>
                @if (!share.active() && !search() && typeFilter() === 'all') {
                    <button pButton icon="pi pi-plus" [label]="t('transactions.addTransaction')"
                            [outlined]="true" class="!rounded-xl !text-sm" (click)="openNew()"></button>
                }
            </div>
        } @else {
            <div class="space-y-6">
                @for (group of dayGroups(); track group.dateKey) {
                    <div>
                        <div class="flex items-center gap-3 mb-2">
                            <span class="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                                {{ group.label }}
                            </span>
                            <div class="flex-1 h-px bg-surface-200 dark:bg-surface-800"></div>
                            <span class="text-xs text-surface-400 dark:text-surface-500">
                                {{ group.records.length }} opération{{ group.records.length > 1 ? 's' : '' }}
                            </span>
                        </div>

                        <div class="bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 divide-y divide-surface-100 dark:divide-surface-800 overflow-hidden transition-shadow hover:shadow-sm">
                            @for (rec of group.records; track rec.id) {
                                <div class="flex items-center gap-3 px-3 py-3.5 sm:px-4 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors group">
                                    <!-- Category icon -->
                                    <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0"
                                         [style.background]="categoryBg(rec)">
                                        <i [class]="getCategoryConfig(rec).icon + ' text-xs sm:text-sm'"
                                           [style.color]="categoryFg(rec)"></i>
                                    </div>
                                    <!-- Name + category -->
                                    <div class="flex-1 min-w-0">
                                        <div class="text-sm font-medium text-surface-900 dark:text-surface-0 truncate leading-tight">
                                            {{ rec.remarks || categoryLabel(rec.category) }}
                                        </div>
                                        <span class="inline-flex items-center text-[10px] sm:text-xs mt-0.5 px-1.5 py-0.5 rounded-full"
                                              [style.color]="categoryFg(rec)"
                                              [style.background]="categoryBg(rec)">
                                            {{ categoryLabel(rec.category) }}
                                        </span>
                                        @if (accountLabel(rec)) {
                                            <span class="inline-flex items-center gap-1 text-[10px] sm:text-xs mt-0.5 ml-1.5 text-surface-500 dark:text-surface-400">
                                                <i class="pi pi-wallet text-[9px]"></i>{{ accountLabel(rec) }}
                                            </span>
                                        }
                                    </div>
                                    <!-- Amount -->
                                    <div class="text-sm font-bold shrink-0"
                                         [ngClass]="rec.type === 'Transfer' ? 'text-surface-500 dark:text-surface-400' : (rec.type === 'Income' ? 'text-positive' : 'text-negative')">
                                        {{ rec.type === 'Transfer' ? '⇄ ' : (rec.type === 'Income' ? '+' : '−') }}<app-amount [value]="rec.amount" />
                                    </div>
                                    <!-- Actions: always visible on mobile, hover-reveal on desktop -->
                                    <div *ngIf="!share.active()" class="flex gap-1 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <button class="w-7 h-7 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center hover:bg-brand-50 dark:hover:bg-brand-700/30 transition-colors"
                                                (click)="editRecord(rec)">
                                            <i class="pi pi-pencil text-xs text-surface-500"></i>
                                        </button>
                                        <button class="w-7 h-7 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center hover:bg-negative-50 dark:hover:bg-negative-700/30 transition-colors"
                                                (click)="deleteRecord(rec)">
                                            <i class="pi pi-trash text-xs text-surface-500"></i>
                                        </button>
                                    </div>
                                </div>
                            }
                        </div>
                    </div>
                }
            </div>
        }

        <!-- ── Add / Edit dialog ──────────────────────────────────── -->
        <p-dialog [(visible)]="dialogVisible"
                  [style]="{ width: '95vw', maxWidth: '680px' }"
                  [modal]="true" [draggable]="false" [resizable]="false"
                  styleClass="!rounded-2xl overflow-hidden">
            <ng-template #header>
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-xl flex items-center justify-center"
                         [ngClass]="formType() === 'Transfer' ? 'bg-brand-700' : (formType() === 'Income' ? 'bg-positive' : 'bg-negative')">
                        <i class="pi text-white text-lg"
                           [ngClass]="formType() === 'Transfer' ? 'pi-arrow-right-arrow-left' : (formType() === 'Income' ? 'pi-arrow-down-left' : 'pi-arrow-up-right')"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 m-0">
                            {{ editingRecord ? t('transactions.form.editTitle') : t('transactions.form.newTitle') }}
                        </h3>
                        <p class="text-surface-500 dark:text-surface-400 text-sm m-0">
                            {{ editingRecord ? t('transactions.form.editSub') : t('transactions.form.newSub') }}
                        </p>
                    </div>
                </div>
            </ng-template>

            <ng-template #content>
                <div class="flex flex-col gap-6 pt-2">

                    <!-- Type toggle -->
                    <div class="flex gap-2 p-1 bg-surface-100 dark:bg-surface-800 rounded-xl">
                        <button (click)="setType('Expense')"
                                class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                                [ngClass]="formType() === 'Expense'
                                    ? 'bg-white dark:bg-surface-700 text-negative shadow-sm'
                                    : 'text-surface-500 dark:text-surface-400 hover:text-surface-700'">
                            <i class="pi pi-arrow-up-right text-xs"></i> {{ t('transactions.form.expense') }}
                        </button>
                        <button (click)="setType('Income')"
                                class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                                [ngClass]="formType() === 'Income'
                                    ? 'bg-white dark:bg-surface-700 text-positive shadow-sm'
                                    : 'text-surface-500 dark:text-surface-400 hover:text-surface-700'">
                            <i class="pi pi-arrow-down-left text-xs"></i> {{ t('transactions.form.income') }}
                        </button>
                        <button (click)="setType('Transfer')"
                                class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                                [ngClass]="formType() === 'Transfer'
                                    ? 'bg-white dark:bg-surface-700 text-brand-700 dark:text-ochre-400 shadow-sm'
                                    : 'text-surface-500 dark:text-surface-400 hover:text-surface-700'">
                            <i class="pi pi-arrow-right-arrow-left text-xs"></i> {{ t('transactions.form.transfer') }}
                        </button>
                    </div>

                    <!-- Amount + Date row -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div class="flex flex-col gap-1">
                            <label class="text-sm text-surface-500 dark:text-surface-400">
                                {{ t('transactions.form.amount') }} <span class="text-surface-400 font-normal">({{ curSymbol() }})</span>
                            </label>
                            <p-inputnumber [(ngModel)]="form.amount" mode="decimal"
                                           [minFractionDigits]="0" [maxFractionDigits]="0"
                                           styleClass="w-full"
                                           inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !text-lg !font-semibold" />
                            @if (submitted && !(form.amount > 0)) {
                                <small class="text-negative text-xs mt-1">{{ t('transactions.form.amountRequired') }}</small>
                            }
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('transactions.form.date') }}</label>
                            <p-datepicker [(ngModel)]="editDate" [showIcon]="true" [showButtonBar]="true"
                                          dateFormat="yy-mm-dd" styleClass="w-full"
                                          inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                            @if (submitted && !editDate) {
                                <small class="text-negative text-xs mt-1">{{ t('transactions.form.dateRequired') }}</small>
                            }
                        </div>
                    </div>

                    <!-- Currency -->
                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('transactions.form.currency') }}</label>
                        <p-select [(ngModel)]="form.currency" [options]="currencyOptions"
                                  optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full" />
                    </div>

                    <!-- Description -->
                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-surface-500 dark:text-surface-400">
                            {{ t('transactions.form.description') }} <span class="text-surface-400 font-normal">{{ t('transactions.form.optional') }}</span>
                        </label>
                        <input pInputText [(ngModel)]="form.remarks"
                               [placeholder]="t('transactions.form.descriptionPlaceholder')"
                               class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                    </div>

                    @if (formType() === 'Transfer') {
                        <!-- Transfer: From → To account pickers -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div class="flex flex-col gap-1">
                                <label class="text-sm text-surface-500 dark:text-surface-400">
                                    {{ t('transactions.form.from') }}
                                    @if (submitted && !form.fromAccountId) {
                                        <span class="text-negative ml-2 text-xs">{{ t('transactions.form.required') }}</span>
                                    }
                                </label>
                                <p-select [(ngModel)]="form.fromAccountId" [options]="accountOptions()"
                                          optionLabel="label" optionValue="value"
                                          [placeholder]="t('transactions.form.sourceAccount')" [filter]="accountOptions().length > 6"
                                          appendTo="body" styleClass="w-full"
                                          [emptyMessage]="t('transactions.form.noMonetaryAccount')" />
                            </div>
                            <div class="flex flex-col gap-1">
                                <label class="text-sm text-surface-500 dark:text-surface-400">
                                    {{ t('transactions.form.to') }}
                                    @if (submitted && !form.toAccountId) {
                                        <span class="text-negative ml-2 text-xs">{{ t('transactions.form.required') }}</span>
                                    }
                                </label>
                                <p-select [(ngModel)]="form.toAccountId" [options]="accountOptions()"
                                          optionLabel="label" optionValue="value"
                                          [placeholder]="t('transactions.form.destAccount')" [filter]="accountOptions().length > 6"
                                          appendTo="body" styleClass="w-full"
                                          [emptyMessage]="t('transactions.form.noMonetaryAccount')" />
                            </div>
                        </div>
                        @if (submitted && form.fromAccountId && form.fromAccountId === form.toAccountId) {
                            <small class="text-negative text-xs -mt-3">{{ t('transactions.form.sameAccountError') }}</small>
                        }
                    } @else {
                        <!-- Account selector -->
                        <div class="flex flex-col gap-1">
                            <label class="text-sm text-surface-500 dark:text-surface-400">
                                {{ t('transactions.form.account') }}
                                @if (submitted && !form.accountId) {
                                    <span class="text-negative ml-2 text-xs">{{ t('transactions.form.required') }}</span>
                                }
                            </label>
                            <p-select [(ngModel)]="form.accountId" [options]="accountOptions()"
                                      optionLabel="label" optionValue="value"
                                      [placeholder]="t('transactions.form.selectAccount')" [filter]="accountOptions().length > 6"
                                      appendTo="body" styleClass="w-full"
                                      [emptyMessage]="t('transactions.form.noMonetaryAccount')" />
                        </div>

                        <!-- Category grid -->
                        <div class="flex flex-col gap-3">
                            <label class="text-sm text-surface-500 dark:text-surface-400">
                                {{ t('transactions.form.category') }}
                                @if (submitted && !form.category) {
                                    <span class="text-negative ml-2 text-xs">{{ t('transactions.form.categoryRequired') }}</span>
                                }
                            </label>
                            <div class="grid grid-cols-3 gap-2">
                                @for (cat of currentCategories(); track cat) {
                                    <button (click)="form.category = cat"
                                            class="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border-2 transition-all text-center"
                                            [style.border-color]="form.category === cat ? getCatConfig(cat).color : ''"
                                            [style.background]="form.category === cat ? getCatConfig(cat).color + '15' : ''"
                                            [ngClass]="form.category === cat
                                                ? 'shadow-sm'
                                                : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'">
                                        <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                                             [style.background]="getCatConfig(cat).color + '20'">
                                            <i [class]="getCatConfig(cat).icon + ' text-sm'"
                                               [style.color]="getCatConfig(cat).color"></i>
                                        </div>
                                        <span class="text-[11px] font-medium leading-tight text-surface-700 dark:text-surface-300">
                                            {{ categoryLabel(cat) }}
                                        </span>
                                    </button>
                                }
                            </div>
                        </div>
                    }

                </div>
            </ng-template>

            <ng-template #footer>
                <div class="flex flex-col gap-2 pt-2 w-full">
                    <p-button [label]="editingRecord ? t('transactions.form.update') : t('transactions.form.save')" icon="pi pi-check"
                              [loading]="isSaving()"
                              (click)="saveRecord()"
                              styleClass="w-full omaad-cta !rounded-full !py-3" />
                    <p-button [label]="t('transactions.form.cancel')" icon="pi pi-times" [outlined]="true"
                              (click)="hideDialog()"
                              styleClass="w-full !rounded-full !py-3" />
                </div>
            </ng-template>
        </p-dialog>
    `
})
export class TransactionLogs implements OnInit, OnDestroy {
    private transactionsService = inject(TransactionsService);
    private patrimoineService   = inject(PatrimoineService);
    private state               = inject(AssetsStateService);
    private messageService      = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    private layoutService       = inject(LayoutService);
    cs = inject(CurrencyService);
    private i18n = inject(I18nService);
    share = inject(ShareContextService);

    t(key: string): string { return this.i18n.t(key); }
    private dateLocale(): string { return this.i18n.lang() === 'en' ? 'en-US' : 'fr-FR'; }

    @Output() monthChanged = new EventEmitter<string>();

    // ── State ─────────────────────────────────────────────────────
    loading   = signal(true);
    loadError = signal(false);
    isSaving  = signal(false);
    submitted = false;

    private allRecords   = signal<TransactionRecord[]>([]);
    private _selectedYear  = signal(new Date().getFullYear());
    private _selectedMonth = signal(new Date().getMonth() + 1);

    search     = signal('');
    typeFilter = signal<'all' | 'Income' | 'Expense' | 'Transfer'>('all');

    get typeFilters() {
        return [
            { label: this.t('transactions.filterAll'),      value: 'all'      as const },
            { label: this.t('transactions.kpi.income'),     value: 'Income'   as const },
            { label: this.t('transactions.kpi.expenses'),   value: 'Expense'  as const },
            { label: this.t('transactions.form.transfer'),  value: 'Transfer' as const },
        ];
    }

    // ── Dialog state ──────────────────────────────────────────────
    dialogVisible  = false;
    editingRecord: TransactionRecord | null = null;
    editDate: Date | null = null;
    // formType is a Signal so computed() can track changes reactively
    formType = signal<'Income' | 'Expense' | 'Transfer'>('Expense');
    form: { amount: number; currency: string; remarks: string; category: string; accountId?: number; fromAccountId?: number; toAccountId?: number } = {
        amount: 0, currency: this.cs.config().code, remarks: '', category: EXPENSE_CATEGORIES[0], accountId: undefined, fromAccountId: undefined, toAccountId: undefined
    };

    /** Currencies a transaction can be entered in. */
    readonly currencyOptions = [
        { label: 'FCFA (XOF)', value: 'XOF' },
        { label: 'Euro (€)', value: 'EUR' },
        { label: 'Dollar ($)', value: 'USD' },
    ];

    /** Symbol for the currently selected transaction currency. */
    curSymbol(): string {
        const c = this.form.currency;
        return c === 'XOF' ? 'FCFA' : c === 'USD' ? '$' : '€';
    }

    // Monetary accounts (cash / savings / mobile money) for the account selector
    private static readonly MONETARY_CATEGORIES = ['cash', 'savings_account', 'mobile_money'];
    accountOptions = signal<{ label: string; value: number }[]>([]);

    readonly currentCategories = computed(() =>
        this.formType() === 'Income' ? [...INCOME_CATEGORIES] : [...EXPENSE_CATEGORIES]
    );

    getCatConfig(cat: string) {
        return CATEGORY_CONFIG[cat] ?? { label: cat, icon: 'pi pi-circle', color: '#94a3b8', bg: '' };
    }

    /** Localized category label; falls back to the CATEGORY_CONFIG label then the raw key. */
    categoryLabel(cat: string | undefined | null): string {
        return this.i18n.categoryLabel(cat);
    }

    setType(t: 'Income' | 'Expense' | 'Transfer') {
        this.formType.set(t);
        if (t === 'Transfer') return; // transfers have no income/expense category
        const cats = t === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
        if (!(cats as readonly string[]).includes(this.form.category)) {
            this.form.category = cats[0];
        }
    }

    // ── Computed ──────────────────────────────────────────────────
    readonly selectedYearMonth = computed(() => {
        const y = this._selectedYear();
        const m = String(this._selectedMonth()).padStart(2, '0');
        return `${y}-${m}`;
    });

    readonly monthLabel = computed(() => {
        this.i18n.lang(); // track language for reactivity
        const d = new Date(this._selectedYear(), this._selectedMonth() - 1, 1);
        return d.toLocaleDateString(this.dateLocale(), { month: 'long', year: 'numeric' })
                .replace(/^\w/, c => c.toUpperCase());
    });

    readonly isCurrentMonth = computed(() => {
        const now = new Date();
        return this._selectedYear() === now.getFullYear() && this._selectedMonth() === now.getMonth() + 1;
    });

    readonly filteredRecords = computed(() => {
        const ym     = this.selectedYearMonth();
        const filter = this.typeFilter();
        const q      = this.search().toLowerCase().trim();

        return this.allRecords()
            .filter(r => r.date.startsWith(ym))
            .filter(r => filter === 'all' || r.type === filter)
            .filter(r => !q ||
                (r.name    || '').toLowerCase().includes(q) ||
                (r.remarks || '').toLowerCase().includes(q));
    });

    readonly monthSummary = computed(() => {
        const ym = this.selectedYearMonth();
        const recs = this.allRecords().filter(r => r.date.startsWith(ym));
        const income   = recs.filter(r => r.type === 'Income') .reduce((s, r) => s + r.amount, 0);
        const expenses = recs.filter(r => r.type === 'Expense').reduce((s, r) => s + r.amount, 0);
        const net      = income - expenses;
        // Show the truth, including deficit months: a month where you spent
        // more than you earned has a NEGATIVE savings rate. Clamping it to 0
        // would hide the one number this tracker exists to surface.
        const savingsRate = income > 0 ? Math.min(100, Math.round(net / income * 100)) : 0;
        // Bar fill is magnitude-based; its colour (below) signals the sign.
        const barWidth = Math.min(100, Math.abs(savingsRate));
        return { income, expenses, net, savingsRate, barWidth };
    });

    readonly dayGroups = computed((): DayGroup[] => {
        const byDay: Record<string, TransactionRecord[]> = {};
        for (const r of this.filteredRecords()) {
            (byDay[r.date] = byDay[r.date] || []).push(r);
        }
        return Object.entries(byDay)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([dateKey, records]) => ({
                dateKey,
                label: this.formatDayLabel(dateKey),
                records: [...records].sort((a, b) => (b.id || '').localeCompare(a.id || ''))
            }));
    });

    private sub?: Subscription;

    ngOnInit() {
        this.load();
        // Reflect a quick-add from the FAB without leaving the page.
        this.sub = this.state.transactionsUpdated$.subscribe(() => this.load());
    }

    ngOnDestroy() {
        this.sub?.unsubscribe();
    }

    private async load() {
        this.loading.set(true);
        try {
            const recs = await this.transactionsService.getRecords();
            this.allRecords.set(recs);
            this.loadError.set(false);
            this.emitMonth();
            this.loadAccounts();
        } catch (error) {
            console.error('Error loading transactions:', error);
            // Explicit error+retry instead of a fake-empty transaction log.
            if (this.allRecords().length === 0) this.loadError.set(true);
        } finally {
            this.loading.set(false);
        }
    }

    retryLoad() {
        this.load();
    }

    private async loadAccounts() {
        try {
            const assets = await this.patrimoineService.getAssets();
            this.accountOptions.set(
                assets
                    .filter(a => TransactionLogs.MONETARY_CATEGORIES.includes(a.category))
                    .map(a => ({ label: a.name, value: a.id }))
            );
        } catch {
            this.accountOptions.set([]);
        }
    }

    private emitMonth() {
        this.monthChanged.emit(this.selectedYearMonth());
    }

    // ── Month navigation ──────────────────────────────────────────
    prevMonth() {
        let m = this._selectedMonth() - 1;
        let y = this._selectedYear();
        if (m < 1) { m = 12; y--; }
        this._selectedMonth.set(m);
        this._selectedYear.set(y);
        this.emitMonth();
    }

    nextMonth() {
        if (this.isCurrentMonth()) return;
        let m = this._selectedMonth() + 1;
        let y = this._selectedYear();
        if (m > 12) { m = 1; y++; }
        this._selectedMonth.set(m);
        this._selectedYear.set(y);
        this.emitMonth();
    }

    // ── Dialog ────────────────────────────────────────────────────
    openNew() {
        this.editingRecord = null;
        this.editDate = new Date();
        this.formType.set('Expense');
        this.form = { amount: 0, currency: this.cs.config().code, remarks: '', category: EXPENSE_CATEGORIES[0], accountId: undefined, fromAccountId: undefined, toAccountId: undefined };
        this.submitted = false;
        this.dialogVisible = true;
    }

    editRecord(rec: TransactionRecord) {
        this.editingRecord = rec;
        this.editDate = rec.date ? new Date(rec.date) : new Date();
        this.formType.set(rec.type);
        this.form = {
            amount:    rec.nativeAmount ?? rec.amount,  // edit in the transaction's native currency
            currency:  rec.currency || this.cs.config().code,
            remarks:   rec.remarks || rec.name || '',
            category:  rec.category || (rec.type === 'Income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]),
            accountId: rec.accountId,
            fromAccountId: rec.fromAccountId,
            toAccountId: rec.toAccountId
        };
        this.submitted = false;
        this.dialogVisible = true;
    }

    hideDialog() {
        this.dialogVisible = false;
        this.submitted = false;
    }

    async saveRecord() {
        this.submitted = true;
        const isTransfer = this.formType() === 'Transfer';

        // Validation differs by type: transfers need two distinct accounts and
        // no category; income/expense need a category and a single account.
        if (!this.editDate || !(this.form.amount > 0)) return;
        if (isTransfer) {
            if (!this.form.fromAccountId || !this.form.toAccountId) return;
            if (this.form.fromAccountId === this.form.toAccountId) return;
        } else if (!this.form.category || !this.form.accountId) {
            return;
        }

        const dateStr = this.toDateStr(this.editDate);
        this.isSaving.set(true);

        const transferName = this.t('transactions.form.transfer');

        try {
            if (this.editingRecord?.id) {
                const updated = await this.transactionsService.updateRecord({
                    ...this.editingRecord,
                    date:     dateStr,
                    type:     this.formType(),
                    amount:    this.form.amount,
                    currency:  this.form.currency,
                    remarks:   this.form.remarks,
                    category:  isTransfer ? 'transfer' : this.form.category,
                    accountId: isTransfer ? undefined : this.form.accountId,
                    fromAccountId: isTransfer ? this.form.fromAccountId : undefined,
                    toAccountId:   isTransfer ? this.form.toAccountId : undefined,
                    name:      this.form.remarks || (isTransfer ? transferName : CATEGORY_CONFIG[this.form.category]?.label || this.editingRecord.name),
                });
                this.allRecords.update(rs => rs.map(r => r.id === updated.id ? updated : r));
                this.messageService.add({ severity: 'success', summary: this.t('transactions.toast.updated'), detail: this.t('transactions.toast.updatedDetail'), life: 3000 });
            } else {
                const created = await this.transactionsService.addRecord({
                    date:     dateStr,
                    type:     this.formType(),
                    amount:    this.form.amount,
                    currency:  this.form.currency,
                    remarks:   this.form.remarks,
                    category:  isTransfer ? 'transfer' : this.form.category,
                    accountId: isTransfer ? undefined : this.form.accountId,
                    fromAccountId: isTransfer ? this.form.fromAccountId : undefined,
                    toAccountId:   isTransfer ? this.form.toAccountId : undefined,
                    name:      this.form.remarks || (isTransfer ? transferName : CATEGORY_CONFIG[this.form.category]?.label || (this.formType() === 'Income' ? this.t('transactions.form.income') : this.t('transactions.form.expense'))),
                });
                this.allRecords.update(rs => [created, ...rs]);
                this.messageService.add({ severity: 'success', summary: this.t('transactions.toast.saved'), detail: this.t('transactions.toast.savedDetail'), life: 3000 });
            }
            this.dialogVisible = false;
        } catch (err: any) {
            this.messageService.add({ severity: 'error', summary: this.t('transactions.toast.error'),
                detail: err?.message || this.t('transactions.toast.saveError'), life: 5000 });
        } finally {
            this.isSaving.set(false);
        }
    }

    deleteRecord(rec: TransactionRecord) {
        this.confirmationService.confirm({
            message: this.t('transactions.confirm.deleteMessage'),
            header: this.t('transactions.confirm.header'),
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: this.t('transactions.confirm.accept'),
            rejectLabel: this.t('transactions.confirm.reject'),
            acceptButtonStyleClass: '!bg-negative !border-negative',
            accept: async () => {
                if (!rec.id) return;
                try {
                    await this.transactionsService.deleteRecords([rec.id]);
                    this.allRecords.update(rs => rs.filter(r => r.id !== rec.id));
                    this.messageService.add({ severity: 'success', summary: this.t('transactions.toast.deleted'), detail: this.t('transactions.toast.deletedDetail'), life: 3000 });
                } catch {
                    this.messageService.add({ severity: 'error', summary: this.t('transactions.toast.error'), detail: this.t('transactions.toast.deleteError'), life: 4000 });
                }
            }
        });
    }

    // ── Helpers ───────────────────────────────────────────────────
    getCategoryConfig(rec: TransactionRecord) {
        const cat = rec.category || (rec.type === 'Income' ? 'other_income' : 'other_expense');
        return CATEGORY_CONFIG[cat] ?? { label: rec.name || cat, icon: 'pi pi-circle', color: '#94a3b8', bg: 'bg-warm-500/10' };
    }

    /** Account label for the chip: "from → to" for transfers, else the account name. */
    accountLabel(rec: TransactionRecord): string {
        if (rec.fromAccountName || rec.toAccountName) {
            return `${rec.fromAccountName ?? '?'} → ${rec.toAccountName ?? '?'}`;
        }
        return rec.accountName ?? '';
    }

    categoryFg(rec: TransactionRecord): string {
        const c = this.getCategoryConfig(rec).color;
        return this.layoutService.isDarkTheme()
            ? `color-mix(in srgb, ${c} 30%, white)`
            : c;
    }

    categoryBg(rec: TransactionRecord): string {
        const c = this.getCategoryConfig(rec).color;
        return this.layoutService.isDarkTheme()
            ? `color-mix(in srgb, ${c} 35%, transparent)`
            : `${c}1a`;
    }

    private formatDayLabel(dateStr: string): string {
        const today     = new Date(); today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        const dt        = new Date(dateStr + 'T00:00:00');

        if (dt.getTime() === today.getTime())     return this.t('transactions.today');
        if (dt.getTime() === yesterday.getTime()) return this.t('transactions.yesterday');

        return new Date(dateStr + 'T12:00:00')
            .toLocaleDateString(this.dateLocale(), { weekday: 'long', day: 'numeric', month: 'short' })
            .replace(/^\w/, c => c.toUpperCase());
    }

    private toDateStr(d: Date): string {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
}
