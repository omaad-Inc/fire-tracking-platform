import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'footer-widget',
    standalone: true,
    imports: [RouterModule, CommonModule],
    template: `
        <footer class="relative bg-slate-950 text-white overflow-hidden">
            <!-- Background pattern -->
            <div class="absolute inset-0 opacity-5">
                <div class="absolute inset-0" style="background-image: linear-gradient(rgba(99, 102, 241, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.5) 1px, transparent 1px); background-size: 40px 40px;"></div>
            </div>

            <!-- Main Footer Content -->
            <div class="relative py-16 px-6 lg:px-20">
                <div class="max-w-7xl mx-auto">
                    <div class="grid grid-cols-12 gap-8 lg:gap-12">
                        <!-- Brand Column -->
                        <div class="col-span-12 lg:col-span-4">
                            <a (click)="navigateTo('home')" class="flex items-center gap-3 cursor-pointer mb-6 group">
                                <!-- Logo SVG Finova -->
                                <svg viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg" 
                                     class="w-12 h-12 transition-transform duration-300 group-hover:scale-110">
                                    <g transform="translate(0,300) scale(0.1,-0.1)" class="fill-indigo-400" stroke="none">
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
                                <span class="font-bold text-2xl tracking-tight">Finova</span>
                            </a>
                            <p class="text-slate-400 leading-relaxed mb-6">
                                Votre compagnon vers l'indépendance financière. Suivez votre patrimoine, optimisez vos dépenses et atteignez vos objectifs FIRE.
                            </p>
                            
                            <!-- Social Links -->
                            <div class="flex gap-3">
                                <a href="#" class="w-10 h-10 rounded-xl bg-slate-800 hover:bg-indigo-600 flex items-center justify-center transition-all duration-300 hover:scale-110">
                                    <i class="pi pi-github text-lg"></i>
                                </a>
                                <a href="#" class="w-10 h-10 rounded-xl bg-slate-800 hover:bg-cyan-600 flex items-center justify-center transition-all duration-300 hover:scale-110">
                                    <i class="pi pi-twitter text-lg"></i>
                                </a>
                                <a href="#" class="w-10 h-10 rounded-xl bg-slate-800 hover:bg-blue-600 flex items-center justify-center transition-all duration-300 hover:scale-110">
                                    <i class="pi pi-linkedin text-lg"></i>
                                </a>
                                <a href="#" class="w-10 h-10 rounded-xl bg-slate-800 hover:bg-violet-600 flex items-center justify-center transition-all duration-300 hover:scale-110">
                                    <i class="pi pi-discord text-lg"></i>
                                </a>
                            </div>
                        </div>

                        <!-- Links Columns -->
                        <div class="col-span-6 md:col-span-3 lg:col-span-2">
                            <h4 class="font-semibold text-lg mb-6 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Produit</h4>
                            <ul class="space-y-3">
                                <li>
                                    <a (click)="navigateTo('features')" class="text-slate-400 hover:text-white transition-colors cursor-pointer">
                                        Fonctionnalités
                                    </a>
                                </li>
                                <li>
                                    <a [routerLink]="[currentLang]" class="text-slate-400 hover:text-white transition-colors cursor-pointer">
                                        Dashboard
                                    </a>
                                </li>
                                <li>
                                    <a [routerLink]="[currentLang, 'pages', 'patrimoine']" class="text-slate-400 hover:text-white transition-colors cursor-pointer">
                                        Patrimoine
                                    </a>
                                </li>
                                <li>
                                    <a [routerLink]="[currentLang, 'pages', 'savings']" class="text-slate-400 hover:text-white transition-colors cursor-pointer">
                                        Épargne
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div class="col-span-6 md:col-span-3 lg:col-span-2">
                            <h4 class="font-semibold text-lg mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Ressources</h4>
                            <ul class="space-y-3">
                                <li>
                                    <a href="#" class="text-slate-400 hover:text-white transition-colors cursor-pointer">
                                        Guide FIRE
                                    </a>
                                </li>
                                <li>
                                    <a href="#" class="text-slate-400 hover:text-white transition-colors cursor-pointer">
                                        Blog
                                    </a>
                                </li>
                                <li>
                                    <a href="#" class="text-slate-400 hover:text-white transition-colors cursor-pointer">
                                        FAQ
                                    </a>
                                </li>
                                <li>
                                    <a href="#" class="text-slate-400 hover:text-white transition-colors cursor-pointer">
                                        Calculateur FIRE
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div class="col-span-6 md:col-span-3 lg:col-span-2">
                            <h4 class="font-semibold text-lg mb-6 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Communauté</h4>
                            <ul class="space-y-3">
                                <li>
                                    <a href="#" class="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-2">
                                        <i class="pi pi-github text-sm"></i>
                                        GitHub
                                    </a>
                                </li>
                                <li>
                                    <a href="#" class="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-2">
                                        <i class="pi pi-discord text-sm"></i>
                                        Discord
                                    </a>
                                </li>
                                <li>
                                    <a href="#" class="text-slate-400 hover:text-white transition-colors cursor-pointer">
                                        Contribuer
                                    </a>
                                </li>
                                <li>
                                    <a href="#" class="text-slate-400 hover:text-white transition-colors cursor-pointer">
                                        Roadmap
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div class="col-span-6 md:col-span-3 lg:col-span-2">
                            <h4 class="font-semibold text-lg mb-6 text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400">Légal</h4>
                            <ul class="space-y-3">
                                <li>
                                    <a href="#" class="text-slate-400 hover:text-white transition-colors cursor-pointer">
                                        Confidentialité
                                    </a>
                                </li>
                                <li>
                                    <a href="#" class="text-slate-400 hover:text-white transition-colors cursor-pointer">
                                        Conditions
                                    </a>
                                </li>
                                <li>
                                    <a href="#" class="text-slate-400 hover:text-white transition-colors cursor-pointer">
                                        Licence MIT
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bottom Bar -->
            <div class="relative border-t border-slate-800">
                <div class="max-w-7xl mx-auto px-6 lg:px-20 py-6">
                    <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div class="text-slate-500 text-sm text-center md:text-left">
                            © {{ currentYear }} Finova. Open source sous licence MIT. 
                            <span class="text-slate-600">Fait avec</span> 
                            <i class="pi pi-heart-fill text-red-500 mx-1"></i> 
                            <span class="text-slate-600">pour la communauté FIRE.</span>
                        </div>
                        
                        <div class="flex items-center gap-4">
                            <div class="flex items-center gap-2 text-slate-500 text-sm">
                                <span class="relative flex h-2 w-2">
                                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span>100% Local</span>
                            </div>
                            <span class="text-slate-700">•</span>
                            <div class="flex items-center gap-2 text-slate-500 text-sm">
                                <i class="pi pi-shield text-indigo-400"></i>
                                <span>Données privées</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    `
})
export class FooterWidget {
    currentLang = '/fr';
    currentYear = new Date().getFullYear();

    constructor(public router: Router) {
        const match = this.router.url.match(/^\/(fr|en)(?:\/|$)/);
        this.currentLang = '/' + (match ? match[1] : 'fr');
    }

    navigateTo(fragment: string) {
        this.router.navigate([this.currentLang + '/landing'], { fragment });
    }
}
