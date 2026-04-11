import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmationService, MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { ApiService, Asset } from '../../../core/services/api.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { AssetsStateService } from '../../service/assets-state.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';

@Component({
    selector: 'app-asset-detail',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, ButtonModule, TagModule, DividerModule,
              ConfirmDialogModule, ToastModule, DialogModule, InputTextModule, InputNumberModule,
              DatePickerModule, AppAmountComponent],
    providers: [ConfirmationService, MessageService],
    template: `
        <p-toast position="top-center" />
        <p-confirmdialog />

        @if (loading()) {
            <div class="animate-pulse space-y-6">
                <div class="h-8 bg-surface-200 dark:bg-surface-700 rounded w-48"></div>
                <div class="h-16 bg-surface-200 dark:bg-surface-700 rounded"></div>
                <div class="h-64 bg-surface-200 dark:bg-surface-700 rounded"></div>
            </div>
        } @else if (!asset()) {
            <div class="flex flex-col items-center justify-center py-24 text-center">
                <i class="pi pi-exclamation-triangle text-4xl text-surface-400 mb-4"></i>
                <h3 class="text-xl font-semibold text-surface-700 dark:text-surface-200 mb-2">Actif introuvable</h3>
                <button pButton label="Retour au patrimoine" icon="pi pi-arrow-left"
                        (click)="goBack()" class="mt-4"></button>
            </div>
        } @else {
            <!-- Header -->
            <div class="flex items-start gap-3 mb-5">
                <button (click)="goBack()"
                        class="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-all cursor-pointer mt-0.5">
                    <i class="pi pi-arrow-left text-surface-600 dark:text-surface-300"></i>
                </button>
                <div class="flex items-center gap-3 flex-1 min-w-0">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl shrink-0 flex items-center justify-center shadow-lg"
                         [style.background]="categoryBg()">
                        <i [class]="categoryIcon()" class="text-white text-lg sm:text-xl"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <h1 class="text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-0 m-0 truncate">{{ asset()!.name }}</h1>
                        <span class="text-surface-500 text-sm">{{ categoryLabel() }}</span>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <button pButton icon="pi pi-pencil" severity="secondary"
                            [outlined]="true" size="small" (click)="editAsset()"
                            class="!w-9 !h-9 !p-0"></button>
                    <button pButton icon="pi pi-trash" severity="danger"
                            [outlined]="true" size="small" (click)="confirmDelete()"
                            class="!w-9 !h-9 !p-0"></button>
                </div>
            </div>

            <!-- Value + date -->
            <div class="card mb-6">
                <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div>
                        <p class="text-surface-500 dark:text-surface-400 text-sm mb-1">{{ formatDate(asset()!.updated_at) }}</p>
                        <div class="text-4xl md:text-5xl font-bold text-surface-900 dark:text-surface-0">
                            <app-amount [value]="asset()!.current_value" />
                        </div>
                        @if (gainLoss() !== null) {
                            <div class="flex items-center gap-2 mt-2">
                                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold"
                                      [ngClass]="(gainLoss()! >= 0) ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'">
                                    <i class="pi text-xs" [ngClass]="gainLoss()! >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'"></i>
                                    <app-amount [value]="gainLoss()!" [prefix]="gainLoss()! >= 0 ? '+' : '-'" />
                                    @if (gainLossPct() !== null) {
                                        ({{ gainLossPct()! >= 0 ? '+' : '' }}{{ gainLossPct() | number:'1.1-1' }}%)
                                    }
                                </span>
                                <span class="text-surface-400 text-sm">depuis l'achat</span>
                            </div>
                        }
                    </div>
                    <!-- Mini chart (SVG sparkline) -->
                    <div class="flex-shrink-0">
                        <svg viewBox="0 0 180 60" width="180" height="60" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" [attr.stop-color]="gainLoss() !== null && gainLoss()! >= 0 ? '#10b981' : '#f43f5e'" stop-opacity="0.3"/>
                                    <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
                                </linearGradient>
                            </defs>
                            <path [attr.d]="sparklinePath()" fill="url(#sparkGrad)" />
                            <polyline [attr.points]="sparklinePoints()"
                                      fill="none"
                                      [attr.stroke]="gainLoss() !== null && gainLoss()! >= 0 ? '#10b981' : '#f43f5e'"
                                      stroke-width="2.5"
                                      stroke-linecap="round"
                                      stroke-linejoin="round" />
                        </svg>
                    </div>
                </div>
            </div>

            <!-- KPI Row -->
            <div class="grid gap-3 md:gap-4 mb-5"
                 [ngClass]="isQuantityBased() ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'"
                 style="grid-auto-rows: 1fr;">
                <!-- P&L -->
                <div class="rounded-xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 p-4 text-center flex flex-col items-center justify-center">
                    <p class="text-surface-500 text-xs font-medium uppercase tracking-wide mb-1">P&amp;L</p>
                    @if (gainLoss() !== null) {
                        <div class="text-xl font-bold leading-7"
                             [ngClass]="gainLoss()! >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                            <app-amount [value]="gainLoss()!" [prefix]="gainLoss()! >= 0 ? '+' : '-'" />
                        </div>
                        <p class="text-surface-400 text-xs mt-1">Basé sur le prix d'achat</p>
                    } @else {
                        <div class="text-xl font-bold leading-7 text-surface-400">—</div>
                        <p class="text-surface-400 text-xs mt-1">&nbsp;</p>
                    }
                </div>
                <!-- Prix d'achat -->
                <div class="rounded-xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 p-4 text-center flex flex-col items-center justify-center">
                    <p class="text-surface-500 text-xs font-medium uppercase tracking-wide mb-1">Prix d'achat</p>
                    <div class="text-xl font-bold leading-7 text-surface-900 dark:text-surface-0">
                        @if (asset()!.purchase_value) {
                            <app-amount [value]="asset()!.purchase_value!" />
                        } @else {
                            <span class="text-surface-400">—</span>
                        }
                    </div>
                    @if (asset()!.purchase_date) {
                        <p class="text-surface-400 text-xs mt-1">{{ formatShortDate(asset()!.purchase_date!) }}</p>
                    } @else {
                        <p class="text-surface-400 text-xs mt-1">&nbsp;</p>
                    }
                </div>
                <!-- Quantité (only for quantity-based assets) -->
                @if (isQuantityBased()) {
                    <div class="rounded-xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 p-4 text-center flex flex-col items-center justify-center">
                        <p class="text-surface-500 text-xs font-medium uppercase tracking-wide mb-1">Quantité</p>
                        @if (displayQuantity() != null) {
                            <div class="text-xl font-bold leading-7 text-surface-900 dark:text-surface-0">
                                {{ displayQuantity() | number:'1.0-6' }}
                            </div>
                            @if (displayQuantity()! > 0) {
                                <p class="text-surface-400 text-xs mt-1">
                                    {{ asset()!.current_value / displayQuantity()! | number:'1.2-2' }} €/part
                                </p>
                            }
                        } @else {
                            <div class="text-xl font-bold leading-7 text-surface-400">—</div>
                            <p class="text-surface-400 text-xs mt-1">Non renseigné</p>
                        }
                    </div>
                }
                <!-- Institution -->
                <div class="rounded-xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 p-4 text-center flex flex-col items-center justify-center overflow-hidden">
                    <p class="text-surface-500 text-xs font-medium uppercase tracking-wide mb-1">Institution</p>
                    <div class="text-xl font-bold leading-7 text-surface-900 dark:text-surface-0 truncate max-w-full">
                        {{ asset()!.institution || '—' }}
                    </div>
                    @if (asset()!.location) {
                        <p class="text-surface-400 text-xs mt-1 truncate max-w-full">{{ asset()!.location }}</p>
                    } @else {
                        <p class="text-surface-400 text-xs mt-1">&nbsp;</p>
                    }
                </div>
            </div>

            <p-divider />

            <!-- Specifications -->
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
                <div>
                    <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-4">Informations générales</h3>
                    <div class="space-y-3">
                        <div class="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800">
                            <span class="text-surface-500 text-sm">Catégorie</span>
                            <span class="text-surface-900 dark:text-surface-0 text-sm font-medium">{{ categoryLabel() }}</span>
                        </div>
                        @if (asset()!.purchase_date) {
                            <div class="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800">
                                <span class="text-surface-500 text-sm">Date d'achat</span>
                                <span class="text-surface-900 dark:text-surface-0 text-sm font-medium">{{ formatShortDate(asset()!.purchase_date!) }}</span>
                            </div>
                        }
                        @if (isQuantityBased() && displayQuantity() != null) {
                            <div class="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800">
                                <span class="text-surface-500 text-sm">Nombre de parts</span>
                                <span class="text-surface-900 dark:text-surface-0 text-sm font-medium">{{ displayQuantity() | number:'1.0-6' }}</span>
                            </div>
                        }
                        @if (isQuantityBased() && displayQuantity() != null && displayQuantity()! > 0) {
                            <div class="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800">
                                <span class="text-surface-500 text-sm">Prix unitaire actuel</span>
                                <span class="text-cyan-500 text-sm font-medium">{{ asset()!.current_value / displayQuantity()! | number:'1.2-2' }} €</span>
                            </div>
                        }
                        @if (asset()!.annual_return) {
                            <div class="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800">
                                <span class="text-surface-500 text-sm">Rendement annuel estimé</span>
                                <span class="text-emerald-500 text-sm font-medium">{{ asset()!.annual_return }}%</span>
                            </div>
                        }
                        @if (asset()!.description) {
                            <div class="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800">
                                <span class="text-surface-500 text-sm">Description</span>
                                <span class="text-surface-900 dark:text-surface-0 text-sm max-w-xs text-right">{{ asset()!.description }}</span>
                            </div>
                        }
                    </div>
                </div>

                <!-- Real estate specific -->
                @if (asset()!.category === 'real_estate') {
                    <div>
                        <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-4">Spécifications immobilières</h3>
                        <div class="space-y-3">
                            @if (asset()!.surface_m2) {
                                <div class="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800">
                                    <span class="text-surface-500 text-sm">Surface</span>
                                    <span class="text-surface-900 dark:text-surface-0 text-sm font-medium">{{ asset()!.surface_m2 }} m²</span>
                                </div>
                            }
                            @if (asset()!.price_per_m2_purchase) {
                                <div class="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800">
                                    <span class="text-surface-500 text-sm">Prix/m² à l'achat</span>
                                    <span class="text-surface-900 dark:text-surface-0 text-sm font-medium"><app-amount [value]="asset()!.price_per_m2_purchase!" />/m²</span>
                                </div>
                            }
                            @if (asset()!.surface_m2 && asset()!.current_value) {
                                <div class="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800">
                                    <span class="text-surface-500 text-sm">Prix/m² actuel (estimé)</span>
                                    <span class="text-indigo-500 text-sm font-medium"><app-amount [value]="asset()!.current_value / asset()!.surface_m2!" />/m²</span>
                                </div>
                            }
                            @if (asset()!.construction_date) {
                                <div class="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800">
                                    <span class="text-surface-500 text-sm">Date de construction</span>
                                    <span class="text-surface-900 dark:text-surface-0 text-sm font-medium">{{ asset()!.construction_date }}</span>
                                </div>
                            }
                            @if (asset()!.rental_income) {
                                <div class="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800">
                                    <span class="text-surface-500 text-sm">Revenus locatifs/mois</span>
                                    <span class="text-emerald-500 text-sm font-medium"><app-amount [value]="asset()!.rental_income!" /></span>
                                </div>
                            }
                        </div>

                        <!-- Fees -->
                        @if (asset()!.agency_fees || asset()!.notary_fees || asset()!.renovation_fees || asset()!.furnishing_costs) {
                            <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mt-6 mb-4">Frais</h3>
                            <div class="grid grid-cols-2 gap-4">
                                <div class="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                                    <p class="text-surface-500 text-xs mb-1">Frais d'agence</p>
                                    <p class="font-semibold text-surface-900 dark:text-surface-0 text-sm">
                                        @if (asset()!.agency_fees) { <app-amount [value]="asset()!.agency_fees!" /> } @else { — }
                                    </p>
                                </div>
                                <div class="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                                    <p class="text-surface-500 text-xs mb-1">Frais de notaire</p>
                                    <p class="font-semibold text-surface-900 dark:text-surface-0 text-sm">
                                        @if (asset()!.notary_fees) { <app-amount [value]="asset()!.notary_fees!" /> } @else { — }
                                    </p>
                                </div>
                                <div class="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                                    <p class="text-surface-500 text-xs mb-1">Frais de rénovation</p>
                                    <p class="font-semibold text-surface-900 dark:text-surface-0 text-sm">
                                        @if (asset()!.renovation_fees) { <app-amount [value]="asset()!.renovation_fees!" /> } @else { — }
                                    </p>
                                </div>
                                <div class="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                                    <p class="text-surface-500 text-xs mb-1">Ameublement</p>
                                    <p class="font-semibold text-surface-900 dark:text-surface-0 text-sm">
                                        @if (asset()!.furnishing_costs) { <app-amount [value]="asset()!.furnishing_costs!" /> } @else { — }
                                    </p>
                                </div>
                            </div>
                        }
                    </div>
                }

                <!-- Stocks / Bonds specific -->
                @if (asset()!.category === 'stocks' || asset()!.category === 'bonds') {
                    <div>
                        <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-4">Performance</h3>
                        <div class="space-y-3">
                            @if (gainLoss() !== null) {
                                <div class="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800">
                                    <span class="text-surface-500 text-sm">Gain/Perte total</span>
                                    <span class="text-sm font-medium" [ngClass]="gainLoss()! >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                                        <app-amount [value]="gainLoss()!" [prefix]="gainLoss()! >= 0 ? '+' : '-'" />
                                    </span>
                                </div>
                            }
                            @if (gainLossPct() !== null) {
                                <div class="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800">
                                    <span class="text-surface-500 text-sm">Performance totale</span>
                                    <span class="text-sm font-medium" [ngClass]="gainLossPct()! >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                                        {{ gainLossPct()! >= 0 ? '+' : '' }}{{ gainLossPct() | number:'1.1-1' }}%
                                    </span>
                                </div>
                            }
                            @if (asset()!.institution) {
                                <div class="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800">
                                    <span class="text-surface-500 text-sm">Courtier / Plateforme</span>
                                    <span class="text-surface-900 dark:text-surface-0 text-sm font-medium">{{ asset()!.institution }}</span>
                                </div>
                            }
                        </div>
                    </div>
                }

                <!-- Tontine specific -->
                @if (asset()!.category === 'tontine') {
                    <div>
                        <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-4">Détails de la tontine</h3>
                        <div class="space-y-3">
                            @if (tontineData(); as td) {
                                @if (td.mise_mensuelle) {
                                    <div class="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800">
                                        <span class="text-surface-500 text-sm">Mise mensuelle</span>
                                        <span class="text-surface-900 dark:text-surface-0 text-sm font-medium">{{ td.mise_mensuelle | number:'1.0-0' }} {{ td.devise || 'FCFA' }}</span>
                                    </div>
                                }
                                @if (td.participants) {
                                    <div class="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800">
                                        <span class="text-surface-500 text-sm">Nombre de participants</span>
                                        <span class="text-surface-900 dark:text-surface-0 text-sm font-medium">{{ td.participants }}</span>
                                    </div>
                                }
                                @if (td.date_collecte) {
                                    <div class="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800">
                                        <span class="text-surface-500 text-sm">Date de collecte de ma mise</span>
                                        <span class="text-surface-900 dark:text-surface-0 text-sm font-medium">{{ td.date_collecte }}</span>
                                    </div>
                                }
                                <div class="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800">
                                    <span class="text-surface-500 text-sm">Statut</span>
                                    <span class="text-sm font-medium px-2 py-0.5 rounded-full"
                                          [ngClass]="td.statut === 'mise_recue' ? 'bg-emerald-500/10 text-emerald-500' : td.statut === 'termine' ? 'bg-surface-500/10 text-surface-500' : 'bg-indigo-500/10 text-indigo-500'">
                                        {{ td.statut === 'mise_recue' ? 'Mise reçue ✓' : td.statut === 'termine' ? 'Terminée' : 'En cours' }}
                                    </span>
                                </div>
                            }
                            @if (asset()!.purchase_date) {
                                <div class="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800">
                                    <span class="text-surface-500 text-sm">Date de début</span>
                                    <span class="text-surface-900 dark:text-surface-0 text-sm font-medium">{{ asset()!.purchase_date }}</span>
                                </div>
                            }
                        </div>
                    </div>
                }

                <!-- Mobile Money specific -->
                @if (asset()!.category === 'mobile_money') {
                    <div>
                        <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-4">Compte Mobile Money</h3>
                        <div class="space-y-3">
                            @if (asset()!.institution) {
                                <div class="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800">
                                    <span class="text-surface-500 text-sm">Opérateur</span>
                                    <span class="text-sky-500 text-sm font-semibold">{{ asset()!.institution }}</span>
                                </div>
                            }
                            <div class="p-3 rounded-xl bg-sky-500/5 border border-sky-500/20 flex items-center gap-2 text-xs text-surface-400">
                                <i class="pi pi-info-circle text-sky-400"></i>
                                Intégration API Wave / Orange Money prévue — mises à jour automatiques à venir.
                            </div>
                        </div>
                    </div>
                }

                <!-- Vehicle specific -->
                @if (asset()!.category === 'vehicle') {
                    <div>
                        <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-4">Dépréciation estimée</h3>
                        <div class="space-y-3">
                            <div class="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800">
                                <span class="text-surface-500 text-sm">Taux de dépréciation annuel</span>
                                <span class="text-rose-500 text-sm font-medium">~15%/an</span>
                            </div>
                            <div class="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800">
                                <span class="text-surface-500 text-sm">Valeur estimée dans 5 ans</span>
                                <span class="text-surface-900 dark:text-surface-0 text-sm font-medium">
                                    <app-amount [value]="asset()!.current_value * Math.pow(0.85, 5)" />
                                </span>
                            </div>
                        </div>
                    </div>
                }
            </div>
        }

        <!-- ── Edit dialog ── -->
        <p-dialog [(visible)]="editDialog"
                  [style]="{ width: '95vw', maxWidth: '680px' }"
                  [modal]="true" [draggable]="false" [resizable]="false"
                  styleClass="!rounded-2xl overflow-hidden">
            <ng-template #header>
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                         [style.background]="categoryBg()">
                        <i [class]="categoryIcon()" class="text-white"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 m-0">Modifier l'actif</h3>
                        <p class="text-surface-500 text-sm m-0">{{ categoryLabel() }}</p>
                    </div>
                </div>
            </ng-template>
            <ng-template #content>
                <div class="space-y-6 pt-2">
                    <!-- Name -->
                    <div class="flex flex-col gap-1.5">
                        <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Nom de l'actif</label>
                        <input pInputText [(ngModel)]="editForm.name"
                               placeholder="Nom de l'actif"
                               class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary" />
                    </div>

                    <!-- Values section -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div class="flex flex-col gap-1.5">
                            <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Valeur actuelle <span class="text-red-400">*</span></label>
                            <div class="relative">
                                <p-inputnumber [(ngModel)]="editForm.currentValue"
                                               [min]="0" [maxFractionDigits]="2"
                                               inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary !pr-16" />
                                <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ cs.config().symbol }}</span>
                            </div>
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Prix d'achat</label>
                            <div class="relative">
                                <p-inputnumber [(ngModel)]="editForm.purchaseValue"
                                               [min]="0" [maxFractionDigits]="2"
                                               inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary !pr-16" />
                                <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ cs.config().symbol }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Date & Institution -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div class="flex flex-col gap-1.5">
                            <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Date d'achat</label>
                            <p-datepicker [(ngModel)]="editForm.purchaseDate"
                                          [showIcon]="true" [showButtonBar]="true"
                                          dateFormat="dd/mm/yy"
                                          styleClass="w-full"
                                          inputStyleClass="!py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary" />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Institution / Opérateur</label>
                            <input pInputText [(ngModel)]="editForm.institution"
                                   placeholder="Banque, plateforme..."
                                   class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary" />
                        </div>
                    </div>

                    @if (asset()!.category === 'real_estate') {
                        <!-- Real estate fields -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div class="flex flex-col gap-1.5">
                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Surface (m²)</label>
                                <p-inputnumber [(ngModel)]="editForm.surfaceM2"
                                               [min]="0" [maxFractionDigits]="1" suffix=" m²"
                                               inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary" />
                            </div>
                            <div class="flex flex-col gap-1.5">
                                <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Revenus locatifs/mois</label>
                                <div class="relative">
                                    <p-inputnumber [(ngModel)]="editForm.rentalIncome"
                                                   [min]="0" [maxFractionDigits]="2"
                                                   inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary !pr-16" />
                                    <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ cs.config().symbol }}/mois</span>
                                </div>
                            </div>
                        </div>
                        @if ((editForm.surfaceM2 ?? 0) > 0 && editForm.currentValue > 0) {
                            <div class="flex items-center justify-between px-4 py-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                                <span class="text-surface-500 text-sm">Prix au m² actuel</span>
                                <span class="text-indigo-400 font-semibold">
                                    {{ editForm.currentValue / editForm.surfaceM2! | number:'1.0-0' }} {{ cs.config().symbol }}/m²
                                </span>
                            </div>
                        }
                    }

                    @if (isQuantityBased()) {
                        <div class="flex flex-col gap-1.5">
                            <label class="text-surface-500 dark:text-surface-400 text-sm font-medium">Nombre de parts / Quantité</label>
                            <p-inputnumber [(ngModel)]="editForm.quantity"
                                           [min]="0" [maxFractionDigits]="6"
                                           placeholder="Ex : 10, 0.5..."
                                           inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-primary" />
                        </div>
                        @if ((editForm.quantity ?? 0) > 0 && editForm.currentValue > 0) {
                            <div class="flex items-center justify-between px-4 py-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
                                <span class="text-surface-500 text-sm">Prix unitaire actuel</span>
                                <span class="text-cyan-400 font-semibold">
                                    {{ editForm.currentValue / editForm.quantity! | number:'1.2-2' }} {{ cs.config().symbol }}/part
                                </span>
                            </div>
                        }
                    }
                </div>
            </ng-template>
            <ng-template #footer>
                <div class="flex gap-3 pt-2">
                    <p-button label="Annuler" icon="pi pi-times" [outlined]="true"
                              (click)="editDialog = false"
                              styleClass="flex-1 !rounded-xl !py-3" />
                    <p-button label="Enregistrer" icon="pi pi-check"
                              [loading]="isSaving()"
                              (click)="saveEdit()"
                              styleClass="flex-1 !rounded-xl !py-3 !bg-gradient-to-r !from-indigo-600 !to-cyan-500 !border-0" />
                </div>
            </ng-template>
        </p-dialog>
    `
})
export class AssetDetailPage implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private apiService = inject(ApiService);
    private stateService = inject(AssetsStateService);
    private confirmationService = inject(ConfirmationService);
    private messageService = inject(MessageService);
    readonly cs = inject(CurrencyService);

    readonly Math = Math;

    loading = signal(true);
    asset = signal<Asset | null>(null);
    isSaving = signal(false);
    editDialog = false;
    editForm = { name: '', currentValue: 0, purchaseValue: <number|null>null, purchaseDate: <Date|null>null, institution: '', surfaceM2: <number|null>null, rentalIncome: <number|null>null, quantity: <number|null>null };

    readonly QUANTITY_CATEGORIES = ['stocks', 'bonds', 'crypto', 'collectibles', 'commodities'];
    isQuantityBased = computed(() => this.QUANTITY_CATEGORIES.includes(this.asset()?.category ?? ''));

    /**
     * Read quantity from asset.quantity (new schema) OR from asset.notes JSON
     * (backward-compat with the deployed backend that has no quantity column).
     */
    private readQuantity(a: Asset): number | null {
        if (a.quantity != null) return a.quantity;
        if (a.notes) {
            try { return (JSON.parse(a.notes) as any)?.quantity ?? null; } catch { /* */ }
        }
        return null;
    }

    /**
     * Merge quantity into the notes JSON string, preserving any other notes keys.
     */
    private writeQuantityToNotes(existingNotes: string | null | undefined, qty: number | null): string | null {
        let data: Record<string, any> = {};
        if (existingNotes) {
            try { data = JSON.parse(existingNotes); } catch { /* */ }
        }
        if (qty != null) {
            data['quantity'] = qty;
        } else {
            delete data['quantity'];
        }
        const json = JSON.stringify(data);
        return json === '{}' ? null : json;
    }

    /** Quantity to display — reads from quantity field OR notes JSON. */
    readonly displayQuantity = computed(() => {
        const a = this.asset();
        return a ? this.readQuantity(a) : null;
    });

    gainLoss = computed(() => {
        const a = this.asset();
        if (!a || a.purchase_value === null) return null;
        return a.current_value - a.purchase_value;
    });

    gainLossPct = computed(() => {
        const a = this.asset();
        if (!a || !a.purchase_value) return null;
        return ((a.current_value - a.purchase_value) / a.purchase_value) * 100;
    });

    private readonly CATEGORY_ICONS: Record<string, string> = {
        real_estate:     'pi pi-building',
        stocks:          'pi pi-chart-line',
        bonds:           'pi pi-chart-bar',
        crypto:          'pi pi-bitcoin',
        cash:            'pi pi-wallet',
        retirement:      'pi pi-shield',
        life_insurance:  'pi pi-heart',
        savings_account: 'pi pi-dollar',
        business:        'pi pi-briefcase',
        vehicle:         'pi pi-car',
        tontine:         'pi pi-users',
        mobile_money:    'pi pi-mobile',
        collectibles:    'pi pi-star',
        commodities:     'pi pi-box',
        other:           'pi pi-box',
    };

    private readonly CATEGORY_BGS: Record<string, string> = {
        real_estate:     'linear-gradient(135deg, #6366f1, #4f46e5)',
        stocks:          'linear-gradient(135deg, #06b6d4, #0891b2)',
        bonds:           'linear-gradient(135deg, #10b981, #059669)',
        crypto:          'linear-gradient(135deg, #f59e0b, #d97706)',
        cash:            'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        retirement:      'linear-gradient(135deg, #14b8a6, #0d9488)',
        life_insurance:  'linear-gradient(135deg, #ec4899, #db2777)',
        savings_account: 'linear-gradient(135deg, #06b6d4, #0891b2)',
        business:        'linear-gradient(135deg, #f97316, #ea580c)',
        vehicle:         'linear-gradient(135deg, #64748b, #475569)',
        tontine:         'linear-gradient(135deg, #e11d48, #be123c)',
        mobile_money:    'linear-gradient(135deg, #0ea5e9, #0284c7)',
        collectibles:    'linear-gradient(135deg, #a855f7, #9333ea)',
        other:           'linear-gradient(135deg, #94a3b8, #64748b)',
    };

    private readonly CATEGORY_LABELS: Record<string, string> = {
        real_estate:     'Immobilier',
        stocks:          'Actions',
        bonds:           'Obligations',
        crypto:          'Crypto-monnaies',
        cash:            'Compte bancaire',
        retirement:      'Épargne retraite',
        life_insurance:  'Assurance vie',
        savings_account: 'Livret d\'épargne',
        business:        'Entreprise',
        vehicle:         'Véhicule',
        tontine:         'Tontine',
        mobile_money:    'Mobile Money',
        collectibles:    'Collections',
        commodities:     'Matières premières',
        other:           'Autres',
    };

    categoryIcon = computed(() => this.CATEGORY_ICONS[this.asset()?.category ?? ''] ?? 'pi pi-box');
    categoryBg = computed(() => this.CATEGORY_BGS[this.asset()?.category ?? ''] ?? 'linear-gradient(135deg, #94a3b8, #64748b)');
    categoryLabel = computed(() => this.CATEGORY_LABELS[this.asset()?.category ?? ''] ?? this.asset()?.category ?? '');

    tontineData = computed(() => {
        const notes = this.asset()?.notes;
        if (!notes) return null;
        try { return JSON.parse(notes); } catch { return null; }
    });

    async ngOnInit() {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (!id) { this.loading.set(false); return; }
        try {
            const a = await firstValueFrom(this.apiService.getAsset(id));
            this.asset.set(a);
        } catch {
            this.asset.set(null);
        } finally {
            this.loading.set(false);
        }
    }

    sparklinePoints(): string {
        const a = this.asset();
        if (!a) return '';
        const isPositive = (this.gainLoss() ?? 0) >= 0;
        const seed = Math.abs(Math.round(a.current_value + a.id * 1337));
        const pts: [number, number][] = [];
        let y = 30;
        for (let i = 0; i < 10; i++) {
            const rnd = ((seed * (i + 1) * 7919) % 1000) / 1000;
            const step = (rnd - 0.4) * 8;
            y = Math.max(5, Math.min(55, y + step + (isPositive ? 1.5 : -1.5)));
            pts.push([i * 20, y]);
        }
        return pts.map(([x, yv]) => `${x},${60 - yv}`).join(' ');
    }

    sparklinePath(): string {
        const pts = this.sparklinePoints();
        if (!pts) return '';
        const arr = pts.split(' ').map(p => p.split(',').map(Number));
        if (!arr.length) return '';
        const first = arr[0];
        const last = arr[arr.length - 1];
        return `M ${pts.replace(/ /g, ' L ')} L ${last[0]},60 L ${first[0]},60 Z`;
    }

    formatDate(dt: string): string {
        const d = new Date(dt);
        const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Juil','Août','Sep','Oct','Nov','Déc'];
        return `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`;
    }

    formatShortDate(dt: string): string {
        if (!dt) return '—';
        const [y, m, d] = dt.split('-');
        return `${d}/${m}/${y}`;
    }

    goBack() {
        const url = this.router.url;
        const match = url.match(/^\/(fr|en)\//);
        const lang = match ? match[1] : 'fr';
        // Try to go back to category detail if we know the category
        const cat = this.asset()?.category;
        const catToGroup: Record<string, string> = {
            real_estate: 'real_estate',
            stocks: 'stocks_bonds', bonds: 'stocks_bonds',
            savings_account: 'savings', cash: 'savings', life_insurance: 'savings', retirement: 'savings',
            crypto: 'crypto',
            business: 'other', vehicle: 'other', collectibles: 'other', commodities: 'other', other: 'other',
        };
        const groupId = cat ? catToGroup[cat] : null;
        if (groupId) {
            this.router.navigate(['/', lang, 'pages', 'patrimoine', 'category', groupId]);
        } else {
            this.router.navigate(['/', lang, 'pages', 'patrimoine']);
        }
    }

    editAsset() {
        const a = this.asset();
        if (!a) return;
        this.editForm = {
            name: a.name,
            currentValue: a.current_value,
            purchaseValue: a.purchase_value ?? null,
            purchaseDate: a.purchase_date ? new Date(a.purchase_date) : null,
            institution: a.institution ?? '',
            surfaceM2: a.surface_m2 ?? null,
            rentalIncome: a.rental_income ?? null,
            quantity: this.readQuantity(a),
        };
        this.editDialog = true;
    }

    saveEdit() {
        const a = this.asset();
        if (!a || !this.editForm.name?.trim() || this.editForm.currentValue == null) return;
        this.isSaving.set(true);
        const payload: any = {
            name: this.editForm.name.trim(),
            current_value: this.editForm.currentValue,
        };
        if (this.editForm.purchaseValue != null) payload.purchase_value = this.editForm.purchaseValue;
        if (this.editForm.purchaseDate) {
            payload.purchase_date = this.editForm.purchaseDate instanceof Date
                ? this.editForm.purchaseDate.toISOString().split('T')[0]
                : this.editForm.purchaseDate;
        }
        if (this.editForm.institution) payload.institution = this.editForm.institution;
        if (this.editForm.surfaceM2 != null) payload.surface_m2 = this.editForm.surfaceM2;
        if (this.editForm.rentalIncome != null) payload.rental_income = this.editForm.rentalIncome;

        // Persist quantity in TWO ways so it works regardless of backend version:
        // 1. quantity field — picked up by backends that have the DB column
        // 2. notes JSON   — works on the current deployed backend with no column
        if (this.isQuantityBased()) {
            payload.quantity = this.editForm.quantity;
            payload.notes = this.writeQuantityToNotes(a.notes, this.editForm.quantity);
        }

        // Snapshot the quantity the user entered before the async call clears editForm
        const savedQuantity = this.editForm.quantity;

        this.apiService.updateAsset(a.id, payload).subscribe({
            next: () => {
                // Optimistic update — apply all form values immediately so the UI
                // never reverts while the re-fetch is in-flight.
                this.asset.update(curr => curr ? {
                    ...curr,
                    name: this.editForm.name.trim(),
                    current_value: this.editForm.currentValue,
                    purchase_value: this.editForm.purchaseValue ?? curr.purchase_value,
                    institution: this.editForm.institution || curr.institution,
                    surface_m2: this.editForm.surfaceM2 ?? curr.surface_m2,
                    rental_income: this.editForm.rentalIncome ?? curr.rental_income,
                    quantity: savedQuantity,
                    notes: this.isQuantityBased()
                        ? this.writeQuantityToNotes(curr.notes, savedQuantity)
                        : curr.notes,
                } : null);

                this.editDialog = false;
                this.isSaving.set(false);
                this.stateService.notifyAssetsUpdated();
                this.messageService.add({ severity: 'success', summary: 'Modifié', detail: 'Actif mis à jour avec succès.', life: 3000 });

                // Background re-fetch — keep the locally-saved quantity
                // if the server response doesn't include it yet.
                this.apiService.getAsset(a.id).subscribe({
                    next: (fresh: Asset) => {
                        this.asset.set({
                            ...fresh,
                            quantity: fresh.quantity ?? this.readQuantity(fresh) ?? savedQuantity,
                        });
                    }
                });
            },
            error: () => {
                this.isSaving.set(false);
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de mettre à jour l\'actif.', life: 4000 });
            }
        });
    }

    confirmDelete() {
        this.confirmationService.confirm({
            message: `Supprimer "${this.asset()?.name}" ? Cette action est irréversible.`,
            header: 'Confirmer la suppression',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: '!bg-red-500 !border-red-500',
            accept: () => this.deleteAsset()
        });
    }

    private deleteAsset() {
        const id = this.asset()?.id;
        if (!id) return;
        this.apiService.deleteAsset(id).subscribe({
            next: () => {
                this.stateService.notifyAssetsUpdated();
                this.goBack();
            },
            error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer l\'actif.', life: 4000 })
        });
    }
}
