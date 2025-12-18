import { Component, OnInit, inject, signal } from '@angular/core';
import { MenuItem, MessageService } from 'primeng/api';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { AppConfigurator } from './app.configurator';
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
    owners: Owner[];
}

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [
        RouterModule, CommonModule, StyleClassModule, AppConfigurator, AvatarModule, 
        DividerModule, DialogModule, ButtonModule, FormsModule, InputTextModule, 
        SelectModule, InputNumberModule, ToastModule
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
                <!-- Palette config - hidden on mobile -->
                <div class="relative hidden lg:block">
                    <button
                        class="layout-topbar-action layout-topbar-action-highlight"
                        pStyleClass="@next"
                        enterFromClass="hidden"
                        enterActiveClass="animate-scalein"
                        leaveToClass="hidden"
                        leaveActiveClass="animate-fadeout"
                        [hideOnOutsideClick]="true"
                    >
                        <i class="pi pi-palette"></i>
                    </button>
                    <app-configurator />
                </div>
            </div>

            <!-- Add Assets Button - Desktop Only -->
            <button 
                type="button" 
                class="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-contrast font-medium transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary/30"
                (click)="openAddAssetDialog()"
            >
                <i class="pi pi-plus"></i>
                <span>{{ t('topbar.addAssets') }}</span>
            </button>

            <!-- Mobile ONLY: Simple user icon - redirects directly to settings -->
            <a 
                [routerLink]="['/'+lang, 'pages', 'settings', 'account']" 
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
                            </div>

                            <p-divider styleClass="!my-0" />

                            <!-- Help Section -->
                            <div class="py-2">
                                <a href="https://help.afrinnexus.app" target="_blank" class="flex items-center gap-3 px-4 py-3 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer">
                                    <i class="pi pi-question-circle text-amber-500"></i>
                                    <span class="text-surface-700 dark:text-surface-200">{{ t('settings.getHelp') }}</span>
                                    <i class="pi pi-external-link text-xs text-surface-400 ml-auto"></i>
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
        [style]="{ width: '90vw', maxWidth: '800px' }"
        [contentStyle]="{ 'padding': '0' }"
        styleClass="add-asset-dialog"
        [showHeader]="false"
    >
        <div class="bg-surface-0 dark:bg-surface-900">
            <!-- Header with back button and title -->
            <div class="flex items-center gap-4 p-6 border-b border-surface-200 dark:border-surface-700">
                @if (currentStep() > 1) {
                    <button 
                        type="button" 
                        class="w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                        (click)="previousStep()"
                    >
                        <i class="pi pi-chevron-left text-surface-600 dark:text-surface-300"></i>
                    </button>
                }
                <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-0 m-0">{{ t('addAssets.title') }}</h2>
            </div>
            
            <div class="flex flex-col lg:flex-row min-h-[500px]">
                <!-- Left Sidebar - Steps -->
                <div class="w-full lg:w-64 p-6 border-b lg:border-b-0 lg:border-r border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                    <div class="flex lg:flex-col gap-4">
                        <button 
                            type="button"
                            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left w-full"
                            [ngClass]="currentStep() === 1 ? 'bg-primary/10 text-primary font-semibold' : 'text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700'"
                            (click)="goToStep(1)"
                        >
                            <span class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                                  [ngClass]="currentStep() === 1 ? 'bg-primary text-white' : 'bg-surface-200 dark:bg-surface-600 text-surface-600 dark:text-surface-300'">1</span>
                            <span>Informations</span>
                        </button>
                        <button 
                            type="button"
                            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left w-full"
                            [ngClass]="currentStep() === 2 ? 'bg-primary/10 text-primary font-semibold' : 'text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700'"
                            (click)="goToStep(2)"
                            [disabled]="!isStep1Valid()"
                        >
                            <span class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                                  [ngClass]="currentStep() === 2 ? 'bg-primary text-white' : 'bg-surface-200 dark:bg-surface-600 text-surface-600 dark:text-surface-300'">2</span>
                            <span>Ownership</span>
                        </button>
                    </div>
                </div>
                
                <!-- Right Content -->
                <div class="flex-1 p-6">
                    <!-- Step 1: Informations -->
                    @if (currentStep() === 1) {
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <!-- Name -->
                            <div class="flex flex-col gap-2">
                                <label class="text-surface-500 dark:text-surface-400 text-sm">Name</label>
                                <input 
                                    pInputText 
                                    [(ngModel)]="assetForm.name" 
                                    placeholder="Ex: Land, Apartment..."
                                    class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary"
                                />
                            </div>
                            
                            <!-- Category -->
                            <div class="flex flex-col gap-2">
                                <label class="text-surface-500 dark:text-surface-400 text-sm">Category</label>
                                <p-select 
                                    [(ngModel)]="assetForm.category" 
                                    [options]="categoryOptions" 
                                    optionLabel="label" 
                                    optionValue="value"
                                    placeholder="Select category"
                                    styleClass="w-full !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !shadow-none"
                                />
                            </div>
                            
                            <!-- Quantity -->
                            <div class="flex flex-col gap-2">
                                <label class="text-surface-500 dark:text-surface-400 text-sm">Quantity</label>
                                <p-inputnumber 
                                    [(ngModel)]="assetForm.quantity" 
                                    [min]="1"
                                    inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary"
                                />
                            </div>
                            
                            <!-- Buying price per unit -->
                            <div class="flex flex-col gap-2">
                                <label class="text-surface-500 dark:text-surface-400 text-sm">Buying price per unit</label>
                                <div class="relative">
                                    <p-inputnumber 
                                        [(ngModel)]="assetForm.purchasePrice" 
                                        mode="decimal"
                                        [minFractionDigits]="0"
                                        [maxFractionDigits]="2"
                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary !pr-12"
                                    />
                                    <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-sm">EUR</span>
                                </div>
                            </div>
                            
                            <!-- Current price per unit -->
                            <div class="flex flex-col gap-2 md:col-span-1">
                                <label class="text-surface-500 dark:text-surface-400 text-sm">Current price per unit</label>
                                <div class="relative">
                                    <p-inputnumber 
                                        [(ngModel)]="assetForm.currentPrice" 
                                        mode="decimal"
                                        [minFractionDigits]="0"
                                        [maxFractionDigits]="2"
                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary !pr-12"
                                    />
                                    <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-sm">EUR</span>
                                </div>
                            </div>
                        </div>
                    }
                    
                    <!-- Step 2: Ownership -->
                    @if (currentStep() === 2) {
                        <div class="space-y-6">
                            <!-- Asset Summary Card -->
                            <div class="flex items-center justify-center mb-8">
                                <div class="flex flex-col items-center">
                                    <div class="w-20 h-20 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center mb-4">
                                        <i class="pi pi-building text-3xl text-surface-500 dark:text-surface-400"></i>
                                    </div>
                                    <span class="text-surface-500 dark:text-surface-400 text-sm">{{ assetForm.name || 'Asset' }}</span>
                                    <span class="text-2xl font-bold text-surface-900 dark:text-surface-0">
                                        {{ (assetForm.currentPrice * assetForm.quantity) | currency:'EUR':'symbol':'1.0-0' }}
                                    </span>
                                </div>
                            </div>
                            
                            <!-- Owners Section -->
                            <div>
                                <h3 class="text-surface-500 dark:text-surface-400 text-sm mb-4">Owners</h3>
                                <div class="space-y-4">
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
                                <h3 class="text-surface-500 dark:text-surface-400 text-sm mb-4">Members</h3>
                                <button 
                                    type="button"
                                    class="flex items-center gap-3 p-4 rounded-xl border border-dashed border-surface-300 dark:border-surface-600 hover:border-primary hover:bg-primary/5 transition-all w-full"
                                    (click)="addMember()"
                                >
                                    <div class="w-10 h-10 rounded-full border-2 border-surface-300 dark:border-surface-600 flex items-center justify-center">
                                        <i class="pi pi-plus text-surface-400"></i>
                                    </div>
                                    <span class="text-surface-600 dark:text-surface-300">Add a member</span>
                    </button>
                            </div>
                        </div>
                    }
                </div>
            </div>
            
            <!-- Footer -->
            <div class="flex items-center justify-end gap-4 p-6 border-t border-surface-200 dark:border-surface-700">
                @if (currentStep() === 1) {
                    <button 
                        pButton
                        type="button"
                        label="Next"
                        class="px-8"
                        [disabled]="!isStep1Valid()"
                        (click)="nextStep()"
                    ></button>
                } @else {
                    <button 
                        pButton
                        type="button"
                        label="Back"
                        [outlined]="true"
                        (click)="previousStep()"
                    ></button>
                    <button 
                        pButton
                        type="button"
                        label="Submit"
                        class="!bg-amber-100 !text-amber-900 !border-amber-100 hover:!bg-amber-200"
                        [loading]="isSubmitting()"
                        (click)="submitAsset()"
                    ></button>
                }
            </div>
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

    layoutService = inject(LayoutService);

    items!: MenuItem[];
    lang = 'fr';
    
    // Add Asset Dialog
    showAddAssetDialog = false;
    currentStep = signal(1);
    isSubmitting = signal(false);
    
    // Asset Form Data
    assetForm: AssetFormData = {
        name: '',
        category: '',
        quantity: 1,
        purchasePrice: 0,
        currentPrice: 0,
        owners: []
    };
    
    // Category options
    categoryOptions = [
        { label: 'Immobilier', value: 'real_estate' },
        { label: 'Actions', value: 'stocks' },
        { label: 'Obligations', value: 'bonds' },
        { label: 'Crypto-monnaies', value: 'crypto' },
        { label: 'Liquidités', value: 'cash' },
        { label: 'Épargne retraite', value: 'retirement' },
        { label: 'Assurance vie', value: 'life_insurance' },
        { label: 'Livrets', value: 'savings_account' },
        { label: 'Entreprise', value: 'business' },
        { label: 'Véhicules', value: 'vehicle' },
        { label: 'Collections', value: 'collectibles' },
        { label: 'Autres', value: 'other' }
    ];

    user = this.tokenService.user;

    constructor() {
        // Listen to route changes to update language
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
        
        // If it's a relative URL, prepend the backend base URL
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
        this.layoutService.layoutConfig.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
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
        const currentUser = this.user();
        const ownerName = this.userName;
        const initials = this.userInitials;
        
        this.assetForm = {
            name: '',
            category: '',
            quantity: 1,
            purchasePrice: 0,
            currentPrice: 0,
            owners: [{
                name: ownerName,
                initials: initials,
                percentage: 100
            }]
        };
        this.currentStep.set(1);
    }
    
    isStep1Valid(): boolean {
        return !!(this.assetForm.name && this.assetForm.category && this.assetForm.currentPrice > 0);
    }
    
    nextStep(): void {
        if (this.currentStep() < 2) {
            this.currentStep.update(v => v + 1);
        }
    }
    
    previousStep(): void {
        if (this.currentStep() > 1) {
            this.currentStep.update(v => v - 1);
        }
    }
    
    goToStep(step: number): void {
        if (step === 1 || (step === 2 && this.isStep1Valid())) {
            this.currentStep.set(step);
        }
    }
    
    removeOwner(owner: Owner): void {
        if (this.assetForm.owners.length > 1) {
            const index = this.assetForm.owners.indexOf(owner);
            if (index > -1) {
                this.assetForm.owners.splice(index, 1);
                // Redistribute percentages
                const remaining = 100 / this.assetForm.owners.length;
                this.assetForm.owners.forEach(o => o.percentage = remaining);
            }
        }
    }
    
    addMember(): void {
        // For now, just show a message - in a full implementation, this would open a member selection dialog
        this.messageService.add({
            severity: 'info',
            summary: 'Coming Soon',
            detail: 'Member management will be available soon',
            life: 3000
        });
    }
    
    async submitAsset(): Promise<void> {
        if (!this.isStep1Valid()) return;
        
        this.isSubmitting.set(true);
        
        try {
            const assetData: AssetCreate = {
                name: this.assetForm.name,
                category: this.assetForm.category as AssetCategory,
                current_value: this.assetForm.currentPrice * this.assetForm.quantity,
                purchase_value: this.assetForm.purchasePrice * this.assetForm.quantity,
                purchase_date: new Date().toISOString().split('T')[0]
            };
            
            // Use PatrimoineService which will notify subscribers of the update
            await this.patrimoineService.createAsset(assetData);
            
            this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Asset added successfully',
                life: 3000
            });
            
            this.showAddAssetDialog = false;
            this.resetForm();
            
            // Navigate to patrimoine page to see the new asset
            this.router.navigate(['/', this.lang, 'pages', 'patrimoine']);
            
        } catch (error) {
            console.error('Error creating asset:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to create asset',
                life: 5000
            });
        } finally {
            this.isSubmitting.set(false);
        }
    }

    t(key: string): string {
        return this.i18n.t(key);
    }
}
