import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TokenService } from '../../../core/services/token.service';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { PinService } from '../../../core/services/pin.service';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-settings-security',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        ButtonModule, InputTextModule, PasswordModule,
        DialogModule, ToastModule,
    ],
    providers: [MessageService],
    template: `
        <p-toast position="top-center" />

        <div class="flex flex-col gap-4 md:gap-6">

            <!-- ── 1. Méthode de connexion ──────────────────────────── -->
            <section class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700">
                <!-- Section header -->
                <div class="flex items-center gap-3 px-5 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                    <div class="w-9 h-9 rounded-xl bg-brand-700/10 dark:bg-brand-300/15 flex items-center justify-center shrink-0">
                        <i class="pi pi-lock text-brand-700 dark:text-brand-300"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0 m-0">Méthode de connexion</h2>
                        <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5 m-0">Comment vous vous connectez à Omaad Wealth</p>
                    </div>
                </div>

                <div class="p-5">
                    @if (isGoogleUser()) {
                        <!-- Google OAuth user -->
                        <div class="flex items-center gap-4 p-4 rounded-2xl bg-brand-50 dark:bg-brand-900/30 border border-brand-100 dark:border-brand-800">
                            <div class="w-12 h-12 rounded-full bg-white dark:bg-surface-700 flex items-center justify-center shadow-sm shrink-0">
                                <!-- Google logo SVG -->
                                <svg class="w-6 h-6" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="font-semibold text-surface-900 dark:text-surface-0 text-sm">Connecté via Google</p>
                                <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{{ user()?.email }}</p>
                            </div>
                            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-positive/10 text-positive dark:text-positive-400 text-xs font-semibold shrink-0">
                                <i class="pi pi-check text-[10px]"></i> Actif
                            </span>
                        </div>
                        <p class="text-sm text-surface-500 dark:text-surface-400 mt-3 flex items-start gap-2">
                            <i class="pi pi-info-circle text-brand-700 dark:text-brand-300 mt-0.5 shrink-0"></i>
                            Votre mot de passe est géré par Google. Pour le modifier, rendez-vous dans votre
                            <a href="https://myaccount.google.com/security" target="_blank"
                               class="text-brand-700 dark:text-brand-300 hover:text-brand-700 dark:text-brand-300 font-medium ml-1">compte Google →</a>
                        </p>
                    } @else {
                        <!-- Email / password user -->
                        <div class="flex items-center gap-4 p-4 rounded-2xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                            <div class="w-12 h-12 rounded-full bg-brand-700 dark:bg-brand-300 flex items-center justify-center shrink-0">
                                <i class="pi pi-envelope text-white text-lg"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="font-semibold text-surface-900 dark:text-surface-0 text-sm">Email & mot de passe</p>
                                <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{{ user()?.email }}</p>
                            </div>
                        </div>

                        <div class="mt-4 p-4 rounded-2xl border border-surface-200 dark:border-surface-700">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <i class="pi pi-key text-ochre-500"></i>
                                    <div>
                                        <p class="text-sm font-medium text-surface-900 dark:text-surface-0">Mot de passe</p>
                                        <p class="text-xs text-surface-500 dark:text-surface-400">Modifiez votre mot de passe de connexion</p>
                                    </div>
                                </div>
                                <button pButton label="Modifier" [outlined]="true" size="small"
                                        class="shrink-0 !text-ochre-600 dark:!text-ochre-400 !border-ochre-400 dark:!border-ochre-500" (click)="openPasswordDialog()"></button>
                            </div>
                        </div>
                    }
                </div>
            </section>

            <!-- ── 2. Sécurité avancée (2FA) ────────────────────────── -->
            <section class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700">
                <div class="flex items-center gap-3 px-5 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                    <div class="w-9 h-9 rounded-xl bg-positive/10 flex items-center justify-center shrink-0">
                        <i class="pi pi-shield text-positive"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0 m-0">Sécurité avancée</h2>
                        <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5 m-0">Authentification à deux facteurs</p>
                    </div>
                </div>

                <div class="p-5">
                    @if (isGoogleUser()) {
                        <!-- Google handles 2FA -->
                        <div class="flex items-start gap-4 p-4 rounded-2xl bg-positive-50 dark:bg-positive-700/15 border border-positive-100 dark:border-positive-700/40">
                            <div class="w-10 h-10 rounded-xl bg-positive/10 flex items-center justify-center shrink-0 mt-0.5">
                                <i class="pi pi-verified text-positive text-lg"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="font-semibold text-surface-900 dark:text-surface-0 text-sm mb-1">Protégé par Google</p>
                                <p class="text-xs text-surface-500 dark:text-surface-400 leading-relaxed">
                                    Votre compte bénéficie des protections de Google, incluant la 2FA si vous l'avez activée dans votre compte Google.
                                </p>
                                <a href="https://myaccount.google.com/security" target="_blank"
                                   class="inline-flex items-center gap-1.5 text-xs text-positive dark:text-positive-400 font-medium mt-2 hover:underline">
                                    Gérer la sécurité Google <i class="pi pi-external-link text-[10px]"></i>
                                </a>
                            </div>
                        </div>
                    } @else {
                        <!-- Email user — 2FA coming soon -->
                        <div class="flex items-center gap-4 p-4 rounded-2xl border border-dashed border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800/50">
                            <div class="w-10 h-10 rounded-xl bg-surface-200 dark:bg-surface-700 flex items-center justify-center shrink-0">
                                <i class="pi pi-clock text-surface-500"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-1">
                                    <p class="font-semibold text-surface-900 dark:text-surface-0 text-sm">Authentification 2FA</p>
                                    <span class="px-2 py-0.5 rounded-full bg-ochre-100 text-ochre-600 dark:text-ochre-300 text-[10px] font-semibold uppercase tracking-wide">Bientôt</span>
                                </div>
                                <p class="text-xs text-surface-500 dark:text-surface-400">
                                    L'authentification à deux facteurs par application (TOTP) sera disponible prochainement.
                                </p>
                            </div>
                        </div>
                    }
                </div>
            </section>

            <!-- ── 3. Code PIN ────────────────────────────────────── -->
            <section class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700">
                <div class="flex items-center gap-3 px-5 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                    <div class="w-9 h-9 rounded-xl bg-ochre-100 flex items-center justify-center shrink-0">
                        <i class="pi pi-lock text-ochre-500"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0 m-0">Code PIN</h2>
                        <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5 m-0">Verrouillez l'accès à votre app</p>
                    </div>
                </div>

                <div class="p-5">
                    @if (!pinService.isPinSet()) {
                        <!-- PIN not set — setup flow -->
                        @if (!pinSetupActive) {
                            <div class="flex items-center justify-between p-4 rounded-2xl border border-dashed border-surface-300 dark:border-surface-600">
                                <div class="flex items-center gap-3">
                                    <i class="pi pi-lock text-surface-400"></i>
                                    <div>
                                        <p class="text-sm font-medium text-surface-900 dark:text-surface-0">Aucun code PIN défini</p>
                                        <p class="text-xs text-surface-500 dark:text-surface-400">Ajoutez un code pour protéger l'accès</p>
                                    </div>
                                </div>
                                <button pButton label="Configurer" size="small" [outlined]="true"
                                        (click)="startPinSetup()" class="shrink-0 !text-ochre-600 dark:!text-ochre-400 !border-ochre-400 dark:!border-ochre-500"></button>
                            </div>
                        } @else {
                            <!-- PIN entry UI -->
                            <div class="text-center">
                                <p class="text-sm font-medium text-surface-900 dark:text-surface-0 mb-1">
                                    {{ pinSetupStep === 'new' ? 'Choisissez un code à 4 chiffres' : 'Confirmez votre code' }}
                                </p>
                                <p class="text-xs text-surface-500 dark:text-surface-400 mb-5">
                                    {{ pinSetupStep === 'new' ? 'Ce code sera demandé à chaque ouverture' : 'Entrez le même code à nouveau' }}
                                </p>
                                <!-- Dots -->
                                <div class="flex gap-4 justify-center mb-5">
                                    @for (i of [0,1,2,3]; track i) {
                                        <div class="w-3.5 h-3.5 rounded-full border-2 transition-all"
                                             [ngClass]="i < pinSetupInput.length ? 'bg-ochre-500 border-ochre-500' : 'border-ochre-500/40'"></div>
                                    }
                                </div>
                                <!-- Mini numpad -->
                                <div class="grid grid-cols-3 gap-2 max-w-[240px] mx-auto mb-4">
                                    @for (d of ['1','2','3','4','5','6','7','8','9','','0','⌫']; track d) {
                                        @if (d === '') {
                                            <div></div>
                                        } @else if (d === '⌫') {
                                            <button (click)="pinSetupDelete()"
                                                    class="h-12 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center
                                                           hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors">
                                                <i class="pi pi-delete-left text-surface-500"></i>
                                            </button>
                                        } @else {
                                            <button (click)="pinSetupDigit(d)"
                                                    class="h-12 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center
                                                           text-lg font-medium text-surface-900 dark:text-surface-0
                                                           hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors active:scale-95">
                                                {{ d }}
                                            </button>
                                        }
                                    }
                                </div>
                                <button (click)="cancelPinSetup()" class="text-xs text-surface-400 hover:text-surface-600 transition-colors">
                                    Annuler
                                </button>
                            </div>
                        }
                    } @else {
                        <!-- PIN is set -->
                        <div class="flex items-center justify-between p-4 rounded-2xl bg-positive/10 border border-positive-100 dark:border-positive-700/40">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-positive/10 flex items-center justify-center">
                                    <i class="pi pi-check text-positive"></i>
                                </div>
                                <div>
                                    <p class="text-sm font-medium text-surface-900 dark:text-surface-0">Code PIN activé</p>
                                    <p class="text-xs text-surface-500 dark:text-surface-400">Votre app est protégée</p>
                                </div>
                            </div>
                            <button pButton label="Supprimer" severity="danger" size="small" [outlined]="true"
                                    (click)="removePin()" class="shrink-0"></button>
                        </div>

                        <!-- Lock delay setting -->
                        <div class="mt-4 flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-surface-900 dark:text-surface-0">Verrouillage auto</p>
                                <p class="text-xs text-surface-500 dark:text-surface-400">Délai avant verrouillage en arrière-plan</p>
                            </div>
                            <select (change)="onLockDelayChange($event)"
                                    [value]="pinService.getLockDelay()"
                                    class="text-sm bg-surface-100 dark:bg-surface-800 border-0 rounded-lg px-3 py-2
                                           text-surface-900 dark:text-surface-0">
                                <option value="0">Immédiat</option>
                                <option value="30000">30 secondes</option>
                                <option value="60000">1 minute</option>
                                <option value="300000">5 minutes</option>
                            </select>
                        </div>
                    }
                </div>
            </section>

            <!-- ── 4. Session actuelle ──────────────────────────────── -->
            <section class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700">
                <div class="flex items-center gap-3 px-5 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                    <div class="w-9 h-9 rounded-xl bg-brand-700/10 dark:bg-brand-300/15 flex items-center justify-center shrink-0">
                        <i class="pi pi-desktop text-brand-700 dark:text-brand-300"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0 m-0">Session actuelle</h2>
                        <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5 m-0">Appareil sur lequel vous êtes connecté</p>
                    </div>
                </div>

                <div class="p-5">
                    <!-- Current real session -->
                    <div class="flex items-center gap-3 p-4 rounded-2xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                        <div class="w-10 h-10 rounded-xl bg-brand-700/10 dark:bg-brand-300/15 flex items-center justify-center shrink-0">
                            <i [class]="'pi ' + currentSession().deviceIcon + ' text-brand-700 dark:text-brand-300'"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <p class="text-sm font-semibold text-surface-900 dark:text-surface-0">{{ currentSession().device }}</p>
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-positive/10 text-positive dark:text-positive-400 text-[10px] font-semibold">
                                    <span class="w-1.5 h-1.5 rounded-full bg-positive-500 animate-pulse"></span>
                                    Actif maintenant
                                </span>
                            </div>
                            <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                                {{ currentSession().browser }} · {{ user()?.email }}
                            </p>
                            <p class="text-xs text-surface-400 dark:text-surface-500 mt-0.5">
                                Connecté {{ currentSession().loginTime }}
                            </p>
                        </div>
                    </div>

                    <!-- Multi-session coming soon note -->
                    <div class="flex items-start gap-2 mt-4 p-3 rounded-xl bg-surface-100 dark:bg-surface-800/50">
                        <i class="pi pi-info-circle text-surface-400 text-sm mt-0.5 shrink-0"></i>
                        <p class="text-xs text-surface-500 dark:text-surface-400 leading-relaxed">
                            La gestion multi-appareils et la révocation à distance de sessions seront disponibles prochainement.
                        </p>
                    </div>

                    <!-- Logout button -->
                    <div class="mt-4">
                        <button pButton label="Se déconnecter de cette session" icon="pi pi-sign-out"
                                severity="secondary" [outlined]="true"
                                class="w-full sm:w-auto"
                                (click)="logout()"></button>
                    </div>
                </div>
            </section>

            <!-- ── 4. Activité récente ──────────────────────────────── -->
            <section class="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700">
                <div class="flex items-center gap-3 px-5 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                    <div class="w-9 h-9 rounded-xl bg-ochre-100 flex items-center justify-center shrink-0">
                        <i class="pi pi-history text-ochre-500"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0 m-0">Activité récente</h2>
                        <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5 m-0">Dernières actions sur votre compte</p>
                    </div>
                </div>

                <div class="p-5">
                    <div class="space-y-1">
                        <!-- Real login event -->
                        <div class="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                            <div class="w-8 h-8 rounded-lg bg-positive/10 flex items-center justify-center shrink-0">
                                <i [class]="'pi ' + loginIcon() + ' text-positive text-sm'"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm text-surface-900 dark:text-surface-0 font-medium">{{ loginEventLabel() }}</p>
                                <p class="text-xs text-surface-500 dark:text-surface-400">{{ currentSession().browser }} · {{ currentSession().device }}</p>
                            </div>
                            <span class="text-xs text-surface-400 shrink-0">{{ currentSession().loginTime }}</span>
                        </div>

                        <!-- Account creation event (real) -->
                        @if (user()?.created_at) {
                            <div class="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                                <div class="w-8 h-8 rounded-lg bg-brand-700/10 dark:bg-brand-300/15 flex items-center justify-center shrink-0">
                                    <i class="pi pi-user-plus text-brand-700 dark:text-brand-300 text-sm"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm text-surface-900 dark:text-surface-0 font-medium">Compte créé</p>
                                    <p class="text-xs text-surface-500 dark:text-surface-400">Inscription à Omaad Wealth</p>
                                </div>
                                <span class="text-xs text-surface-400 shrink-0">{{ formatDate(user()?.created_at) }}</span>
                            </div>
                        }
                    </div>

                    <div class="flex items-start gap-2 mt-4 p-3 rounded-xl bg-surface-100 dark:bg-surface-800/50">
                        <i class="pi pi-info-circle text-surface-400 text-sm mt-0.5 shrink-0"></i>
                        <p class="text-xs text-surface-500 dark:text-surface-400 leading-relaxed">
                            L'historique de sécurité complet (connexions, modifications de profil, etc.) sera disponible prochainement.
                        </p>
                    </div>
                </div>
            </section>

        </div>

        <!-- ── Password change dialog ─────────────────────────────────── -->
        <p-dialog [(visible)]="showPasswordDialog"
                  [style]="{ width: '95vw', maxWidth: '460px' }"
                  [modal]="true" [draggable]="false" [resizable]="false"
                  styleClass="!rounded-2xl overflow-hidden">
            <ng-template #header>
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-brand-700 dark:bg-brand-300 flex items-center justify-center">
                        <i class="pi pi-key text-white"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-surface-900 dark:text-surface-0 m-0">Modifier le mot de passe</h3>
                        <p class="text-surface-500 text-sm m-0">Choisissez un mot de passe fort</p>
                    </div>
                </div>
            </ng-template>

            <ng-template #content>
                <div class="flex flex-col gap-6 pt-3">
                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-surface-500 dark:text-surface-400">
                            Mot de passe actuel <span class="text-negative">*</span>
                        </label>
                        <p-password [(ngModel)]="pwForm.current" [feedback]="false" [toggleMask]="true"
                                    styleClass="w-full" inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                        @if (pwSubmitted && !pwForm.current) {
                            <small class="text-negative text-xs mt-1">Requis</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-surface-500 dark:text-surface-400">
                            Nouveau mot de passe <span class="text-negative">*</span>
                        </label>
                        <p-password [(ngModel)]="pwForm.newPw" [toggleMask]="true"
                                    styleClass="w-full" inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400"
                                    promptLabel="Choisissez un mot de passe"
                                    weakLabel="Faible" mediumLabel="Moyen" strongLabel="Fort" />
                        @if (pwSubmitted && !pwForm.newPw) {
                            <small class="text-negative text-xs mt-1">Requis</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-surface-500 dark:text-surface-400">
                            Confirmer le nouveau mot de passe <span class="text-negative">*</span>
                        </label>
                        <p-password [(ngModel)]="pwForm.confirm" [feedback]="false" [toggleMask]="true"
                                    styleClass="w-full" inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                        @if (pwSubmitted && pwForm.confirm && pwForm.confirm !== pwForm.newPw) {
                            <small class="text-negative text-xs mt-1">Les mots de passe ne correspondent pas</small>
                        }
                    </div>

                    <!-- Password rules -->
                    <div class="p-3 rounded-xl bg-surface-50 dark:bg-surface-800 space-y-1.5">
                        <p class="text-xs font-semibold text-surface-500 dark:text-surface-400 mb-2">Règles :</p>
                        @for (rule of passwordRules; track rule.label) {
                            <div class="flex items-center gap-2">
                                <i class="text-xs" [ngClass]="rule.valid(pwForm.newPw) ? 'pi pi-check text-positive' : 'pi pi-times text-surface-400'"></i>
                                <span class="text-xs" [ngClass]="rule.valid(pwForm.newPw) ? 'text-positive dark:text-positive-400' : 'text-surface-500'">{{ rule.label }}</span>
                            </div>
                        }
                    </div>
                </div>
            </ng-template>

            <ng-template #footer>
                <div class="flex flex-col gap-2 pt-2 w-full">
                    <p-button label="Enregistrer" icon="pi pi-check"
                              [loading]="savingPassword()"
                              (click)="savePassword()"
                              styleClass="w-full omaad-cta !rounded-full !py-3" />
                    <p-button label="Annuler" icon="pi pi-times" [outlined]="true"
                              (click)="closePasswordDialog()" styleClass="w-full !rounded-full !py-3" />
                </div>
            </ng-template>
        </p-dialog>
    `
})
export class SecuritySettings implements OnInit {
    private tokenService = inject(TokenService);
    private apiService   = inject(ApiService);
    private authService  = inject(AuthService);
    private msgService   = inject(MessageService);
    pinService           = inject(PinService);

