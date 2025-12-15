import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { FileUploadModule } from 'primeng/fileupload';
import { I18nService } from '../../../i18n/i18n.service';

@Component({
    selector: 'app-settings-account',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, ButtonModule, InputTextModule, AvatarModule, TagModule, DividerModule, FileUploadModule],
    template: `
        <div class="card">
            <!-- Mon Profil Section -->
            <div class="mb-8">
                <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-0 mb-6">{{ t('settings.account.myProfile') }}</h2>
                
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
                        <p class="text-sm text-surface-500 dark:text-surface-400 mb-2">{{ t('settings.account.profilePicture') }}</p>
                        <p-button [label]="t('settings.account.changePhoto')" icon="pi pi-upload" [outlined]="true" size="small" />
                    </div>
                </div>

                <!-- Name Fields -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label class="block text-sm text-surface-500 dark:text-surface-400 mb-2">{{ t('settings.account.firstName') }}</label>
                        <input 
                            pInputText 
                            [(ngModel)]="user.firstName" 
                            class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary"
                        />
                    </div>
                    <div>
                        <label class="block text-sm text-surface-500 dark:text-surface-400 mb-2">{{ t('settings.account.lastName') }}</label>
                        <input 
                            pInputText 
                            [(ngModel)]="user.lastName" 
                            class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary"
                        />
                    </div>
                </div>

                <!-- Email Section -->
                <div class="mb-6">
                    <label class="block text-sm text-surface-500 dark:text-surface-400 mb-2">{{ t('settings.account.myEmail') }}</label>
                    <div class="flex items-center gap-4">
                        <span class="text-lg text-surface-900 dark:text-surface-0">{{ user.email }}</span>
                    </div>
                    <div class="mt-3">
                        <p-tag 
                            [value]="t('settings.account.verified')" 
                            icon="pi pi-check" 
                            severity="success"
                            [style]="{ 'background': 'rgba(16, 185, 129, 0.1)', 'color': '#10b981' }"
                        />
                    </div>
                    <div class="mt-4">
                        <p-button [label]="t('settings.account.manageEmail')" [outlined]="true" size="small" />
                    </div>
                </div>
            </div>

            <p-divider />

            <!-- Logout Section -->
            <div class="my-8">
                <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-0 mb-4">{{ t('settings.account.session') }}</h2>
                <div class="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-800 rounded-xl">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                            <i class="pi pi-sign-out text-white text-xl"></i>
                        </div>
                        <div>
                            <p class="font-medium text-surface-900 dark:text-surface-0">{{ t('settings.account.logout') }}</p>
                            <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.account.logoutDesc') }}</p>
                        </div>
                    </div>
                    <p-button 
                        [label]="t('settings.account.logoutButton')" 
                        severity="warn"
                        [outlined]="true"
                        icon="pi pi-sign-out"
                        (click)="logout()"
                    />
                </div>
            </div>

            <p-divider />

            <!-- Danger Zone -->
            <div class="mt-8">
                <h2 class="text-2xl font-semibold text-red-500 mb-4">{{ t('settings.account.deleteAccount') }}</h2>
                <p class="text-surface-500 dark:text-surface-400 mb-4">
                    {{ t('settings.account.deleteAccountDesc') }}
                </p>
                <p-button 
                    [label]="t('settings.account.deleteMyAccount')" 
                    severity="danger" 
                    [outlined]="true"
                    icon="pi pi-trash"
                />
            </div>
        </div>
    `
})
export class AccountSettings implements OnInit {
    user = {
        firstName: 'Mbaye',
        lastName: 'Sene',
        email: 'mbayemc2@gmail.com'
    };

    lang = 'fr';

    constructor(
        private router: Router,
        private i18n: I18nService
    ) {}

    ngOnInit() {
        this.lang = this.getCurrentLang();
    }

    private getCurrentLang(): string {
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        return match ? match[1] : 'fr';
    }

    get userInitials(): string {
        return `${this.user.firstName.charAt(0)}${this.user.lastName.charAt(0)}`.toUpperCase();
    }

    logout() {
        this.router.navigate(['/', this.lang, 'auth', 'login']);
    }

    t(key: string): string {
        return this.i18n.t(key);
    }
}

