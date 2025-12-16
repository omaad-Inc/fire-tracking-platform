import { Component, OnInit, OnDestroy, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SavingsService, SavingsGoalDisplay } from '../../service/savings.service';
import { AssetsStateService } from '../../service/assets-state.service';
import { SavingGoalCreate } from '../../../core/services/api.service';

@Component({
    standalone: true,
    selector: 'app-savings-goals',
    imports: [
        CommonModule, FormsModule, ButtonModule, DialogModule, 
        InputTextModule, InputNumberModule, ToastModule, ConfirmDialogModule
    ],
    providers: [MessageService, ConfirmationService],
    template: `
        <div class="card">
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h2 class="text-xl font-semibold text-surface-900 dark:text-surface-0 mb-1">Objectifs d'Épargne</h2>
                    <p class="text-surface-500 dark:text-surface-400 text-sm">Définissez vos objectifs pour mieux suivre votre épargne</p>
                </div>
                <p-button 
                    icon="pi pi-plus" 
                    label="Nouvel Objectif" 
                    (onClick)="openNewGoalDialog()"
                    styleClass="!rounded-xl"
                />
            </div>
            
            @if (loading()) {
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    @for (i of [1,2,3]; track i) {
                        <div class="animate-pulse bg-surface-100 dark:bg-surface-800 rounded-xl p-4 h-32"></div>
                    }
                </div>
            } @else if (goals().length === 0) {
                <div class="flex flex-col items-center justify-center py-12 text-center">
                    <div class="w-20 h-20 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
                        <i class="pi pi-flag text-3xl text-surface-400"></i>
                    </div>
                    <h3 class="text-lg font-medium text-surface-900 dark:text-surface-0 mb-2">Aucun objectif d'épargne</h3>
                    <p class="text-surface-500 dark:text-surface-400 mb-4">Créez votre premier objectif pour commencer à épargner</p>
                    <p-button 
                        icon="pi pi-plus" 
                        label="Créer un objectif" 
                        (onClick)="openNewGoalDialog()"
                        styleClass="!rounded-xl"
                    />
                </div>
            } @else {
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    @for (goal of goals(); track goal.id) {
                        <div class="relative bg-surface-50 dark:bg-surface-800 rounded-xl p-5 group hover:shadow-lg transition-all duration-300 border border-surface-200 dark:border-surface-700">
                            <!-- Actions -->
                            <div class="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    class="w-8 h-8 rounded-lg bg-surface-200 dark:bg-surface-700 flex items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                                    (click)="editGoal(goal)"
                                >
                                    <i class="pi pi-pencil text-xs text-surface-600 dark:text-surface-400"></i>
                                </button>
                                <button 
                                    class="w-8 h-8 rounded-lg bg-surface-200 dark:bg-surface-700 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                    (click)="confirmDeleteGoal(goal)"
                                >
                                    <i class="pi pi-trash text-xs text-surface-600 dark:text-surface-400"></i>
                                </button>
                            </div>
                            
                            <!-- Icon & Name -->
                            <div class="flex items-center gap-3 mb-4">
                                <div class="w-12 h-12 rounded-xl flex items-center justify-center" [ngClass]="goal.colorClass + '/10'">
                                    <i class="pi pi-flag text-lg" [ngClass]="goal.textColorClass"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <h3 class="font-semibold text-surface-900 dark:text-surface-0 truncate">{{ goal.label }}</h3>
                                    @if (goal.targetDate) {
                                        <span class="text-xs text-surface-500 dark:text-surface-400">
                                            Objectif: {{ goal.targetDate | date:'MMM yyyy' }}
                                        </span>
                                    }
                                </div>
                            </div>
                            
                            <!-- Progress -->
                            <div class="mb-3">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="text-sm text-surface-500 dark:text-surface-400">Progression</span>
                                    <span class="font-bold" [ngClass]="goal.textColorClass">{{ getProgressPercent(goal) }}%</span>
                                </div>
                                <div class="relative h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                                    <div 
                                        class="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                                        [ngClass]="goal.colorClass"
                                        [ngStyle]="{ width: getProgressPercent(goal) + '%' }"
                                    ></div>
                                </div>
                            </div>
                            
                            <!-- Amounts -->
                            <div class="flex justify-between items-center text-sm">
                                <span class="text-surface-900 dark:text-surface-0 font-medium">{{ goal.current | currency:'EUR':'symbol':'1.0-0' }}</span>
                                <span class="text-surface-500 dark:text-surface-400">/ {{ goal.target | currency:'EUR':'symbol':'1.0-0' }}</span>
                            </div>
                        </div>
                    }
                </div>
            }
        </div>
        
        <!-- Goal Dialog -->
        <p-dialog 
            [(visible)]="goalDialogVisible" 
            [style]="{ width: '95vw', maxWidth: '500px' }" 
            [modal]="true"
            [draggable]="false"
            [resizable]="false"
            styleClass="!rounded-2xl overflow-hidden"
        >
            <ng-template #header>
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <i class="pi pi-flag text-white text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 m-0">
                            {{ isEditing ? 'Modifier l\\'objectif' : 'Nouvel Objectif' }}
                        </h3>
                        <p class="text-surface-500 dark:text-surface-400 text-sm m-0">Définissez votre objectif d'épargne</p>
                    </div>
                </div>
            </ng-template>
            
            <ng-template #content>
                <div class="flex flex-col gap-5 pt-4">
                    <!-- Goal Name -->
                    <div class="flex flex-col gap-2">
                        <label class="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-medium text-sm">
                            <i class="pi pi-tag text-indigo-500"></i>
                            Nom de l'objectif
                        </label>
                        <input 
                            pInputText 
                            [(ngModel)]="goalForm.name" 
                            placeholder="Ex: Vacances, Apport maison, Nouvelle voiture..."
                            class="w-full !py-3 !rounded-xl !border-surface-300 dark:!border-surface-600 focus:!border-indigo-500"
                        />
                        <small class="text-rose-500 text-xs" *ngIf="submitted && !goalForm.name">
                            <i class="pi pi-exclamation-circle mr-1"></i>Le nom est requis
                        </small>
                    </div>
                    
                    <!-- Target Amount -->
                    <div class="flex flex-col gap-2">
                        <label class="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-medium text-sm">
                            <i class="pi pi-euro text-emerald-500"></i>
                            Montant cible
                        </label>
                        <p-inputnumber 
                            [(ngModel)]="goalForm.target_amount" 
                            mode="currency" 
                            currency="EUR" 
                            locale="fr-FR"
                            styleClass="w-full"
                            inputStyleClass="!py-3 !rounded-xl !border-surface-300 dark:!border-surface-600 focus:!border-emerald-500"
                        />
                    </div>
                    
                    <!-- Current Amount -->
                    <div class="flex flex-col gap-2">
                        <label class="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-medium text-sm">
                            <i class="pi pi-wallet text-cyan-500"></i>
                            Montant actuel (optionnel)
                        </label>
                        <p-inputnumber 
                            [(ngModel)]="goalForm.current_amount" 
                            mode="currency" 
                            currency="EUR" 
                            locale="fr-FR"
                            styleClass="w-full"
                            inputStyleClass="!py-3 !rounded-xl !border-surface-300 dark:!border-surface-600 focus:!border-cyan-500"
                        />
                    </div>
                    
                    <!-- Target Date -->
                    <div class="flex flex-col gap-2">
                        <label class="flex items-center gap-2 text-surface-700 dark:text-surface-300 font-medium text-sm">
                            <i class="pi pi-calendar text-amber-500"></i>
                            Date cible (optionnel)
                        </label>
                        <input 
                            type="date" 
                            pInputText 
                            [(ngModel)]="goalForm.target_date"
                            class="w-full !py-3 !rounded-xl !border-surface-300 dark:!border-surface-600 focus:!border-amber-500"
                        />
                    </div>
                </div>
            </ng-template>
            
            <ng-template #footer>
                <div class="flex flex-col sm:flex-row gap-3 w-full pt-2">
                    <p-button 
                        label="Annuler" 
                        icon="pi pi-times" 
                        [outlined]="true" 
                        (onClick)="closeGoalDialog()"
                        styleClass="flex-1 !rounded-xl !py-3 !border-surface-300 dark:!border-surface-600"
                    />
                    <p-button 
                        [label]="isEditing ? 'Mettre à jour' : 'Créer'" 
                        icon="pi pi-check" 
                        (onClick)="saveGoal()"
                        [loading]="saving()"
                        styleClass="flex-1 !rounded-xl !py-3 !bg-gradient-to-r !from-indigo-600 !to-cyan-500 !border-0"
                    />
                </div>
            </ng-template>
        </p-dialog>
        
        <p-toast position="top-center" />
        <p-confirmDialog />
    `
})
export class SavingsGoals implements OnInit, OnDestroy {
    private savingsService = inject(SavingsService);
    private stateService = inject(AssetsStateService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    
    private subscription?: Subscription;
    
    loading = signal(true);
    saving = signal(false);
    goals = signal<SavingsGoalDisplay[]>([]);
    
    goalDialogVisible = false;
    isEditing = false;
    submitted = false;
    editingGoalId: number | null = null;
    
    goalForm: SavingGoalCreate = {
        name: '',
        target_amount: 0,
        current_amount: 0,
        target_date: undefined
    };
    
    @Output() goalsChanged = new EventEmitter<SavingsGoalDisplay[]>();

    ngOnInit() {
        this.loadGoals();
        
        this.subscription = this.stateService.savingsUpdated$.subscribe(() => {
            this.loadGoals();
        });
    }
    
    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }
    
