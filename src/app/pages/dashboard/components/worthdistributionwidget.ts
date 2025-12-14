import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { FluidModule } from 'primeng/fluid';
import { debounceTime, Subscription } from 'rxjs';
import { LayoutService } from '../../../layout/service/layout.service';


@Component({
    standalone: true,
    selector: 'app-worth-distribution-widget',
    imports: [CommonModule, ChartModule, FluidModule],
    template: `
    <div class="card !mb-0 h-full flex flex-col">
        <div class="mb-6">
            <div class="font-semibold text-xl text-surface-900 dark:text-surface-0">Distribution du Patrimoine</div>
        </div>
        <div class="flex-1 flex flex-col items-center justify-center">
            <div class="relative w-full max-w-[280px] mb-6">
                <p-chart type="doughnut" [data]="pieData" [options]="pieOptions" class="w-full"></p-chart>
                <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center">
                    <span class="text-surface-500 dark:text-surface-400 text-sm block">Total</span>
                    <span class="font-bold text-2xl text-surface-900 dark:text-surface-0 block">{{ total | number:'1.0-0' }}€</span>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 w-full">
                <div *ngFor="let item of legendItems" class="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                    <div class="w-3 h-3 rounded-full" [style.background]="item.color"></div>
                    <div class="flex-1 min-w-0">
                        <span class="text-surface-900 dark:text-surface-0 text-sm font-medium block truncate">{{ item.label }}</span>
                        <span class="text-surface-500 dark:text-surface-400 text-xs">{{ item.percent }}%</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `
})
export class WorthDistributionWidget {

    pieData: any;
    pieOptions: any;
    total: number = 0;
    legendItems: { label: string; color: string; percent: number }[] = [];

    subscription: Subscription;
    
    constructor(private layoutService: LayoutService) {
        this.subscription = this.layoutService.configUpdate$.pipe(debounceTime(25)).subscribe(() => {
            this.initCharts();
        });
    }

    ngOnInit() {
        this.initCharts();
    }

    initCharts() {
        const labels = ['Immobilier', 'PEA Bourso', 'Compte bancaire', 'Crypto'];
        const values = [120000, 6500, 2955, 1026];
        this.total = values.reduce((a, b) => a + b, 0);

        // Couleurs harmonieuses
        const colors = [
            '#6366f1', // indigo-500
            '#06b6d4', // cyan-500
            '#10b981', // emerald-500
            '#8b5cf6'  // violet-500
        ];

        const hoverColors = [
            '#818cf8', // indigo-400
            '#22d3ee', // cyan-400
            '#34d399', // emerald-400
            '#a78bfa'  // violet-400
        ];

        this.legendItems = labels.map((label, index) => ({
            label,
            color: colors[index],
            percent: Math.round((values[index] / this.total) * 100)
        }));

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
                            return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(context.raw);
                        }
                    }
                }
            },
            cutout: '70%',
            maintainAspectRatio: true,
            responsive: true
        };
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}
