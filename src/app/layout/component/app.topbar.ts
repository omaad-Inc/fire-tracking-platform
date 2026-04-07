import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { MenuItem, MessageService } from 'primeng/api';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { LayoutService } from '../service/layout.service';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { I18nService } from '../../i18n/i18n.service';
import { filter } from 'rxjs/operators';
import { TokenService } from '../../core/services/token.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { AssetCreate, AssetCategory } from '../../core/services/api.service';
import { PatrimoineService } from '../../pages/service/patrimoine.service';
import { AppAmountComponent } from '../../core/components/app-amount.component';
import { CurrencyService } from '../../core/services/currency.service';
import { DecimalPipe } from '@angular/common';

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
    // Tontine specific
    tontineMonthlyContribution: number;
    tontineParticipants: number;
    tontineStartDate: string;
    tontineCollectionDate: string;
    tontineStatus: 'en_cours' | 'mise_recue' | 'termine';
    // Mobile Money specific
    mobileMoneyProvider: string;
    // Real estate specific
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
    selector: 'app-topbar',
    standalone: true,
    imports: [
        RouterModule, CommonModule, StyleClassModule, AvatarModule,
        DividerModule, DialogModule, ButtonModule, FormsModule, InputTextModule,
        SelectModule, InputNumberModule, ToastModule, AppAmountComponent, DecimalPipe
    ],
    providers: [MessageService],
    template: ` <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <!-- Hamburger menu - hidden on mobile -->
            <button class="layout-menu-button layout-topbar-action hidden lg:flex" (click)="layoutService.onMenuToggle()">
                <i class="pi pi-bars"></i>
            </button>
            <div class="layout-topbar-logo flex items-center gap-2">
                <img src="assets/afrin-nexus-logo.svg" alt="Afrin Nexus Logo" class="w-10 h-10 lg:w-12 lg:h-12">
                <!-- Hide text on mobile -->
                <span class="hidden lg:inline whitespace-nowrap">Afrin Nexus</span>
            </div>
        </div>

        <div class="layout-topbar-actions">
            <div class="layout-config-menu">
                <button type="button" class="layout-topbar-action" (click)="toggleDarkMode()">
                    <i [ngClass]="{ 'pi ': true, 'pi-moon': layoutService.isDarkTheme(), 'pi-sun': !layoutService.isDarkTheme() }"></i>
                </button>
            </div>

            <!-- Add Assets Button - Desktop Only -->
            <button
                type="button"
                class="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-medium transition-all hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/30"
                (click)="openAddAssetDialog()"
            >
                <i class="pi pi-plus"></i>
                <span>{{ t('topbar.addAssets') }}</span>
            </button>

            <!-- Mobile ONLY: Simple user icon - redirects directly to settings -->
            <a
                [routerLink]="['/'+lang, 'pages', 'settings']"
                class="layout-topbar-action mobile-user-icon items-center justify-center"
            >
                <div class="w-9 h-9 rounded-full bg-surface-800 dark:bg-surface-700 flex items-center justify-center overflow-hidden">
                    @if (avatarUrl) {
                        <img [src]="avatarUrl" alt="Profile" class="w-full h-full object-cover">
                    } @else {
                        <i class="pi pi-user text-surface-200"></i>
                    }
                </div>
            </a>

            <!-- Desktop ONLY: menu with dropdown -->
            <div class="layout-topbar-menu desktop-menu">
                <div class="layout-topbar-menu-content">
                    <!-- Notifications -->
                    <button type="button" class="layout-topbar-action">
                        <i class="pi pi-bell"></i>
                        <span>{{ t('topbar.notifications') }}</span>
                    </button>
                    <!-- User Profile Menu with dropdown -->
                    <div class="relative">
                        <button
                            type="button"
                            class="layout-topbar-action"
                            pStyleClass="@next"
                            enterFromClass="hidden"
                            enterActiveClass="animate-scalein"
                            leaveToClass="hidden"
                            leaveActiveClass="animate-fadeout"
                            [hideOnOutsideClick]="true"
                        >
                            @if (avatarUrl) {
                                <img [src]="avatarUrl"
                                     alt="Profile"
                                     class="w-8 h-8 rounded-full object-cover">
                            } @else {
                                <p-avatar
                                    [label]="userInitials"
                                    shape="circle"
                                    [style]="{ 'background': 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)', 'color': 'white', 'font-weight': '600', 'font-size': '0.75rem' }"
                                    size="normal"
                                />
                            }
                        </button>
                        <!-- User Dropdown Menu -->
                        <div class="hidden absolute top-[3.25rem] right-0 w-72 bg-surface-0 dark:bg-surface-900 border border-surface rounded-xl origin-top shadow-xl overflow-hidden z-50">
                            <!-- User Header -->
                            <div class="p-4 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 border-b border-surface">
                                <div class="flex items-center gap-3">
                                    @if (avatarUrl) {
                                        <img [src]="avatarUrl"
                                             alt="Profile"
                                             class="w-12 h-12 rounded-full object-cover">
                                    } @else {
                                        <p-avatar
                                            [label]="userInitials"
                                            shape="circle"
                                            size="large"
                                            [style]="{ 'background': 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)', 'color': 'white', 'font-weight': '600' }"
                                        />
                                    }
                                    <div class="flex-1 min-w-0">
                                        <div class="font-semibold text-surface-900 dark:text-surface-0 truncate">{{ userName }}</div>
                                        <div class="text-sm text-surface-500 dark:text-surface-400 truncate">{{ user()?.email }}</div>
                                    </div>
                                    <i class="pi pi-chevron-right text-surface-400"></i>
                                </div>
                            </div>

                            <!-- Menu Items -->
                            <div class="py-2">
                                <a [routerLink]="['/'+lang, 'pages', 'settings', 'account']" class="flex items-center gap-3 px-4 py-3 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer">
                                    <i class="pi pi-user text-indigo-500"></i>
                                    <span class="text-surface-700 dark:text-surface-200">{{ t('menu.myAccount') }}</span>
                                </a>
                                <a [routerLink]="['/'+lang, 'pages', 'settings', 'security']" class="flex items-center gap-3 px-4 py-3 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer">
                                    <i class="pi pi-shield text-cyan-500"></i>
                                    <span class="text-surface-700 dark:text-surface-200">{{ t('menu.security') }}</span>
                                </a>
                                <a [routerLink]="['/'+lang, 'pages', 'settings', 'preferences']" class="flex items-center gap-3 px-4 py-3 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer">
                                    <i class="pi pi-cog text-emerald-500"></i>
                                    <span class="text-surface-700 dark:text-surface-200">{{ t('menu.preferences') }}</span>
                                </a>
                                <a [routerLink]="['/'+lang, 'pages', 'settings', 'fire']" class="flex items-center gap-3 px-4 py-3 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer">
                                    <i class="pi pi-flag text-emerald-600"></i>
                                    <span class="text-surface-700 dark:text-surface-200">Objectif FIRE</span>
                                </a>
                            </div>

                            <p-divider styleClass="!my-0" />

                            <!-- Help Section -->
                            <div class="py-2">
                                <a [routerLink]="['/'+lang, 'pages', 'settings', 'help']" class="flex items-center gap-3 px-4 py-3 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer">
                                    <i class="pi pi-question-circle text-amber-500"></i>
                                    <span class="text-surface-700 dark:text-surface-200">{{ t('settings.getHelp') }}</span>
                                </a>
                            </div>

                            <p-divider styleClass="!my-0" />

                            <!-- Logout -->
                            <div class="py-2">
                                <button (click)="logout()" class="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer group">
                                    <i class="pi pi-sign-out text-red-500"></i>
                                    <span class="text-red-500 group-hover:text-red-600">{{ t('topbar.logout') }}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Add Asset Dialog -->
    <p-toast position="top-center"></p-toast>
    <p-dialog
        [(visible)]="showAddAssetDialog"
        [modal]="true"
        [dismissableMask]="true"
        [draggable]="false"
        [resizable]="false"
        [style]="{ width: '90vw', maxWidth: currentStep() === 0 ? '700px' : '800px' }"
        [contentStyle]="{ 'padding': '0' }"
        styleClass="add-asset-dialog"
        [showHeader]="false"
    >
        <div class="bg-surface-0 dark:bg-surface-900">
            <!-- Header -->
            <div class="flex items-center gap-4 p-6 border-b border-surface-200 dark:border-surface-700">
                @if (currentStep() > 0) {
                    <button
                        type="button"
                        class="w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors flex-shrink-0"
                        (click)="previousStep()"
                    >
                        <i class="pi pi-chevron-left text-surface-600 dark:text-surface-300"></i>
                    </button>
                }
                <div class="flex-1 min-w-0">
                    <h2 class="text-xl font-semibold text-surface-900 dark:text-surface-0 m-0">
                        @if (currentStep() === 0) { Choisissez un type d'actif }
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
                    </h2>
                </div>
                <button
                    type="button"
                    class="w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors flex-shrink-0"
                    (click)="showAddAssetDialog = false"
                >
                    <i class="pi pi-times text-surface-600 dark:text-surface-300"></i>
                </button>
            </div>

            <!-- ===== STEP 0: Category Picker ===== -->
            @if (currentStep() === 0) {
                <div class="p-6">
                    <p class="text-surface-500 dark:text-surface-400 text-sm mb-5">Sélectionnez le type d'actif à ajouter à votre patrimoine</p>
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        @for (cat of categoryCards; track cat.value) {
                            <button
                                type="button"
                                class="flex flex-col items-center gap-2 p-3 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-500/5 transition-all text-center group"
                                (click)="selectCategory(cat.value)"
                            >
                                <div class="w-10 h-10 rounded-xl flex items-center justify-center {{ cat.bgClass }} transition-transform group-hover:scale-110">
                                    <i class="pi {{ cat.icon }} {{ cat.textClass }} text-lg"></i>
                                </div>
                                <span class="text-xs font-medium text-surface-700 dark:text-surface-200 leading-tight">{{ cat.label }}</span>
                            </button>
                        }
                    </div>
                </div>
            }

            <!-- ===== STEPS 1 & 2: Form with sidebar ===== -->
            @if (currentStep() >= 1) {
                <div class="flex flex-col lg:flex-row min-h-[460px]">
                    <!-- Left Sidebar -->
                    <div class="w-full lg:w-56 p-5 border-b lg:border-b-0 lg:border-r border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                        <div class="flex lg:flex-col gap-3">
                            <button
                                type="button"
                                class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left w-full"
                                [ngClass]="currentStep() === 1 ? 'bg-primary/10 text-primary font-semibold' : 'text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700'"
                                (click)="goToStep(1)"
                            >
                                <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                      [ngClass]="currentStep() === 1 ? 'bg-primary text-white' : 'bg-surface-200 dark:bg-surface-600 text-surface-600 dark:text-surface-300'">1</span>
                                <span class="text-sm">Informations</span>
                            </button>
                            <button
                                type="button"
                                class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left w-full"
                                [ngClass]="currentStep() === 2 ? 'bg-primary/10 text-primary font-semibold' : 'text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700'"
                                (click)="goToStep(2)"
                                [disabled]="!isStep1Valid()"
                            >
                                <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                      [ngClass]="currentStep() === 2 ? 'bg-primary text-white' : 'bg-surface-200 dark:bg-surface-600 text-surface-600 dark:text-surface-300'">2</span>
                                <span class="text-sm">Répartition</span>
                            </button>
                        </div>
                    </div>

                    <!-- Right Content -->
                    <div class="flex-1 p-6 overflow-y-auto">

                        <!-- Step 1: Per-category form -->
                        @if (currentStep() === 1) {
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

                                <!-- Name (always) -->
                                <div class="flex flex-col gap-2 md:col-span-2">
                                    <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Nom de l'actif <span class="text-red-400">*</span></label>
                                    <input
                                        pInputText
                                        [(ngModel)]="assetForm.name"
                                        [placeholder]="namePlaceholder()"
                                        class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary"
                                    />
                                </div>

                                <!-- ===== TONTINE FIELDS ===== -->
                                @if (assetForm.category === 'tontine') {
                                    <div class="flex flex-col gap-2">
                                        <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Mise mensuelle <span class="text-red-400">*</span></label>
                                        <div class="relative">
                                            <p-inputnumber
                                                [(ngModel)]="assetForm.tontineMonthlyContribution"
                                                [min]="0" mode="decimal" [minFractionDigits]="0"
                                                inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary !pr-16"
                                            />
                                            <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ currencyService.config().symbol }}</span>
                                        </div>
                                    </div>

                                    <div class="flex flex-col gap-2">
                                        <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Nombre de participants <span class="text-red-400">*</span></label>
                                        <p-inputnumber
                                            [(ngModel)]="assetForm.tontineParticipants"
                                            [min]="2" [max]="100"
                                            inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary"
                                        />
                                    </div>

                                    <div class="flex flex-col gap-2">
                                        <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Date de début <span class="text-red-400">*</span></label>
                                        <input
                                            pInputText type="date"
                                            [(ngModel)]="assetForm.tontineStartDate"
                                            class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary"
                                        />
                                    </div>

                                    <div class="flex flex-col gap-2">
                                        <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Date de collecte de ma mise</label>
                                        <input
                                            pInputText type="date"
                                            [(ngModel)]="assetForm.tontineCollectionDate"
                                            class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary"
                                        />
                                    </div>

                                    <div class="flex flex-col gap-2">
                                        <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Statut</label>
                                        <p-select
                                            [(ngModel)]="assetForm.tontineStatus"
                                            [options]="tontineStatusOptions"
                                            optionLabel="label"
                                            optionValue="value"
                                            styleClass="w-full !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !shadow-none"
                                        />
                                    </div>

                                    @if (assetForm.tontineStartDate && assetForm.tontineMonthlyContribution > 0) {
                                        <div class="md:col-span-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
                                            <i class="pi pi-calculator text-indigo-400"></i>
                                            <div>
                                                <p class="text-xs text-surface-400 mb-0.5">Valeur accumulée estimée</p>
                                                <p class="font-bold text-indigo-400">
                                                    {{ tontineCurrentValue() | number:'1.0-0' }} {{ currencyService.config().symbol }}
                                                    <span class="text-xs font-normal text-surface-400">({{ tontineMonthsElapsed() }} mois × {{ assetForm.tontineMonthlyContribution | number:'1.0-0' }})</span>
                                                </p>
                                            </div>
                                        </div>
                                    }
                                }

                                <!-- ===== MOBILE MONEY FIELDS ===== -->
                                @if (assetForm.category === 'mobile_money') {
                                    <div class="flex flex-col gap-2">
                                        <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Opérateur <span class="text-red-400">*</span></label>
                                        <p-select
                                            [(ngModel)]="assetForm.mobileMoneyProvider"
                                            [options]="mobileMoneyProviders"
                                            optionLabel="label"
                                            optionValue="value"
                                            placeholder="Sélectionner l'opérateur"
                                            styleClass="w-full !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !shadow-none"
                                        />
                                    </div>

                                    <div class="flex flex-col gap-2">
                                        <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Solde actuel <span class="text-red-400">*</span></label>
                                        <div class="relative">
                                            <p-inputnumber
                                                [(ngModel)]="assetForm.currentPrice"
                                                [min]="0" mode="decimal" [minFractionDigits]="0"
                                                inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary !pr-16"
                                            />
                                            <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ currencyService.config().symbol }}</span>
                                        </div>
                                    </div>

                                    <div class="md:col-span-2 flex items-center gap-2 text-xs text-surface-400">
                                        <i class="pi pi-info-circle text-cyan-400"></i>
                                        Intégration API Wave / Orange Money prévue — mises à jour automatiques à venir.
                                    </div>
                                }

                                <!-- ===== QUANTITY-BASED (stocks, bonds, crypto, collectibles, commodities) ===== -->
                                @if (isQuantityBased()) {
                                    <div class="flex flex-col gap-2">
                                        <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Quantité</label>
                                        <p-inputnumber
                                            [(ngModel)]="assetForm.quantity"
                                            [min]="1"
                                            inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary"
                                        />
                                    </div>

                                    <div class="flex flex-col gap-2">
                                        <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Prix d'achat unitaire</label>
                                        <div class="relative">
                                            <p-inputnumber
                                                [(ngModel)]="assetForm.purchasePrice"
                                                mode="decimal" [minFractionDigits]="0" [maxFractionDigits]="2"
                                                inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary !pr-16"
                                            />
                                            <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ currencyService.config().symbol }}</span>
                                        </div>
                                    </div>

                                    <div class="flex flex-col gap-2">
                                        <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Valeur actuelle unitaire <span class="text-red-400">*</span></label>
                                        <div class="relative">
                                            <p-inputnumber
                                                [(ngModel)]="assetForm.currentPrice"
                                                mode="decimal" [minFractionDigits]="0" [maxFractionDigits]="2"
                                                inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary !pr-16"
                                            />
                                            <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ currencyService.config().symbol }}</span>
                                        </div>
                                    </div>
                                }

                                <!-- ===== TOTAL-VALUE-BASED (real_estate, cash, retirement, life_insurance, savings_account, business, vehicle, other) ===== -->
                                @if (!isQuantityBased() && assetForm.category !== 'tontine' && assetForm.category !== 'mobile_money') {
                                    <div class="flex flex-col gap-2">
                                        <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Valeur d'achat / initiale</label>
                                        <div class="relative">
                                            <p-inputnumber
                                                [(ngModel)]="assetForm.purchasePrice"
                                                [min]="0" mode="decimal" [minFractionDigits]="0"
                                                inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary !pr-16"
                                            />
                                            <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ currencyService.config().symbol }}</span>
                                        </div>
                                    </div>

                                    <div class="flex flex-col gap-2">
                                        <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Valeur actuelle <span class="text-red-400">*</span></label>
                                        <div class="relative">
                                            <p-inputnumber
                                                [(ngModel)]="assetForm.currentPrice"
                                                [min]="0" mode="decimal" [minFractionDigits]="0"
                                                inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary !pr-16"
                                            />
                                            <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ currencyService.config().symbol }}</span>
                                        </div>
                                    </div>
                                }

                                <!-- Purchase date (all except mobile_money) -->
                                @if (assetForm.category !== 'mobile_money' && assetForm.category !== 'tontine') {
                                    <div class="flex flex-col gap-2">
                                        <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Date d'achat</label>
                                        <input
                                            pInputText type="date"
                                            [(ngModel)]="assetForm.purchaseDate"
                                            class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary"
                                        />
                                    </div>
                                }

                                <!-- Institution (for relevant categories) -->
                                @if (isInstitutionBased()) {
                                    <div class="flex flex-col gap-2">
                                        <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ institutionLabel() }}</label>
                                        <input
                                            pInputText
                                            [(ngModel)]="assetForm.institution"
                                            [placeholder]="institutionPlaceholder()"
                                            class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary"
                                        />
                                    </div>
                                }

                                <!-- Real estate specific fields -->
                                @if (assetForm.category === 'real_estate') {
                                    <div class="flex flex-col gap-2">
                                        <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Superficie (m²)</label>
                                        <p-inputnumber
                                            [(ngModel)]="assetForm.surfaceM2"
                                            [min]="0"
                                            [minFractionDigits]="0"
                                            [maxFractionDigits]="1"
                                            suffix=" m²"
                                            placeholder="Ex : 150"
                                            inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary"
                                        />
                                    </div>

                                    @if (assetForm.surfaceM2 > 0 && assetForm.purchasePrice > 0) {
                                        <div class="flex items-center justify-between px-1 py-2 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
                                            <span class="text-surface-500 dark:text-surface-400 text-xs">Prix au m² (achat)</span>
                                            <span class="text-indigo-500 font-semibold text-sm">
                                                {{ (assetForm.purchasePrice / assetForm.surfaceM2) | number:'1.0-0' }} {{ currencyService.config().symbol }}/m²
                                            </span>
                                        </div>
                                    }

                                    <div class="flex flex-col gap-2">
                                        <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Région / Localité</label>
                                        <input
                                            pInputText
                                            [(ngModel)]="assetForm.region"
                                            placeholder="Ex : Dakar, Abidjan, Paris..."
                                            class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary"
                                        />
                                    </div>
                                }
                            </div>
                        }

                        <!-- Step 2: Ownership -->
                        @if (currentStep() === 2) {
                            <div class="space-y-6">
                                <!-- Asset Summary Card -->
                                <div class="flex items-center justify-center mb-6">
                                    <div class="flex flex-col items-center">
                                        <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 {{ selectedCard()?.bgClass ?? 'bg-surface-200 dark:bg-surface-700' }}">
                                            <i class="pi {{ selectedCard()?.icon ?? 'pi-box' }} text-2xl {{ selectedCard()?.textClass ?? 'text-surface-500' }}"></i>
                                        </div>
                                        <span class="text-surface-500 dark:text-surface-400 text-sm">{{ assetForm.name || 'Actif' }}</span>
                                        <span class="text-2xl font-bold text-surface-900 dark:text-surface-0 mt-1">
                                            <app-amount [value]="totalValue()" />
                                        </span>
                                    </div>
                                </div>

                                <!-- Owners Section -->
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
                                                    <button
                                                        type="button"
                                                        class="w-8 h-8 rounded-full hover:bg-surface-200 dark:hover:bg-surface-700 flex items-center justify-center transition-colors"
                                                        (click)="removeOwner(owner)"
                                                    >
                                                        <i class="pi pi-times text-surface-400"></i>
                                                    </button>
                                                }
                                            </div>
                                        }
                                    </div>
                                </div>

                                <!-- Members Section -->
                                <div>
                                    <h3 class="text-surface-500 dark:text-surface-400 text-sm mb-4">Co-propriétaires</h3>
                                    <button
                                        type="button"
                                        class="flex items-center gap-3 p-4 rounded-xl border border-dashed border-surface-300 dark:border-surface-600 hover:border-primary hover:bg-primary/5 transition-all w-full"
                                        (click)="addMember()"
                                    >
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
            }

            <!-- Footer -->
            @if (currentStep() >= 1) {
                <div class="flex items-center justify-end gap-4 p-6 border-t border-surface-200 dark:border-surface-700">
                    @if (currentStep() === 1) {
                        <button
                            pButton
                            type="button"
                            label="Suivant"
                            class="px-8"
                            [disabled]="!isStep1Valid()"
                            (click)="nextStep()"
                        ></button>
                    } @else {
                        <button
                            pButton
                            type="button"
                            label="Retour"
                            [outlined]="true"
                            (click)="previousStep()"
                        ></button>
                        <button
                            pButton
                            type="button"
                            label="Enregistrer"
                            class="!bg-gradient-to-r !from-indigo-600 !to-cyan-500 !text-white !border-0 hover:!opacity-90"
                            [loading]="isSubmitting()"
                            (click)="submitAsset()"
                        ></button>
                    }
                </div>
            }
        </div>
    </p-dialog>`
})
export class AppTopbar implements OnInit {
    private router = inject(Router);
    private i18n = inject(I18nService);
    private tokenService = inject(TokenService);
    private authService = inject(AuthService);
    private patrimoineService = inject(PatrimoineService);
    private messageService = inject(MessageService);
    currencyService = inject(CurrencyService);

