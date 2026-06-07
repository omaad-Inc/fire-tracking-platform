import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { FluidModule } from 'primeng/fluid';
import { debounceTime, Subscription } from 'rxjs';
import { LayoutService } from '../../../layout/service/layout.service';
import { DashboardService, AssetAllocation } from '../../service/dashboard.service';
import { AppAmountComponent } from '../../../core/components/app-amount.component';
import { I18nService } from '../../../i18n/i18n.service';


@Component({
    standalone: true,
    selector: 'app-expenses-progression-widget',
    imports: [CommonModule, ChartModule, FluidModule, AppAmountComponent],
    template: `
    <div class="relative overflow-hidden bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 h-full flex flex-col">
        <div class="relative mb-6">
            <div class="font-semibold text-xl text-surface-900 dark:text-surface-0">{{ i18n.t('dashboard.expenseDistribution') }}</div>
        </div>
        
        @if (loading()) {
            <div class="relative flex-1 flex flex-col items-center justify-center animate-pulse">
                <div class="w-[200px] h-[200px] rounded-full bg-surface-200 dark:bg-surface-700 mb-6"></div>
                <div class="grid grid-cols-2 gap-3 w-full">
                    @for (i of [1,2,3,4]; track i) {
                        <div class="h-12 bg-surface-200 dark:bg-surface-700 rounded-xl"></div>
                    }
                </div>
            </div>
        } @else if (legendItems().length === 0) {
            <div class="relative flex-1 flex flex-col items-center justify-center text-center">
                <div class="w-16 h-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
                    <i class="pi pi-chart-pie text-2xl text-surface-400"></i>
                </div>
                <p class="text-surface-600 dark:text-surface-400 mb-2">{{ i18n.t('dashboard.noExpenses') }}</p>
                <p class="text-surface-400 dark:text-surface-500 text-sm">{{ i18n.t('dashboard.noExpensesDesc') }}</p>
            </div>
        } @else {
            <div class="relative flex-1 flex items-center justify-center py-2">
                <div class="relative" style="width:230px;height:230px">
                    <p-chart type="doughnut" [data]="pieData" [options]="pieOptions" styleClass="w-full h-full" [height]="'230px'"></p-chart>
                    <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6 text-center">
                        @if (hovered(); as h) {
                            <span class="text-surface-500 dark:text-surface-400 text-xs leading-tight line-clamp-2">{{ h.name }}</span>
                            <app-amount [value]="h.value" class="font-bold text-surface-900 dark:text-surface-0 text-lg leading-tight mt-0.5 block" />
                            <span class="text-brand-700 dark:text-ochre-400 text-sm font-semibold mt-0.5">{{ h.pct }} %</span>
                        } @else {
                            <span class="text-surface-500 dark:text-surface-400 text-xs">{{ i18n.t('patrimoine.repartition.total') }}</span>
                            <app-amount [value]="total()" class="font-bold text-surface-900 dark:text-surface-0 text-lg leading-tight mt-0.5 block" />
                        }
                    </div>
                </div>
            </div>
        }
    </div>
    `
})
export class AllExpensesProgression implements OnInit, OnDestroy {
    private layoutService = inject(LayoutService);
    private dashboardService = inject(DashboardService);
    readonly i18n = inject(I18nService);

    loading = signal(true);
    total = signal(0);
    legendItems = signal<{ label: string; color: string; value: number }[]>([]);

    // ── Hover-driven center, no legend ──
    hovered = signal<{ name: string; value: number; pct: number } | null>(null);
    private hoveredIdx = -1;

    pieData: any;
    pieOptions: any;

    private subscription?: Subscription;
    private distribution: AssetAllocation[] = [];

    ngOnInit() {
        this.loadData();
        
        this.subscription = this.layoutService.configUpdate$.pipe(debounceTime(25)).subscribe(() => {
            if (this.distribution.length > 0) {
                this.initCharts();
            }
        });
    }

    private async loadData() {
        this.loading.set(true);
        try {
            this.distribution = await this.dashboardService.getExpenseDistribution();
            
            if (this.distribution.length > 0) {
                const totalValue = this.distribution.reduce((sum, d) => sum + d.value, 0);
                this.total.set(totalValue);
                this.initCharts();
            }
        } catch (error) {
            console.error('Error loading expense distribution:', error);
        } finally {
            this.loading.set(false);
        }
    }

    initCharts() {
        const labels = this.distribution.map(d => d.category);
        const values = this.distribution.map(d => d.value);
        const colors = this.distribution.map(d => d.color);
        const totalValue = values.reduce((s, v) => s + v, 0);

        this.legendItems.set(this.distribution.map(d => ({
            label: d.category,
            color: d.color,
            value: d.value
        })));

        const isDark = document.documentElement.classList.contains('app-dark');
        const sliceBorder = isDark ? '#0F1A2E' : '#ffffff';

        this.pieData = {
            labels: labels,
            datasets: [
                {
                    data: values,
                    backgroundColor: colors,
                    borderColor: sliceBorder,
                    borderWidth: 2,
                    hoverOffset: 10,
                    hoverBorderColor: sliceBorder
                }
            ]
        };

        this.pieOptions = {
            cutout: '72%',
            maintainAspectRatio: false,
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            onHover: (_e: any, els: any[]) => {
                const idx = els && els.length ? els[0].index : -1;
                if (idx === this.hoveredIdx) return;
                this.hoveredIdx = idx;
                const d = idx >= 0 ? this.distribution[idx] : null;
                const pct = d && totalValue > 0 ? Math.round((d.value / totalValue) * 100) : 0;
                this.hovered.set(d ? { name: d.category, value: d.value, pct } : null);
            }
        };
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}
