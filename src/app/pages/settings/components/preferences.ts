import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { DividerModule } from 'primeng/divider';
import { LayoutService } from '../../../layout/service/layout.service';
import { I18nService } from '../../../i18n/i18n.service';

@Component({
    selector: 'app-settings-preferences',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, SelectModule, ToggleSwitchModule, DividerModule],
    template: `
        <div class="card">
            <!-- Language & Region -->
            <div class="mb-8">
                <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-0 mb-6">{{ t('settings.preferences.title') }}</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Language -->
                    <div>
                        <label class="block text-sm text-surface-500 dark:text-surface-400 mb-2">{{ t('settings.preferences.language') }}</label>
                        <p-select 
                            [(ngModel)]="selectedLanguage" 
                            [options]="languages" 
                            optionLabel="name" 
                            optionValue="code"
                            class="w-full"
                            styleClass="!py-1"
                            (onChange)="onLanguageChange($event.value)"
                        >
                            <ng-template #selectedItem let-selected>
                                <div class="flex items-center gap-2" *ngIf="selected">
                                    <span class="text-xl">{{ getLanguageFlag(selected.code) }}</span>
                                    <span>{{ selected.name }}</span>
                                </div>
                            </ng-template>
                            <ng-template #item let-language>
                                <div class="flex items-center gap-2">
                                    <span class="text-xl">{{ getLanguageFlag(language.code) }}</span>
                                    <span>{{ language.name }}</span>
                                </div>
                            </ng-template>
                        </p-select>
                    </div>

                    <!-- Currency -->
                    <div>
                        <label class="block text-sm text-surface-500 dark:text-surface-400 mb-2">{{ t('settings.preferences.currency') }}</label>
                        <p-select 
                            [(ngModel)]="selectedCurrency" 
                            [options]="currencies" 
                            optionLabel="name" 
                            optionValue="code"
                            class="w-full"
                            styleClass="!py-1"
                        >
                            <ng-template #selectedItem let-selected>
                                <div class="flex items-center gap-2" *ngIf="selected">
                                    <span class="font-mono">{{ selected.symbol }}</span>
                                    <span>{{ selected.name }}</span>
                                </div>
                            </ng-template>
                            <ng-template #item let-currency>
                                <div class="flex items-center gap-2">
                                    <span class="font-mono">{{ currency.symbol }}</span>
                                    <span>{{ currency.name }}</span>
                                </div>
                            </ng-template>
                        </p-select>
                    </div>
                </div>
            </div>

            <p-divider />

            <!-- Theme -->
            <div class="mb-8">
                <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-0 mb-6">{{ t('settings.preferences.theme') }}</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <!-- Light Theme -->
                    <div 
                        (click)="setTheme('light')"
                        [class]="'p-4 rounded-xl border-2 cursor-pointer transition-all ' + 
                            (!isDarkMode ? 'border-primary bg-primary/5' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600')"
                    >
                        <div class="w-full h-20 bg-white border border-surface-200 rounded-lg mb-3 flex items-center justify-center">
                            <i class="pi pi-sun text-2xl text-amber-500"></i>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="font-medium text-surface-900 dark:text-surface-0">{{ t('settings.preferences.lightMode') }}</span>
                            <div *ngIf="!isDarkMode" class="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <i class="pi pi-check text-white text-xs"></i>
                            </div>
                        </div>
                    </div>

                    <!-- Dark Theme -->
                    <div 
                        (click)="setTheme('dark')"
                        [class]="'p-4 rounded-xl border-2 cursor-pointer transition-all ' + 
                            (isDarkMode ? 'border-primary bg-primary/5' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600')"
                    >
                        <div class="w-full h-20 bg-slate-900 border border-slate-700 rounded-lg mb-3 flex items-center justify-center">
                            <i class="pi pi-moon text-2xl text-indigo-400"></i>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="font-medium text-surface-900 dark:text-surface-0">{{ t('settings.preferences.darkMode') }}</span>
                            <div *ngIf="isDarkMode" class="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <i class="pi pi-check text-white text-xs"></i>
                            </div>
                        </div>
                    </div>

                    <!-- System Theme -->
                    <div 
                        (click)="setTheme('system')"
                        class="p-4 rounded-xl border-2 border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600 cursor-pointer transition-all"
                    >
                        <div class="w-full h-20 bg-gradient-to-r from-white to-slate-900 border border-surface-200 rounded-lg mb-3 flex items-center justify-center">
                            <i class="pi pi-desktop text-2xl text-surface-500"></i>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="font-medium text-surface-900 dark:text-surface-0">{{ t('settings.preferences.systemMode') }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <p-divider />

            <!-- Notifications -->
            <div class="mb-8">
                <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-0 mb-6">{{ t('settings.preferences.notifications') }}</h2>
                
                <div class="space-y-4">
                    <div class="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-800 rounded-xl">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
                                <i class="pi pi-envelope text-white"></i>
                            </div>
                            <div>
                                <p class="font-medium text-surface-900 dark:text-surface-0">{{ t('settings.preferences.emailNotifications') }}</p>
                                <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.preferences.emailNotificationsDesc') }}</p>
                            </div>
                        </div>
                        <p-toggleswitch [(ngModel)]="emailNotifications" />
                    </div>

                    <div class="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-800 rounded-xl">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                                <i class="pi pi-bell text-white"></i>
                            </div>
                            <div>
                                <p class="font-medium text-surface-900 dark:text-surface-0">{{ t('settings.preferences.pushNotifications') }}</p>
                                <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.preferences.pushNotificationsDesc') }}</p>
                            </div>
                        </div>
                        <p-toggleswitch [(ngModel)]="pushNotifications" />
                    </div>

                    <div class="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-800 rounded-xl">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                <i class="pi pi-chart-line text-white"></i>
                            </div>
                            <div>
                                <p class="font-medium text-surface-900 dark:text-surface-0">{{ t('settings.preferences.monthlyReports') }}</p>
                                <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.preferences.monthlyReportsDesc') }}</p>
                            </div>
                        </div>
                        <p-toggleswitch [(ngModel)]="monthlyReports" />
                    </div>

                    <div class="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-800 rounded-xl">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
                                <i class="pi pi-exclamation-triangle text-white"></i>
                            </div>
                            <div>
                                <p class="font-medium text-surface-900 dark:text-surface-0">{{ t('settings.preferences.expenseAlerts') }}</p>
                                <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.preferences.expenseAlertsDesc') }}</p>
                            </div>
                        </div>
                        <p-toggleswitch [(ngModel)]="expenseAlerts" />
                    </div>
                </div>
            </div>

            <p-divider />

            <!-- Data Export -->
            <div>
                <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-0 mb-6">{{ t('settings.preferences.data') }}</h2>
                
                <div class="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-800 rounded-xl">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                            <i class="pi pi-download text-white text-xl"></i>
                        </div>
                        <div>
                            <p class="font-medium text-surface-900 dark:text-surface-0">{{ t('settings.preferences.exportData') }}</p>
                            <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.preferences.exportDataDesc') }}</p>
                        </div>
                    </div>
                    <p-button [label]="t('common.export')" icon="pi pi-download" [outlined]="true" />
                </div>
            </div>
        </div>
    `
})
export class PreferencesSettings implements OnInit {
    languages = [
        { name: 'Français', code: 'fr' },
        { name: 'English', code: 'en' }
    ];

