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
import { SavingsService, SavingRecord } from '../../service/savings.service';

interface Column {
    field: string;
    header: string;
    customExportHeader?: string;
}


@Component({
    selector: 'app-savings-transactions',
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
            sortField="date"
            [sortOrder]="-1"
            [globalFilterFields]="['date', 'type', 'amount', 'name']"
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
                    <h5 class="m-0">Gestion de l'Epargne</h5>
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
                    <th style="min-width: 20rem">Name</th>
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
                    
                </div>
            </ng-template>

            <ng-template #footer>
                <p-button label="Cancel" icon="pi pi-times" text (click)="hideDialog()" />
                <p-button label="Save" icon="pi pi-check" (click)="saveRecord()" />
            </ng-template>
        </p-dialog>

        <p-confirmdialog [style]="{ width: '450px' }" />
    `,
    providers: [MessageService, ConfirmationService]
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

    cols!: Column[];

    constructor(
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private savingsService: SavingsService
    ) {}

    exportCSV() {
        this.dt.exportCSV();
    }

    ngOnInit() {
        this.loadDataFromService();
    }

    loadDataFromService() {
        this.savingsService.getTransactions().then((data) => {
            const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            this.records.set(sorted);
            this.cols = [
                { field: 'date', header: 'Date' },
                { field: 'type', header: 'Type' },
                { field: 'amount', header: 'Amount' },
                { field: 'name', header: 'Name' }
            ];
        });
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    openNew() {
        this.record = { date: '', type: 'Deposit', amount: 0, name: '' } as any;
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
                const ids = (this.selectedRecords || []).map((r) => r.id!).filter(Boolean);
                this.savingsService.deleteTransactions(ids).then(() => {
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
        this.productDialog = false;
        this.submitted = false;
    }

    deleteRecord(record: SavingRecord) {
        this.confirmationService.confirm({
            message: 'Are you sure you want to delete ' + record.name + '?',
            header: 'Confirm',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                if (!record.id) return;
                this.savingsService.deleteTransactions([record.id]).then(() => {
                    this.records.set(this.records().filter((val) => val.id !== record.id));
                    this.record = { date: '', type: 'Deposit', amount: 0, name: '' } as any;
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

    // id creation delegated to savings service

    saveRecord() {
        this.submitted = true;
        let _records = this.records();
        if (this.record.name?.trim()) {
            if (this.record.id) {
                this.savingsService.updateTransaction(this.record).then((updated) => {
                    _records[this.findIndexById(updated.id!)] = updated;
                    this.records.set(this.sortDesc([..._records]));
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Successful',
                        detail: 'Record Updated',
                        life: 3000
                    });
                });
            } else {
                this.savingsService.addTransaction(this.record).then((created) => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Successful',
                        detail: 'Record Created',
                        life: 3000
                    });
                    this.records.set(this.sortDesc([..._records, created]));
                });
            }
            this.productDialog = false;
            this.record = { date: '', type: 'Deposit', amount: 0, name: '' } as any;
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

    private sortDesc(list: SavingRecord[]): SavingRecord[] {
        return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
}
