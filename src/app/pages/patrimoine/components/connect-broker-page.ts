import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ApiService, BrokerProvider } from '../../../core/services/api.service';
import { I18nService } from '../../../i18n/i18n.service';
import { firstValueFrom } from 'rxjs';

type Market = 'brvm' | 'intl';

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
                                    <i [class]="'pi ' + marketIcon() + ' text-warm-700 dark:text-warm-300 text-sm'"></i>
                                </span>
                                {{ marketTitle() }}
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
                            <!-- Connect card (primary, left) -->
                            <button type="button" (click)="chooseConnect()"
                                    class="relative flex flex-col justify-between rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800
                                           hover:border-brand-300 dark:hover:border-brand-700
                                           transition-all text-left group overflow-hidden h-72 sm:h-80">
                                <!-- Icon top-right -->
                                <div class="relative flex justify-end p-5">
                                    <div class="w-14 h-14 rounded-2xl bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center shadow-sm">
                                        <i class="pi pi-link text-2xl text-brand-700 dark:text-ochre-400"></i>
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

                            <!-- Manual card (secondary, right) -->
                            <button type="button" (click)="chooseManual()"
                                    class="relative flex flex-col justify-between rounded-2xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-800
                                           hover:border-brand-300 dark:hover:border-brand-700
                                           transition-all text-left group overflow-hidden h-72 sm:h-80">
                                <!-- Icon top-right -->
                                <div class="relative flex justify-end p-5">
                                    <div class="w-14 h-14 rounded-2xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center shadow-sm">
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
                                   [ngModel]="institutionSearch()" (ngModelChange)="institutionSearch.set($event)"
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

                        <!-- We do NOT collect broker passwords. Secure official
                             connection (read-only) is coming; until then, add manually. -->
                        <div class="flex items-start gap-3 p-4 mb-4 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800/40">
                            <i class="pi pi-shield text-brand-700 dark:text-brand-300 mt-0.5 shrink-0"></i>
                            <div class="text-sm leading-relaxed">
                                <p class="font-semibold text-surface-900 dark:text-surface-0 mb-1">{{ t('addAssets.credentialForm.soonTitle') }}</p>
                                <p class="text-surface-600 dark:text-surface-400">{{ t('addAssets.credentialForm.soonDesc') }}</p>
                            </div>
                        </div>

                        <div class="flex items-start gap-2 mb-8 px-1">
                            <i class="pi pi-info-circle text-surface-400 text-xs mt-0.5 shrink-0"></i>
                            <p class="text-xs text-surface-500 dark:text-surface-400 leading-relaxed">{{ t('addAssets.credentialForm.noPasswordNote') }}</p>
                        </div>

                        <!-- Add holdings manually instead -->
                        <button pButton type="button"
                                [label]="t('addAssets.credentialForm.addManually')"
                                class="omaad-cta !rounded-full w-full !py-3"
                                (click)="chooseManual()">
                        </button>
                    </div>
                }
            </div>
        </div>
    `
})
export class ConnectBrokerPage implements OnInit {
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private apiService = inject(ApiService);
    private i18n = inject(I18nService);
    private messageService = inject(MessageService);

    lang = 'fr';
    step = signal<FlowStep>('method');
    market = signal<Market>('brvm');
    selectedInstitution = signal<BrokerInstitution | null>(null);
    institutionSearch = signal('');

    private readonly BRVM_INSTITUTIONS: { id: BrokerProvider; type: string; flag: string }[] = [
        { id: 'jokko_fi',          type: 'SGI', flag: '🇸🇳' },
        { id: 'cgf_bourse',        type: 'SGI', flag: '🇸🇳' },
        { id: 'bridge_securities', type: 'SGI', flag: '🇨🇮' },
    ];

    private readonly INTL_INSTITUTIONS: { id: BrokerProvider; type: string; flag: string }[] = [
        { id: 'credit_agricole', type: 'Bank',   flag: '🇫🇷' },
        { id: 'boursobank',      type: 'Bank',   flag: '🇫🇷' },
        { id: 'credit_mutuel',   type: 'Bank',   flag: '🇫🇷' },
        { id: 'trade_republic',  type: 'Broker', flag: '🇩🇪' },
        { id: 'fortuneo',        type: 'Bank',   flag: '🇫🇷' },
    ];

    institutions = computed<BrokerInstitution[]>(() => {
        const source = this.market() === 'intl' ? this.INTL_INSTITUTIONS : this.BRVM_INSTITUTIONS;
        return source.map(i => ({
            id: i.id,
            name: this.t(`broker.providers.${i.id}`),
            subtitle: this.t(`broker.providerSubtitle.${i.id}`),
            region: this.t(`broker.providerRegion.${i.id}`),
            type: i.type,
            flag: i.flag,
        }));
    });

    marketTitle = computed(() =>
        this.t(this.market() === 'intl' ? 'addAssets.markets.intl' : 'addAssets.markets.brvm')
    );

    marketIcon = computed(() =>
        this.market() === 'intl' ? 'pi-globe' : 'pi-chart-line'
    );

    filteredInstitutions = computed(() => {
        const q = this.institutionSearch().toLowerCase().trim();
        const list = this.institutions();
        if (!q) return list;
        return list.filter(i =>
            i.name.toLowerCase().includes(q) || i.subtitle.toLowerCase().includes(q) || i.region.toLowerCase().includes(q)
        );
    });

    ngOnInit() {
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        this.lang = match ? match[1] : 'fr';
        this.i18n.setLang(this.lang as 'fr' | 'en');

        const m = this.route.snapshot.queryParamMap.get('market');
        if (m === 'intl' || m === 'brvm') {
            this.market.set(m);
        }
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
        const category = this.market() === 'intl' ? 'stocks_intl' : 'stocks_brvm';
        this.router.navigate(['/', this.lang, 'pages', 'patrimoine', 'add-asset'], {
            queryParams: { category }
        });
    }

    chooseConnect(): void {
        this.step.set('institutions');
    }

    selectInstitution(inst: BrokerInstitution): void {
        // We no longer collect broker credentials; the "credentials" step now
        // explains the secure-connection plan and routes to manual entry.
        this.selectedInstitution.set(inst);
        this.step.set('credentials');
    }

    t(key: string): string {
        return this.i18n.t(key);
    }
}
