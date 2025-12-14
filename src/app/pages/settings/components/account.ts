import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { FileUploadModule } from 'primeng/fileupload';

@Component({
    selector: 'app-settings-account',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, AvatarModule, TagModule, DividerModule, FileUploadModule],
    template: `
        <div class="card">
            <!-- Mon Profil Section -->
            <div class="mb-8">
                <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-0 mb-6">Mon profil</h2>
                
                <!-- Avatar Section -->
                <div class="flex items-center gap-6 mb-8">
                    <div class="relative group">
                        <p-avatar 
                            [label]="userInitials" 
                            shape="circle" 
                            size="xlarge"
                            [style]="{ 
                                'background': 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)', 
                                'color': 'white', 
                                'font-weight': '600',
                                'width': '80px',
                                'height': '80px',
                                'font-size': '1.5rem'
                            }"
                        />
                        <button 
                            class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                            <i class="pi pi-camera text-white text-xl"></i>
                        </button>
                    </div>
                    <div>
                        <p class="text-sm text-surface-500 dark:text-surface-400 mb-2">Photo de profil</p>
                        <p-button label="Changer la photo" icon="pi pi-upload" [outlined]="true" size="small" />
                    </div>
                </div>

                <!-- Name Fields -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label class="block text-sm text-surface-500 dark:text-surface-400 mb-2">Prénom</label>
                        <input 
                            pInputText 
                            [(ngModel)]="user.firstName" 
                            class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary"
                        />
                    </div>
                    <div>
                        <label class="block text-sm text-surface-500 dark:text-surface-400 mb-2">Nom</label>
                        <input 
                            pInputText 
                            [(ngModel)]="user.lastName" 
                            class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary"
                        />
                    </div>
                </div>

                <!-- Email Section -->
                <div class="mb-6">
                    <label class="block text-sm text-surface-500 dark:text-surface-400 mb-2">Mon email</label>
                    <div class="flex items-center gap-4">
                        <span class="text-lg text-surface-900 dark:text-surface-0">{{ user.email }}</span>
                    </div>
                    <div class="mt-3">
                        <p-tag 
                            value="VÉRIFIÉ" 
                            icon="pi pi-check" 
                            severity="success"
                            [style]="{ 'background': 'rgba(16, 185, 129, 0.1)', 'color': '#10b981' }"
                        />
                    </div>
                    <div class="mt-4">
                        <p-button label="Gérer mon email" [outlined]="true" size="small" />
                    </div>
                </div>
            </div>

            <p-divider />

            <!-- Danger Zone -->
            <div class="mt-8">
                <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-0 mb-4">Supprimer compte</h2>
                <p class="text-surface-500 dark:text-surface-400 mb-4">
                    La suppression de votre compte entraîne la suppression définitive de toutes vos données et est irréversible.
                </p>
                <p-button 
                    label="Supprimer mon compte" 
                    severity="danger" 
                    [outlined]="true"
                    icon="pi pi-trash"
                />
            </div>
        </div>
    `
})
export class AccountSettings {
    user = {
        firstName: 'Mbaye',
        lastName: 'Sene',
        email: 'mbayemc2@gmail.com'
    };

    get userInitials(): string {
        return `${this.user.firstName.charAt(0)}${this.user.lastName.charAt(0)}`.toUpperCase();
    }
}

