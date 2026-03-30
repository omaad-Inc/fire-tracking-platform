import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { PatrimoineProgress } from './components/patrimoineprogress';
import { PatrimoineStats } from './components/patrimoinestats';
import { I18nService } from '../../i18n/i18n.service';
import { PatrimoineService, PatrimoineAssetItemDto } from '../service/patrimoine.service';
import { AssetsStateService } from '../service/assets-state.service';
import { ApiService, Debt } from '../../core/services/api.service';
import { AppAmountComponent } from '../../core/components/app-amount.component';

interface CategoryGroupCard {
    id: string;
    label: string;
    icon: string;
    bg: string;
    totalValue: number;
    totalDeltaAbs: number;
    totalDeltaPct: number;
    assetCount: number;
}

const GROUPS = [
    { id: 'real_estate',    label: 'Immobilier',        icon: 'pi pi-building',   bg: 'linear-gradient(135deg, #6366f1, #4f46e5)', categories: ['real_estate'] },
    { id: 'stocks_bonds',   label: 'Actions & Fonds',   icon: 'pi pi-chart-line', bg: 'linear-gradient(135deg, #06b6d4, #0891b2)', categories: ['stocks', 'bonds'] },
    { id: 'savings',        label: 'Épargne',           icon: 'pi pi-dollar',     bg: 'linear-gradient(135deg, #10b981, #059669)', categories: ['savings_account', 'cash', 'life_insurance', 'retirement'] },
    { id: 'crypto',         label: 'Crypto',            icon: 'pi pi-bitcoin',    bg: 'linear-gradient(135deg, #f59e0b, #d97706)', categories: ['crypto'] },
    { id: 'tontine',        label: 'Tontine',           icon: 'pi pi-users',      bg: 'linear-gradient(135deg, #e11d48, #be123c)', categories: ['tontine'] },
    { id: 'mobile_money',   label: 'Mobile Money',      icon: 'pi pi-mobile',     bg: 'linear-gradient(135deg, #0ea5e9, #0284c7)', categories: ['mobile_money'] },
    { id: 'other',          label: 'Autres',            icon: 'pi pi-box',        bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', categories: ['business', 'vehicle', 'collectibles', 'commodities', 'other'] },
];

@Component({
    selector: 'app-patrimoine',
    standalone: true,
    imports: [CommonModule, PatrimoineProgress, PatrimoineStats, AppAmountComponent],
    template: `
        <div class="flex flex-col gap-8">

            <!-- Chart + KPI stats -->
            <div class="grid grid-cols-12 gap-6">
                <div class="col-span-12 xl:col-span-8">
                    <app-patrimoine-progress />
                </div>
                <app-patrimoine-stats class="col-span-12 xl:col-span-4" />
            </div>

            <!-- Actifs section -->
            <div>
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-semibold text-surface-900 dark:text-surface-0 m-0">Actifs</h2>
                    @if (!loadingGroups()) {
                        <span class="text-surface-500 dark:text-surface-400 text-sm font-medium">
                            <app-amount [value]="totalAssets()" />
                        </span>
                    }
                </div>

                @if (loadingGroups()) {
                    <div class="space-y-3">
                        @for (i of [1,2,3,4,5]; track i) {
                            <div class="h-[76px] bg-surface-200 dark:bg-surface-700 rounded-2xl animate-pulse"></div>
                        }
                    </div>
                } @else if (categoryGroups().length === 0) {
                    <div class="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-surface-300 dark:border-surface-700">
                        <div class="w-16 h-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
                            <i class="pi pi-box text-2xl text-surface-400"></i>
                        </div>
                        <p class="text-surface-500 text-sm">Aucun actif enregistré</p>
                    </div>
                } @else {
                    <div class="space-y-3">
                        @for (group of categoryGroups(); track group.id) {
                            <button (click)="navigateToCategory(group.id)"
                                    class="w-full flex items-center justify-between p-5 rounded-2xl bg-surface-0 dark:bg-surface-800 hover:bg-surface-50 dark:hover:bg-surface-700 transition-all duration-200 cursor-pointer group border border-surface-200 dark:border-surface-700 hover:border-indigo-500/30 text-left shadow-sm">
                                <div class="flex items-center gap-4 min-w-0">
                                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200"
                                         [style.background]="group.bg">
                                        <i [class]="group.icon" class="text-white text-lg"></i>
                                    </div>
                                    <div class="min-w-0">
                                        <div class="font-semibold text-surface-900 dark:text-surface-0">{{ group.label }}</div>
                                        <div class="text-surface-500 dark:text-surface-400 text-sm">
                                            {{ group.assetCount }} actif{{ group.assetCount > 1 ? 's' : '' }}
                                        </div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3 shrink-0 ml-4">
                                    <div class="text-right">
                                        <div class="font-bold text-surface-900 dark:text-surface-0 text-base">
                                            <app-amount [value]="group.totalValue" />
                                        </div>
                                        @if (group.totalDeltaAbs !== 0) {
                                            <div class="flex items-center justify-end gap-1 mt-0.5">
                                                <i class="pi text-xs"
                                                   [ngClass]="group.totalDeltaAbs >= 0 ? 'pi-arrow-up text-emerald-500' : 'pi-arrow-down text-rose-500'"></i>
                                                <span class="text-sm font-medium"
                                                      [ngClass]="group.totalDeltaAbs >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                                                    <app-amount [value]="group.totalDeltaAbs" [prefix]="group.totalDeltaAbs >= 0 ? '+' : '-'" />
                                                    &nbsp;{{ group.totalDeltaPct | number:'1.2-2' }}%
                                                </span>
                                            </div>
                                        }
                                    </div>
                                    <i class="pi pi-chevron-right text-surface-400 text-sm group-hover:text-indigo-400 transition-colors"></i>
                                </div>
                            </button>
                        }
                    </div>
                }
            </div>

            <!-- Passifs section -->
            <div>
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-semibold text-surface-900 dark:text-surface-0 m-0">Passifs</h2>
                    @if (!loadingDebts() && totalDebts() > 0) {
                        <span class="text-rose-500 text-sm font-medium">
                            <app-amount [value]="totalDebts()" prefix="-" />
                        </span>
                    }
                </div>

                @if (loadingDebts()) {
                    <div class="h-[76px] bg-surface-200 dark:bg-surface-700 rounded-2xl animate-pulse"></div>
                } @else if (totalDebts() === 0) {
                    <div class="p-5 rounded-2xl border border-dashed border-surface-300 dark:border-surface-700 text-center text-surface-500 text-sm">
                        Aucune dette enregistrée
                    </div>
                } @else {
                    <button (click)="navigateToDebts()"
                            class="w-full flex items-center justify-between p-5 rounded-2xl bg-surface-0 dark:bg-surface-800 hover:bg-surface-50 dark:hover:bg-surface-700 transition-all duration-200 cursor-pointer group border border-surface-200 dark:border-surface-700 hover:border-rose-500/30 text-left shadow-sm">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200"
                                 style="background: linear-gradient(135deg, #f43f5e, #e11d48)">
                                <i class="pi pi-credit-card text-white text-lg"></i>
                            </div>
                            <div>
                                <div class="font-semibold text-surface-900 dark:text-surface-0">Emprunts</div>
                                <div class="text-surface-500 dark:text-surface-400 text-sm">
                                    {{ debtsCount() }} dette{{ debtsCount() > 1 ? 's' : '' }}
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 shrink-0">
                            <div class="font-bold text-rose-500 text-base">
                                <app-amount [value]="totalDebts()" prefix="-" />
                            </div>
                            <i class="pi pi-chevron-right text-surface-400 text-sm group-hover:text-rose-400 transition-colors"></i>
                        </div>
                    </button>
                }
            </div>

        </div>
    `
})
export class Patrimoine implements OnInit, OnDestroy {
    private router = inject(Router);
    private patrimoineService = inject(PatrimoineService);
    private apiService = inject(ApiService);
    private stateService = inject(AssetsStateService);
    private subscription?: Subscription;

    loadingGroups = signal(true);
    loadingDebts = signal(true);
    allAssets = signal<PatrimoineAssetItemDto[]>([]);
    debts = signal<Debt[]>([]);

    categoryGroups = computed<CategoryGroupCard[]>(() => {
        const assets = this.allAssets();
        return GROUPS
            .map(g => {
                const items = assets.filter(a => g.categories.includes(a.category ?? ''));
                if (items.length === 0) return null;
                const totalValue = items.reduce((s, i) => s + i.value, 0);
                const totalDeltaAbs = items.reduce((s, i) => s + (i.deltaAbs ?? 0), 0);
                const purchaseTotal = items.reduce((s, i) => s + Math.max(0, i.value - (i.deltaAbs ?? 0)), 0);
                const totalDeltaPct = purchaseTotal > 0 ? (totalDeltaAbs / purchaseTotal) * 100 : 0;
                return { ...g, totalValue, totalDeltaAbs, totalDeltaPct, assetCount: items.length } as CategoryGroupCard;
            })
            .filter((g): g is CategoryGroupCard => g !== null);
    });

    totalAssets = computed(() => this.allAssets().reduce((s, a) => s + a.value, 0));
    totalDebts = computed(() => this.debts().filter(d => d.type === 'i_owe').reduce((s, d) => s + d.current_amount, 0));
    debtsCount = computed(() => this.debts().filter(d => d.type === 'i_owe').length);

    async ngOnInit() {
        await Promise.all([this.loadAssets(), this.loadDebts()]);

        this.subscription = this.stateService.assetsUpdated$.subscribe(() => {
            this.loadAssets();
        });
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

    private async loadAssets() {
        this.loadingGroups.set(true);
        try {
            const items = await this.patrimoineService.getAssets();
            this.allAssets.set(items);
        } finally {
            this.loadingGroups.set(false);
        }
    }

    private async loadDebts() {
        this.loadingDebts.set(true);
        try {
            const debts = await firstValueFrom(this.apiService.getDebts());
            this.debts.set(debts);
        } catch {
            this.debts.set([]);
        } finally {
            this.loadingDebts.set(false);
        }
    }

    navigateToCategory(groupId: string) {
        const url = this.router.url;
        const match = url.match(/^\/(fr|en)\//);
        const lang = match ? match[1] : 'fr';
        this.router.navigate(['/', lang, 'pages', 'patrimoine', 'category', groupId]);
    }

    navigateToDebts() {
        const url = this.router.url;
        const match = url.match(/^\/(fr|en)\//);
        const lang = match ? match[1] : 'fr';
        this.router.navigate(['/', lang, 'pages', 'debts']);
    }
}
