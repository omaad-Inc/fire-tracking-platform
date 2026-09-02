import { Component, OnInit, OnDestroy, signal, computed, inject, effect, Output, EventEmitter, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
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
import { MultiSelectModule } from 'primeng/multiselect';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
    TransactionsService, TransactionRecord,
    CATEGORY_CONFIG, INCOME_CATEGORIES, EXPENSE_CATEGORIES
} from '../../service/transactions.service';
import { PatrimoineService } from '../../service/patrimoine.service';
import { CustomCategoryService } from '../../../core/services/custom-category.service';
import { LoadErrorComponent } from '../../../core/components/load-error.component';
import { AssetsStateService } from '../../service/assets-state.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { CurrencyService } from '../../../core/services/currency.service';
import { I18nService } from '../../../i18n/i18n.service';
import { ShareContextService } from '../../../core/services/share-context.service';
import { LayoutService } from '../../../layout/service/layout.service';
import { CsvImportDialog } from './csv-import-dialog';
import { isTouchDevice } from '../../../core/util/touch';
import { LG, mediaQuery } from '../../../core/util/breakpoint';
import { TransactionsTable, TxTableRow } from './transactions-table';

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
        LoadErrorComponent, CsvImportDialog, MultiSelectModule, TransactionsTable
    ],
    providers: [MessageService, ConfirmationService],
    template: `
        <p-toast position="top-center" />
        <p-confirmDialog />
        <app-csv-import-dialog #csvImport (imported)="onImported()" />

        <!-- ── Top bar ───────────────────────────────────────────── -->
        <div class="flex flex-col gap-2 mb-5">
            <!-- Row 1: month nav + add button -->
            <div class="flex items-center gap-2">
                <!-- Dimmed and inert while a custom range overrides it, so the
                     page never shows two competing period controls as equals. -->
                <div class="flex items-center gap-1 bg-surface-100 dark:bg-surface-800 rounded-xl px-1 py-1 transition-opacity"
                     [class.opacity-40]="rangeActive()"
                     [class.pointer-events-none]="rangeActive()"
                     [attr.aria-hidden]="rangeActive() ? 'true' : null"
                     data-testid="tx-month-nav">
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
                <button *ngIf="!share.active()" pButton icon="pi pi-upload" [label]="t('transactions.import.action')"
                        [outlined]="true" class="!rounded-xl !px-4 !py-2 !text-sm !font-semibold"
                        (click)="csvImport.open()" data-testid="csv-import-open"></button>
                <button *ngIf="!share.active()" pButton icon="pi pi-plus" [label]="t('transactions.add')"
                        class="omaad-cta !rounded-xl !px-4 !py-2 !text-sm !font-semibold"
                        (click)="openNew()"></button>
            </div>
            <!-- Row 1b, desktop only: period range + category/account filters +
                 export. The month navigator above stays the everyday control;
                 a range is the deliberate override and says so. -->
            @if (isWide()) {
                <div class="flex items-center gap-2 flex-wrap" data-testid="tx-filter-bar">
                    @if (rangeActive()) {
                        <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold
                                     bg-ochre-500/15 text-ochre-700 dark:text-ochre-300 ring-1 ring-ochre-500/40"
                              data-testid="tx-range-pill">
                            <i class="pi pi-calendar text-[10px]" aria-hidden="true"></i>
                            {{ periodLabel() }}
                            <button type="button" (click)="clearRange()"
                                    [attr.aria-label]="t('transactions.table.clearRange')"
                                    class="ml-0.5 hover:opacity-70" data-testid="tx-range-clear">
                                <i class="pi pi-times text-[10px]"></i>
                            </button>
                        </span>
                    } @else {
                        @for (p of rangePresets; track p.value) {
                            <button type="button" (click)="applyPreset(p.value)"
                                    class="px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors
                                           bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300
                                           hover:bg-surface-200 dark:hover:bg-surface-700">
                                {{ p.label }}
                            </button>
                        }
                    }

                    <p-multiSelect [ngModel]="catFilter()" (ngModelChange)="catFilter.set($event); onSelectionChange(selectedKeys())"
                                   [options]="categoryOptions()" optionLabel="label" optionValue="value"
                                   [placeholder]="t('transactions.table.category')"
                                   [maxSelectedLabels]="1"
                                   [selectedItemsLabel]="t('transactions.table.nCategories')"
                                   [filter]="true" [showToggleAll]="false" [showClear]="true"
                                   styleClass="!rounded-xl omaad-tx-ms" [style]="{ minWidth: '9.5rem' }"
                                   data-testid="tx-cat-filter" />

                    <p-multiSelect [ngModel]="accountFilter()" (ngModelChange)="accountFilter.set($event)"
                                   [options]="accountFilterOptions()" optionLabel="label" optionValue="value"
                                   [placeholder]="t('common.account')"
                                   [maxSelectedLabels]="1"
                                   [selectedItemsLabel]="t('transactions.table.nAccounts')"
                                   [filter]="true" [showToggleAll]="false" [showClear]="true"
                                   styleClass="!rounded-xl omaad-tx-ms" [style]="{ minWidth: '9.5rem' }"
                                   data-testid="tx-account-filter" />

                    @if (hasActiveFilters()) {
                        <button type="button" (click)="clearFilters()" data-testid="tx-clear-filters"
                                class="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-surface-500 dark:text-surface-400
                                       hover:text-surface-700 dark:hover:text-surface-200 transition-colors">
                            <i class="pi pi-filter-slash text-[10px] mr-1"></i>{{ t('transactions.table.clearFilters') }}
                        </button>
                    }

                    <div class="flex-1"></div>

                    <span class="text-xs text-surface-400 dark:text-surface-500 tabular-nums" data-testid="tx-count">
                        {{ filteredRecords().length === 1
                            ? t('transactions.opCountOne', { n: filteredRecords().length })
                            : t('transactions.opCountMany', { n: filteredRecords().length }) }}
                    </span>

                    <button type="button" (click)="exportCsv()"
                            [disabled]="!filteredRecords().length"
                            data-testid="tx-export"
                            class="px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5
                                   bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200
                                   hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors
                                   disabled:opacity-40 disabled:cursor-not-allowed">
                        <i class="pi pi-download text-[10px]"></i>{{ t('common.export') }}
                    </button>
                </div>
            }

            <!-- Row 2: search + type filter -->
            <div class="flex items-center gap-2">
                <div class="relative flex-1 min-w-0">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm pointer-events-none" aria-hidden="true"></i>
                    <input pInputText [ngModel]="search()" (ngModelChange)="search.set($event)" [placeholder]="t('transactions.searchPlaceholder')"
                           [attr.aria-label]="t('transactions.searchPlaceholder')" type="search"
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
                                 [ngClass]="monthSummary().savingsRate < 0 ? 'bg-negative' : 'bg-brand-700 dark:bg-ochre-400'"
                                 [style.width]="monthSummary().barWidth + '%'"></div>
                        </div>
                    </div>
                </div>
            </div>
        } @else {
            <!-- Reserve the KPI-row height while loading so the list doesn't jump (P3-9) -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                @for (i of [1, 2, 3, 4]; track i) {
                    <div class="h-[86px] rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-100 dark:bg-surface-800 animate-pulse"></div>
                }
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
                    {{ hasActiveFilters()
                        ? t('transactions.emptyFiltered')
                        : t('transactions.emptyMonth') }}
                </p>
                @if (!share.active() && !hasActiveFilters()) {
                    <button pButton icon="pi pi-plus" [label]="t('transactions.addTransaction')"
                            [outlined]="true" class="!rounded-xl !text-sm" (click)="openNew()"></button>
                }
            </div>
        } @else if (isWide()) {
            <!-- ── Desktop: bulk action bar + power table ────────── -->
            @if (!share.active() && selectedKeys().length) {
                <div class="flex items-center gap-3 flex-wrap mb-3 px-3 py-2.5 rounded-xl
                            bg-brand-700 dark:bg-surface-800 text-white"
                     data-testid="tx-bulk-bar">
                    <span class="text-xs font-bold tabular-nums" data-testid="tx-bulk-count">
                        {{ selectedKeys().length === 1
                            ? t('transactions.table.nSelectedOne', { n: selectedKeys().length })
                            : t('transactions.table.nSelectedMany', { n: selectedKeys().length }) }}
                    </span>
                    <div class="flex-1"></div>

                    @if (bulkCategoryOptions().length) {
                        <p-select [ngModel]="bulkCategory()" (ngModelChange)="bulkCategory.set($event)"
                                  [options]="bulkCategoryOptions()" optionLabel="label" optionValue="value"
                                  [placeholder]="t('transactions.table.recategorizeTo')"
                                  [filter]="true" appendTo="body"
                                  styleClass="!rounded-lg !text-xs" [style]="{ minWidth: '11rem' }"
                                  data-testid="tx-bulk-category" />
                        <button type="button" (click)="bulkRecategorize()"
                                [disabled]="!bulkCategory() || isBulking()"
                                data-testid="tx-bulk-apply"
                                class="px-3 py-1.5 rounded-lg text-xs font-bold bg-ochre-500 text-warm-900
                                       hover:bg-ochre-400 transition-colors
                                       disabled:opacity-40 disabled:cursor-not-allowed">
                            {{ t('transactions.table.apply') }}
                        </button>
                    } @else {
                        <!-- Mixed types (or transfers): no category is valid for
                             the whole selection, so say why instead of offering
                             a picker that would mislabel rows. -->
                        <span class="text-[11px] opacity-80" data-testid="tx-bulk-mixed">
                            {{ t('transactions.table.mixedTypes') }}
                        </span>
                    }

                    <button type="button" (click)="bulkDelete()" [disabled]="isBulking()"
                            data-testid="tx-bulk-delete"
                            class="px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5
                                   bg-white/15 hover:bg-white/25 transition-colors
                                   disabled:opacity-40 disabled:cursor-not-allowed">
                        <i class="pi pi-trash text-[10px]"></i>{{ t('common.delete') }}
                    </button>
                </div>
            }
            <app-transactions-table
                [rows]="tableRows()"
                [readonly]="share.active()"
                (edit)="editRecord($event)"
                (remove)="deleteRecord($event)"
                (selectionChange)="onSelectionChange($event)" />
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
                                {{ group.records.length === 1
                                    ? t('transactions.opCountOne', { n: group.records.length })
                                    : t('transactions.opCountMany', { n: group.records.length }) }}
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
                                        <span class="inline-flex items-center text-[11px] sm:text-xs mt-0.5 px-1.5 py-0.5 rounded-full"
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
                                        @if (rec.type === 'Transfer') { <i class="pi pi-arrow-right-arrow-left text-xs mr-1" aria-hidden="true"></i> }<app-amount [value]="rec.amount" [prefix]="rec.type === 'Transfer' ? '' : (rec.type === 'Income' ? '+' : '−')" />
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
        <p-dialog [transitionOptions]="'320ms cubic-bezier(0.34, 1.30, 0.64, 1)'" [(visible)]="dialogVisible"
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
                                    : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'">
                            <i class="pi pi-arrow-up-right text-xs"></i> {{ t('transactions.form.expense') }}
                        </button>
                        <button (click)="setType('Income')"
                                class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                                [ngClass]="formType() === 'Income'
                                    ? 'bg-white dark:bg-surface-700 text-positive shadow-sm'
                                    : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'">
                            <i class="pi pi-arrow-down-left text-xs"></i> {{ t('transactions.form.income') }}
                        </button>
                        <button (click)="setType('Transfer')"
                                class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                                [ngClass]="formType() === 'Transfer'
                                    ? 'bg-white dark:bg-surface-700 text-brand-700 dark:text-ochre-400 shadow-sm'
                                    : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'">
                            <i class="pi pi-arrow-right-arrow-left text-xs"></i> {{ t('transactions.form.transfer') }}
                        </button>
                    </div>

                    <!-- Amount + Date row -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div class="flex flex-col gap-1">
                            <label for="tx-amount" class="text-sm text-surface-500 dark:text-surface-400">
                                {{ t('transactions.form.amount') }} <span class="text-surface-400 font-normal">({{ curSymbol() }})</span>
                            </label>
                            <p-inputnumber [(ngModel)]="form.amount" mode="decimal" inputId="tx-amount"
                                           [minFractionDigits]="0" [maxFractionDigits]="0"
                                           styleClass="w-full"
                                           inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !text-lg !font-semibold" />
                            @if (submitted && !(form.amount > 0)) {
                                <small class="text-negative text-xs mt-1">{{ t('transactions.form.amountRequired') }}</small>
                            }
                        </div>
                        <div class="flex flex-col gap-1">
                            <label for="tx-date" class="text-sm text-surface-500 dark:text-surface-400">{{ t('transactions.form.date') }}</label>
                            <p-datepicker [touchUI]="isTouch" [readonlyInput]="isTouch" [(ngModel)]="editDate" [maxDate]="maxDate" [showIcon]="true" [showButtonBar]="true" inputId="tx-date"
                                          dateFormat="yy-mm-dd" styleClass="w-full"
                                          inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                            @if (submitted && !editDate) {
                                <small class="text-negative text-xs mt-1">{{ t('transactions.form.dateRequired') }}</small>
                            }
                        </div>
                    </div>

                    <!-- Currency -->
                    <div class="flex flex-col gap-1">
                        <label for="tx-currency" class="text-sm text-surface-500 dark:text-surface-400">{{ t('transactions.form.currency') }}</label>
                        <p-select [(ngModel)]="form.currency" [options]="currencyOptions" inputId="tx-currency"
                                  optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full" />
                    </div>

                    <!-- Description -->
                    <div class="flex flex-col gap-1">
                        <label for="tx-desc" class="text-sm text-surface-500 dark:text-surface-400">
                            {{ t('transactions.form.description') }} <span class="text-surface-400 font-normal">{{ t('transactions.form.optional') }}</span>
                        </label>
                        <input pInputText id="tx-desc" [(ngModel)]="form.remarks"
                               [placeholder]="t('transactions.form.descriptionPlaceholder')"
                               class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                    </div>

                    @if (formType() === 'Transfer') {
                        <!-- Transfer: From → To account pickers -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div class="flex flex-col gap-1">
                                <label for="tx-from" class="text-sm text-surface-500 dark:text-surface-400">
                                    {{ t('transactions.form.from') }}
                                    @if (submitted && !form.fromAccountId) {
                                        <span class="text-negative ml-2 text-xs">{{ t('transactions.form.required') }}</span>
                                    }
                                </label>
                                <p-select [(ngModel)]="form.fromAccountId" [options]="accountOptions()" inputId="tx-from"
                                          optionLabel="label" optionValue="value"
                                          [placeholder]="t('transactions.form.sourceAccount')" [filter]="accountOptions().length > 6"
                                          appendTo="body" styleClass="w-full"
                                          [emptyMessage]="t('transactions.form.noMonetaryAccount')" />
                            </div>
                            <div class="flex flex-col gap-1">
                                <label for="tx-to" class="text-sm text-surface-500 dark:text-surface-400">
                                    {{ t('transactions.form.to') }}
                                    @if (submitted && !form.toAccountId) {
                                        <span class="text-negative ml-2 text-xs">{{ t('transactions.form.required') }}</span>
                                    }
                                </label>
                                <p-select [(ngModel)]="form.toAccountId" [options]="accountOptions()" inputId="tx-to"
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
                            <label for="tx-account" class="text-sm text-surface-500 dark:text-surface-400">
                                {{ t('transactions.form.account') }}
                                @if (submitted && !form.accountId) {
                                    <span class="text-negative ml-2 text-xs">{{ t('transactions.form.required') }}</span>
                                }
                            </label>
                            <p-select [(ngModel)]="form.accountId" [options]="accountOptions()" inputId="tx-account"
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
    /** Mobile-safe datepickers: touchUI modal + readonly input (no keyboard). */
    readonly isTouch = isTouchDevice();

    private transactionsService = inject(TransactionsService);
    private patrimoineService   = inject(PatrimoineService);
    private state               = inject(AssetsStateService);
    private messageService      = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    private layoutService       = inject(LayoutService);
    cs = inject(CurrencyService);
    private i18n = inject(I18nService);
    private customCat = inject(CustomCategoryService);
    share = inject(ShareContextService);
    private router = inject(Router);
    private route  = inject(ActivatedRoute);
    /** Guard so the URL-sync effect doesn't clobber incoming params before ngOnInit reads them. */
    private urlReady = false;
    /** Deep-link the month/type/search filters into the URL (P3-8), shareable + survives refresh. */
    private syncUrl = effect(() => {
        const params = {
            month: this._selectedMonth(),
            year: this._selectedYear(),
            type: this.typeFilter() === 'all' ? null : this.typeFilter(),
            q: this.search() || null,
            // P1-2 desktop filters, so a filtered view is shareable and
            // survives a refresh like the month/type/search already did.
            cat: this.catFilter().length ? this.catFilter().join(',') : null,
            acct: this.accountFilter().length ? this.accountFilter().join(',') : null,
            from: this.dateFrom() ? this.toDateStr(this.dateFrom()!) : null,
            to: this.dateTo() ? this.toDateStr(this.dateTo()!) : null,
        };
        if (!this.urlReady || this.share.active()) return;
        this.router.navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge', replaceUrl: true });
    });

    t(key: string, params?: Record<string, string | number>): string { return this.i18n.t(key, params); }
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

    // ── Desktop power table (P1-2) ────────────────────────────────
    /** ≥lg renders the table, below it the card list. A signal, not a CSS
     *  `hidden lg:block` pair, so only ONE of the two is ever built. */
    readonly isWide = mediaQuery(LG);
    @ViewChild(TransactionsTable) private table?: TransactionsTable;

    /** Extra filters, desktop-only affordances (the card list keeps search + type). */
    catFilter     = signal<string[]>([]);
    accountFilter = signal<number[]>([]);
    /** Custom date range. When set it OVERRIDES the month scope: the month
     *  navigator is the everyday control, a range is the deliberate override,
     *  and the KPIs, the table and the export all follow whichever is active. */
    dateFrom = signal<Date | null>(null);
    dateTo   = signal<Date | null>(null);
    /**
     * Gated on `isWide()` on purpose. The range pill (the only way to clear a
     * range) lives in the desktop filter bar, so honouring `?from=&to=` on a
     * phone dimmed the month navigator and left the user with NO period control
     * at all, which is exactly what happens when a desktop filter URL gets
     * shared. Narrow viewports stay month-only, as they were.
     */
    readonly rangeActive = computed(() => this.isWide() && !!this.dateFrom() && !!this.dateTo());

    /** Keys of the rows the table has selected, for the bulk action bar. */
    selectedKeys = signal<string[]>([]);
    bulkCategory = signal<string | null>(null);
    isBulking = signal(false);

    get typeFilters() {
        return [
            { label: this.t('transactions.filterAll'),      value: 'all'      as const },
            { label: this.t('transactions.kpi.income'),     value: 'Income'   as const },
            { label: this.t('transactions.kpi.expenses'),   value: 'Expense'  as const },
            { label: this.t('transactions.form.transfer'),  value: 'Transfer' as const },
        ];
    }

    get rangePresets() {
        return [
            { label: this.t('transactions.table.last3m'),  value: '3m'  as const },
            { label: this.t('transactions.table.last12m'), value: '12m' as const },
            { label: this.t('transactions.table.ytd'),     value: 'ytd' as const },
        ];
    }

    // ── Dialog state ──────────────────────────────────────────────
    dialogVisible  = false;
    editingRecord: TransactionRecord | null = null;
    editDate: Date | null = null;
    // Cap the picker at today: a transaction records money that already moved,
    // and saving it updates the account balance immediately, so a future date
    // makes no sense. Refreshed each time the dialog opens (session midnight).
    maxDate = new Date();
    // formType is a Signal so computed() can track changes reactively
    formType = signal<'Income' | 'Expense' | 'Transfer'>('Expense');
    form: { amount: number; currency: string; remarks: string; category: string; accountId?: number; fromAccountId?: number; toAccountId?: number } = {
        amount: 0, currency: this.cs.config().code, remarks: '', category: EXPENSE_CATEGORIES[0], accountId: undefined, fromAccountId: undefined, toAccountId: undefined
    };

    /** Currencies a transaction can be entered in. */
    readonly currencyOptions = [
        { label: 'FCFA (Afrique de l\'Ouest)', value: 'XOF' },
        { label: 'FCFA (Afrique centrale)', value: 'XAF' },
        { label: 'Euro (€)', value: 'EUR' },
        { label: 'Dollar ($)', value: 'USD' },
    ];

    /** Symbol for the currently selected transaction currency. */
    curSymbol(): string {
        const c = this.form.currency;
        return this.cs.symbolFor(c);
    }

    // Monetary accounts (cash / savings / mobile money) for the account selector
    private static readonly MONETARY_CATEGORIES = ['cash', 'savings_account', 'mobile_money'];
    accountOptions = signal<{ label: string; value: number }[]>([]);

    // Built-ins for the type + the user's custom categories of that kind (PRO-4).
    readonly currentCategories = computed(() => {
        const builtins = this.formType() === 'Income' ? [...INCOME_CATEGORIES] : [...EXPENSE_CATEGORIES];
        const customs = this.customCat.forType(this.formType()).map(c => c.value);
        return [...builtins, ...customs];
    });

    getCatConfig(cat: string) {
        if (CustomCategoryService.isCustom(cat)) {
            const r = this.customCat.resolve(cat);
            return { label: r.label, icon: r.icon, color: r.color, bg: '' };
        }
        return CATEGORY_CONFIG[cat] ?? { label: cat, icon: 'pi pi-circle', color: '#94a3b8', bg: '' };
    }

    /** Localized label for a built-in, or the user's label for a custom category. */
    categoryLabel(cat: string | undefined | null): string {
        return this.customCat.label(cat);
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

    /** The active period: an explicit range wins over the month navigator. */
    readonly periodRecords = computed(() => {
        const recs = this.allRecords();
        if (this.rangeActive()) {
            // toDateStr, not toISOString: a picker Date is local midnight and
            // toISOString would shift it a day in a negative-offset zone.
            const from = this.toDateStr(this.dateFrom()!);
            const to   = this.toDateStr(this.dateTo()!);
            const [lo, hi] = from <= to ? [from, to] : [to, from];
            return recs.filter(r => r.date >= lo && r.date <= hi);
        }
        const ym = this.selectedYearMonth();
        return recs.filter(r => r.date.startsWith(ym));
    });

    readonly filteredRecords = computed(() => {
        const filter = this.typeFilter();
        const q      = this.search().toLowerCase().trim();
        const cats    = this.catFilter();
        const accts   = this.accountFilter();

        return this.periodRecords()
            .filter(r => filter === 'all' || r.type === filter)
            .filter(r => !cats.length || cats.includes(r.category ?? ''))
            .filter(r => !accts.length || [r.accountId, r.fromAccountId, r.toAccountId]
                .some(id => id != null && accts.includes(id)))
            .filter(r => !q ||
                (r.name    || '').toLowerCase().includes(q) ||
                (r.remarks || '').toLowerCase().includes(q));
    });

    /** Any filter beyond the period is narrowing the list (drives the empty copy
     *  and whether "clear filters" is offered). */
    readonly hasActiveFilters = computed(() =>
        !!this.search() || this.typeFilter() !== 'all'
        || this.catFilter().length > 0 || this.accountFilter().length > 0);

    /** Flat view-model for the table: every column a plain sortable field. */
    readonly tableRows = computed((): TxTableRow[] =>
        this.filteredRecords().map(r => ({
            rec: r,
            key: r.id ?? `${r.date}-${r.amount}-${r.category ?? ''}`,
            date: r.date,
            dateLabel: this.formatShortDate(r.date),
            label: r.remarks || this.categoryLabel(r.category),
            catLabel: this.categoryLabel(r.category),
            catFg: this.categoryFg(r),
            catBg: this.categoryBg(r),
            icon: this.getCategoryConfig(r).icon,
            account: this.accountLabel(r),
            type: r.type,
            amount: r.amount,
            signed: r.type === 'Income' ? r.amount : -r.amount,
        })),
    );

    /** Category filter options, built from what the PERIOD actually contains, so
     *  the picker never offers a category with zero rows behind it. */
    readonly categoryOptions = computed(() => {
        const seen = new Set<string>();
        for (const r of this.periodRecords()) if (r.category) seen.add(r.category);
        return [...seen]
            .map(c => ({ label: this.categoryLabel(c), value: c }))
            .sort((a, b) => a.label.localeCompare(b.label));
    });

    /** Account filter options, likewise restricted to accounts in the period. */
    readonly accountFilterOptions = computed(() => {
        const seen = new Map<number, string>();
        for (const r of this.periodRecords()) {
            if (r.accountId != null && r.accountName) seen.set(r.accountId, r.accountName);
            if (r.fromAccountId != null && r.fromAccountName) seen.set(r.fromAccountId, r.fromAccountName);
            if (r.toAccountId != null && r.toAccountName) seen.set(r.toAccountId, r.toAccountName);
        }
        return [...seen.entries()]
            .map(([value, label]) => ({ label, value }))
            .sort((a, b) => a.label.localeCompare(b.label));
    });

    /** Categories offered for a bulk re-categorise, keyed off the types actually
     *  selected: re-tagging an income row as "groceries" is never intended. */
    readonly bulkCategoryOptions = computed(() => {
        const keys = new Set(this.selectedKeys());
        const picked = this.tableRows().filter(r => keys.has(r.key)).map(r => r.rec);
        const types = new Set(picked.map(r => r.type));
        if (types.size !== 1) return [];
        const type = [...types][0];
        if (type === 'Transfer') return [];
        const builtin = type === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
        const custom = this.customCat.forType(type).map(c => `custom:${c.id}`);
        return [...builtin, ...custom]
            .map(c => ({ label: this.categoryLabel(c), value: c }))
            .sort((a, b) => a.label.localeCompare(b.label));
    });

    readonly monthSummary = computed(() => {
        // Follows the ACTIVE period, so a custom range never shows a month's
        // KPIs over a range's rows. Type/category/account filters deliberately
        // do NOT narrow it: these are the period's totals, not the selection's.
        const recs = this.periodRecords();
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
        // Load the user's custom categories (PRO-4) for the pickers + row labels.
        this.customCat.load();
        // Restore filters from the URL (P3-8) before enabling the write-back effect.
        const qp = this.route.snapshot.queryParamMap;
        const mo = Number(qp.get('month'));
        if (mo >= 1 && mo <= 12) this._selectedMonth.set(mo);
        const yr = Number(qp.get('year'));
        if (yr > 2000 && yr < 3000) this._selectedYear.set(yr);
        const ty = qp.get('type');
        if (ty === 'Income' || ty === 'Expense' || ty === 'Transfer') this.typeFilter.set(ty);
        const q = qp.get('q');
        if (q) this.search.set(q);
        const cat = qp.get('cat');
        if (cat) this.catFilter.set(cat.split(',').filter(Boolean));
        const acct = qp.get('acct');
        if (acct) {
            this.accountFilter.set(
                acct.split(',').map(Number).filter(n => Number.isFinite(n)),
            );
        }
        // Both ends or neither: a half-open range would silently show everything
        // from one bound, which reads as the filter being broken.
        const from = this.parseDateParam(qp.get('from'));
        const to   = this.parseDateParam(qp.get('to'));
        if (from && to) { this.dateFrom.set(from); this.dateTo.set(to); }
        this.urlReady = true;

        this.load();
        // Reflect a quick-add from the FAB without leaving the page.
        this.sub = this.state.transactionsUpdated$.subscribe(() => this.load());
    }

    ngOnDestroy() {
        this.sub?.unsubscribe();
    }

    private async load() {
        // No-flash revisit: render the cached log synchronously and only skeleton
        // on a cold first load; getRecords() refreshes in the bg (stale-while-revalidate).
        if (this.transactionsService.hasCachedRecords()) {
            this.allRecords.set(this.transactionsService.getCachedRecords());
            this.emitMonth();
        }
        this.loading.set(!this.transactionsService.hasCachedRecords());
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

    /** A CSV import committed rows outside TransactionsService: drop the stale
     *  cache, reload the log, and notify other widgets (dashboard, recent tx). */
    onImported() {
        this.transactionsService.clearCache();
        this.state.notifyTransactionsUpdated();
        this.load();
    }

    private async loadAccounts() {
        try {
            const assets = await this.patrimoineService.getAssets();
            this.accountOptions.set(
                assets
                    .filter(a => TransactionLogs.MONETARY_CATEGORIES.includes(a.category))
                    // Balance in the label: the account moves with each
                    // transaction now (S11-TX-1), show the effect at entry time.
                    .map(a => ({ label: `${a.name} · ${this.cs.format(a.value)}`, value: a.id }))
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
        this.maxDate = new Date();
        this.editDate = new Date();
        this.formType.set('Expense');
        this.form = { amount: 0, currency: this.cs.config().code, remarks: '', category: EXPENSE_CATEGORIES[0], accountId: undefined, fromAccountId: undefined, toAccountId: undefined };
        this.submitted = false;
        this.dialogVisible = true;
    }

    editRecord(rec: TransactionRecord) {
        this.editingRecord = rec;
        this.maxDate = new Date();
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
                this.messageService.add({ severity: 'success', summary: this.t('common.success'), detail: this.t('transactions.toast.updatedDetail'), life: 3000 });
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
                this.messageService.add({ severity: 'success', summary: this.t('common.success'), detail: this.t('transactions.toast.savedDetail'), life: 3000 });
            }
            this.dialogVisible = false;
        } catch (err: any) {
            this.messageService.add({ severity: 'error', summary: this.t('common.error'),
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
                    this.messageService.add({ severity: 'success', summary: this.t('common.success'), detail: this.t('transactions.toast.deletedDetail'), life: 3000 });
                } catch {
                    this.messageService.add({ severity: 'error', summary: this.t('common.error'), detail: this.t('transactions.toast.deleteError'), life: 4000 });
                }
            }
        });
    }

    // ── Helpers ───────────────────────────────────────────────────
    getCategoryConfig(rec: TransactionRecord) {
        const cat = rec.category || (rec.type === 'Income' ? 'other_income' : 'other_expense');
        if (CustomCategoryService.isCustom(cat)) {
            const r = this.customCat.resolve(cat);
            return { label: r.label, icon: r.icon, color: r.color, bg: 'bg-warm-500/10' };
        }
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
            ? `color-mix(in srgb, ${c} 25%, #F5F7FB)`
            : c;
    }

    categoryBg(rec: TransactionRecord): string {
        const c = this.getCategoryConfig(rec).color;
        // Dark: premix against the card color (surface-900). Alpha over the row
        // hover state produced muddy grey-brown chips (dark-mode program B7).
        return this.layoutService.isDarkTheme()
            ? `color-mix(in srgb, ${c} 28%, #111B2E)`
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

    /** yyyy-mm-dd from the URL to a LOCAL midnight Date (never `new Date(str)`,
     *  which parses a bare date as UTC and lands on the previous day west of
     *  Greenwich). */
    private parseDateParam(v: string | null): Date | null {
        if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
        const [y, m, d] = v.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        return Number.isNaN(dt.getTime()) ? null : dt;
    }

    /** Compact table date ("12 août" / "Aug 12"), noon-anchored so a DST shift
     *  can't roll it back a day. */
    private formatShortDate(dateStr: string): string {
        return new Date(dateStr + 'T12:00:00')
            .toLocaleDateString(this.dateLocale(), { day: 'numeric', month: 'short', year: '2-digit' });
    }

    // ── Desktop table: filters, bulk actions, export (P1-2) ───────

    /** Quick range presets. Anchored on today rather than the selected month:
     *  "last 3 months" means the last 3 from now, which is what it says. */
    applyPreset(preset: '3m' | '12m' | 'ytd'): void {
        const now = new Date();
        const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let from: Date;
        if (preset === 'ytd') from = new Date(now.getFullYear(), 0, 1);
        else from = new Date(now.getFullYear(), now.getMonth() - (preset === '3m' ? 2 : 11), 1);
        this.dateFrom.set(from);
        this.dateTo.set(to);
        this.clearSelection();
    }

    /** Back to the month navigator. */
    clearRange(): void {
        this.dateFrom.set(null);
        this.dateTo.set(null);
        this.clearSelection();
    }

    clearFilters(): void {
        this.search.set('');
        this.typeFilter.set('all');
        this.catFilter.set([]);
        this.accountFilter.set([]);
        this.clearSelection();
    }

    /** Label for the active period, used by the range pill and the CSV name. */
    readonly periodLabel = computed(() => {
        if (!this.rangeActive()) return this.monthLabel();
        const fmt = (d: Date) => d.toLocaleDateString(this.dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
        return `${fmt(this.dateFrom()!)} - ${fmt(this.dateTo()!)}`;
    });

    onSelectionChange(keys: string[]): void {
        this.selectedKeys.set(keys);
        // A category chosen for a previous selection must not carry over to a
        // new one whose type no longer allows it.
        if (!this.bulkCategoryOptions().some(o => o.value === this.bulkCategory())) {
            this.bulkCategory.set(null);
        }
    }

    private clearSelection(): void {
        this.selectedKeys.set([]);
        this.bulkCategory.set(null);
        this.table?.clearSelection();
    }

    private selectedRecords(): TransactionRecord[] {
        const keys = new Set(this.selectedKeys());
        return this.tableRows().filter(r => keys.has(r.key)).map(r => r.rec);
    }

    bulkDelete(): void {
        const recs = this.selectedRecords().filter(r => !!r.id);
        if (!recs.length) return;
        this.confirmationService.confirm({
            message: this.t('transactions.table.bulkDeleteConfirm', { n: recs.length }),
            header: this.t('transactions.confirm.header'),
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: this.t('transactions.confirm.accept'),
            rejectLabel: this.t('transactions.confirm.reject'),
            acceptButtonStyleClass: '!bg-negative !border-negative',
            accept: async () => {
                const ids = recs.map(r => r.id!);
                this.isBulking.set(true);
                try {
                    await this.transactionsService.deleteRecords(ids);
                    const gone = new Set(ids);
                    this.allRecords.update(rs => rs.filter(r => !r.id || !gone.has(r.id)));
                    // Each delete moves an account balance (S11-TX-1), so the
                    // rest of the app has to hear about it.
                    this.state.notifyTransactionsUpdated();
                    this.messageService.add({ severity: 'success', summary: this.t('common.success'), detail: this.t('transactions.table.bulkDeleted', { n: ids.length }), life: 3000 });
                    this.clearSelection();
                } catch {
                    this.messageService.add({ severity: 'error', summary: this.t('common.error'), detail: this.t('transactions.toast.deleteError'), life: 4000 });
                    // The server is the truth after a partial failure.
                    this.transactionsService.clearCache();
                    this.load();
                } finally {
                    this.isBulking.set(false);
                }
            },
        });
    }

    async bulkRecategorize(): Promise<void> {
        const cat = this.bulkCategory();
        const recs = this.selectedRecords().filter(r => !!r.id && r.category !== cat);
        if (!cat || !recs.length) return;
        this.isBulking.set(true);
        let failed = 0;
        for (const rec of recs) {
            try {
                // `updateRecord` sends `amount` as the NATIVE amount (paired
                // with `currency`), but TransactionRecord.amount is EUR-base
                // everywhere else in the app. Spreading the record unchanged
                // therefore posts the EUR value as XOF and divides every
                // amount by the 655.957 peg: a 1 000 XOF row was rewritten to
                // 1.52 and the account balance moved with it. The edit dialog
                // avoids this by sending the native form input, so a bulk edit
                // has to do the same explicitly.
                await this.transactionsService.updateRecord({
                    ...rec,
                    amount: rec.nativeAmount ?? rec.amount,
                    category: cat,
                });
            } catch {
                failed++;
            }
        }
        this.isBulking.set(false);
        if (failed) {
            this.messageService.add({ severity: 'error', summary: this.t('common.error'), detail: this.t('transactions.table.bulkPartial', { n: failed }), life: 4000 });
        } else {
            this.messageService.add({ severity: 'success', summary: this.t('common.success'), detail: this.t('transactions.table.bulkRecategorized', { n: recs.length }), life: 3000 });
        }
        this.clearSelection();
        // Re-read rather than patching locally: updateRecord can normalise
        // fields server-side, and a partial failure leaves a mixed state.
        this.transactionsService.clearCache();
        this.state.notifyTransactionsUpdated();
        this.load();
    }

    /**
     * CSV of the CURRENT filter, built client-side.
     *
     * `GET /export/transactions.csv` takes no parameters (verified in the
     * OpenAPI schema), so it can only ever return everything. Exporting the
     * filtered view is the whole point of the filters, so the rows are
     * serialised here from what the table is showing.
     *
     * Amounts are converted EUR-base to the display currency exactly once, then
     * written as a raw machine-readable number (dot decimal, no grouping)
     * rather than through a CurrencyService formatter. A formatted FR string is
     * "1 234,56" with a narrow no-break space, which no spreadsheet parses back
     * into a number, and the mask in format()/formatNumber() would export
     * bullets whenever the privacy eye happened to be shut.
     */
    exportCsv(): void {
        const rows = this.tableRows();
        if (!rows.length) return;
        const cur = this.cs.currencyCode();
        const head = [
            this.t('common.date'),
            this.t('transactions.table.description'),
            this.t('common.type'),
            this.t('transactions.table.category'),
            this.t('common.account'),
            `${this.t('common.amount')} (${cur})`,
        ];
        const body = rows.map(r => [
            r.date,
            r.label,
            r.type,
            r.catLabel,
            r.account,
            this.cs.convert(r.signed).toFixed(2),
        ]);
        const csv = [head, ...body]
            .map(cols => cols.map(c => this.csvCell(c)).join(','))
            .join('\r\n');
        // BOM so Excel opens the accented FR labels as UTF-8 instead of mojibake.
        this.downloadCsv('﻿' + csv);
    }

    /**
     * RFC 4180 quoting, plus the CSV-injection guard: a cell starting with
     * = + - @ is run as a formula by Excel/Sheets on open, so it gets an
     * apostrophe prefix that forces it to text.
     *
     * A plain negative number is EXEMPT. It trips the `-` rule but is not a
     * formula, and prefixing it shipped `'-20000.00`, which imports as text and
     * makes every expense unsummable, i.e. it broke the one thing the export is
     * for. Only a leading `-` followed by something non-numeric is a risk.
     */
    private csvCell(value: string): string {
        const s = String(value ?? '');
        const plainNumber = /^-?\d+(\.\d+)?$/.test(s);
        const risky = !plainNumber && /^[=+\-@\t\r]/.test(s);
        const out = risky ? `'${s}` : s;
        return `"${out.replace(/"/g, '""')}"`;
    }

    /** ISO period in the filename: sorts chronologically in a file listing, and
     *  survives accents (a localised "1 août 2026" slugged to "1-ao-t-2026"). */
    private periodSlug(): string {
        if (this.rangeActive()) {
            const from = this.toDateStr(this.dateFrom()!);
            const to   = this.toDateStr(this.dateTo()!);
            return from <= to ? `${from}_${to}` : `${to}_${from}`;
        }
        return this.selectedYearMonth();
    }

    private downloadCsv(content: string): void {
        const slug = this.periodSlug();
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `omaad-transactions-${slug || 'export'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
}
