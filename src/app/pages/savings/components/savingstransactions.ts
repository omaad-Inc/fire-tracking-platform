import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Table, TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { RatingModule } from 'primeng/rating';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProductService } from '../../service/product.service';

interface Column {
    field: string;
    header: string;
    customExportHeader?: string;
}

interface ExportColumn {
    title: string;
    dataKey: string;
}

interface SavingRecord {
    id?: string;
    date: string;
    type: 'Deposit' | 'Withdrawal';
    amount: number;
    name: string;
    note?: string;
}

@Component({
    selector: 'app-savings-transactions',
    standalone: true,
    imports: [
        CommonModule,
        TableModule,
        FormsModule,
        ButtonModule,
        RippleModule,
        ToastModule,
        ToolbarModule,
        RatingModule,
        InputTextModule,
        TextareaModule,
        SelectModule,
        RadioButtonModule,
        InputNumberModule,
        DialogModule,
        TagModule,
        InputIconModule,
        IconFieldModule,
        ConfirmDialogModule
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
            [globalFilterFields]="['date', 'type', 'amount', 'name', 'note']"
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
                    <h5 class="m-0">Manage Savings</h5>
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
                    <th style="min-width: 10rem">Type</th>
                    <th style="min-width: 10rem">Amount</th>
                    <th style="min-width: 16rem">Name</th>
                    <th style="min-width: 20rem">Note</th>
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
                        <p-tag [value]="record.type" [severity]="getSeverityType(record.type)" />
                    </td>
                    <td>{{ record.amount | currency: 'EUR' }}</td>
                    <td>{{ record.name }}</td>
                    <td>{{ record.note }}</td>
                    <td>
                        <p-button icon="pi pi-pencil" class="mr-2" [rounded]="true" [outlined]="true" (click)="editRecord(record)" />
                        <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [outlined]="true" (click)="deleteRecord(record)" />
                    </td>
                </tr>
            </ng-template>
        </p-table>

        <p-dialog [(visible)]="productDialog" [style]="{ width: '450px' }" header="Saving Record Details" [modal]="true">
            <ng-template #content>
                <div class="flex flex-col gap-6">
                    <div>
                        <label for="date" class="block font-bold mb-3">Date</label>
                        <input type="date" pInputText id="date" [(ngModel)]="record.date" required autofocus fluid />
                        <small class="text-red-500" *ngIf="submitted && !record.date">Date is required.</small>
                    </div>
                    <div>
                        <label for="type" class="block font-bold mb-3">Type</label>
                        <p-select [(ngModel)]="record.type" inputId="type" [options]="types" optionLabel="label" optionValue="value" placeholder="Select a Type" fluid />
                    </div>
                    <div>
                        <label for="amount" class="block font-bold mb-3">Amount</label>
                        <p-inputnumber id="amount" [(ngModel)]="record.amount" mode="currency" currency="EUR" locale="fr-FR" fluid />
                    </div>
                    <div>
                        <label for="name" class="block font-bold mb-3">Name</label>
                        <input type="text" pInputText id="name" [(ngModel)]="record.name" required fluid />
                        <small class="text-red-500" *ngIf="submitted && !record.name">Name is required.</small>
                    </div>
                    <div>
                        <label for="note" class="block font-bold mb-3">Note</label>
                        <textarea id="note" pTextarea [(ngModel)]="record.note" rows="3" cols="20" fluid></textarea>
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
export class SavingsTransactions implements OnInit {
    productDialog: boolean = false;

    records = signal<SavingRecord[]>([]);

    record!: SavingRecord;

    selectedRecords!: SavingRecord[] | null;

    submitted: boolean = false;

    types = [
        { label: 'Deposit', value: 'Deposit' },
        { label: 'Withdrawal', value: 'Withdrawal' }
    ];

    @ViewChild('dt') dt!: Table;

    exportColumns!: ExportColumn[];

    cols!: Column[];

    constructor(
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    exportCSV() {
        this.dt.exportCSV();
    }

    ngOnInit() {
        this.loadDemoData();
    }

    loadDemoData() {
        this.records.set([
            { id: '1', date: '2024-06-01', type: 'Deposit', amount: 500, name: 'Monthly Saving', note: 'Salary deposit' },
            { id: '2', date: '2024-06-10', type: 'Withdrawal', amount: 100, name: 'Gift', note: 'Birthday present for friend' },
            { id: '3', date: '2024-06-15', type: 'Deposit', amount: 200, name: 'Bonus', note: 'Performance bonus' },
            { id: '4', date: '2024-06-20', type: 'Withdrawal', amount: 50, name: 'Emergency', note: 'Unexpected expense' },
            { id: '5', date: '2024-07-01', type: 'Deposit', amount: 500, name: 'Monthly Saving', note: 'Salary deposit' },
            { id: '6', date: '2024-07-12', type: 'Withdrawal', amount: 80, name: 'Groceries', note: 'Supermarket shopping' },
            { id: '7', date: '2024-07-15', type: 'Deposit', amount: 150, name: 'Freelance', note: 'Side project payment' },
            { id: '8', date: '2024-07-20', type: 'Withdrawal', amount: 60, name: 'Transport', note: 'Car repair' },
            { id: '9', date: '2024-08-01', type: 'Deposit', amount: 500, name: 'Monthly Saving', note: 'Salary deposit' },
            { id: '10', date: '2024-08-05', type: 'Withdrawal', amount: 120, name: 'Vacation', note: 'Trip to the beach' },
            { id: '11', date: '2024-08-10', type: 'Deposit', amount: 100, name: 'Gift', note: 'Received from family' },
            { id: '12', date: '2024-08-15', type: 'Withdrawal', amount: 40, name: 'Dining', note: 'Restaurant with friends' },
            { id: '13', date: '2024-08-20', type: 'Deposit', amount: 300, name: 'Refund', note: 'Tax refund' },
            { id: '14', date: '2024-08-25', type: 'Withdrawal', amount: 90, name: 'Shopping', note: 'New clothes' },
            { id: '15', date: '2024-09-01', type: 'Deposit', amount: 500, name: 'Monthly Saving', note: 'Salary deposit' }
        ]);

        this.cols = [
            { field: 'date', header: 'Date' },
            { field: 'type', header: 'Type' },
            { field: 'amount', header: 'Amount' },
            { field: 'name', header: 'Name' },
            { field: 'note', header: 'Note' }
        ];

        this.exportColumns = this.cols.map((col) => ({ title: col.header, dataKey: col.field }));
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    openNew() {
        this.record = { date: '', type: 'Deposit', amount: 0, name: '', note: '' };
        this.submitted = false;
        this.productDialog = true;
    }

    editRecord(record: SavingRecord) {
        this.record = { ...record };
        this.productDialog = true;
    }

    deleteSelectedRecords() {
        this.confirmationService.confirm({
            message: 'Are you sure you want to delete the selected records?',
            header: 'Confirm',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.records.set(this.records().filter((val) => !this.selectedRecords?.includes(val)));
                this.selectedRecords = null;
                this.messageService.add({
                    severity: 'success',
                    summary: 'Successful',
                    detail: 'Records Deleted',
                    life: 3000
                });
            }
        });
    }

    hideDialog() {
        this.productDialog = false;
        this.submitted = false;
    }

    deleteRecord(record: SavingRecord) {
        this.confirmationService.confirm({
            message: 'Are you sure you want to delete ' + record.name + '?',
            header: 'Confirm',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.records.set(this.records().filter((val) => val.id !== record.id));
                this.record = { date: '', type: 'Deposit', amount: 0, name: '', note: '' };
                this.messageService.add({
                    severity: 'success',
                    summary: 'Successful',
                    detail: 'Record Deleted',
                    life: 3000
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

    createId(): string {
        let id = '';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (var i = 0; i < 5; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }

    saveRecord() {
        this.submitted = true;
        let _records = this.records();
        if (this.record.name?.trim()) {
            if (this.record.id) {
                _records[this.findIndexById(this.record.id)] = this.record;
                this.records.set([..._records]);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Successful',
                    detail: 'Record Updated',
                    life: 3000
                });
            } else {
                this.record.id = this.createId();
                this.messageService.add({
                    severity: 'success',
                    summary: 'Successful',
                    detail: 'Record Created',
                    life: 3000
                });
                this.records.set([..._records, this.record]);
            }
            this.productDialog = false;
            this.record = { date: '', type: 'Deposit', amount: 0, name: '', note: '' };
        }
    }

    getSeverityType(type: string) {
        switch (type) {
            case 'Deposit':
                return 'success';
            case 'Withdrawal':
                return 'danger';
            default:
                return 'info';
        }
    }
}
