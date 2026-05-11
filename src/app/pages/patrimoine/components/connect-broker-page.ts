import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ApiService, BrokerProvider } from '../../../core/services/api.service';
import { I18nService } from '../../../i18n/i18n.service';
import { firstValueFrom } from 'rxjs';

interface BrokerInstitution {
    id: BrokerProvider;
    name: string;
    subtitle: string;
    region: string;
    type: string;
    flag: string;
}

type FlowStep = 'method' | 'institutions' | 'credentials';

@Component({
    selector: 'app-connect-broker-page',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, ToastModule],
    providers: [MessageService],
    template: `
        <p-toast position="top-center"></p-toast>

        <div class="flex flex-col min-h-[calc(100vh-8rem)]">
            <!-- Header -->
            <div class="flex items-center gap-4 mb-6">
                <button (click)="goBack()"
                        class="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-all cursor-pointer">
                    <i class="pi pi-arrow-left text-surface-600 dark:text-surface-300"></i>
                </button>
                <div class="flex-1 min-w-0">
                    <h1 class="text-xl font-bold text-surface-900 dark:text-surface-0 m-0">
                        @if (step() === 'method') {
                            <span class="flex items-center gap-2">
                                <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-warm-100 dark:bg-warm-800">
                                    <i class="pi pi-chart-line text-warm-700 dark:text-warm-300 text-sm"></i>
                                </span>
                                Actions / Bourse
                            </span>
                        }
                        @if (step() === 'institutions') { {{ t('addAssets.institutionList.title') }} }
                        @if (step() === 'credentials') { {{ t('addAssets.credentialForm.title') }} {{ selectedInstitution()?.name }} }
                    </h1>
                </div>
            </div>

            <!-- Content -->
            <div class="flex-1">

                <!-- ===== Method Picker (Finary-style tall cards) ===== -->
                @if (step() === 'method') {
                    <div class="max-w-3xl mx-auto">
                        <p class="text-surface-500 dark:text-surface-400 text-sm mb-8">{{ t('addAssets.methodPicker.title') }}</p>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <!-- Connect card (primary — left) -->
                            <button type="button" (click)="chooseConnect()"
                                    class="relative flex flex-col justify-between rounded-2xl border border-surface-200 dark:border-surface-700
                                           hover:border-brand-300 dark:hover:border-brand-700
                                           transition-all text-left group overflow-hidden h-72 sm:h-80">
                                <!-- Background gradient -->
                                <div class="absolute inset-0 bg-gradient-to-br from-brand-50 via-surface-50 to-ochre-50
                                            dark:from-brand-900/30 dark:via-surface-800 dark:to-ochre-900/20"></div>
                                <!-- Decorative circles -->
                                <div class="absolute top-4 right-4 w-24 h-24 rounded-full bg-brand-100/60 dark:bg-brand-800/30 blur-sm"></div>
                                <div class="absolute top-12 right-12 w-16 h-16 rounded-full bg-ochre-100/60 dark:bg-ochre-800/30 blur-sm"></div>
                                <!-- Icon top-right -->
                                <div class="relative flex justify-end p-5">
                                    <div class="w-14 h-14 rounded-2xl bg-white/80 dark:bg-surface-700/80 backdrop-blur flex items-center justify-center shadow-sm">
                                        <i class="pi pi-link text-2xl text-brand-700 dark:text-brand-300"></i>
                                    </div>
                                </div>
                                <!-- Content bottom -->
                                <div class="relative p-6 pt-0">
                                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-positive/10 text-positive text-xs font-medium mb-3">
                                        <i class="pi pi-lock text-[10px]"></i>
                                        {{ t('addAssets.institutionList.secureConnection') }}
                                    </span>
                                    <div class="font-bold text-surface-900 dark:text-surface-0 text-lg mb-1.5">{{ t('addAssets.methodPicker.connectTitle') }}</div>
                                    <div class="text-surface-500 dark:text-surface-400 text-sm leading-relaxed">{{ t('addAssets.methodPicker.connectDesc') }}</div>
                                    <div class="flex justify-end mt-4">
                                        <div class="w-10 h-10 rounded-full border border-surface-200 dark:border-surface-600 flex items-center justify-center
                                                    group-hover:border-brand-300 group-hover:bg-brand-50 dark:group-hover:border-brand-700 dark:group-hover:bg-brand-900/40 transition-all">
                                            <i class="pi pi-arrow-right text-surface-400 group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors"></i>
                                        </div>
                                    </div>
                                </div>
                            </button>

                            <!-- Manual card (secondary — right) -->
                            <button type="button" (click)="chooseManual()"
                                    class="relative flex flex-col justify-between rounded-2xl border border-surface-200 dark:border-surface-700
                                           hover:border-brand-300 dark:hover:border-brand-700
                                           transition-all text-left group overflow-hidden h-72 sm:h-80">
                                <!-- Background gradient -->
                                <div class="absolute inset-0 bg-gradient-to-br from-surface-50 via-surface-100 to-surface-50
                                            dark:from-surface-800 dark:via-surface-800/80 dark:to-surface-900"></div>
                                <!-- Decorative circles -->
                                <div class="absolute top-6 right-6 w-20 h-20 rounded-full bg-surface-200/60 dark:bg-surface-700/40 blur-sm"></div>
                                <div class="absolute top-14 right-14 w-12 h-12 rounded-full bg-surface-300/40 dark:bg-surface-600/30 blur-sm"></div>
                                <!-- Icon top-right -->
                                <div class="relative flex justify-end p-5">
                                    <div class="w-14 h-14 rounded-2xl bg-white/80 dark:bg-surface-700/80 backdrop-blur flex items-center justify-center shadow-sm">
                                        <i class="pi pi-pencil text-2xl text-surface-500 dark:text-surface-400"></i>
                                    </div>
                                </div>
                                <!-- Content bottom -->
                                <div class="relative p-6 pt-0">
                                    <div class="font-bold text-surface-900 dark:text-surface-0 text-lg mb-1.5">{{ t('addAssets.methodPicker.manualTitle') }}</div>
                                    <div class="text-surface-500 dark:text-surface-400 text-sm leading-relaxed">{{ t('addAssets.methodPicker.manualDesc') }}</div>
                                    <div class="flex justify-end mt-4">
                                        <div class="w-10 h-10 rounded-full border border-surface-200 dark:border-surface-600 flex items-center justify-center
                                                    group-hover:border-brand-300 group-hover:bg-brand-50 dark:group-hover:border-brand-700 dark:group-hover:bg-brand-900/40 transition-all">
                                            <i class="pi pi-arrow-right text-surface-400 group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors"></i>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                }

                <!-- ===== Institution List ===== -->
                @if (step() === 'institutions') {
                    <div class="max-w-2xl mx-auto">
                        <!-- Security badges -->
                        <div class="flex items-center gap-6 mb-6 p-4 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                            <div class="flex items-center gap-2">
                                <i class="pi pi-lock text-positive text-sm"></i>
                                <span class="text-surface-600 dark:text-surface-300 text-sm">{{ t('addAssets.institutionList.secureConnection') }}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <i class="pi pi-shield text-positive text-sm"></i>
                                <span class="text-surface-600 dark:text-surface-300 text-sm">{{ t('addAssets.institutionList.encryptedData') }}</span>
                            </div>
                        </div>

                        <!-- Search -->
                        <div class="relative mb-6">
                            <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-surface-400"></i>
                            <input pInputText
                                   [(ngModel)]="institutionSearch"
                                   [placeholder]="t('addAssets.institutionList.searchPlaceholder')"
                                   class="w-full !pl-11 !py-3 !bg-surface-50 dark:!bg-surface-800 !border-surface-200 dark:!border-surface-700 !rounded-xl" />
                        </div>

                        <!-- Institution list -->
                        <div class="divide-y divide-surface-200 dark:divide-surface-700">
                            @for (inst of filteredInstitutions(); track inst.id) {
                                <button type="button" (click)="selectInstitution(inst)"
                                        class="w-full flex items-center gap-4 py-4 px-3 text-left hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors rounded-lg group">
                                    <div class="w-11 h-11 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0 text-lg">
                                        {{ inst.flag }}
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="font-semibold text-surface-900 dark:text-surface-0 text-sm">{{ inst.name }}</div>
                                        <div class="text-surface-400 text-xs mt-0.5">{{ inst.subtitle }} · {{ inst.region }}</div>
                                    </div>
                                    <span class="px-2.5 py-1 rounded-full bg-surface-100 dark:bg-surface-700 text-surface-500 dark:text-surface-400 text-xs font-medium shrink-0">{{ inst.type }}</span>
                                </button>
                            }
                        </div>

                        @if (filteredInstitutions().length === 0) {
                            <div class="text-center py-12 text-surface-400">
                                <i class="pi pi-search text-2xl mb-3 block"></i>
                                <p class="text-sm">{{ t('addAssets.institutionList.noResults') }}</p>
                            </div>
                        }
                    </div>
                }

                <!-- ===== Credential Form ===== -->
                @if (step() === 'credentials') {
                    <div class="max-w-lg mx-auto">
                        <!-- Selected institution card -->
                        @if (selectedInstitution()) {
                            <div class="flex items-center gap-4 p-4 mb-6 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                                <div class="w-11 h-11 rounded-xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center text-lg">
                                    {{ selectedInstitution()!.flag }}
                                </div>
                                <div>
                                    <div class="font-semibold text-surface-900 dark:text-surface-0">{{ selectedInstitution()!.name }}</div>
                                    <div class="text-surface-400 text-xs">{{ selectedInstitution()!.subtitle }}</div>
                                </div>
                            </div>
                        }

                        <!-- Encryption notice -->
                        <div class="flex items-start gap-3 p-4 mb-6 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
                            <i class="pi pi-lock text-amber-600 dark:text-amber-400 mt-0.5"></i>
                            <p class="text-amber-800 dark:text-amber-300 text-sm leading-relaxed">{{ t('addAssets.credentialForm.encryptionNotice') }}</p>
                        </div>

                        <!-- Login -->
                        <div class="flex flex-col gap-1 mb-5">
                            <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('addAssets.credentialForm.loginLabel') }}</label>
                            <input pInputText [(ngModel)]="brokerLogin"
                                   [placeholder]="t('addAssets.credentialForm.loginPlaceholder')"
                                   class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary" />
                        </div>

                        <!-- Password -->
                        <div class="flex flex-col gap-1 mb-8">
                            <label class="text-sm text-surface-500 dark:text-surface-400">{{ t('addAssets.credentialForm.passwordLabel') }}</label>
                            <div class="relative">
                                <input pInputText [(ngModel)]="brokerPassword"
                                       [type]="showPassword() ? 'text' : 'password'"
                                       [placeholder]="t('addAssets.credentialForm.passwordPlaceholder')"
                                       class="w-full !py-3 !pr-12 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary" />
                                <button type="button" (click)="showPassword.set(!showPassword())"
                                        class="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-surface-400 hover:text-surface-600 transition-colors">
                                    <i class="pi" [ngClass]="showPassword() ? 'pi-eye-slash' : 'pi-eye'"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Submit -->
                        <button pButton type="button"
                                [label]="t('addAssets.credentialForm.submit')"
                                class="omaad-cta !rounded-full w-full !py-3"
                                [loading]="isSaving()"
                                [disabled]="!brokerLogin || !brokerPassword"
                                (click)="submitCredentials()">
                        </button>
                    </div>
                }
            </div>
        </div>
    `
})
export class ConnectBrokerPage implements OnInit {
    private router = inject(Router);
    private apiService = inject(ApiService);
    private i18n = inject(I18nService);
    private messageService = inject(MessageService);