    layoutService = inject(LayoutService);

    items!: MenuItem[];
    lang = 'fr';

    // Add Asset Dialog
    showAddAssetDialog = false;
    currentStep = signal(0);
    isSubmitting = signal(false);
    selectedCategory = signal<AssetCategory | ''>('');

    // Asset Form Data
    assetForm: AssetFormData = {
        name: '',
        category: '',
        quantity: 1,
        purchasePrice: 0,
        currentPrice: 0,
        purchaseDate: '',
        institution: '',
        owners: [],
        tontineMonthlyContribution: 0,
        tontineParticipants: 2,
        tontineStartDate: '',
        tontineCollectionDate: '',
        tontineStatus: 'en_cours',
        mobileMoneyProvider: '',
        surfaceM2: 0,
        region: ''
    };

    // Category cards for step 0
    categoryCards: CategoryCard[] = [
        { value: 'real_estate',     label: 'Immobilier',      desc: 'Appartement, terrain...', icon: 'pi-home',        bgClass: 'bg-indigo-500/10',  textClass: 'text-indigo-400' },
        { value: 'stocks',          label: 'Actions / Bourse', desc: 'BRVM, ETF, fonds...',    icon: 'pi-chart-line',  bgClass: 'bg-cyan-500/10',    textClass: 'text-cyan-400' },
        { value: 'bonds',           label: 'Obligations',     desc: 'Bons du trésor...',        icon: 'pi-percentage',  bgClass: 'bg-blue-500/10',    textClass: 'text-blue-400' },
        { value: 'crypto',          label: 'Crypto',          desc: 'Bitcoin, USDT...',          icon: 'pi-bolt',        bgClass: 'bg-orange-500/10',  textClass: 'text-orange-400' },
        { value: 'cash',            label: 'Liquidités',      desc: 'Espèces, compte courant',   icon: 'pi-wallet',      bgClass: 'bg-emerald-500/10', textClass: 'text-emerald-400' },
        { value: 'retirement',      label: 'Retraite',        desc: 'PER, épargne retraite...',  icon: 'pi-clock',       bgClass: 'bg-purple-500/10',  textClass: 'text-purple-400' },
        { value: 'life_insurance',  label: 'Assurance vie',   desc: 'Contrats vie...',           icon: 'pi-shield',      bgClass: 'bg-teal-500/10',    textClass: 'text-teal-400' },
        { value: 'savings_account', label: 'Livret épargne',  desc: 'Livret A, CEL...',          icon: 'pi-book',        bgClass: 'bg-green-500/10',   textClass: 'text-green-400' },
        { value: 'business',        label: 'Entreprise',      desc: 'Parts, actions privées',    icon: 'pi-briefcase',   bgClass: 'bg-amber-500/10',   textClass: 'text-amber-400' },
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

    // Computed helpers
    selectedCard = computed(() => this.categoryCards.find(c => c.value === this.selectedCategory()) ?? null);

    user = this.tokenService.user;

    constructor() {
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe(() => {
            this.lang = this.getCurrentLang();
        });
    }

    ngOnInit() {
        this.lang = this.getCurrentLang();
    }

    get avatarUrl(): string | null {
        const user = this.user();
        if (!user?.avatar_url) return null;

        if (user.avatar_url.startsWith('/uploads/')) {
            const baseUrl = environment.apiUrl.replace('/api/v1', '');
            return `${baseUrl}${user.avatar_url}`;
        }
        return user.avatar_url;
    }

    get userInitials(): string {
        const currentUser = this.user();
        if (!currentUser) return 'U';

        const first = currentUser.first_name || '';
        const last = currentUser.last_name || '';

        if (!first && !last) {
            return currentUser.email?.charAt(0).toUpperCase() || 'U';
        }
        return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    }

    get userName(): string {
        const currentUser = this.user();
        if (!currentUser) return 'User';

        const first = currentUser.first_name || '';
        const last = currentUser.last_name || '';

        if (!first && !last) {
            return currentUser.email?.split('@')[0] || 'User';
        }
        return `${first} ${last}`.trim();
    }

    private getCurrentLang(): string {
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        return match ? match[1] : 'fr';
    }

    toggleDarkMode() {
        this.layoutService.layoutConfig.update((state) => {
            const currentMode = state.themeMode || 'system';
            const isCurrentlyDark = state.darkTheme ?? false;

            if (currentMode === 'system') {
                return {
                    ...state,
                    themeMode: isCurrentlyDark ? 'light' : 'dark',
                    darkTheme: !isCurrentlyDark
                };
            } else {
                return {
                    ...state,
                    themeMode: isCurrentlyDark ? 'light' : 'dark',
                    darkTheme: !isCurrentlyDark
                };
            }
        });
    }

    logout(): void {
        this.authService.logout();
    }

    // ==================== Add Asset Dialog Methods ====================

    openAddAssetDialog(): void {
        this.resetForm();
        this.showAddAssetDialog = true;
    }

    resetForm(): void {
        const ownerName = this.userName;
        const initials = this.userInitials;

        this.assetForm = {
            name: '',
            category: '',
            quantity: 1,
            purchasePrice: 0,
            currentPrice: 0,
            purchaseDate: '',
            institution: '',
            owners: [{ name: ownerName, initials: initials, percentage: 100 }],
            tontineMonthlyContribution: 0,
            tontineParticipants: 2,
            tontineStartDate: '',
            tontineCollectionDate: '',
            tontineStatus: 'en_cours',
            mobileMoneyProvider: '',
            surfaceM2: 0,
            region: ''
        };
        this.selectedCategory.set('');
        this.currentStep.set(0);
    }

    selectCategory(value: AssetCategory): void {
        this.assetForm.category = value;
        this.selectedCategory.set(value);
        this.currentStep.set(1);
    }

    // Category helpers
    isQuantityBased(): boolean {
        return ['stocks', 'bonds', 'crypto', 'collectibles', 'commodities'].includes(this.assetForm.category);
    }

    isInstitutionBased(): boolean {
        return ['stocks', 'bonds', 'crypto', 'retirement', 'life_insurance', 'savings_account', 'cash', 'real_estate'].includes(this.assetForm.category);
    }

    namePlaceholder(): string {
        const placeholders: Partial<Record<AssetCategory, string>> = {
            tontine: 'Ex: Tontine Famille Diallo',
            mobile_money: 'Ex: Compte Wave',
            real_estate: 'Ex: Appartement Dakar',
            stocks: 'Ex: Actions SONATEL',
            crypto: 'Ex: Bitcoin',
            vehicle: 'Ex: Toyota Hilux 2021',
        };
        return placeholders[this.assetForm.category as AssetCategory] ?? 'Ex: Nom de l\'actif';
    }

    institutionLabel(): string {
        const labels: Partial<Record<AssetCategory, string>> = {
            stocks: 'Courtier / Plateforme',
            bonds: 'Émetteur / Banque',
            crypto: 'Plateforme / Exchange',
            savings_account: 'Banque',
            cash: 'Banque',
            retirement: 'Gestionnaire',
            life_insurance: 'Assureur',
            real_estate: 'Agence / Notaire',
        };
        return labels[this.assetForm.category as AssetCategory] ?? 'Institution';
    }

    institutionPlaceholder(): string {
        const placeholders: Partial<Record<AssetCategory, string>> = {
            stocks: 'Ex: SGI BRVM, Binance...',
            crypto: 'Ex: Binance, Coinbase...',
            savings_account: 'Ex: CBAO, BHS...',
            cash: 'Ex: SGBS, Ecobank...',
            retirement: 'Ex: Fonctionnaires, IPRES...',
            life_insurance: 'Ex: AXA, SANLAM...',
            real_estate: 'Ex: Cabinet Tall Immobilier',
        };
        return placeholders[this.assetForm.category as AssetCategory] ?? '';
    }

    totalValue(): number {
        if (this.assetForm.category === 'tontine') return this.tontineCurrentValue();
        return this.assetForm.currentPrice * (this.isQuantityBased() ? this.assetForm.quantity : 1);
    }

    isStep1Valid(): boolean {
        const f = this.assetForm;
        if (!f.name || !f.category) return false;
        if (f.category === 'tontine')
            return f.tontineMonthlyContribution > 0 && f.tontineParticipants > 1 && !!f.tontineStartDate;
        if (f.category === 'mobile_money')
            return f.currentPrice > 0 && !!f.mobileMoneyProvider;
        return f.currentPrice > 0;
    }

    tontineMonthsElapsed(): number {
        if (!this.assetForm.tontineStartDate) return 0;
        const start = new Date(this.assetForm.tontineStartDate).getTime();
        return Math.max(0, Math.floor((Date.now() - start) / (30.44 * 24 * 60 * 60 * 1000)));
    }

    tontineCurrentValue(): number {
        return this.assetForm.tontineMonthlyContribution * this.tontineMonthsElapsed();
    }

    private toEur(displayValue: number): number {
        return displayValue / this.currencyService.config().rate;
    }

    nextStep(): void {
        if (this.currentStep() === 0 && this.assetForm.category) {
            this.currentStep.set(1);
        } else if (this.currentStep() === 1 && this.isStep1Valid()) {
            this.currentStep.set(2);
        }
    }

    previousStep(): void {
        if (this.currentStep() > 0) {
            this.currentStep.update(v => v - 1);
        }
    }

    goToStep(step: number): void {
        if (step === 1 && this.assetForm.category) {
            this.currentStep.set(1);
        } else if (step === 2 && this.isStep1Valid()) {
            this.currentStep.set(2);
        }
    }

    removeOwner(owner: Owner): void {
        if (this.assetForm.owners.length > 1) {
            const index = this.assetForm.owners.indexOf(owner);
            if (index > -1) {
                this.assetForm.owners.splice(index, 1);
                const remaining = 100 / this.assetForm.owners.length;
                this.assetForm.owners.forEach(o => o.percentage = remaining);
            }
        }
    }

    addMember(): void {
        this.messageService.add({
            severity: 'info',
            summary: 'Bientôt disponible',
            detail: 'La gestion des co-propriétaires sera disponible prochainement',
            life: 3000
        });
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
                    name: f.name,
                    category: 'tontine',
                    current_value: this.toEur(f.tontineMonthlyContribution * months),
                    purchase_value: this.toEur(f.tontineMonthlyContribution),
                    purchase_date: f.tontineStartDate || new Date().toISOString().split('T')[0],
                    notes: JSON.stringify({
                        mise_mensuelle: f.tontineMonthlyContribution,
                        participants: f.tontineParticipants,
                        date_collecte: f.tontineCollectionDate,
                        statut: f.tontineStatus,
                        devise: this.currencyService.config().code
                    })
                };
            } else if (f.category === 'mobile_money') {
                assetData = {
                    name: f.name,
                    category: 'mobile_money',
                    current_value: this.toEur(f.currentPrice),
                    purchase_value: this.toEur(f.currentPrice),
                    purchase_date: new Date().toISOString().split('T')[0],
                    institution: f.mobileMoneyProvider,
                    is_liquid: true
                };
            } else {
                const qty = this.isQuantityBased() ? f.quantity : 1;
                const purchaseEur = f.purchasePrice > 0 ? this.toEur(f.purchasePrice * qty) : undefined;
                const isQtyBased = this.isQuantityBased();
                // Persist quantity in notes JSON so it works on the current deployed backend
                // (which has no quantity column yet). Also send the quantity field for
                // backends that do have the column.
                const quantityNotes = isQtyBased && qty > 1
                    ? JSON.stringify({ quantity: qty })
                    : undefined;
                assetData = {
                    name: f.name,
                    category: f.category as AssetCategory,
                    current_value: this.toEur(f.currentPrice * qty),
                    purchase_value: purchaseEur,
                    purchase_date: purchaseDateValue,
                    institution: f.institution || undefined,
                    location: f.region || undefined,
                    notes: quantityNotes,
                    quantity: isQtyBased && qty > 1 ? qty : undefined,
                    surface_m2: f.category === 'real_estate' && f.surfaceM2 > 0 ? f.surfaceM2 : undefined,
                    price_per_m2_purchase: f.category === 'real_estate' && f.surfaceM2 > 0 && f.purchasePrice > 0
                        ? Math.round(this.toEur(f.purchasePrice) / f.surfaceM2)
                        : undefined
                };
            }

            await this.patrimoineService.createAsset(assetData);

            this.messageService.add({
                severity: 'success',
                summary: 'Succès',
                detail: 'Actif ajouté avec succès',
                life: 3000
            });

            this.showAddAssetDialog = false;
            this.resetForm();

            this.router.navigate(['/', this.lang, 'pages', 'patrimoine']);

        } catch (error: any) {
            console.error('Error creating asset:', error);
            const detail = error?.error?.detail
                ? (typeof error.error.detail === 'string'
                    ? error.error.detail
                    : JSON.stringify(error.error.detail).slice(0, 120))
                : "Impossible de créer l'actif";
            this.messageService.add({
                severity: 'error',
                summary: 'Erreur',
                detail,
                life: 6000
            });
        } finally {
            this.isSubmitting.set(false);
        }
    }

    t(key: string): string {
        return this.i18n.t(key);
    }
}
