import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DividerModule } from 'primeng/divider';
import { ApiService, FIRESettings } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { TokenService } from '../../../core/services/token.service';
import { DashboardService } from '../../service/dashboard.service';
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
                    <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-0 m-0">Mon objectif financier</h2>
                    <p class="text-surface-500 dark:text-surface-400 text-sm m-0">Le capital que vous voulez atteindre — entièrement optionnel</p>
                </div>
            </div>

            <!-- Explainer card -->
            <div class="flex items-start gap-3 p-4 mb-6 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <i class="pi pi-info-circle text-indigo-500 mt-0.5 flex-shrink-0"></i>
                <div class="text-sm text-surface-700 dark:text-surface-300 leading-relaxed">
                    <span class="font-semibold text-indigo-600 dark:text-indigo-400">À quoi ça sert ?</span>
                    <span class="ml-1">C'est simplement un cap que vous vous fixez : le montant total d'épargne et d'investissements à partir duquel vos revenus passifs (loyers, dividendes, intérêts…) couvrent vos dépenses de vie. Une fois ce cap atteint, vous n'êtes plus obligé de travailler pour vivre.</span>
                    <br/>
                    <span class="text-surface-500 dark:text-surface-500 text-xs mt-1 block">Cet objectif est facultatif. L'appli fonctionne parfaitement sans.</span>
                </div>
            </div>

            <!-- Auto-calculation section -->
            <div class="mb-6">
                <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-1">Calculer mon objectif automatiquement</h3>
                <p class="text-surface-500 dark:text-surface-400 text-sm mb-4">
                    Renseignez vos dépenses annuelles et nous calculerons le capital à atteindre.
                    La règle utilisée : votre capital doit être environ 25× vos dépenses annuelles
                    pour que les rendements couvrent vos frais de vie sans puiser dans le capital.
                </p>
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
                            placeholder="Ex : 24 000"
                            inputStyleClass="w-full !py-3 !rounded-xl"
                            styleClass="w-full"
                            (ngModelChange)="onCalcChange()"
                        />
                        <p class="text-xs text-surface-400 dark:text-surface-500">Logement, alimentation, transport, loisirs… sur 12 mois</p>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Taux de rendement attendu (%)</label>
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
                        <p class="text-xs text-surface-400 dark:text-surface-500">Le rendement annuel moyen que vous espérez de vos placements (4 % est une référence prudente)</p>
                    </div>
                </div>

                <!-- Auto-calculated result -->
                @if (autoTarget() > 0) {
                    <div class="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                        <span class="text-surface-700 dark:text-surface-300 text-sm">Capital calculé automatiquement</span>
                        <span class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            <app-amount [value]="autoTarget()" />
                        </span>
                    </div>
                }
            </div>

            <p-divider />

            <!-- Manual target -->
            <div class="mb-6">
                <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-1">Capital cible (€)</h3>
                <p class="text-surface-500 dark:text-surface-400 text-sm mb-4">
                    Pré-rempli depuis le calcul ci-dessus, ou saisissez directement votre propre objectif.
                </p>
                <p-inputnumber
                    [(ngModel)]="fireTarget"
                    [min]="0"
                    mode="currency"
                    currency="EUR"
                    locale="fr-FR"
                    [maxFractionDigits]="0"
                    placeholder="Ex : 600 000"
                    inputStyleClass="w-full !py-3 !rounded-xl"
                    styleClass="w-full md:w-1/2"
                />
                @if (fireTarget && fireTarget > 0) {
                    <p class="text-xs text-surface-400 dark:text-surface-500 mt-2">
                        Votre objectif actuel : <span class="font-semibold text-emerald-600 dark:text-emerald-400"><app-amount [value]="fireTarget" /></span>
                    </p>
                }
            </div>

            <p-divider />

            <!-- Target date (optional) -->
            <div class="mb-8">
                <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-1">Date cible <span class="text-sm font-normal text-surface-400">(facultatif)</span></h3>
                <p class="text-surface-500 dark:text-surface-400 text-sm mb-4">
                    La date à laquelle vous aimeriez atteindre cet objectif. Laissez vide si vous ne vous êtes pas fixé d'échéance.
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

            <!-- Actions -->
            <div class="flex items-center gap-4 flex-wrap">
                <button pButton
                        type="button"
                        label="Enregistrer"
                        icon="pi pi-check"
                        [loading]="isSaving()"
                        (click)="save()"
                        class="!bg-gradient-to-r !from-indigo-600 !to-cyan-500 !text-white !border-0 !px-8 !py-3 !font-semibold hover:!opacity-90"
                ></button>
                @if (hasExistingTarget) {
                    <button pButton
                            type="button"
                            label="Supprimer l'objectif"
                            icon="pi pi-trash"
                            severity="danger"
                            [outlined]="true"
                            [loading]="isClearing()"
                            (click)="clearTarget()"
                            class="!py-3"
                    ></button>
                }
            </div>
        </div>
    `
})
export class FireSettings implements OnInit {
    private apiService = inject(ApiService);
    private authService = inject(AuthService);
    private tokenService = inject(TokenService);
    private dashboardService = inject(DashboardService);
    private messageService = inject(MessageService);
    private router = inject(Router);

    annualExpenses: number | null = null;
    withdrawalRate: number | null = 4.0;
    fireTarget: number | null = null;
    targetDate: Date | null = null;

    isSaving = signal(false);
    isClearing = signal(false);

    get hasExistingTarget(): boolean {
        return !!(this.tokenService.user()?.fire_target_amount);
    }

    autoTarget = computed(() => {
        if (!this.annualExpenses || !this.withdrawalRate || this.withdrawalRate <= 0) return 0;
        return Math.round(this.annualExpenses / (this.withdrawalRate / 100));
    });

    ngOnInit() {
        const user = this.tokenService.user();
        if (user) {
            this.annualExpenses = user.annual_expenses ?? null;
            this.withdrawalRate = user.withdrawal_rate ?? 4.0;
            this.fireTarget = user.fire_target_amount ?? null;
            if (user.fire_target_date) {
                this.targetDate = new Date(user.fire_target_date);
            }
        }
    }

    onCalcChange() {
        const calc = this.autoTarget();
        if (calc > 0) {
            this.fireTarget = calc;
        }
    }

    private getLang(): string {
        return this.router.url.match(/^\/(fr|en)/)?.[1] ?? 'fr';
    }

    save() {
        this.isSaving.set(true);

        const payload: FIRESettings = {
            withdrawal_rate: this.withdrawalRate ?? 4.0
        };
        if (this.fireTarget) payload.fire_target_amount = this.fireTarget;
        if (this.annualExpenses) payload.annual_expenses = this.annualExpenses;
        if (this.targetDate) {
            payload.fire_target_date = this.targetDate.toISOString().split('T')[0];
        }

        this.apiService.updateFIRESettings(payload).subscribe({
            next: (updatedUser) => {
                // Refresh user in token service so other components see the new values
                if (updatedUser) {
                    this.tokenService.setUser(updatedUser);
                } else {
                    this.authService.getCurrentUser().subscribe();
                }
                // Invalidate dashboard cache so it recomputes with the new target
                this.dashboardService.invalidateCache();

                this.isSaving.set(false);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Objectif enregistré',
                    detail: 'Votre objectif financier a été mis à jour.',
                    life: 2000
                });
                setTimeout(() => {
                    this.router.navigate([`/${this.getLang()}`]);
                }, 800);
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

    clearTarget() {
        this.isClearing.set(true);

        this.apiService.updateFIRESettings({
            fire_target_amount: null,
            fire_target_date: null,
            annual_expenses: null,
            withdrawal_rate: 4.0
        }).subscribe({
            next: (updatedUser) => {
                if (updatedUser) {
                    this.tokenService.setUser(updatedUser);
                } else {
                    this.authService.getCurrentUser().subscribe();
                }
                this.dashboardService.invalidateCache();
                this.annualExpenses = null;
                this.fireTarget = null;
                this.targetDate = null;
                this.withdrawalRate = 4.0;
                this.isClearing.set(false);
                this.messageService.add({
                    severity: 'info',
                    summary: 'Objectif supprimé',
                    detail: 'Votre objectif financier a été retiré. L\'appli continue de fonctionner normalement.',
                    life: 3000
                });
            },
            error: (err) => {
                this.isClearing.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: err.message || 'Impossible de supprimer l\'objectif.',
                    life: 5000
                });
            }
        });
    }
}
