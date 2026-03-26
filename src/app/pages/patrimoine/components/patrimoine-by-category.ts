import { Component, input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PatrimoineAssetItemDto } from '../../service/patrimoine.service';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';

type CategoryGroup = 'all' | 'real_estate' | 'stocks_bonds' | 'savings' | 'crypto' | 'other';

interface GroupConfig {
    id: CategoryGroup;
    label: string;
    icon: string;
    categories: string[];
    color: string;
}

const GROUPS: GroupConfig[] = [
    { id: 'all', label: 'Tous', icon: 'pi pi-th-large', categories: [], color: '#6366f1' },
    { id: 'real_estate', label: 'Immobilier', icon: 'pi pi-building', categories: ['real_estate'], color: '#6366f1' },
    { id: 'stocks_bonds', label: 'Actions & Fonds', icon: 'pi pi-chart-line', categories: ['stocks', 'bonds'], color: '#06b6d4' },
    { id: 'savings', label: 'Épargne', icon: 'pi pi-dollar', categories: ['savings_account', 'cash', 'life_insurance', 'retirement'], color: '#10b981' },
    { id: 'crypto', label: 'Crypto', icon: 'pi pi-bitcoin', categories: ['crypto'], color: '#f59e0b' },
    { id: 'other', label: 'Autres', icon: 'pi pi-box', categories: ['business', 'vehicle', 'collectibles', 'commodities', 'other'], color: '#8b5cf6' },
];

const CATEGORY_ICONS: Record<string, string> = {
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
    commodities: 'pi pi-box',
    other: 'pi pi-box',
};

const ICON_BGS = [
    'linear-gradient(135deg, #6366f1, #4f46e5)',
    'linear-gradient(135deg, #06b6d4, #0891b2)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #ec4899, #db2777)',
];

@Component({
    selector: 'app-patrimoine-by-category',
    standalone: true,
    imports: [CommonModule, RouterModule, AppCurrencyPipe],
    template: `
        <!-- Category tabs -->
        <div class="flex flex-wrap gap-2 mb-6">
            @for (group of groups; track group.id) {
                <button
                    (click)="selectGroup(group.id)"
                    class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    [ngClass]="activeGroup() === group.id
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                        : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700'">
                    <i [class]="group.icon" class="text-sm"></i>
                    {{ group.label }}
                    @if (groupCount(group.id) > 0) {
                        <span class="text-xs px-1.5 py-0.5 rounded-full"
                              [ngClass]="activeGroup() === group.id ? 'bg-white/20' : 'bg-surface-200 dark:bg-surface-700'">
                            {{ groupCount(group.id) }}
                        </span>
                    }
                </button>
            }
        </div>

        <!-- Asset list -->
        @if (filteredItems().length === 0) {
            <div class="flex flex-col items-center justify-center py-16 text-center">
                <div class="w-14 h-14 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
                    <i class="pi pi-box text-2xl text-surface-400"></i>
                </div>
                <p class="text-surface-500 text-sm">Aucun actif dans cette catégorie</p>
            </div>
        } @else {
            <!-- Header row -->
            <div class="hidden md:grid grid-cols-12 text-xs text-surface-500 dark:text-surface-400 px-4 py-2 mb-1 font-semibold uppercase tracking-wide">
                <div class="col-span-4">Actif</div>
                <div class="col-span-2 text-right">Part</div>
                <div class="col-span-2 text-center">Tendance</div>
                <div class="col-span-2 text-right">Valeur</div>
                <div class="col-span-2 text-right">Perf.</div>
            </div>
            <div class="space-y-2">
                @for (item of filteredItems(); track item.id; let i = $index) {
                    <a [routerLink]="['assets', item.id]"
                       class="block rounded-xl px-4 py-4 bg-surface-50 dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer group no-underline">
                        <div class="grid md:grid-cols-12 items-center gap-2 md:gap-0">
                            <!-- Name -->
                            <div class="md:col-span-4">
                                <div class="flex items-center gap-3 min-w-0">
                                    <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300"
                                         [style.background]="getIconBg(i)">
                                        <i [class]="getCategoryIcon(item.category)" class="text-white text-sm"></i>
                                    </div>
                                    <div class="min-w-0">
                                        <span class="font-medium text-surface-900 dark:text-surface-0 block truncate">{{ item.name }}</span>
                                        <span class="text-surface-500 dark:text-surface-400 text-xs capitalize">{{ getCategoryLabel(item.category) }}</span>
                                    </div>
                                </div>
                            </div>
                            <!-- Share % -->
                            <div class="hidden md:block md:col-span-2 text-right text-surface-600 dark:text-surface-300 font-medium text-sm">
                                {{ sharePct(item) | number:'1.0-0' }}%
                            </div>
                            <!-- Sparkline -->
                            <div class="hidden md:flex md:justify-center md:col-span-2">
                                <svg viewBox="0 0 80 32" width="80" height="32" preserveAspectRatio="none">
                                    <polyline [attr.points]="getSparkline(item, i)"
                                              fill="none"
                                              [attr.stroke]="(item.deltaPct ?? item.deltaAbs ?? 0) >= 0 ? '#10b981' : '#f43f5e'"
                                              stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <!-- Value -->
                            <div class="hidden md:block md:col-span-2 text-right text-surface-900 dark:text-surface-0 font-semibold text-sm">
                                {{ item.value | appCurrency }}
                            </div>
                            <!-- Delta -->
                            <div class="hidden md:flex md:justify-end md:items-center md:col-span-2 gap-1">
                                @if (item.deltaPct != null) {
                                    <span class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold"
                                          [ngClass]="item.deltaPct >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'">
                                        <i class="pi text-xs mr-1" [ngClass]="item.deltaPct >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'"></i>
                                        {{ item.deltaPct >= 0 ? '+' : '' }}{{ item.deltaPct | number:'1.1-1' }}%
                                    </span>
                                } @else {
                                    <span class="text-surface-400 text-xs">—</span>
                                }
                                <i class="pi pi-chevron-right text-surface-400 text-xs ml-1 group-hover:text-indigo-400 transition-colors"></i>
                            </div>
                            <!-- Mobile stacked -->
                            <div class="md:hidden col-span-12 mt-2 pt-2 border-t border-surface-200 dark:border-surface-700 flex justify-between text-sm">
                                <span class="text-surface-500">{{ sharePct(item) | number:'1.0-0' }}% du patrimoine</span>
                                <span class="font-semibold text-surface-900 dark:text-surface-0">{{ item.value | appCurrency }}</span>
                            </div>
                        </div>
                    </a>
                }
            </div>
        }
    `
})
export class PatrimoineByCategoryComponent {
    items = input<PatrimoineAssetItemDto[]>([]);

