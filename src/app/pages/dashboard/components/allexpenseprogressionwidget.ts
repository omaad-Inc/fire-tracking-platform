import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { FluidModule } from 'primeng/fluid';
import { debounceTime, Subscription } from 'rxjs';
import { LayoutService } from '../../../layout/service/layout.service';


@Component({
    standalone: true,
    selector: 'app-expenses-progression-widget',
    imports: [CommonModule, ChartModule, FluidModule],
    template: `
    <div class="card !mb-8 h-full flex flex-col">
        <div class="mb-4">
            <div class="font-semibold text-xl">Toutes les Dépenses</div>
        </div>
        <div class="flex-1 flex flex-col items-center justify-center">
            <div class="relative w-full max-w-[350px] mb-4">
                <p-chart type="doughnut" [data]="pieData" [options]="pieOptions" class="w-full"></p-chart>
                <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <span class="font-bold text-xl text-center block">{{ total | number:'1.0-0' }} €</span>
                </div>
            </div>
            <div class="flex flex-wrap justify-center gap-4">
                <div *ngFor="let label of pieData?.labels; let i = index" class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full" [style.background-color]="getColor(i)"></div>
                    <span class="text-sm">{{ label }}</span>
                </div>
            </div>
        </div>
    </div>
    `
})
export class AllExpensesProgression {

    pieData: any;

    pieOptions: any;

    total: number = 0;

    colors: string[] = [];

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
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
       
        const values = [1200, 850, 650, 300, 450, 800, 400, 200];
        this.total = values.reduce((a, b) => a + b, 0);

        this.colors = [
            documentStyle.getPropertyValue('--p-indigo-500'),
            documentStyle.getPropertyValue('--p-purple-500'),
            documentStyle.getPropertyValue('--p-teal-500'),
            documentStyle.getPropertyValue('--p-orange-500'),
            documentStyle.getPropertyValue('--p-pink-500'),
            documentStyle.getPropertyValue('--p-cyan-500'),
            documentStyle.getPropertyValue('--p-green-500'),
            documentStyle.getPropertyValue('--p-red-500')
        ];

        this.pieData = {
            labels: ['Rent', 'Bank loans', 'Food', 'Transportation', 'Travel', 'Vacation', 'Shopping', 'Tontine'],
            datasets: [
                {
                    data: values,
                    backgroundColor: this.colors,
                    hoverBackgroundColor: [
                        documentStyle.getPropertyValue('--p-indigo-400'),
                        documentStyle.getPropertyValue('--p-purple-400'),
                        documentStyle.getPropertyValue('--p-teal-400'),
                        documentStyle.getPropertyValue('--p-orange-400'),
                        documentStyle.getPropertyValue('--p-pink-400'),
                        documentStyle.getPropertyValue('--p-cyan-400'),
                        documentStyle.getPropertyValue('--p-green-400'),
                        documentStyle.getPropertyValue('--p-red-400')
                    ]
                }
            ]
        };

        this.pieOptions = {
            plugins: {
                legend: {
                    display: false // Désactive la légende automatique
                }
            },
            cutout: '75%',
            maintainAspectRatio: true,
            responsive: true
        };
    }

    getColor(index: number): string {
        return this.colors[index] || '#000';
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}