    currencies = [
        { name: 'EUR - Euro', code: 'EUR', symbol: '€' },
        { name: 'XOF - Franc CFA', code: 'XOF', symbol: 'CFA' }
    ];

    selectedLanguage = 'fr';
    selectedCurrency = 'EUR';
    emailNotifications = true;
    pushNotifications = true;
    monthlyReports = true;
    expenseAlerts = false;

    constructor(
        private layoutService: LayoutService,
        private router: Router,
        private i18n: I18nService
    ) {}

    ngOnInit() {
        // Get current language from URL
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        this.selectedLanguage = match ? match[1] : 'fr';
    }

    get isDarkMode(): boolean {
        return this.layoutService.layoutConfig().darkTheme ?? false;
    }

    onLanguageChange(newLang: string) {
        // Update i18n service
        this.i18n.setLang(newLang as 'fr' | 'en');
        
        // Navigate to the new language URL and reload the page
        const currentUrl = this.router.url;
        const newUrl = currentUrl.replace(/^\/(fr|en)/, `/${newLang}`);
        
        // Use window.location to force a full page reload
        window.location.href = newUrl;
    }

    setTheme(theme: 'light' | 'dark' | 'system') {
        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.layoutService.layoutConfig.update((state) => ({ ...state, darkTheme: prefersDark }));
        } else {
            this.layoutService.layoutConfig.update((state) => ({ ...state, darkTheme: theme === 'dark' }));
        }
    }

    getLanguageFlag(code: string): string {
        const flags: Record<string, string> = {
            'fr': '🇫🇷',
            'en': '🇬🇧'
        };
        return flags[code] || '🌐';
    }

    t(key: string, params?: Record<string, string | number>): string {
        return this.i18n.t(key, params);
    }
}

