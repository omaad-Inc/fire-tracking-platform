import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Table, TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TransactionsService, TransactionRecord } from '../../service/transactions.service';
import { DatePickerModule } from 'primeng/datepicker';
import { I18nService } from '../../../i18n/i18n.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';

interface Column {
    field: string;
    header: string;
    customExportHeader?: string;
}

interface ExportColumn {
    title: string;
    dataKey: string;
}

// TransactionRecord imported from TransactionsService

@Component({
    selector: 'app-transaction-logs',
    standalone: true,
    imports: [
        CommonModule,
        TableModule,
        FormsModule,
        ButtonModule,
        ToastModule,
        ToolbarModule,
        InputTextModule,
        TextareaModule,
        SelectModule,
        InputNumberModule,
        DialogModule,
        TagModule,
        InputIconModule,
        IconFieldModule,
        ConfirmDialogModule,
        DatePickerModule,
        AppAmountComponent
    ],
    template: `
        <p-toast position="top-center" />
        <p-toolbar styleClass="mb-6">
            <ng-template #start>
                <p-button [label]="t('transactions.new')" icon="pi pi-plus" severity="secondary" class="mr-2" (onClick)="openNew()" />
                <p-button severity="secondary" [label]="t('transactions.delete')" icon="pi pi-trash" outlined (onClick)="deleteSelectedRecords()" [disabled]="!selectedRecords || !selectedRecords.length" />
            </ng-template>

            <ng-template #end>
                <p-button [label]="t('transactions.export')" icon="pi pi-upload" severity="secondary" (onClick)="exportCSV()" />
            </ng-template>
        </p-toolbar>

        <p-table
            #dt
            [value]="records()"
            [rows]="10"
            [columns]="cols"
            [paginator]="true"
            [globalFilterFields]="['date', 'name', 'type', 'amount', 'account', 'remarks']"
            [tableStyle]="{ 'min-width': '75rem' }"
            [(selection)]="selectedRecords"
            [rowHover]="true"
            dataKey="id"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} records"
            [showCurrentPageReport]="true"
            [rowsPerPageOptions]="[10, 20, 30]"
        >
            <ng-template #caption>
                <div class="flex items-center justify-between">
                    <h5 class="m-0">{{ t('transactions.logTitle') }}</h5>
                    <p-iconfield>
                        <p-inputicon styleClass="pi pi-search" />
                        <input pInputText type="text" (input)="onGlobalFilter(dt, $event)" [placeholder]="t('common.search')" />
                    </p-iconfield>
                </div>
            </ng-template>
            <ng-template #header>
                <tr>
                    <th style="width: 3rem">
                        <p-tableHeaderCheckbox />
                    </th>
                    <th pSortableColumn="date" style="min-width: 10rem">
                        {{ t('common.date') }}
                        <p-sortIcon field="date" />
                    </th>
                    <th style="min-width: 18rem">{{ t('common.name') }}</th>
                    <th style="min-width: 10rem">{{ t('common.type') }}</th>
                    <th style="min-width: 10rem">{{ t('common.amount') }}</th>
                    <th style="min-width: 12rem">{{ t('common.account') }}</th>
                    <th style="min-width: 20rem">{{ t('common.remarks') }}</th>
                    <th style="min-width: 12rem"></th>
                </tr>
            </ng-template>
            <ng-template #body let-record>
                <tr>
                    <td style="width: 3rem">
                        <p-tableCheckbox [value]="record" />
                    </td>
                    <td>{{ record.date }}</td>
                    <td>
                        <div class="font-semibold text-surface-900 dark:text-surface-0">{{ record.name }}</div>
                    </td>
                    <td>
                        <p-tag [value]="record.type" [severity]="getSeverityType(record.type)" />
                    </td>
                    <td class="text-right"><app-amount [value]="record.amount" /></td>
                    <td>{{ record.account }}</td>
                    <td>{{ record.remarks }}</td>
                    <td>
                        <p-button icon="pi pi-pencil" class="mr-2" [rounded]="true" [outlined]="true" (click)="editRecord(record)" />
                        <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [outlined]="true" (click)="deleteRecord(record)" />
                    </td>
                </tr>
            </ng-template>
            <ng-template #emptymessage>
                <tr>
                    <td [attr.colspan]="8">
                        <div class="flex flex-col items-center justify-center py-16 text-center">
                            <div class="w-16 h-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
                                <i class="pi pi-arrow-right-arrow-left text-2xl text-surface-400"></i>
                            </div>
                            <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-2">Aucune transaction</h3>
                            <p class="text-surface-500 dark:text-surface-400 text-sm mb-6 max-w-sm">
                                Enregistrez vos revenus et dépenses pour suivre votre progression financière.
                            </p>
                            <button pButton
                                    icon="pi pi-plus"
                                    label="Ajouter une transaction"
                                    (click)="openNew()"
                                    class="!bg-gradient-to-r !from-indigo-600 !to-cyan-500 !border-0 !text-white"
                            ></button>
                        </div>
                    </td>
                </tr>
            </ng-template>
        </p-table>

        <p-dialog [(visible)]="transactionDialog" 
                  [style]="{ width: '95vw', maxWidth: '600px' }" 
                  [breakpoints]="{ '768px': '95vw' }"
                  [modal]="true"
                  [draggable]="false"
                  [resizable]="false"
                  styleClass="!rounded-2xl overflow-hidden">
            <ng-template #header>
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <i class="pi pi-wallet text-white text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 m-0">{{ t('transactions.detailsTitle') }}</h3>
                        <p class="text-surface-500 dark:text-surface-400 text-sm m-0">Remplissez les informations de la transaction</p>
                    </div>
                </div>
            </ng-template>
            
            <ng-template #content>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4">
                    <!-- Date -->
                    <div class="flex flex-col gap-2">
                        <label for="date" class="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-medium text-sm">
                            <i class="pi pi-calendar text-indigo-500"></i>
                            {{ t('common.date') }}
                        </label>
                        <p-datepicker id="date" [(ngModel)]="editDate" [showIcon]="true" [showButtonBar]="true"
                                      inputId="date" dateFormat="yy-mm-dd" required
                                      styleClass="w-full"
                                      inputStyleClass="!py-3 !rounded-xl !border-surface-300 dark:!border-surface-600 focus:!border-indigo-500" />
                        <small class="text-rose-500 text-xs" *ngIf="submitted && !editDate">
                            <i class="pi pi-exclamation-circle mr-1"></i>{{ t('transactions.messages.dateRequired') }}
                        </small>
                    </div>
                    
                    <!-- Name -->
                    <div class="flex flex-col gap-2">
                        <label for="name" class="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-medium text-sm">
                            <i class="pi pi-tag text-cyan-500"></i>
                            {{ t('common.name') }}
                        </label>
                        <input pInputText id="name" [(ngModel)]="record.name" required 
                               class="w-full !py-3 !rounded-xl !border-surface-300 dark:!border-surface-600 focus:!border-indigo-500"
                               placeholder="Ex: Salaire, Courses..." />
                        <small class="text-rose-500 text-xs" *ngIf="submitted && !record.name">
                            <i class="pi pi-exclamation-circle mr-1"></i>{{ t('transactions.messages.nameRequired') }}
                        </small>
                    </div>
                    
                    <!-- Type -->
                    <div class="flex flex-col gap-2">
                        <label for="type" class="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-medium text-sm">
                            <i class="pi pi-arrows-h text-emerald-500"></i>
                            {{ t('common.type') }}
                        </label>
                        <p-select [(ngModel)]="record.type" inputId="type" [options]="types" 
                                  optionLabel="label" optionValue="value" placeholder="Sélectionner un type" 
                                  styleClass="w-full !rounded-xl" />
                    </div>
                    
                    <!-- Amount -->
                    <div class="flex flex-col gap-2">
                        <label for="amount" class="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-medium text-sm">
                            <i class="pi pi-euro text-amber-500"></i>
                            {{ t('common.amount') }}
                        </label>
                        <p-inputnumber id="amount" [(ngModel)]="record.amount" mode="currency" currency="EUR" locale="fr-FR" 
                                       styleClass="w-full"
                                       inputStyleClass="!py-3 !rounded-xl !border-surface-300 dark:!border-surface-600 focus:!border-indigo-500" />
                    </div>
                    
                    <!-- Account -->
                    <div class="flex flex-col gap-2 sm:col-span-2">
                        <label for="account" class="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-medium text-sm">
                            <i class="pi pi-credit-card text-violet-500"></i>
                            {{ t('common.account') }}
                        </label>
                        <p-select [(ngModel)]="record.account" inputId="account" [options]="accounts" 
                                  optionLabel="label" optionValue="value" placeholder="Sélectionner un compte" 
                                  styleClass="w-full !rounded-xl" />
                    </div>
                    
                    <!-- Remarks -->
                    <div class="flex flex-col gap-2 sm:col-span-2">
                        <label for="remarks" class="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-medium text-sm">
                            <i class="pi pi-comment text-surface-400"></i>
                            {{ t('common.remarks') }}
                        </label>
                        <textarea id="remarks" pTextarea [(ngModel)]="record.remarks" rows="3" 
                                  class="w-full !rounded-xl !border-surface-300 dark:!border-surface-600 focus:!border-indigo-500 resize-none"
                                  placeholder="Notes ou commentaires..."></textarea>
                    </div>
                </div>
            </ng-template>

            <ng-template #footer>
                <div class="flex flex-col sm:flex-row gap-3 w-full pt-2">
                    <p-button [label]="t('common.cancel')" icon="pi pi-times" 
                              [outlined]="true" 
                              (click)="hideDialog()" 
                              styleClass="flex-1 !rounded-xl !py-3 !border-surface-300 dark:!border-surface-600 hover:!bg-surface-100 dark:hover:!bg-surface-800" />
                    <p-button [label]="t('common.save')" icon="pi pi-check"
                              [loading]="isSaving()"
                              (click)="saveRecord()"
                              styleClass="flex-1 !rounded-xl !py-3 !bg-gradient-to-r !from-indigo-600 !to-cyan-500 hover:!from-indigo-700 hover:!to-cyan-600 !border-0" />
                </div>
            </ng-template>
        </p-dialog>

        <p-confirmdialog [style]="{ width: '450px' }" />
    `,
    providers: [MessageService, ConfirmationService]
})
export class TransactionLogs implements OnInit {
    transactionDialog: boolean = false;
    isSaving = signal(false);

