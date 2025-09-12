import { Component, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { FluidModule } from 'primeng/fluid';
import { debounceTime, Subscription } from 'rxjs';
import { LayoutService } from '../../../layout/service/layout.service';
import { I18nService } from '../../../i18n/i18n.service';
import { PatrimoineAssetItem } from './patrimoinelist';

@Component({
    selector: 'app-patrimoine-repartition',
    standalone: true,
    imports: [CommonModule, ChartModule, FluidModule],
    template: `
        <div class="flex-1 flex flex-col items-center justify-center">
            <div class="relative w-full max-w-[260px] mb-4">
                <p-chart type="doughnut" [data]="pieData" [options]="pieOptions" class="w-full"></p-chart>
                <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center">
                    <span class="font-bold text-xl block">{{ total | number: '1.0-0' }} €</span>
                    <small class="opacity-70">{{ t('patrimoine.repartition.total') }}</small>
                </div>
            </div>
            <div class="flex flex-wrap justify-center gap-4">
                <div *ngFor="let label of pieData?.labels; let i = index" class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full" [style.background-color]="colors[i]"></div>
                    <span class="text-sm">{{ label }}</span>
                </div>
            </div>
        </div>
    `
})
export class PatrimoineRepartitionComponent implements OnDestroy {
    private _items: PatrimoineAssetItem[] = [];
    @Input() set items(value: PatrimoineAssetItem[]) {
        this._items = value || [];
        this.initCharts();
    }
    get items(): PatrimoineAssetItem[] { return this._items; }

    pieData: any;
    pieOptions: any;
    total: number = 0;
    colors: string[] = [];
    subscription: Subscription;

    constructor(private layoutService: LayoutService, private i18n: I18nService) {
        this.subscription = this.layoutService.configUpdate$.pipe(debounceTime(25)).subscribe(() => {
            this.initCharts();
        });
    }

    ngOnInit() {
        this.initCharts();
    }

    initCharts() {
        const documentStyle = getComputedStyle(document.documentElement);
        this.colors = [
            documentStyle.getPropertyValue('--p-indigo-500'),
            documentStyle.getPropertyValue('--p-teal-500'),
            documentStyle.getPropertyValue('--p-purple-500'),
            documentStyle.getPropertyValue('--p-orange-500'),
            documentStyle.getPropertyValue('--p-cyan-500')
        ];

        const values = (this._items || []).map((i) => i.value);
        const labels = (this._items || []).map((i) => i.name);
        this.total = values.reduce((a, b) => a + b, 0);
        this.pieData = {
            labels,
            datasets: [
                {
                    data: values,
                    backgroundColor: this.colors.slice(0, values.length),
                    hoverBackgroundColor: this.colors.slice(0, values.length)
                }
            ]
        };

        this.pieOptions = {
            plugins: { legend: { display: false } },
            cutout: '70%',
            maintainAspectRatio: true,
            responsive: true
        };
    }

    t(key: string) { return this.i18n.t(key); }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}