    private async loadGoals() {
        this.loading.set(true);
        try {
            const goals = await this.savingsService.getGoals();
            this.goals.set(goals);
            this.goalsChanged.emit(goals);
        } catch (error) {
            console.error('Error loading goals:', error);
        } finally {
            this.loading.set(false);
        }
    }
    
    getProgressPercent(goal: SavingsGoalDisplay): number {
        if (!goal.target || goal.target <= 0) return 0;
        return Math.min(100, Math.round((goal.current / goal.target) * 100));
    }
    
    openNewGoalDialog() {
        this.isEditing = false;
        this.editingGoalId = null;
        this.goalForm = {
            name: '',
            target_amount: 0,
            current_amount: 0,
            target_date: undefined
        };
        this.submitted = false;
        this.goalDialogVisible = true;
    }
    
    editGoal(goal: SavingsGoalDisplay) {
        this.isEditing = true;
        this.editingGoalId = goal.id || null;
        this.goalForm = {
            name: goal.label,
            target_amount: goal.target,
            current_amount: goal.current,
            target_date: goal.targetDate
        };
        this.submitted = false;
        this.goalDialogVisible = true;
    }
    
    closeGoalDialog() {
        this.goalDialogVisible = false;
        this.submitted = false;
    }
    
    async saveGoal() {
        this.submitted = true;
        
        if (!this.goalForm.name?.trim()) {
            return;
        }
        
        this.saving.set(true);
        
        try {
            if (this.isEditing && this.editingGoalId) {
                await this.savingsService.updateGoal(this.editingGoalId, this.goalForm);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Succès',
                    detail: 'Objectif mis à jour',
                    life: 3000
                });
            } else {
                await this.savingsService.createGoal(this.goalForm);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Succès',
                    detail: 'Objectif créé',
                    life: 3000
                });
            }
            
            await this.loadGoals();
            this.stateService.notifySavingsUpdated();
            this.closeGoalDialog();
        } catch (error) {
            console.error('Error saving goal:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Erreur',
                detail: 'Impossible de sauvegarder l\'objectif',
                life: 5000
            });
        } finally {
            this.saving.set(false);
        }
    }
    
    confirmDeleteGoal(goal: SavingsGoalDisplay) {
        this.confirmationService.confirm({
            message: `Êtes-vous sûr de vouloir supprimer l'objectif "${goal.label}" ?`,
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: '!bg-red-500 !border-red-500',
            accept: async () => {
                if (goal.id) {
                    try {
                        await this.savingsService.deleteGoal(goal.id);
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Succès',
                            detail: 'Objectif supprimé',
                            life: 3000
                        });
                        await this.loadGoals();
                        this.stateService.notifySavingsUpdated();
                    } catch (error) {
                        console.error('Error deleting goal:', error);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Erreur',
                            detail: 'Impossible de supprimer l\'objectif',
                            life: 5000
                        });
                    }
                }
            }
        });
    }
}

