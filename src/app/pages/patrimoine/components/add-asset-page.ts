import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AssetCreate, AssetCategory } from '../../../core/services/api.service';
import { PatrimoineService } from '../../service/patrimoine.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { CurrencyService } from '../../../core/services/currency.service';
import { TokenService } from '../../../core/services/token.service';

interface Owner {
    name: string;
    initials: string;
    percentage: number;
}

interface AssetFormData {
    name: string;
    category: AssetCategory | '';
    quantity: number;
    purchasePrice: number;
    currentPrice: number;
    purchaseDate: string;
    institution: string;
    owners: Owner[];
    tontineMonthlyContribution: number;
    tontineParticipants: number;
    tontineStartDate: string;
    tontineCollectionDate: string;
    tontineStatus: 'en_cours' | 'mise_recue' | 'termine';
    mobileMoneyProvider: string;
    surfaceM2: number;
    region: string;
}

interface CategoryCard {
    value: AssetCategory;
    label: string;
    desc: string;
    icon: string;
    bgClass: string;
    textClass: string;
}

@Component({
    selector: 'app-add-asset-page',
    standalone: true,
    imports: [
        CommonModule, FormsModule, ButtonModule, InputTextModule,
        SelectModule, InputNumberModule, ToastModule, AppAmountComponent, DecimalPipe
    ],
    providers: [MessageService],
    template: `
        <p-toast position="top-center"></p-toast>

        <div class="flex flex-col min-h-[calc(100vh-8rem)]">
            <!-- Header -->
            <div class="flex items-center gap-4 mb-6">
                <button (click)="goBack()"
                        class="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-all cursor-pointer">
                    <i class="pi pi-arrow-left text-surface-600 dark:text-surface-300"></i>
                </button>
                <div class="flex-1 min-w-0">
                    <h1 class="text-xl font-bold text-surface-900 dark:text-surface-0 m-0">
                        @if (currentStep() === 0) { Ajouter un actif }
                        @if (currentStep() === 1) {
                            <span class="flex items-center gap-2">
                                @if (selectedCard()) {
                                    <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg {{ selectedCard()!.bgClass }}">
                                        <i class="pi {{ selectedCard()!.icon }} {{ selectedCard()!.textClass }} text-sm"></i>
                                    </span>
                                }
                                {{ selectedCard()?.label ?? 'Informations' }}
                            </span>
                        }
                        @if (currentStep() === 2) { Répartition }
                    </h1>
                </div>
                <!-- Step dots -->
                <div class="flex items-center gap-1.5 shrink-0">
                    @for (s of [0, 1, 2]; track s) {
                        <div class="w-2 h-2 rounded-full transition-all"
                             [ngClass]="currentStep() >= s ? 'bg-indigo-500 w-5' : 'bg-surface-300 dark:bg-surface-600'"></div>
                    }
                </div>
            </div>

            <!-- Content -->
            <div class="flex-1">

                <!-- ===== STEP 0: Category Picker (Full-page, Finary-style) ===== -->
                @if (currentStep() === 0) {
                    <div class="max-w-3xl mx-auto">
                        <p class="text-surface-500 dark:text-surface-400 text-sm mb-5">Sélectionnez le type d'actif à ajouter à votre patrimoine</p>

                        <!-- Search -->
                        <div class="relative mb-6">
                            <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-surface-400"></i>
                            <input pInputText
                                   [(ngModel)]="searchQuery"
                                   placeholder="Rechercher un type d'actif..."
                                   class="w-full !pl-11 !py-3 !bg-surface-50 dark:!bg-surface-800 !border-surface-200 dark:!border-surface-700 !rounded-xl" />
                        </div>

                        <!-- Desktop: 2-column card grid -->
                        <div class="hidden md:grid grid-cols-2 gap-3">
                            @for (cat of filteredCategories(); track cat.value) {
                                <button type="button"
                                        (click)="selectCategory(cat.value)"
                                        class="flex items-center gap-4 p-4 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-500/5 transition-all text-left group">
                                    <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 {{ cat.bgClass }} transition-transform group-hover:scale-110">
                                        <i class="pi {{ cat.icon }} {{ cat.textClass }} text-xl"></i>
                                    </div>
                                    <div class="min-w-0 flex-1">
                                        <div class="font-semibold text-surface-900 dark:text-surface-0 text-sm">{{ cat.label }}</div>
                                        <div class="text-surface-400 text-xs mt-0.5">{{ cat.desc }}</div>
                                    </div>
                                    <i class="pi pi-chevron-right text-surface-300 text-xs group-hover:text-indigo-400 transition-colors"></i>
                                </button>
                            }
                        </div>

                        <!-- Mobile: vertical list -->
                        <div class="md:hidden divide-y divide-surface-200 dark:divide-surface-700">
                            @for (cat of filteredCategories(); track cat.value) {
                                <button type="button"
                                        (click)="selectCategory(cat.value)"
                                        class="w-full flex items-center gap-4 py-4 px-1 text-left group">
                                    <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 {{ cat.bgClass }}">
                                        <i class="pi {{ cat.icon }} {{ cat.textClass }} text-lg"></i>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="font-semibold text-surface-900 dark:text-surface-0 text-sm">{{ cat.label }}</div>
                                    </div>
                                    <i class="pi pi-chevron-right text-surface-300 text-xs"></i>
                                </button>
                            }
                        </div>

                        @if (filteredCategories().length === 0) {
                            <div class="text-center py-12 text-surface-400">
                                <i class="pi pi-search text-2xl mb-3 block"></i>
                                <p class="text-sm">Aucun type d'actif trouvé</p>
                            </div>
                        }
                    </div>
                }

                <!-- ===== STEPS 1 & 2: Form ===== -->
                @if (currentStep() >= 1) {
                    <div class="max-w-2xl mx-auto">
                        <div class="flex flex-col lg:flex-row gap-6">
                            <!-- Step sidebar -->
                            <div class="w-full lg:w-48 shrink-0">
                                <div class="flex lg:flex-col gap-3">
                                    <button type="button"
                                            class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left w-full"
                                            [ngClass]="currentStep() === 1 ? 'bg-primary/10 text-primary font-semibold' : 'text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700'"
                                            (click)="goToStep(1)">
                                        <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                              [ngClass]="currentStep() === 1 ? 'bg-primary text-white' : 'bg-surface-200 dark:bg-surface-600 text-surface-600 dark:text-surface-300'">1</span>
                                        <span class="text-sm">Informations</span>
                                    </button>
                                    <button type="button"
                                            class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left w-full"
                                            [ngClass]="currentStep() === 2 ? 'bg-primary/10 text-primary font-semibold' : 'text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700'"
                                            (click)="goToStep(2)"
                                            [disabled]="!isStep1Valid()">
                                        <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                              [ngClass]="currentStep() === 2 ? 'bg-primary text-white' : 'bg-surface-200 dark:bg-surface-600 text-surface-600 dark:text-surface-300'">2</span>
                                        <span class="text-sm">Répartition</span>
                                    </button>
                                </div>
                            </div>

                            <!-- Form content -->
                            <div class="flex-1">
                                <!-- Step 1: Per-category form -->
                                @if (currentStep() === 1) {
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <!-- Name (always) -->
                                        <div class="flex flex-col gap-2 md:col-span-2">
                                            <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Nom de l'actif <span class="text-red-400">*</span></label>
                                            <input pInputText [(ngModel)]="assetForm.name" [placeholder]="namePlaceholder()"
                                                   class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary" />
                                        </div>

                                        <!-- TONTINE -->
                                        @if (assetForm.category === 'tontine') {
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Mise mensuelle <span class="text-red-400">*</span></label>
                                                <div class="relative">
                                                    <p-inputnumber [(ngModel)]="assetForm.tontineMonthlyContribution" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary !pr-16" />
                                                    <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ cs.config().symbol }}</span>
                                                </div>
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Nombre de participants <span class="text-red-400">*</span></label>
                                                <p-inputnumber [(ngModel)]="assetForm.tontineParticipants" [min]="2" [max]="100"
                                                    inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary" />
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Date de début <span class="text-red-400">*</span></label>
                                                <input pInputText type="date" [(ngModel)]="assetForm.tontineStartDate"
                                                       class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary" />
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Date de collecte de ma mise</label>
                                                <input pInputText type="date" [(ngModel)]="assetForm.tontineCollectionDate"
                                                       class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary" />
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Statut</label>
                                                <p-select [(ngModel)]="assetForm.tontineStatus" [options]="tontineStatusOptions" optionLabel="label" optionValue="value"
                                                    styleClass="w-full !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !shadow-none" />
                                            </div>
                                            @if (assetForm.tontineStartDate && assetForm.tontineMonthlyContribution > 0) {
                                                <div class="md:col-span-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
                                                    <i class="pi pi-calculator text-indigo-400"></i>
                                                    <div>
                                                        <p class="text-xs text-surface-400 mb-0.5">Valeur accumulée estimée</p>
                                                        <p class="font-bold text-indigo-400">
                                                            {{ tontineCurrentValue() | number:'1.0-0' }} {{ cs.config().symbol }}
                                                            <span class="text-xs font-normal text-surface-400">({{ tontineMonthsElapsed() }} mois × {{ assetForm.tontineMonthlyContribution | number:'1.0-0' }})</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            }
                                        }

                                        <!-- MOBILE MONEY -->
                                        @if (assetForm.category === 'mobile_money') {
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Opérateur <span class="text-red-400">*</span></label>
                                                <p-select [(ngModel)]="assetForm.mobileMoneyProvider" [options]="mobileMoneyProviders" optionLabel="label" optionValue="value"
                                                    placeholder="Sélectionner l'opérateur"
                                                    styleClass="w-full !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !shadow-none" />
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Solde actuel <span class="text-red-400">*</span></label>
                                                <div class="relative">
                                                    <p-inputnumber [(ngModel)]="assetForm.currentPrice" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary !pr-16" />
                                                    <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ cs.config().symbol }}</span>
                                                </div>
                                            </div>
                                            <div class="md:col-span-2 flex items-center gap-2 text-xs text-surface-400">
                                                <i class="pi pi-info-circle text-cyan-400"></i>
                                                Intégration API Wave / Orange Money prévue — mises à jour automatiques à venir.
                                            </div>
                                        }

                                        <!-- QUANTITY-BASED -->
                                        @if (isQuantityBased()) {
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Quantité</label>
                                                <p-inputnumber [ngModel]="assetForm.quantity" (ngModelChange)="assetForm.quantity = ($event == null || $event < 1) ? 1 : $event"
                                                    mode="decimal" [minFractionDigits]="0" [maxFractionDigits]="0" [min]="1" [allowEmpty]="false"
                                                    inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary" />
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Prix d'achat unitaire <span class="text-red-400">*</span></label>
                                                <div class="relative">
                                                    <p-inputnumber [(ngModel)]="assetForm.purchasePrice" mode="decimal" [minFractionDigits]="0" [maxFractionDigits]="2"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary !pr-16" />
                                                    <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ cs.config().symbol }}</span>
                                                </div>
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Valeur actuelle unitaire <span class="text-surface-400 text-xs">(optionnel)</span></label>
                                                <div class="relative">
                                                    <p-inputnumber [(ngModel)]="assetForm.currentPrice" mode="decimal" [minFractionDigits]="0" [maxFractionDigits]="2"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary !pr-16" />
                                                    <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ cs.config().symbol }}</span>
                                                </div>
                                            </div>
                                        }

                                        <!-- SIMPLE BALANCE (cash, savings_account) -->
                                        @if (assetForm.category === 'cash' || assetForm.category === 'savings_account') {
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">
                                                    {{ assetForm.category === 'cash' ? 'Solde actuel' : 'Montant de l\\'épargne' }} <span class="text-red-400">*</span>
                                                </label>
                                                <div class="relative">
                                                    <p-inputnumber [(ngModel)]="assetForm.currentPrice" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary !pr-16" />
                                                    <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ cs.config().symbol }}</span>
                                                </div>
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Banque</label>
                                                <input pInputText [(ngModel)]="assetForm.institution"
                                                       [placeholder]="assetForm.category === 'cash' ? 'Ex: SGBS, Ecobank...' : 'Ex: CBAO, BHS...'"
                                                       class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary" />
                                            </div>
                                        }

                                        <!-- TOTAL-VALUE-BASED -->
                                        @if (!isQuantityBased() && !isSimpleBalanceCategory() && assetForm.category !== 'tontine' && assetForm.category !== 'mobile_money') {
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">
                                                    Valeur d'achat / initiale
                                                    @if (assetForm.category === 'real_estate' || assetForm.category === 'vehicle') {
                                                        <span class="text-red-400">*</span>
                                                    }
                                                </label>
                                                <div class="relative">
                                                    <p-inputnumber [(ngModel)]="assetForm.purchasePrice" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary !pr-16" />
                                                    <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ cs.config().symbol }}</span>
                                                </div>
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">
                                                    Valeur actuelle
                                                    @if (assetForm.category === 'real_estate' || assetForm.category === 'vehicle') {
                                                        <span class="text-surface-400 text-xs">(optionnel)</span>
                                                    } @else {
                                                        <span class="text-red-400">*</span>
                                                    }
                                                </label>
                                                <div class="relative">
                                                    <p-inputnumber [(ngModel)]="assetForm.currentPrice" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary !pr-16" />
                                                    <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ cs.config().symbol }}</span>
                                                </div>
                                            </div>
                                        }

                                        <!-- Purchase date -->
                                        @if (assetForm.category !== 'mobile_money' && assetForm.category !== 'tontine' && !isSimpleBalanceCategory()) {
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Date d'achat</label>
                                                <input pInputText type="date" [(ngModel)]="assetForm.purchaseDate"
                                                       class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary" />
                                            </div>
                                        }

                                        <!-- Institution -->
                                        @if (isInstitutionBased() && !isSimpleBalanceCategory()) {
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ institutionLabel() }}</label>
                                                <input pInputText [(ngModel)]="assetForm.institution" [placeholder]="institutionPlaceholder()"
                                                       class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary" />
                                            </div>
                                        }

                                        <!-- Real estate specific -->
                                        @if (assetForm.category === 'real_estate') {
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Superficie (m²)</label>
                                                <p-inputnumber [(ngModel)]="assetForm.surfaceM2" [min]="0" [minFractionDigits]="0" [maxFractionDigits]="1" suffix=" m²" placeholder="Ex : 150"
                                                    inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary" />
                                            </div>
                                            @if (assetForm.surfaceM2 > 0 && assetForm.purchasePrice > 0) {
                                                <div class="flex items-center justify-between px-1 py-2 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
                                                    <span class="text-surface-500 dark:text-surface-400 text-xs">Prix au m² (achat)</span>
                                                    <span class="text-indigo-500 font-semibold text-sm">
                                                        {{ (assetForm.purchasePrice / assetForm.surfaceM2) | number:'1.0-0' }} {{ cs.config().symbol }}/m²
                                                    </span>
                                                </div>
                                            }
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Région / Localité</label>
                                                <input pInputText [(ngModel)]="assetForm.region" placeholder="Ex : Dakar, Abidjan, Paris..."
                                                       class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary" />
                                            </div>
                                        }
                                    </div>
                                }

                                <!-- Step 2: Ownership -->
                                @if (currentStep() === 2) {
                                    <div class="space-y-6">
                                        <div class="flex items-center justify-center mb-6">
                                            <div class="flex flex-col items-center">
                                                <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 {{ selectedCard()?.bgClass ?? 'bg-surface-200 dark:bg-surface-700' }}">
                                                    <i class="pi {{ selectedCard()?.icon ?? 'pi-box' }} text-2xl {{ selectedCard()?.textClass ?? 'text-surface-500' }}"></i>
                                                </div>
                                                <span class="text-surface-500 dark:text-surface-400 text-sm">{{ assetForm.name || 'Actif' }}</span>
                                                <span class="text-2xl font-bold text-surface-900 dark:text-surface-0 mt-1">
                                                    <app-amount [value]="toEur(totalValue())" />
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 class="text-surface-500 dark:text-surface-400 text-sm mb-4">Propriétaires</h3>
                                            <div class="space-y-3">
                                                @for (owner of assetForm.owners; track owner.name) {
                                                    <div class="flex items-center justify-between p-4 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                                                        <div class="flex items-center gap-3">
                                                            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
                                                                <span class="text-white font-semibold text-sm">{{ owner.initials }}</span>
                                                            </div>
                                                            <div>
                                                                <span class="font-medium text-surface-900 dark:text-surface-0">{{ owner.name }}</span>
                                                                <span class="text-surface-500 dark:text-surface-400 text-sm block">{{ owner.percentage | number:'1.2-2' }} %</span>
                                                            </div>
                                                        </div>
                                                        @if (assetForm.owners.length > 1) {
                                                            <button type="button" class="w-8 h-8 rounded-full hover:bg-surface-200 dark:hover:bg-surface-700 flex items-center justify-center transition-colors"
                                                                    (click)="removeOwner(owner)">
                                                                <i class="pi pi-times text-surface-400"></i>
                                                            </button>
                                                        }
                                                    </div>
                                                }
                                            </div>
                                        </div>

                                        <div>
                                            <h3 class="text-surface-500 dark:text-surface-400 text-sm mb-4">Co-propriétaires</h3>
                                            <button type="button" (click)="addMember()"
                                                    class="flex items-center gap-3 p-4 rounded-xl border border-dashed border-surface-300 dark:border-surface-600 hover:border-primary hover:bg-primary/5 transition-all w-full">
                                                <div class="w-10 h-10 rounded-full border-2 border-surface-300 dark:border-surface-600 flex items-center justify-center">
                                                    <i class="pi pi-plus text-surface-400"></i>
                                                </div>
                                                <span class="text-surface-600 dark:text-surface-300">Ajouter un co-propriétaire</span>
                                            </button>
                                        </div>
                                    </div>
                                }
                            </div>
                        </div>
                    </div>
                }
            </div>

            <!-- Footer buttons -->
            @if (currentStep() >= 1) {
                <div class="flex items-center justify-end gap-4 pt-6 mt-6 border-t border-surface-200 dark:border-surface-700">
                    @if (currentStep() === 1) {
                        <button pButton type="button" label="Suivant" class="px-8"
                                [disabled]="!isStep1Valid()" (click)="nextStep()"></button>
                    } @else {
                        <button pButton type="button" label="Retour" [outlined]="true" (click)="previousStep()"></button>
                        <button pButton type="button" label="Enregistrer"
                                class="!bg-gradient-to-r !from-indigo-600 !to-cyan-500 !text-white !border-0 hover:!opacity-90"
                                [loading]="isSubmitting()" (click)="submitAsset()"></button>
                    }
                </div>
            }
        </div>
    `
})
export class AddAssetPage implements OnInit {
    private router = inject(Router);
    private location = inject(Location);
    private patrimoineService = inject(PatrimoineService);
    private messageService = inject(MessageService);
    private tokenService = inject(TokenService);
    cs = inject(CurrencyService);