    // ── PIN setup state ──
    pinSetupActive = false;
    pinSetupStep: 'new' | 'confirm' = 'new';
    pinSetupInput = '';
    private pinSetupFirstEntry = '';

    startPinSetup() {
        this.pinSetupActive = true;
        this.pinSetupStep = 'new';
        this.pinSetupInput = '';
        this.pinSetupFirstEntry = '';
    }

    cancelPinSetup() {
        this.pinSetupActive = false;
        this.pinSetupInput = '';
    }

    async pinSetupDigit(d: string) {
        if (this.pinSetupInput.length >= 4) return;
        this.pinSetupInput += d;

        if (this.pinSetupInput.length === 4) {
            await new Promise(r => setTimeout(r, 200));

            if (this.pinSetupStep === 'new') {
                // First entry — move to confirm step
                this.pinSetupFirstEntry = this.pinSetupInput;
                this.pinSetupInput = '';
                this.pinSetupStep = 'confirm';
            } else {
                // Confirm step — check match
                if (this.pinSetupInput === this.pinSetupFirstEntry) {
                    await this.pinService.setPin(this.pinSetupInput);
                    this.msgService.add({ severity: 'success', summary: 'Code PIN activé', detail: 'Votre app est maintenant protégée.', life: 3000 });
                    this.pinSetupActive = false;
                } else {
                    this.msgService.add({ severity: 'error', summary: 'Codes différents', detail: 'Les deux codes ne correspondent pas. Réessayez.', life: 4000 });
                    this.pinSetupInput = '';
                    this.pinSetupStep = 'new';
                    this.pinSetupFirstEntry = '';
                }
            }
        }
    }