    lang = 'fr';
    step = signal<FlowStep>('method');
    selectedInstitution = signal<BrokerInstitution | null>(null);
    institutionSearch = '';
    brokerLogin = '';
    brokerPassword = '';
    showPassword = signal(false);
    isSaving = signal(false);

    institutions: BrokerInstitution[] = [
        { id: 'jokko_fi', name: 'Jokko FI', subtitle: 'BRVM — Actions UEMOA', region: 'Sénégal', type: 'SGI', flag: '🇸🇳' },
        { id: 'cgf_bourse', name: 'CGF Bourse', subtitle: 'BRVM — Actions UEMOA', region: 'Sénégal', type: 'SGI', flag: '🇸🇳' },
        { id: 'bridge_securities', name: 'Bridge Securities', subtitle: 'BRVM — Actions UEMOA', region: 'Côte d\'Ivoire', type: 'SGI', flag: '🇨🇮' },
    ];

    filteredInstitutions = computed(() => {
        const q = this.institutionSearch.toLowerCase().trim();
        if (!q) return this.institutions;
        return this.institutions.filter(i =>
            i.name.toLowerCase().includes(q) || i.subtitle.toLowerCase().includes(q) || i.region.toLowerCase().includes(q)
        );
    });

    ngOnInit() {
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        this.lang = match ? match[1] : 'fr';
        this.i18n.setLang(this.lang as 'fr' | 'en');
    }

