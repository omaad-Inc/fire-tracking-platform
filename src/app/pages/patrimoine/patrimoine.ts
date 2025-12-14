import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { PatrimoineProgress } from './components/patrimoineprogress';
import { PatrimoineStats } from './components/patrimoinestats';
import { PatrimoineListComponent, PatrimoineAssetItem } from './components/patrimoinelist';
import { PatrimoineRepartitionComponent } from './components/patrimoinerepartition';
import { I18nService } from '../../i18n/i18n.service';
import { PatrimoineService, PatrimoineAssetItemDto } from '../service/patrimoine.service';

@Component({
    selector: 'app-patrimoine',
    standalone: true,
    imports: [CommonModule, PatrimoineProgress, PatrimoineStats, PatrimoineListComponent, PatrimoineRepartitionComponent],
    template: `
        <div class="grid grid-cols-12 gap-8">
            <div class="col-span-12 xl:col-span-8">
                <app-patrimoine-progress />
            </div>
            <app-patrimoine-stats class="col-span-12 xl:col-span-4" />
            <div class="col-span-12">
                <div class="card">
                    <div class="mb-6 flex items-center justify-between">
                        <div class="font-semibold text-xl text-surface-900 dark:text-surface-0">{{ t('patrimoine.assets.title') }}</div>
                        <span class="text-indigo-500 text-sm font-medium">{{ assets.length }} actifs</span>
                    </div>
                    <div class="grid grid-cols-12 gap-8">
                        <div class="col-span-12 xl:col-span-7">
                            <app-patrimoine-list [items]="assets" [colorFor]="colorFor"></app-patrimoine-list>
                        </div>
                        <div class="col-span-12 xl:col-span-5">
                            <app-patrimoine-repartition [items]="assets"></app-patrimoine-repartition>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class Patrimoine {
    assets: PatrimoineAssetItem[] = [];

    constructor(private i18n: I18nService, private patrimoineService: PatrimoineService) {}

    ngOnInit() {
        this.patrimoineService.getAssets().then((items: PatrimoineAssetItemDto[]) => {
            const total = items.reduce((sum, it) => sum + it.value, 0) || 1;
            this.assets = items.map((it) => ({
                name: it.name,
                value: it.value,
                sharePct: Math.round((it.value / total) * 100),
                deltaAbs: it.deltaAbs,
                deltaPct: it.deltaPct
            }));
        });
    }

    t(key: string) { return this.i18n.t(key); }

    // Palette harmonieuse (indigo, cyan, emerald, violet, amber)
    colorFor = (item: PatrimoineAssetItem) => {
        const palette = ['#6366f1', '#06b6d4', '#10b981', '#8b5cf6', '#f59e0b'];
        const idx = Math.abs(this.hash(item.name)) % palette.length;
        return palette[idx];
    };

    private hash(s: string): number {
        let h = 0;
        for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
        return h;
    }
}