    lang = 'fr';
    currentStep = signal(0);
    isSubmitting = signal(false);
    selectedCategory = signal<AssetCategory | ''>('');
    searchQuery = '';

    assetForm: AssetFormData = {
        name: '', category: '', quantity: 1, purchasePrice: 0, currentPrice: 0,
        purchaseDate: '', institution: '', owners: [],
        tontineMonthlyContribution: 0, tontineParticipants: 2, tontineStartDate: '',
        tontineCollectionDate: '', tontineStatus: 'en_cours', mobileMoneyProvider: '',
        surfaceM2: 0, region: ''
    };

    categoryCards: CategoryCard[] = [
        { value: 'real_estate',     label: 'Immobilier',      desc: 'Appartement, terrain...', icon: 'pi-home',        bgClass: 'bg-indigo-500/10',  textClass: 'text-indigo-400' },
        { value: 'stocks',          label: 'Actions / Bourse', desc: 'BRVM, ETF, fonds...',    icon: 'pi-chart-line',  bgClass: 'bg-cyan-500/10',    textClass: 'text-cyan-400' },
        { value: 'bonds',           label: 'Obligations',     desc: 'Bons du trésor...',        icon: 'pi-percentage',  bgClass: 'bg-blue-500/10',    textClass: 'text-blue-400' },
        { value: 'crypto',          label: 'Crypto',          desc: 'Bitcoin, USDT...',          icon: 'pi-bolt',        bgClass: 'bg-orange-500/10',  textClass: 'text-orange-400' },
        { value: 'cash',            label: 'Compte bancaire', desc: 'Compte courant, compte chèque', icon: 'pi-wallet',   bgClass: 'bg-emerald-500/10', textClass: 'text-emerald-400' },
        { value: 'life_insurance',  label: 'Assurance vie',   desc: 'Contrats vie...',           icon: 'pi-shield',      bgClass: 'bg-teal-500/10',    textClass: 'text-teal-400' },
        { value: 'savings_account', label: 'Livret épargne',  desc: 'Livret A, CEL...',          icon: 'pi-book',        bgClass: 'bg-green-500/10',   textClass: 'text-green-400' },
        { value: 'vehicle',         label: 'Véhicule',        desc: 'Voiture, moto...',          icon: 'pi-car',         bgClass: 'bg-slate-500/10',   textClass: 'text-slate-400' },
        { value: 'tontine',         label: 'Tontine',         desc: 'Épargne collective',        icon: 'pi-users',       bgClass: 'bg-pink-500/10',    textClass: 'text-pink-400' },
        { value: 'mobile_money',    label: 'Mobile Money',    desc: 'Wave, Orange Money...',     icon: 'pi-mobile',      bgClass: 'bg-sky-500/10',     textClass: 'text-sky-400' },
        { value: 'collectibles',    label: 'Collections',     desc: 'Art, bijoux, montres...',   icon: 'pi-star',        bgClass: 'bg-yellow-500/10',  textClass: 'text-yellow-500' },
        { value: 'commodities',     label: 'Matières prem.',  desc: 'Or, café, pétrole...',      icon: 'pi-box',         bgClass: 'bg-amber-600/10',   textClass: 'text-amber-500' },
        { value: 'other',           label: 'Autres',          desc: 'Tout autre actif',          icon: 'pi-ellipsis-h',  bgClass: 'bg-surface-500/10', textClass: 'text-surface-400' },
    ];