    goBack(): void {
        const s = this.step();
        if (s === 'credentials') {
            this.step.set('institutions');
            return;
        }
        if (s === 'institutions') {
            this.step.set('method');
            return;
        }
        this.router.navigate(['/', this.lang, 'pages', 'patrimoine', 'add-asset']);
    }

    chooseManual(): void {
        this.router.navigate(['/', this.lang, 'pages', 'patrimoine', 'add-asset'], {
            queryParams: { category: 'stocks' }
        });
    }

    chooseConnect(): void {
        this.step.set('institutions');
    }

    selectInstitution(inst: BrokerInstitution): void {
        this.selectedInstitution.set(inst);
        this.brokerLogin = '';
        this.brokerPassword = '';
        this.step.set('credentials');
    }

    async submitCredentials(): Promise<void> {
        const inst = this.selectedInstitution();
        if (!inst || !this.brokerLogin || !this.brokerPassword) return;

        this.isSaving.set(true);
        try {
            await firstValueFrom(this.apiService.createBrokerConnection({
                provider: inst.id,
                login: this.brokerLogin,
                password: this.brokerPassword,
            }));
            this.messageService.add({
                severity: 'success',
                summary: this.t('addAssets.credentialForm.successTitle'),
                detail: this.t('addAssets.credentialForm.successDetail'),
                life: 4000,
            });
            this.router.navigate(['/', this.lang, 'pages', 'patrimoine']);
        } catch (error: any) {
            const detail = error?.error?.detail
                ? (typeof error.error.detail === 'string' ? error.error.detail : JSON.stringify(error.error.detail).slice(0, 120))
                : 'Erreur lors de la connexion';
            this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 6000 });
        } finally {
            this.isSaving.set(false);
        }
    }

    t(key: string): string {
        return this.i18n.t(key);
    }
}
