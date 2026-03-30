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
import { DatePickerModule } from 'primeng/datepicker';
import { DebtsService, DebtRecord } from '../../service/debts.service';
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

// DebtRecord type imported from DebtsService

@Component({
    standalone: true,
    selector: 'app-debts-progress',
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
                    <h5 class="m-0">Gestion des Dettes</h5>
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
                    <th style="min-width: 16rem">Name</th>
                    <th style="min-width: 10rem">Type</th>
                    <th style="min-width: 10rem">Total</th>
                    <th style="min-width: 10rem">Payé/Reçu</th>
                    <th style="min-width: 10rem">Taux d'intérêt</th>
                    <th style="min-width: 10rem">Fréquence</th>
                    <th style="min-width: 10rem">Progression</th>
                    <th style="min-width: 12rem"></th>
                </tr>
            </ng-template>
            <ng-template #body let-record let-i="rowIndex">
                <tr>
                    <td style="width: 3rem">
                        <p-tableCheckbox [value]="record" />
                    </td>
                    <td>{{ record.name }}</td>
                    <td>
                        <p-tag [value]="record.type" [severity]="getSeverityType(record.type)" />
                    </td>
                    <td><app-amount [value]="record.total" /></td>
                    <td><app-amount [value]="record.paid" /></td>
                    <td>{{ record.interestRate }}%</td>
                    <td>{{ record.frequency }}</td>
                    <td>
                        <div class="flex items-center gap-2">
                            <div class="bg-surface-200 dark:bg-surface-700 w-full max-w-xs rounded-full overflow-hidden" style="height: 8px">
                                <div class="h-full rounded-full transition-all duration-500" 
                                     [ngClass]="record.type === 'Debt' ? 'bg-gradient-to-r from-indigo-600 to-indigo-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'" 
                                     [ngStyle]="{ width: getPercent(record) + '%' }"></div>
                            </div>
                            <span [ngClass]="record.type === 'Debt' ? 'text-indigo-500' : 'text-emerald-500'" class="font-semibold">{{ getPercent(record) }}%</span>
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

        <p-dialog [(visible)]="productDialog" 
                  [style]="{ width: '95vw', maxWidth: '650px' }" 
                  [breakpoints]="{ '768px': '95vw' }"
                  [modal]="true"
                  [draggable]="false"
                  [resizable]="false"
                  styleClass="!rounded-2xl overflow-hidden">
            <ng-template #header>
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
                        <i class="pi pi-credit-card text-white text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 m-0">
                            {{ isEdit ? 'Modifier la dette/créance' : 'Nouvelle dette/créance' }}
                        </h3>
                        <p class="text-surface-500 dark:text-surface-400 text-sm m-0">Gérez vos dettes et créances</p>
                    </div>
                </div>
            </ng-template>
            
            <ng-template #content>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4">
                    <!-- Date -->
                    <div class="flex flex-col gap-2">
                        <label for="date" class="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-medium text-sm">
                            <i class="pi pi-calendar text-rose-500"></i>
                            Date
                        </label>
                        <p-datepicker id="date" [(ngModel)]="record.date" [showIcon]="true" [showButtonBar]="true" 
                                      inputId="date" dateFormat="yy-mm-dd" required 
                                      styleClass="w-full"
                                      inputStyleClass="!py-3 !rounded-xl !border-surface-300 dark:!border-surface-600 focus:!border-rose-500" />
                        <small class="text-rose-500 text-xs" *ngIf="submitted && !record.date">
                            <i class="pi pi-exclamation-circle mr-1"></i>La date est requise
                        </small>
                    </div>
                    
                    <!-- Type -->
                    <div class="flex flex-col gap-2">
                        <label for="type" class="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-medium text-sm">
                            <i class="pi pi-arrows-h text-indigo-500"></i>
                            Type
                        </label>
                        <p-select [(ngModel)]="record.type" inputId="type" [options]="types" 
                                  optionLabel="label" optionValue="value" placeholder="Sélectionner un type" 
                                  styleClass="w-full !rounded-xl" />
                    </div>
                    
                    <!-- Name -->
                    <div class="flex flex-col gap-2 sm:col-span-2">
                        <label for="name" class="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-medium text-sm">
                            <i class="pi pi-tag text-cyan-500"></i>
                            Nom
                        </label>
                        <input pInputText id="name" [(ngModel)]="record.name" required 
                               class="w-full !py-3 !rounded-xl !border-surface-300 dark:!border-surface-600 focus:!border-rose-500"
                               placeholder="Ex: Prêt immobilier, Ami..." />
                        <small class="text-rose-500 text-xs" *ngIf="submitted && !record.name">
                            <i class="pi pi-exclamation-circle mr-1"></i>Le nom est requis
                        </small>
                    </div>
                    
                    <!-- Total -->
                    <div class="flex flex-col gap-2">
                        <label for="total" class="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-medium text-sm">
                            <i class="pi pi-euro text-amber-500"></i>
                            Montant total
                        </label>
                        <p-inputnumber id="total" [(ngModel)]="record.total" mode="currency" currency="EUR" locale="fr-FR" 
                                       styleClass="w-full"
                                       inputStyleClass="!py-3 !rounded-xl !border-surface-300 dark:!border-surface-600 focus:!border-rose-500" />
                    </div>
                    
                    <!-- Paid -->
                    <div class="flex flex-col gap-2">
                        <label for="paid" class="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-medium text-sm">
                            <i class="pi pi-check-circle text-emerald-500"></i>
                            Payé/Reçu
                        </label>
                        <p-inputnumber id="paid" [(ngModel)]="record.paid" mode="currency" currency="EUR" locale="fr-FR" 
                                       styleClass="w-full"
                                       inputStyleClass="!py-3 !rounded-xl !border-surface-300 dark:!border-surface-600 focus:!border-emerald-500" />
                    </div>
                    
                    <!-- Interest Rate -->
                    <div class="flex flex-col gap-2">
                        <label for="interestRate" class="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-medium text-sm">
                            <i class="pi pi-percentage text-violet-500"></i>
                            Taux d'intérêt
                        </label>
                        <p-inputnumber id="interestRate" [(ngModel)]="record.interestRate" mode="decimal" 
                                       minFractionDigits="2" maxFractionDigits="2" suffix=" %" 
                                       styleClass="w-full"
                                       inputStyleClass="!py-3 !rounded-xl !border-surface-300 dark:!border-surface-600 focus:!border-violet-500" />
                    </div>
                    
                    <!-- Frequency -->
                    <div class="flex flex-col gap-2">
                        <label for="frequency" class="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-medium text-sm">
                            <i class="pi pi-sync text-surface-400"></i>
                            Fréquence
                        </label>
                        <p-select [(ngModel)]="record.frequency" inputId="frequency" [options]="frequencies" 
                                  optionLabel="label" optionValue="value" placeholder="Choisir une fréquence" 
                                  styleClass="w-full !rounded-xl" />
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
                              styleClass="flex-1 !rounded-xl !py-3 !bg-gradient-to-r !from-rose-600 !to-indigo-500 hover:!from-rose-700 hover:!to-indigo-600 !border-0" />
                </div>
            </ng-template>
        </p-dialog>

        <!-- Add Payment Dialog -->
        <p-dialog [(visible)]="addPaymentDialog" 
                  [style]="{ width: '95vw', maxWidth: '420px' }" 
                  [breakpoints]="{ '768px': '95vw' }"
                  [modal]="true"
                  [draggable]="false"
                  [resizable]="false"
                  styleClass="!rounded-2xl overflow-hidden">
            <ng-template #header>
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <i class="pi pi-plus text-white text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 m-0">Ajouter un paiement</h3>
                        <p class="text-surface-500 dark:text-surface-400 text-sm m-0">Enregistrer un remboursement</p>
                    </div>
                </div>
            </ng-template>
            
            <ng-template #content>
                <div *ngIf="addPaymentIndex !== null">
                    <ng-container *ngIf="records()[addPaymentIndex] as rec">
                        <div class="flex flex-col gap-5 pt-4">
                            <!-- Summary Card -->
                            <div class="bg-surface-50 dark:bg-surface-800/50 rounded-xl p-4 space-y-3">
                                <div class="flex items-center gap-3 mb-3">
                                    <div class="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                        <i class="pi pi-info-circle text-indigo-500"></i>
                                    </div>
                                    <span class="font-semibold text-lg text-surface-900 dark:text-surface-0">{{ rec.name }}</span>
                                </div>
                                <div class="grid grid-cols-3 gap-3 text-center">
                                    <div class="bg-surface-0 dark:bg-surface-900 rounded-lg p-3">
                                        <div class="text-surface-500 dark:text-surface-400 text-xs mb-1">Total</div>
                                        <div class="font-bold text-surface-900 dark:text-surface-0"><app-amount [value]="rec.total" /></div>
                                    </div>
                                    <div class="bg-surface-0 dark:bg-surface-900 rounded-lg p-3">
                                        <div class="text-surface-500 dark:text-surface-400 text-xs mb-1">Payé</div>
                                        <div class="font-bold text-emerald-500"><app-amount [value]="rec.paid" /></div>
                                    </div>
                                    <div class="bg-surface-0 dark:bg-surface-900 rounded-lg p-3">
                                        <div class="text-surface-500 dark:text-surface-400 text-xs mb-1">Reste</div>
                                        <div class="font-bold text-rose-500"><app-amount [value]="rec.total - rec.paid" /></div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Amount Input -->
                            <div class="flex flex-col gap-2">
                                <label class="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-medium text-sm">
                                    <i class="pi pi-euro text-emerald-500"></i>
                                    Montant à ajouter
                                </label>
                                <p-inputnumber [(ngModel)]="addPaymentAmount" mode="currency" currency="EUR" locale="fr-FR" 
                                               [min]="1" [max]="getMaxAddPayment()" autofocus 
                                               styleClass="w-full"
                                               inputStyleClass="!py-3 !rounded-xl !border-surface-300 dark:!border-surface-600 focus:!border-emerald-500 !text-lg" />
                                <small class="text-rose-500 text-xs" *ngIf="addPaymentSubmitted && (!addPaymentAmount || addPaymentAmount <= 0)">
                                    <i class="pi pi-exclamation-circle mr-1"></i>Veuillez saisir un montant valide
                                </small>
                            </div>
                        </div>
                    </ng-container>
                </div>
            </ng-template>
            
            <ng-template #footer>
                <div class="flex flex-col sm:flex-row gap-3 w-full pt-2">
                    <p-button label="Annuler" icon="pi pi-times" 
                              [outlined]="true" 
                              (click)="closeAddPaymentDialog()" 
                              styleClass="flex-1 !rounded-xl !py-3 !border-surface-300 dark:!border-surface-600 hover:!bg-surface-100 dark:hover:!bg-surface-800" />
                    <p-button label="Valider" icon="pi pi-check" 
                              (click)="confirmAddPayment()" 
                              styleClass="flex-1 !rounded-xl !py-3 !bg-gradient-to-r !from-emerald-600 !to-cyan-500 hover:!from-emerald-700 hover:!to-cyan-600 !border-0" />
                </div>
            </ng-template>
        </p-dialog>

        <p-confirmdialog [style]="{ width: '450px' }" />
    `,
    providers: [MessageService, ConfirmationService]
})
export class DebtsProgress implements OnInit {
    productDialog: boolean = false;
    addPaymentDialog = false;
    addPaymentIndex: number | null = null;
    addPaymentAmount: number | null = null;
    addPaymentSubmitted = false;
    isEdit = false;

    records = signal<DebtRecord[]>([]);

    record!: DebtRecord;

    selectedRecords!: DebtRecord[] | null;

    submitted: boolean = false;

    types = [
        { label: 'Debt', value: 'Debt' },
        { label: 'Receivable', value: 'Receivable' }
    ];

    frequencies = [
        { label: 'Mensuel', value: 'Mensuel' },
        { label: 'Unique', value: 'Unique' },
        { label: 'Libre', value: 'Libre' }
    ];

    @ViewChild('dt') dt!: Table;

    exportColumns!: ExportColumn[];

    cols!: Column[];

    constructor(
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private debtsService: DebtsService
    ) {}

    exportCSV() {
        this.dt.exportCSV();
    }

    ngOnInit() {
        this.loadFromService();
    }

    loadFromService() {
        this.debtsService.getRecords().then((data) => {
            this.records.set(data);
            this.cols = [
                { field: 'name', header: 'Name' },
                { field: 'type', header: 'Type' },
                { field: 'total', header: 'Total' },
                { field: 'paid', header: 'Payé/Reçu' },
                { field: 'interestRate', header: "Taux d'intérêt" },
                { field: 'frequency', header: 'Fréquence' },
                { field: 'progression', header: 'Progression' },
                { field: 'note', header: 'Note' }
            ];
            this.exportColumns = this.cols.map((col) => ({ title: col.header, dataKey: col.field }));
        });
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    openNew() {
        this.record = { date: new Date().toISOString().split('T')[0], type: 'Debt', category: 'other', total: 0, paid: 0, name: '', note: '', interestRate: 0, frequency: 'Mensuel' };
        this.submitted = false;
        this.productDialog = true;
        this.isEdit = false;
    }

    editRecord(record: DebtRecord) {
        this.record = { ...record };
        this.productDialog = true;
        this.isEdit = true;
    }

    deleteSelectedRecords() {
        this.confirmationService.confirm({
            message: 'Are you sure you want to delete the selected records?',
            header: 'Confirm',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                const ids = (this.selectedRecords || []).map((r) => r.id!).filter(Boolean);
                this.debtsService.deleteRecords(ids).then(() => {
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
        this.isEdit = false;
    }

    deleteRecord(record: DebtRecord) {
        this.confirmationService.confirm({
            message: 'Are you sure you want to delete ' + record.name + '?',
            header: 'Confirm',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                if (!record.id) return;
                this.debtsService.deleteRecords([record.id]).then(() => {
                    this.records.set(this.records().filter((val) => val.id !== record.id));
                    this.record = { date: new Date().toISOString().split('T')[0], type: 'Debt', category: 'other', total: 0, paid: 0, name: '', note: '', interestRate: 0, frequency: 'Mensuel' };
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
                this.debtsService.updateRecord(this.record).then((updated) => {
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
                this.debtsService.addRecord(this.record).then((created) => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Successful',
                        detail: 'Record Created',
                        life: 3000
                    });
                    this.records.set([..._records, created]);
                });
            }
            this.productDialog = false;
            this.record = { date: new Date().toISOString().split('T')[0], type: 'Debt', category: 'other', total: 0, paid: 0, name: '', note: '', interestRate: 0, frequency: 'Mensuel' };
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
            if (!rec?.id) {
                this.closeAddPaymentDialog();
                return;
            }
            this.debtsService.addPayment(rec.id, this.addPaymentAmount).then((updated) => {
                const current = [...this.records()];
                const idx = this.findIndexById(updated.id!);
                if (idx !== -1) current[idx] = updated;
                this.records.set(current);
                this.closeAddPaymentDialog();
            });
        }
    }
}
