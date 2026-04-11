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
import { DialogModule } from 'primeng/dialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { I18nService } from '../../../i18n/i18n.service';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { TokenService, User } from '../../../core/services/token.service';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-settings-account',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, ButtonModule, InputTextModule, AvatarModule, TagModule, DividerModule, FileUploadModule, ToastModule, ConfirmDialogModule, DialogModule],
    providers: [MessageService, ConfirmationService],
    template: `
        <p-toast position="top-center"></p-toast>
        <p-confirmDialog></p-confirmDialog>

        <!-- Delete Account Confirmation Dialog -->
        <p-dialog
            [(visible)]="showDeleteDialog"
            [modal]="true"
            [closable]="!isDeleting()"
            [draggable]="false"
            [resizable]="false"
            styleClass="w-full max-w-lg"
        >
            <ng-template pTemplate="header">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <i class="pi pi-exclamation-triangle text-red-500 text-lg"></i>
                    </div>
                    <span class="text-lg font-semibold text-surface-900 dark:text-surface-0">{{ t('settings.account.deleteConfirmTitle') }}</span>
                </div>
            </ng-template>

            <div class="py-2">
                <p class="text-surface-600 dark:text-surface-400 mb-4">
                    {{ t('settings.account.deleteConfirmWarning') }}
                </p>
                <ul class="mb-6 space-y-2">
                    @for (item of deleteConfirmItems; track item) {
                        <li class="flex items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
                            <i class="pi pi-times-circle text-red-400 text-xs"></i>
                            {{ item }}
                        </li>
                    }
                </ul>
                <div>
                    <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        {{ t('settings.account.deleteConfirmType') }}
                        <span class="font-mono font-bold text-red-500 ml-1">{{ t('settings.account.deleteConfirmKeyword') }}</span>
                    </label>
                    <input
                        pInputText
                        [(ngModel)]="deleteConfirmText"
                        [placeholder]="t('settings.account.deleteConfirmPlaceholder')"
                        [disabled]="isDeleting()"
                        class="w-full"
                    />
                </div>
            </div>

            <ng-template pTemplate="footer">
                <div class="flex justify-end gap-3">
                    <p-button
                        label="Annuler"
                        [outlined]="true"
                        [disabled]="isDeleting()"
                        (click)="closeDeleteDialog()"
                    />
                    <p-button
                        [label]="t('settings.account.deleteConfirmButton')"
                        severity="danger"
                        icon="pi pi-trash"
                        [loading]="isDeleting()"
                        [disabled]="!isDeleteConfirmed"
                        (click)="deleteAccount()"
                    />
                </div>
            </ng-template>
        </p-dialog>
        <div class="card">
            <!-- Mon Profil Section -->
            <div class="mb-8">
                <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-0 mb-6">{{ t('settings.account.myProfile') }}</h2>
                
                <!-- Avatar Section -->
                <div class="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-8 text-center sm:text-left">
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
                            [label]="t('common.save')"
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
    isDeleting = signal(false);

    showDeleteDialog = false;
    deleteConfirmText = '';

    firstName = '';
    lastName = '';
    lang = 'fr';

    get deleteConfirmItems(): string[] {
        return [
            this.t('settings.account.deleteConfirmItems').split(' · ')[0],
            this.t('settings.account.deleteConfirmItems').split(' · ')[1],
            this.t('settings.account.deleteConfirmItems').split(' · ')[2],
            this.t('settings.account.deleteConfirmItems').split(' · ')[3],
            this.t('settings.account.deleteConfirmItems').split(' · ')[4],
        ];
    }

    get isDeleteConfirmed(): boolean {
        return this.deleteConfirmText === this.t('settings.account.deleteConfirmKeyword');
    }

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
                summary: 'Erreur',
                detail: 'La photo doit faire moins de 5 Mo.',
                life: 5000
            });
            return;
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            this.messageService.add({
                severity: 'error',
                summary: 'Erreur',
                detail: 'Format non supporté. Utilisez JPEG, PNG, GIF ou WebP.',
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
                this.authService.getCurrentUser().subscribe({
                    next: () => {
                        this.isUploadingAvatar.set(false);
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Photo mise à jour',
                            detail: 'Votre photo de profil a été modifiée.',
                            life: 3000
                        });
                    }
                });
            },
            error: (error) => {
                this.isUploadingAvatar.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: error?.error?.detail || 'Impossible de télécharger la photo.',
                    life: 5000
                });
            }
        });
    }

    deleteAvatar(): void {
        this.confirmationService.confirm({
            message: 'Supprimer votre photo de profil ?',
            header: 'Confirmer la suppression',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: '!bg-rose-500 !border-rose-500',
            accept: () => {
                this.apiService.deleteAvatar().subscribe({
                    next: () => {
                        this.authService.getCurrentUser().subscribe({
                            next: () => {
                                this.messageService.add({
                                    severity: 'success',
                                    summary: 'Photo supprimée',
                                    detail: 'Votre photo de profil a été retirée.',
                                    life: 3000
                                });
                            }
                        });
                    },
                    error: (error) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Erreur',
                            detail: error?.error?.detail || 'Impossible de supprimer la photo.',
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
            last_name:  this.lastName  || undefined
        }).subscribe({
            next: () => {
                this.authService.getCurrentUser().subscribe({
                    next: () => {
                        this.isSaving.set(false);
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Profil mis à jour',
                            detail: 'Vos informations ont été enregistrées.',
                            life: 3000
                        });
                    }
                });
            },
            error: (error) => {
                this.isSaving.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: error?.error?.detail || 'Impossible de mettre à jour le profil.',
                    life: 5000
                });
            }
        });
    }

    logout(): void {
        this.authService.logout();
    }

    confirmDeleteAccount(): void {
        this.deleteConfirmText = '';
        this.showDeleteDialog = true;
    }

    closeDeleteDialog(): void {
        this.showDeleteDialog = false;
        this.deleteConfirmText = '';
    }

    deleteAccount(): void {
        if (!this.isDeleteConfirmed) return;

        this.isDeleting.set(true);
        this.apiService.deleteAccount().subscribe({
            next: () => {
                this.showDeleteDialog = false;
                this.messageService.add({
                    severity: 'success',
                    summary: this.t('settings.account.deleteAccount'),
                    detail: this.t('settings.account.deleteSuccessDetail'),
                    life: 3000
                });
                setTimeout(() => this.authService.logout(), 1500);
            },
            error: (error) => {
                this.isDeleting.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: error?.error?.detail || 'Impossible de supprimer le compte.',
                    life: 5000
                });
            }
        });
    }

    t(key: string): string {
        return this.i18n.t(key);
    }
}