    records = signal<TransactionRecord[]>([]);
    record!: TransactionRecord;
    editDate: Date | null = null;
    selectedRecords!: TransactionRecord[] | null;
    submitted: boolean = false;
    types = [
        { label: 'Income', value: 'Income' },
        { label: 'Expense', value: 'Expense' }
    ];
    accounts = [
        { label: 'SG BANK', value: 'SG BANK' },
        { label: 'Revolut', value: 'Revolut' },
        { label: 'Trade Republic', value: 'Trade Republic' },
        { label: 'N26', value: 'N26' }
    ];
    @ViewChild('dt') dt!: Table;
    exportColumns!: ExportColumn[];
    cols!: Column[];

    constructor(
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private transactionsService: TransactionsService,
        private i18n: I18nService
    ) {}

    exportCSV() {
        this.dt.exportCSV();
    }

    ngOnInit() {
        this.loadFromService();
    }

    loadFromService() {
        this.transactionsService.getRecords().then((data) => {
            this.records.set(data);
            this.cols = [
                { field: 'date', header: this.t('common.date') },
                { field: 'name', header: this.t('common.name') },
                { field: 'type', header: this.t('common.type') },
                { field: 'amount', header: this.t('common.amount') },
                { field: 'account', header: this.t('common.account') },
                { field: 'remarks', header: this.t('common.remarks') }
            ];
            this.exportColumns = this.cols.map((col) => ({ title: col.header, dataKey: col.field }));
        });
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    openNew() {
        this.record = { date: '', name: '', type: 'Income', amount: 0, account: '', remarks: '' };
        this.editDate = null;
        this.submitted = false;
        this.transactionDialog = true;
    }

    editRecord(record: TransactionRecord) {
        this.record = { ...record };
        // Convert date string to Date object for p-datepicker
        this.editDate = record.date ? new Date(record.date) : null;
        this.submitted = false;
        this.transactionDialog = true;
    }

    deleteSelectedRecords() {
        this.confirmationService.confirm({
            message: this.t('transactions.messages.deleteSelectedConfirm'),
            header: 'Confirm',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                const ids = (this.selectedRecords || []).map((r) => r.id!).filter(Boolean);
                try {
                    await this.transactionsService.deleteRecords(ids);
                    this.records.set(this.records().filter((val) => !ids.includes(val.id!)));
                    this.selectedRecords = null;
                    this.messageService.add({
                        severity: 'success',
                        summary: this.t('transactions.messages.successful'),
                        detail: this.t('transactions.messages.recordsDeleted'),
                        life: 3000
                    });
                } catch {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer les transactions', life: 5000 });
                }
            }
        });
    }