    readonly groups = GROUPS;
    activeGroup = signal<CategoryGroup>('all');

    selectGroup(id: CategoryGroup) { this.activeGroup.set(id); }

    filteredItems = computed(() => {
        const g = this.activeGroup();
        const group = GROUPS.find(gr => gr.id === g);
        if (!group || group.categories.length === 0) return this.items();
        return this.items().filter(item => group.categories.includes(item.category ?? ''));
    });

    groupCount(id: CategoryGroup): number {
        const group = GROUPS.find(g => g.id === id);
        if (!group || group.categories.length === 0) return this.items().length;
        return this.items().filter(i => group.categories.includes(i.category ?? '')).length;
    }

    private get totalValue(): number {
        return this.items().reduce((s, i) => s + i.value, 0) || 1;
    }

    sharePct(item: PatrimoineAssetItemDto): number {
        return Math.round((item.value / this.totalValue) * 100);
    }

    getCategoryIcon(cat?: string): string {
        return CATEGORY_ICONS[cat ?? ''] ?? 'pi pi-box';
    }

    getCategoryLabel(cat?: string): string {
        const labels: Record<string, string> = {
            real_estate: 'Immobilier', stocks: 'Actions', bonds: 'Obligations',
            crypto: 'Crypto', cash: 'Liquidités', retirement: 'Retraite',
            life_insurance: 'Assurance vie', savings_account: 'Livret',
            business: 'Entreprise', vehicle: 'Véhicule', collectibles: 'Collections',
            commodities: 'Matières premières', other: 'Autres',
        };
        return labels[cat ?? ''] ?? cat ?? '';
    }

    getIconBg(index: number): string {
        return ICON_BGS[index % ICON_BGS.length];
    }

    getSparkline(item: PatrimoineAssetItemDto, index: number): string {
        const isPositive = (item.deltaPct ?? item.deltaAbs ?? 0) >= 0;
        const seed = Math.abs(Math.round(item.value + index * 1337));
        const pts: number[] = [];
        let y = 16;
        for (let i = 0; i < 7; i++) {
            const rnd = ((seed * (i + 1) * 7919) % 1000) / 1000;
            y = Math.max(4, Math.min(28, y + (rnd - 0.4) * 7 + (isPositive ? 0.8 : -0.8)));
            pts.push(y);
        }
        return pts.map((yv, x) => `${x * 13},${32 - yv}`).join(' ');
    }
}
