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
            <div class="hidden md:grid grid-cols-12 text-sm opacity-70 px-4 py-2">
                <div class="col-span-6">{{ t('patrimoine.list.name') }}</div>
                <div class="col-span-2 text-right">{{ t('patrimoine.list.share') }}</div>
                <div class="col-span-2 text-right">{{ t('patrimoine.list.value') }}</div>
                <div class="col-span-2 text-right">{{ t('patrimoine.list.delta') }}</div>
            </div>
            <div class="space-y-3">
                <div *ngFor="let item of items" class="rounded-xl px-3 py-3 md:px-4 md:py-4 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 hover:shadow-sm transition-all duration-200 cursor-pointer">
                    <div class="grid md:grid-cols-12 items-center gap-2 md:gap-0">
                        <!-- Name -->
                        <div class="md:col-span-6">
                            <div class="flex items-center gap-2 min-w-0">
                                <span class="w-2 h-2 rounded-full shrink-0" [style.background-color]="colorFor(item)"></span>
                                <span class="font-medium text-sm md:text-base truncate overflow-hidden whitespace-nowrap">{{ item.name }}</span>
                            </div>
                        </div>
                        <!-- Desktop values -->
                        <div class="hidden md:block md:col-span-2 text-right">{{ item.sharePct | number: '1.0-0' }} %</div>
                        <div class="hidden md:block md:col-span-2 text-right">{{ item.value | currency: 'EUR' }}</div>
                        <div class="hidden md:flex md:justify-end md:col-span-2">
                            <p-tag *ngIf="item.deltaAbs != null" [severity]="(item.deltaAbs || 0) >= 0 ? 'success' : 'danger'" [value]="formatDelta(item)"></p-tag>
                        </div>
                    </div>
                    <!-- Mobile stacked values -->
                    <div class="md:hidden mt-2 space-y-1 text-xs">
                        <div class="flex items-center justify-between gap-2">
                            <span class="opacity-70">{{ t('patrimoine.list.share') }}</span>
                            <span class="text-right whitespace-nowrap">{{ item.sharePct | number: '1.0-0' }} %</span>
                        </div>
                        <div class="flex items-center justify-between gap-2">
                            <span class="opacity-70">{{ t('patrimoine.list.value') }}</span>
                            <span class="text-right whitespace-nowrap">{{ item.value | currency: 'EUR' }}</span>
                        </div>
                        <div class="flex items-center justify-between gap-2">
                            <span class="opacity-70">{{ t('patrimoine.list.delta') }}</span>
                            <p-tag *ngIf="item.deltaAbs != null" [severity]="(item.deltaAbs || 0) >= 0 ? 'success' : 'danger'" [value]="formatDeltaShort(item)" styleClass="text-[10px] px-1.5 py-0.5 leading-4 whitespace-nowrap"></p-tag>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class PatrimoineListComponent {
    @Input() items: PatrimoineAssetItem[] = [];
    @Input() colorFor: (item: PatrimoineAssetItem) => string = () => '#8884d8';

    constructor(private i18n: I18nService) {}

    t(key: string) { return this.i18n.t(key); }

    formatDelta(item: PatrimoineAssetItem): string {
        const parts: string[] = [];
        if (item.deltaAbs != null) {
            const sign = item.deltaAbs >= 0 ? '+' : '';
            parts.push(`${sign}${(item.deltaAbs).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}`);
        }
        if (item.deltaPct != null) {
            const sign = item.deltaPct >= 0 ? '+' : '';
            parts.push(`${sign}${item.deltaPct.toFixed(2)} %`);
        }
        return parts.join(' ');
    }

    formatDeltaShort(item: PatrimoineAssetItem): string {
        if (item.deltaAbs == null) return '';
        const sign = item.deltaAbs >= 0 ? '+' : '';
        return `${sign}${(item.deltaAbs).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}`;
    }
}