    mobileMoneyProviders = [
        { label: 'Wave', value: 'Wave' },
        { label: 'Orange Money', value: 'Orange Money' },
        { label: 'Free Money', value: 'Free Money' },
        { label: 'Expresso', value: 'Expresso' },
        { label: 'Autre', value: 'Autre' }
    ];

    tontineStatusOptions = [
        { label: 'En cours', value: 'en_cours' },
        { label: "J'ai reçu ma mise", value: 'mise_recue' },
        { label: 'Terminée', value: 'termine' }
    ];

    selectedCard = computed(() => this.categoryCards.find(c => c.value === this.selectedCategory()) ?? null);

    filteredCategories = computed(() => {
        const q = this.searchQuery.toLowerCase().trim();
        if (!q) return this.categoryCards;
        return this.categoryCards.filter(c =>
            c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)
        );
    });

    private get user() { return this.tokenService.user(); }

    private get userName(): string {
        const u = this.user;
        if (!u) return 'User';
        const f = u.first_name || '', l = u.last_name || '';
        return (f || l) ? `${f} ${l}`.trim() : u.email?.split('@')[0] || 'User';
    }

    private get userInitials(): string {
        const u = this.user;
        if (!u) return 'U';
        const f = u.first_name || '', l = u.last_name || '';
        return (f || l) ? `${f.charAt(0)}${l.charAt(0)}`.toUpperCase() : u.email?.charAt(0).toUpperCase() || 'U';
    }

    ngOnInit() {
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        this.lang = match ? match[1] : 'fr';
        this.resetForm();
    }

    goBack(): void {
        if (this.currentStep() > 0) {
            this.previousStep();
        } else {
            this.router.navigate(['/', this.lang, 'pages', 'patrimoine']);
        }
    }

    resetForm(): void {
        this.assetForm = {
            name: '', category: '', quantity: 1, purchasePrice: 0, currentPrice: 0,
            purchaseDate: '', institution: '',
            owners: [{ name: this.userName, initials: this.userInitials, percentage: 100 }],
            tontineMonthlyContribution: 0, tontineParticipants: 2, tontineStartDate: '',
            tontineCollectionDate: '', tontineStatus: 'en_cours', mobileMoneyProvider: '',
            surfaceM2: 0, region: ''
        };
        this.selectedCategory.set('');
        this.currentStep.set(0);
    }

    selectCategory(value: AssetCategory): void {
        this.assetForm.category = value;
        this.selectedCategory.set(value);
        this.currentStep.set(1);
    }

    isQuantityBased(): boolean {
        return ['stocks', 'bonds', 'crypto', 'collectibles', 'commodities'].includes(this.assetForm.category);
    }

    isSimpleBalanceCategory(): boolean {
        return ['cash', 'savings_account'].includes(this.assetForm.category);
    }

    isInstitutionBased(): boolean {
        return ['stocks', 'bonds', 'crypto', 'life_insurance', 'savings_account', 'cash', 'real_estate'].includes(this.assetForm.category);
    }

    namePlaceholder(): string {
        const p: Partial<Record<AssetCategory, string>> = {
            tontine: 'Ex: Tontine Famille Diallo', mobile_money: 'Ex: Compte Wave',
            real_estate: 'Ex: Appartement Dakar', stocks: 'Ex: Actions SONATEL',
            crypto: 'Ex: Bitcoin', vehicle: 'Ex: Toyota Hilux 2021',
        };
        return p[this.assetForm.category as AssetCategory] ?? 'Ex: Nom de l\'actif';
    }

    institutionLabel(): string {
        const l: Partial<Record<AssetCategory, string>> = {
            stocks: 'Courtier / Plateforme', bonds: 'Émetteur / Banque', crypto: 'Plateforme / Exchange',
            savings_account: 'Banque', cash: 'Banque', life_insurance: 'Assureur', real_estate: 'Agence / Notaire',
        };
        return l[this.assetForm.category as AssetCategory] ?? 'Institution';
    }

    institutionPlaceholder(): string {
        const p: Partial<Record<AssetCategory, string>> = {
            stocks: 'Ex: SGI BRVM, Binance...', crypto: 'Ex: Binance, Coinbase...',
            savings_account: 'Ex: CBAO, BHS...', cash: 'Ex: SGBS, Ecobank...',
            life_insurance: 'Ex: AXA, SANLAM...', real_estate: 'Ex: Cabinet Tall Immobilier',
        };
        return p[this.assetForm.category as AssetCategory] ?? '';
    }

    totalValue(): number {
        if (this.assetForm.category === 'tontine') return this.tontineCurrentValue();
        return this.assetForm.currentPrice * (this.isQuantityBased() ? this.assetForm.quantity : 1);
    }

    isStep1Valid(): boolean {
        const f = this.assetForm;
        if (!f.name || !f.category) return false;
        if (f.category === 'tontine') return f.tontineMonthlyContribution > 0 && f.tontineParticipants > 1 && !!f.tontineStartDate;
        if (f.category === 'mobile_money') return f.currentPrice > 0 && !!f.mobileMoneyProvider;
        if (this.isSimpleBalanceCategory()) return f.currentPrice > 0;
        if (f.category === 'real_estate' || f.category === 'vehicle') return f.purchasePrice > 0;
        if (this.isQuantityBased()) return f.purchasePrice > 0;
        return f.currentPrice > 0;
    }

    tontineMonthsElapsed(): number {
        if (!this.assetForm.tontineStartDate) return 0;
        return Math.max(0, Math.floor((Date.now() - new Date(this.assetForm.tontineStartDate).getTime()) / (30.44 * 24 * 60 * 60 * 1000)));
    }

    tontineCurrentValue(): number {
        return this.assetForm.tontineMonthlyContribution * this.tontineMonthsElapsed();
    }

    toEur(displayValue: number): number {
        return displayValue / this.cs.config().rate;
    }

    nextStep(): void {
        if (this.currentStep() === 0 && this.assetForm.category) this.currentStep.set(1);
        else if (this.currentStep() === 1 && this.isStep1Valid()) this.currentStep.set(2);
    }

    previousStep(): void {
        if (this.currentStep() > 0) this.currentStep.update(v => v - 1);
    }

    goToStep(step: number): void {
        if (step === 1 && this.assetForm.category) this.currentStep.set(1);
        else if (step === 2 && this.isStep1Valid()) this.currentStep.set(2);
    }

    removeOwner(owner: Owner): void {
        if (this.assetForm.owners.length > 1) {
            const i = this.assetForm.owners.indexOf(owner);
            if (i > -1) {
                this.assetForm.owners.splice(i, 1);
                this.assetForm.owners.forEach(o => o.percentage = 100 / this.assetForm.owners.length);
            }
        }
    }

    addMember(): void {
        this.messageService.add({ severity: 'info', summary: 'Bientôt disponible', detail: 'La gestion des co-propriétaires sera disponible prochainement', life: 3000 });
    }

    async submitAsset(): Promise<void> {
        if (!this.isStep1Valid()) return;
        this.isSubmitting.set(true);

        try {
            const f = this.assetForm;
            const purchaseDateValue = f.purchaseDate || new Date().toISOString().split('T')[0];
            let assetData: AssetCreate;

            if (f.category === 'tontine') {
                const months = Math.max(1, this.tontineMonthsElapsed());
                assetData = {
                    name: f.name, category: 'tontine',
                    current_value: this.toEur(f.tontineMonthlyContribution * months),
                    purchase_value: this.toEur(f.tontineMonthlyContribution),
                    purchase_date: f.tontineStartDate || new Date().toISOString().split('T')[0],
                    notes: JSON.stringify({ mise_mensuelle: f.tontineMonthlyContribution, participants: f.tontineParticipants, date_collecte: f.tontineCollectionDate, statut: f.tontineStatus, devise: this.cs.config().code })
                };
            } else if (f.category === 'mobile_money') {
                assetData = {
                    name: f.name, category: 'mobile_money',
                    current_value: this.toEur(f.currentPrice), purchase_value: this.toEur(f.currentPrice),
                    purchase_date: new Date().toISOString().split('T')[0],
                    institution: f.mobileMoneyProvider, is_liquid: true
                };
            } else if (f.category === 'cash' || f.category === 'savings_account') {
                assetData = {
                    name: f.name, category: f.category as AssetCategory,
                    current_value: this.toEur(f.currentPrice), purchase_value: this.toEur(f.currentPrice),
                    purchase_date: new Date().toISOString().split('T')[0],
                    institution: f.institution || undefined, is_liquid: true
                };
            } else {
                if ((!f.currentPrice || f.currentPrice === 0) && f.purchasePrice > 0) f.currentPrice = f.purchasePrice;
                const qty = this.isQuantityBased() ? Math.max(1, f.quantity ?? 1) : 1;
                const purchaseEur = f.purchasePrice > 0 ? this.toEur(f.purchasePrice * qty) : undefined;
                const isQtyBased = this.isQuantityBased();
                assetData = {
                    name: f.name, category: f.category as AssetCategory,
                    current_value: this.toEur(f.currentPrice * qty), purchase_value: purchaseEur,
                    purchase_date: purchaseDateValue, institution: f.institution || undefined,
                    location: f.region || undefined,
                    notes: isQtyBased ? JSON.stringify({ quantity: qty }) : undefined,
                    quantity: isQtyBased ? qty : undefined,
                    surface_m2: f.category === 'real_estate' && f.surfaceM2 > 0 ? f.surfaceM2 : undefined,
                    price_per_m2_purchase: f.category === 'real_estate' && f.surfaceM2 > 0 && f.purchasePrice > 0
                        ? Math.round(this.toEur(f.purchasePrice) / f.surfaceM2) : undefined
                };
            }

            await this.patrimoineService.createAsset(assetData);
            this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Actif ajouté avec succès', life: 3000 });
            this.router.navigate(['/', this.lang, 'pages', 'patrimoine']);
        } catch (error: any) {
            console.error('Error creating asset:', error);
            const detail = error?.error?.detail
                ? (typeof error.error.detail === 'string' ? error.error.detail : JSON.stringify(error.error.detail).slice(0, 120))
                : "Impossible de créer l'actif";
            this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 6000 });
        } finally {
            this.isSubmitting.set(false);
        }
    }
}
