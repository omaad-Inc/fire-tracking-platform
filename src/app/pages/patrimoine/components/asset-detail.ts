import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { ApiService, Asset } from '../../../core/services/api.service';
import { AssetsStateService } from '../../service/assets-state.service';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';

@Component({
    selector: 'app-asset-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, TagModule, DividerModule, ConfirmDialogModule, ToastModule, AppCurrencyPipe],
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
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-4">
                    <button (click)="goBack()"
                            class="w-10 h-10 flex items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-all cursor-pointer">
                        <i class="pi pi-arrow-left text-surface-600 dark:text-surface-300"></i>
                    </button>
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                             [style.background]="categoryBg()">
                            <i [class]="categoryIcon()" class="text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0 m-0">{{ asset()!.name }}</h1>
                            <span class="text-surface-500 text-sm">{{ categoryLabel() }}</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button pButton icon="pi pi-pencil" label="Modifier" severity="secondary"
                            [outlined]="true" size="small" (click)="editAsset()"></button>
                    <button pButton icon="pi pi-trash" severity="danger"
                            [outlined]="true" size="small" (click)="confirmDelete()"></button>
                </div>
            </div>

            <!-- Value + date -->
            <div class="card mb-6">
                <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div>
                        <p class="text-surface-500 dark:text-surface-400 text-sm mb-1">{{ formatDate(asset()!.updated_at) }}</p>
                        <div class="text-4xl md:text-5xl font-bold text-surface-900 dark:text-surface-0">
                            {{ asset()!.current_value | appCurrency }}
                        </div>
                        @if (gainLoss() !== null) {
                            <div class="flex items-center gap-2 mt-2">
                                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold"
                                      [ngClass]="(gainLoss()! >= 0) ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'">
                                    <i class="pi text-xs" [ngClass]="gainLoss()! >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'"></i>
                                    {{ gainLoss()! >= 0 ? '+' : '' }}{{ gainLoss() | appCurrency }}
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
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <!-- P&L -->
                <div class="card text-center">
                    <p class="text-surface-500 text-xs font-medium uppercase tracking-wide mb-1">P&amp;L</p>
                    @if (gainLoss() !== null) {
                        <div class="text-2xl font-bold"
                             [ngClass]="gainLoss()! >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                            {{ gainLoss()! >= 0 ? '+' : '' }}{{ gainLoss() | appCurrency }}
                        </div>
                        <p class="text-surface-400 text-xs mt-1">Basé sur le prix d'achat</p>
                    } @else {
                        <div class="text-surface-400 text-lg">—</div>
                    }
                </div>
                <!-- Prix d'achat -->
                <div class="card text-center">
                    <p class="text-surface-500 text-xs font-medium uppercase tracking-wide mb-1">Prix d'achat</p>
                    <div class="text-2xl font-bold text-surface-900 dark:text-surface-0">
                        @if (asset()!.purchase_value) {
                            {{ asset()!.purchase_value | appCurrency }}
                        } @else {
                            <span class="text-surface-400">—</span>
                        }
                    </div>
                    @if (asset()!.purchase_date) {
                        <p class="text-surface-400 text-xs mt-1">{{ formatShortDate(asset()!.purchase_date!) }}</p>
                    }
                </div>
                <!-- Institution -->
                <div class="card text-center">
                    <p class="text-surface-500 text-xs font-medium uppercase tracking-wide mb-1">Institution</p>
                    <div class="text-lg font-semibold text-surface-900 dark:text-surface-0 truncate">
                        {{ asset()!.institution || '—' }}
                    </div>
                    @if (asset()!.location) {
                        <p class="text-surface-400 text-xs mt-1">{{ asset()!.location }}</p>
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
                                    <span class="text-surface-900 dark:text-surface-0 text-sm font-medium">{{ asset()!.price_per_m2_purchase | appCurrency }}/m²</span>
                                </div>
                            }
                            @if (asset()!.surface_m2 && asset()!.current_value) {
                                <div class="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800">
                                    <span class="text-surface-500 text-sm">Prix/m² actuel (estimé)</span>
                                    <span class="text-indigo-500 text-sm font-medium">{{ (asset()!.current_value / asset()!.surface_m2!) | appCurrency }}/m²</span>
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
                                    <span class="text-emerald-500 text-sm font-medium">{{ asset()!.rental_income | appCurrency }}</span>
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
                                        {{ asset()!.agency_fees ? (asset()!.agency_fees | appCurrency) : '—' }}
                                    </p>
                                </div>
                                <div class="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                                    <p class="text-surface-500 text-xs mb-1">Frais de notaire</p>
                                    <p class="font-semibold text-surface-900 dark:text-surface-0 text-sm">
                                        {{ asset()!.notary_fees ? (asset()!.notary_fees | appCurrency) : '—' }}
                                    </p>
                                </div>
                                <div class="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                                    <p class="text-surface-500 text-xs mb-1">Frais de rénovation</p>
                                    <p class="font-semibold text-surface-900 dark:text-surface-0 text-sm">
                                        {{ asset()!.renovation_fees ? (asset()!.renovation_fees | appCurrency) : '—' }}
                                    </p>
                                </div>
                                <div class="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                                    <p class="text-surface-500 text-xs mb-1">Ameublement</p>
                                    <p class="font-semibold text-surface-900 dark:text-surface-0 text-sm">
                                        {{ asset()!.furnishing_costs ? (asset()!.furnishing_costs | appCurrency) : '—' }}
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
                                        {{ gainLoss()! >= 0 ? '+' : '' }}{{ gainLoss() | appCurrency }}
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
                                    {{ (asset()!.current_value * Math.pow(0.85, 5)) | appCurrency }}
                                </span>
                            </div>
                        </div>
                    </div>
                }
            </div>
        }
    `
})
export class AssetDetailPage implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private apiService = inject(ApiService);
    private stateService = inject(AssetsStateService);
    private confirmationService = inject(ConfirmationService);
    private messageService = inject(MessageService);

    readonly Math = Math;

    loading = signal(true);
    asset = signal<Asset | null>(null);

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
        real_estate: 'pi pi-building',
        stocks: 'pi pi-chart-line',
        bonds: 'pi pi-chart-bar',
        crypto: 'pi pi-bitcoin',
        cash: 'pi pi-wallet',
        retirement: 'pi pi-shield',
        life_insurance: 'pi pi-heart',
        savings_account: 'pi pi-dollar',
        business: 'pi pi-briefcase',
        vehicle: 'pi pi-car',
        collectibles: 'pi pi-star',
        other: 'pi pi-box',
    };

    private readonly CATEGORY_BGS: Record<string, string> = {
        real_estate: 'linear-gradient(135deg, #6366f1, #4f46e5)',
        stocks: 'linear-gradient(135deg, #06b6d4, #0891b2)',
        bonds: 'linear-gradient(135deg, #10b981, #059669)',
        crypto: 'linear-gradient(135deg, #f59e0b, #d97706)',
        cash: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        retirement: 'linear-gradient(135deg, #14b8a6, #0d9488)',
        life_insurance: 'linear-gradient(135deg, #ec4899, #db2777)',
        savings_account: 'linear-gradient(135deg, #06b6d4, #0891b2)',
        business: 'linear-gradient(135deg, #f97316, #ea580c)',
        vehicle: 'linear-gradient(135deg, #64748b, #475569)',
        collectibles: 'linear-gradient(135deg, #a855f7, #9333ea)',
        other: 'linear-gradient(135deg, #94a3b8, #64748b)',
    };

    private readonly CATEGORY_LABELS: Record<string, string> = {
        real_estate: 'Immobilier',
        stocks: 'Actions',
        bonds: 'Obligations',
        crypto: 'Crypto-monnaies',
        cash: 'Liquidités',
        retirement: 'Épargne retraite',
        life_insurance: 'Assurance vie',
        savings_account: 'Livret d\'épargne',
        business: 'Entreprise',
        vehicle: 'Véhicule',
        collectibles: 'Collections',
        other: 'Autres',
    };

    categoryIcon = computed(() => this.CATEGORY_ICONS[this.asset()?.category ?? ''] ?? 'pi pi-box');
    categoryBg = computed(() => this.CATEGORY_BGS[this.asset()?.category ?? ''] ?? 'linear-gradient(135deg, #94a3b8, #64748b)');
    categoryLabel = computed(() => this.CATEGORY_LABELS[this.asset()?.category ?? ''] ?? this.asset()?.category ?? '');

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
        this.router.navigate(['/', lang, 'pages', 'patrimoine']);
    }

    editAsset() {
        this.messageService.add({ severity: 'info', summary: 'Modification', detail: 'Utilisez le bouton "+ Ajouter un actif" pour modifier depuis la liste.', life: 4000 });
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
