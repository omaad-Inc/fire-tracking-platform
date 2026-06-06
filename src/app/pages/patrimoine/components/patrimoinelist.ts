import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { I18nService } from '../../../i18n/i18n.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { CurrencyService } from '../../../core/services/currency.service';

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
    imports: [CommonModule, TagModule, AppAmountComponent],
    template: `
        <div class="w-full">
            <!-- Header shown on md+ -->
            <div class="hidden md:grid grid-cols-12 text-sm text-surface-500 dark:text-surface-400 px-4 py-3 mb-2">
                <div class="col-span-4 font-medium">{{ t('patrimoine.list.name') }}</div>
                <div class="col-span-2 text-right font-medium">{{ t('patrimoine.list.share') }}</div>
                <div class="col-span-2 text-center font-medium">Tendance</div>
                <div class="col-span-2 text-right font-medium">{{ t('patrimoine.list.value') }}</div>
                <div class="col-span-2 text-right font-medium">{{ t('patrimoine.list.delta') }}</div>
            </div>
            <div class="space-y-3">
                <div *ngFor="let item of items; let i = index" 
                     class="rounded-xl px-4 py-4 bg-surface-50 dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer group">
                    <div class="grid md:grid-cols-12 items-center gap-2 md:gap-0">
                        <!-- Name -->
                        <div class="md:col-span-4">
                            <div class="flex items-center gap-3 min-w-0">
                                <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
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
                        <!-- Sparkline -->
                        <div class="hidden md:flex md:justify-center md:col-span-2">
                            <svg viewBox="0 0 80 32" width="80" height="32" preserveAspectRatio="none">
                                <polyline
                                    [attr.points]="getSparklinePoints(item, i)"
                                    fill="none"
                                    [attr.stroke]="getSparklineColor(item)"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                        </div>
                        <div class="hidden md:block md:col-span-2 text-right text-surface-900 dark:text-surface-0 font-semibold"><app-amount [value]="item.value" /></div>
                        <div class="hidden md:flex md:justify-end md:col-span-2">
                            <span *ngIf="item.deltaAbs != null"
                                  class="inline-flex items-center px-2 py-1 rounded-lg text-sm font-semibold"
                                  [ngClass]="(item.deltaAbs || 0) >= 0 ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'">
                                <i class="pi text-xs mr-1" [ngClass]="(item.deltaAbs || 0) >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'"></i>
                                {{ formatDeltaShort(item) }}
                            </span>
                        </div>
                    </div>
                    <!-- Mobile stacked values -->
                    <div class="md:hidden mt-3 pt-3 border-t border-surface-200 dark:border-surface-700 space-y-2 text-sm">
                        <div class="flex items-center justify-between">
                            <span class="text-surface-500 dark:text-surface-400">{{ t('patrimoine.list.value') }}</span>
                            <span class="font-semibold text-surface-900 dark:text-surface-0"><app-amount [value]="item.value" /></span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-surface-500 dark:text-surface-400">{{ t('patrimoine.list.delta') }}</span>
                            <span *ngIf="item.deltaAbs != null" 
                                  class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold"
                                  [ngClass]="(item.deltaAbs || 0) >= 0 ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'">
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
    @Input() colorFor: (item: PatrimoineAssetItem) => string = () => '#1A2740'; // brand-700

    // All asset rows share the same brand gradient — only the icon glyph
    // differentiates the asset type.
    private static readonly ICON_BG = '#1A2740';
    private iconConfigs = [
        { icon: 'pi pi-building',   bg: PatrimoineListComponent.ICON_BG },
        { icon: 'pi pi-chart-line', bg: PatrimoineListComponent.ICON_BG },
        { icon: 'pi pi-wallet',     bg: PatrimoineListComponent.ICON_BG },
        { icon: 'pi pi-bitcoin',    bg: PatrimoineListComponent.ICON_BG },
        { icon: 'pi pi-car',        bg: PatrimoineListComponent.ICON_BG },
    ];

    private cs = inject(CurrencyService);

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
            parts.push(`${sign}${this.cs.format(item.deltaAbs, 0)}`);
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
        return `${sign}${this.cs.format(item.deltaAbs, 0)}`;
    }

    getSparklineColor(item: PatrimoineAssetItem): string {
        const delta = item.deltaPct ?? item.deltaAbs ?? 0;
        return delta >= 0 ? '#2F8F6E' : '#B0463E'; // positive / negative tokens
    }

    getSparklinePoints(item: PatrimoineAssetItem, index: number): string {
        const isPositive = (item.deltaPct ?? item.deltaAbs ?? 0) >= 0;
        const seed = Math.abs(Math.round(item.value + index * 1337));
        const pts: number[] = [];
        let y = 16;
        for (let i = 0; i < 7; i++) {
            const rnd = ((seed * (i + 1) * 7919) % 1000) / 1000;
            const step = (rnd - 0.4) * 7;
            y = Math.max(4, Math.min(28, y + step + (isPositive ? 0.8 : -0.8)));
            pts.push(y);
        }
        return pts.map((yv, x) => `${x * 13},${32 - yv}`).join(' ');
    }
}
