import { Component } from '@angular/core';
import { StyleClassModule } from 'primeng/styleclass';
import { Router, RouterModule } from '@angular/router';
import { RippleModule } from 'primeng/ripple';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'topbar-widget',
    standalone: true,
    imports: [RouterModule, StyleClassModule, ButtonModule, RippleModule, CommonModule],
    template: `
        <!-- Logo -->
        <a class="flex items-center gap-2 cursor-pointer group shrink-0" [routerLink]="[currentLang, 'landing']" fragment="home">
            <img src="assets/afrin-nexus-logo.svg" alt="Afrin Nexus Logo" 
                     class="w-10 h-10 md:w-12 md:h-12 transition-transform duration-300 group-hover:scale-110">
            <span class="font-bold text-xl md:text-2xl text-surface-900 dark:text-surface-0 tracking-tight whitespace-nowrap">Afrin Nexus</span>
        </a>

        <!-- Desktop Navigation - visible on lg+ -->
        <nav class="hidden lg:flex items-center gap-2 mx-auto">
            <a (click)="navigateTo('home')" pRipple 
               class="flex items-center px-4 py-2 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                      hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-indigo-600 dark:hover:text-indigo-400
                      transition-all duration-200 cursor-pointer">
                Accueil
            </a>
            <a (click)="navigateTo('features')" pRipple 
               class="flex items-center px-4 py-2 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                      hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-indigo-600 dark:hover:text-indigo-400
                      transition-all duration-200 cursor-pointer">
                Fonctionnalités
            </a>
            <a (click)="navigateTo('highlights')" pRipple 
               class="flex items-center px-4 py-2 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                      hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-indigo-600 dark:hover:text-indigo-400
                      transition-all duration-200 cursor-pointer">
                Vision FIRE
            </a>
            <a (click)="navigateTo('pricing')" pRipple 
               class="flex items-center px-4 py-2 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                      hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-indigo-600 dark:hover:text-indigo-400
                      transition-all duration-200 cursor-pointer">
                Tarifs
            </a>
        </nav>

        <!-- Desktop CTA Buttons -->
        <div class="hidden lg:flex items-center gap-3 shrink-0">
            <button pButton pRipple label="Se connecter"
                    [routerLink]="[currentLang, 'auth', 'login']"
                    [rounded]="true" [text]="true"
                    class="!font-medium !text-surface-700 dark:!text-surface-200 hover:!text-indigo-600 dark:hover:!text-indigo-400">
            </button>
            <button pButton pRipple label="S'inscrire"
                    [routerLink]="[currentLang, 'auth', 'register']"
                    [rounded]="true"
                    class="!bg-gradient-to-r !from-indigo-600 !to-cyan-500 !border-0 !font-semibold
                           hover:!shadow-lg hover:!shadow-indigo-500/25 transition-all duration-300">
            </button>
        </div>

        <!-- Mobile Menu Toggle -->
        <a pButton [text]="true" severity="secondary" [rounded]="true" pRipple 
           class="lg:!hidden !p-2 shrink-0" 
           pStyleClass="@next" enterFromClass="hidden" leaveToClass="hidden" [hideOnOutsideClick]="true">
            <i class="pi pi-bars !text-xl"></i>
        </a>

        <!-- Mobile Navigation Dropdown -->
        <div class="hidden lg:!hidden absolute left-0 right-0 top-full mx-4 mt-2 z-20 rounded-xl
                    bg-surface-0/95 dark:bg-surface-900/95 backdrop-blur-lg
                    shadow-lg border border-surface-200/50 dark:border-surface-700/50 p-4">
            
            <ul class="list-none p-0 m-0 flex flex-col gap-1">
                <li>
                    <a (click)="navigateTo('home')" pRipple 
                       class="flex items-center px-4 py-3 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                              hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-indigo-600 dark:hover:text-indigo-400
                              transition-all duration-200 cursor-pointer">
                        <i class="pi pi-home mr-2"></i>
                        <span>Accueil</span>
                    </a>
                </li>
                <li>
                    <a (click)="navigateTo('features')" pRipple 
                       class="flex items-center px-4 py-3 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                              hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-indigo-600 dark:hover:text-indigo-400
                              transition-all duration-200 cursor-pointer">
                        <i class="pi pi-th-large mr-2"></i>
                        <span>Fonctionnalités</span>
                    </a>
                </li>
                <li>
                    <a (click)="navigateTo('highlights')" pRipple 
                       class="flex items-center px-4 py-3 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                              hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-indigo-600 dark:hover:text-indigo-400
                              transition-all duration-200 cursor-pointer">
                        <i class="pi pi-bolt mr-2"></i>
                        <span>Vision FIRE</span>
                    </a>
                </li>
                <li>
                    <a (click)="navigateTo('pricing')" pRipple 
                       class="flex items-center px-4 py-3 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                              hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-indigo-600 dark:hover:text-indigo-400
                              transition-all duration-200 cursor-pointer">
                        <i class="pi pi-tag mr-2"></i>
                        <span>Tarifs</span>
                    </a>
                </li>
            </ul>

            <div class="flex flex-col gap-2 border-t border-surface-200 dark:border-surface-700 pt-4 mt-4">
                <button pButton pRipple label="Se connecter"
                        [routerLink]="[currentLang, 'auth', 'login']"
                        [rounded]="true" [text]="true"
                        class="!font-medium !text-surface-700 dark:!text-surface-200 hover:!text-indigo-600 dark:hover:!text-indigo-400 w-full justify-center">
                </button>
                <button pButton pRipple label="S'inscrire"
                        [routerLink]="[currentLang, 'auth', 'register']"
                        [rounded]="true"
                        class="!bg-gradient-to-r !from-indigo-600 !to-cyan-500 !border-0 !font-semibold
                               hover:!shadow-lg hover:!shadow-indigo-500/25 transition-all duration-300 w-full justify-center">
                </button>
            </div>
        </div>
    `
})
export class TopbarWidget {
    currentLang = '/fr';

    constructor(public router: Router) {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        this.currentLang = '/' + (match ? match[1] : 'fr');
    }

    navigateTo(fragment: string) {
        this.router.navigate([this.currentLang + '/landing'], { fragment });
    }
}
