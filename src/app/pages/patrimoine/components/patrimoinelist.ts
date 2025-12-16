import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { I18nService } from '../../../i18n/i18n.service';

export interface PatrimoineAssetItem {
    name: string;
    sharePct: number; // 0..100
    value: number; // EUR
    deltaAbs?: number; // optional +/– value absolute
    deltaPct?: number; // optional +/– percentage
}

@Component({
    selector: 'app-patrimoine-list',
    standalone: true,
    imports: [CommonModule, TagModule],
    template: `
        <div class="w-full">
            <!-- Header shown on md+ -->
            <div class="hidden md:grid grid-cols-12 text-sm text-surface-500 dark:text-surface-400 px-4 py-3 mb-2">
                <div class="col-span-6 font-medium">{{ t('patrimoine.list.name') }}</div>
                <div class="col-span-2 text-right font-medium">{{ t('patrimoine.list.share') }}</div>
                <div class="col-span-2 text-right font-medium">{{ t('patrimoine.list.value') }}</div>
                <div class="col-span-2 text-right font-medium">{{ t('patrimoine.list.delta') }}</div>
            </div>
            <div class="space-y-3">
                <div *ngFor="let item of items; let i = index" 
                     class="rounded-xl px-4 py-4 bg-surface-50 dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer group">
                    <div class="grid md:grid-cols-12 items-center gap-2 md:gap-0">
                        <!-- Name -->
                        <div class="md:col-span-6">
                            <div class="flex items-center gap-3 min-w-0">
                                <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300"
                                     [style.background]="getIconBgColor(i)">
                                    <i [class]="getIcon(i)" class="text-white text-sm"></i>
                                </div>
                                <div class="min-w-0">
                                    <span class="font-medium text-surface-900 dark:text-surface-0 block truncate">{{ item.name }}</span>
                                    <span class="text-surface-500 dark:text-surface-400 text-xs">{{ item.sharePct | number: '1.0-0' }}% du patrimoine</span>
                                </div>
                            </div>
                        </div>
                        <!-- Desktop values -->
                        <div class="hidden md:block md:col-span-2 text-right text-surface-600 dark:text-surface-300 font-medium">{{ item.sharePct | number: '1.0-0' }}%</div>
                        <div class="hidden md:block md:col-span-2 text-right text-surface-900 dark:text-surface-0 font-semibold">{{ item.value | currency: 'EUR':'symbol':'1.0-0' }}</div>
                        <div class="hidden md:flex md:justify-end md:col-span-2">
                            <span *ngIf="item.deltaAbs != null" 
                                  class="inline-flex items-center px-2 py-1 rounded-lg text-sm font-semibold"
                                  [ngClass]="(item.deltaAbs || 0) >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'">
                                <i class="pi text-xs mr-1" [ngClass]="(item.deltaAbs || 0) >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'"></i>
                                {{ formatDeltaShort(item) }}
                            </span>
                        </div>
                    </div>
                    <!-- Mobile stacked values -->
                    <div class="md:hidden mt-3 pt-3 border-t border-surface-200 dark:border-surface-700 space-y-2 text-sm">
                        <div class="flex items-center justify-between">
                            <span class="text-surface-500 dark:text-surface-400">{{ t('patrimoine.list.value') }}</span>
                            <span class="font-semibold text-surface-900 dark:text-surface-0">{{ item.value | currency: 'EUR':'symbol':'1.0-0' }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-surface-500 dark:text-surface-400">{{ t('patrimoine.list.delta') }}</span>
                            <span *ngIf="item.deltaAbs != null" 
                                  class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold"
                                  [ngClass]="(item.deltaAbs || 0) >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'">
                                {{ formatDeltaShort(item) }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class PatrimoineListComponent {
    @Input() items: PatrimoineAssetItem[] = [];
    @Input() colorFor: (item: PatrimoineAssetItem) => string = () => '#6366f1';

    private iconConfigs = [
        { icon: 'pi pi-building', bg: 'linear-gradient(135deg, #6366f1, #4f46e5)' },
        { icon: 'pi pi-chart-line', bg: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
        { icon: 'pi pi-wallet', bg: 'linear-gradient(135deg, #10b981, #059669)' },
        { icon: 'pi pi-bitcoin', bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
        { icon: 'pi pi-car', bg: 'linear-gradient(135deg, #f59e0b, #d97706)' }
    ];

    constructor(private i18n: I18nService) {}

    t(key: string) { return this.i18n.t(key); }

    getIcon(index: number): string {
        return this.iconConfigs[index % this.iconConfigs.length].icon;
    }

    getIconBgColor(index: number): string {
        return this.iconConfigs[index % this.iconConfigs.length].bg;
    }

    formatDelta(item: PatrimoineAssetItem): string {
        const parts: string[] = [];
        if (item.deltaAbs != null) {
            const sign = item.deltaAbs >= 0 ? '+' : '';
            parts.push(`${sign}${(item.deltaAbs).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}`);
        }
        if (item.deltaPct != null) {
            const sign = item.deltaPct >= 0 ? '+' : '';
            parts.push(`${sign}${item.deltaPct.toFixed(2)}%`);
        }
        return parts.join(' ');
    }

    formatDeltaShort(item: PatrimoineAssetItem): string {
        if (item.deltaAbs == null) return '';
        const sign = item.deltaAbs >= 0 ? '+' : '';
        return `${sign}${(item.deltaAbs).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}`;
    }
}
