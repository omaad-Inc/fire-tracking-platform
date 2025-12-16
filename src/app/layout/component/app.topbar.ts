import { Component, OnInit, inject } from '@angular/core';
import { MenuItem } from 'primeng/api';
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

interface AssetCategory {
    id: string;
    name: string;
    description: string;
    icon: string;
    gradientClass: string;
    route?: string;
}

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, CommonModule, StyleClassModule, AppConfigurator, AvatarModule, DividerModule, DialogModule, ButtonModule, FormsModule],
    template: ` <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <!-- Hamburger menu - hidden on mobile -->
            <button class="layout-menu-button layout-topbar-action hidden lg:flex" (click)="layoutService.onMenuToggle()">
                <i class="pi pi-bars"></i>
            </button>
            <a class="layout-topbar-logo flex items-center gap-2" routerLink="/">
                <img src="assets/afrin-nexus-logo.svg" alt="Afrin Nexus Logo" class="w-10 h-10 lg:w-12 lg:h-12">
                <!-- Hide text on mobile -->
                <span class="hidden lg:inline whitespace-nowrap">Afrin Nexus</span>
            </a>
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
                (click)="showAddAssetsDialog = true"
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
    
    <!-- Add Assets Dialog -->
    <p-dialog 
        [(visible)]="showAddAssetsDialog" 
        [modal]="true" 
        [dismissableMask]="true"
        [draggable]="false"
        [resizable]="false"
        [style]="{ width: '90vw', maxWidth: '900px' }"
        [contentStyle]="{ 'padding': '0' }"
        styleClass="add-assets-dialog"
    >
        <ng-template pTemplate="header">
            <div class="flex items-center gap-3">
                <span class="text-xl font-semibold text-surface-900 dark:text-surface-0">{{ t('addAssets.title') }}</span>
            </div>
        </ng-template>
        
        <div class="p-6">
            <!-- Search -->
            <div class="relative mb-6">
                <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-surface-400"></i>
                <input 
                    type="text" 
                    [(ngModel)]="assetSearchQuery"
                    [placeholder]="t('addAssets.searchPlaceholder')"
                    class="w-full pl-12 pr-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-900 dark:text-surface-0 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
            </div>
            
            <p class="text-surface-500 dark:text-surface-400 mb-4">{{ t('addAssets.allCategories') }}</p>
            
            <!-- Asset Categories Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                @for (category of assetCategories; track category.id) {
                    <div 
                        class="group p-5 rounded-2xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:border-primary/50 hover:bg-surface-100 dark:hover:bg-surface-700 cursor-pointer transition-all duration-300"
                        (click)="selectAssetCategory(category)"
                    >
                        <div class="flex items-start gap-4">
                            <div class="flex-1">
                                <h3 class="font-semibold text-surface-900 dark:text-surface-0 mb-1 group-hover:text-primary transition-colors">{{ category.name }}</h3>
                                <p class="text-sm text-surface-500 dark:text-surface-400 leading-relaxed">{{ category.description }}</p>
                            </div>
                            <div class="w-16 h-16 rounded-xl bg-gradient-to-br opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 flex items-center justify-center" [ngClass]="category.gradientClass">
                                <i [class]="category.icon + ' text-2xl text-white'"></i>
                            </div>
                        </div>
                    </div>
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

    layoutService = inject(LayoutService);

    items!: MenuItem[];
    lang = 'fr';
    
    // Add Assets Dialog
    showAddAssetsDialog = false;
    assetSearchQuery = '';
    
    // Asset categories similar to Finary
    assetCategories: AssetCategory[] = [
        {
            id: 'real_estate',
            name: 'Immobilier',
            description: 'Biens immobiliers résidentiels et commerciaux, terrains, parkings',
            icon: 'pi pi-building',
            gradientClass: 'from-indigo-500 to-indigo-600',
            route: 'patrimoine'
        },
        {
            id: 'stocks',
            name: 'Actions & Fonds',
            description: 'Connectez vos comptes de courtage pour synchroniser vos investissements',
            icon: 'pi pi-chart-line',
            gradientClass: 'from-cyan-500 to-cyan-600',
            route: 'patrimoine'
        },
        {
            id: 'investment_accounts',
            name: 'Comptes d\'investissement',
            description: 'PEA, Assurance-vie, PER et autres enveloppes fiscales',
            icon: 'pi pi-briefcase',
            gradientClass: 'from-violet-500 to-violet-600',
            route: 'patrimoine'
        },
        {
            id: 'life_insurance',
            name: 'Assurance-vie',
            description: 'Contrats d\'assurance-vie des plus grands assureurs',
            icon: 'pi pi-shield',
            gradientClass: 'from-emerald-500 to-emerald-600',
            route: 'patrimoine'
        },
        {
            id: 'crypto',
            name: 'Crypto-monnaies',
            description: 'Connexion aux exchanges et wallets pour suivre vos cryptos',
            icon: 'pi pi-bitcoin',
            gradientClass: 'from-amber-500 to-amber-600',
            route: 'patrimoine'
        },
        {
            id: 'bank_accounts',
            name: 'Comptes Bancaires',
            description: 'Comptes courants, livrets d\'épargne, comptes à terme',
            icon: 'pi pi-wallet',
            gradientClass: 'from-teal-500 to-teal-600',
            route: 'patrimoine'
        },
        {
            id: 'savings',
            name: 'Épargne',
            description: 'Livret A, LDDS, LEP et autres livrets réglementés',
            icon: 'pi pi-dollar',
            gradientClass: 'from-pink-500 to-pink-600',
            route: 'savings'
        },
        {
            id: 'other',
            name: 'Autres actifs',
            description: 'Véhicules, objets de valeur, collections, créances',
            icon: 'pi pi-box',
            gradientClass: 'from-slate-500 to-slate-600',
            route: 'patrimoine'
        }
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

    selectAssetCategory(category: AssetCategory): void {
        this.showAddAssetsDialog = false;
        if (category.route) {
            this.router.navigate(['/', this.lang, 'pages', category.route], {
                queryParams: { addAsset: category.id }
            });
        }
    }

    t(key: string): string {
        return this.i18n.t(key);
    }
}
