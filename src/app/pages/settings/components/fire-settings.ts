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

import { CurrencyService } from '../../../core/services/currency.service';

@Component({
    selector: 'app-fire-settings',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, InputNumberModule, DatePickerModule, ToastModule, DividerModule],
    providers: [MessageService],
    template: `
        <p-toast position="top-center"></p-toast>
        <div class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 p-5 sm:p-6">
            <div class="absolute inset-0 bg-gradient-to-br from-surface-50 via-surface-50 to-ochre-50/20 dark:from-surface-800 dark:via-surface-800/90 dark:to-ochre-900/10"></div>
            <div class="absolute top-3 right-3 w-16 h-16 rounded-full bg-ochre-100/25 dark:bg-ochre-800/10 blur-lg"></div>
            <!-- Header -->
            <div class="relative flex items-center gap-4 mb-6">
                <div class="w-12 h-12 rounded-2xl bg-white/80 dark:bg-surface-700/80 backdrop-blur shadow-sm flex items-center justify-center">
                    <i class="pi pi-flag text-positive text-xl"></i>
                </div>
                <div>
                    <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-0 m-0">Mon objectif financier</h2>
                    <p class="text-surface-500 dark:text-surface-400 text-sm m-0">Le capital que vous voulez atteindre — entièrement optionnel</p>
                </div>
            </div>

            <!-- Explainer card -->
            <div class="relative flex items-start gap-3 p-4 mb-6 bg-brand-700/10 dark:bg-brand-300/15 border border-brand-100 dark:border-brand-800 rounded-xl">
                <i class="pi pi-info-circle text-brand-700 dark:text-brand-300 mt-0.5 flex-shrink-0"></i>
                <div class="text-sm text-surface-700 dark:text-surface-300 leading-relaxed">
                    <span class="font-semibold text-brand-700 dark:text-ochre-400">À quoi ça sert ?</span>
                    <span class="ml-1">C'est simplement un cap que vous vous fixez : le montant total d'épargne et d'investissements à partir duquel vos revenus passifs (loyers, dividendes, intérêts…) couvrent vos dépenses de vie. Une fois ce cap atteint, vous n'êtes plus obligé de travailler pour vivre.</span>
                    <br/>
                    <span class="text-surface-500 dark:text-surface-500 text-xs mt-1 block">Cet objectif est facultatif. L'appli fonctionne parfaitement sans.</span>
                </div>
            </div>

            <!-- Auto-calculation section -->
            <div class="relative mb-6">
                <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-1">Calculer mon objectif automatiquement</h3>
                <p class="text-surface-500 dark:text-surface-400 text-sm mb-4">
                    Renseignez vos dépenses annuelles et nous calculerons le capital à atteindre.
                    La règle utilisée : votre capital doit être environ 25× vos dépenses annuelles
                    pour que les rendements couvrent vos frais de vie sans puiser dans le capital.
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-surface-500 dark:text-surface-400">
                            Dépenses annuelles <span class="text-surface-400">({{ cs.config().symbol }})</span>
                        </label>
                        <p-inputnumber
                            [(ngModel)]="annualExpenses"
                            [min]="0"
                            mode="decimal"
                            [minFractionDigits]="0" [maxFractionDigits]="0"
                            placeholder="Ex : 15 000 000"
                            inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400"
                            styleClass="w-full"
                            (ngModelChange)="onCalcChange()"
                        />
                        <p class="text-xs text-surface-400 dark:text-surface-500 mt-1">Logement, alimentation, transport, loisirs… sur 12 mois</p>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-surface-500 dark:text-surface-400">Taux de rendement attendu (%)</label>
                        <p-inputnumber
                            [(ngModel)]="withdrawalRate"
                            [min]="1"
                            [max]="10"
                            [minFractionDigits]="1"
                            [maxFractionDigits]="1"
                            suffix="%"
                            placeholder="4.0"
                            inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400"
                            styleClass="w-full"
                            (ngModelChange)="onCalcChange()"
                        />
                        <p class="text-xs text-surface-400 dark:text-surface-500 mt-1">Le rendement annuel moyen que vous espérez de vos placements (4 % est une référence prudente)</p>
                    </div>
                </div>

                <!-- Auto-calculated result -->
                <!-- autoTarget() returns a display-currency value (annualExpenses is in display currency)
                     — format directly, do NOT use app-amount which expects EUR and would double-convert -->
                @if (autoTarget() > 0) {
                    <div class="mt-4 p-4 bg-positive/10 border border-positive-100 dark:border-positive-700/40 rounded-xl flex items-center justify-between">
                        <span class="text-surface-700 dark:text-surface-300 text-sm">Capital calculé automatiquement</span>
                        <span class="text-2xl font-bold text-positive dark:text-positive-400">
                            {{ cs.formatNumber(autoTarget()) }} {{ cs.config().symbol }}
                        </span>
                    </div>
                }
            </div>

            <p-divider />

            <!-- Manual target -->
            <div class="relative mb-6">
                <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-1">
                    Capital cible <span class="text-surface-400 font-normal text-base">({{ cs.config().symbol }})</span>
                </h3>
                <p class="text-surface-500 dark:text-surface-400 text-sm mb-4">
                    Pré-rempli depuis le calcul ci-dessus, ou saisissez directement votre propre objectif.
                </p>
                <p-inputnumber
                    [(ngModel)]="fireTarget"
                    [min]="0"
                    mode="decimal"
                    [minFractionDigits]="0" [maxFractionDigits]="0"
                    placeholder="Ex : 375 000 000"
                    inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400"
                    styleClass="w-full md:w-1/2"
                />
                @if (fireTarget && fireTarget > 0) {
                    <p class="text-xs text-surface-400 dark:text-surface-500 mt-2">
                        Votre objectif actuel :
                        <!-- fireTarget is already in display currency — format directly, do NOT use app-amount which would double-convert -->
                        <span class="font-semibold text-positive dark:text-positive-400">
                            {{ cs.formatNumber(fireTarget) }} {{ cs.config().symbol }}
                        </span>
                    </p>
                }
            </div>

            <p-divider />

            <!-- Target date (optional) -->
            <div class="relative mb-8">
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
                    inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400"
                />
            </div>

            <!-- Actions -->
            <div class="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button pButton
                        type="button"
                        label="Enregistrer"
                        icon="pi pi-check"
                        [loading]="isSaving()"
                        (click)="save()"
                        class="omaad-cta !rounded-full !px-8 !py-3 !font-semibold"
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
                            class="!rounded-full !py-3"
                    ></button>
                }
            </div>
        </div>
    `
})
export class FireSettings implements OnInit {
    private apiService       = inject(ApiService);
    private authService      = inject(AuthService);
    private tokenService     = inject(TokenService);
    private dashboardService = inject(DashboardService);
    private messageService   = inject(MessageService);
    private router           = inject(Router);
    cs = inject(CurrencyService);

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
            // API stores amounts in EUR — convert to display currency so the
            // user sees their preferred currency in the input fields.
            const toDisplay = (v: number | null | undefined) =>
                v != null ? Math.round(this.cs.convert(v)) : null;

            this.annualExpenses = toDisplay(user.annual_expenses);
            this.withdrawalRate = user.withdrawal_rate ?? 4.0;
            this.fireTarget     = toDisplay(user.fire_target_amount);
            if (user.fire_target_date) {
                this.targetDate = new Date(user.fire_target_date);
            }
        }
    }

    onCalcChange() {
        const calc = this.autoTarget();
        // autoTarget() returns a display-currency value — keep it in display
        // currency for the input field; save() will convert to EUR on submit.
        if (calc > 0) {
            this.fireTarget = calc;
        }
    }

    private getLang(): string {
        return this.router.url.match(/^\/(fr|en)/)?.[1] ?? 'fr';
    }

    save() {
        this.isSaving.set(true);

        // Convert monetary fields from display currency → EUR before sending to API.
        const toBase = (v: number) => this.cs.toBaseAmount(v);

        const payload: FIRESettings = {
            withdrawal_rate: this.withdrawalRate ?? 4.0
        };
        if (this.fireTarget)     payload.fire_target_amount = toBase(this.fireTarget);
        if (this.annualExpenses) payload.annual_expenses    = toBase(this.annualExpenses);
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
