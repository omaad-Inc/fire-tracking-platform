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

        <p-dialog [(visible)]="productDialog" 
                  [style]="{ width: '95vw', maxWidth: '500px' }" 
                  [breakpoints]="{ '768px': '95vw' }"
                  [modal]="true"
                  [draggable]="false"
                  [resizable]="false"
                  styleClass="!rounded-2xl overflow-hidden">
            <ng-template #header>
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <i class="pi pi-piggy-bank text-white text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 m-0">Détails de l'Épargne</h3>
                        <p class="text-surface-500 dark:text-surface-400 text-sm m-0">Enregistrer un mouvement d'épargne</p>
                    </div>
                </div>
            </ng-template>
            
            <ng-template #content>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4">
                    <!-- Date -->
                    <div class="flex flex-col gap-2">
                        <label for="date" class="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-medium text-sm">
                            <i class="pi pi-calendar text-emerald-500"></i>
                            Date
                        </label>
                        <input type="date" pInputText id="date" [(ngModel)]="record.date" required autofocus 
                               class="w-full !py-3 !rounded-xl !border-surface-300 dark:!border-surface-600 focus:!border-emerald-500" />
                        <small class="text-rose-500 text-xs" *ngIf="submitted && !record.date">
                            <i class="pi pi-exclamation-circle mr-1"></i>La date est requise
                        </small>
                    </div>
                    
                    <!-- Type -->
                    <div class="flex flex-col gap-2">
                        <label for="type" class="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-medium text-sm">
                            <i class="pi pi-arrows-h text-cyan-500"></i>
                            Type
                        </label>
                        <p-select [(ngModel)]="record.type" inputId="type" [options]="types" 
                                  optionLabel="label" optionValue="value" placeholder="Sélectionner un type" 
                                  styleClass="w-full !rounded-xl" />
                    </div>
                    
                    <!-- Amount -->
                    <div class="flex flex-col gap-2">
                        <label for="amount" class="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-medium text-sm">
                            <i class="pi pi-euro text-amber-500"></i>
                            Montant
                        </label>
                        <p-inputnumber id="amount" [(ngModel)]="record.amount" mode="currency" currency="EUR" locale="fr-FR" 
                                       styleClass="w-full"
                                       inputStyleClass="!py-3 !rounded-xl !border-surface-300 dark:!border-surface-600 focus:!border-emerald-500" />
                    </div>
                    
                    <!-- Name -->
                    <div class="flex flex-col gap-2">
                        <label for="name" class="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-medium text-sm">
                            <i class="pi pi-tag text-indigo-500"></i>
                            Nom
                        </label>
                        <input type="text" pInputText id="name" [(ngModel)]="record.name" required 
                               class="w-full !py-3 !rounded-xl !border-surface-300 dark:!border-surface-600 focus:!border-emerald-500"
                               placeholder="Ex: Épargne mensuelle..." />
                        <small class="text-rose-500 text-xs" *ngIf="submitted && !record.name">
                            <i class="pi pi-exclamation-circle mr-1"></i>Le nom est requis
                        </small>
                    </div>
                </div>
            </ng-template>

            <ng-template #footer>
                <div class="flex flex-col sm:flex-row gap-3 w-full pt-2">
                    <p-button label="Annuler" icon="pi pi-times" 
                              [outlined]="true" 
                              (click)="hideDialog()" 
                              styleClass="flex-1 !rounded-xl !py-3 !border-surface-300 dark:!border-surface-600 hover:!bg-surface-100 dark:hover:!bg-surface-800" />
                    <p-button label="Enregistrer" icon="pi pi-check" 
                              (click)="saveRecord()" 
                              styleClass="flex-1 !rounded-xl !py-3 !bg-gradient-to-r !from-emerald-600 !to-cyan-500 hover:!from-emerald-700 hover:!to-cyan-600 !border-0" />
                </div>
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
