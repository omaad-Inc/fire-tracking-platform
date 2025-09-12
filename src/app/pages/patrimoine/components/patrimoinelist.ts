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
        <div class="min-w-[40rem]">
            <div class="grid grid-cols-12 text-sm opacity-70 px-4 py-2">
                <div class="col-span-6">{{ t('patrimoine.list.name') }}</div>
                <div class="col-span-2 text-right">{{ t('patrimoine.list.share') }}</div>
                <div class="col-span-2 text-right">{{ t('patrimoine.list.value') }}</div>
                <div class="col-span-2 text-right">{{ t('patrimoine.list.delta') }}</div>
            </div>
            <div class="space-y-3">
                <div *ngFor="let item of items" class="grid grid-cols-12 items-center rounded-xl px-4 py-4 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 hover:shadow-sm transition-all duration-200 cursor-pointer">
                    <div class="col-span-6">
                        <div class="flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full" [style.background-color]="colorFor(item)"></span>
                            <span class="font-medium">{{ item.name }}</span>
                        </div>
                    </div>
                    <div class="col-span-2 text-right">{{ item.sharePct | number: '1.0-0' }} %</div>
                    <div class="col-span-2 text-right">{{ item.value | currency: 'EUR' }}</div>
                    <div class="col-span-2 text-right">
                        <p-tag *ngIf="item.deltaAbs != null" [severity]="(item.deltaAbs || 0) >= 0 ? 'success' : 'danger'" [value]="formatDelta(item)"></p-tag>
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
}
