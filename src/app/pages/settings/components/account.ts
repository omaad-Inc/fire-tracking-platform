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
import { DialogModule } from 'primeng/dialog';

import { I18nService } from '../../../i18n/i18n.service';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { TokenService, User } from '../../../core/services/token.service';
import { environment } from '../../../../environments/environment';
import { FeedbackService } from '../../../core/ui/feedback.service';

@Component({
    selector: 'app-settings-account',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, ButtonModule, InputTextModule, AvatarModule, TagModule, DividerModule, FileUploadModule, DialogModule],
    template: `
        <!-- Delete Account Confirmation Dialog -->
        <p-dialog
            [transitionOptions]="'320ms cubic-bezier(0.34, 1.30, 0.64, 1)'"
            [(visible)]="showDeleteDialog"
            [modal]="true"
            [closable]="!isDeleting()"
            [draggable]="false"
            [resizable]="false"
            styleClass="w-full max-w-lg"
        >
            <ng-template pTemplate="header">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-negative-50 dark:bg-negative-700/30 flex items-center justify-center">
                        <i class="pi pi-exclamation-triangle text-negative text-lg"></i>
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
                            <i class="pi pi-times-circle text-negative text-xs"></i>
                            {{ item }}
                        </li>
                    }
                </ul>
                <div>
                    <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        {{ t('settings.account.deleteConfirmType') }}
                        <span class="font-mono font-bold text-negative ml-1">{{ t('settings.account.deleteConfirmKeyword') }}</span>
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
        <div class="max-w-2xl mx-auto pb-10">
            <!-- Profile card -->
            <section class="rounded-2xl border border-surface-200/80 dark:border-surface-700/60 bg-surface-0 dark:bg-surface-900/50 shadow-sm p-6 md:p-7 mb-5">
                <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-6">{{ t('settings.account.myProfile') }}</h2>

                <!-- Avatar + actions -->
                <div class="flex items-center gap-5 mb-8">
                    <div class="relative group shrink-0">
                        @if (user()?.avatar_url) {
                            <img [src]="getAvatarUrl()" alt="Profile"
                                 class="w-20 h-20 rounded-full object-cover ring-2 ring-surface-200 dark:ring-surface-700">
                        } @else {
                            <div class="w-20 h-20 rounded-full bg-gradient-to-br from-brand-700 to-brand-800 ring-2 ring-surface-200 dark:ring-surface-700 flex items-center justify-center text-white font-semibold text-2xl">
                                {{ userInitials }}
                            </div>
                        }
                        <button type="button"
                                class="absolute inset-0 flex items-center justify-center bg-black/45 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                (click)="fileInput.click()" [attr.aria-label]="t('settings.account.changePhoto')">
                            <i class="pi pi-camera text-white text-xl" aria-hidden="true"></i>
                        </button>
                        <input type="file" #fileInput hidden accept="image/jpeg,image/png,image/gif,image/webp" (change)="onFileSelected($event)" />
                    </div>
                    <div class="min-w-0">
                        <p class="text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2.5">{{ t('settings.account.profilePicture') }}</p>
                        <div class="flex flex-wrap items-center gap-2.5">
                            <button type="button" (click)="fileInput.click()" [disabled]="isUploadingAvatar()"
                                    class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-brand-700 dark:text-ochre-400 bg-brand-700/[0.06] dark:bg-ochre-400/10 hover:bg-brand-700/10 dark:hover:bg-ochre-400/[0.18] transition-colors disabled:opacity-50 cursor-pointer">
                                <i class="pi text-xs" [ngClass]="isUploadingAvatar() ? 'pi-spin pi-spinner' : 'pi-upload'"></i>{{ t('settings.account.changePhoto') }}
                            </button>
                            @if (user()?.avatar_url) {
                                <button type="button" (click)="deleteAvatar()" aria-label="Supprimer la photo"
                                        class="inline-flex items-center justify-center w-9 h-9 rounded-full text-negative border border-negative/25 hover:bg-negative/10 transition-colors cursor-pointer">
                                    <i class="pi pi-trash text-sm"></i>
                                </button>
                            }
                        </div>
                    </div>
                </div>

                <!-- Name fields -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                    <div>
                        <label for="acc-first-name" class="block text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2">{{ t('settings.account.firstName') }}</label>
                        <input pInputText id="acc-first-name" [(ngModel)]="firstName" class="w-full" />
                    </div>
                    <div>
                        <label for="acc-last-name" class="block text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2">{{ t('settings.account.lastName') }}</label>
                        <input pInputText id="acc-last-name" [(ngModel)]="lastName" class="w-full" />
                    </div>
                </div>

                @if (hasProfileChanges) {
                    <button type="button" (click)="saveProfile()" [disabled]="isSaving()"
                            class="omaad-cta inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm disabled:opacity-60 cursor-pointer mb-6">
                        <i class="pi text-xs" [ngClass]="isSaving() ? 'pi-spin pi-spinner' : 'pi-check'"></i>{{ t('common.save') }}
                    </button>
                }

                <!-- Email -->
                <div class="pt-5 border-t border-surface-100 dark:border-surface-800">
                    <p class="text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2">{{ t('settings.account.myEmail') }}</p>
                    <div class="flex flex-wrap items-center gap-2.5">
                        <span class="text-base font-semibold text-surface-900 dark:text-surface-0 break-all">{{ user()?.email }}</span>
                        @if (user()?.is_verified) {
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-positive/10 text-positive-700 dark:text-positive-400 text-xs font-semibold">
                                <i class="pi pi-check-circle text-[11px]"></i>{{ t('settings.account.verified') }}
                            </span>
                        }
                        @if (user()?.auth_provider && user()?.auth_provider !== 'email') {
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-100 dark:bg-brand-700/20 text-brand-700 dark:text-brand-300 text-xs font-semibold capitalize">
                                <i class="pi pi-google text-[11px]"></i>{{ user()?.auth_provider }}
                            </span>
                        }
                    </div>
                </div>
            </section>

            <!-- Session card -->
            <section class="rounded-2xl border border-surface-200/80 dark:border-surface-700/60 bg-surface-0 dark:bg-surface-900/50 shadow-sm p-6 md:p-7 mb-5">
                <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-4">{{ t('settings.account.session') }}</h2>
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div class="flex items-center gap-4 min-w-0">
                        <div class="w-11 h-11 rounded-xl bg-brand-700/10 dark:bg-ochre-400/10 flex items-center justify-center shrink-0">
                            <i class="pi pi-sign-out text-brand-700 dark:text-ochre-400"></i>
                        </div>
                        <div class="min-w-0">
                            <p class="font-medium text-surface-900 dark:text-surface-0">{{ t('settings.account.logout') }}</p>
                            <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.account.logoutDesc') }}</p>
                        </div>
                    </div>
                    <button type="button" (click)="logout()"
                            class="omaad-secondary w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm cursor-pointer">
                        <i class="pi pi-sign-out text-xs"></i>{{ t('settings.account.logoutButton') }}
                    </button>
                </div>
            </section>

            <!-- Danger zone card -->
            <section class="rounded-2xl border border-negative/20 bg-negative/[0.03] dark:bg-negative/[0.06] p-6 md:p-7">
                <h2 class="text-lg font-semibold text-negative mb-2">{{ t('settings.account.deleteAccount') }}</h2>
                <p class="text-sm text-surface-500 dark:text-surface-400 mb-5 max-w-md">{{ t('settings.account.deleteAccountDesc') }}</p>
                <button type="button" (click)="confirmDeleteAccount()"
                        class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-negative border border-negative/40 hover:bg-negative/10 transition-colors cursor-pointer">
                    <i class="pi pi-trash text-xs"></i>{{ t('settings.account.deleteMyAccount') }}
                </button>
            </section>
        </div>
    `
})
export class AccountSettings implements OnInit {
    private router = inject(Router);
    private i18n = inject(I18nService);
    private authService = inject(AuthService);
    private apiService = inject(ApiService);
    private tokenService = inject(TokenService);
    private feedback = inject(FeedbackService);

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
            this.feedback.error(this.t('settings.account.photoTooLarge'));
            return;
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            this.feedback.error(this.t('settings.account.photoFormatError'));
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
                        this.feedback.success(this.t('settings.account.photoUpdatedDetail'));
                    }
                });
            },
            error: (error) => {
                this.isUploadingAvatar.set(false);
                this.feedback.error(error?.error?.detail || this.t('settings.account.photoUploadFailed'));
            }
        });
    }

    async deleteAvatar(): Promise<void> {
        // The copy here was hardcoded French; it now goes through i18n like
        // every other confirm.
        const ok = await this.feedback.confirm({
            title: this.t('settings.account.photoRemoveTitle'),
            message: this.t('settings.account.photoRemoveBody'),
        });
        if (!ok) return;
        this.apiService.deleteAvatar().subscribe({
            next: () => {
                this.authService.getCurrentUser().subscribe({
                    next: () => this.feedback.success(this.t('settings.account.photoRemovedDetail')),
                });
            },
            error: (error) => {
                this.feedback.error(error?.error?.detail || this.t('settings.account.photoRemoveFailed'));
            },
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
                        this.feedback.success(this.t('settings.account.profileUpdatedDetail'));
                    }
                });
            },
            error: (error) => {
                this.isSaving.set(false);
                this.feedback.error(error?.error?.detail || this.t('settings.account.profileUpdateFailed'));
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
                this.feedback.success(this.t('settings.account.deleteSuccessDetail'));
                setTimeout(() => this.authService.logout(), 1500);
            },
            error: (error) => {
                this.isDeleting.set(false);
                this.feedback.error(error?.error?.detail || this.t('settings.account.deleteAccountFailed'));
            }
        });
    }

    t(key: string): string {
        return this.i18n.t(key);
    }
}
