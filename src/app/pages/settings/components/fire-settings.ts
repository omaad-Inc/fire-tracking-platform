import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DividerModule } from 'primeng/divider';
import { ApiService } from '../../../core/services/api.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';

@Component({
    selector: 'app-fire-settings',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, InputNumberModule, DatePickerModule, ToastModule, DividerModule, AppAmountComponent],
    providers: [MessageService],
    template: `
        <p-toast position="top-center"></p-toast>
        <div class="card">
            <!-- Header -->
            <div class="flex items-center gap-4 mb-6">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <i class="pi pi-flag text-white text-xl"></i>
                </div>
                <div>
                    <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-0 m-0">Objectif FIRE</h2>
                    <p class="text-surface-500 dark:text-surface-400 text-sm m-0">Financial Independence, Retire Early</p>
                </div>
            </div>

            <!-- Info card: règle des 4% -->
            <div class="flex items-start gap-3 p-4 mb-6 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <i class="pi pi-info-circle text-indigo-500 mt-0.5 flex-shrink-0"></i>
                <div class="text-sm text-surface-700 dark:text-surface-300">
                    <span class="font-semibold text-indigo-600 dark:text-indigo-400">Règle des 4 %</span> — Votre objectif FIRE est calculé en multipliant vos dépenses annuelles par 25 (l'inverse du taux de retrait de 4 %). Ce montant représente le capital nécessaire pour vivre indéfiniment de vos rendements sans toucher au capital.
                </div>
            </div>

            <!-- Calcul automatique -->
            <div class="mb-6">
                <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-4">Calcul automatique</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="flex flex-col gap-2">
                        <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Dépenses annuelles (€)</label>
                        <p-inputnumber
                            [(ngModel)]="annualExpenses"
                            [min]="0"
                            mode="currency"
                            currency="EUR"
                            locale="fr-FR"
                            [maxFractionDigits]="0"
                            placeholder="Ex: 24 000"
                            inputStyleClass="w-full !py-3 !rounded-xl"
                            styleClass="w-full"
                            (ngModelChange)="onCalcChange()"
                        />
                        <p class="text-xs text-surface-400 dark:text-surface-500">Toutes vos dépenses courantes sur 12 mois</p>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Taux de retrait (%)</label>
                        <p-inputnumber
                            [(ngModel)]="withdrawalRate"
                            [min]="1"
                            [max]="10"
                            [minFractionDigits]="1"
                            [maxFractionDigits]="1"
                            suffix="%"
                            placeholder="4.0"
                            inputStyleClass="w-full !py-3 !rounded-xl"
                            styleClass="w-full"
                            (ngModelChange)="onCalcChange()"
                        />
                        <p class="text-xs text-surface-400 dark:text-surface-500">Généralement entre 3 % et 4 % (recommandé : 4 %)</p>
                    </div>
                </div>

                <!-- Auto-calculated result -->
                @if (autoTarget() > 0) {
                    <div class="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                        <span class="text-surface-700 dark:text-surface-300 text-sm">Objectif calculé automatiquement</span>
                        <span class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            <app-amount [value]="autoTarget()" />
                        </span>
                    </div>
                }
            </div>

            <p-divider />

            <!-- Montant cible FIRE -->
            <div class="mb-6">
                <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-1">Montant cible FIRE (€)</h3>
                <p class="text-surface-500 dark:text-surface-400 text-sm mb-4">
                    Pré-rempli automatiquement depuis le calcul ci-dessus, ou saisissez votre propre montant.
                </p>
                <p-inputnumber
                    [(ngModel)]="fireTarget"
                    [min]="0"
                    mode="currency"
                    currency="EUR"
                    locale="fr-FR"
                    [maxFractionDigits]="0"
                    placeholder="Ex: 600 000"
                    inputStyleClass="w-full !py-3 !rounded-xl"
                    styleClass="w-full md:w-1/2"
                />
            </div>

            <p-divider />

            <!-- Date cible (optional) -->
            <div class="mb-8">
                <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-1">Date cible (optionnel)</h3>
                <p class="text-surface-500 dark:text-surface-400 text-sm mb-4">
                    La date à laquelle vous souhaitez atteindre la liberté financière.
                </p>
                <p-datepicker
                    [(ngModel)]="targetDate"
                    [showIcon]="true"
                    [showButtonBar]="true"
                    dateFormat="dd/mm/yy"
                    placeholder="Sélectionner une date"
                    styleClass="w-full md:w-1/2"
                    inputStyleClass="!py-3 !rounded-xl"
                />
            </div>

            <!-- Save button -->
            <div class="flex items-center gap-4">
                <button pButton
                        type="button"
                        label="Enregistrer"
                        icon="pi pi-check"
                        [loading]="isSaving()"
                        (click)="save()"
                        class="!bg-gradient-to-r !from-indigo-600 !to-cyan-500 !text-white !border-0 !px-8 !py-3 !font-semibold hover:!opacity-90"
                ></button>
                @if (saveSuccess()) {
                    <span class="flex items-center gap-2 text-emerald-500 text-sm font-medium">
                        <i class="pi pi-check-circle"></i> Enregistré avec succès
                    </span>
                }
            </div>
        </div>
    `
})
export class FireSettings implements OnInit {
    private apiService = inject(ApiService);
    private messageService = inject(MessageService);

    annualExpenses: number | null = null;
    withdrawalRate: number | null = 4.0;
    fireTarget: number | null = null;
    targetDate: Date | null = null;

    isSaving = signal(false);
    saveSuccess = signal(false);

    autoTarget = computed(() => {
        if (!this.annualExpenses || !this.withdrawalRate || this.withdrawalRate <= 0) return 0;
        return Math.round(this.annualExpenses / (this.withdrawalRate / 100));
    });

    ngOnInit() {}

    onCalcChange() {
        const calc = this.autoTarget();
        if (calc > 0) {
            this.fireTarget = calc;
        }
    }

    save() {
        this.isSaving.set(true);
        this.saveSuccess.set(false);

        const payload: any = {};
        if (this.fireTarget) payload.fire_target_amount = this.fireTarget;
        if (this.annualExpenses) payload.annual_expenses = this.annualExpenses;
        if (this.withdrawalRate) payload.withdrawal_rate = this.withdrawalRate;
        if (this.targetDate) {
            payload.fire_target_date = this.targetDate.toISOString().split('T')[0];
        }

        this.apiService.updateFIRESettings(payload as any).subscribe({
            next: () => {
                this.isSaving.set(false);
                this.saveSuccess.set(true);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Objectif FIRE enregistré',
                    detail: 'Vos paramètres FIRE ont été mis à jour.',
                    life: 4000
                });
                setTimeout(() => this.saveSuccess.set(false), 4000);
            },
            error: (err) => {
                this.isSaving.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: err.message || 'Impossible de sauvegarder les paramètres.',
                    life: 5000
                });
            }
        });
    }
}
