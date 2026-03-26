import { Component, Input, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { FluidModule } from 'primeng/fluid';
import { debounceTime, Subscription } from 'rxjs';
import { LayoutService } from '../../../layout/service/layout.service';
import { I18nService } from '../../../i18n/i18n.service';
import { PatrimoineAssetItem } from './patrimoinelist';
import { CurrencyService } from '../../../core/services/currency.service';

@Component({
    selector: 'app-patrimoine-repartition',
    standalone: true,
    imports: [CommonModule, ChartModule, FluidModule],
    template: `
        <div class="flex-1 flex flex-col items-center justify-center">
            <div class="relative w-full max-w-[280px] mx-auto mb-6">
                <p-chart type="doughnut" [data]="pieData" [options]="pieOptions" class="w-full"></p-chart>
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div class="text-center">
                        <span class="text-surface-500 dark:text-surface-400 text-sm block">{{ t('patrimoine.repartition.total') }}</span>
                        <span class="font-bold text-2xl text-surface-900 dark:text-surface-0 block">{{ formatTotal() }}</span>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3 w-full max-w-sm">
                <div *ngFor="let label of pieData?.labels; let i = index" 
                     class="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                    <div class="w-3 h-3 rounded-full" [style.background]="colors[i]"></div>
                    <div class="flex-1 min-w-0">
                        <span class="text-surface-900 dark:text-surface-0 text-sm font-medium block truncate">{{ label }}</span>
                        <span class="text-surface-500 dark:text-surface-400 text-xs">{{ getPercent(i) }}%</span>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class PatrimoineRepartitionComponent implements OnDestroy {
    private cs = inject(CurrencyService);
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
        // Couleurs harmonieuses avec le thème
        this.colors = [
            '#6366f1', // indigo
            '#06b6d4', // cyan
            '#10b981', // emerald
            '#8b5cf6', // violet
            '#f59e0b'  // amber
        ];

        const hoverColors = [
            '#818cf8', // indigo-400
            '#22d3ee', // cyan-400
            '#34d399', // emerald-400
            '#a78bfa', // violet-400
            '#fbbf24'  // amber-400
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
                    hoverBackgroundColor: hoverColors.slice(0, values.length),
                    borderWidth: 0
                }
            ]
        };

        this.pieOptions = {
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(99, 102, 241, 0.3)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: (context: any) => {
                            return this.cs.format(context.raw, 0);
                        }
                    }
                }
            },
            cutout: '70%',
            maintainAspectRatio: true,
            responsive: true
        };
    }

    formatTotal(): string { return this.cs.format(this.total, 0); }

    getPercent(index: number): number {
        if (!this.pieData?.datasets?.[0]?.data || this.total === 0) return 0;
        return Math.round((this.pieData.datasets[0].data[index] / this.total) * 100);
    }

    t(key: string) { return this.i18n.t(key); }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}