    hideDialog() {
        this.transactionDialog = false;
        this.submitted = false;
    }

    deleteRecord(record: TransactionRecord) {
        this.confirmationService.confirm({
            message: this.t('transactions.messages.deleteOneConfirm', { name: record.name || '' }),
            header: 'Confirm',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                if (!record.id) return;
                try {
                    await this.transactionsService.deleteRecords([record.id]);
                    this.records.set(this.records().filter((val) => val.id !== record.id));
                    this.messageService.add({
                        severity: 'success',
                        summary: this.t('transactions.messages.successful'),
                        detail: this.t('transactions.messages.recordDeleted'),
                        life: 3000
                    });
                } catch {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer la transaction', life: 5000 });
                }
            }
        });
    }

    findIndexById(id: string): number {
        let index = -1;
        for (let i = 0; i < this.records().length; i++) {
            if (this.records()[i].id === id) {
                index = i;
                break;
            }
        }
        return index;
    }

    async saveRecord() {
        this.submitted = true;

        // Validation: require date and amount
        if (!this.editDate || !this.record.amount || this.record.amount <= 0) return;

        // Inject the picked date back into the record as a YYYY-MM-DD string
        const d = this.editDate;
        this.record.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        // Default name if empty
        if (!this.record.name?.trim()) {
            this.record.name = this.record.type === 'Income' ? 'Revenu' : 'Dépense';
        }

        this.isSaving.set(true);
        const _records = this.records();

        try {
            if (this.record.id) {
                const updated = await this.transactionsService.updateRecord(this.record);
                const idx = this.findIndexById(updated.id!);
                if (idx !== -1) _records[idx] = updated;
                this.records.set([..._records]);
                this.messageService.add({
                    severity: 'success',
                    summary: this.t('transactions.messages.successful'),
                    detail: this.t('transactions.messages.recordUpdated'),
                    life: 3000
                });
            } else {
                const created = await this.transactionsService.addRecord(this.record);
                this.records.set([..._records, created]);
                this.messageService.add({
                    severity: 'success',
                    summary: this.t('transactions.messages.successful'),
                    detail: this.t('transactions.messages.recordCreated'),
                    life: 3000
                });
            }
            this.transactionDialog = false;
            this.submitted = false;
            this.editDate = null;
            this.record = { date: '', name: '', type: 'Income', amount: 0, account: '', remarks: '' };
        } catch (error: any) {
            const detail = error?.error?.detail
                ? (typeof error.error.detail === 'string' ? error.error.detail : JSON.stringify(error.error.detail).slice(0, 120))
                : 'Impossible d\'enregistrer la transaction';
            this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 6000 });
        } finally {
            this.isSaving.set(false);
        }
    }

    getSeverityType(type: string) {
        switch (type) {
            case 'Income':
                return 'success';
            case 'Expense':
                return 'danger';
            default:
                return 'info';
        }
    }

    t(key: string, params?: any) { return this.i18n.t(key, params); }
}
