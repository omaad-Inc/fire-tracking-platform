import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { DividerModule } from 'primeng/divider';

import { Observable } from 'rxjs';
import { LayoutService } from '../../../layout/service/layout.service';
import { I18nService } from '../../../i18n/i18n.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { TokenService } from '../../../core/services/token.service';
import { ApiService } from '../../../core/services/api.service';
import { FeedbackService } from '../../../core/ui/feedback.service';

@Component({
    selector: 'app-settings-preferences',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, SelectModule, ToggleSwitchModule, DividerModule],
    template: `
        <div class="max-w-2xl mx-auto pb-10">
            <!-- Language & region card -->
            <section class="rounded-2xl border border-surface-200/80 dark:border-surface-700/60 bg-surface-0 dark:bg-surface-900/50 shadow-sm p-6 md:p-7 mb-5">
                <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-6">{{ t('settings.preferences.regionTitle') }}</h2>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <!-- Language -->
                    <div>
                        <label class="block text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2">{{ t('settings.preferences.language') }}</label>
                        <p-select
                            [(ngModel)]="selectedLanguage"
                            [options]="languages"
                            optionLabel="name"
                            optionValue="code"
                            class="w-full"
                            styleClass="w-full"
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
                        <label class="block text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2">{{ t('settings.preferences.currency') }}</label>
                        <p-select
                            [(ngModel)]="selectedCurrency"
                            [options]="currencies"
                            optionLabel="name"
                            optionValue="code"
                            class="w-full"
                            styleClass="w-full"
                            (onChange)="onCurrencyChange($event.value)"
                        >
                            <ng-template #selectedItem let-selected>
                                <div class="flex items-center gap-2" *ngIf="selected">
                                    <span class="font-mono font-bold text-brand-700 dark:text-ochre-400">{{ selected.symbol }}</span>
                                    <span>{{ selected.name }}</span>
                                </div>
                            </ng-template>
                            <ng-template #item let-currency>
                                <div class="flex items-center gap-2">
                                    <span class="font-mono font-bold text-brand-700 dark:text-ochre-400">{{ currency.symbol }}</span>
                                    <span>{{ currency.name }}</span>
                                </div>
                            </ng-template>
                        </p-select>
                    </div>
                </div>
                <p class="text-xs text-surface-400 dark:text-surface-500 mt-3">{{ t('settings.preferences.fxReference') }}</p>
            </section>

            <!-- Theme card -->
            <section class="rounded-2xl border border-surface-200/80 dark:border-surface-700/60 bg-surface-0 dark:bg-surface-900/50 shadow-sm p-6 md:p-7 mb-5">
                <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-6">{{ t('settings.preferences.theme') }}</h2>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <!-- Light Theme -->
                    <button type="button"
                        (click)="setTheme('light')"
                        class="text-left p-3 rounded-2xl border cursor-pointer transition-all"
                        [ngClass]="isLightMode ? 'border-ochre-500 ring-2 ring-ochre-500/20 bg-ochre-500/[0.04]' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'"
                    >
                        <div class="w-full h-20 bg-white border border-surface-200 rounded-xl mb-3 flex items-center justify-center"><!-- dark-ok: light-theme preview tile -->
                            <i class="pi pi-sun text-2xl text-ochre-500"></i>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="font-medium text-surface-900 dark:text-surface-0 text-sm">{{ t('settings.preferences.lightMode') }}</span>
                            <div *ngIf="isLightMode" class="w-5 h-5 rounded-full bg-ochre-500 flex items-center justify-center shrink-0">
                                <i class="pi pi-check text-warm-900 text-xs"></i>
                            </div>
                        </div>
                    </button>

                    <!-- Dark Theme -->
                    <button type="button"
                        (click)="setTheme('dark')"
                        class="text-left p-3 rounded-2xl border cursor-pointer transition-all"
                        [ngClass]="isDarkModeSelected ? 'border-ochre-500 ring-2 ring-ochre-500/20 bg-ochre-500/[0.04]' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'"
                    >
                        <div class="w-full h-20 bg-warm-900 border border-warm-700 rounded-xl mb-3 flex items-center justify-center">
                            <i class="pi pi-moon text-2xl text-brand-300"></i>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="font-medium text-surface-900 dark:text-surface-0 text-sm">{{ t('settings.preferences.darkMode') }}</span>
                            <div *ngIf="isDarkModeSelected" class="w-5 h-5 rounded-full bg-ochre-500 flex items-center justify-center shrink-0">
                                <i class="pi pi-check text-warm-900 text-xs"></i>
                            </div>
                        </div>
                    </button>

                    <!-- System Theme -->
                    <button type="button"
                        (click)="setTheme('system')"
                        class="text-left p-3 rounded-2xl border cursor-pointer transition-all"
                        [ngClass]="isSystemMode ? 'border-ochre-500 ring-2 ring-ochre-500/20 bg-ochre-500/[0.04]' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'"
                    >
                        <div class="w-full h-20 rounded-xl mb-3 overflow-hidden flex border border-surface-200 dark:border-surface-700">
                            <div class="w-1/2 bg-white flex items-center justify-center"><!-- dark-ok: system-theme preview tile -->
                                <i class="pi pi-sun text-xl text-ochre-500"></i>
                            </div>
                            <div class="w-1/2 bg-warm-900 flex items-center justify-center">
                                <i class="pi pi-moon text-xl text-brand-300"></i>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="font-medium text-surface-900 dark:text-surface-0 text-sm">{{ t('settings.preferences.systemMode') }}</span>
                            <div *ngIf="isSystemMode" class="w-5 h-5 rounded-full bg-ochre-500 flex items-center justify-center shrink-0">
                                <i class="pi pi-check text-warm-900 text-xs"></i>
                            </div>
                        </div>
                    </button>
                </div>
            </section>

            <!-- Notifications moved to their own Settings page (S9-B3):
                 /settings/notifications, one surface per concern. -->

            <!-- Data card -->
            <section class="rounded-2xl border border-surface-200/80 dark:border-surface-700/60 bg-surface-0 dark:bg-surface-900/50 shadow-sm p-6 md:p-7">
                <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-4">{{ t('settings.preferences.data') }}</h2>

                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div class="flex items-center gap-4 min-w-0">
                        <div class="w-11 h-11 rounded-xl bg-brand-700/10 dark:bg-ochre-400/10 flex items-center justify-center shrink-0">
                            <i class="pi pi-download text-brand-700 dark:text-ochre-400"></i>
                        </div>
                        <div class="min-w-0">
                            <p class="font-medium text-surface-900 dark:text-surface-0">{{ t('settings.preferences.exportData') }}</p>
                            <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.preferences.exportDataDesc') }}</p>
                        </div>
                    </div>
                    <div class="flex gap-2.5 shrink-0">
                        <button type="button" (click)="downloadCsv()" [disabled]="exporting()"
                                class="omaad-secondary flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm cursor-pointer disabled:opacity-50">
                            <i class="pi text-xs" [ngClass]="exporting() ? 'pi-spin pi-spinner' : 'pi-file'"></i>CSV
                        </button>
                        <button type="button" (click)="downloadJson()" [disabled]="exporting()"
                                class="omaad-secondary flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm cursor-pointer disabled:opacity-50">
                            <i class="pi text-xs" [ngClass]="exporting() ? 'pi-spin pi-spinner' : 'pi-download'"></i>JSON
                        </button>
                    </div>
                </div>
            </section>
        </div>
    `
})
export class PreferencesSettings implements OnInit {
    private layoutService = inject(LayoutService);
    private feedback = inject(FeedbackService);
    private router = inject(Router);
    private i18n = inject(I18nService);
    private currencyService = inject(CurrencyService);
    private tokenService = inject(TokenService);
    private api = inject(ApiService);

