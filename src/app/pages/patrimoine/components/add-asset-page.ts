import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, inject, model, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ApiService, AssetCreate, AssetCategory, BrvmInstrument } from '../../../core/services/api.service';
import { CanComponentDeactivate } from '../../../core/guards/unsaved-changes.guard';
import { PatrimoineService } from '../../service/patrimoine.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { TokenService } from '../../../core/services/token.service';
import { I18nService } from '../../../i18n/i18n.service';
import { isTouchDevice } from '../../../core/util/touch';
import { toLocalDateStr } from '../../../core/util/date';

/**
 * Tappable currency chip rendered inside an amount input's suffix slot (S7b
 * PA-2). Replaces the old full-width "Devise" select row: the currency lives
 * where the money is typed, defaulting to the user's preference, one tap to
 * change. Self-contained popover (closes on outside click / Escape).
 */
@Component({
    selector: 'app-currency-suffix',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule],
    host: { '(document:click)': 'close()', '(document:keydown.escape)': 'close()' },
    template: `
        <div class="absolute right-0 top-1/2 -translate-y-1/2" (click)="$event.stopPropagation()">
            <button type="button" (click)="open.set(!open())"
                    class="inline-flex items-center gap-1 pl-2.5 pr-2 py-1 rounded-full text-xs font-semibold
                           bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300
                           hover:bg-ochre-50 hover:text-ochre-700 dark:hover:bg-ochre-500/10 dark:hover:text-ochre-400
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ochre-500/60
                           transition-colors cursor-pointer"
                    [attr.aria-label]="ariaLabel()" [attr.aria-expanded]="open()" aria-haspopup="listbox">
                {{ symbol() }} <i class="pi pi-chevron-down !text-[9px]" aria-hidden="true"></i>
            </button>
            @if (open()) {
                <div class="absolute right-0 top-full mt-1.5 z-20 min-w-[9rem] rounded-xl border border-surface-200 dark:border-surface-700
                            bg-surface-0 dark:bg-surface-900 shadow-lg py-1" role="listbox" [attr.aria-label]="ariaLabel()">
                    @for (o of options; track o.value) {
                        <button type="button" role="option" [attr.aria-selected]="currency() === o.value"
                                (click)="pick(o.value)"
                                class="w-full text-left px-3 py-2 text-sm text-surface-700 dark:text-surface-200
                                       hover:bg-surface-100 dark:hover:bg-surface-800 cursor-pointer
                                       flex items-center justify-between gap-3"
                                [class.font-semibold]="currency() === o.value">
                            {{ o.label }}
                            @if (currency() === o.value) { <i class="pi pi-check text-xs text-ochre-500" aria-hidden="true"></i> }
                        </button>
                    }
                </div>
            }
        </div>
    `,
})
export class CurrencySuffixComponent {
    currency = model.required<string>();
    ariaLabel = model('Devise');
    open = signal(false);
    private readonly cs = inject(CurrencyService);
    // The currency an asset is HELD in. Both CFA francs are listed and labelled by
    // zone: they share the FCFA symbol, so "FCFA" alone cannot distinguish a
    // Dakar account from a Libreville one.
    readonly options = [
        { label: 'FCFA (Afrique de l\'Ouest)', value: 'XOF' },
        { label: 'FCFA (Afrique centrale)', value: 'XAF' },
        { label: 'Euro (€)', value: 'EUR' },
        { label: 'Dollar ($)', value: 'USD' },
    ];
    symbol = computed(() => this.cs.symbolFor(this.currency()));
    pick(v: string) { this.currency.set(v); this.open.set(false); }
    close() { this.open.set(false); }
}

interface Owner {
    name: string;
    initials: string;
    percentage: number;
}

interface AssetFormData {
    name: string;
    description: string;
    category: AssetCategory | '';
    quantity: number;
    /** BRVM stock picker (S9-B1): chosen instrument ticker, '' when free-typed. */
    ticker: string;
    purchasePrice: number;
    currentPrice: number;
    purchaseDate: string;
    institution: string;
    owners: Owner[];
    tontineMonthlyContribution: number;
    tontineParticipants: number;
    tontineStartDate: string;
    tontineCollectionDate: string;
    tontineStatus: 'en_cours' | 'mise_recue' | 'termine';
    tontineFrequency: 'monthly' | 'weekly';
    mobileMoneyProvider: string;
    surfaceM2: number;
    region: string;
    currency: string;  // native currency the entered amounts are in
    // Real-estate multi-section wizard (Finary-style, stored in notes JSON;
    // frontend-only, no backend migration).
    reType: string;        // Appartement / Maison / Villa / Terrain / ...
    reUsage: string;       // residence_principale / locatif / ...
    reRooms: number | null;
    reMonthlyRent: number; // loyer mensuel (maps to rental_income)
    reConstructionDate: string; // année / date de construction
    reAgencyFees: number;
    reNotaryFees: number;
    reRenovationFees: number;
    reFurnishingCosts: number;
    loanAmount: number;    // capital restant / montant du prêt
    loanRate: number;      // taux annuel %
    loanMonthly: number;   // mensualité
}

interface CategoryCard {
    value: AssetCategory;
    label: string;
    desc: string;
    icon: string;
    bgClass: string;
    textClass: string;
}