    pinSetupDelete() {
        if (this.pinSetupInput.length > 0) {
            this.pinSetupInput = this.pinSetupInput.slice(0, -1);
        }
    }

    removePin() {
        this.pinService.removePin();
        this.msgService.add({ severity: 'success', summary: 'Code PIN supprimé', detail: 'Le verrouillage est désactivé.', life: 3000 });
    }

    onLockDelayChange(event: Event) {
        const val = parseInt((event.target as HTMLSelectElement).value, 10);
        this.pinService.setLockDelay(val);
    }

    user = this.tokenService.user;

    // ── Auth method detection ──────────────────────────────────────────
    /**
     * A user is a Google OAuth user if:
     * 1. Their auth_provider is 'google' (set locally at login), OR
     * 2. Their avatar is hosted on googleusercontent.com (Google profile pic)
     */
    readonly isGoogleUser = computed(() => {
        const u = this.user();
        if (!u) return false;
        return u.auth_provider === 'google'
            || !!(u.avatar_url?.includes('googleusercontent.com'));
    });

    // ── Session info (real, derived from browser + token) ─────────────
    readonly currentSession = computed(() => {
        return {
            device:     this.detectDevice(),
            deviceIcon: this.deviceIcon(),
            browser:    this.detectBrowser(),
            loginTime:  this.getLoginTime(),
        };
    });

