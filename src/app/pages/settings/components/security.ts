import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';

@Component({
    selector: 'app-settings-security',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, PasswordModule, ToggleSwitchModule, DividerModule, TagModule],
    template: `
        <div class="card">
            <!-- Password Section -->
            <div class="mb-8">
                <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-0 mb-6">Mot de passe</h2>
                
                <div class="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-800 rounded-xl mb-4">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
                            <i class="pi pi-lock text-white text-xl"></i>
                        </div>
                        <div>
                            <p class="font-medium text-surface-900 dark:text-surface-0">Mot de passe</p>
                            <p class="text-sm text-surface-500 dark:text-surface-400">Dernière modification il y a 3 mois</p>
                        </div>
                    </div>
                    <p-button label="Modifier" [outlined]="true" size="small" />
                </div>
            </div>

            <p-divider />

            <!-- Two-Factor Authentication -->
            <div class="mb-8">
                <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-0 mb-6">Authentification à deux facteurs</h2>
                
                <div class="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-800 rounded-xl mb-4">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                            <i class="pi pi-shield text-white text-xl"></i>
                        </div>
                        <div>
                            <p class="font-medium text-surface-900 dark:text-surface-0">Authentification 2FA</p>
                            <p class="text-sm text-surface-500 dark:text-surface-400">Ajoutez une couche de sécurité supplémentaire</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <p-tag 
                            [value]="twoFactorEnabled ? 'Activé' : 'Désactivé'" 
                            [severity]="twoFactorEnabled ? 'success' : 'warn'"
                        />
                        <p-toggleswitch [(ngModel)]="twoFactorEnabled" />
                    </div>
                </div>

                <div *ngIf="twoFactorEnabled" class="ml-16 mt-4 space-y-3">
                    <div class="flex items-center gap-3 p-3 bg-surface-100 dark:bg-surface-700 rounded-lg">
                        <i class="pi pi-mobile text-indigo-500"></i>
                        <span class="text-surface-700 dark:text-surface-200">Application d'authentification</span>
                        <p-tag value="Configuré" severity="success" class="ml-auto" />
                    </div>
                    <div class="flex items-center gap-3 p-3 bg-surface-100 dark:bg-surface-700 rounded-lg">
                        <i class="pi pi-envelope text-cyan-500"></i>
                        <span class="text-surface-700 dark:text-surface-200">Email de récupération</span>
                        <p-tag value="Configuré" severity="success" class="ml-auto" />
                    </div>
                </div>
            </div>

            <p-divider />

            <!-- Connected Sessions -->
            <div class="mb-8">
                <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-0 mb-6">Sessions actives</h2>
                
                <div class="space-y-4">
                    <div class="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-800 rounded-xl">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                                <i class="pi pi-desktop text-white text-xl"></i>
                            </div>
                            <div>
                                <p class="font-medium text-surface-900 dark:text-surface-0">MacBook Pro - Chrome</p>
                                <p class="text-sm text-surface-500 dark:text-surface-400">Paris, France · Actif maintenant</p>
                            </div>
                        </div>
                        <p-tag value="Session actuelle" severity="info" />
                    </div>

                    <div class="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-800 rounded-xl">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-surface-300 dark:bg-surface-600 flex items-center justify-center">
                                <i class="pi pi-mobile text-surface-600 dark:text-surface-300 text-xl"></i>
                            </div>
                            <div>
                                <p class="font-medium text-surface-900 dark:text-surface-0">iPhone 15 Pro - Safari</p>
                                <p class="text-sm text-surface-500 dark:text-surface-400">Paris, France · Actif il y a 2 heures</p>
                            </div>
                        </div>
                        <p-button icon="pi pi-times" severity="danger" [text]="true" [rounded]="true" />
                    </div>
                </div>

                <div class="mt-4">
                    <p-button 
                        label="Déconnecter toutes les autres sessions" 
                        severity="secondary" 
                        [outlined]="true"
                        icon="pi pi-sign-out"
                    />
                </div>
            </div>

            <p-divider />

            <!-- Security Log -->
            <div>
                <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-0 mb-6">Historique de sécurité</h2>
                
                <div class="space-y-3">
                    <div class="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                        <i class="pi pi-sign-in text-emerald-500"></i>
                        <div class="flex-1">
                            <p class="text-surface-900 dark:text-surface-0">Connexion réussie</p>
                            <p class="text-sm text-surface-500 dark:text-surface-400">Chrome sur MacBook Pro</p>
                        </div>
                        <span class="text-sm text-surface-400">Il y a 5 min</span>
                    </div>
                    <div class="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                        <i class="pi pi-key text-amber-500"></i>
                        <div class="flex-1">
                            <p class="text-surface-900 dark:text-surface-0">Mot de passe modifié</p>
                            <p class="text-sm text-surface-500 dark:text-surface-400">Changement de mot de passe</p>
                        </div>
                        <span class="text-sm text-surface-400">Il y a 3 mois</span>
                    </div>
                    <div class="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                        <i class="pi pi-shield text-indigo-500"></i>
                        <div class="flex-1">
                            <p class="text-surface-900 dark:text-surface-0">2FA activé</p>
                            <p class="text-sm text-surface-500 dark:text-surface-400">Authentification à deux facteurs</p>
                        </div>
                        <span class="text-sm text-surface-400">Il y a 6 mois</span>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class SecuritySettings {
    twoFactorEnabled = true;
}

