import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { I18nService } from '../../i18n/i18n.service';

@Component({
    selector: 'app-notfound',
    standalone: true,
    imports: [RouterModule, ButtonModule, RippleModule],
    template: `
        <div class="min-h-screen flex items-center justify-center bg-surface-0 dark:bg-surface-950 px-6 py-12">
            <div class="max-w-lg w-full text-center">

                <!-- Animated 404 number -->
                <div class="relative mb-8">
                    <div class="text-[10rem] sm:text-[12rem] font-black leading-none tracking-tighter
                                text-brand-700 dark:text-ochre-400
                                select-none opacity-10">
                        404
                    </div>
                    <div class="absolute inset-0 flex items-center justify-center">
                        <div class="w-20 h-20 rounded-2xl bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center">
                            <i class="pi pi-map text-brand-700 dark:text-ochre-400 text-3xl"></i>
                        </div>
                    </div>
                </div>

                <!-- Text -->
                <h1 class="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-0 mb-3">
                    {{ i18n.t('notFound.title') }}
                </h1>
                <p class="text-surface-500 dark:text-surface-400 text-base mb-10 max-w-sm mx-auto leading-relaxed">
                    {{ i18n.t('notFound.description') }}
                </p>

                <!-- Actions -->
                <div class="flex flex-col sm:flex-row gap-3 justify-center mb-12">
                    <button pButton pRipple [label]="i18n.t('notFound.backToDashboard')" icon="pi pi-home"
                            [routerLink]="currentLang"
                            class="!bg-brand-700 hover:!bg-brand-800 !border-0 !text-white !font-semibold !rounded-xl !px-6 !py-3"></button>
                    <button pButton pRipple [label]="i18n.t('notFound.home')" icon="pi pi-arrow-left"
                            [routerLink]="[currentLang, 'landing']"
                            [outlined]="true"
                            class="!rounded-xl !px-6 !py-3 !font-semibold"></button>
                </div>

                <!-- Quick links -->
                <div class="flex flex-wrap justify-center gap-3 text-sm">
                    <a [routerLink]="[currentLang, 'pages', 'patrimoine']"
                       class="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-100 dark:bg-surface-800
                              text-surface-600 dark:text-surface-300 hover:text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-700/20
                              transition-all cursor-pointer">
                        <i class="pi pi-wallet text-xs"></i> {{ i18n.t('menu.patrimony') }}
                    </a>
                    <a [routerLink]="[currentLang, 'pages', 'transaction']"
                       class="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-100 dark:bg-surface-800
                              text-surface-600 dark:text-surface-300 hover:text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-700/20
                              transition-all cursor-pointer">
                        <i class="pi pi-arrow-right-arrow-left text-xs"></i> {{ i18n.t('menu.transactions') }}
                    </a>
                    <a [routerLink]="[currentLang, 'pages', 'settings']"
                       class="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-100 dark:bg-surface-800
                              text-surface-600 dark:text-surface-300 hover:text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-700/20
                              transition-all cursor-pointer">
                        <i class="pi pi-cog text-xs"></i> {{ i18n.t('menu.settings') }}
                    </a>
                </div>

                <!-- Brand footer -->
                <div class="mt-16 flex items-center justify-center gap-2 opacity-40">
                    <img src="assets/brand/omaad-icon.svg" alt="Omaad" class="w-6 h-6">
                    <span class="text-surface-500 text-sm font-medium">Omaad</span>
                </div>
            </div>
        </div>
    `
})
export class Notfound {
    private router = inject(Router);
    i18n = inject(I18nService);
    get currentLang(): string {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        return '/' + (match ? match[1] : 'fr');
    }
}
