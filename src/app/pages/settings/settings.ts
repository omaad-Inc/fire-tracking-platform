import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { I18nService } from '../../i18n/i18n.service';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, TooltipModule],
    template: `
        <div class="min-h-screen">
            <!-- Header with close button -->
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-4">
                    <!-- Back button -->
                    <button 
                        (click)="goBack()"
                        class="w-10 h-10 flex items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-all cursor-pointer group"
                        [pTooltip]="t('settings.backToDashboard')"
                        tooltipPosition="right"
                    >
                        <i class="pi pi-arrow-left text-surface-600 dark:text-surface-300 group-hover:text-primary transition-colors"></i>
                    </button>
                    <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0">{{ t('settings.title') }}</h1>
                </div>
                <!-- Close button -->
                <button 
                    (click)="goBack()"
                    class="w-10 h-10 flex items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all cursor-pointer group"
                    [pTooltip]="t('common.close')"
                    tooltipPosition="left"
                >
                    <i class="pi pi-times text-surface-600 dark:text-surface-300 group-hover:text-red-500 transition-colors"></i>
                </button>
            </div>

            <div class="flex flex-col lg:flex-row gap-6">
                <!-- Sidebar Navigation -->
                <div class="w-full lg:w-72 shrink-0">
                    <div class="card !p-0 overflow-hidden">
                        <!-- Section: Gérer mon compte -->
                        <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                            <span class="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">{{ t('settings.manageAccount') }}</span>
                        </div>
                        <nav class="py-2">
                            <a 
                                routerLink="account" 
                                routerLinkActive="bg-primary/10 border-l-4 border-primary text-primary"
                                class="flex items-center gap-3 px-4 py-3 text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                            >
                                <i class="pi pi-user"></i>
                                <span>{{ t('menu.myAccount') }}</span>
                            </a>
                            <a 
                                routerLink="security" 
                                routerLinkActive="bg-primary/10 border-l-4 border-primary text-primary"
                                class="flex items-center gap-3 px-4 py-3 text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                            >
                                <i class="pi pi-shield"></i>
                                <span>{{ t('menu.security') }}</span>
                            </a>
                        </nav>

                        <!-- Section: Préférences -->
                        <div class="p-4 border-t border-b border-surface-200 dark:border-surface-700">
                            <span class="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">{{ t('menu.preferences') }}</span>
                        </div>
                        <nav class="py-2">
                            <a 
                                routerLink="preferences" 
                                routerLinkActive="bg-primary/10 border-l-4 border-primary text-primary"
                                class="flex items-center gap-3 px-4 py-3 text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                            >
                                <i class="pi pi-cog"></i>
                                <span>{{ t('menu.preferences') }}</span>
                            </a>
                        </nav>

                        <!-- Section: Aide -->
                        <div class="p-4 border-t border-b border-surface-200 dark:border-surface-700">
                            <span class="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">{{ t('settings.help') }}</span>
                        </div>
                        <nav class="py-2">
                            <a 
                                href="https://help.finova.com" 
                                target="_blank"
                                class="flex items-center gap-3 px-4 py-3 text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                            >
                                <i class="pi pi-question-circle"></i>
                                <span>{{ t('settings.getHelp') }}</span>
                                <i class="pi pi-external-link text-xs text-surface-400 ml-auto"></i>
                            </a>
                        </nav>

                        <!-- Back to Dashboard -->
                        <div class="p-4 border-t border-surface-200 dark:border-surface-700">
                            <button 
                                (click)="goBack()"
                                class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 text-primary hover:from-indigo-500/20 hover:to-cyan-500/20 transition-all cursor-pointer"
                            >
                                <i class="pi pi-home"></i>
                                <span class="font-medium">{{ t('settings.backToDashboard') }}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="flex-1">
                    <router-outlet></router-outlet>
                </div>
            </div>
        </div>
    `
})
export class Settings implements OnInit {
    private lang = 'fr';

    constructor(private router: Router, private i18n: I18nService) {}

    ngOnInit() {
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        this.lang = match ? match[1] : 'fr';
        this.i18n.setLang(this.lang as 'fr' | 'en');
    }

    goBack() {
        this.router.navigate(['/', this.lang]);
    }

    t(key: string, params?: Record<string, string | number>): string {
        return this.i18n.t(key, params);
    }
}

