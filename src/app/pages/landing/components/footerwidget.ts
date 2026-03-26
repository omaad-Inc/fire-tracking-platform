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
                                <img src="assets/afrin-nexus-logo.svg" alt="Afrin Nexus Logo" 
                                     class="w-12 h-12 transition-transform duration-300 group-hover:scale-110">
                                <span class="font-bold text-2xl tracking-tight whitespace-nowrap">Afrin Nexus</span>
                            </a>
                            <p class="text-slate-400 leading-relaxed mb-6">
                                Votre application de gestion patrimoniale dédiée à l'indépendance financière. Suivez, optimisez et atteignez vos objectifs FIRE.
                            </p>
                            
                            <!-- Social Links -->
                            <div class="flex gap-3">
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
                                    <a (click)="navigateTo('pricing')" class="text-slate-400 hover:text-white transition-colors cursor-pointer">
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
                            <h4 class="font-semibold text-lg mb-6 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Suivez-nous</h4>
                            <ul class="space-y-3">
                                <li>
                                    <a href="#" class="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-2">
                                        <i class="pi pi-twitter text-sm"></i>
                                        Twitter / X
                                    </a>
                                </li>
                                <li>
                                    <a href="#" class="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-2">
                                        <i class="pi pi-linkedin text-sm"></i>
                                        LinkedIn
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
                                        Politique de confidentialité
                                    </a>
                                </li>
                                <li>
                                    <a href="#" class="text-slate-400 hover:text-white transition-colors cursor-pointer">
                                        Conditions d'utilisation
                                    </a>
                                </li>
                                <li>
                                    <a href="#" class="text-slate-400 hover:text-white transition-colors cursor-pointer">
                                        Mentions légales
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
                            © {{ currentYear }} Afrin Nexus. Tous droits réservés.
                            <span class="text-slate-600">Fait avec</span>
                            <i class="pi pi-heart-fill text-red-500 mx-1"></i>
                            <span class="text-slate-600">pour votre liberté financière.</span>
                        </div>

                        <div class="flex items-center gap-4">
                            <div class="flex items-center gap-2 text-slate-500 text-sm">
                                <span class="relative flex h-2 w-2">
                                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span>Disponible</span>
                            </div>
                            <span class="text-slate-700">•</span>
                            <div class="flex items-center gap-2 text-slate-500 text-sm">
                                <i class="pi pi-shield text-indigo-400"></i>
                                <span>Données sécurisées</span>
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
