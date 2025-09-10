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
import { Product, ProductService } from '../service/product.service';
import { TransactionsService, TransactionRecord } from '../service/transactions.service';
import { DatePickerModule } from 'primeng/datepicker';

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
    selector: 'app-transaction',
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
        DatePickerModule
    ],
    template: `
        <p-toolbar styleClass="mb-6">
            <ng-template #start>
                <p-button label="New" icon="pi pi-plus" severity="secondary" class="mr-2" (onClick)="openNew()" />
                <p-button severity="secondary" label="Delete" icon="pi pi-trash" outlined (onClick)="deleteSelectedRecords()" [disabled]="!selectedRecords || !selectedRecords.length" />
            </ng-template>

            <ng-template #end>
                <p-button label="Export" icon="pi pi-upload" severity="secondary" (onClick)="exportCSV()" />
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
                    <h5 class="m-0">Transaction Log</h5>
                    <p-iconfield>
                        <p-inputicon styleClass="pi pi-search" />
                        <input pInputText type="text" (input)="onGlobalFilter(dt, $event)" placeholder="Search..." />
                    </p-iconfield>
                </div>
            </ng-template>
            <ng-template #header>
                <tr>
                    <th style="width: 3rem">
                        <p-tableHeaderCheckbox />
                    </th>
                    <th pSortableColumn="date" style="min-width: 10rem">
                        Date
                        <p-sortIcon field="date" />
                    </th>
                    <th style="min-width: 18rem">Name</th>
                    <th style="min-width: 10rem">Type</th>
                    <th style="min-width: 10rem">Amount</th>
                    <th style="min-width: 12rem">Account</th>
                    <th style="min-width: 20rem">Remarks</th>
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
                    <td class="text-right">{{ record.amount | currency: 'EUR' }}</td>
                    <td>{{ record.account }}</td>
                    <td>{{ record.remarks }}</td>
                    <td>
                        <p-button icon="pi pi-pencil" class="mr-2" [rounded]="true" [outlined]="true" (click)="editRecord(record)" />
                        <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [outlined]="true" (click)="deleteRecord(record)" />
                    </td>
                </tr>
            </ng-template>
        </p-table>

        <p-dialog [(visible)]="transactionDialog" [style]="{ width: '450px' }" header="Transaction Details" [modal]="true">
            <ng-template #content>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="date" class="block font-bold mb-3">Date</label>
                        <p-datepicker id="date" [(ngModel)]="record.date" [showIcon]="true" [showButtonBar]="true" inputId="date" dateFormat="yy-mm-dd" required class="w-full" />
                        <small class="text-red-500" *ngIf="submitted && !record.date">Date is required.</small>
                    </div>
                    <div>
                        <label for="name" class="block font-bold mb-3">Name</label>
                        <input pInputText id="name" [(ngModel)]="record.name" required class="w-full" />
                        <small class="text-red-500" *ngIf="submitted && !record.name">Name is required.</small>
                    </div>
                    <div>
                        <label for="type" class="block font-bold mb-3">Type</label>
                        <p-select [(ngModel)]="record.type" inputId="type" [options]="types" optionLabel="label" optionValue="value" placeholder="Select a Type" class="w-full" />
                    </div>
                    <div>
                        <label for="amount" class="block font-bold mb-3">Amount</label>
                        <p-inputnumber id="amount" [(ngModel)]="record.amount" mode="currency" currency="EUR" locale="fr-FR" class="w-full" />
                    </div>
                    <div>
                        <label for="account" class="block font-bold mb-3">Account</label>
                        <p-select [(ngModel)]="record.account" inputId="account" [options]="accounts" optionLabel="label" optionValue="value" placeholder="Select an Account" class="w-full" />
                    </div>
                    <div class="mb-8 md:col-span-2">
                        <label for="remarks" class="block font-bold mb-3">Remarks</label>
                        <textarea id="remarks" pTextarea [(ngModel)]="record.remarks" rows="3" cols="20" class="w-full"></textarea>
                    </div>
                </div>
            </ng-template>

            <ng-template #footer>
                <p-button label="Cancel" icon="pi pi-times" text (click)="hideDialog()" />
                <p-button label="Save" icon="pi pi-check" (click)="saveRecord()" />
            </ng-template>
        </p-dialog>

        <p-confirmdialog [style]="{ width: '450px' }" />
    `,
    providers: [MessageService, ProductService, ConfirmationService]
})
export class Transaction implements OnInit {
    transactionDialog: boolean = false;

    records = signal<TransactionRecord[]>([]);
    record!: TransactionRecord;
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
        private transactionsService: TransactionsService
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
                { field: 'date', header: 'Date' },
                { field: 'name', header: 'Name' },
                { field: 'type', header: 'Type' },
                { field: 'amount', header: 'Amount' },
                { field: 'account', header: 'Account' },
                { field: 'remarks', header: 'Remarks' }
            ];
            this.exportColumns = this.cols.map((col) => ({ title: col.header, dataKey: col.field }));
        });
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    openNew() {
        this.record = { date: '', name: '', type: 'Income', amount: 0, account: '', remarks: '' };
        this.submitted = false;
        this.transactionDialog = true;
    }

    editRecord(record: TransactionRecord) {
        this.record = { ...record };
        this.transactionDialog = true;
    }

    deleteSelectedRecords() {
        this.confirmationService.confirm({
            message: 'Are you sure you want to delete the selected records?',
            header: 'Confirm',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                const ids = (this.selectedRecords || []).map((r) => r.id!).filter(Boolean);
                this.transactionsService.deleteRecords(ids).then(() => {
                    this.records.set(this.records().filter((val) => !ids.includes(val.id!)));
                    this.selectedRecords = null;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Successful',
                        detail: 'Records Deleted',
                        life: 3000
                    });
                });
            }
        });
    }

    hideDialog() {
        this.transactionDialog = false;
        this.submitted = false;
    }

    deleteRecord(record: TransactionRecord) {
        this.confirmationService.confirm({
            message: 'Are you sure you want to delete ' + record.name + '?',
            header: 'Confirm',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                if (!record.id) return;
                this.transactionsService.deleteRecords([record.id]).then(() => {
                    this.records.set(this.records().filter((val) => val.id !== record.id));
                    this.record = { date: '', name: '', type: 'Income', amount: 0, account: '', remarks: '' };
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Successful',
                        detail: 'Record Deleted',
                        life: 3000
                    });
                });
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

    saveRecord() {
        this.submitted = true;
        let _records = this.records();
        if (this.record.name?.trim()) {
            if (this.record.id) {
                this.transactionsService.updateRecord(this.record).then((updated) => {
                    _records[this.findIndexById(updated.id!)] = updated;
                    this.records.set([..._records]);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Successful',
                        detail: 'Record Updated',
                        life: 3000
                    });
                });
            } else {
                this.transactionsService.addRecord(this.record).then((created) => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Successful',
                        detail: 'Record Created',
                        life: 3000
                    });
                    this.records.set([..._records, created]);
                });
            }
            this.transactionDialog = false;
            this.record = { date: '', name: '', type: 'Income', amount: 0, account: '', remarks: '' };
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
}
