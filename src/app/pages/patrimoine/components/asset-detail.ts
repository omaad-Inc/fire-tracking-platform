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
import { SelectModule } from 'primeng/select';
import { ConfirmationService, MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { ApiService, Asset } from '../../../core/services/api.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { NavService } from '../../../core/services/nav.service';
import { ShareContextService } from '../../../core/services/share-context.service';
import { I18nService } from '../../../i18n/i18n.service';
import { AssetsStateService } from '../../service/assets-state.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { TontineCyclesComponent } from './tontine-cycles';
import { AssetFormShape, getAssetFormShape, MOBILE_MONEY_OPERATORS, TontineStatus } from '../asset-form-shape';

@Component({
    selector: 'app-asset-detail',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, ButtonModule, TagModule, DividerModule,
              ConfirmDialogModule, ToastModule, DialogModule, InputTextModule, InputNumberModule,
              DatePickerModule, SelectModule, AppAmountComponent, TontineCyclesComponent],
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
                <h3 class="text-xl font-semibold text-surface-700 dark:text-surface-200 mb-2">{{ isFr() ? 'Actif introuvable' : 'Asset not found' }}</h3>
                <button pButton [label]="isFr() ? 'Retour au patrimoine' : 'Back to portfolio'" icon="pi pi-arrow-left"
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
                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl shrink-0 flex items-center justify-center bg-brand-100 dark:bg-brand-700/20">
                        <i [class]="categoryIcon()" class="text-brand-700 dark:text-ochre-400 text-lg sm:text-xl"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <h1 class="text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-0 m-0 truncate">{{ asset()!.name }}</h1>
                        <span class="text-surface-500 text-sm">{{ categoryLabel() }}</span>
                    </div>
                </div>
                <div *ngIf="!share.active()" class="flex items-center gap-1.5 shrink-0">
                    <button pButton icon="pi pi-pencil" severity="secondary"
                            [outlined]="true" size="small" (click)="editAsset()"
                            class="!w-9 !h-9 !p-0"></button>
                    <button pButton icon="pi pi-trash" severity="danger"
                            [outlined]="true" size="small" (click)="confirmDelete()"
                            class="!w-9 !h-9 !p-0"></button>
                </div>
            </div>

            <!-- Value + date -->
            <div class="relative overflow-hidden rounded-2xl bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 mb-6">
                <div class="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div>
                        <p class="text-surface-500 dark:text-surface-400 text-sm mb-1">{{ formatDate(asset()!.updated_at) }}</p>
                        <div class="text-4xl md:text-5xl font-bold text-surface-900 dark:text-surface-0">
                            <app-amount [value]="valueEur()" />
                        </div>
                        @if (gainLoss() !== null) {
                            <div class="flex items-center gap-2 mt-2">
                                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-semibold"
                                      [ngClass]="(gainLoss()! >= 0) ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'">
                                    <i class="pi text-xs" [ngClass]="gainLoss()! >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'"></i>
                                    <app-amount [value]="gainLoss()!" [prefix]="gainLoss()! >= 0 ? '+' : '-'" />
                                    @if (gainLossPct() !== null) {
                                        ({{ gainLossPct()! >= 0 ? '+' : '' }}{{ gainLossPct() | number:'1.1-1' }}%)
                                    }
                                </span>
                                <span class="text-surface-400 text-sm">{{ isFr() ? 'depuis l\\'achat' : 'since purchase' }}</span>
                            </div>
                        }
                    </div>
                    <!-- Mini chart (SVG sparkline) -->
                    <div class="flex-shrink-0">
                        <svg viewBox="0 0 180 60" width="180" height="60" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" [attr.stop-color]="gainLoss() !== null && gainLoss()! >= 0 ? '#2F8F6E' : '#B0463E'" stop-opacity="0.3"/>
                                    <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
                                </linearGradient>
                            </defs>
                            <path [attr.d]="sparklinePath()" fill="url(#sparkGrad)" />
                            <polyline [attr.points]="sparklinePoints()"
                                      fill="none"
                                      [attr.stroke]="gainLoss() !== null && gainLoss()! >= 0 ? '#2F8F6E' : '#B0463E'"
                                      stroke-width="2.5"
                                      stroke-linecap="round"
                                      stroke-linejoin="round" />
                        </svg>
                    </div>
                </div>
            </div>

            <!-- KPI Row, category-aware tiles, all on the standard card surface -->
            <div class="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-3 mb-6" style="grid-auto-rows: 1fr;">
                @switch (formShape()) {
                    @case ('TONTINE') {
                        <div class="detail-surface kpi-tile">
                            <p class="kpi-label">{{ isFr() ? 'Mise mensuelle' : 'Monthly contribution' }}</p>
                            <div class="kpi-value">
                                @if (asset()!.tontine_monthly_contribution != null) {
                                    <app-amount [value]="asset()!.tontine_monthly_contribution!" />
                                } @else {
                                    <span class="text-surface-400">, </span>
                                }
                            </div>
                            <p class="kpi-sub">{{ isFr() ? 'par cycle' : 'per cycle' }}</p>
                        </div>
                        <div class="detail-surface kpi-tile">
                            <p class="kpi-label">{{ isFr() ? 'Participants' : 'Participants' }}</p>
                            <div class="kpi-value">
                                {{ asset()!.tontine_participants ?? ', ' }}
                            </div>
                            <p class="kpi-sub">{{ isFr() ? 'membres du groupe' : 'group members' }}</p>
                        </div>
                        <div class="detail-surface kpi-tile">
                            <p class="kpi-label">{{ isFr() ? 'Statut' : 'Status' }}</p>
                            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold mt-1"
                                  [ngClass]="tontineStatusClass()">
                                {{ tontineStatusLabel() }}
                            </span>
                            <p class="kpi-sub mt-1.5">cycle en cours</p>
                        </div>
                    }
                    @case ('MOBILE_MONEY') {
                        <div class="detail-surface kpi-tile">
                            <p class="kpi-label">{{ isFr() ? 'Opérateur' : 'Provider' }}</p>
                            <div class="kpi-value truncate max-w-full">
                                {{ asset()!.mobile_money_operator || ', ' }}
                            </div>
                            <p class="kpi-sub">{{ isFr() ? 'portefeuille mobile' : 'mobile wallet' }}</p>
                        </div>
                        <div class="detail-surface kpi-tile">
                            <p class="kpi-label">{{ isFr() ? 'Liquidité' : 'Liquidity' }}</p>
                            <div class="kpi-value text-positive">{{ isFr() ? 'Immédiate' : 'Immediate' }}</div>
                            <p class="kpi-sub">{{ isFr() ? 'disponible à tout moment' : 'available anytime' }}</p>
                        </div>
                        <div class="detail-surface kpi-tile">
                            <p class="kpi-label">{{ isFr() ? 'Dernière mise à jour' : 'Last updated' }}</p>
                            <div class="kpi-value text-base">{{ formatDate(asset()!.updated_at) }}</div>
                            <p class="kpi-sub">{{ isFr() ? 'solde renseigné' : 'balance entered' }}</p>
                        </div>
                    }
                    @case ('SIMPLE_BALANCE') {
                        <div class="detail-surface kpi-tile">
                            <p class="kpi-label">{{ isFr() ? 'Institution' : 'Institution' }}</p>
                            <div class="kpi-value truncate max-w-full">
                                {{ asset()!.institution || ', ' }}
                            </div>
                            <p class="kpi-sub">{{ isFr() ? 'où sont vos fonds' : 'where your funds are' }}</p>
                        </div>
                        <div class="detail-surface kpi-tile">
                            <p class="kpi-label">{{ isFr() ? 'Liquidité' : 'Liquidity' }}</p>
                            <div class="kpi-value text-positive">{{ isFr() ? 'Immédiate' : 'Immediate' }}</div>
                            <p class="kpi-sub">{{ isFr() ? 'retrait sans frais' : 'free withdrawal' }}</p>
                        </div>
                        <div class="detail-surface kpi-tile">
                            <p class="kpi-label">{{ isFr() ? 'Devise' : 'Currency' }}</p>
                            <div class="kpi-value">{{ asset()!.currency }}</div>
                            <p class="kpi-sub">{{ isFr() ? 'unité de compte' : 'unit of account' }}</p>
                        </div>
                    }
                    @case ('QUANTITY_BASED') {
                        <div class="detail-surface kpi-tile">
                            <p class="kpi-label">{{ isFr() ? 'Quantité' : 'Quantity' }}</p>
                            <div class="kpi-value">
                                @if (displayQuantity() != null) {
                                    {{ displayQuantity() | number:'1.0-6' }}
                                } @else {
                                    <span class="text-surface-400">, </span>
                                }
                            </div>
                            <p class="kpi-sub">{{ isFr() ? 'parts détenues' : 'units held' }}</p>
                        </div>
                        <div class="detail-surface kpi-tile">
                            <p class="kpi-label">{{ isFr() ? 'Prix unitaire' : 'Unit price' }}</p>
                            <div class="kpi-value">
                                @if (displayQuantity() != null && displayQuantity()! > 0) {
                                    <app-amount [value]="valueEur() / displayQuantity()!" />
                                } @else {
                                    <span class="text-surface-400">, </span>
                                }
                            </div>
                            <p class="kpi-sub">{{ isFr() ? 'cours actuel estimé' : 'current estimated price' }}</p>
                        </div>
                        <div class="detail-surface kpi-tile">
                            <p class="kpi-label">P&amp;L</p>
                            @if (gainLoss() !== null) {
                                <div class="kpi-value" [ngClass]="gainLoss()! >= 0 ? 'text-positive' : 'text-negative'">
                                    <app-amount [value]="gainLoss()!" [prefix]="gainLoss()! >= 0 ? '+' : '-'" />
                                </div>
                                <p class="kpi-sub">{{ isFr() ? 'depuis l\\'achat' : 'since purchase' }}</p>
                            } @else {
                                <div class="kpi-value text-surface-400">, </div>
                                <p class="kpi-sub">{{ isFr() ? 'renseignez le prix d\\'achat' : 'enter the purchase price' }}</p>
                            }
                        </div>
                    }
                    @case ('REAL_ESTATE') {
                        <div class="detail-surface kpi-tile">
                            <p class="kpi-label">{{ isFr() ? 'Surface' : 'Area' }}</p>
                            <div class="kpi-value">
                                @if (asset()!.surface_m2) {
                                    {{ asset()!.surface_m2 }} m²
                                } @else {
                                    <span class="text-surface-400">, </span>
                                }
                            </div>
                            <p class="kpi-sub">{{ isFr() ? 'surface habitable' : 'living area' }}</p>
                        </div>
                        <div class="detail-surface kpi-tile">
                            <p class="kpi-label">{{ isFr() ? 'Prix au m²' : 'Price per m²' }}</p>
                            <div class="kpi-value">
                                @if (asset()!.surface_m2 && asset()!.surface_m2! > 0) {
                                    <app-amount [value]="valueEur() / asset()!.surface_m2!" />
                                } @else {
                                    <span class="text-surface-400">, </span>
                                }
                            </div>
                            <p class="kpi-sub">{{ isFr() ? 'valeur courante estimée' : 'current estimated value' }}</p>
                        </div>
                        <div class="detail-surface kpi-tile">
                            <p class="kpi-label">{{ isFr() ? 'Revenus locatifs' : 'Rental income' }}</p>
                            <div class="kpi-value">
                                @if (asset()!.rental_income) {
                                    <app-amount [value]="asset()!.rental_income!" />
                                } @else {
                                    <span class="text-surface-400">, </span>
                                }
                            </div>
                            <p class="kpi-sub">{{ isFr() ? 'par mois' : 'per month' }}</p>
                        </div>
                    }
                    @default {
                        <!-- TOTAL_VALUE, retirement, life insurance, business, vehicle, collectibles, other -->
                        <div class="detail-surface kpi-tile">
                            <p class="kpi-label">P&amp;L</p>
                            @if (gainLoss() !== null) {
                                <div class="kpi-value" [ngClass]="gainLoss()! >= 0 ? 'text-positive' : 'text-negative'">
                                    <app-amount [value]="gainLoss()!" [prefix]="gainLoss()! >= 0 ? '+' : '-'" />
                                </div>
                                <p class="kpi-sub">{{ isFr() ? 'depuis l\\'achat' : 'since purchase' }}</p>
                            } @else {
                                <div class="kpi-value text-surface-400">, </div>
                                <p class="kpi-sub">{{ isFr() ? 'renseignez le prix d\\'achat' : 'enter the purchase price' }}</p>
                            }
                        </div>
                        <div class="detail-surface kpi-tile">
                            <p class="kpi-label">{{ isFr() ? 'Prix d\\'achat' : 'Purchase price' }}</p>
                            <div class="kpi-value">
                                @if (asset()!.purchase_value) {
                                    <app-amount [value]="asset()!.purchase_value!" />
                                } @else {
                                    <span class="text-surface-400">, </span>
                                }
                            </div>
                            <p class="kpi-sub">
                                @if (asset()!.purchase_date) { {{ formatShortDate(asset()!.purchase_date!) }} } @else { {{ isFr() ? 'coût d\\'acquisition' : 'acquisition cost' }} }
                            </p>
                        </div>
                        <div class="detail-surface kpi-tile">
                            <p class="kpi-label">{{ isFr() ? 'Institution' : 'Institution' }}</p>
                            <div class="kpi-value truncate max-w-full">
                                {{ asset()!.institution || ', ' }}
                            </div>
                            <p class="kpi-sub">{{ isFr() ? 'où l\\'actif est détenu' : 'where the asset is held' }}</p>
                        </div>
                    }
                }
            </div>

            <!-- Specifications, Informations générales (premium spec list) + per-category card -->
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <!-- Informations générales, premium icon-row layout -->
                <div class="detail-surface">
                    <div class="flex items-center justify-between px-5 py-4 border-b border-surface-200 dark:border-surface-700">
                        <h3 class="text-base font-bold text-surface-900 dark:text-surface-0 m-0">
                            {{ isFr() ? 'Informations générales' : 'General information' }}
                        </h3>
                        <span class="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-surface-100 dark:bg-surface-800 text-surface-500">
                            {{ categoryLabel() }}
                        </span>
                    </div>
                    <div class="px-5 py-2">
                        @for (row of generalInfoRows(); track row.label) {
                            <div class="flex items-center gap-3 py-3 border-b border-surface-100 dark:border-surface-800 last:border-b-0">
                                <div class="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center shrink-0">
                                    <i class="pi text-brand-700 dark:text-ochre-400 text-sm" [ngClass]="row.icon"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ row.label }}</p>
                                    <p class="text-sm font-semibold text-surface-900 dark:text-surface-0 truncate" [ngClass]="row.valueClass || ''">
                                        {{ row.value }}
                                    </p>
                                </div>
                            </div>
                        }
                    </div>
                </div>

                <!-- Per-category card -->
                @switch (formShape()) {
                    @case ('REAL_ESTATE') {
                        <div class="detail-surface">
                            <div class="px-5 py-4 border-b border-surface-200 dark:border-surface-700">
                                <h3 class="text-base font-bold text-surface-900 dark:text-surface-0 m-0">{{ isFr() ? 'Spécifications immobilières' : 'Property specifications' }}</h3>
                            </div>
                            <div class="px-5 py-2">
                                @for (row of realEstateRows(); track row.label) {
                                    <div class="flex items-center gap-3 py-3 border-b border-surface-100 dark:border-surface-800 last:border-b-0">
                                        <div class="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center shrink-0">
                                            <i class="pi text-brand-700 dark:text-ochre-400 text-sm" [ngClass]="row.icon"></i>
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ row.label }}</p>
                                            <p class="text-sm font-semibold text-surface-900 dark:text-surface-0" [ngClass]="row.valueClass || ''">
                                                {{ row.value }}
                                            </p>
                                        </div>
                                    </div>
                                }
                            </div>
                            @if (asset()!.agency_fees || asset()!.notary_fees || asset()!.renovation_fees || asset()!.furnishing_costs) {
                                <div class="px-5 py-4 border-t border-surface-200 dark:border-surface-700">
                                    <h4 class="text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-3">{{ isFr() ? 'Frais d\\'acquisition' : 'Acquisition fees' }}</h4>
                                    <div class="grid grid-cols-2 gap-3">
                                        <div class="p-3 rounded-xl bg-surface-50 dark:bg-surface-800">
                                            <p class="text-[11px] text-surface-500 mb-1">{{ isFr() ? 'Agence' : 'Agency' }}</p>
                                            <p class="font-bold text-surface-900 dark:text-surface-0 text-sm">
                                                @if (asset()!.agency_fees) { <app-amount [value]="asset()!.agency_fees!" /> } @else { <span class="text-surface-400">, </span> }
                                            </p>
                                        </div>
                                        <div class="p-3 rounded-xl bg-surface-50 dark:bg-surface-800">
                                            <p class="text-[11px] text-surface-500 mb-1">{{ isFr() ? 'Notaire' : 'Notary' }}</p>
                                            <p class="font-bold text-surface-900 dark:text-surface-0 text-sm">
                                                @if (asset()!.notary_fees) { <app-amount [value]="asset()!.notary_fees!" /> } @else { <span class="text-surface-400">, </span> }
                                            </p>
                                        </div>
                                        <div class="p-3 rounded-xl bg-surface-50 dark:bg-surface-800">
                                            <p class="text-[11px] text-surface-500 mb-1">{{ isFr() ? 'Rénovation' : 'Renovation' }}</p>
                                            <p class="font-bold text-surface-900 dark:text-surface-0 text-sm">
                                                @if (asset()!.renovation_fees) { <app-amount [value]="asset()!.renovation_fees!" /> } @else { <span class="text-surface-400">, </span> }
                                            </p>
                                        </div>
                                        <div class="p-3 rounded-xl bg-surface-50 dark:bg-surface-800">
                                            <p class="text-[11px] text-surface-500 mb-1">{{ isFr() ? 'Ameublement' : 'Furnishing' }}</p>
                                            <p class="font-bold text-surface-900 dark:text-surface-0 text-sm">
                                                @if (asset()!.furnishing_costs) { <app-amount [value]="asset()!.furnishing_costs!" /> } @else { <span class="text-surface-400">, </span> }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            }
                        </div>
                    }
                    @case ('QUANTITY_BASED') {
                        <div class="detail-surface">
                            <div class="px-5 py-4 border-b border-surface-200 dark:border-surface-700">
                                <h3 class="text-base font-bold text-surface-900 dark:text-surface-0 m-0">{{ isFr() ? 'Performance' : 'Performance' }}</h3>
                            </div>
                            <div class="px-5 py-2">
                                @for (row of performanceRows(); track row.label) {
                                    <div class="flex items-center gap-3 py-3 border-b border-surface-100 dark:border-surface-800 last:border-b-0">
                                        <div class="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center shrink-0">
                                            <i class="pi text-brand-700 dark:text-ochre-400 text-sm" [ngClass]="row.icon"></i>
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ row.label }}</p>
                                            <p class="text-sm font-semibold" [ngClass]="row.valueClass || 'text-surface-900 dark:text-surface-0'">
                                                {{ row.value }}
                                            </p>
                                        </div>
                                    </div>
                                }
                            </div>
                        </div>
                    }
                    @case ('TONTINE') {
                        <div class="detail-surface">
                            <div class="px-5 py-4 border-b border-surface-200 dark:border-surface-700">
                                <h3 class="text-base font-bold text-surface-900 dark:text-surface-0 m-0">{{ isFr() ? 'Détails de la tontine' : 'Tontine details' }}</h3>
                            </div>
                            <div class="px-5 py-2">
                                @for (row of tontineRows(); track row.label) {
                                    <div class="flex items-center gap-3 py-3 border-b border-surface-100 dark:border-surface-800 last:border-b-0">
                                        <div class="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center shrink-0">
                                            <i class="pi text-brand-700 dark:text-ochre-400 text-sm" [ngClass]="row.icon"></i>
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ row.label }}</p>
                                            <p class="text-sm font-semibold" [ngClass]="row.valueClass || 'text-surface-900 dark:text-surface-0'">
                                                {{ row.value }}
                                            </p>
                                        </div>
                                    </div>
                                }
                            </div>
                        </div>
                        <app-tontine-cycles class="block mt-4" [assetId]="asset()!.id" [currency]="asset()!.currency" />
                    }
                    @case ('MOBILE_MONEY') {
                        <div class="detail-surface">
                            <div class="px-5 py-4 border-b border-surface-200 dark:border-surface-700">
                                <h3 class="text-base font-bold text-surface-900 dark:text-surface-0 m-0">{{ isFr() ? 'Compte Mobile Money' : 'Mobile Money account' }}</h3>
                            </div>
                            <div class="px-5 py-2">
                                <div class="flex items-center gap-3 py-3">
                                    <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-ochre-100 dark:bg-ochre-900/20">
                                        <i class="pi pi-mobile text-sm text-ochre-600 dark:text-ochre-400"></i>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ isFr() ? 'Opérateur' : 'Provider' }}</p>
                                        <p class="text-sm font-bold text-surface-900 dark:text-surface-0">
                                            {{ asset()!.mobile_money_operator || ', ' }}
                                        </p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3 py-3">
                                    <div class="w-9 h-9 rounded-lg bg-positive/10 flex items-center justify-center shrink-0">
                                        <i class="pi pi-wave-pulse text-positive text-sm"></i>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ isFr() ? 'Liquidité' : 'Liquidity' }}</p>
                                        <p class="text-sm font-semibold text-positive">{{ isFr() ? 'Disponible immédiatement' : 'Available immediately' }}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="mx-5 mb-5 p-3 rounded-xl bg-brand-50/60 dark:bg-brand-900/30 border border-brand-100 dark:border-brand-800 flex items-start gap-2 text-xs text-surface-500">
                                <i class="pi pi-info-circle text-brand-700 dark:text-brand-300 mt-0.5"></i>
                                <span>{{ isFr() ? 'Intégration API Wave / Orange Money prévue, synchronisations automatiques à venir.' : 'Wave / Orange Money API integration planned, automatic syncing coming soon.' }}</span>
                            </div>
                        </div>
                    }
                    @case ('SIMPLE_BALANCE') {
                        <div class="detail-surface">
                            <div class="px-5 py-4 border-b border-surface-200 dark:border-surface-700">
                                <h3 class="text-base font-bold text-surface-900 dark:text-surface-0 m-0">{{ isFr() ? 'Compte' : 'Account' }}</h3>
                            </div>
                            <div class="px-5 py-2">
                                <div class="flex items-center gap-3 py-3 border-b border-surface-100 dark:border-surface-800">
                                    <div class="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center shrink-0">
                                        <i class="pi pi-building text-brand-700 dark:text-ochre-400 text-sm"></i>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ isFr() ? 'Institution' : 'Institution' }}</p>
                                        <p class="text-sm font-semibold text-surface-900 dark:text-surface-0">{{ asset()!.institution || ', ' }}</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3 py-3 border-b border-surface-100 dark:border-surface-800">
                                    <div class="w-9 h-9 rounded-lg bg-positive/10 flex items-center justify-center shrink-0">
                                        <i class="pi pi-bolt text-positive text-sm"></i>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ isFr() ? 'Liquidité' : 'Liquidity' }}</p>
                                        <p class="text-sm font-semibold text-positive">{{ isFr() ? 'Immédiate, retrait sans préavis' : 'Immediate, withdraw without notice' }}</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3 py-3">
                                    <div class="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center shrink-0">
                                        <i class="pi pi-calendar text-brand-700 dark:text-ochre-400 text-sm"></i>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ isFr() ? 'Suivi depuis' : 'Tracked since' }}</p>
                                        <p class="text-sm font-semibold text-surface-900 dark:text-surface-0">{{ formatDate(asset()!.created_at) }}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    }
                    @default {
                        <!-- TOTAL_VALUE, show a simple "Suivi" card so the right column is never empty -->
                        <div class="detail-surface">
                            <div class="px-5 py-4 border-b border-surface-200 dark:border-surface-700">
                                <h3 class="text-base font-bold text-surface-900 dark:text-surface-0 m-0">{{ isFr() ? 'Suivi' : 'Tracking' }}</h3>
                            </div>
                            <div class="px-5 py-2">
                                <div class="flex items-center gap-3 py-3 border-b border-surface-100 dark:border-surface-800">
                                    <div class="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center shrink-0">
                                        <i class="pi pi-calendar text-brand-700 dark:text-ochre-400 text-sm"></i>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ isFr() ? 'Suivi depuis' : 'Tracked since' }}</p>
                                        <p class="text-sm font-semibold text-surface-900 dark:text-surface-0">{{ formatDate(asset()!.created_at) }}</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3 py-3 border-b border-surface-100 dark:border-surface-800">
                                    <div class="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-700/20 flex items-center justify-center shrink-0">
                                        <i class="pi pi-history text-brand-700 dark:text-ochre-400 text-sm"></i>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ isFr() ? 'Dernière mise à jour' : 'Last updated' }}</p>
                                        <p class="text-sm font-semibold text-surface-900 dark:text-surface-0">{{ formatDate(asset()!.updated_at) }}</p>
                                    </div>
                                </div>
                                @if (asset()!.category === 'vehicle') {
                                    <div class="flex items-center gap-3 py-3">
                                        <div class="w-9 h-9 rounded-lg bg-negative/10 flex items-center justify-center shrink-0">
                                            <i class="pi pi-chart-line text-negative text-sm" style="transform: scaleY(-1);"></i>
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <p class="text-[11px] font-medium uppercase tracking-wider text-surface-400 mb-0.5">{{ isFr() ? 'Dépréciation estimée' : 'Estimated depreciation' }}</p>
                                            <p class="text-sm font-semibold text-negative">{{ isFr() ? '~15 % / an' : '~15% / yr' }}</p>
                                            <p class="text-[11px] text-surface-500 mt-0.5">
                                                {{ isFr() ? 'Valeur dans 5 ans :' : 'Value in 5 years:' }} <span class="font-semibold"><app-amount [value]="valueEur() * Math.pow(0.85, 5)" /></span>
                                            </p>
                                        </div>
                                    </div>
                                }
                            </div>
                        </div>
                    }
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
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-100 dark:bg-brand-700/20">
                        <i [class]="categoryIcon()" class="text-brand-700 dark:text-ochre-400"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 m-0">{{ isFr() ? 'Modifier l\\'actif' : 'Edit asset' }}</h3>
                        <p class="text-surface-500 text-sm m-0">{{ categoryLabel() }}</p>
                    </div>
                </div>
            </ng-template>
            <ng-template #content>
                <div class="space-y-6 pt-2">
                    <!-- Name (shared across all shapes) -->
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Nom de l\\'actif' : 'Asset name' }}</label>
                        <input pInputText [(ngModel)]="editForm.name"
                               [placeholder]="isFr() ? 'Nom de l\\'actif' : 'Asset name'"
                               class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                    </div>

                    @switch (formShape()) {
                        <!-- ─────────────── TONTINE ─────────────── -->
                        @case ('TONTINE') {
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Mise mensuelle' : 'Monthly contribution' }} <span class="text-negative">*</span></label>
                                    <div class="relative">
                                        <p-inputnumber [(ngModel)]="editForm.tontineMonthlyContribution"
                                                       [min]="0" [maxFractionDigits]="0"
                                                       inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-16" />
                                        <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ assetSymbol() }}</span>
                                    </div>
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Nombre de participants' : 'Number of participants' }} <span class="text-negative">*</span></label>
                                    <p-inputnumber [(ngModel)]="editForm.tontineParticipants"
                                                   [min]="2" [max]="100"
                                                   inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                </div>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Date de début' : 'Start date' }} <span class="text-negative">*</span></label>
                                    <p-datepicker [(ngModel)]="editForm.tontineStartDate"
                                                  [showIcon]="true" [showButtonBar]="true"
                                                  dateFormat="dd/mm/yy" styleClass="w-full"
                                                  inputStyleClass="!py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Date de collecte de ma mise' : 'My payout date' }}</label>
                                    <p-datepicker [(ngModel)]="editForm.tontineCollectionDate"
                                                  [showIcon]="true" [showButtonBar]="true"
                                                  dateFormat="dd/mm/yy" styleClass="w-full"
                                                  inputStyleClass="!py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                </div>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Statut' : 'Status' }}</label>
                                    <p-select [(ngModel)]="editForm.tontineStatus"
                                              [options]="tontineStatusOptions"
                                              optionLabel="label" optionValue="value"
                                              styleClass="w-full !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !shadow-none" />
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Fréquence' : 'Frequency' }}</label>
                                    <p-select [(ngModel)]="editForm.tontineFrequency"
                                              [options]="tontineFrequencyOptions"
                                              optionLabel="label" optionValue="value"
                                              styleClass="w-full !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !shadow-none" />
                                </div>
                            </div>

                            <div class="flex flex-col gap-1.5">
                                <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Valeur accumulée' : 'Accumulated value' }} <span class="text-negative">*</span></label>
                                <div class="relative">
                                    <p-inputnumber [(ngModel)]="editForm.currentValue"
                                                   [min]="0" [maxFractionDigits]="2"
                                                   inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-16" />
                                    <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ assetSymbol() }}</span>
                                </div>
                            </div>
                        }

                        <!-- ─────────────── MOBILE MONEY ─────────────── -->
                        @case ('MOBILE_MONEY') {
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Opérateur' : 'Provider' }} <span class="text-negative">*</span></label>
                                    <p-select [(ngModel)]="editForm.mobileMoneyOperator"
                                              [options]="mobileMoneyOperatorOptions"
                                              optionLabel="label" optionValue="value"
                                              [placeholder]="isFr() ? 'Sélectionner l\\'opérateur' : 'Select provider'"
                                              styleClass="w-full !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none !shadow-none" />
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Solde actuel' : 'Current balance' }} <span class="text-negative">*</span></label>
                                    <div class="relative">
                                        <p-inputnumber [(ngModel)]="editForm.currentValue"
                                                       [min]="0" [maxFractionDigits]="2"
                                                       inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-16" />
                                        <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ assetSymbol() }}</span>
                                    </div>
                                </div>
                            </div>
                        }

                        <!-- ─────────────── SIMPLE BALANCE (cash, livret) ─────────────── -->
                        @case ('SIMPLE_BALANCE') {
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Institution' : 'Institution' }}</label>
                                    <input pInputText [(ngModel)]="editForm.institution"
                                           [placeholder]="isFr() ? 'Banque, livret...' : 'Bank, savings...'"
                                           class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Solde actuel' : 'Current balance' }} <span class="text-negative">*</span></label>
                                    <div class="relative">
                                        <p-inputnumber [(ngModel)]="editForm.currentValue"
                                                       [min]="0" [maxFractionDigits]="2"
                                                       inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-16" />
                                        <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ assetSymbol() }}</span>
                                    </div>
                                </div>
                            </div>
                        }

                        <!-- ─────────────── QUANTITY-BASED (stocks, bonds, crypto, commodities) ─────────────── -->
                        @case ('QUANTITY_BASED') {
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Institution / Broker' : 'Institution / Broker' }}</label>
                                    <input pInputText [(ngModel)]="editForm.institution"
                                           [placeholder]="isFr() ? 'Broker, plateforme...' : 'Broker, platform...'"
                                           class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Quantité' : 'Quantity' }}</label>
                                    <p-inputnumber [(ngModel)]="editForm.quantity"
                                                   [min]="0" [maxFractionDigits]="6"
                                                   [placeholder]="isFr() ? 'Ex : 10, 0.5...' : 'e.g. 10, 0.5...'"
                                                   inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                </div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Valeur actuelle' : 'Current value' }} <span class="text-negative">*</span></label>
                                    <div class="relative">
                                        <p-inputnumber [(ngModel)]="editForm.currentValue"
                                                       [min]="0" [maxFractionDigits]="2"
                                                       inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-16" />
                                        <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ assetSymbol() }}</span>
                                    </div>
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Prix d\\'achat' : 'Purchase price' }}</label>
                                    <div class="relative">
                                        <p-inputnumber [(ngModel)]="editForm.purchaseValue"
                                                       [min]="0" [maxFractionDigits]="2"
                                                       inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-16" />
                                        <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ assetSymbol() }}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="flex flex-col gap-1.5">
                                <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Date d\\'achat' : 'Purchase date' }}</label>
                                <p-datepicker [(ngModel)]="editForm.purchaseDate"
                                              [showIcon]="true" [showButtonBar]="true"
                                              dateFormat="dd/mm/yy" styleClass="w-full"
                                              inputStyleClass="!py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                            </div>
                            @if ((editForm.quantity ?? 0) > 0 && editForm.currentValue > 0) {
                                <div class="flex items-center justify-between px-4 py-2.5 rounded-xl bg-brand-50/60 dark:bg-brand-900/30 border border-brand-100 dark:border-brand-800">
                                    <span class="text-surface-500 text-sm">{{ isFr() ? 'Prix unitaire actuel' : 'Current unit price' }}</span>
                                    <span class="text-brand-700 dark:text-brand-300 font-semibold">
                                        {{ editForm.currentValue / editForm.quantity! | number:'1.2-2' }} {{ assetSymbol() }}/part
                                    </span>
                                </div>
                            }
                        }

                        <!-- ─────────────── REAL ESTATE ─────────────── -->
                        @case ('REAL_ESTATE') {
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Valeur actuelle' : 'Current value' }} <span class="text-negative">*</span></label>
                                    <div class="relative">
                                        <p-inputnumber [(ngModel)]="editForm.currentValue"
                                                       [min]="0" [maxFractionDigits]="2"
                                                       inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-16" />
                                        <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ assetSymbol() }}</span>
                                    </div>
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Prix d\\'achat' : 'Purchase price' }}</label>
                                    <div class="relative">
                                        <p-inputnumber [(ngModel)]="editForm.purchaseValue"
                                                       [min]="0" [maxFractionDigits]="2"
                                                       inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-16" />
                                        <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ assetSymbol() }}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Date d\\'achat' : 'Purchase date' }}</label>
                                    <p-datepicker [(ngModel)]="editForm.purchaseDate"
                                                  [showIcon]="true" [showButtonBar]="true"
                                                  dateFormat="dd/mm/yy" styleClass="w-full"
                                                  inputStyleClass="!py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Surface (m²)' : 'Area (m²)' }}</label>
                                    <p-inputnumber [(ngModel)]="editForm.surfaceM2"
                                                   [min]="0" [maxFractionDigits]="1" suffix=" m²"
                                                   inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                </div>
                            </div>
                            <div class="flex flex-col gap-1.5">
                                <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Revenus locatifs/mois' : 'Rental income/mo' }}</label>
                                <div class="relative">
                                    <p-inputnumber [(ngModel)]="editForm.rentalIncome"
                                                   [min]="0" [maxFractionDigits]="2"
                                                   inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-16" />
                                    <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ assetSymbol() }}/mois</span>
                                </div>
                            </div>
                            @if ((editForm.surfaceM2 ?? 0) > 0 && editForm.currentValue > 0) {
                                <div class="flex items-center justify-between px-4 py-2.5 rounded-xl bg-brand-50/60 dark:bg-brand-900/30 border border-brand-100 dark:border-brand-800">
                                    <span class="text-surface-500 text-sm">{{ isFr() ? 'Prix au m² actuel' : 'Current price per m²' }}</span>
                                    <span class="text-brand-700 dark:text-brand-300 font-semibold">
                                        {{ editForm.currentValue / editForm.surfaceM2! | number:'1.0-0' }} {{ assetSymbol() }}/m²
                                    </span>
                                </div>
                            }
                        }

                        <!-- ─────────────── TOTAL VALUE (retirement, life ins., business, vehicle, collectibles, other) ─────────────── -->
                        @default {
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Valeur actuelle' : 'Current value' }} <span class="text-negative">*</span></label>
                                    <div class="relative">
                                        <p-inputnumber [(ngModel)]="editForm.currentValue"
                                                       [min]="0" [maxFractionDigits]="2"
                                                       inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-16" />
                                        <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ assetSymbol() }}</span>
                                    </div>
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Prix d\\'achat' : 'Purchase price' }}</label>
                                    <div class="relative">
                                        <p-inputnumber [(ngModel)]="editForm.purchaseValue"
                                                       [min]="0" [maxFractionDigits]="2"
                                                       inputStyleClass="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400 !pr-16" />
                                        <span class="absolute right-0 top-1/2 -translate-y-1/2 text-surface-400 text-xs font-medium">{{ assetSymbol() }}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Date d\\'achat' : 'Purchase date' }}</label>
                                    <p-datepicker [(ngModel)]="editForm.purchaseDate"
                                                  [showIcon]="true" [showButtonBar]="true"
                                                  dateFormat="dd/mm/yy" styleClass="w-full"
                                                  inputStyleClass="!py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm text-surface-500 dark:text-surface-400">{{ isFr() ? 'Institution' : 'Institution' }}</label>
                                    <input pInputText [(ngModel)]="editForm.institution"
                                           [placeholder]="isFr() ? 'Compagnie, organisme...' : 'Company, institution...'"
                                           class="w-full !py-3 !bg-transparent !border-0 !border-b !border-surface-300 dark:!border-surface-600 !rounded-none focus:!border-brand-700 dark:focus:!border-ochre-400" />
                                </div>
                            </div>
                        }
                    }
                </div>
            </ng-template>
            <ng-template #footer>
                <div class="flex flex-col gap-2 pt-2 w-full">
                    <p-button [label]="isFr() ? 'Enregistrer' : 'Save'" icon="pi pi-check"
                              [loading]="isSaving()"
                              (click)="saveEdit()"
                              styleClass="w-full omaad-cta !rounded-full !py-3" />
                    <p-button [label]="isFr() ? 'Annuler' : 'Cancel'" icon="pi pi-times" [outlined]="true"
                              (click)="editDialog = false"
                              styleClass="w-full !rounded-full !py-3" />
                </div>
            </ng-template>
        </p-dialog>
    `,
    styles: [`
        :host { display: block; }

        /* Matches the dashboard widget surface ("Progression de l'épargne", "Vue
           globale des dettes"): subtle navy-tinted gradient with a thin border,
           NO box-shadow. Implemented via CSS background-image so we don't need
           the absolute-positioned overlay div the dashboard uses. */
        .detail-surface {
            position: relative;
            overflow: hidden;
            border-radius: 1rem;                              /* rounded-2xl */
            border: 1px solid #e2e8f0;                        /* surface-200 */
            background: #ffffff;                              /* surface-0 */
        }
        :host-context(.app-dark) .detail-surface,
        .app-dark .detail-surface {
            border-color: #1e293b;                            /* surface-800 */
            background: #0f172a;                              /* surface-900 */
        }

        /* KPI tile layout, flex column, centered, fixed padding */
        .kpi-tile {
            padding: 1rem 1.25rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
        }

        .kpi-label {
            font-size: 0.6875rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--p-surface-500, #64748b);
            margin: 0 0 0.35rem 0;
        }
        :host-context(.app-dark) .kpi-label,
        .app-dark .kpi-label { color: var(--p-surface-400, #94a3b8); }

        .kpi-value {
            font-size: 1.25rem;
            font-weight: 700;
            line-height: 1.4;
            color: var(--p-surface-900, #0f1a2e);
            font-variant-numeric: tabular-nums;
            max-width: 100%;
        }
        :host-context(.app-dark) .kpi-value,
        .app-dark .kpi-value { color: var(--p-surface-0, #ffffff); }

        .kpi-sub {
            font-size: 0.6875rem;
            color: var(--p-surface-400, #94a3b8);
            margin: 0.35rem 0 0 0;
        }
    `]
})
export class AssetDetailPage implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private nav = inject(NavService);
    share = inject(ShareContextService);
    private apiService = inject(ApiService);
    private stateService = inject(AssetsStateService);
    private confirmationService = inject(ConfirmationService);
    private messageService = inject(MessageService);
    readonly cs = inject(CurrencyService);
    readonly i18n = inject(I18nService);
    readonly isFr = computed(() => this.i18n.lang() === 'fr');

    readonly Math = Math;

    loading = signal(true);
    asset = signal<Asset | null>(null);
    isSaving = signal(false);
    editDialog = false;

    /** Current value converted from the asset's native currency to EUR base,
     *  so <app-amount> renders it correctly in the user's display currency. */
    readonly valueEur = computed(() =>
        this.cs.toEurFromNative(this.asset()?.current_value ?? 0, this.asset()?.currency)
    );

    /** Symbol of the asset's own (native) currency, the edit form works in it. */
    assetSymbol(): string {
        const c = (this.asset()?.currency || 'EUR').toUpperCase();
        return c === 'XOF' ? 'FCFA' : c === 'USD' ? '$' : '€';
    }
    editForm = {
        name: '',
        currentValue: 0,
        purchaseValue: <number|null>null,
        purchaseDate: <Date|null>null,
        institution: '',
        surfaceM2: <number|null>null,
        rentalIncome: <number|null>null,
        quantity: <number|null>null,
        // Tontine
        tontineMonthlyContribution: <number|null>null,
        tontineParticipants: <number|null>null,
        tontineStartDate: <Date|null>null,
        tontineCollectionDate: <Date|null>null,
        tontineStatus: <TontineStatus>'en_cours',
        tontineFrequency: <'monthly'|'weekly'>'monthly',
        // Mobile Money
        mobileMoneyOperator: '',
    };

    readonly QUANTITY_CATEGORIES = ['stocks_brvm', 'stocks_intl', 'bonds', 'crypto', 'collectibles', 'commodities'];
    isQuantityBased = computed(() => this.QUANTITY_CATEGORIES.includes(this.asset()?.category ?? ''));

    /** The form shape for the currently-loaded asset, drives the edit modal switch. */
    formShape = computed<AssetFormShape>(() => {
        const cat = this.asset()?.category;
        return cat ? getAssetFormShape(cat) : 'TOTAL_VALUE';
    });

    get tontineStatusOptions() {
        const fr = this.isFr();
        return [
            { value: 'en_cours',   label: fr ? 'En cours' : 'In progress' },
            { value: 'mise_recue', label: fr ? 'Mise reçue' : 'Payout received' },
            { value: 'termine',    label: fr ? 'Terminée' : 'Completed' },
        ];
    }

    get tontineFrequencyOptions() {
        const fr = this.isFr();
        return [
            { value: 'monthly', label: fr ? 'Mensuelle' : 'Monthly' },
            { value: 'weekly',  label: fr ? 'Hebdomadaire' : 'Weekly' },
        ];
    }

    readonly mobileMoneyOperatorOptions = MOBILE_MONEY_OPERATORS.map(o => ({ value: o, label: o }));

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

    /** Quantity to display, reads from quantity field OR notes JSON. */
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
        // Brand-tokenized: every asset category shares the navy gradient.
        // The icon glyph (CATEGORY_ICONS) carries the visual identity.
        real_estate:     '#1A2740',
        stocks:          '#1A2740',
        bonds:           '#1A2740',
        crypto:          '#1A2740',
        cash:            '#1A2740',
        retirement:      '#1A2740',
        life_insurance:  '#1A2740',
        savings_account: '#1A2740',
        business:        '#1A2740',
        vehicle:         '#1A2740',
        tontine:         '#1A2740',
        mobile_money:    '#1A2740',
        collectibles:    '#1A2740',
        other:           '#1A2740',
    };

    categoryIcon = computed(() => this.CATEGORY_ICONS[this.asset()?.category ?? ''] ?? 'pi pi-box');
    categoryBg = computed(() => this.CATEGORY_BGS[this.asset()?.category ?? ''] ?? '#1A2740');
    categoryLabel = computed(() => {
        const cat = this.asset()?.category ?? '';
        if (!cat) return '';
        const label = this.i18n.t('assetCategories.' + cat);
        return label === 'assetCategories.' + cat ? cat : label;
    });

    // ─── Tontine status helpers ─────────────────────────────────────────
    tontineStatusLabel = computed(() => {
        const fr = this.isFr();
        const s = this.asset()?.tontine_status;
        switch (s) {
            case 'mise_recue': return (fr ? 'Mise reçue' : 'Payout received') + ' ✓';
            case 'termine':    return fr ? 'Terminée' : 'Completed';
            case 'en_cours':   return fr ? 'En cours' : 'In progress';
            default:           return ', ';
        }
    });

    tontineStatusClass = computed(() => {
        const s = this.asset()?.tontine_status;
        switch (s) {
            case 'mise_recue': return 'bg-positive/10 text-positive';
            case 'termine':    return 'bg-surface-500/10 text-surface-500';
            default:           return 'bg-brand-700/10 text-brand-700 dark:bg-brand-300/15 dark:text-brand-300';
        }
    });

    // ─── Premium spec list rows, one source of truth per card ──────────
    private liquidLabel(isLiquid: boolean | null | undefined): string {
        const fr = this.isFr();
        return isLiquid ? (fr ? 'Disponible immédiatement' : 'Available immediately') : (fr ? 'Différée' : 'Deferred');
    }

    /** Locale for Intl number/date formatting, bound to the active language. */
    private get numLocale(): string { return this.isFr() ? 'fr-FR' : 'en-US'; }

    /** Rows for the "Informations générales" card. Always at least 3 rows so the card is never sparse. */
    generalInfoRows = computed<{ label: string; value: string; icon: string; valueClass?: string }[]>(() => {
        const a = this.asset();
        if (!a) return [];
        const fr = this.isFr();
        const rows: { label: string; value: string; icon: string; valueClass?: string }[] = [];

        rows.push({ label: fr ? 'Catégorie' : 'Category',       value: this.categoryLabel(),         icon: 'pi-tag' });
        rows.push({ label: fr ? 'Devise' : 'Currency',          value: a.currency,                   icon: 'pi-money-bill' });
        rows.push({ label: fr ? 'Suivi depuis' : 'Tracked since',    value: this.formatDate(a.created_at), icon: 'pi-calendar-plus' });
        rows.push({ label: fr ? 'Dernière mise à jour' : 'Last updated', value: this.formatDate(a.updated_at), icon: 'pi-history' });

        if (a.is_liquid) {
            rows.push({ label: fr ? 'Liquidité' : 'Liquidity', value: this.liquidLabel(true), icon: 'pi-bolt', valueClass: 'text-positive' });
        }
        if (a.annual_return != null) {
            rows.push({ label: fr ? 'Rendement annuel estimé' : 'Estimated annual return', value: `${a.annual_return} %`, icon: 'pi-chart-line', valueClass: 'text-positive' });
        }
        if (a.description) {
            rows.push({ label: fr ? 'Description' : 'Description', value: a.description, icon: 'pi-align-left' });
        }
        return rows;
    });

    /** Real-estate-specific spec rows. */
    realEstateRows = computed<{ label: string; value: string; icon: string; valueClass?: string }[]>(() => {
        const a = this.asset();
        if (!a) return [];
        const fr = this.isFr();
        const loc = this.numLocale;
        const perMonth = fr ? '/mois' : '/mo';
        const rows: { label: string; value: string; icon: string; valueClass?: string }[] = [];

        if (a.surface_m2) {
            rows.push({ label: fr ? 'Surface' : 'Area', value: `${a.surface_m2} m²`, icon: 'pi-arrows-alt' });
        }
        if (a.price_per_m2_purchase) {
            rows.push({ label: fr ? 'Prix au m² à l\'achat' : 'Price per m² (purchase)', value: `${a.price_per_m2_purchase.toLocaleString(loc)} ${a.currency}/m²`, icon: 'pi-shopping-cart' });
        }
        if (a.surface_m2 && a.surface_m2 > 0) {
            const current = Math.round(a.current_value / a.surface_m2);
            rows.push({ label: fr ? 'Prix au m² actuel' : 'Current price per m²', value: `${current.toLocaleString(loc)} ${a.currency}/m²`, icon: 'pi-chart-line', valueClass: 'text-brand-700 dark:text-brand-300' });
        }
        if (a.purchase_date) {
            rows.push({ label: fr ? 'Date d\'achat' : 'Purchase date', value: this.formatShortDate(a.purchase_date), icon: 'pi-calendar' });
        }
        if (a.construction_date) {
            rows.push({ label: fr ? 'Date de construction' : 'Construction date', value: a.construction_date, icon: 'pi-clock' });
        }
        if (a.location) {
            rows.push({ label: fr ? 'Localisation' : 'Location', value: a.location, icon: 'pi-map-marker' });
        }
        if (a.rental_income) {
            rows.push({ label: fr ? 'Revenus locatifs' : 'Rental income', value: `${a.rental_income.toLocaleString(loc)} ${a.currency}${perMonth}`, icon: 'pi-home', valueClass: 'text-positive' });
        }
        // Always have at least one row
        if (!rows.length) {
            rows.push({ label: fr ? 'Localisation' : 'Location', value: ', ', icon: 'pi-map-marker' });
        }
        return rows;
    });

    /** Performance card rows for stocks / bonds / crypto / commodities. */
    performanceRows = computed<{ label: string; value: string; icon: string; valueClass?: string }[]>(() => {
        const a = this.asset();
        if (!a) return [];
        const fr = this.isFr();
        const loc = this.numLocale;
        const rows: { label: string; value: string; icon: string; valueClass?: string }[] = [];
        const gain = this.gainLoss();
        const pct = this.gainLossPct();

        if (gain !== null) {
            const sign = gain >= 0 ? '+' : '−';
            rows.push({
                label: fr ? 'Gain / Perte total' : 'Total gain / loss',
                value: `${sign} ${Math.abs(gain).toLocaleString(loc, { maximumFractionDigits: 2 })} ${a.currency}`,
                icon: gain >= 0 ? 'pi-arrow-up' : 'pi-arrow-down',
                valueClass: gain >= 0 ? 'text-positive' : 'text-negative',
            });
        }
        if (pct !== null) {
            rows.push({
                label: fr ? 'Performance totale' : 'Total performance',
                value: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)} %`,
                icon: 'pi-percentage',
                valueClass: pct >= 0 ? 'text-positive' : 'text-negative',
            });
        }
        if (a.institution) {
            rows.push({ label: fr ? 'Courtier / Plateforme' : 'Broker / Platform', value: a.institution, icon: 'pi-briefcase' });
        }
        if (a.purchase_date) {
            rows.push({ label: fr ? 'Date d\'achat' : 'Purchase date', value: this.formatShortDate(a.purchase_date), icon: 'pi-calendar' });
        }
        if (!rows.length) {
            rows.push({ label: fr ? 'Performance' : 'Performance', value: fr ? 'Renseignez le prix d\'achat pour suivre la performance' : 'Enter the purchase price to track performance', icon: 'pi-info-circle' });
        }
        return rows;
    });

    /** Tontine-specific spec rows (reads new dedicated columns, not legacy `notes` JSON). */
    tontineRows = computed<{ label: string; value: string; icon: string; valueClass?: string }[]>(() => {
        const a = this.asset();
        if (!a) return [];
        const fr = this.isFr();
        const loc = this.numLocale;
        const rows: { label: string; value: string; icon: string; valueClass?: string }[] = [];

        if (a.tontine_monthly_contribution != null) {
            rows.push({
                label: fr ? 'Mise mensuelle' : 'Monthly contribution',
                value: `${a.tontine_monthly_contribution.toLocaleString(loc)} ${a.currency}`,
                icon: 'pi-wallet',
            });
        }
        if (a.tontine_participants) {
            rows.push({ label: fr ? 'Participants' : 'Participants', value: `${a.tontine_participants} ${fr ? 'membres' : 'members'}`, icon: 'pi-users' });
        }
        if (a.tontine_start_date) {
            rows.push({ label: fr ? 'Date de début' : 'Start date', value: this.formatShortDate(a.tontine_start_date), icon: 'pi-calendar-plus' });
        }
        if (a.tontine_collection_date) {
            rows.push({ label: fr ? 'Date de collecte' : 'Payout date', value: this.formatShortDate(a.tontine_collection_date), icon: 'pi-calendar' });
        }
        rows.push({ label: fr ? 'Statut' : 'Status', value: this.tontineStatusLabel(), icon: 'pi-flag' });
        return rows;
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
        return d.toLocaleDateString(this.numLocale, { day: 'numeric', month: 'short', year: 'numeric' });
    }

    formatShortDate(dt: string): string {
        if (!dt) return ', ';
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
            stocks_brvm: 'stocks_bonds', stocks_intl: 'stocks_bonds', bonds: 'stocks_bonds',
            savings_account: 'savings', cash: 'savings', life_insurance: 'savings', retirement: 'savings',
            crypto: 'crypto',
            business: 'other', vehicle: 'other', collectibles: 'other', commodities: 'other', other: 'other',
        };
        const groupId = cat ? catToGroup[cat] : null;
        if (groupId) {
            this.nav.go('pages', 'patrimoine', 'category', groupId);
        } else {
            this.nav.go('pages', 'patrimoine');
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
            // Tontine
            tontineMonthlyContribution: a.tontine_monthly_contribution ?? null,
            tontineParticipants: a.tontine_participants ?? null,
            tontineStartDate: a.tontine_start_date ? new Date(a.tontine_start_date) : null,
            tontineCollectionDate: a.tontine_collection_date ? new Date(a.tontine_collection_date) : null,
            tontineStatus: (a.tontine_status as TontineStatus) ?? 'en_cours',
            tontineFrequency: (a.tontine_frequency as 'monthly'|'weekly') ?? 'monthly',
            // Mobile Money
            mobileMoneyOperator: a.mobile_money_operator ?? '',
        };
        this.editDialog = true;
    }

    /** Convert a Date | string | null → ISO date string (YYYY-MM-DD) | null */
    private toIsoDate(d: Date | string | null | undefined): string | null {
        if (d == null) return null;
        if (d instanceof Date) return d.toISOString().split('T')[0];
        return d;
    }

    saveEdit() {
        const a = this.asset();
        if (!a || !this.editForm.name?.trim() || this.editForm.currentValue == null) return;
        this.isSaving.set(true);

        const shape = this.formShape();
        const f = this.editForm;
        const payload: any = {
            name: f.name.trim(),
            current_value: f.currentValue,
        };

        // Per-shape payload: only send fields that make sense AND explicitly clear stale
        // ones from the legacy schema (where everything was crammed into purchase_*).
        if (shape === 'TONTINE') {
            payload.tontine_monthly_contribution = f.tontineMonthlyContribution;
            payload.tontine_participants         = f.tontineParticipants;
            payload.tontine_start_date           = this.toIsoDate(f.tontineStartDate);
            payload.tontine_collection_date      = this.toIsoDate(f.tontineCollectionDate);
            payload.tontine_status               = f.tontineStatus;
            payload.tontine_frequency            = f.tontineFrequency;
            // Clear any junk from legacy overloaded columns
            payload.purchase_value = null;
            payload.purchase_date  = null;
            payload.institution    = null;
            payload.notes          = null;
        } else if (shape === 'MOBILE_MONEY') {
            payload.mobile_money_operator = f.mobileMoneyOperator || null;
            payload.purchase_value = null;
            payload.purchase_date  = null;
            payload.institution    = null;
        } else if (shape === 'SIMPLE_BALANCE') {
            payload.institution    = f.institution || null;
            payload.purchase_value = null;
            payload.purchase_date  = null;
        } else if (shape === 'QUANTITY_BASED') {
            payload.institution    = f.institution || null;
            payload.purchase_value = f.purchaseValue;
            payload.purchase_date  = this.toIsoDate(f.purchaseDate);
            payload.quantity       = f.quantity;
            payload.notes          = this.writeQuantityToNotes(a.notes, f.quantity);
        } else if (shape === 'REAL_ESTATE') {
            payload.purchase_value = f.purchaseValue;
            payload.purchase_date  = this.toIsoDate(f.purchaseDate);
            payload.surface_m2     = f.surfaceM2;
            payload.rental_income  = f.rentalIncome;
        } else {
            // TOTAL_VALUE, retirement, life insurance, business, vehicle, collectibles, other
            payload.institution    = f.institution || null;
            payload.purchase_value = f.purchaseValue;
            payload.purchase_date  = this.toIsoDate(f.purchaseDate);
        }

        const savedQuantity = f.quantity;

        this.apiService.updateAsset(a.id, payload).subscribe({
            next: () => {
                // Optimistic update so the UI reflects the new values without waiting for re-fetch
                this.asset.update(curr => curr ? {
                    ...curr,
                    name: f.name.trim(),
                    current_value: f.currentValue,
                    purchase_value: payload.purchase_value !== undefined ? payload.purchase_value : curr.purchase_value,
                    purchase_date:  payload.purchase_date  !== undefined ? payload.purchase_date  : curr.purchase_date,
                    institution:    payload.institution    !== undefined ? payload.institution    : curr.institution,
                    surface_m2:     payload.surface_m2     !== undefined ? payload.surface_m2     : curr.surface_m2,
                    rental_income:  payload.rental_income  !== undefined ? payload.rental_income  : curr.rental_income,
                    quantity:       payload.quantity       !== undefined ? payload.quantity       : curr.quantity,
                    notes:          payload.notes          !== undefined ? payload.notes          : curr.notes,
                    tontine_monthly_contribution: payload.tontine_monthly_contribution !== undefined ? payload.tontine_monthly_contribution : curr.tontine_monthly_contribution,
                    tontine_participants:         payload.tontine_participants         !== undefined ? payload.tontine_participants         : curr.tontine_participants,
                    tontine_start_date:           payload.tontine_start_date           !== undefined ? payload.tontine_start_date           : curr.tontine_start_date,
                    tontine_collection_date:      payload.tontine_collection_date      !== undefined ? payload.tontine_collection_date      : curr.tontine_collection_date,
                    tontine_status:               payload.tontine_status               !== undefined ? payload.tontine_status               : curr.tontine_status,
                    mobile_money_operator:        payload.mobile_money_operator        !== undefined ? payload.mobile_money_operator        : curr.mobile_money_operator,
                } : null);

                this.editDialog = false;
                this.isSaving.set(false);
                this.stateService.notifyAssetsUpdated();
                this.messageService.add({ severity: 'success', summary: this.isFr() ? 'Modifié' : 'Updated', detail: this.isFr() ? 'Actif mis à jour avec succès.' : 'Asset updated successfully.', life: 3000 });

                // Background re-fetch, keep locally-saved quantity if server hasn't propagated yet
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
                this.messageService.add({ severity: 'error', summary: this.isFr() ? 'Erreur' : 'Error', detail: this.isFr() ? 'Impossible de mettre à jour l\'actif.' : 'Could not update the asset.', life: 4000 });
            }
        });
    }

    confirmDelete() {
        const fr = this.isFr();
        this.confirmationService.confirm({
            message: fr
                ? `Supprimer "${this.asset()?.name}" ? Cette action est irréversible.`
                : `Delete "${this.asset()?.name}"? This action is irreversible.`,
            header: fr ? 'Confirmer la suppression' : 'Confirm deletion',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: fr ? 'Supprimer' : 'Delete',
            rejectLabel: fr ? 'Annuler' : 'Cancel',
            acceptButtonStyleClass: '!bg-negative !border-negative',
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
            error: () => this.messageService.add({ severity: 'error', summary: this.isFr() ? 'Erreur' : 'Error', detail: this.isFr() ? 'Impossible de supprimer l\'actif.' : 'Could not delete the asset.', life: 4000 })
        });
    }
}
