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

interface DebtRecord {
    id?: string;
    date: string;
    type: 'Debt' | 'Receivable';
    name: string;
    total: number;
    paid: number; // For debts: amount paid; for receivables: amount received
    note?: string;
}

@Component({
    standalone: true,
    selector: 'app-debts-progress',
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
            [globalFilterFields]="['date', 'type', 'name']"
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
                    <h5 class="m-0">Manage Debts</h5>
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
                    <th style="min-width: 16rem">Name</th>
                    <th style="min-width: 10rem">Total</th>
                    <th style="min-width: 10rem">Payé/Reçu</th>
                    <th style="min-width: 10rem">Progression</th>
                    <th style="min-width: 12rem"></th>
                </tr>
            </ng-template>
            <ng-template #body let-record let-i="rowIndex">
                <tr>
                    <td style="width: 3rem">
                        <p-tableCheckbox [value]="record" />
                    </td>
                    <td>{{ record.date }}</td>
                    <td>
                        <p-tag [value]="record.type" [severity]="getSeverityType(record.type)" />
                    </td>
                    <td>{{ record.name }}</td>
                    <td>{{ record.total | currency:'EUR' }}</td>
                    <td>{{ record.paid | currency:'EUR' }}</td>
                    <td>
                        <div class="flex items-center gap-2">
                            <div class="bg-surface-300 dark:bg-surface-500 rounded-border overflow-hidden w-32" style="height: 8px">
                                <div [ngClass]="record.type === 'Debt' ? 'bg-primary-600' : 'bg-green-600'" class="h-full" [ngStyle]="{ width: getPercent(record) + '%' }"></div>
                            </div>
                            <span [ngClass]="record.type === 'Debt' ? 'text-primary-600' : 'text-green-600'" class="font-medium">{{ getPercent(record) }}%</span>
                        </div>
                    </td>
                    <td>
                        <p-button icon="pi pi-pencil" class="mr-2" [rounded]="true" [outlined]="true" (click)="editRecord(record)" />
                        <p-button icon="pi pi-plus" class="mr-2" [rounded]="true" severity="success" [outlined]="true" (click)="openAddPaymentDialog(i)" />
                        <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [outlined]="true" (click)="deleteRecord(record)" />
                    </td>
                </tr>
            </ng-template>
        </p-table>

        <p-dialog [(visible)]="productDialog" [style]="{ width: '450px' }" header="Debt/Receivable Details" [modal]="true">
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
                        <label for="name" class="block font-bold mb-3">Name</label>
                        <input type="text" pInputText id="name" [(ngModel)]="record.name" required fluid />
                        <small class="text-red-500" *ngIf="submitted && !record.name">Name is required.</small>
                    </div>
                    <div>
                        <label for="total" class="block font-bold mb-3">Montant total</label>
                        <p-inputnumber id="total" [(ngModel)]="record.total" mode="currency" currency="EUR" locale="fr-FR" fluid />
                    </div>
                    <div>
                        <label for="paid" class="block font-bold mb-3">Payé/Reçu</label>
                        <p-inputnumber id="paid" [(ngModel)]="record.paid" mode="currency" currency="EUR" locale="fr-FR" fluid />
                    </div>
                </div>
            </ng-template>

            <ng-template #footer>
                <p-button label="Cancel" icon="pi pi-times" text (click)="hideDialog()" />
                <p-button label="Save" icon="pi pi-check" (click)="saveRecord()" />
            </ng-template>
        </p-dialog>

        <p-dialog [(visible)]="addPaymentDialog" [style]="{ width: '350px' }" header="Ajouter un paiement" [modal]="true">
            <ng-template #content>
                <div *ngIf="addPaymentIndex !== null; let idx">
                    <ng-container *ngIf="records()[addPaymentIndex] as rec">
                        <div class="flex flex-col gap-6">
                            <div>
                                <div class="font-semibold text-lg mb-1">{{ rec.name }}</div>
                                <div class="text-sm text-muted-color mb-1">Montant total : <span class="font-semibold">{{ rec.total | currency:'EUR' }}</span></div>
                                <div class="text-sm text-muted-color mb-1">Déjà payé/reçu : <span class="font-semibold">{{ rec.paid | currency:'EUR' }}</span></div>
                                <div class="text-sm text-muted-color mb-1">Reste : <span class="font-semibold">{{ (rec.total - rec.paid) | currency:'EUR' }}</span></div>
                            </div>
                            <div>
                                <label class="block font-bold mb-3">Montant à ajouter (€)</label>
                                <p-inputnumber [(ngModel)]="addPaymentAmount" mode="currency" currency="EUR" locale="fr-FR" [min]="1" [max]="getMaxAddPayment()" autofocus />
                                <small class="text-red-500" *ngIf="addPaymentSubmitted && (!addPaymentAmount || addPaymentAmount <= 0)">Veuillez saisir un montant valide.</small>
                            </div>
                        </div>
                    </ng-container>
                </div>
            </ng-template>
            <ng-template #footer>
                <p-button label="Annuler" icon="pi pi-times" text (click)="closeAddPaymentDialog()" />
                <p-button label="Valider" icon="pi pi-check" (click)="confirmAddPayment()" />
            </ng-template>
        </p-dialog>

        <p-confirmdialog [style]="{ width: '450px' }" />
    `,
    providers: [MessageService, ProductService, ConfirmationService]
})
export class DebtsProgress implements OnInit {
    productDialog: boolean = false;
    addPaymentDialog = false;
    addPaymentIndex: number | null = null;
    addPaymentAmount: number | null = null;
    addPaymentSubmitted = false;

    records = signal<DebtRecord[]>([]);

    record!: DebtRecord;

    selectedRecords!: DebtRecord[] | null;

    submitted: boolean = false;

    types = [
        { label: 'Debt', value: 'Debt' },
        { label: 'Receivable', value: 'Receivable' }
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
            { id: '1', date: '2024-06-01', type: 'Debt', name: 'Loyer 2 mois', total: 2400, paid: 1200, note: 'Loyer en retard' },
            { id: '2', date: '2024-06-10', type: 'Receivable', name: 'Ami doit remboursement', total: 1000, paid: 300, note: 'Prêt à un ami' },
            { id: '3', date: '2024-06-15', type: 'Debt', name: 'Crédit Auto', total: 15000, paid: 5000, note: 'Crédit voiture' },
            { id: '4', date: '2024-07-01', type: 'Receivable', name: 'Remboursement famille', total: 500, paid: 200, note: 'Avance à la famille' }
        ]);

        this.cols = [
            { field: 'date', header: 'Date' },
            { field: 'type', header: 'Type' },
            { field: 'name', header: 'Name' },
            { field: 'total', header: 'Total' },
            { field: 'paid', header: 'Payé/Reçu' },
            { field: 'progression', header: 'Progression' },
            { field: 'note', header: 'Note' }
        ];

        this.exportColumns = this.cols.map((col) => ({ title: col.header, dataKey: col.field }));
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    openNew() {
        this.record = { date: '', type: 'Debt', total: 0, paid: 0, name: '', note: '' };
        this.submitted = false;
        this.productDialog = true;
    }

    editRecord(record: DebtRecord) {
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

    deleteRecord(record: DebtRecord) {
        this.confirmationService.confirm({
            message: 'Are you sure you want to delete ' + record.name + '?',
            header: 'Confirm',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.records.set(this.records().filter((val) => val.id !== record.id));
                this.record = { date: '', type: 'Debt', total: 0, paid: 0, name: '', note: '' };
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
            this.record = { date: '', type: 'Debt', total: 0, paid: 0, name: '', note: '' };
        }
    }

    getPercent(record: DebtRecord): number {
        if (!record.total) return 0;
        return Math.round((record.paid / record.total) * 100);
    }

    getSeverityType(type: string) {
        switch (type) {
            case 'Debt':
                return 'danger';
            case 'Receivable':
                return 'success';
            default:
                return 'info';
        }
    }

    openAddPaymentDialog(index: number) {
        this.addPaymentIndex = index;
        this.addPaymentAmount = null;
        this.addPaymentSubmitted = false;
        this.addPaymentDialog = true;
    }

    closeAddPaymentDialog() {
        this.addPaymentDialog = false;
        this.addPaymentIndex = null;
        this.addPaymentAmount = null;
        this.addPaymentSubmitted = false;
    }

    getMaxAddPayment(): number {
        if (this.addPaymentIndex === null) return 1000000;
        const rec = this.records()[this.addPaymentIndex];
        return rec ? rec.total - rec.paid : 1000000;
    }

    confirmAddPayment() {
        this.addPaymentSubmitted = true;
        if (this.addPaymentIndex !== null && this.addPaymentAmount && this.addPaymentAmount > 0) {
            const rec = this.records()[this.addPaymentIndex];
            rec.paid = Math.min(rec.paid + this.addPaymentAmount, rec.total);
            this.records.set([...this.records()]);
            this.closeAddPaymentDialog();
        }
    }
}