@Component({
    selector: 'app-add-asset-page',
    standalone: true,
    imports: [
        CommonModule, FormsModule, ButtonModule, InputTextModule,
        SelectModule, InputNumberModule, DialogModule, DatePickerModule, ToastModule, AppAmountComponent, DecimalPipe,
        CurrencySuffixComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [MessageService],
    styles: [`
        @keyframes omaad-pop {
            0% { transform: scale(.6); opacity: 0; }
            70% { transform: scale(1.08); }
            100% { transform: scale(1); opacity: 1; }
        }
    `],
    template: `
        <p-toast position="top-center"></p-toast>

        <div class="flex flex-col min-h-[calc(100vh-8rem)]">
            <!-- Header -->
            <div class="flex items-center gap-4 mb-6">
                <button (click)="goBack()" [attr.aria-label]="t('common.back')"
                        class="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-all cursor-pointer">
                    <i class="pi pi-arrow-left text-surface-600 dark:text-surface-300" aria-hidden="true"></i>
                </button>
                <div class="flex-1 min-w-0">
                    <!-- No h1 on the success step: its title lives in the body,
                         and an empty heading is an axe violation. -->
                    @if (currentStep() !== 3) {
                    <h1 class="font-bold text-surface-900 dark:text-surface-0 m-0"
                        [ngClass]="currentStep() === 0 ? 'text-2xl' : 'text-xl'">
                        @if (currentStep() === 0 && !pathChooser()) { {{ t('addAssets.wizard.headerComplete') }} }
                        @if ((currentStep() === 0 && pathChooser()) || currentStep() === 1) {
                            <span class="flex items-center gap-2">
                                @if (selectedCard()) {
                                    <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg {{ selectedCard()!.bgClass }}">
                                        <i class="pi {{ selectedCard()!.icon }} {{ selectedCard()!.textClass }} text-sm"></i>
                                    </span>
                                }
                                {{ selectedCard()?.label ?? (t('addAssets.wizard.details')) }}
                            </span>
                        }
                        @if (currentStep() === 2) { {{ t('addAssets.wizard.ownership') }} }
                    </h1>
                    }
                </div>
                <!-- Step dots (only on form steps) -->
                @if ((currentStep() === 1 || currentStep() === 2) && !isRealEstate()) {
                    <div class="flex items-center gap-1.5 shrink-0">
                        @for (s of [1, 2]; track s) {
                            <div class="w-2 h-2 rounded-full transition-all"
                                 [ngClass]="currentStep() >= s ? 'bg-brand-700 dark:bg-brand-300 w-5' : 'bg-surface-300 dark:bg-surface-600'"></div>
                        }
                    </div>
                }
            </div>

            <!-- Content -->
            <div class="flex-1">

                <!-- ===== STEP 0b: Dual-path chooser (S7b PA-3). Bank + mobile
                     money classes open here: an HONEST "coming soon" live-sync
                     teaser (taps feed the sync_interest event, measuring S9
                     demand) next to the manual path. Stocks never reach this
                     block: connect-broker is their dual-path screen. ===== -->
                @if (currentStep() === 0 && pathChooser()) {
                    <div class="max-w-2xl mx-auto">
                        <p class="text-surface-500 dark:text-surface-400 text-sm mb-5">{{ t('addAssets.dualPath.title') }}</p>

                        <div class="flex flex-col gap-3">
                            <!-- Sync teaser (S9): compact, tinted, demand-measured -->
                            <button type="button" (click)="registerSyncInterest()" [attr.aria-pressed]="syncInterestSent()"
                                    class="w-full flex items-center justify-between gap-4 p-5 rounded-2xl text-left group transition-all cursor-pointer
                                           bg-brand-50/70 dark:bg-brand-700/15 border border-brand-100 dark:border-brand-800/50
                                           hover:border-brand-300 dark:hover:border-brand-600
                                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ochre-500/60">
                                <div class="min-w-0">
                                    <div class="flex flex-wrap items-center gap-2 mb-2">
                                        <span class="inline-flex items-center px-2.5 py-1 rounded-full bg-ochre-50 dark:bg-ochre-500/15 text-ochre-700 dark:text-ochre-400 text-xs font-semibold">
                                            {{ t('addAssets.dualPath.soonChip') }}
                                        </span>
                                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-positive/10 text-positive-700 dark:text-positive-400 text-xs font-semibold">
                                            <i class="pi pi-lock text-[10px]" aria-hidden="true"></i>
                                            {{ t('addAssets.institutionList.secureConnection') }}
                                        </span>
                                    </div>
                                    <div class="font-bold text-surface-900 dark:text-surface-0 text-lg">
                                        {{ pathChooser() === 'mobile_money' ? t('addAssets.dualPath.syncMomoTitle') : t('addAssets.dualPath.syncBankTitle') }}
                                    </div>
                                    <div class="text-surface-600 dark:text-surface-300 text-sm mt-0.5">
                                        {{ pathChooser() === 'mobile_money' ? t('addAssets.dualPath.syncMomoDesc') : t('addAssets.dualPath.syncBankDesc') }}
                                    </div>
                                    @if (syncInterestSent()) {
                                        <div class="flex items-center gap-2 mt-2 text-positive text-sm font-medium" role="status">
                                            <i class="pi pi-check-circle" aria-hidden="true"></i>
                                            {{ t('addAssets.dualPath.thanks') }}
                                        </div>
                                    } @else {
                                        <div class="text-surface-600 dark:text-surface-300 text-xs mt-2">{{ t('addAssets.dualPath.notifyHint') }}</div>
                                    }
                                </div>
                                <div class="w-11 h-11 rounded-xl bg-brand-100 dark:bg-brand-700/25 flex items-center justify-center shrink-0">
                                    <i class="pi {{ pathChooser() === 'mobile_money' ? 'pi-mobile' : 'pi-building-columns' }} text-lg text-brand-700 dark:text-ochre-400" aria-hidden="true"></i>
                                </div>
                            </button>

                            <!-- Manual card: the path that works today -->
                            <button type="button" (click)="chooseManualPath()"
                                    class="w-full flex items-center justify-between gap-4 p-5 rounded-2xl text-left group transition-all cursor-pointer
                                           bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800
                                           hover:border-brand-300 dark:hover:border-brand-700
                                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ochre-500/60">
                                <div class="min-w-0">
                                    <div class="font-bold text-surface-900 dark:text-surface-0 text-lg">{{ t('addAssets.dualPath.manualTitle') }}</div>
                                    <div class="text-surface-500 dark:text-surface-400 text-sm mt-0.5">{{ t('addAssets.dualPath.manualDesc') }}</div>
                                </div>
                                <i class="pi pi-chevron-right text-xl text-surface-400 group-hover:text-brand-600 dark:group-hover:text-ochre-400 transition-colors shrink-0" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                }

                <!-- ===== STEP 0: Category Picker (S7b PA-1: store-like catalog) ===== -->
                @if (currentStep() === 0 && !pathChooser()) {
                    <div class="max-w-4xl mx-auto">
                        <!-- Aspirational, honest subheader -->
                        <p class="text-surface-500 dark:text-surface-400 text-[15px] leading-relaxed -mt-3 mb-6">
                            {{ t('addAssets.wizard.subtitle') }}
                        </p>

                        <!-- Search -->
                        <div class="relative mb-8">
                            <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" aria-hidden="true"></i>
                            <input pInputText
                                   [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)"
                                   [placeholder]="t('addAssets.searchPlaceholder')"
                                   [attr.aria-label]="t('addAssets.searchPlaceholder')"
                                   class="w-full !pl-11 !py-3.5 !bg-surface-50 dark:!bg-surface-800 !border-surface-200 dark:!border-surface-700 !rounded-xl text-sm" />
                        </div>

                        <!-- Catalog grid: one strong duotone icon tile per class, chevron affordance -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            @for (cat of filteredCategories(); track cat.value) {
                                <button type="button"
                                        (click)="selectCategory(cat.value)"
                                        class="omaad-press flex items-center gap-4 p-4 sm:p-5 rounded-2xl border border-surface-200 dark:border-surface-700
                                               bg-surface-0 dark:bg-surface-900
                                               hover:border-ochre-300 dark:hover:border-ochre-500/50 hover:shadow-card hover:-translate-y-px
                                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ochre-500/60
                                               transition-all duration-200 text-left group cursor-pointer">
                                    <!-- Duotone icon tile -->
                                    <div class="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl {{ cat.bgClass }}
                                                flex items-center justify-center
                                                group-hover:scale-105 transition-transform duration-200 motion-reduce:transform-none">
                                        <i class="pi {{ cat.icon }} {{ cat.textClass }} text-xl sm:text-2xl" aria-hidden="true"></i>
                                    </div>
                                    <!-- Label + descriptor -->
                                    <div class="flex-1 min-w-0">
                                        <h3 class="font-bold text-surface-900 dark:text-surface-0 text-[15px] mb-0.5 truncate">{{ cat.label }}</h3>
                                        <p class="text-surface-500 dark:text-surface-400 text-[13px] leading-snug line-clamp-2 m-0">{{ cat.desc }}</p>
                                    </div>
                                    <!-- Chevron affordance -->
                                    <i class="pi pi-chevron-right text-xs text-surface-300 dark:text-surface-600
                                              group-hover:text-ochre-500 group-hover:translate-x-0.5
                                              transition-all duration-200 shrink-0 motion-reduce:transform-none" aria-hidden="true"></i>
                                </button>
                            }
                        </div>

                        @if (filteredCategories().length === 0) {
                            <div class="text-center py-12 text-surface-400">
                                <i class="pi pi-search text-2xl mb-3 block" aria-hidden="true"></i>
                                <p class="text-sm">{{ t('addAssets.wizard.noTypeFound') }}</p>
                            </div>
                        }
                    </div>
                }

                <!-- ===== STEPS 1 & 2: Form ===== -->
                @if ((currentStep() === 1 || currentStep() === 2) && !isRealEstate()) {
                    <div class="max-w-5xl mx-auto lg:pt-4">
                        <div class="flex flex-col lg:flex-row gap-6 lg:gap-16">
                            <!-- Step sidebar -->
                            <div class="w-full lg:w-56 shrink-0">
                                <div class="flex lg:flex-col gap-3">
                                    <button type="button"
                                            class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left w-full"
                                            [ngClass]="currentStep() === 1 ? 'bg-brand-100 dark:bg-brand-700/20 text-brand-700 dark:text-ochre-400 font-semibold' : 'text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700'"
                                            (click)="goToStep(1)">
                                        <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                              [ngClass]="currentStep() === 1 ? 'bg-brand-700 text-white' : 'bg-surface-200 dark:bg-surface-600 text-surface-600 dark:text-surface-300'">1</span>
                                        <span class="text-sm">{{ t('addAssets.wizard.details') }}</span>
                                    </button>
                                    <button type="button"
                                            class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left w-full"
                                            [ngClass]="currentStep() === 2 ? 'bg-brand-100 dark:bg-brand-700/20 text-brand-700 dark:text-ochre-400 font-semibold' : 'text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700'"
                                            (click)="goToStep(2)"
                                            [disabled]="!isStep1Valid()">
                                        <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                              [ngClass]="currentStep() === 2 ? 'bg-brand-700 text-white' : 'bg-surface-200 dark:bg-surface-600 text-surface-600 dark:text-surface-300'">2</span>
                                        <span class="text-sm">{{ t('addAssets.wizard.ownership') }}</span>
                                    </button>
                                </div>
                            </div>

                            <!-- Form content (omaad-quiet-form: hairline rows win
                                 over the global input-radius skin, see _design-system.scss) -->
                            <div class="flex-1 omaad-quiet-form">
                                <!-- Step 1: Per-category form -->
                                @if (currentStep() === 1) {
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-7">
                                        <!-- Name (always). BRVM (S9-B1): a static tappable row opens
                                             a full-screen search sheet (Finary-style); the form never
                                             expands or shifts. "Autre" is handled inside the sheet. -->
                                        @if (assetForm.category === 'stocks_brvm') {
                                        <div class="flex flex-col gap-2 md:col-span-2">
                                            <span id="aa-brvm-label" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.brvm.pickLabel') }} <span class="text-negative">*</span></span>
                                            <button type="button" (click)="openBrvmSheet()" aria-labelledby="aa-brvm-label" [attr.aria-haspopup]="'dialog'"
                                                    class="w-full flex items-center justify-between gap-3 py-3 text-left cursor-pointer
                                                           border-b border-surface-300 dark:border-surface-600
                                                           focus-visible:outline-none focus-visible:border-brand-700 dark:focus-visible:border-ochre-400 transition-colors">
                                                <span class="truncate" [class.text-surface-500]="!assetForm.name" [class.dark:text-surface-400]="!assetForm.name">
                                                    {{ assetForm.name || t('addAssets.brvm.pickPlaceholder') }}
                                                </span>
                                                <span class="flex items-center gap-2 shrink-0">
                                                    @if (assetForm.ticker) {
                                                        <span class="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-ochre-50 text-ochre-700 dark:bg-ochre-500/15 dark:text-ochre-300">{{ assetForm.ticker }}</span>
                                                    }
                                                    <i class="pi pi-chevron-right text-surface-400 !text-xs" aria-hidden="true"></i>
                                                </span>
                                            </button>
                                        </div>
                                        } @else {
                                        <div class="flex flex-col gap-2 md:col-span-2">
                                            <label for="aa-name" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.fields.name') }} <span class="text-negative">*</span></label>
                                            <input pInputText id="aa-name" [(ngModel)]="assetForm.name" [placeholder]="namePlaceholder()"
                                                   class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                        </div>
                                        }

                                        <!-- Currency now lives as a tappable chip inside each amount
                                             field (PA-2): defaults to the user's preference, one tap
                                             to change. The old full-width Devise row is gone. -->

                                        <!-- TONTINE -->
                                        @if (assetForm.category === 'tontine') {
                                            <div class="flex flex-col gap-2">
                                                <label for="aa-t-monthly" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.tontineMonthly') }} <span class="text-negative">*</span></label>
                                                <div class="relative">
                                                    <p-inputnumber inputId="aa-t-monthly" styleClass="w-full" [(ngModel)]="assetForm.tontineMonthlyContribution" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-24" />
                                                    <app-currency-suffix [(currency)]="assetForm.currency" [ariaLabel]="t('addAssets.wizard.currency')" />
                                                </div>
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label for="aa-t-participants" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.tontineParticipants') }} <span class="text-negative">*</span></label>
                                                <p-inputnumber inputId="aa-t-participants" styleClass="w-full" [(ngModel)]="assetForm.tontineParticipants" [min]="2" [max]="100"
                                                    inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label for="aa-t-start" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.startDate') }} <span class="text-negative">*</span></label>
                                                <p-datepicker inputId="aa-t-start" [touchUI]="isTouch" [readonlyInput]="isTouch" [(ngModel)]="tontineStartDateObj" [showIcon]="true" [showButtonBar]="true"
                                                       dateFormat="yy-mm-dd" styleClass="w-full"
                                                       inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label for="aa-t-freq" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.frequency') }}</label>
                                                <p-select inputId="aa-t-freq" [(ngModel)]="assetForm.tontineFrequency" [options]="tontineFrequencyOptions()" optionLabel="label" optionValue="value"
                                                    styleClass="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !shadow-none" />
                                            </div>
                                            @if (assetForm.tontineStartDate && assetForm.tontineMonthlyContribution > 0) {
                                                <div class="md:col-span-2 p-3 rounded-xl bg-brand-50 dark:bg-brand-900/40 border border-brand-100 dark:border-brand-800 flex items-center gap-3">
                                                    <i class="pi pi-calculator text-brand-700 dark:text-brand-300"></i>
                                                    <div>
                                                        <p class="text-xs text-surface-600 dark:text-surface-400 mb-0.5">{{ t('addAssets.wizard.estimatedAccumulated') }}</p>
                                                        <p class="font-bold text-brand-700 dark:text-brand-300">
                                                            {{ tontineCurrentValue() | number:'1.0-0' }} {{ curSymbol() }}
                                                            <span class="text-xs font-normal text-surface-600 dark:text-surface-400">({{ tontineMonthsElapsed() }} {{ t('addAssets.wizard.moShort') }} × {{ assetForm.tontineMonthlyContribution | number:'1.0-0' }})</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            }
                                        }

                                        <!-- MOBILE MONEY -->
                                        @if (assetForm.category === 'mobile_money') {
                                            <div class="flex flex-col gap-2">
                                                <label for="aa-mm-provider" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.provider') }} <span class="text-negative">*</span></label>
                                                <p-select inputId="aa-mm-provider" [(ngModel)]="assetForm.mobileMoneyProvider" [options]="mobileMoneyProviders" optionLabel="label" optionValue="value"
                                                    [placeholder]="t('addAssets.wizard.selectProvider')"
                                                    styleClass="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !shadow-none" />
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label for="aa-mm-balance" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.currentBalance') }} <span class="text-negative">*</span></label>
                                                <div class="relative">
                                                    <p-inputnumber inputId="aa-mm-balance" styleClass="w-full" [(ngModel)]="assetForm.currentPrice" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-24" />
                                                    <app-currency-suffix [(currency)]="assetForm.currency" [ariaLabel]="t('addAssets.wizard.currency')" />
                                                </div>
                                            </div>
                                            <div class="md:col-span-2 flex items-center gap-2 text-xs text-surface-400">
                                                <i class="pi pi-info-circle text-brand-700 dark:text-brand-300"></i>
                                                {{ t('addAssets.wizard.mobileMoneyNote') }}
                                            </div>
                                        }

                                        <!-- QUANTITY-BASED -->
                                        @if (isQuantityBased()) {
                                            <div class="flex flex-col gap-2">
                                                <label for="aa-qty" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.fields.quantity') }}</label>
                                                <p-inputnumber inputId="aa-qty" styleClass="w-full" [ngModel]="assetForm.quantity" (ngModelChange)="assetForm.quantity = ($event == null || $event < 1) ? 1 : $event"
                                                    mode="decimal" [minFractionDigits]="0" [maxFractionDigits]="0" [min]="1" [allowEmpty]="false"
                                                    inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                @if (assetForm.category === 'stocks_brvm') {
                                                <!-- BRVM (S9-B1): current value per share leads; purchase
                                                     price is demoted to the optional details below. -->
                                                <label for="aa-unit-cur-ess" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.brvm.currentPricePerShare') }} <span class="text-negative">*</span></label>
                                                <div class="relative">
                                                    <p-inputnumber inputId="aa-unit-cur-ess" styleClass="w-full" [(ngModel)]="assetForm.currentPrice" [min]="0" mode="decimal" [minFractionDigits]="0" [maxFractionDigits]="2"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-24" />
                                                    <app-currency-suffix [(currency)]="assetForm.currency" [ariaLabel]="t('addAssets.wizard.currency')" />
                                                </div>
                                                } @else {
                                                <label for="aa-unit-buy" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.unitPurchasePrice') }} <span class="text-negative">*</span></label>
                                                <div class="relative">
                                                    <p-inputnumber inputId="aa-unit-buy" styleClass="w-full" [(ngModel)]="assetForm.purchasePrice" mode="decimal" [minFractionDigits]="0" [maxFractionDigits]="2"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-24" />
                                                    <app-currency-suffix [(currency)]="assetForm.currency" [ariaLabel]="t('addAssets.wizard.currency')" />
                                                </div>
                                                }
                                            </div>
                                        }

                                        <!-- SIMPLE BALANCE (cash, savings_account) -->
                                        @if (assetForm.category === 'cash' || assetForm.category === 'savings_account') {
                                            <div class="flex flex-col gap-2">
                                                <label for="aa-balance" class="text-surface-500 dark:text-surface-400 text-sm font-medium">
                                                    {{ assetForm.category === 'cash' ? (t('addAssets.wizard.currentBalance')) : (t('addAssets.wizard.savingsAmount')) }} <span class="text-negative">*</span>
                                                </label>
                                                <div class="relative">
                                                    <p-inputnumber inputId="aa-balance" styleClass="w-full" [(ngModel)]="assetForm.currentPrice" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-24" />
                                                    <app-currency-suffix [(currency)]="assetForm.currency" [ariaLabel]="t('addAssets.wizard.currency')" />
                                                </div>
                                            </div>
                                        }
                                        <!-- PA-4: the bank name is optional and lives in the
                                             details disclosure; balance essentials stay 2 fields. -->

                                        <!-- TOTAL-VALUE-BASED (PA-4: purchase value is an essential
                                             ONLY where owners actually anchor on it, immobilier and
                                             vehicule; for the rest it is demoted to details per the
                                             section-13 decision and current value leads alone). -->
                                        @if (isTotalValueBased()) {
                                            @if (purchaseLedClass()) {
                                            <div class="flex flex-col gap-2">
                                                <label for="aa-buy" class="text-surface-500 dark:text-surface-400 text-sm font-medium">
                                                    {{ t('addAssets.wizard.purchaseInitialValue') }}
                                                    <span class="text-negative">*</span>
                                                </label>
                                                <div class="relative">
                                                    <p-inputnumber inputId="aa-buy" styleClass="w-full" [(ngModel)]="assetForm.purchasePrice" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-24" />
                                                    <app-currency-suffix [(currency)]="assetForm.currency" [ariaLabel]="t('addAssets.wizard.currency')" />
                                                </div>
                                            </div>
                                            }
                                            <div class="flex flex-col gap-2">
                                                <label for="aa-current" class="text-surface-500 dark:text-surface-400 text-sm font-medium">
                                                    {{ t('addAssets.fields.currentValue') }}
                                                    @if (assetForm.category === 'real_estate' || assetForm.category === 'vehicle') {
                                                        <span class="text-surface-500 dark:text-surface-400 text-xs">{{ t('addAssets.wizard.optional') }}</span>
                                                    } @else {
                                                        <span class="text-negative">*</span>
                                                    }
                                                </label>
                                                <div class="relative">
                                                    <p-inputnumber inputId="aa-current" styleClass="w-full" [(ngModel)]="assetForm.currentPrice" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-24" />
                                                    <app-currency-suffix [(currency)]="assetForm.currency" [ariaLabel]="t('addAssets.wizard.currency')" />
                                                </div>
                                            </div>
                                        }

                                    </div>

                                    <!-- ===== Détails (optionnel): progressive disclosure (S7b PA-2). Purchase
                                         date, institution, current unit value, RE specifics and tontine
                                         secondary fields live here, collapsed by default (§13: never make
                                         users feel homework is required). ===== -->
                                    @if (detailsAvailable()) {
                                        <div class="mt-6">
                                            <button type="button" (click)="detailsOpen.set(!detailsOpen())"
                                                    class="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 dark:text-ochre-400
                                                           hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ochre-500/60 rounded"
                                                    [attr.aria-expanded]="detailsOpen()">
                                                <i class="pi text-xs transition-transform duration-200 motion-reduce:transition-none"
                                                   [ngClass]="detailsOpen() ? 'pi-chevron-down' : 'pi-chevron-right'" aria-hidden="true"></i>
                                                {{ detailsOpen() ? t('addAssets.wizard.detailsHide') : t('addAssets.wizard.detailsOptional') }}
                                            </button>

                                            @if (detailsOpen()) {
                                                <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                                                    <!-- Current unit value (quantity-based). For BRVM this
                                                         leads as an essential above, so it is not repeated here. -->
                                                    @if (isQuantityBased() && assetForm.category !== 'stocks_brvm') {
                                                        <div class="flex flex-col gap-2">
                                                            <label for="aa-unit-cur" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.currentUnitValue') }}</label>
                                                            <div class="relative">
                                                                <p-inputnumber inputId="aa-unit-cur" styleClass="w-full" [(ngModel)]="assetForm.currentPrice" mode="decimal" [minFractionDigits]="0" [maxFractionDigits]="2"
                                                                    inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-24" />
                                                                <app-currency-suffix [(currency)]="assetForm.currency" [ariaLabel]="t('addAssets.wizard.currency')" />
                                                            </div>
                                                        </div>
                                                    }

                                                    <!-- BRVM (S9-B1): purchase price per share, optional. Affects
                                                         performance history only; current value is what leads. -->
                                                    @if (assetForm.category === 'stocks_brvm') {
                                                        <div class="flex flex-col gap-2">
                                                            <label for="aa-brvm-buy" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.brvm.purchasePricePerShare') }}</label>
                                                            <div class="relative">
                                                                <p-inputnumber inputId="aa-brvm-buy" styleClass="w-full" [(ngModel)]="assetForm.purchasePrice" [min]="0" mode="decimal" [minFractionDigits]="0" [maxFractionDigits]="2"
                                                                    inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-24" />
                                                                <app-currency-suffix [(currency)]="assetForm.currency" [ariaLabel]="t('addAssets.wizard.currency')" />
                                                            </div>
                                                        </div>
                                                    }

                                                    <!-- Purchase date -->
                                                    @if (assetForm.category !== 'mobile_money' && assetForm.category !== 'tontine' && !isSimpleBalanceCategory()) {
                                                        <div class="flex flex-col gap-2">
                                                            <label for="aa-buy-date" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.fields.purchaseDate') }}</label>
                                                            <p-datepicker inputId="aa-buy-date" [touchUI]="isTouch" [readonlyInput]="isTouch" [(ngModel)]="purchaseDateObj" [showIcon]="true" [showButtonBar]="true"
                                                                   dateFormat="yy-mm-dd" styleClass="w-full"
                                                                   inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                                        </div>
                                                    }

                                                    <!-- Purchase value, demoted for non-purchase-led
                                                         total-value classes (PA-4, section-13) -->
                                                    @if (isTotalValueBased() && !purchaseLedClass()) {
                                                        <div class="flex flex-col gap-2">
                                                            <label for="aa-buy" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.purchaseInitialValue') }}</label>
                                                            <div class="relative">
                                                                <p-inputnumber inputId="aa-buy" styleClass="w-full" [(ngModel)]="assetForm.purchasePrice" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                                    inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-24" />
                                                                <app-currency-suffix [(currency)]="assetForm.currency" [ariaLabel]="t('addAssets.wizard.currency')" />
                                                            </div>
                                                        </div>
                                                    }

                                                    <!-- Institution -->
                                                    @if (isInstitutionBased()) {
                                                        <div class="flex flex-col gap-2">
                                                            <label for="aa-institution" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ institutionLabel() }}</label>
                                                            <input pInputText id="aa-institution" [(ngModel)]="assetForm.institution" [placeholder]="institutionPlaceholder()"
                                                                   class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                                        </div>
                                                    }

                                                    <!-- Tontine secondary fields -->
                                                    @if (assetForm.category === 'tontine') {
                                                        <div class="flex flex-col gap-2">
                                                            <label for="aa-t-payout" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.payoutDate') }}</label>
                                                            <p-datepicker inputId="aa-t-payout" [touchUI]="isTouch" [readonlyInput]="isTouch" [(ngModel)]="tontineCollectionDateObj" [showIcon]="true" [showButtonBar]="true"
                                                                   dateFormat="yy-mm-dd" styleClass="w-full"
                                                                   inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                                        </div>
                                                        <div class="flex flex-col gap-2">
                                                            <label for="aa-t-status" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.status') }}</label>
                                                            <p-select inputId="aa-t-status" [(ngModel)]="assetForm.tontineStatus" [options]="tontineStatusOptions" optionLabel="label" optionValue="value"
                                                                styleClass="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !shadow-none" />
                                                        </div>
                                                    }

                                                    <!-- Real estate specifics -->
                                                    @if (assetForm.category === 'real_estate') {
                                                        <div class="flex flex-col gap-2">
                                                            <label for="aa-surface" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.area') }}</label>
                                                            <p-inputnumber inputId="aa-surface" styleClass="w-full" [(ngModel)]="assetForm.surfaceM2" [min]="0" [minFractionDigits]="0" [maxFractionDigits]="1" suffix=" m²" placeholder="Ex : 150"
                                                                inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                                        </div>
                                                        @if (assetForm.surfaceM2 > 0 && assetForm.purchasePrice > 0) {
                                                            <div class="flex items-center justify-between px-1 py-2 rounded-lg bg-brand-50/60 dark:bg-brand-900/30 border border-brand-100 dark:border-brand-800">
                                                                <span class="text-surface-500 dark:text-surface-400 text-xs">{{ t('addAssets.wizard.pricePerM2') }}</span>
                                                                <span class="text-brand-700 dark:text-brand-300 font-semibold text-sm">
                                                                    {{ (assetForm.purchasePrice / assetForm.surfaceM2) | number:'1.0-0' }} {{ curSymbol() }}/m²
                                                                </span>
                                                            </div>
                                                        }
                                                        <div class="flex flex-col gap-2">
                                                            <label for="aa-region" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.wizard.region') }}</label>
                                                            <input pInputText id="aa-region" [(ngModel)]="assetForm.region" placeholder="Ex : Dakar, Abidjan, Paris..."
                                                                   class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                                        </div>
                                                    }
                                                </div>
                                            }
                                        </div>
                                    }
                                }

                                <!-- Step 2: Ownership -->
                                @if (currentStep() === 2) {
                                    <div class="space-y-6">
                                        <div class="flex items-center justify-center mb-6">
                                            <div class="flex flex-col items-center">
                                                <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 {{ selectedCard()?.bgClass ?? 'bg-surface-200 dark:bg-surface-700' }}">
                                                    <i class="pi {{ selectedCard()?.icon ?? 'pi-box' }} text-2xl {{ selectedCard()?.textClass ?? 'text-surface-500' }}"></i>
                                                </div>
                                                <span class="text-surface-500 dark:text-surface-400 text-sm">{{ assetForm.name || (t('addAssets.wizard.assetFallback')) }}</span>
                                                <span class="text-2xl font-bold text-surface-900 dark:text-surface-0 mt-1">
                                                    <app-amount [value]="toEur(totalValue())" />
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 class="text-surface-500 dark:text-surface-400 text-sm mb-4">{{ t('addAssets.wizard.owners') }}</h3>
                                            <div class="space-y-3">
                                                @for (owner of assetForm.owners; track owner.name) {
                                                    <div class="flex items-center justify-between p-4 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                                                        <div class="flex items-center gap-3">
                                                            <div class="w-10 h-10 rounded-full bg-brand-700 dark:bg-brand-300 flex items-center justify-center">
                                                                <span class="text-white font-semibold text-sm">{{ owner.initials }}</span>
                                                            </div>
                                                            <div>
                                                                <span class="font-medium text-surface-900 dark:text-surface-0">{{ owner.name }}</span>
                                                                <span class="text-surface-500 dark:text-surface-400 text-sm block">{{ owner.percentage | number:'1.2-2' }} %</span>
                                                            </div>
                                                        </div>
                                                        @if (assetForm.owners.length > 1) {
                                                            <button type="button" class="w-8 h-8 rounded-full hover:bg-surface-200 dark:hover:bg-surface-700 flex items-center justify-center transition-colors"
                                                                    (click)="removeOwner(owner)">
                                                                <i class="pi pi-times text-surface-400"></i>
                                                            </button>
                                                        }
                                                    </div>
                                                }
                                            </div>
                                        </div>

                                        <div>
                                            <h3 class="text-surface-500 dark:text-surface-400 text-sm mb-4">{{ t('addAssets.wizard.coOwners') }}</h3>
                                            <button type="button" (click)="addMember()"
                                                    class="flex items-center gap-3 p-4 rounded-xl border border-dashed border-surface-300 dark:border-surface-600 hover:border-brand-700 hover:bg-brand-700/5 transition-all w-full">
                                                <div class="w-10 h-10 rounded-full border-2 border-surface-300 dark:border-surface-600 flex items-center justify-center">
                                                    <i class="pi pi-plus text-surface-400"></i>
                                                </div>
                                                <span class="text-surface-600 dark:text-surface-300">{{ t('addAssets.wizard.addCoOwner') }}</span>
                                            </button>
                                        </div>
                                    </div>
                                }
                            </div>
                        </div>
                    </div>
                }

                <!-- ===== REAL ESTATE: multi-section wizard (Finary-style). Left-rail
                     sections, spacious two-column fields; Type/Usage/rooms/loan are
                     stored frontend-only in notes JSON. ===== -->
                @if (isRealEstate() && currentStep() === 1) {
                    <div class="max-w-5xl mx-auto lg:pt-4">
                        <div class="flex flex-col lg:flex-row gap-6 lg:gap-16">
                            <!-- Section rail -->
                            <div class="w-full lg:w-60 shrink-0">
                                <div class="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
                                    @for (sec of reSections; track sec.n) {
                                        <button type="button" (click)="goReSection(sec.n)" [disabled]="sec.n > reMaxSection()"
                                                class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left shrink-0 lg:w-full disabled:opacity-40 disabled:cursor-not-allowed"
                                                [ngClass]="reSection() === sec.n ? 'bg-brand-100 dark:bg-brand-700/20 text-brand-700 dark:text-ochre-400 font-semibold' : 'text-surface-500 dark:text-surface-400 hover:enabled:bg-surface-100 dark:hover:enabled:bg-surface-700'">
                                            <span class="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                                                  [ngClass]="reSection() === sec.n ? 'bg-brand-700 text-white' : (sec.n < reMaxSection() ? 'bg-positive/15 text-positive-700 dark:text-positive-400' : 'bg-surface-200 dark:bg-surface-600 text-surface-600 dark:text-surface-300')">
                                                @if (sec.n < reMaxSection()) { <i class="pi pi-check !text-xs" aria-hidden="true"></i> }
                                                @else { <i class="pi {{ sec.icon }} !text-xs" aria-hidden="true"></i> }
                                            </span>
                                            <span class="text-sm whitespace-nowrap">{{ t('addAssets.re.sections.' + sec.key) }}</span>
                                        </button>
                                    }
                                </div>
                            </div>

                            <!-- Section content -->
                            <div class="flex-1 omaad-quiet-form">
                                <h2 class="text-lg font-bold text-surface-900 dark:text-surface-0 mb-6">{{ t('addAssets.re.sections.' + reSections[reSection() - 1].key) }}</h2>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-7">
                                    @switch (reSection()) {
                                        @case (1) {
                                            <div class="flex flex-col gap-2 md:col-span-2">
                                                <label for="re-name" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.fields.name') }} <span class="text-negative">*</span></label>
                                                <input pInputText id="re-name" [(ngModel)]="assetForm.name" placeholder="Ex : Appartement Dakar Plateau"
                                                       class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                            </div>
                                            <div class="flex flex-col gap-2 md:col-span-2">
                                                <label for="re-desc" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.re.fields.description') }} <span class="text-surface-500 dark:text-surface-400 text-xs">{{ t('addAssets.wizard.optional') }}</span></label>
                                                <input pInputText id="re-desc" [(ngModel)]="assetForm.description" [placeholder]="t('addAssets.re.fields.descriptionPh')"
                                                       class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label for="re-type" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.re.fields.type') }}</label>
                                                <p-select inputId="re-type" [(ngModel)]="assetForm.reType" [options]="reTypeOptions" optionLabel="label" optionValue="value"
                                                          [placeholder]="t('addAssets.re.fields.typePh')" appendTo="body"
                                                          styleClass="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !shadow-none" />
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label for="re-usage" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.re.fields.usage') }}</label>
                                                <p-select inputId="re-usage" [(ngModel)]="assetForm.reUsage" [options]="reUsageOptions" optionLabel="label" optionValue="value"
                                                          [placeholder]="t('addAssets.re.fields.usagePh')" appendTo="body"
                                                          styleClass="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !shadow-none" />
                                            </div>
                                        }
                                        @case (2) {
                                            <div class="flex flex-col gap-2">
                                                <label for="re-surface" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.re.fields.surface') }}</label>
                                                <p-inputnumber inputId="re-surface" styleClass="w-full" [(ngModel)]="assetForm.surfaceM2" [min]="0" [minFractionDigits]="0" [maxFractionDigits]="1" suffix=" m²"
                                                    inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label for="re-rooms" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.re.fields.rooms') }}</label>
                                                <p-inputnumber inputId="re-rooms" styleClass="w-full" [(ngModel)]="assetForm.reRooms" [min]="0" [maxFractionDigits]="0" [useGrouping]="false"
                                                    inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label for="re-year" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.re.fields.year') }}</label>
                                                <p-select inputId="re-year" [(ngModel)]="assetForm.reConstructionDate" [options]="reYearOptions" optionLabel="label" optionValue="value"
                                                          [filter]="true" [resetFilterOnHide]="true" [placeholder]="t('addAssets.re.fields.yearPh')" appendTo="body"
                                                          styleClass="w-full !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !shadow-none" />
                                            </div>
                                        }
                                        @case (3) {
                                            <div class="flex flex-col gap-2">
                                                <label for="re-buy" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.re.fields.purchaseValue') }}</label>
                                                <div class="relative">
                                                    <p-inputnumber inputId="re-buy" styleClass="w-full" [(ngModel)]="assetForm.purchasePrice" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-24" />
                                                    <app-currency-suffix [(currency)]="assetForm.currency" [ariaLabel]="t('addAssets.wizard.currency')" />
                                                </div>
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label for="re-cur" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.re.fields.currentValue') }} <span class="text-surface-500 dark:text-surface-400 text-xs">{{ t('addAssets.wizard.optional') }}</span></label>
                                                <div class="relative">
                                                    <p-inputnumber inputId="re-cur" styleClass="w-full" [(ngModel)]="assetForm.currentPrice" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-24" />
                                                    <app-currency-suffix [(currency)]="assetForm.currency" [ariaLabel]="t('addAssets.wizard.currency')" />
                                                </div>
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label for="re-date" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.fields.purchaseDate') }}</label>
                                                <p-datepicker inputId="re-date" [touchUI]="isTouch" [readonlyInput]="isTouch" [(ngModel)]="purchaseDateObj" [showIcon]="true" [showButtonBar]="true"
                                                       dateFormat="yy-mm-dd" styleClass="w-full" appendTo="body"
                                                       inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                            </div>
                                        }
                                        @case (4) {
                                            <div class="flex flex-col gap-2">
                                                <label for="re-agency" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.re.fields.agency') }}</label>
                                                <div class="relative">
                                                    <p-inputnumber inputId="re-agency" styleClass="w-full" [(ngModel)]="assetForm.reAgencyFees" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-24" />
                                                    <app-currency-suffix [(currency)]="assetForm.currency" [ariaLabel]="t('addAssets.wizard.currency')" />
                                                </div>
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label for="re-notary" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.re.fields.notary') }}</label>
                                                <div class="relative">
                                                    <p-inputnumber inputId="re-notary" styleClass="w-full" [(ngModel)]="assetForm.reNotaryFees" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-24" />
                                                    <app-currency-suffix [(currency)]="assetForm.currency" [ariaLabel]="t('addAssets.wizard.currency')" />
                                                </div>
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label for="re-reno" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.re.fields.renovation') }}</label>
                                                <div class="relative">
                                                    <p-inputnumber inputId="re-reno" styleClass="w-full" [(ngModel)]="assetForm.reRenovationFees" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-24" />
                                                    <app-currency-suffix [(currency)]="assetForm.currency" [ariaLabel]="t('addAssets.wizard.currency')" />
                                                </div>
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label for="re-furn" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.re.fields.furnishing') }}</label>
                                                <div class="relative">
                                                    <p-inputnumber inputId="re-furn" styleClass="w-full" [(ngModel)]="assetForm.reFurnishingCosts" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-24" />
                                                    <app-currency-suffix [(currency)]="assetForm.currency" [ariaLabel]="t('addAssets.wizard.currency')" />
                                                </div>
                                            </div>
                                        }
                                        @case (5) {
                                            <div class="md:col-span-2 flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400 -mb-2">
                                                <i class="pi pi-info-circle" aria-hidden="true"></i>{{ t('addAssets.re.fields.financingHint') }}
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label for="re-loan" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.re.fields.loanAmount') }}</label>
                                                <div class="relative">
                                                    <p-inputnumber inputId="re-loan" styleClass="w-full" [(ngModel)]="assetForm.loanAmount" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-24" />
                                                    <app-currency-suffix [(currency)]="assetForm.currency" [ariaLabel]="t('addAssets.wizard.currency')" />
                                                </div>
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label for="re-rate" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.re.fields.loanRate') }}</label>
                                                <p-inputnumber inputId="re-rate" styleClass="w-full" [(ngModel)]="assetForm.loanRate" [min]="0" [max]="100" [minFractionDigits]="0" [maxFractionDigits]="2" suffix=" %"
                                                    inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label for="re-month" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.re.fields.loanMonthly') }}</label>
                                                <div class="relative">
                                                    <p-inputnumber inputId="re-month" styleClass="w-full" [(ngModel)]="assetForm.loanMonthly" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-24" />
                                                    <app-currency-suffix [(currency)]="assetForm.currency" [ariaLabel]="t('addAssets.wizard.currency')" />
                                                </div>
                                            </div>
                                        }
                                        @case (6) {
                                            <div class="md:col-span-2 flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400 -mb-2">
                                                <i class="pi pi-info-circle" aria-hidden="true"></i>{{ t('addAssets.re.fields.incomeHint') }}
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label for="re-rent" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.re.fields.rent') }}</label>
                                                <div class="relative">
                                                    <p-inputnumber inputId="re-rent" styleClass="w-full" [(ngModel)]="assetForm.reMonthlyRent" [min]="0" mode="decimal" [minFractionDigits]="0"
                                                        inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-24" />
                                                    <app-currency-suffix [(currency)]="assetForm.currency" [ariaLabel]="t('addAssets.wizard.currency')" />
                                                </div>
                                            </div>
                                        }
                                        @case (7) {
                                            <div class="flex flex-col gap-2 md:col-span-2">
                                                <label for="re-locality" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.re.fields.locality') }}</label>
                                                <input pInputText id="re-locality" [(ngModel)]="assetForm.region" placeholder="Ex : Dakar, Abidjan, Paris..."
                                                       class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                            </div>
                                            <div class="md:col-span-2 mt-2">
                                                <h3 class="text-surface-500 dark:text-surface-400 text-sm mb-3">{{ t('addAssets.wizard.owners') }}</h3>
                                                <div class="space-y-3">
                                                    @for (owner of assetForm.owners; track owner.name) {
                                                        <div class="flex items-center justify-between p-4 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                                                            <div class="flex items-center gap-3">
                                                                <div class="w-10 h-10 rounded-full bg-brand-700 dark:bg-brand-300 flex items-center justify-center">
                                                                    <span class="text-white dark:text-surface-900 font-semibold text-sm">{{ owner.initials }}</span>
                                                                </div>
                                                                <div>
                                                                    <span class="font-medium text-surface-900 dark:text-surface-0">{{ owner.name }}</span>
                                                                    <span class="text-surface-500 dark:text-surface-400 text-sm block">{{ owner.percentage | number:'1.2-2' }} %</span>
                                                                </div>
                                                            </div>
                                                            @if (assetForm.owners.length > 1) {
                                                                <button type="button" class="w-8 h-8 rounded-full hover:bg-surface-200 dark:hover:bg-surface-700 flex items-center justify-center transition-colors"
                                                                        (click)="removeOwner(owner)" [attr.aria-label]="t('common.delete')">
                                                                    <i class="pi pi-times text-surface-400" aria-hidden="true"></i>
                                                                </button>
                                                            }
                                                        </div>
                                                    }
                                                    <button type="button" (click)="addMember()"
                                                            class="flex items-center gap-3 p-4 rounded-xl border border-dashed border-surface-300 dark:border-surface-600 hover:border-brand-700 hover:bg-brand-700/5 transition-all w-full">
                                                        <div class="w-10 h-10 rounded-full border-2 border-surface-300 dark:border-surface-600 flex items-center justify-center">
                                                            <i class="pi pi-plus text-surface-400" aria-hidden="true"></i>
                                                        </div>
                                                        <span class="text-surface-600 dark:text-surface-300">{{ t('addAssets.wizard.addCoOwner') }}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        }
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                }

                <!-- ===== STEP 3: Success (PA-2). A rewarding finish instead of a
                     toast-and-vanish: what was added, and the two next moves. ===== -->
                @if (currentStep() === 3) {
                    <div class="max-w-md mx-auto text-center pt-10 sm:pt-16">
                        <div class="w-20 h-20 mx-auto rounded-full bg-positive/10 flex items-center justify-center mb-6
                                    animate-[omaad-pop_.35s_ease-out] motion-reduce:animate-none">
                            <i class="pi pi-check text-3xl text-positive" aria-hidden="true"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-1">{{ t('addAssets.wizard.successTitle') }}</h2>
                        <p class="text-surface-500 dark:text-surface-400 mb-2">{{ assetForm.name }}</p>
                        <p class="text-3xl font-bold text-surface-900 dark:text-surface-0 mb-8">
                            <app-amount [value]="toEur(totalValue())" />
                        </p>
                        <div class="flex flex-col gap-3">
                            <button pButton type="button" [label]="t('addAssets.wizard.viewPatrimoine')"
                                    class="omaad-cta !rounded-full w-full" (click)="goToPatrimoine()"></button>
                            <button pButton type="button" [label]="t('addAssets.wizard.addAnother')" [text]="true"
                                    class="!rounded-full w-full !text-brand-700 dark:!text-ochre-400" (click)="addAnother()"></button>
                        </div>
                    </div>
                }
            </div>

            <!-- Sticky CTA bar (PA-2): one always-reachable primary action, full
                 width on mobile, safe-area aware, quiet blur so content scrolls
                 beneath it without visual clash. -->
            @if (currentStep() === 1 || currentStep() === 2) {
                <div class="sticky bottom-0 z-10 -mx-4 px-4 mt-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]
                            bg-surface-50/90 dark:bg-surface-950/90 backdrop-blur
                            border-t border-surface-200 dark:border-surface-800">
                    <div class="max-w-5xl mx-auto flex items-center gap-3">
                        @if (isRealEstate()) {
                            <!-- Real-estate section wizard nav. On mobile the bar is a
                                 single full-width Submit/Suivant (native, per design);
                                 the header arrow handles going back a section. -->
                            <button pButton type="button" [label]="t('common.back')" [outlined]="true"
                                    class="!hidden sm:!inline-flex !rounded-full !border-surface-300 dark:!border-surface-600 shrink-0"
                                    (click)="rePrev()"></button>
                            @if (reSection() < RE_SECTION_COUNT) {
                                <button pButton type="button" [label]="t('addAssets.wizard.next')"
                                        class="omaad-cta !rounded-full flex-1 sm:flex-none sm:ml-auto sm:px-10"
                                        [disabled]="!reSectionValid(reSection())" (click)="reNext()"></button>
                            } @else {
                                <button pButton type="button" [label]="t('addAssets.wizard.submit')"
                                        class="omaad-cta !rounded-full flex-1 sm:flex-none sm:ml-auto sm:px-10"
                                        [disabled]="!isStep1Valid()" [loading]="isSubmitting()" (click)="submitAsset()"></button>
                            }
                        } @else if (currentStep() === 1) {
                            <button pButton type="button" [label]="t('addAssets.wizard.next')"
                                    class="omaad-cta !rounded-full flex-1 sm:flex-none sm:ml-auto sm:px-10"
                                    [disabled]="!isStep1Valid()" (click)="nextStep()"></button>
                        } @else {
                            <button pButton type="button" [label]="t('common.back')" [outlined]="true"
                                    class="!hidden sm:!inline-flex !rounded-full !border-surface-300 dark:!border-surface-600 shrink-0"
                                    (click)="previousStep()"></button>
                            <button pButton type="button" [label]="t('addAssets.wizard.submit')"
                                    class="omaad-cta !rounded-full flex-1 sm:flex-none sm:ml-auto sm:px-10"
                                    [loading]="isSubmitting()" (click)="submitAsset()"></button>
                        }
                    </div>
                </div>
            }

            <!-- BRVM stock picker sheet (S9-B1): full-screen Finary-style search,
                 rendered at body (appendTo) so it escapes the layout's transformed
                 ancestor and covers the whole app chrome on mobile AND desktop.
                 The form underneath never moves. -->
            <p-dialog [transitionOptions]="'320ms cubic-bezier(0.34, 1.30, 0.64, 1)'" [visible]="brvmSheetOpen()" (visibleChange)="brvmSheetOpen.set($event)" [modal]="true"
                      [draggable]="false" [resizable]="false" [showHeader]="false" [dismissableMask]="false"
                      [closeOnEscape]="true" appendTo="body" styleClass="brvm-sheet" [blockScroll]="true"
                      ariaLabelledBy="brvm-sheet-title" (onShow)="focusBrvmSearch()">
                <div class="flex flex-col h-full">
                    <!-- Top bar: back-to-form (chevron) + close (X), Finary-style -->
                    <div class="flex items-center justify-between gap-2 px-4 sm:px-6 pt-4 pb-1 shrink-0">
                        <button type="button" (click)="brvmOtherMode() ? brvmOtherMode.set(false) : closeBrvmSheet()"
                                [attr.aria-label]="t('common.back')"
                                class="w-9 h-9 -ml-2 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 cursor-pointer text-surface-600 dark:text-surface-300">
                            <i class="pi pi-chevron-left" aria-hidden="true"></i>
                        </button>
                        <button type="button" (click)="closeBrvmSheet()" [attr.aria-label]="t('common.close')"
                                class="w-9 h-9 flex items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 cursor-pointer text-surface-600 dark:text-surface-300">
                            <i class="pi pi-times !text-sm" aria-hidden="true"></i>
                        </button>
                    </div>

                    <!-- Centered content column (Finary: big title + generous space) -->
                    <div class="flex-1 min-h-0 overflow-y-auto">
                        <div class="w-full max-w-3xl mx-auto px-5 sm:px-8 pb-10">
                            <h2 id="brvm-sheet-title" class="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-0 mt-1 mb-6 sm:mb-8">{{ t('addAssets.brvm.sheetTitle') }}</h2>

                            @if (!brvmOtherMode()) {
                                <!-- Search with ochre underline (brand accent) -->
                                <div class="relative mb-6 sm:mb-8">
                                    <i class="pi pi-search absolute left-0 top-1/2 -translate-y-1/2 text-surface-400" aria-hidden="true"></i>
                                    <input #brvmSearchInput pInputText type="text" [ngModel]="brvmSearch()" (ngModelChange)="brvmSearch.set($event)"
                                           [attr.aria-label]="t('addAssets.brvm.searchPlaceholder')" [placeholder]="t('addAssets.brvm.searchPlaceholder')"
                                           class="w-full !text-base !py-3 !pl-8 !bg-transparent !border-0 !border-b-2 !border-ochre-300 dark:!border-ochre-500/50 !rounded-none focus:!border-ochre-500 dark:focus:!border-ochre-400 !shadow-none" />
                                </div>

                                <p class="text-sm text-surface-500 dark:text-surface-400 mb-1">{{ t('addAssets.brvm.listLabel') }}</p>

                                <!-- Results -->
                                <div>
                                    @for (inst of filteredBrvmInstruments(); track inst.ticker) {
                                        <button type="button" (click)="pickBrvmInstrument(inst)"
                                                class="w-full flex items-center gap-3 sm:gap-4 py-3 rounded-xl text-left cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800/60 transition-colors">
                                            <span class="shrink-0 w-11 h-11 rounded-full bg-brand-50 dark:bg-brand-700/25 text-brand-700 dark:text-ochre-300 flex items-center justify-center text-xs font-bold" aria-hidden="true">{{ brvmBadge(inst.ticker) }}</span>
                                            <span class="flex-1 min-w-0">
                                                <span class="block truncate text-surface-900 dark:text-surface-0 font-medium">{{ inst.name }}</span>
                                                <span class="block text-xs text-surface-500 dark:text-surface-400">{{ inst.ticker }}{{ inst.country ? ' · ' + inst.country : '' }}</span>
                                            </span>
                                            @if (assetForm.ticker === inst.ticker) { <i class="pi pi-check text-ochre-500 shrink-0" aria-hidden="true"></i> }
                                        </button>
                                    } @empty {
                                        <p class="text-center text-sm text-surface-400 py-10">{{ t('addAssets.brvm.noMatch') }}</p>
                                    }
                                    <!-- Unlisted fallback (handled in-sheet, no form shift) -->
                                    <button type="button" (click)="startBrvmOther()"
                                            class="w-full flex items-center gap-3 sm:gap-4 py-3 mt-1 rounded-xl text-left cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800/60 transition-colors">
                                        <span class="shrink-0 w-11 h-11 rounded-full border border-dashed border-surface-300 dark:border-surface-600 text-surface-400 flex items-center justify-center" aria-hidden="true"><i class="pi pi-pencil !text-sm"></i></span>
                                        <span class="flex-1 text-surface-700 dark:text-surface-200">{{ t('addAssets.brvm.other') }}</span>
                                        <i class="pi pi-chevron-right text-surface-400 !text-xs shrink-0" aria-hidden="true"></i>
                                    </button>
                                </div>
                            } @else {
                                <!-- Free-text (unlisted) sub-screen -->
                                <div class="flex flex-col gap-6 max-w-md">
                                    <div class="flex flex-col gap-2">
                                        <label for="brvm-other-name" class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ t('addAssets.brvm.otherLabel') }}</label>
                                        <input id="brvm-other-name" pInputText type="text" [ngModel]="brvmOtherName()" (ngModelChange)="brvmOtherName.set($event)"
                                               [placeholder]="t('addAssets.brvm.otherPlaceholder')"
                                               class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-ochre-500 dark:focus:!border-ochre-400" />
                                    </div>
                                    <button pButton type="button" [label]="t('common.confirm')" [disabled]="!brvmOtherName().trim()"
                                            class="omaad-cta !rounded-full self-start !px-8" (click)="confirmBrvmOther()"></button>
                                </div>
                            }
                        </div>
                    </div>
                </div>
            </p-dialog>
        </div>
    `
})
export class AddAssetPage implements OnInit, CanComponentDeactivate {
    /** Mobile-safe datepickers: touchUI modal + readonly input (no keyboard). */
    readonly isTouch = isTouchDevice();

    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private location = inject(Location);
    private patrimoineService = inject(PatrimoineService);
    private messageService = inject(MessageService);
    private tokenService = inject(TokenService);
    private i18n = inject(I18nService);
    private analytics = inject(AnalyticsService);
    private api = inject(ApiService);
    cs = inject(CurrencyService);

    t(key: string): string { return this.i18n.t(key); }

    lang = 'fr';
    currentStep = signal(0);
    isSubmitting = signal(false);
    /** PA-2 progressive disclosure: optional detail fields, collapsed by default. */
    detailsOpen = signal(false);
    /** Set true right before the post-save navigation so the guard stays silent. */
    private justSaved = false;
    selectedCategory = signal<AssetCategory | ''>('');
    searchQuery = signal('');
    /**
     * PA-3 dual-path entry: classes whose live sync is S9 open on a chooser
     * (honest "coming soon" sync teaser + manual card) instead of the form.
     * Stocks are NOT here: connect-broker IS their dual-path screen (S3-10,
     * real PDF import). While set, step 0 renders the chooser, and backing
     * out of the form returns to it.
     */
    pathChooser = signal<AssetCategory | ''>('');
    /** One sync_interest event per chooser visit; flips the teaser to a thank-you state. */
    syncInterestSent = signal(false);

    /**
     * BRVM stock picker (S9-B1). Finary-style: the Name field is a static
     * tappable row that opens a full-screen search SHEET; the form never
     * expands or shifts. Selection state lives on assetForm (name + ticker);
     * a picked ticker means catalog identity, '' means a free-typed name.
     */
    brvmInstruments = signal<BrvmInstrument[]>([]);
    /** Full-screen picker sheet open/closed. */
    brvmSheetOpen = signal(false);
    /** Live search text inside the sheet. */
    brvmSearch = signal('');
    /** Inside the sheet, the "Autre (non listée)" free-text sub-screen. */
    brvmOtherMode = signal(false);
    /** Draft name while typing a free-text (unlisted) stock in the sheet. */
    brvmOtherName = signal('');

    /** Catalog filtered by the sheet's search (name or ticker, accent/caseless). */
    filteredBrvmInstruments = computed(() => {
        const q = this.brvmSearch().trim().toLowerCase();
        const rows = this.brvmInstruments();
        if (!q) return rows;
        return rows.filter(i =>
            i.name.toLowerCase().includes(q) || i.ticker.toLowerCase().includes(q));
    });

    /** Short monogram for a result badge (first two letters of the ticker). */
    brvmBadge(ticker: string): string { return (ticker || '?').slice(0, 2); }

    assetForm: AssetFormData = {
        name: '', description: '', category: '', quantity: 1, ticker: '', purchasePrice: 0, currentPrice: 0,
        purchaseDate: '', institution: '', owners: [],
        tontineMonthlyContribution: 0, tontineParticipants: 2, tontineStartDate: '',
        tontineCollectionDate: '', tontineStatus: 'en_cours', tontineFrequency: 'monthly', mobileMoneyProvider: '',
        surfaceM2: 0, region: '', currency: this.cs.config().code,
        reType: '', reUsage: '', reRooms: null, reMonthlyRent: 0, reConstructionDate: '', reAgencyFees: 0, reNotaryFees: 0, reRenovationFees: 0, reFurnishingCosts: 0, loanAmount: 0, loanRate: 0, loanMonthly: 0
    };

    // p-datepicker binds a Date, but assetForm stores dates as 'YYYY-MM-DD'
    // strings (that's what the API + the truthy checks expect). These accessors
    // bridge the two so the whole app can standardize on <p-datepicker> (P2-FE-9)
    // without changing the form's string source of truth.
    //
    // The getters MUST return a STABLE Date instance per string value.
    // `return new Date(s)` on every read handed ngModel a "different" model on
    // every change-detection pass the moment a date was picked, which spiraled
    // into an infinite write→CD→write loop and froze the whole app (the
    // "can't pick a date on mobile, app dies" bug). Memoized per string.
    // LOCAL date parts, not toISOString(): the picker hands us local midnight,
    // and UTC-converting it stores yesterday for any user east of Greenwich
    // (Paris diaspora picks the 15th, the API gets the 14th).
    private toDateStr(d: Date | null): string { return d ? toLocalDateStr(d) : ''; }
    private dateObjCache = new Map<string, Date>();
    private toDateObj(s: string): Date | null {
        if (!s) return null;
        let d = this.dateObjCache.get(s);
        if (!d) { d = new Date(s); this.dateObjCache.set(s, d); }
        return d;
    }
    get purchaseDateObj(): Date | null { return this.toDateObj(this.assetForm.purchaseDate); }
    set purchaseDateObj(d: Date | null) { this.assetForm.purchaseDate = this.toDateStr(d); }
    get tontineStartDateObj(): Date | null { return this.toDateObj(this.assetForm.tontineStartDate); }
    set tontineStartDateObj(d: Date | null) { this.assetForm.tontineStartDate = this.toDateStr(d); }
    get tontineCollectionDateObj(): Date | null { return this.toDateObj(this.assetForm.tontineCollectionDate); }
    set tontineCollectionDateObj(d: Date | null) { this.assetForm.tontineCollectionDate = this.toDateStr(d); }

    /** Currencies the user can hold an asset in. */
    /** Symbol for the currently selected asset currency (drives inline hints). */
    curSymbol(): string {
        const c = this.assetForm.currency;
        return this.cs.symbolFor(c);
    }

    // Two-tier duotone chrome (S7b PA-1): the four West-Africa hero classes
    // (our differentiators: immobilier, BRVM, tontine, mobile money) carry the
    // ochre accent; every other class stays in the navy/neutral family. One
    // accent, two families — hierarchy and brand story without rainbow soup.
    private static readonly HERO_BG = 'bg-gradient-to-br from-ochre-50 to-ochre-100 dark:from-ochre-900/50 dark:to-surface-800';
    private static readonly HERO_FG = 'text-ochre-700 dark:text-ochre-400';
    private static readonly CARD_BG = 'bg-gradient-to-br from-brand-50 to-surface-100 dark:from-brand-600/40 dark:to-surface-800';
    private static readonly CARD_FG = 'text-brand-700 dark:text-surface-200';

    categoryCards = computed<CategoryCard[]>(() => {
        const t = (k: string) => this.i18n.t(k);
        // WA-first curated order: lead with what makes Omaad different, then
        // everyday accounts, then the global classes.
        // Owner decision 2026-07-25: crypto and life_insurance are hidden from
        // the catalog (not West-Africa realities yet). HIDDEN, not removed:
        // the backend enum, detail page and edit dialog still support existing
        // assets in those classes; re-adding a tile here is the whole revert.
        const values: { value: AssetCategory; icon: string; hero?: boolean }[] = [
            { value: 'real_estate',     icon: 'pi-home',       hero: true },
            { value: 'stocks_brvm',     icon: 'pi-chart-line', hero: true },
            { value: 'tontine',         icon: 'pi-users',      hero: true },
            { value: 'mobile_money',    icon: 'pi-mobile',     hero: true },
            { value: 'cash',            icon: 'pi-wallet' },
            { value: 'savings_account', icon: 'pi-book' },
            { value: 'stocks_intl',     icon: 'pi-globe' },
            { value: 'bonds',           icon: 'pi-percentage' },
            { value: 'vehicle',         icon: 'pi-car' },
            { value: 'collectibles',    icon: 'pi-star' },
            { value: 'commodities',     icon: 'pi-box' },
            { value: 'other',           icon: 'pi-ellipsis-h' },
        ];
        return values.map(v => ({
            value: v.value,
            label: t(`addAssets.wizard.cards.${v.value}.label`),
            desc:  t(`addAssets.wizard.cards.${v.value}.desc`),
            icon: v.icon,
            bgClass: v.hero ? AddAssetPage.HERO_BG : AddAssetPage.CARD_BG,
            textClass: v.hero ? AddAssetPage.HERO_FG : AddAssetPage.CARD_FG,
        }));
    });

    get mobileMoneyProviders() {
        return [
            { label: 'Wave', value: 'Wave' },
            { label: 'Orange Money', value: 'Orange Money' },
            { label: 'Free Money', value: 'Free Money' },
            { label: 'Expresso', value: 'Expresso' },
            { label: this.i18n.t('addAssets.wizard.other'), value: 'Autre' },
        ];
    }

    get tontineStatusOptions() {
        const t = (k: string) => this.i18n.t(k);
        return [
            { label: t('addAssets.wizard.tontineStatus.en_cours'), value: 'en_cours' },
            { label: t('addAssets.wizard.tontineStatus.mise_recue'), value: 'mise_recue' },
            { label: t('addAssets.wizard.tontineStatus.termine'), value: 'termine' },
        ];
    }

    tontineFrequencyOptions = computed(() => [
        { label: this.i18n.t('addAssets.wizard.freq.monthly'), value: 'monthly' },
        { label: this.i18n.t('addAssets.wizard.freq.weekly'), value: 'weekly' },
    ]);

    selectedCard = computed(() => this.categoryCards().find(c => c.value === this.selectedCategory()) ?? null);

    filteredCategories = computed(() => {
        const q = this.searchQuery().toLowerCase().trim();
        const cards = this.categoryCards();
        if (!q) return cards;
        return cards.filter(c =>
            c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)
        );
    });

    private get user() { return this.tokenService.user(); }

    private get userName(): string {
        const u = this.user;
        if (!u) return 'User';
        const f = u.first_name || '', l = u.last_name || '';
        return (f || l) ? `${f} ${l}`.trim() : u.email?.split('@')[0] || 'User';
    }

    private get userInitials(): string {
        const u = this.user;
        if (!u) return 'U';
        const f = u.first_name || '', l = u.last_name || '';
        return (f || l) ? `${f.charAt(0)}${l.charAt(0)}`.toUpperCase() : u.email?.charAt(0).toUpperCase() || 'U';
    }

    ngOnInit() {
        const match = this.router.url.match(/^\/(fr|en)(\/|$)/);
        this.lang = match ? match[1] : 'fr';
        this.resetForm();

        const cat = this.route.snapshot.queryParamMap.get('category');
        if (cat && this.categoryCards().some(c => c.value === cat)) {
            // Deep-link hand-off (e.g. connect-broker "add manually"): open the
            // form directly, passing deepLink explicitly (never re-read below).
            this.selectCategory(cat as AssetCategory, true);
            if (this.assetForm.category === 'stocks_brvm') this.loadBrvmInstruments();
            // Strip ?category so the URL bar is clean and going back / re-picking
            // a class behaves as a fresh choice (not a stale deep-link).
            this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
        }
    }

    goBack(): void {
        if (this.currentStep() === 3) {
            // Success screen: back means leave, never back INTO the saved form.
            this.goToPatrimoine();
        } else if (this.isRealEstate() && this.currentStep() === 1 && this.reSection() > 1) {
            // Real estate: the header arrow steps back through the sections (the
            // bottom bar is a single full-screen Submit, no secondary back button).
            this.reSection.update(s => s - 1);
        } else if (this.currentStep() > 0) {
            this.previousStep();
        } else if (this.pathChooser()) {
            // Dual-path chooser: back returns to the catalog.
            this.pathChooser.set('');
            this.selectedCategory.set('');
            this.assetForm.category = '';
        } else {
            this.router.navigate(['/', this.lang, 'pages', 'patrimoine']);
        }
    }

    goToPatrimoine(): void {
        this.router.navigate(['/', this.lang, 'pages', 'patrimoine']);
    }

    /** Success screen: start a fresh add without leaving the wizard. */
    addAnother(): void {
        this.justSaved = false;   // fresh form: unsaved-input tracking arms again
        this.detailsOpen.set(false);
        this.resetForm();
    }

    /**
     * Route guard hook: always allow leaving. A native app dismisses a
     * half-filled add form silently, so we never interrupt with a browser
     * "unsaved changes" confirm (owner directive, mimic the real app).
     */
    canDeactivate(): boolean {
        return true;
    }

    resetForm(): void {
        this.assetForm = {
            name: '', description: '', category: '', quantity: 1, ticker: '', purchasePrice: 0, currentPrice: 0,
            purchaseDate: '', institution: '',
            owners: [{ name: this.userName, initials: this.userInitials, percentage: 100 }],
            tontineMonthlyContribution: 0, tontineParticipants: 2, tontineStartDate: '',
            tontineCollectionDate: '', tontineStatus: 'en_cours', tontineFrequency: 'monthly', mobileMoneyProvider: '',
            surfaceM2: 0, region: '', currency: this.cs.config().code,
            reType: '', reUsage: '', reRooms: null, reMonthlyRent: 0, reConstructionDate: '', reAgencyFees: 0, reNotaryFees: 0, reRenovationFees: 0, reFurnishingCosts: 0, loanAmount: 0, loanRate: 0, loanMonthly: 0
        };
        this.reSection.set(1);
        this.reMaxSection.set(1);
        this.selectedCategory.set('');
        this.pathChooser.set('');
        this.syncInterestSent.set(false);
        this.brvmSheetOpen.set(false);
        this.brvmOtherMode.set(false);
        this.brvmSearch.set('');
        this.brvmOtherName.set('');
        this.currentStep.set(0);
    }

    /** Fetch the BRVM catalog once (idempotent), when the BRVM form is in play. */
    private loadBrvmInstruments(): void {
        if (this.brvmInstruments().length) return;
        this.api.getBrvmInstruments().subscribe({
            next: rows => this.brvmInstruments.set(rows),
            error: () => { /* picker degrades to free-text via the "Autre" path */ },
        });
    }

    @ViewChild('brvmSearchInput') private brvmSearchInput?: ElementRef<HTMLInputElement>;

    /** Open the full-screen search sheet (loads the catalog on first open). */
    openBrvmSheet(): void {
        this.loadBrvmInstruments();
        this.brvmSearch.set('');
        this.brvmOtherMode.set(false);
        this.brvmOtherName.set(this.assetForm.ticker ? '' : this.assetForm.name);
        this.brvmSheetOpen.set(true);
    }

    /** Focus the search once the dialog has rendered (native-app feel). */
    focusBrvmSearch(): void {
        setTimeout(() => this.brvmSearchInput?.nativeElement.focus(), 50);
    }

    closeBrvmSheet(): void { this.brvmSheetOpen.set(false); }

    /**
     * Pick a catalog instrument from the sheet: fills name + ticker and defaults
     * amounts to FCFA (BRVM trades in XOF), then closes the sheet.
     */
    pickBrvmInstrument(inst: BrvmInstrument): void {
        this.assetForm.ticker = inst.ticker;
        this.assetForm.name = inst.name;
        this.assetForm.currency = 'XOF';
        this.brvmSheetOpen.set(false);
    }

    /** Switch the sheet to the "Autre (non listée)" free-text sub-screen. */
    startBrvmOther(): void {
        this.brvmOtherMode.set(true);
        this.brvmOtherName.set('');
    }

    /** Confirm a free-typed (unlisted) stock: name only, no ticker (no auto-revalue). */
    confirmBrvmOther(): void {
        const name = this.brvmOtherName().trim();
        if (!name) return;
        this.assetForm.ticker = '';
        this.assetForm.name = name;
        this.brvmSheetOpen.set(false);
    }

    // ── Real-estate multi-section wizard (S9 UI, Finary-style) ───────────
    /** Current section (1..RE_SECTION_COUNT) of the real-estate wizard. */
    reSection = signal(1);
    /** Furthest section the user has reached (via Suivant). The rail cannot jump
     *  PAST this, so real estate is filled in order (owner directive). */
    reMaxSection = signal(1);
    readonly RE_SECTION_COUNT = 7;
    readonly reSections: { n: number; key: string; icon: string }[] = [
        { n: 1, key: 'description', icon: 'pi-home' },
        { n: 2, key: 'features', icon: 'pi-th-large' },
        { n: 3, key: 'value', icon: 'pi-wallet' },
        { n: 4, key: 'fees', icon: 'pi-receipt' },
        { n: 5, key: 'financing', icon: 'pi-building-columns' },
        { n: 6, key: 'income', icon: 'pi-chart-line' },
        { n: 7, key: 'ownership', icon: 'pi-users' },
    ];
    isRealEstate(): boolean { return this.assetForm.category === 'real_estate'; }

    get reTypeOptions() {
        const t = (k: string) => this.i18n.t(k);
        return ['appartement', 'maison', 'villa', 'terrain', 'immeuble', 'commercial', 'bureau', 'parking', 'autre']
            .map(v => ({ label: t('addAssets.re.types.' + v), value: v }));
    }
    get reUsageOptions() {
        const t = (k: string) => this.i18n.t(k);
        return ['principale', 'secondaire', 'locatif', 'construction', 'autre']
            .map(v => ({ label: t('addAssets.re.usages.' + v), value: v }));
    }
    /** Year picker options: current year back to 1900 (newest first). */
    get reYearOptions() {
        const current = new Date().getFullYear();
        const years: { label: string; value: string }[] = [];
        for (let y = current; y >= 1900; y--) years.push({ label: String(y), value: String(y) });
        return years;
    }

    /** Per-section gate for advancing: only sections with hard requirements
     *  block (identity in Description, a value in "Valeur & achat"). */
    reSectionValid(n: number): boolean {
        const f = this.assetForm;
        if (n === 1) return !!f.name.trim();
        if (n === 3) return f.purchasePrice > 0 || f.currentPrice > 0;
        return true;
    }

    /** Rail jump: allowed to any already-reached section, never past the front. */
    goReSection(n: number): void {
        if (n <= this.reMaxSection()) this.reSection.set(n);
    }
    reNext(): void {
        if (!this.reSectionValid(this.reSection())) return;
        if (this.reSection() < this.RE_SECTION_COUNT) {
            const next = this.reSection() + 1;
            this.reSection.set(next);
            this.reMaxSection.update(m => Math.max(m, next));
        } else {
            this.submitAsset();
        }
    }
    rePrev(): void {
        if (this.reSection() > 1) this.reSection.update(s => s - 1);
        else this.goBack();
    }

    /** Serialize the frontend-only real-estate metadata (Type/Usage/rooms/loan)
     *  into a JSON notes blob. Returns null when nothing worth storing. */
    private buildReNotes(f: AssetFormData): string | null {
        const meta: Record<string, unknown> = {};
        if (f.reType) meta['type'] = f.reType;
        if (f.reUsage) meta['usage'] = f.reUsage;
        if (f.reRooms && f.reRooms > 0) meta['rooms'] = f.reRooms;
        if (f.loanAmount > 0 || f.loanRate > 0 || f.loanMonthly > 0) {
            meta['loan'] = {
                amount: f.loanAmount || undefined,
                rate: f.loanRate || undefined,
                monthly: f.loanMonthly || undefined,
            };
        }
        return Object.keys(meta).length ? JSON.stringify(meta) : null;
    }

    /** Classes whose live sync ships in S9: they get the teaser chooser. */
    private static readonly SYNC_TEASER_CLASSES: AssetCategory[] = ['cash', 'savings_account', 'mobile_money'];

    selectCategory(value: AssetCategory, deepLink = false): void {
        this.assetForm.category = value;
        this.selectedCategory.set(value);
        this.detailsOpen.set(false); // details stay collapsed per fresh class pick
        // deepLink (connect-broker's "add manually" hand-off) goes straight to
        // the form. A normal in-app tap (deepLink=false) routes stocks to the
        // connect-broker chooser and sync classes to the teaser.
        const isStocks = value === 'stocks_brvm' || value === 'stocks_intl';
        if (isStocks && !deepLink) {
            const market = value === 'stocks_brvm' ? 'brvm' : 'intl';
            this.router.navigate(['/', this.lang, 'pages', 'patrimoine', 'connect-broker'], {
                queryParams: { market }
            });
        } else if (AddAssetPage.SYNC_TEASER_CLASSES.includes(value) && !deepLink) {
            this.syncInterestSent.set(false);
            this.pathChooser.set(value);
        } else {
            this.currentStep.set(1);
        }
    }

    /** Teaser card tap: log S9 sync demand once, thank the user in place. */
    registerSyncInterest(): void {
        if (this.syncInterestSent()) return;
        this.analytics.track('sync_interest', { category: this.pathChooser() });
        this.syncInterestSent.set(true);
    }

    /** Manual card: to the form. pathChooser stays set so back returns here. */
    chooseManualPath(): void {
        this.goToStepTop(1);
    }

    /** Whether the current class has optional detail fields (PA-2 disclosure). */
    detailsAvailable(): boolean {
        return this.assetForm.category !== 'mobile_money';
    }

    /** Valued as one total (not per-unit, not a plain balance, not tontine/momo). */
    isTotalValueBased(): boolean {
        return !!this.assetForm.category && !this.isQuantityBased() && !this.isSimpleBalanceCategory()
            && this.assetForm.category !== 'tontine' && this.assetForm.category !== 'mobile_money';
    }

    /**
     * PA-4: classes where the purchase price is the number owners actually
     * anchor on (and current value is honestly unknowable day-to-day). Only
     * these keep purchase value as a required essential; everywhere else it
     * is an optional detail per the section-13 demotion.
     */
    purchaseLedClass(): boolean {
        return this.assetForm.category === 'real_estate' || this.assetForm.category === 'vehicle';
    }

    isQuantityBased(): boolean {
        return ['stocks_brvm', 'stocks_intl', 'bonds', 'crypto', 'collectibles', 'commodities'].includes(this.assetForm.category);
    }

    isSimpleBalanceCategory(): boolean {
        return ['cash', 'savings_account'].includes(this.assetForm.category);
    }

    isInstitutionBased(): boolean {
        return ['stocks_brvm', 'stocks_intl', 'bonds', 'crypto', 'life_insurance', 'savings_account', 'cash', 'real_estate'].includes(this.assetForm.category);
    }

    private static readonly NAME_PH_CATS = ['tontine', 'mobile_money', 'real_estate', 'stocks_brvm', 'stocks_intl', 'crypto', 'vehicle'];
    namePlaceholder(): string {
        const cat = this.assetForm.category;
        const key = AddAssetPage.NAME_PH_CATS.includes(cat) ? `addAssets.wizard.namePh.${cat}` : 'addAssets.wizard.namePh.default';
        return this.i18n.t(key);
    }

    private static readonly INST_LABEL_CATS = ['stocks_brvm', 'stocks_intl', 'bonds', 'crypto', 'savings_account', 'cash', 'life_insurance', 'real_estate'];
    institutionLabel(): string {
        const cat = this.assetForm.category;
        const key = AddAssetPage.INST_LABEL_CATS.includes(cat) ? `addAssets.wizard.instLabel.${cat}` : 'addAssets.wizard.instLabel.default';
        return this.i18n.t(key);
    }

    private static readonly INST_PH_CATS = ['stocks_brvm', 'stocks_intl', 'crypto', 'savings_account', 'cash', 'life_insurance', 'real_estate'];
    institutionPlaceholder(): string {
        const cat = this.assetForm.category;
        return AddAssetPage.INST_PH_CATS.includes(cat) ? this.i18n.t(`addAssets.wizard.instPh.${cat}`) : '';
    }

    totalValue(): number {
        if (this.assetForm.category === 'tontine') return this.tontineCurrentValue();
        return this.assetForm.currentPrice * (this.isQuantityBased() ? this.assetForm.quantity : 1);
    }

    isStep1Valid(): boolean {
        const f = this.assetForm;
        if (!f.name || !f.category) return false;
        if (f.category === 'tontine') return f.tontineMonthlyContribution > 0 && f.tontineParticipants > 1 && !!f.tontineStartDate;
        if (f.category === 'mobile_money') return f.currentPrice > 0 && !!f.mobileMoneyProvider;
        if (this.isSimpleBalanceCategory()) return f.currentPrice > 0;
        // Real estate (multi-section wizard): a name plus at least one value
        // (purchase or current) is enough to save; everything else is optional.
        if (f.category === 'real_estate') return f.purchasePrice > 0 || f.currentPrice > 0;
        if (f.category === 'vehicle') return f.purchasePrice > 0;
        // BRVM (S9-B1): essentials are the picked stock (name) + current value per
        // share; purchase price is demoted to the optional details disclosure.
        if (f.category === 'stocks_brvm') return !!f.name.trim() && f.currentPrice > 0;
        if (this.isQuantityBased()) return f.purchasePrice > 0;
        return f.currentPrice > 0;
    }

    tontineMonthsElapsed(): number {
        if (!this.assetForm.tontineStartDate) return 0;
        return Math.max(0, Math.floor((Date.now() - new Date(this.assetForm.tontineStartDate).getTime()) / (30.44 * 24 * 60 * 60 * 1000)));
    }

    tontineCurrentValue(): number {
        return this.assetForm.tontineMonthlyContribution * this.tontineMonthsElapsed();
    }

    /** Convert an amount entered in the selected asset currency to EUR (preview only). */
    toEur(displayValue: number): number {
        return displayValue / this.cs.rateOf(this.assetForm.currency);
    }

    /** Step transitions land at the top of the new step, not mid-scroll. */
    private goToStepTop(step: number): void {
        this.currentStep.set(step);
        if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
    }

    nextStep(): void {
        if (this.currentStep() === 0 && this.assetForm.category) this.goToStepTop(1);
        else if (this.currentStep() === 1 && this.isStep1Valid()) this.goToStepTop(2);
    }

    previousStep(): void {
        if (this.currentStep() > 0) this.goToStepTop(this.currentStep() - 1);
    }

    goToStep(step: number): void {
        if (step === 1 && this.assetForm.category) this.goToStepTop(1);
        else if (step === 2 && this.isStep1Valid()) this.goToStepTop(2);
    }

    removeOwner(owner: Owner): void {
        if (this.assetForm.owners.length > 1) {
            const i = this.assetForm.owners.indexOf(owner);
            if (i > -1) {
                this.assetForm.owners.splice(i, 1);
                this.assetForm.owners.forEach(o => o.percentage = 100 / this.assetForm.owners.length);
            }
        }
    }

    addMember(): void {
        this.messageService.add({ severity: 'info', summary: this.i18n.t('common.info'), detail: this.i18n.t('addAssets.wizard.coOwnerSoon'), life: 3000 });
    }

    async submitAsset(): Promise<void> {
        if (!this.isStep1Valid()) return;
        this.isSubmitting.set(true);

        try {
            const f = this.assetForm;
            const purchaseDateValue = f.purchaseDate || this.toDateStr(new Date());
            let assetData: AssetCreate;

            // Amounts are stored in the asset's native currency; the backend
            // converts to EUR at aggregation time via the fx_rates table.
            const cur = f.currency;

            if (f.category === 'tontine') {
                const months = Math.max(1, this.tontineMonthsElapsed());
                assetData = {
                    name: f.name, category: 'tontine', currency: cur,
                    current_value: f.tontineMonthlyContribution * months,
                    // New dedicated tontine columns, no more overloading purchase_*.
                    tontine_monthly_contribution: f.tontineMonthlyContribution,
                    tontine_participants: f.tontineParticipants,
                    tontine_frequency: f.tontineFrequency,
                    tontine_start_date: f.tontineStartDate || this.toDateStr(new Date()),
                    tontine_collection_date: f.tontineCollectionDate || null,
                    tontine_status: f.tontineStatus,
                };
            } else if (f.category === 'mobile_money') {
                assetData = {
                    name: f.name, category: 'mobile_money', currency: cur,
                    current_value: f.currentPrice,
                    mobile_money_operator: f.mobileMoneyProvider,
                    is_liquid: true,
                };
            } else if (f.category === 'cash' || f.category === 'savings_account') {
                // Simple-balance shape: no purchase event, current_value is THE value.
                assetData = {
                    name: f.name, category: f.category as AssetCategory, currency: cur,
                    current_value: f.currentPrice,
                    institution: f.institution || undefined, is_liquid: true
                };
            } else {
                if ((!f.currentPrice || f.currentPrice === 0) && f.purchasePrice > 0) f.currentPrice = f.purchasePrice;
                const qty = this.isQuantityBased() ? Math.max(1, f.quantity ?? 1) : 1;
                const purchaseNative = f.purchasePrice > 0 ? f.purchasePrice * qty : undefined;
                const isQtyBased = this.isQuantityBased();
                const isRE = f.category === 'real_estate';
                // Real-estate multi-section wizard: Type/Usage/rooms/loan are
                // frontend-only, stored as a JSON blob in notes (no migration).
                const reNotes = isRE ? this.buildReNotes(f) : null;
                assetData = {
                    name: f.name, category: f.category as AssetCategory, currency: cur,
                    description: isRE && f.description.trim() ? f.description.trim() : undefined,
                    current_value: f.currentPrice * qty, purchase_value: purchaseNative,
                    purchase_date: purchaseDateValue, institution: f.institution || undefined,
                    location: f.region || undefined,
                    notes: isQtyBased ? JSON.stringify({ quantity: qty }) : (reNotes || undefined),
                    quantity: isQtyBased ? qty : undefined,
                    // BRVM (S9-B1): persist the catalog ticker so the S9-B2 engine
                    // can revalue this holding automatically. '' for free-typed.
                    ticker: f.category === 'stocks_brvm' && f.ticker ? f.ticker : undefined,
                    surface_m2: isRE && f.surfaceM2 > 0 ? f.surfaceM2 : undefined,
                    price_per_m2_purchase: isRE && f.surfaceM2 > 0 && f.purchasePrice > 0
                        ? Math.round(f.purchasePrice / f.surfaceM2) : undefined,
                    construction_date: isRE && f.reConstructionDate.trim() ? f.reConstructionDate.trim() : undefined,
                    agency_fees: isRE && f.reAgencyFees > 0 ? f.reAgencyFees : undefined,
                    notary_fees: isRE && f.reNotaryFees > 0 ? f.reNotaryFees : undefined,
                    renovation_fees: isRE && f.reRenovationFees > 0 ? f.reRenovationFees : undefined,
                    furnishing_costs: isRE && f.reFurnishingCosts > 0 ? f.reFurnishingCosts : undefined,
                    rental_income: isRE && f.reMonthlyRent > 0 ? f.reMonthlyRent : undefined,
                };
            }

            await this.patrimoineService.createAsset(assetData);
            this.justSaved = true; // the guard stays silent from here on
            // PA-2: a rewarding success screen (what was added + next moves)
            // instead of toast-and-vanish.
            this.goToStepTop(3);
        } catch (error: any) {
            console.error('Error creating asset:', error);
            const detail = error?.error?.detail
                ? (typeof error.error.detail === 'string' ? error.error.detail : JSON.stringify(error.error.detail).slice(0, 120))
                : this.i18n.t('addAssets.wizard.addError');
            this.messageService.add({ severity: 'error', summary: this.i18n.t('common.error'), detail, life: 6000 });
        } finally {
            this.isSubmitting.set(false);
        }
    }
}