    // ── Password dialog ────────────────────────────────────────────────
    showPasswordDialog = false;
    savingPassword     = signal(false);
    pwSubmitted        = false;
    pwForm             = { current: '', newPw: '', confirm: '' };

    passwordRules = [
        { label: 'Au moins 8 caractères',           valid: (p: string) => p.length >= 8 },
        { label: 'Une lettre majuscule',             valid: (p: string) => /[A-Z]/.test(p) },
        { label: 'Une lettre minuscule',             valid: (p: string) => /[a-z]/.test(p) },
        { label: 'Un chiffre',                       valid: (p: string) => /\d/.test(p) },
        { label: 'Un caractère spécial (@!#$%…)',    valid: (p: string) => /[^A-Za-z0-9]/.test(p) },
    ];

    ngOnInit() {
        // If auth_provider is not set but user has a Google avatar, persist the inference
        const u = this.user();
        if (u && !u.auth_provider && u.avatar_url?.includes('googleusercontent.com')) {
            this.tokenService.setUser({ ...u, auth_provider: 'google' });
        }
    }

    // ── Login icon: google = logo SVG inside span, email = pi-sign-in ──
    readonly loginIcon = computed(() => 'pi-sign-in');

    readonly loginEventLabel = computed(() =>
        this.isGoogleUser() ? 'Connexion via Google' : 'Connexion réussie'
    );

