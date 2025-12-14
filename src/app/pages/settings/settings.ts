import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
        <div class="min-h-screen">
            <!-- Header -->
            <div class="mb-6">
                <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0">Gérer mon compte</h1>
            </div>

            <div class="flex flex-col lg:flex-row gap-6">
                <!-- Sidebar Navigation -->
                <div class="w-full lg:w-72 shrink-0">
                    <div class="card !p-0 overflow-hidden">
                        <!-- Section: Gérer mon compte -->
                        <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                            <span class="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Gérer mon compte</span>
                        </div>
                        <nav class="py-2">
                            <a 
                                routerLink="account" 
                                routerLinkActive="bg-primary/10 border-l-4 border-primary text-primary"
                                class="flex items-center gap-3 px-4 py-3 text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                            >
                                <i class="pi pi-user"></i>
                                <span>Mon compte</span>
                            </a>
                            <a 
                                routerLink="security" 
                                routerLinkActive="bg-primary/10 border-l-4 border-primary text-primary"
                                class="flex items-center gap-3 px-4 py-3 text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                            >
                                <i class="pi pi-shield"></i>
                                <span>Sécurité</span>
                            </a>
                        </nav>

                        <!-- Section: Préférences -->
                        <div class="p-4 border-t border-b border-surface-200 dark:border-surface-700">
                            <span class="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Préférences</span>
                        </div>
                        <nav class="py-2">
                            <a 
                                routerLink="preferences" 
                                routerLinkActive="bg-primary/10 border-l-4 border-primary text-primary"
                                class="flex items-center gap-3 px-4 py-3 text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                            >
                                <i class="pi pi-cog"></i>
                                <span>Préférences</span>
                            </a>
                        </nav>

                        <!-- Section: Aide -->
                        <div class="p-4 border-t border-b border-surface-200 dark:border-surface-700">
                            <span class="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Aide</span>
                        </div>
                        <nav class="py-2">
                            <a 
                                href="https://help.finova.com" 
                                target="_blank"
                                class="flex items-center gap-3 px-4 py-3 text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                            >
                                <i class="pi pi-question-circle"></i>
                                <span>Obtenir de l'aide</span>
                                <i class="pi pi-external-link text-xs text-surface-400 ml-auto"></i>
                            </a>
                        </nav>
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
export class Settings {}

