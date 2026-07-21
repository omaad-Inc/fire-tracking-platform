import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AssetCreate, AssetCategory } from '../../../core/services/api.service';
import { CanComponentDeactivate } from '../../../core/guards/unsaved-changes.guard';
import { PatrimoineService } from '../../service/patrimoine.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { CurrencyService } from '../../../core/services/currency.service';
import { TokenService } from '../../../core/services/token.service';
import { I18nService } from '../../../i18n/i18n.service';

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
    tontineFrequency: 'monthly' | 'weekly';
    mobileMoneyProvider: string;
    surfaceM2: number;
    region: string;
    currency: string;  // native currency the entered amounts are in
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
        SelectModule, InputNumberModule, DatePickerModule, ToastModule, AppAmountComponent, DecimalPipe
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
                    <h1 class="font-bold text-surface-900 dark:text-surface-0 m-0"
                        [ngClass]="currentStep() === 0 ? 'text-2xl' : 'text-xl'">
                        @if (currentStep() === 0) { {{ t('addAssets.wizard.headerComplete') }} }
                        @if (currentStep() === 1) {
                            <span class="flex items-center gap-2">
                                @if (selectedCard()) {
                                    <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg {{ selectedCard()!.bgClass }}">
                                        <i class="pi {{ selectedCard()!.icon }} {{ selectedCard()!.textClass }} text-sm"></i>
                                    </span>
                                }
                                {{ selectedCard()?.label ?? (t('addAssets.wizard.details')) }}
                            </span>
                        }
                        @if (currentStep() === 2) { {{ t('addAssets.wizard.ownership') }} }
                    </h1>
                </div>
                <!-- Step dots (only on form steps) -->
                @if (currentStep() >= 1) {
                    <div class="flex items-center gap-1.5 shrink-0">
                        @for (s of [1, 2]; track s) {
                            <div class="w-2 h-2 rounded-full transition-all"
                                 [ngClass]="currentStep() >= s ? 'bg-brand-700 dark:bg-brand-300 w-5' : 'bg-surface-300 dark:bg-surface-600'"></div>
                        }
                    </div>
                }
            </div>

            <!-- Content -->
            <div class="flex-1">

                <!-- ===== STEP 0: Category Picker (Finary-style premium cards) ===== -->
                @if (currentStep() === 0) {
                    <div class="max-w-4xl mx-auto">
                        <!-- Search -->
                        <div class="relative mb-8">
                            <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-surface-400"></i>
                            <input pInputText
                                   [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)"
                                   [placeholder]="t('addAssets.searchPlaceholder')"
                                   class="w-full !pl-11 !py-3.5 !bg-surface-50 dark:!bg-surface-800 !border-surface-200 dark:!border-surface-700 !rounded-xl text-sm" />
                        </div>

                        <!-- 2-column Finary-style card grid -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            @for (cat of filteredCategories(); track cat.value) {
                                <button type="button"
                                        (click)="selectCategory(cat.value)"
                                        class="relative flex items-start gap-0 p-5 rounded-2xl border border-surface-200 dark:border-surface-700
                                               hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-md
                                               transition-all text-left group overflow-hidden min-h-[7.5rem]">
                                    <!-- Background decorative icon (large, faded, top-right) -->
                                    <div class="absolute -top-2 -right-2 w-20 h-20 rounded-full opacity-[0.07] dark:opacity-[0.1]
                                                flex items-center justify-center {{ cat.bgClass }}">
                                        <i class="pi {{ cat.icon }} text-5xl {{ cat.textClass }}"></i>
                                    </div>
                                    <!-- Content -->
                                    <div class="relative flex-1 pr-10">
                                        <h3 class="font-bold text-surface-900 dark:text-surface-0 text-[15px] mb-1.5">{{ cat.label }}</h3>
                                        <p class="text-surface-400 dark:text-surface-500 text-sm leading-relaxed">{{ cat.desc }}</p>
                                    </div>
                                    <!-- Decorative illustration area (right) -->
                                    <div class="absolute top-1/2 -translate-y-1/2 right-4 w-14 h-14 rounded-xl {{ cat.bgClass }}
                                                flex items-center justify-center opacity-80 group-hover:opacity-100 transition-all">
                                        <i class="pi {{ cat.icon }} {{ cat.textClass }} text-xl"></i>
                                    </div>
                                </button>
                            }
                        </div>

                        @if (filteredCategories().length === 0) {
                            <div class="text-center py-12 text-surface-400">
                                <i class="pi pi-search text-2xl mb-3 block"></i>
                                <p class="text-sm">{{ t('addAssets.wizard.noTypeFound') }}</p>
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
                                            [ngClass]="currentStep() === 1 ? 'bg-brand-100 dark:bg-brand-700/20 text-brand-700 dark:text-ochre-400 font-semibold' : 'text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700'"
                                            (click)="goToStep(1)">
                                        <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                              [ngClass]="currentStep() === 1 ? 'bg-brand-700 text-white' : 'bg-surface-200 dark:bg-surface-600 text-surface-600 dark:text-surface-300'">1</span>
                                        <span class="text-sm">{{ t('addAssets.wizard.details') }}</span>
                                    </button>
                                    <button type="button"
                                            class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left w-full"
                                            [ngClass]="currentStep() === 2 ? 'bg-brand-100 dark:bg-brand-700/20 text-brand-700 dark:text-ochre-400 font-semibold' : 'text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700'"
                                            (click)="goToStep(2)"
                                            [disabled]="!isStep1Valid()">
                                        <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                              [ngClass]="currentStep() === 2 ? 'bg-brand-700 text-white' : 'bg-surface-200 dark:bg-surface-600 text-surface-600 dark:text-surface-300'">2</span>
                                        <span class="text-sm">{{ t('addAssets.wizard.ownership') }}</span>
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
                                            <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.fields.name') }} <span class="text-negative">*</span></label>
                                            <input pInputText [(ngModel)]="assetForm.name" [placeholder]="namePlaceholder()"
                                                   class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                        </div>

                                        <!-- Currency (always), the native currency the amounts below are entered in -->
                                        <div class="flex flex-col gap-2 md:col-span-2">
                                            <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.currency') }}</label>
                                            <p-select [(ngModel)]="assetForm.currency" [options]="currencyOptions"
                                                      optionLabel="label" optionValue="value" appendTo="body"
                                                      styleClass="w-full" />
                                        </div>

                                        <!-- TONTINE -->
                                        @if (assetForm.category === 'tontine') {
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.tontineMonthly') }} <span class="text-negative">*</span></label>
                                                <div class="relative">
                                                    <p-inputnumber [(ngModel)]="assetForm.tontineMonthlyContribution" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-16" />
                                                    <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ curSymbol() }}</span>
                                                </div>
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.tontineParticipants') }} <span class="text-negative">*</span></label>
                                                <p-inputnumber [(ngModel)]="assetForm.tontineParticipants" [min]="2" [max]="100"
                                                    inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.startDate') }} <span class="text-negative">*</span></label>
                                                <p-datepicker [(ngModel)]="tontineStartDateObj" [showIcon]="true" [showButtonBar]="true"
                                                       dateFormat="yy-mm-dd" styleClass="w-full"
                                                       inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.payoutDate') }}</label>
                                                <p-datepicker [(ngModel)]="tontineCollectionDateObj" [showIcon]="true" [showButtonBar]="true"
                                                       dateFormat="yy-mm-dd" styleClass="w-full"
                                                       inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.status') }}</label>
                                                <p-select [(ngModel)]="assetForm.tontineStatus" [options]="tontineStatusOptions" optionLabel="label" optionValue="value"
                                                    styleClass="w-full !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !shadow-none" />
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.frequency') }}</label>
                                                <p-select [(ngModel)]="assetForm.tontineFrequency" [options]="tontineFrequencyOptions()" optionLabel="label" optionValue="value"
                                                    styleClass="w-full !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !shadow-none" />
                                            </div>
                                            @if (assetForm.tontineStartDate && assetForm.tontineMonthlyContribution > 0) {
                                                <div class="md:col-span-2 p-3 rounded-xl bg-brand-50 dark:bg-brand-900/40 border border-brand-100 dark:border-brand-800 flex items-center gap-3">
                                                    <i class="pi pi-calculator text-brand-700 dark:text-brand-300"></i>
                                                    <div>
                                                        <p class="text-xs text-surface-400 mb-0.5">{{ t('addAssets.wizard.estimatedAccumulated') }}</p>
                                                        <p class="font-bold text-brand-700 dark:text-brand-300">
                                                            {{ tontineCurrentValue() | number:'1.0-0' }} {{ curSymbol() }}
                                                            <span class="text-xs font-normal text-surface-400">({{ tontineMonthsElapsed() }} {{ t('addAssets.wizard.moShort') }} × {{ assetForm.tontineMonthlyContribution | number:'1.0-0' }})</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            }
                                        }

                                        <!-- MOBILE MONEY -->
                                        @if (assetForm.category === 'mobile_money') {
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.provider') }} <span class="text-negative">*</span></label>
                                                <p-select [(ngModel)]="assetForm.mobileMoneyProvider" [options]="mobileMoneyProviders" optionLabel="label" optionValue="value"
                                                    [placeholder]="t('addAssets.wizard.selectProvider')"
                                                    styleClass="w-full !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !shadow-none" />
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.currentBalance') }} <span class="text-negative">*</span></label>
                                                <div class="relative">
                                                    <p-inputnumber [(ngModel)]="assetForm.currentPrice" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-16" />
                                                    <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ curSymbol() }}</span>
                                                </div>
                                            </div>
                                            <div class="md:col-span-2 flex items-center gap-2 text-xs text-surface-400">
                                                <i class="pi pi-info-circle text-brand-700 dark:text-brand-300"></i>
                                                {{ t('addAssets.wizard.mobileMoneyNote') }}
                                            </div>
                                        }

                                        <!-- QUANTITY-BASED -->
                                        @if (isQuantityBased()) {
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.fields.quantity') }}</label>
                                                <p-inputnumber [ngModel]="assetForm.quantity" (ngModelChange)="assetForm.quantity = ($event == null || $event < 1) ? 1 : $event"
                                                    mode="decimal" [minFractionDigits]="0" [maxFractionDigits]="0" [min]="1" [allowEmpty]="false"
                                                    inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.unitPurchasePrice') }} <span class="text-negative">*</span></label>
                                                <div class="relative">
                                                    <p-inputnumber [(ngModel)]="assetForm.purchasePrice" mode="decimal" [minFractionDigits]="0" [maxFractionDigits]="2"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-16" />
                                                    <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ curSymbol() }}</span>
                                                </div>
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.currentUnitValue') }} <span class="text-surface-400 text-xs">{{ t('addAssets.wizard.optional') }}</span></label>
                                                <div class="relative">
                                                    <p-inputnumber [(ngModel)]="assetForm.currentPrice" mode="decimal" [minFractionDigits]="0" [maxFractionDigits]="2"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-16" />
                                                    <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ curSymbol() }}</span>
                                                </div>
                                            </div>
                                        }

                                        <!-- SIMPLE BALANCE (cash, savings_account) -->
                                        @if (assetForm.category === 'cash' || assetForm.category === 'savings_account') {
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">
                                                    {{ assetForm.category === 'cash' ? (t('addAssets.wizard.currentBalance')) : (t('addAssets.wizard.savingsAmount')) }} <span class="text-negative">*</span>
                                                </label>
                                                <div class="relative">
                                                    <p-inputnumber [(ngModel)]="assetForm.currentPrice" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-16" />
                                                    <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ curSymbol() }}</span>
                                                </div>
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.bank') }}</label>
                                                <input pInputText [(ngModel)]="assetForm.institution"
                                                       [placeholder]="assetForm.category === 'cash' ? 'Ex: SGBS, Ecobank...' : 'Ex: CBAO, BHS...'"
                                                       class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                            </div>
                                        }

                                        <!-- TOTAL-VALUE-BASED -->
                                        @if (!isQuantityBased() && !isSimpleBalanceCategory() && assetForm.category !== 'tontine' && assetForm.category !== 'mobile_money') {
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">
                                                    {{ t('addAssets.wizard.purchaseInitialValue') }}
                                                    @if (assetForm.category === 'real_estate' || assetForm.category === 'vehicle') {
                                                        <span class="text-negative">*</span>
                                                    }
                                                </label>
                                                <div class="relative">
                                                    <p-inputnumber [(ngModel)]="assetForm.purchasePrice" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-16" />
                                                    <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ curSymbol() }}</span>
                                                </div>
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">
                                                    {{ t('addAssets.fields.currentValue') }}
                                                    @if (assetForm.category === 'real_estate' || assetForm.category === 'vehicle') {
                                                        <span class="text-surface-400 text-xs">{{ t('addAssets.wizard.optional') }}</span>
                                                    } @else {
                                                        <span class="text-negative">*</span>
                                                    }
                                                </label>
                                                <div class="relative">
                                                    <p-inputnumber [(ngModel)]="assetForm.currentPrice" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-16" />
                                                    <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ curSymbol() }}</span>
                                                </div>
                                            </div>
                                        }

                                        <!-- Purchase date -->
                                        @if (assetForm.category !== 'mobile_money' && assetForm.category !== 'tontine' && !isSimpleBalanceCategory()) {
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.fields.purchaseDate') }}</label>
                                                <p-datepicker [(ngModel)]="purchaseDateObj" [showIcon]="true" [showButtonBar]="true"
                                                       dateFormat="yy-mm-dd" styleClass="w-full"
                                                       inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                            </div>
                                        }

                                        <!-- Institution -->
                                        @if (isInstitutionBased() && !isSimpleBalanceCategory()) {
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ institutionLabel() }}</label>
                                                <input pInputText [(ngModel)]="assetForm.institution" [placeholder]="institutionPlaceholder()"
                                                       class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                            </div>
                                        }

                                        <!-- Real estate specific -->
                                        @if (assetForm.category === 'real_estate') {
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.area') }}</label>
                                                <p-inputnumber [(ngModel)]="assetForm.surfaceM2" [min]="0" [minFractionDigits]="0" [maxFractionDigits]="1" suffix=" m²" placeholder="Ex : 150"
                                                    inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                            </div>
                                            @if (assetForm.surfaceM2 > 0 && assetForm.purchasePrice > 0) {
                                                <div class="flex items-center justify-between px-1 py-2 rounded-lg bg-brand-50/60 dark:bg-brand-900/30 border border-brand-100 dark:border-brand-800">
                                                    <span class="text-surface-500 dark:text-surface-400 text-xs">{{ t('addAssets.wizard.pricePerM2') }}</span>
                                                    <span class="text-brand-700 dark:text-brand-300 font-semibold text-sm">
                                                        {{ (assetForm.purchasePrice / assetForm.surfaceM2) | number:'1.0-0' }} {{ curSymbol() }}/m²
                                                    </span>
                                                </div>
                                            }
                                            <div class="flex flex-col gap-2">
                                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.region') }}</label>
                                                <input pInputText [(ngModel)]="assetForm.region" placeholder="Ex : Dakar, Abidjan, Paris..."
                                                       class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
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
                                                <span class="text-surface-500 dark:text-surface-400 text-sm">{{ assetForm.name || (t('addAssets.wizard.assetFallback')) }}</span>
                                                <span class="text-2xl font-bold text-surface-900 dark:text-surface-0 mt-1">
                                                    <app-amount [value]="toEur(totalValue())" />
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 class="text-surface-500 dark:text-surface-400 text-sm mb-4">{{ t('addAssets.wizard.owners') }}</h3>
                                            <div class="space-y-3">
                                                @for (owner of assetForm.owners; track owner.name) {
                                                    <div class="flex items-center justify-between p-4 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                                                        <div class="flex items-center gap-3">
                                                            <div class="w-10 h-10 rounded-full bg-brand-700 dark:bg-brand-300 flex items-center justify-center">
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
                                            <h3 class="text-surface-500 dark:text-surface-400 text-sm mb-4">{{ t('addAssets.wizard.coOwners') }}</h3>
                                            <button type="button" (click)="addMember()"
                                                    class="flex items-center gap-3 p-4 rounded-xl border border-dashed border-surface-300 dark:border-surface-600 hover:border-brand-700 hover:bg-brand-700/5 transition-all w-full">
                                                <div class="w-10 h-10 rounded-full border-2 border-surface-300 dark:border-surface-600 flex items-center justify-center">
                                                    <i class="pi pi-plus text-surface-400"></i>
                                                </div>
                                                <span class="text-surface-600 dark:text-surface-300">{{ t('addAssets.wizard.addCoOwner') }}</span>
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
                        <button pButton type="button" [label]="t('addAssets.wizard.next')" class="omaad-cta !rounded-full px-8"
                                [disabled]="!isStep1Valid()" (click)="nextStep()"></button>
                    } @else {
                        <button pButton type="button" [label]="t('common.back')" [outlined]="true"
                                class="!rounded-full !border-surface-300 dark:!border-surface-600"
                                (click)="previousStep()"></button>
                        <button pButton type="button" [label]="t('common.save')"
                                class="omaad-cta !rounded-full"
                                [loading]="isSubmitting()" (click)="submitAsset()"></button>
                    }
                </div>
            }
        </div>
    `
})
export class AddAssetPage implements OnInit, CanComponentDeactivate {
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private location = inject(Location);
    private patrimoineService = inject(PatrimoineService);
    private messageService = inject(MessageService);
    private tokenService = inject(TokenService);
    private i18n = inject(I18nService);
    cs = inject(CurrencyService);

    t(key: string): string { return this.i18n.t(key); }

    lang = 'fr';
    currentStep = signal(0);
    isSubmitting = signal(false);
    /** Set true right before the post-save navigation so the guard stays silent. */
    private justSaved = false;
    selectedCategory = signal<AssetCategory | ''>('');
    searchQuery = signal('');

    assetForm: AssetFormData = {
        name: '', category: '', quantity: 1, purchasePrice: 0, currentPrice: 0,
        purchaseDate: '', institution: '', owners: [],
        tontineMonthlyContribution: 0, tontineParticipants: 2, tontineStartDate: '',
        tontineCollectionDate: '', tontineStatus: 'en_cours', tontineFrequency: 'monthly', mobileMoneyProvider: '',
        surfaceM2: 0, region: '', currency: this.cs.config().code
    };

    // p-datepicker binds a Date, but assetForm stores dates as 'YYYY-MM-DD'
    // strings (that's what the API + the truthy checks expect). These accessors
    // bridge the two so the whole app can standardize on <p-datepicker> (P2-FE-9)
    // without changing the form's string source of truth.
    private toDateStr(d: Date | null): string { return d ? d.toISOString().split('T')[0] : ''; }
    private toDateObj(s: string): Date | null { return s ? new Date(s) : null; }
    get purchaseDateObj(): Date | null { return this.toDateObj(this.assetForm.purchaseDate); }
    set purchaseDateObj(d: Date | null) { this.assetForm.purchaseDate = this.toDateStr(d); }
    get tontineStartDateObj(): Date | null { return this.toDateObj(this.assetForm.tontineStartDate); }
    set tontineStartDateObj(d: Date | null) { this.assetForm.tontineStartDate = this.toDateStr(d); }
    get tontineCollectionDateObj(): Date | null { return this.toDateObj(this.assetForm.tontineCollectionDate); }
    set tontineCollectionDateObj(d: Date | null) { this.assetForm.tontineCollectionDate = this.toDateStr(d); }

    /** Currencies the user can hold an asset in. */
    readonly currencyOptions = [
        { label: 'FCFA (XOF)', value: 'XOF' },
        { label: 'Euro (€)', value: 'EUR' },
        { label: 'Dollar ($)', value: 'USD' },
    ];

    /** Symbol for the currently selected asset currency (drives input suffixes). */
    curSymbol(): string {
        const c = this.assetForm.currency;
        return c === 'XOF' ? 'FCFA' : c === 'USD' ? '$' : '€';
    }

    // Uniform chrome, icon glyph differentiates the asset type, not the color.
    private static readonly CARD_BG = 'bg-warm-100 dark:bg-warm-800';
    private static readonly CARD_FG = 'text-warm-700 dark:text-warm-300';

    categoryCards = computed<CategoryCard[]>(() => {
        const t = (k: string) => this.i18n.t(k);
        const bg = AddAssetPage.CARD_BG;
        const fg = AddAssetPage.CARD_FG;
        const values: { value: AssetCategory; icon: string }[] = [
            { value: 'real_estate',     icon: 'pi-home' },
            { value: 'stocks_brvm',     icon: 'pi-chart-line' },
            { value: 'stocks_intl',     icon: 'pi-globe' },
            { value: 'bonds',           icon: 'pi-percentage' },
            { value: 'crypto',          icon: 'pi-bolt' },
            { value: 'cash',            icon: 'pi-wallet' },
            { value: 'life_insurance',  icon: 'pi-shield' },
            { value: 'savings_account', icon: 'pi-book' },
            { value: 'vehicle',         icon: 'pi-car' },
            { value: 'tontine',         icon: 'pi-users' },
            { value: 'mobile_money',    icon: 'pi-mobile' },
            { value: 'collectibles',    icon: 'pi-star' },
            { value: 'commodities',     icon: 'pi-box' },
            { value: 'other',           icon: 'pi-ellipsis-h' },
        ];
        return values.map(v => ({
            value: v.value,
            label: t(`addAssets.wizard.cards.${v.value}.label`),
            desc:  t(`addAssets.wizard.cards.${v.value}.desc`),
            icon: v.icon, bgClass: bg, textClass: fg,
        }));
    });

    get mobileMoneyProviders() {
        return [
            { label: 'Wave', value: 'Wave' },
            { label: 'Orange Money', value: 'Orange Money' },
            { label: 'Free Money', value: 'Free Money' },
            { label: 'Expresso', value: 'Expresso' },
            { label: this.i18n.t('addAssets.wizard.other'), value: 'Autre' },
        ];
    }

    get tontineStatusOptions() {
        const t = (k: string) => this.i18n.t(k);
        return [
            { label: t('addAssets.wizard.tontineStatus.en_cours'), value: 'en_cours' },
            { label: t('addAssets.wizard.tontineStatus.mise_recue'), value: 'mise_recue' },
            { label: t('addAssets.wizard.tontineStatus.termine'), value: 'termine' },
        ];
    }

    tontineFrequencyOptions = computed(() => [
        { label: this.i18n.t('addAssets.wizard.freq.monthly'), value: 'monthly' },
        { label: this.i18n.t('addAssets.wizard.freq.weekly'), value: 'weekly' },
    ]);

    selectedCard = computed(() => this.categoryCards().find(c => c.value === this.selectedCategory()) ?? null);

    filteredCategories = computed(() => {
        const q = this.searchQuery().toLowerCase().trim();
        const cards = this.categoryCards();
        if (!q) return cards;
        return cards.filter(c =>
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

        const cat = this.route.snapshot.queryParamMap.get('category');
        if (cat && this.categoryCards().some(c => c.value === cat)) {
            this.selectCategory(cat as AssetCategory);
        }
    }

    goBack(): void {
        if (this.currentStep() > 0) {
            this.previousStep();
        } else {
            this.router.navigate(['/', this.lang, 'pages', 'patrimoine']);
        }
    }

    /** True once a name/category/amount has been entered but not yet saved. */
    private hasUnsavedInput(): boolean {
        const f = this.assetForm;
        return !this.justSaved && (
            !!f.name?.trim() || !!this.selectedCategory() ||
            f.purchasePrice > 0 || f.currentPrice > 0
        );
    }

    /** Route guard hook (P2-FE-9): confirm before abandoning a half-filled wizard. */
    canDeactivate(): boolean {
        if (!this.hasUnsavedInput()) return true;
        return confirm(this.i18n.t('addAssets.wizard.unsavedConfirm'));
    }

    resetForm(): void {
        this.assetForm = {
            name: '', category: '', quantity: 1, purchasePrice: 0, currentPrice: 0,
            purchaseDate: '', institution: '',
            owners: [{ name: this.userName, initials: this.userInitials, percentage: 100 }],
            tontineMonthlyContribution: 0, tontineParticipants: 2, tontineStartDate: '',
            tontineCollectionDate: '', tontineStatus: 'en_cours', tontineFrequency: 'monthly', mobileMoneyProvider: '',
            surfaceM2: 0, region: '', currency: this.cs.config().code
        };
        this.selectedCategory.set('');
        this.currentStep.set(0);
    }

    selectCategory(value: AssetCategory): void {
        this.assetForm.category = value;
        this.selectedCategory.set(value);
        const isStocks = value === 'stocks_brvm' || value === 'stocks_intl';
        if (isStocks && !this.route.snapshot.queryParamMap.has('category')) {
            const market = value === 'stocks_brvm' ? 'brvm' : 'intl';
            this.router.navigate(['/', this.lang, 'pages', 'patrimoine', 'connect-broker'], {
                queryParams: { market }
            });
        } else {
            this.currentStep.set(1);
        }
    }

    isQuantityBased(): boolean {
        return ['stocks_brvm', 'stocks_intl', 'bonds', 'crypto', 'collectibles', 'commodities'].includes(this.assetForm.category);
    }

    isSimpleBalanceCategory(): boolean {
        return ['cash', 'savings_account'].includes(this.assetForm.category);
    }

    isInstitutionBased(): boolean {
        return ['stocks_brvm', 'stocks_intl', 'bonds', 'crypto', 'life_insurance', 'savings_account', 'cash', 'real_estate'].includes(this.assetForm.category);
    }

    private static readonly NAME_PH_CATS = ['tontine', 'mobile_money', 'real_estate', 'stocks_brvm', 'stocks_intl', 'crypto', 'vehicle'];
    namePlaceholder(): string {
        const cat = this.assetForm.category;
        const key = AddAssetPage.NAME_PH_CATS.includes(cat) ? `addAssets.wizard.namePh.${cat}` : 'addAssets.wizard.namePh.default';
        return this.i18n.t(key);
    }

    private static readonly INST_LABEL_CATS = ['stocks_brvm', 'stocks_intl', 'bonds', 'crypto', 'savings_account', 'cash', 'life_insurance', 'real_estate'];
    institutionLabel(): string {
        const cat = this.assetForm.category;
        const key = AddAssetPage.INST_LABEL_CATS.includes(cat) ? `addAssets.wizard.instLabel.${cat}` : 'addAssets.wizard.instLabel.default';
        return this.i18n.t(key);
    }

    private static readonly INST_PH_CATS = ['stocks_brvm', 'stocks_intl', 'crypto', 'savings_account', 'cash', 'life_insurance', 'real_estate'];
    institutionPlaceholder(): string {
        const cat = this.assetForm.category;
        return AddAssetPage.INST_PH_CATS.includes(cat) ? this.i18n.t(`addAssets.wizard.instPh.${cat}`) : '';
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

    /** Convert an amount entered in the selected asset currency to EUR (preview only). */
    toEur(displayValue: number): number {
        return displayValue / this.cs.rateOf(this.assetForm.currency);
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
        this.messageService.add({ severity: 'info', summary: this.i18n.t('common.info'), detail: this.i18n.t('addAssets.wizard.coOwnerSoon'), life: 3000 });
    }

    async submitAsset(): Promise<void> {
        if (!this.isStep1Valid()) return;
        this.isSubmitting.set(true);

        try {
            const f = this.assetForm;
            const purchaseDateValue = f.purchaseDate || new Date().toISOString().split('T')[0];
            let assetData: AssetCreate;

            // Amounts are stored in the asset's native currency; the backend
            // converts to EUR at aggregation time via the fx_rates table.
            const cur = f.currency;

            if (f.category === 'tontine') {
                const months = Math.max(1, this.tontineMonthsElapsed());
                assetData = {
                    name: f.name, category: 'tontine', currency: cur,
                    current_value: f.tontineMonthlyContribution * months,
                    // New dedicated tontine columns, no more overloading purchase_*.
                    tontine_monthly_contribution: f.tontineMonthlyContribution,
                    tontine_participants: f.tontineParticipants,
                    tontine_frequency: f.tontineFrequency,
                    tontine_start_date: f.tontineStartDate || new Date().toISOString().split('T')[0],
                    tontine_collection_date: f.tontineCollectionDate || null,
                    tontine_status: f.tontineStatus,
                };
            } else if (f.category === 'mobile_money') {
                assetData = {
                    name: f.name, category: 'mobile_money', currency: cur,
                    current_value: f.currentPrice,
                    mobile_money_operator: f.mobileMoneyProvider,
                    is_liquid: true,
                };
            } else if (f.category === 'cash' || f.category === 'savings_account') {
                // Simple-balance shape: no purchase event, current_value is THE value.
                assetData = {
                    name: f.name, category: f.category as AssetCategory, currency: cur,
                    current_value: f.currentPrice,
                    institution: f.institution || undefined, is_liquid: true
                };
            } else {
                if ((!f.currentPrice || f.currentPrice === 0) && f.purchasePrice > 0) f.currentPrice = f.purchasePrice;
                const qty = this.isQuantityBased() ? Math.max(1, f.quantity ?? 1) : 1;
                const purchaseNative = f.purchasePrice > 0 ? f.purchasePrice * qty : undefined;
                const isQtyBased = this.isQuantityBased();
                assetData = {
                    name: f.name, category: f.category as AssetCategory, currency: cur,
                    current_value: f.currentPrice * qty, purchase_value: purchaseNative,
                    purchase_date: purchaseDateValue, institution: f.institution || undefined,
                    location: f.region || undefined,
                    notes: isQtyBased ? JSON.stringify({ quantity: qty }) : undefined,
                    quantity: isQtyBased ? qty : undefined,
                    surface_m2: f.category === 'real_estate' && f.surfaceM2 > 0 ? f.surfaceM2 : undefined,
                    price_per_m2_purchase: f.category === 'real_estate' && f.surfaceM2 > 0 && f.purchasePrice > 0
                        ? Math.round(f.purchasePrice / f.surfaceM2) : undefined
                };
            }

            await this.patrimoineService.createAsset(assetData);
            this.justSaved = true; // don't prompt "unsaved changes" on the success navigation
            this.messageService.add({ severity: 'success', summary: this.i18n.t('common.success'), detail: this.i18n.t('addAssets.wizard.addSuccess'), life: 3000 });
            this.router.navigate(['/', this.lang, 'pages', 'patrimoine']);
        } catch (error: any) {
            console.error('Error creating asset:', error);
            const detail = error?.error?.detail
                ? (typeof error.error.detail === 'string' ? error.error.detail : JSON.stringify(error.error.detail).slice(0, 120))
                : this.i18n.t('addAssets.wizard.addError');
            this.messageService.add({ severity: 'error', summary: this.i18n.t('common.error'), detail, life: 6000 });
        } finally {
            this.isSubmitting.set(false);
        }
    }
}