    // ── Device detection ───────────────────────────────────────────────
    private detectDevice(): string {
        const ua = navigator.userAgent;
        if (/iPhone/.test(ua)) return 'iPhone';
        if (/iPad/.test(ua))   return 'iPad';
        if (/Android.*Mobile/.test(ua)) return 'Android (mobile)';
        if (/Android/.test(ua)) return 'Android (tablette)';
        if (/Mac OS X/.test(ua) && !/iPhone|iPad/.test(ua)) return 'Mac';
        if (/Windows/.test(ua)) return 'Windows';
        if (/Linux/.test(ua))   return 'Linux';
        return 'Navigateur web';
    }

    private deviceIcon(): string {
        const ua = navigator.userAgent;
        if (/iPhone|Android.*Mobile/.test(ua)) return 'pi-mobile';
        if (/iPad|Android(?!.*Mobile)/.test(ua)) return 'pi-tablet';
        return 'pi-desktop';
    }

    private detectBrowser(): string {
        const ua = navigator.userAgent;
        if (/Edg\//.test(ua))            return 'Microsoft Edge';
        if (/OPR\/|Opera/.test(ua))      return 'Opera';
        if (/Chrome\//.test(ua))         return 'Chrome';
        if (/Firefox\//.test(ua))        return 'Firefox';
        if (/Safari\//.test(ua))         return 'Safari';
        return 'Navigateur';
    }

    private getLoginTime(): string {
        // Try to read the JWT `iat` claim for the actual login timestamp
        const token = this.tokenService.token();
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.iat) {
                    const d = new Date(payload.iat * 1000);
                    const now = Date.now();
                    const diff = now - d.getTime();
                    if (diff < 60_000)      return 'à l\'instant';
                    if (diff < 3_600_000)   return `il y a ${Math.round(diff / 60_000)} min`;
                    if (diff < 86_400_000)  return `il y a ${Math.round(diff / 3_600_000)} h`;
                    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                }
            } catch { /* non-blocking */ }
        }
        return 'récemment';
    }

    formatDate(isoDate?: string): string {
        if (!isoDate) return '—';
        const d = new Date(isoDate);
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    // ── Password dialog actions ────────────────────────────────────────
    openPasswordDialog() {
        this.pwForm = { current: '', newPw: '', confirm: '' };
        this.pwSubmitted = false;
        this.showPasswordDialog = true;
    }

    closePasswordDialog() {
        this.showPasswordDialog = false;
        this.pwSubmitted = false;
    }

    async savePassword() {
        this.pwSubmitted = true;

        if (!this.pwForm.current || !this.pwForm.newPw || !this.pwForm.confirm) return;
        if (this.pwForm.newPw !== this.pwForm.confirm) return;
        if (this.passwordRules.some(r => !r.valid(this.pwForm.newPw))) {
            this.msgService.add({ severity: 'warn', summary: 'Mot de passe trop faible',
                detail: 'Respectez toutes les règles de sécurité.', life: 4000 });
            return;
        }

        this.savingPassword.set(true);
        try {
            await firstValueFrom(this.apiService.changePassword({
                current_password: this.pwForm.current,
                new_password:     this.pwForm.newPw,
            }));
            this.msgService.add({ severity: 'success', summary: 'Mot de passe modifié',
                detail: 'Votre mot de passe a été mis à jour.', life: 4000 });
            this.closePasswordDialog();
        } catch (err: any) {
            const detail = err?.error?.detail === 'Invalid current password'
                ? 'Mot de passe actuel incorrect.'
                : 'Impossible de modifier le mot de passe.';
            this.msgService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
        } finally {
            this.savingPassword.set(false);
        }
    }

    // ── Logout ─────────────────────────────────────────────────────────
    logout() {
        this.authService.logout();
    }
}
