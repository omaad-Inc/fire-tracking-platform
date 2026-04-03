import { Component, OnInit, OnDestroy, signal, ViewChild, inject } from '@angular/core';
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
import { Subscription } from 'rxjs';
import { SavingsService, SavingRecord, SavingsGoalDisplay } from '../../service/savings.service';
import { AssetsStateService } from '../../service/assets-state.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';

interface Column {
    field: string;
    header: string;
    customExportHeader?: string;
}

// Extended record with goal info
interface SavingRecordWithGoal extends SavingRecord {
    goalId?: number;
    goalName?: string;
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
        ConfirmDialogModule,
        AppAmountComponent
    ],
    template: `
        <p-toolbar styleClass="mb-6">
            <ng-template #start>
                <p-button label="Nouveau" icon="pi pi-plus" severity="secondary" class="mr-2" (onClick)="openNew()" />
                <p-button severity="secondary" label="Supprimer" icon="pi pi-trash" outlined (onClick)="deleteSelectedRecords()" [disabled]="!selectedRecords || !selectedRecords.length" />
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
            [globalFilterFields]="['date', 'type', 'amount', 'name', 'goalName']"
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
                    <h5 class="m-0">Gestion de l'Épargne</h5>
                    <p-iconfield>
                        <p-inputicon styleClass="pi pi-search" />
                        <input pInputText type="text" (input)="onGlobalFilter(dt, $event)" placeholder="Rechercher..." />
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
                    <th style="min-width: 10rem">Montant</th>
                    <th style="min-width: 16rem">Objectif</th>
                    <th style="min-width: 14rem">Description</th>
                    <th style="min-width: 10rem"></th>
                </tr>
            </ng-template>
            <ng-template #body let-record>
                <tr>
                    <td style="width: 3rem">
                        <p-tableCheckbox [value]="record" />
                    </td>
                    <td>{{ record.date }}</td>
                    <td>
                        <p-tag [value]="record.type === 'Deposit' ? 'Dépôt' : 'Retrait'" [severity]="getSeverityType(record.type)" />
                    </td>
                    <td class="font-semibold" [ngClass]="record.type === 'Deposit' ? 'text-emerald-500' : 'text-rose-500'">
                        <app-amount [value]="record.amount" [prefix]="record.type === 'Deposit' ? '+' : '-'" />
                    </td>
                    <td>
                        @if (record.goalName) {
                            <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-sm">
                                <i class="pi pi-flag text-xs"></i>
                                {{ record.goalName }}
                            </span>
                        } @else {
                            <span class="text-surface-400 text-sm">Non assigné</span>
                        }
                    </td>
                    <td>{{ record.name }}</td>
                    <td>
                        <p-button icon="pi pi-pencil" class="mr-2" [rounded]="true" [outlined]="true" (click)="editRecord(record)" />
                        <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [outlined]="true" (click)="deleteRecord(record)" />
                    </td>
                </tr>
            </ng-template>
            <ng-template #emptymessage>
                <tr>
                    <td colspan="7" class="text-center py-8">
                        <div class="flex flex-col items-center">
                            <div class="w-16 h-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
                                <i class="pi pi-wallet text-2xl text-surface-400"></i>
                            </div>
                            <p class="text-surface-500 dark:text-surface-400 mb-2">Aucune transaction d'épargne</p>
                            <p-button label="Ajouter une transaction" icon="pi pi-plus" [outlined]="true" (onClick)="openNew()" />
                        </div>
                    </td>
                </tr>
            </ng-template>
        </p-table>

        <p-dialog [(visible)]="productDialog" 
                  [style]="{ width: '95vw', maxWidth: '550px' }" 
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
                    
                    <!-- Goal Selection -->
                    <div class="flex flex-col gap-2 sm:col-span-2">
                        <label for="goal" class="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-medium text-sm">
                            <i class="pi pi-flag text-indigo-500"></i>
                            Objectif d'épargne
                        </label>
                        <p-select 
                            [(ngModel)]="record.goalId" 
                            inputId="goal" 
                            [options]="goalOptions()" 
                            optionLabel="label" 
                            optionValue="value" 
                            placeholder="Sélectionner un objectif" 
                            [showClear]="true"
                            styleClass="w-full !rounded-xl"
                        />
                        <small class="text-surface-500 dark:text-surface-400 text-xs">
                            Assignez cette épargne à un objectif spécifique
                        </small>
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
                    
                    <!-- Description -->
                    <div class="flex flex-col gap-2">
                        <label for="name" class="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-medium text-sm">
                            <i class="pi pi-tag text-violet-500"></i>
                            Description
                        </label>
                        <input type="text" pInputText id="name" [(ngModel)]="record.name"
                               class="w-full !py-3 !rounded-xl !border-surface-300 dark:!border-surface-600 focus:!border-emerald-500"
                               placeholder="Ex: Épargne mensuelle... (optionnel)" />
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
export class SavingsTransactions implements OnInit, OnDestroy {
    private savingsService = inject(SavingsService);
    private stateService = inject(AssetsStateService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    
    private subscription?: Subscription;
    
    productDialog: boolean = false;

    records = signal<SavingRecordWithGoal[]>([]);
    goalOptions = signal<{ label: string; value: number }[]>([]);

    record!: SavingRecordWithGoal;

    selectedRecords!: SavingRecordWithGoal[] | null;

    submitted: boolean = false;

    types = [
        { label: 'Dépôt', value: 'Deposit' },
        { label: 'Retrait', value: 'Withdrawal' }
    ];

    @ViewChild('dt') dt!: Table;

    cols!: Column[];
    
    private goals: SavingsGoalDisplay[] = [];

    exportCSV() {
        this.dt.exportCSV();
    }

    ngOnInit() {
        this.loadData();
        
        // Subscribe to savings updates to refresh the list
        this.subscription = this.stateService.savingsUpdated$.subscribe(() => {
            this.loadData();
        });
    }
    
    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

    async loadData() {
        // Load goals first
        this.goals = await this.savingsService.getGoals();
        this.goalOptions.set(this.goals.map(g => ({ 
            label: g.label, 
            value: g.id || 0 
        })));
        
        // Load transactions
        const data = await this.savingsService.getTransactions();
        const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // Map transactions with goal names
        const recordsWithGoals: SavingRecordWithGoal[] = sorted.map(r => ({
            ...r,
            goalName: this.getGoalName(r.goalId)
        }));
        
        this.records.set(recordsWithGoals);
        this.cols = [
            { field: 'date', header: 'Date' },
            { field: 'type', header: 'Type' },
            { field: 'amount', header: 'Montant' },
            { field: 'goalName', header: 'Objectif' },
            { field: 'name', header: 'Description' }
        ];
    }
    
    private getGoalName(goalId?: number): string | undefined {
        if (!goalId) return undefined;
        const goal = this.goals.find(g => g.id === goalId);
        return goal?.label;
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    openNew() {
        this.record = { 
            date: new Date().toISOString().split('T')[0], 
            type: 'Deposit', 
            amount: 0, 
            name: '',
            goalId: undefined,
            goalName: undefined
        } as SavingRecordWithGoal;
        this.submitted = false;
        this.productDialog = true;
    }

    editRecord(record: SavingRecordWithGoal) {
        this.record = { ...record };
        this.productDialog = true;
    }

    deleteSelectedRecords() {
        this.confirmationService.confirm({
            message: 'Êtes-vous sûr de vouloir supprimer les enregistrements sélectionnés ?',
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                const ids = (this.selectedRecords || []).map((r) => r.id!).filter(Boolean);
                this.savingsService.deleteTransactions(ids).then(() => {
                    this.records.set(this.records().filter((val) => !ids.includes(val.id!)));
                    this.selectedRecords = null;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Succès',
                        detail: 'Enregistrements supprimés',
                        life: 3000
                    });
                    this.stateService.notifySavingsUpdated();
                });
            }
        });
    }

    hideDialog() {
        this.productDialog = false;
        this.submitted = false;
    }

    deleteRecord(record: SavingRecordWithGoal) {
        this.confirmationService.confirm({
            message: 'Êtes-vous sûr de vouloir supprimer "' + record.name + '" ?',
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                if (!record.id) return;
                this.savingsService.deleteTransactions([record.id]).then(() => {
                    this.records.set(this.records().filter((val) => val.id !== record.id));
                    this.record = { date: '', type: 'Deposit', amount: 0, name: '' } as SavingRecordWithGoal;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Succès',
                        detail: 'Enregistrement supprimé',
                        life: 3000
                    });
                    this.stateService.notifySavingsUpdated();
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

    async saveRecord() {
        this.submitted = true;
        let _records = this.records();
        if (this.record.date && this.record.amount > 0) {
            // Add goal name based on goalId
            this.record.goalName = this.getGoalName(this.record.goalId);
            
            if (this.record.id) {
                const updated = await this.savingsService.updateTransaction(this.record);
                const updatedWithGoal: SavingRecordWithGoal = {
                    ...updated,
                    goalId: this.record.goalId,
                    goalName: this.record.goalName
                };
                _records[this.findIndexById(updated.id!)] = updatedWithGoal;
                this.records.set(this.sortDesc([..._records]));
                this.messageService.add({
                    severity: 'success',
                    summary: 'Succès',
                    detail: 'Enregistrement mis à jour',
                    life: 3000
                });
            } else {
                const created = await this.savingsService.addTransaction(this.record);
                const createdWithGoal: SavingRecordWithGoal = {
                    ...created,
                    goalId: this.record.goalId,
                    goalName: this.record.goalName
                };
                this.records.set(this.sortDesc([..._records, createdWithGoal]));
                this.messageService.add({
                    severity: 'success',
                    summary: 'Succès',
                    detail: 'Enregistrement créé',
                    life: 3000
                });
                
                // If a goal is selected and it's a deposit, add contribution
                if (this.record.goalId && this.record.type === 'Deposit' && this.record.amount > 0) {
                    try {
                        await this.savingsService.addContribution(this.record.goalId, this.record.amount);
                    } catch (error) {
                        console.error('Error adding contribution to goal:', error);
                    }
                }
            }
            
            this.stateService.notifySavingsUpdated();
            this.productDialog = false;
            this.record = { date: '', type: 'Deposit', amount: 0, name: '' } as SavingRecordWithGoal;
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

    private sortDesc(list: SavingRecordWithGoal[]): SavingRecordWithGoal[] {
        return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
}
