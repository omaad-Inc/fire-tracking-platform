import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { FluidModule } from 'primeng/fluid';
import { debounceTime, Subscription, merge } from 'rxjs';
import { LayoutService } from '../../../layout/service/layout.service';
import { DashboardService, AssetAllocation } from '../../service/dashboard.service';
import { AssetsStateService } from '../../service/assets-state.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { I18nService } from '../../../i18n/i18n.service';

@Component({
    standalone: true,
    selector: 'app-worth-distribution-widget',
    imports: [CommonModule, ChartModule, FluidModule],
    template: `
        <div class="card !mb-0 h-full flex flex-col">
            <div class="mb-6">
                <div class="font-semibold text-xl text-surface-900 dark:text-surface-0">{{ i18n.t('dashboard.distribution') }}</div>
            </div>
            
            @if (loading()) {
                <div class="flex-1 flex flex-col items-center justify-center animate-pulse">
                    <div class="w-[200px] h-[200px] rounded-full bg-surface-200 dark:bg-surface-700 mb-6"></div>
                    <div class="grid grid-cols-2 gap-4 w-full">
                        @for (i of [1,2,3,4]; track i) {
                            <div class="h-12 bg-surface-200 dark:bg-surface-700 rounded-xl"></div>
                        }
                    </div>
                </div>
            } @else if (legendItems().length === 0) {
                <div class="flex-1 flex flex-col items-center justify-center text-center">
                    <div class="w-16 h-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
                        <i class="pi pi-chart-pie text-2xl text-surface-400"></i>
                    </div>
                    <p class="text-surface-600 dark:text-surface-400 mb-2">{{ i18n.t('dashboard.noAssets') }}</p>
                    <p class="text-surface-400 dark:text-surface-500 text-sm">{{ i18n.t('dashboard.noAssetsDesc') }}</p>
                </div>
            } @else {
                <div class="flex-1 flex flex-col items-center justify-center">
                    <div class="relative w-full max-w-[280px] mb-6">
                        <p-chart type="doughnut" [data]="pieData" [options]="pieOptions" class="w-full"></p-chart>
                        <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center">
                            <span class="text-surface-500 dark:text-surface-400 text-sm block">{{ i18n.t('patrimoine.repartition.total') }}</span>
                            <span class="font-bold text-2xl text-surface-900 dark:text-surface-0 block">{{ total() | number:'1.0-0' }}€</span>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4 w-full">
                        @for (item of legendItems(); track item.label) {
                            <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                                <div class="w-3 h-3 rounded-full" [style.background]="item.color"></div>
                                <div class="flex-1 min-w-0">
                                    <span class="text-surface-900 dark:text-surface-0 text-sm font-medium block truncate">{{ item.label }}</span>
                                    <span class="text-surface-500 dark:text-surface-400 text-xs">{{ item.percent }}%</span>
                                </div>
                            </div>
                        }
                    </div>
                </div>
            }
        </div>
    `
})
export class WorthDistributionWidget implements OnInit, OnDestroy {
    private layoutService = inject(LayoutService);
    private dashboardService = inject(DashboardService);
    private stateService = inject(AssetsStateService);
    private cs = inject(CurrencyService);
    readonly i18n = inject(I18nService);

    loading = signal(true);
    total = signal(0);
    legendItems = signal<{ label: string; color: string; percent: number }[]>([]);
    
    pieData: any;
    pieOptions: any;

    private subscription?: Subscription;
    private distribution: AssetAllocation[] = [];

    ngOnInit() {
        this.loadData();
        
        // Subscribe to both config updates and asset updates
        this.subscription = merge(
            this.layoutService.configUpdate$.pipe(debounceTime(25)),
            this.stateService.assetsUpdated$
        ).subscribe(() => {
            this.loadData();
        });
    }

    private async loadData() {
        this.loading.set(true);
        try {
            this.distribution = await this.dashboardService.getAssetDistribution();
            
            if (this.distribution.length > 0) {
                const totalValue = this.distribution.reduce((sum, d) => sum + d.value, 0);
                this.total.set(totalValue);
                this.initCharts();
            }
        } catch (error) {
            console.error('Error loading asset distribution:', error);
        } finally {
            this.loading.set(false);
        }
    }

    initCharts() {
        const labels = this.distribution.map(d => d.category);
        const values = this.distribution.map(d => d.value);
        const colors = this.distribution.map(d => d.color);

        // Generate lighter hover colors
        const hoverColors = colors.map(color => this.lightenColor(color, 20));

        this.legendItems.set(this.distribution.map(d => ({
            label: d.category,
            color: d.color,
            percent: Math.round(d.percentage)
        })));

        this.pieData = {
            labels: labels,
            datasets: [
                {
                    data: values,
                    backgroundColor: colors,
                    hoverBackgroundColor: hoverColors,
                    borderWidth: 0
                }
            ]
        };

        const cs = this.cs;
        this.pieOptions = {
            plugins: {
                legend: {
                    display: false
                },
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
                        label: function(context: any) {
                            return cs.format(context.raw, 0);
                        }
                    }
                }
            },
            cutout: '70%',
            maintainAspectRatio: true,
            responsive: true
        };
    }

    private lightenColor(hex: string, percent: number): string {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (
            0x1000000 +
            (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
            (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
            (B < 255 ? (B < 1 ? 0 : B) : 255)
        ).toString(16).slice(1);
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}