    exporting = signal(false);

    downloadJson(): void {
        this.runExport(() => this.api.exportDataJson(), 'omaad-export.json');
    }

    downloadCsv(): void {
        this.runExport(() => this.api.exportTransactionsCsv(), 'omaad-transactions.csv');
    }

    private runExport(fetch: () => Observable<Blob>, filename: string): void {
        this.exporting.set(true);
        fetch().subscribe({
            next: (blob) => {
                this.exporting.set(false);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            },
            error: () => {
                this.exporting.set(false);
                this.feedback.error(this.t('settings.preferences.exportError'));
            }
        });
    }

    languages = [
        { name: 'Français', code: 'fr' },
        { name: 'English', code: 'en' }
    ];

    // Display currency: what the user READS their portfolio in, independent of the
    // currency each asset is stored in. Both CFA francs are offered and must name
    // their zone: two entries both reading "Franc CFA / FCFA" are unusable, and a
    // Gabonese user picking XOF would be labelled in the wrong zone's currency.
    // (USD was already listed here but the backend enum rejected it with a 422
    // until the display-currency migration; it works now.)
    currencies = [
        { name: 'XOF - Franc CFA (Afrique de l\'Ouest)', code: 'XOF', symbol: 'FCFA' },
        { name: 'XAF - Franc CFA (Afrique centrale)',    code: 'XAF', symbol: 'FCFA' },
        { name: 'EUR - Euro',                            code: 'EUR', symbol: '€'    },
        { name: 'USD - Dollar US',                       code: 'USD', symbol: '$'    }
    ];

    selectedLanguage = 'fr';
    selectedCurrency = 'XOF';

    ngOnInit() {
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        this.selectedLanguage = match ? match[1] : 'fr';
        this.selectedCurrency = this.tokenService.user()?.preferred_currency || 'XOF';
    }

    get isDarkMode(): boolean { return this.layoutService.layoutConfig().darkTheme ?? false; }
    get currentThemeMode(): 'light' | 'dark' | 'system' { return this.layoutService.layoutConfig().themeMode || 'system'; }
    get isSystemMode(): boolean { return this.currentThemeMode === 'system'; }
    get isLightMode(): boolean { return this.currentThemeMode === 'light'; }
    get isDarkModeSelected(): boolean { return this.currentThemeMode === 'dark'; }

    onLanguageChange(newLang: string): void {
        this.i18n.setLang(newLang as 'fr' | 'en');
        const currentUrl = this.router.url;
        const newUrl = currentUrl.replace(/^\/(fr|en)/, `/${newLang}`);
        this.router.navigateByUrl(newUrl);
    }

    onCurrencyChange(code: string): void {
        this.currencyService.setCurrency(code);
    }

    setTheme(theme: 'light' | 'dark' | 'system'): void {
        this.layoutService.layoutConfig.update((state) => {
            const newState = { ...state, themeMode: theme };
            if (theme === 'system') {
                newState.darkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
            } else {
                newState.darkTheme = theme === 'dark';
            }
            return newState;
        });
    }

    getLanguageFlag(code: string): string {
        return ({ 'fr': '🇫🇷', 'en': '🇬🇧' } as Record<string, string>)[code] || '🌐';
    }

    t(key: string, params?: Record<string, string | number>): string {
        return this.i18n.t(key, params);
    }
}
