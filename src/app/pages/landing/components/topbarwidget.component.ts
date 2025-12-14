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
        <a class="flex items-center gap-2 cursor-pointer group" [routerLink]="[currentLang, 'landing']" fragment="home">
            <svg viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg" 
                 class="w-10 h-10 md:w-12 md:h-12 transition-transform duration-300 group-hover:scale-110">
                <g transform="translate(0,300) scale(0.1,-0.1)" class="fill-indigo-600 dark:fill-indigo-400" stroke="none">
                    <path d="M1655 2196 c-369 -369 -532 -540 -505 -526 14 7 178 165 365 351 188
                187 344 339 348 339 4 0 7 -52 7 -115 l0 -114 -219 -221 c-121 -121 -223 -229
                -226 -240 -6 -19 -16 -20 -161 -20 l-154 0 0 -230 0 -230 178 0 177 0 218 218
                217 217 0 150 0 150 -301 -300 c-201 -200 -299 -292 -295 -275 3 14 6 53 6 88
                l0 63 57 -2 56 -3 -2 74 -2 73 241 242 241 241 -3 156 -3 156 -240 -242z m205
                -468 l0 -92 -203 -203 -202 -203 -152 0 -152 0 -6 43 c-7 53 0 321 9 336 5 7
                47 11 112 11 103 0 105 0 116 -26 16 -35 0 -57 -46 -65 -20 -3 -43 -15 -51
                -25 -18 -23 -20 -123 -3 -159 25 -56 46 -41 313 225 137 137 253 250 258 250
                4 0 7 -41 7 -92z"/>
                    <path d="M520 827 l0 -182 40 0 40 0 0 72 0 73 80 0 80 0 0 36 0 36 -80 -4
                -80 -3 0 43 0 42 90 0 90 0 0 35 0 35 -130 0 -130 0 0 -183z"/>
                    <path d="M842 829 l3 -181 38 -3 37 -2 0 184 0 183 -40 0 -40 0 2 -181z"/>
                    <path d="M1010 827 l0 -184 38 2 37 3 -4 128 -3 129 77 -120 c42 -66 80 -124
                85 -129 5 -5 25 -10 44 -11 l36 -2 0 184 0 183 -36 0 -35 0 3 -125 c2 -69 2
                -125 1 -125 -1 0 -38 56 -83 125 -82 125 -82 125 -121 125 l-39 0 0 -183z"/>
                    <path d="M1485 991 c-155 -96 -108 -334 70 -349 29 -2 69 1 88 7 46 16 104 80
                113 126 17 91 -22 187 -89 218 -48 23 -143 22 -182 -2z"/>
                    <path d="M1780 1003 c0 -5 29 -86 64 -182 l63 -174 44 0 43 0 58 159 c31 87
                62 169 67 182 10 21 8 22 -32 22 l-43 0 -46 -137 c-25 -76 -48 -131 -51 -123
                -3 8 -25 70 -48 138 l-42 122 -38 0 c-22 0 -39 -3 -39 -7z"/>
                    <path d="M2166 838 c-37 -95 -70 -178 -72 -185 -4 -8 7 -11 37 -8 38 3 44 6
                57 39 l14 36 72 0 73 0 11 -38 c11 -35 14 -37 52 -37 22 0 40 1 40 4 0 2 -29
                79 -65 172 -36 92 -65 172 -65 178 0 6 -19 11 -44 11 l-43 0 -67 -172z"/>
                </g>
            </svg>
            <span class="font-bold text-xl md:text-2xl text-surface-900 dark:text-surface-0 tracking-tight">Finova</span>
        </a>

        <!-- Mobile Menu Toggle -->
        <a pButton [text]="true" severity="secondary" [rounded]="true" pRipple 
           class="lg:!hidden !p-2" 
           pStyleClass="@next" enterFromClass="hidden" leaveToClass="hidden" [hideOnOutsideClick]="true">
            <i class="pi pi-bars !text-xl"></i>
        </a>

        <!-- Navigation -->
        <div class="items-center grow justify-between hidden lg:flex absolute lg:static w-full left-0 top-full px-6 lg:px-0 z-20 rounded-xl
                    bg-surface-0/95 dark:bg-surface-900/95 lg:bg-transparent lg:dark:bg-transparent
                    backdrop-blur-lg lg:backdrop-blur-none
                    shadow-lg lg:shadow-none
                    border border-surface-200/50 dark:border-surface-700/50 lg:border-0
                    mt-2 lg:mt-0 py-4 lg:py-0">
            
            <!-- Nav Links -->
            <ul class="list-none p-0 m-0 flex lg:items-center select-none flex-col lg:flex-row gap-1 lg:gap-2">
                <li>
                    <a (click)="navigateTo('home')" pRipple 
                       class="flex items-center px-4 py-3 lg:py-2 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                              hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-indigo-600 dark:hover:text-indigo-400
                              transition-all duration-200 cursor-pointer">
                        <i class="pi pi-home mr-2 lg:hidden"></i>
                        <span>Accueil</span>
                    </a>
                </li>
                <li>
                    <a (click)="navigateTo('features')" pRipple 
                       class="flex items-center px-4 py-3 lg:py-2 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                              hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-indigo-600 dark:hover:text-indigo-400
                              transition-all duration-200 cursor-pointer">
                        <i class="pi pi-th-large mr-2 lg:hidden"></i>
                        <span>Fonctionnalités</span>
                    </a>
                </li>
                <li>
                    <a (click)="navigateTo('highlights')" pRipple 
                       class="flex items-center px-4 py-3 lg:py-2 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                              hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-indigo-600 dark:hover:text-indigo-400
                              transition-all duration-200 cursor-pointer">
                        <i class="pi pi-bolt mr-2 lg:hidden"></i>
                        <span>Vision FIRE</span>
                    </a>
                </li>
                <li>
                    <a (click)="navigateTo('pricing')" pRipple 
                       class="flex items-center px-4 py-3 lg:py-2 rounded-lg text-surface-700 dark:text-surface-200 font-medium text-base
                              hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-indigo-600 dark:hover:text-indigo-400
                              transition-all duration-200 cursor-pointer">
                        <i class="pi pi-tag mr-2 lg:hidden"></i>
                        <span>Tarifs</span>
                    </a>
                </li>
            </ul>

            <!-- CTA Buttons -->
            <div class="flex flex-col lg:flex-row border-t lg:border-t-0 border-surface-200 dark:border-surface-700 
                        pt-4 lg:pt-0 mt-4 lg:mt-0 gap-2 lg:gap-3">
                <button pButton pRipple label="Login" 
                        [routerLink]="[currentLang, 'auth', 'login']" 
                        [rounded]="true" [text]="true" 
                        class="!font-medium !text-surface-700 dark:!text-surface-200 hover:!text-indigo-600 dark:hover:!text-indigo-400 w-full lg:w-auto justify-center">
                </button>
                <button pButton pRipple label="Sign up" 
                        [routerLink]="[currentLang, 'auth', 'register']" 
                        [rounded]="true" 
                        class="!bg-gradient-to-r !from-indigo-600 !to-cyan-500 !border-0 !font-semibold 
                               hover:!shadow-lg hover:!shadow-indigo-500/25 transition-all duration-300 w-full lg:w-auto justify-center">
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
