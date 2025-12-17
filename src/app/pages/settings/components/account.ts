import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { I18nService } from '../../../i18n/i18n.service';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { TokenService, User } from '../../../core/services/token.service';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-settings-account',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, ButtonModule, InputTextModule, AvatarModule, TagModule, DividerModule, FileUploadModule, ToastModule, ConfirmDialogModule],
    providers: [MessageService, ConfirmationService],
    template: `
        <p-toast position="top-center"></p-toast>
        <p-confirmDialog></p-confirmDialog>
        <div class="card">
            <!-- Mon Profil Section -->
            <div class="mb-8">
                <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-0 mb-6">{{ t('settings.account.myProfile') }}</h2>
                
                <!-- Avatar Section -->
                <div class="flex items-center gap-6 mb-8">
                    <div class="relative group">
                        @if (user()?.avatar_url) {
                            <img [src]="getAvatarUrl()" 
                                 alt="Profile" 
                                 class="w-20 h-20 rounded-full object-cover border-2 border-surface-200 dark:border-surface-700">
                        } @else {
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
                        }
                        <button 
                            class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            (click)="fileInput.click()"
                        >
                            <i class="pi pi-camera text-white text-xl"></i>
                        </button>
                        <input 
                            type="file" 
                            #fileInput 
                            hidden 
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            (change)="onFileSelected($event)"
                        />
                    </div>
                    <div>
                        <p class="text-sm text-surface-500 dark:text-surface-400 mb-2">{{ t('settings.account.profilePicture') }}</p>
                        <div class="flex gap-2">
                            <p-button 
                                [label]="t('settings.account.changePhoto')" 
                                icon="pi pi-upload" 
                                [outlined]="true" 
                                size="small"
                                [loading]="isUploadingAvatar()"
                                (click)="fileInput.click()"
                            />
                            @if (user()?.avatar_url) {
                                <p-button 
                                    icon="pi pi-trash" 
                                    [outlined]="true" 
                                    size="small"
                                    severity="danger"
                                    (click)="deleteAvatar()"
                                />
                            }
                        </div>
                    </div>
                </div>

                <!-- Name Fields -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label class="block text-sm text-surface-500 dark:text-surface-400 mb-2">{{ t('settings.account.firstName') }}</label>
                        <input 
                            pInputText 
                            [(ngModel)]="firstName" 
                            class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary"
                        />
                    </div>
                    <div>
                        <label class="block text-sm text-surface-500 dark:text-surface-400 mb-2">{{ t('settings.account.lastName') }}</label>
                        <input 
                            pInputText 
                            [(ngModel)]="lastName" 
                            class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary"
                        />
                    </div>
                </div>

                <!-- Save Profile Button -->
                @if (hasProfileChanges) {
                    <div class="mb-6">
                        <p-button 
                            label="Save Changes" 
                            icon="pi pi-check" 
                            [loading]="isSaving()"
                            (click)="saveProfile()"
                        />
                    </div>
                }

                <!-- Email Section -->
                <div class="mb-6">
                    <label class="block text-sm text-surface-500 dark:text-surface-400 mb-2">{{ t('settings.account.myEmail') }}</label>
                    <div class="flex items-center gap-4">
                        <span class="text-lg text-surface-900 dark:text-surface-0">{{ user()?.email }}</span>
                    </div>
                    <div class="mt-3 flex items-center gap-2">
                        @if (user()?.is_verified) {
                            <p-tag 
                                [value]="t('settings.account.verified')" 
                                icon="pi pi-check" 
                                severity="success"
                                [style]="{ 'background': 'rgba(16, 185, 129, 0.1)', 'color': '#10b981' }"
                            />
                        } @else {
                            <p-tag 
                                value="Not verified" 
                                icon="pi pi-exclamation-circle" 
                                severity="warn"
                            />
                        }
                        @if (user()?.auth_provider && user()?.auth_provider !== 'email') {
                            <p-tag 
                                [value]="'via ' + user()?.auth_provider" 
                                icon="pi pi-google"
                                [style]="{ 'background': 'rgba(99, 102, 241, 0.1)', 'color': '#6366f1' }"
                            />
                        }
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
                    (click)="confirmDeleteAccount()"
                />
            </div>
        </div>
    `
})
export class AccountSettings implements OnInit {
    private router = inject(Router);
    private i18n = inject(I18nService);
    private authService = inject(AuthService);
    private apiService = inject(ApiService);
    private tokenService = inject(TokenService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    user = this.tokenService.user;
    isSaving = signal(false);
    isUploadingAvatar = signal(false);

    firstName = '';
    lastName = '';
    lang = 'fr';

    ngOnInit() {
        this.lang = this.getCurrentLang();
        // Load user data
        const currentUser = this.user();
        if (currentUser) {
            this.firstName = currentUser.first_name || '';
            this.lastName = currentUser.last_name || '';
        }
    }

    private getCurrentLang(): string {
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        return match ? match[1] : 'fr';
    }

    get userInitials(): string {
        const first = this.firstName || this.user()?.first_name || '';
        const last = this.lastName || this.user()?.last_name || '';
        if (!first && !last) {
            return this.user()?.email?.charAt(0).toUpperCase() || 'U';
        }
        return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    }

    get hasProfileChanges(): boolean {
        const currentUser = this.user();
        if (!currentUser) return false;
        return this.firstName !== (currentUser.first_name || '') || 
               this.lastName !== (currentUser.last_name || '');
    }

    getAvatarUrl(): string {
        const avatarUrl = this.user()?.avatar_url;
        if (!avatarUrl) return '';
        // If it's a relative URL starting with /uploads, prepend the API base URL
        if (avatarUrl.startsWith('/uploads/')) {
            const baseUrl = environment.apiUrl.replace('/api/v1', '');
            return `${baseUrl}${avatarUrl}`;
        }
        return avatarUrl;
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files || !input.files[0]) return;
        
        const file = input.files[0];
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'File size must be less than 5MB',
                life: 5000
            });
            return;
        }
        
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP',
                life: 5000
            });
            return;
        }
        
        this.uploadAvatar(file);
        // Reset input
        input.value = '';
    }

    uploadAvatar(file: File): void {
        this.isUploadingAvatar.set(true);
        this.apiService.uploadAvatar(file).subscribe({
            next: () => {
                // Refresh user data
                this.authService.getCurrentUser().subscribe({
                    next: () => {
                        this.isUploadingAvatar.set(false);
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Success',
                            detail: 'Profile picture updated',
                            life: 3000
                        });
                    }
                });
            },
            error: (error) => {
                this.isUploadingAvatar.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: error.message || 'Could not upload image',
                    life: 5000
                });
            }
        });
    }

    deleteAvatar(): void {
        this.confirmationService.confirm({
            message: 'Are you sure you want to remove your profile picture?',
            header: 'Remove Picture',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.apiService.deleteAvatar().subscribe({
                    next: () => {
                        this.authService.getCurrentUser().subscribe({
                            next: () => {
                                this.messageService.add({
                                    severity: 'success',
                                    summary: 'Success',
                                    detail: 'Profile picture removed',
                                    life: 3000
                                });
                            }
                        });
                    },
                    error: (error) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: error.message || 'Could not remove picture',
                            life: 5000
                        });
                    }
                });
            }
        });
    }

    saveProfile(): void {
        this.isSaving.set(true);
        this.apiService.updateProfile({
            first_name: this.firstName || undefined,
            last_name: this.lastName || undefined
        }).subscribe({
            next: () => {
                // Refresh user data
                this.authService.getCurrentUser().subscribe({
                    next: () => {
                        this.isSaving.set(false);
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Success',
                            detail: 'Profile updated successfully',
                            life: 3000
                        });
                    }
                });
            },
            error: (error) => {
                this.isSaving.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: error.message || 'Could not update profile',
                    life: 5000
                });
            }
        });
    }

    logout(): void {
        this.authService.logout();
    }

    confirmDeleteAccount(): void {
        this.confirmationService.confirm({
            message: 'Are you sure you want to delete your account? This action cannot be undone.',
            header: 'Delete Account',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.deleteAccount();
            }
        });
    }

    deleteAccount(): void {
        this.apiService.deleteAccount().subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'info',
                    summary: 'Account Deleted',
                    detail: 'Your account has been deleted.',
                    life: 3000
                });
                setTimeout(() => {
                    this.authService.logout();
                }, 1000);
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: error.message || 'Could not delete account',
                    life: 5000
                });
            }
        });
    }

    t(key: string): string {
        return this.i18n.t(key);
    }
}
